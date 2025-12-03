import asyncio
import uuid
import os
import json
from typing import Dict
from app.orchestration.application.manager import ConnectionManager
from app.orchestration.application.state_store import StateStore
from app.orchestration.application.llm_service import LLMService
from app.orchestration.application.image_processor import ImageProcessor

class ExecutionEngine:
    def __init__(self, manager: ConnectionManager, state_store: StateStore):
        self.manager = manager
        self.state_store = state_store
        self.llm = LLMService()
        self.processor = ImageProcessor()
        self.active_tasks: Dict[str, asyncio.Task] = {}

    async def start_processing(self, session_id: str, prompt: str, image_path: str, reference_image_path: str = None):
        # 1. Initialize Root Node (Input Image)
        root_node = {
            "id": str(uuid.uuid4()),
            "parent_id": None,
            "tool": "input",
            "params": {},
            "intent": "Original Image",
            "image_url": image_path,
            "thumbnail_url": image_path,
            "children_ids": []
        }
        self.state_store.create_session(session_id, root_node)
        
        # 2. Plan from Root
        await self.continue_processing(session_id, root_node["id"], prompt, reference_image_path)

    async def continue_processing(self, session_id: str, parent_node_id: str, prompt: str, reference_image_path: str = None):
        # 1. Build Context
        context_str = self._build_context(session_id, parent_node_id)
        
        # 2. Get Parent Node Image
        parent_node = self.state_store.get_node(session_id, parent_node_id)
        if not parent_node:
            print(f"Parent node {parent_node_id} not found")
            return

        # 3. Plan with LLM
        steps = await self.llm.plan_edits(parent_node["image_url"], prompt, context_str, reference_image_path)
        
        # 4. Extend Tree (Smart Branching)
        await self._extend_tree(session_id, parent_node_id, steps)

    def _build_context(self, session_id: str, node_id: str) -> str:
        path = self.state_store.get_path_to_node(session_id, node_id)
        context_str = ""
        for i, node in enumerate(path):
            if node['tool'] == 'input': continue
            context_str += f"Step {i}: {node['tool']}\n"
            context_str += f" - Params: {node['params']}\n"
            context_str += f" - Intent: {node.get('intent', '')}\n"
        return context_str

    async def _extend_tree(self, session_id: str, start_node_id: str, steps: list):
        current_node_id = start_node_id
        
        for step in steps:
            current_node = self.state_store.get_node(session_id, current_node_id)
            
            # Smart Branching: Check if child exists
            found_child = None
            if "children_ids" in current_node:
                for child_id in current_node["children_ids"]:
                    child = self.state_store.get_node(session_id, child_id)
                    if (child and child["tool"] == step["tool"] and 
                        child["params"] == step["params"]):
                        found_child = child
                        break
            
            if found_child:
                # Reuse existing node
                print(f"Reusing existing node {found_child['id']} for {step['tool']}")
                current_node_id = found_child["id"]
                # Update UI to show we moved to this node
                self.state_store.set_current_node(session_id, current_node_id)
                await self._notify_update(session_id)
            else:
                # Create new node
                print(f"Creating new node for {step['tool']}")
                
                # Notify start of processing
                await self.manager.send_personal_message({
                    "event": "step_start",
                    "tool": step["tool"]
                }, session_id)

                # Process Image with Error Recovery
                # Instrumented processing with timeout + thread-offload for sync processors
                print(f"Processing step '{step['tool']}' with params={step.get('params')} from image={current_node.get('image_url')}")
                try:
                    # choose timeout (seconds) — adjust as appropriate
                    step_timeout = 30
                    # relighting may be slower (external service)
                    if step.get("tool") == "relighting":
                        step_timeout = 90

                    # If process_step is async, await it directly with timeout.
                    if asyncio.iscoroutinefunction(self.processor.process_step):
                        proc_call = self.processor.process_step(current_node["image_url"], step["tool"], step["params"])
                    else:
                        # If it's synchronous/blocking, run in a thread to avoid blocking event loop.
                        proc_call = asyncio.to_thread(self.processor.process_step, current_node["image_url"], step["tool"], step["params"])

                    result_url = await asyncio.wait_for(proc_call, timeout=step_timeout)
                    print(f"Processing completed for '{step['tool']}', result_url={result_url}")
                except asyncio.TimeoutError as te:
                    print(f"Timeout while processing tool {step['tool']}: {te}")
                    await self.manager.send_personal_message({
                        "event": "error",
                        "message": f"Processing timed out for tool {step['tool']}. Please try again."
                    }, session_id)
                    # Ask LLM for recovery strategy (reuse existing recovery flow)
                    recovery = await self.llm.recover_from_error(step["tool"], f"timeout: {te}")
                    strategy = recovery.get("strategy", "manual")
                    print(f"Recovery Strategy (timeout): {strategy} ({recovery.get('reason')})")
                    if strategy == "skip":
                        continue
                    elif strategy == "retry" and "new_params" in recovery:
                        step["params"] = recovery["new_params"]
                        try:
                            # retry once (thread or async as above)
                            if asyncio.iscoroutinefunction(self.processor.process_step):
                                retry_call = self.processor.process_step(current_node["image_url"], step["tool"], step["params"])
                            else:
                                retry_call = asyncio.to_thread(self.processor.process_step, current_node["image_url"], step["tool"], step["params"])
                            result_url = await asyncio.wait_for(retry_call, timeout=step_timeout)
                        except Exception as retry_err:
                            print(f"Retry failed after timeout: {retry_err}")
                            await self.manager.send_personal_message({
                                "event": "error",
                                "message": f"Tool failed even after retry. Please edit manually."
                            }, session_id)
                            break
                    else:
                        await self.manager.send_personal_message({
                            "event": "error",
                            "message": f"Tool {step['tool']} failed (timeout). Please perform manually."
                        }, session_id)
                        break
                except Exception as e:
                    print(f"Tool {step['tool']} failed: {e}")
                    # Self-Healing: Ask LLM for strategy
                    recovery = await self.llm.recover_from_error(step["tool"], str(e))
                    strategy = recovery.get("strategy", "manual")
                    print(f"Recovery Strategy: {strategy} ({recovery.get('reason')})")
                    if strategy == "skip":
                        continue  # Skip this step, current_node_id remains unchanged
                    elif strategy == "retry" and "new_params" in recovery:
                        step["params"] = recovery["new_params"]
                        try:
                            if asyncio.iscoroutinefunction(self.processor.process_step):
                                retry_call = self.processor.process_step(current_node["image_url"], step["tool"], step["params"])
                            else:
                                retry_call = asyncio.to_thread(self.processor.process_step, current_node["image_url"], step["tool"], step["params"])
                            result_url = await asyncio.wait_for(retry_call, timeout=step_timeout)
                        except Exception as retry_err:
                            print(f"Retry failed: {retry_err}")
                            await self.manager.send_personal_message({
                                "event": "error",
                                "message": f"Tool failed even after retry. Please edit manually."
                            }, session_id)
                            break
                    else:
                        await self.manager.send_personal_message({
                            "event": "error",
                            "message": f"Tool {step['tool']} failed. Please perform manually."
                        }, session_id)
                        break

                new_node = {
                    "id": str(uuid.uuid4()),
                    "parent_id": current_node_id,
                    "tool": step["tool"],
                    "params": step["params"],
                    "intent": step.get("original_intent", ""),
                    "image_url": result_url,
                    "thumbnail_url": result_url,
                    "children_ids": []
                }
                
                self.state_store.add_node(session_id, new_node)
                current_node_id = new_node["id"]
                self.state_store.set_current_node(session_id, current_node_id)
                
                await self._notify_update(session_id)

    async def _notify_update(self, session_id: str):
        # Send the current active path AND the full tree to the frontend
        current_node = self.state_store.get_current_node(session_id)
        if current_node:
            path = self.state_store.get_path_to_node(session_id, current_node["id"])
            full_tree = self.state_store.get_full_tree(session_id)
            await self.manager.send_personal_message({
                "event": "path_update",
                "path": path,
                "tree": full_tree,
                "current_node_id": current_node["id"]
            }, session_id)

    async def stop_processing(self, session_id: str):
        # Placeholder for stop logic in graph mode
        pass

    async def update_step_and_ripple(self, session_id: str, step_index: int, new_params: dict):
        # Graph Mode: "Refine" logic
        # 1. Find the node at step_index
        current_node = self.state_store.get_current_node(session_id)
        path = self.state_store.get_path_to_node(session_id, current_node["id"])
        
        if step_index >= len(path): return
        
        target_node = path[step_index]
        parent_id = target_node["parent_id"]
        
        if not parent_id: return # Can't edit root
        
        # 2. Create a single step plan with new params
        # We treat this as a manual override, so we don't necessarily need the LLM unless requested.
        # But for "ripple", we might want to re-apply subsequent steps.
        # For MVP: Just create a new branch with the modified step.
        
        step = {
            "tool": target_node["tool"],
            "params": new_params,
            "original_intent": target_node.get("intent", "") + " (Edited)"
        }
        
        # 3. Extend from Parent
        await self._extend_tree(session_id, parent_id, [step])
        
        # Note: True "Ripple" (re-applying subsequent steps) would require 
        # extracting the *rest* of the path and re-submitting it to _extend_tree.
        # Let's add that for completeness.
        
        remaining_path = path[step_index+1:]
        remaining_steps = []
        for node in remaining_path:
            remaining_steps.append({
                "tool": node["tool"],
                "params": node["params"],
                "original_intent": node.get("intent", "")
            })
            
        if remaining_steps:
             new_head_id = self.state_store.get_current_node(session_id)["id"]
             await self._extend_tree(session_id, new_head_id, remaining_steps)

    async def switch_to_node(self, session_id: str, node_id: str):
        """Switches the active view to a specific node."""
        node = self.state_store.get_node(session_id, node_id)
        if node:
            self.state_store.set_current_node(session_id, node_id)
            await self._notify_update(session_id)

    async def refine_step(self, session_id: str, node_id: str, prompt: str, global_goal: str, mode: str, reference_image_path: str = None):
        """
        Refines a specific step by branching from its parent with new parameters/tools 
        based on the instruction and global goal.
        """
        # 1. Get Node & Context
        node = self.state_store.get_node(session_id, node_id)
        if not node: return

        parent_id = node["parent_id"]
        if not parent_id:
            print("Cannot refine root node")
            return

        # 2. Build Context (History up to parent)
        context_str = self._build_context(session_id, parent_id)
        
        # 3. Construct Refinement Prompt
        refinement_prompt = (
            f"Global Goal: {global_goal}\n"
            f"Current Step Context: The user is at a step with params: {node['params']} and intent: '{node.get('intent', '')}'.\n"
            f"Refinement Instruction: {prompt}\n"
            f"Please generate the new step(s) to replace the current one and fulfill the global goal."
        )

        # 4. Get Parent Image for planning
        parent_node = self.state_store.get_node(session_id, parent_id)
        
        # 5. Call LLM
        # We use the parent's image because we are re-planning from that point
        steps = await self.llm.plan_edits(parent_node["image_url"], refinement_prompt, context_str, reference_image_path)
        
        # 6. Check for Merge/Update Scenario
        # User wants to update the current node if the tool is the same, 
        # instead of creating a sibling (which looks like "another step" in the UI).
        if len(steps) == 1 and steps[0]["tool"] == node["tool"]:
            print(f"Refine: Updating existing node {node_id} (Merge Strategy)")
            
            # Update params & intent
            node["params"] = steps[0]["params"]
            node["intent"] = steps[0].get("intent", node.get("intent"))
            
            try:
                # Notify start
                await self.manager.send_personal_message({
                    "event": "step_start",
                    "tool": node["tool"]
                }, session_id)

                # Re-process image using PARENT's image + NEW params
                new_image_url = await self.processor.process_step(
                    parent_node["image_url"], 
                    node["tool"], 
                    node["params"]
                )
                
                node["image_url"] = new_image_url
                
                # Update in store (overwrites existing)
                self.state_store.add_node(session_id, node)
                
                # Notify full tree update
                await self._notify_update(session_id)
                return # Done, do not extend tree
                
            except Exception as e:
                print(f"Refine update failed: {e}")
                await self.manager.send_personal_message({
                    "event": "error",
                    "message": f"Failed to update node: {str(e)}"
                }, session_id)
                return

        # 7. Extend Tree (Default behavior: Branching/New Sibling)
        # This will create new nodes branching from parent_id
        await self._extend_tree(session_id, parent_id, steps)

    async def rename_node(self, session_id: str, node_id: str, new_name: str):
        """Renames a specific node (version)."""
        node = self.state_store.get_node(session_id, node_id)
        if node:
            node["intent"] = new_name # Reuse 'intent' or add 'name' field?
            # Let's add a specific 'name' field to avoid overwriting the AI intent
            node["name"] = new_name
            await self._notify_update(session_id)

    # --- Macros ---

    def load_macros(self):
        try:
            if os.path.exists("macros.json"):
                with open("macros.json", "r") as f:
                    return json.load(f)
        except Exception as e:
            print(f"Error loading macros: {e}")
        return {}

    def save_macros(self, macros):
        try:
            with open("macros.json", "w") as f:
                json.dump(macros, f, indent=2)
        except Exception as e:
            print(f"Error saving macros: {e}")

    async def save_macro(self, session_id: str, name: str, node_id: str):
        """Saves the path from root to node_id as a macro."""
        path = self.state_store.get_path_to_node(session_id, node_id)
        # Extract steps (excluding input)
        macro_steps = []
        for node in path:
            if node["tool"] == "input": continue
            macro_steps.append({
                "tool": node["tool"],
                "params": node["params"],
                "intent": node.get("intent", "")
            })
        
        macros = self.load_macros()
        macros[name] = macro_steps
        self.save_macros(macros)
        
        await self.manager.send_personal_message({
            "event": "macro_saved",
            "name": name,
            "steps": len(macro_steps)
        }, session_id)
        await self.send_macro_list(session_id)

    async def send_macro_list(self, session_id: str):
        """Sends the list of available macros to the client."""
        macros = self.load_macros()
        macro_list = []
        for name, steps in macros.items():
            macro_list.append({
                "name": name,
                "step_count": len(steps),
                "steps": steps  # Send full steps for details view
            })
        
        await self.manager.send_personal_message({
            "event": "macro_list",
            "macros": macro_list
        }, session_id)

    async def apply_macro(self, session_id: str, name: str, target_node_id: str):
        """Applies a macro starting from target_node_id."""
        macros = self.load_macros()
        if name not in macros:
            return
        
        steps = macros[name]
        await self._extend_tree(session_id, target_node_id, steps)

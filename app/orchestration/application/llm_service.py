import os
import json
import asyncio
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()
from io import BytesIO

from app.core.services.app.storage_service import StorageService
from PIL import Image

class LLMService:
    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        # print(api_key)
        if not api_key or api_key == "your_api_key_here":
            print("Warning: GEMINI_API_KEY not found in .env. Using mock mode.")
            self.model = None
        else:
            genai.configure(api_key=api_key)
            self.model = genai.GenerativeModel('gemini-flash-latest')
        
        # Load features registry
        try:
            with open(os.path.join(os.path.dirname(__file__), 'features.json'), 'r') as f:
                self.features = json.load(f)
        except Exception as e:
            print(f"Error loading features.json: {e}")
            self.features = {}

    def _generate_system_prompt(self):
        tools_desc = "Available Tools:\n"
        for i, (name, details) in enumerate(self.features.items(), 1):
            params = ", ".join([f'"{k}": {v["type"]}' for k, v in details["params"].items()])
            tools_desc += f'{i}. "{name}": params: {{{params}}} ({details["description"]})\n'
            
        return f"""
        You are an expert image editing agent. Your goal is to break down a user's request into a series of specific image processing steps.
        
        CRITICAL INSTRUCTION: You must capture EVERY single action requested by the user. Do not skip any steps. If the user asks for 4 things, you should generate 4 steps.
        
        ORDERING INSTRUCTION: You must strictly follow the order of operations requested by the user. If the user says "brightness then crop", step 1 must be brightness and step 2 must be crop. Do not reorder steps based on "best practices" unless explicitly asked.
        
        MULTIMODAL INSTRUCTION: You have access to the user's image. Analyze it visually to determine parameters. For example, if the user asks to "crop the tree", find the bounding box of the tree in the image and use those coordinates for the crop tool.
        
        COORDINATE SYSTEM: The image uses a standard coordinate system where (0,0) is the top-left corner. 'x' increases to the right, 'y' increases downwards. Ensure your crop coordinates (x, y, w, h) are within the image bounds provided in the prompt.
        
        {tools_desc}
        
        Output Format: JSON array of objects. Each object must have:
        - "id": int (incrementing from 1)
        - "tool": string (one of the above)
        - "original_intent": string (brief explanation)
        - "params": object (specific parameters)
        - "status": "pending"
        - "image_url": null
        - "thumbnail_url": null

        Example User Request: "Crop the image to focus on the center, rotate it 10 degrees, increase the brightness and saturation, and finally apply a cyberpunk filter"
        Example Output:
        [
            {{"id": 1, "tool": "crop", "original_intent": "Focus on center", "params": {{"x": 100, "y": 100, "w": 300, "h": 300}}, "status": "pending", "image_url": null, "thumbnail_url": null}},
            {{"id": 2, "tool": "rotate", "original_intent": "Rotate 10 degrees", "params": {{"angle": 10}}, "status": "pending", "image_url": null, "thumbnail_url": null}},
            {{"id": 3, "tool": "brightness", "original_intent": "Increase brightness", "params": {{"factor": 1.2}}, "status": "pending", "image_url": null, "thumbnail_url": null}},
            {{"id": 4, "tool": "saturation", "original_intent": "Increase saturation", "params": {{"factor": 1.3}}, "status": "pending", "image_url": null, "thumbnail_url": null}},
            {{"id": 5, "tool": "filter", "original_intent": "Apply cyberpunk filter", "params": {{"type": "cyberpunk"}}, "status": "pending", "image_url": null, "thumbnail_url": null}}
        ]
        
        Return ONLY the JSON array. No markdown formatting.
        """

    async def plan_edits(self, image_path: str, prompt: str, context_history: str = "", reference_image_path: str = None) -> list:
        """
        Generates a plan using Gemini API if available. Raises error if not.
        """
        if not self.model:
            raise Exception("Gemini API Key not configured. Please check .env file.")

        print(f"LLM Planning with Gemini for prompt: {prompt}")
        
        system_prompt = self._generate_system_prompt()
        
        full_prompt = f"{system_prompt}\n\n"
        if context_history:
            full_prompt += f"HISTORY OF EDITS (Context):\n{context_history}\n\n"
            
        full_prompt += f"User Request: {prompt}"
        
        # Load the image for multimodal input
        real_path = image_path.lstrip("/")
        
        response = None
        last_error = None
        
        for attempt in range(3):
            try:
                # Attempt to load the image from local path, GCS (gs://), or HTTP(S).
                img = None
                content_parts = None

                # Remote URLs (GCS or public storage.googleapis.com) or HTTP(S)
                if real_path.startswith("gs://") or "storage.googleapis.com" in real_path or real_path.startswith(("http://", "https://")):
                    storage = StorageService()
                    image_bytes = None
                    try:
                        if real_path.startswith("gs://") or "storage.googleapis.com" in real_path:
                            # StorageService will handle gs:// and public https urls conversion
                            image_bytes = await storage.get_image(real_path)
                        else:
                            # plain HTTP/HTTPS
                            import httpx
                            async with httpx.AsyncClient(timeout=30.0) as client:
                                r = await client.get(real_path)
                                r.raise_for_status()
                                image_bytes = r.content

                        if image_bytes:
                            img = Image.open(BytesIO(image_bytes))
                            width, height = img.size
                            content_parts = [full_prompt, f"Image to Edit (Resolution: {width}x{height})", img]
                    except Exception as e:
                        print(f"Remote image fetch failed for {real_path}: {e}")
                        img = None
                else:
                    # Local path
                    if not os.path.exists(real_path):
                        print(f"Image not found at {real_path}, falling back to text-only")
                    else:
                        import PIL.Image
                        img = PIL.Image.open(real_path)
                        width, height = img.size
                        content_parts = [full_prompt, f"Image to Edit (Resolution: {width}x{height})", img]

                # Attach reference image if available and image loaded
                if reference_image_path and img is not None:
                    ref_real_path = reference_image_path.lstrip("/")
                    if os.path.exists(ref_real_path):
                        import PIL.Image
                        ref_img = PIL.Image.open(ref_real_path)
                        content_parts.append("Reference/Prompt Image (Use this for style/content context):")
                        content_parts.append(ref_img)

                # Configure safety settings
                safety_settings = [
                    {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
                    {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
                    {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
                    {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
                ]

                if img is not None and content_parts is not None:
                    response = self.model.generate_content(content_parts, safety_settings=safety_settings)
                else:
                    print(f"Proceeding without image (image not available or fetch failed): {real_path}")
                    response = self.model.generate_content(full_prompt)

                break  # Success
            except Exception as e:
                print(f"Attempt {attempt+1} failed: {e}")
                last_error = e
                if "429" in str(e) or "Quota" in str(e):
                    await asyncio.sleep(2 * (attempt + 1)) # Backoff
                else:
                    raise e # Not a rate limit, fail immediately
        
        if not response:
            raise last_error

        try:
            text = response.text.strip()
        except ValueError as e:
            # Handle cases where response.text is not available (e.g. safety block)
            print(f"Gemini Error: {e}")
            print(f"Response Feedback: {response.prompt_feedback}")
            if response.candidates:
                print(f"Candidate Finish Reason: {response.candidates[0].finish_reason}")
                print(f"Candidate Safety Ratings: {response.candidates[0].safety_ratings}")
            raise Exception(f"Gemini refused to generate text. Reason: {response.candidates[0].finish_reason if response.candidates else 'Unknown'}")

        # print(f"Gemini Raw Response: {text}") # Debug print

        # JSON Parsing with Self-Correction
        for json_attempt in range(3):
            try:
                # Clean up potential markdown code blocks
                clean_text = text.strip()
                if clean_text.startswith("```json"):
                    clean_text = clean_text[7:]
                if clean_text.startswith("```"):
                    clean_text = clean_text[3:]
                if clean_text.endswith("```"):
                    clean_text = clean_text[:-3]
                
                steps = json.loads(clean_text)
                return steps
            except json.JSONDecodeError as e:
                print(f"JSON Parse Error (Attempt {json_attempt+1}): {e}")
                print(f"Faulty JSON: {text}")
                
                if json_attempt < 2:
                    print("Attempting to self-correct JSON...")
                    correction_prompt = (
                        f"You generated invalid JSON. The error was: {e}\n"
                        f"Your previous output was:\n{text}\n"
                        f"Please fix the JSON and return ONLY the valid JSON array."
                    )
                    try:
                        response = self.model.generate_content(correction_prompt)
                        text = response.text.strip()
                        print(f"Corrected Response: {text}")
                    except Exception as gen_err:
                        print(f"Error generating correction: {gen_err}")
                        break # Stop if generation fails
                else:
                    raise Exception(f"Failed to parse LLM response after retries: {e}")

    def _mock_plan(self, prompt: str) -> list:
        print(f"Using Mock LLM for prompt: {prompt}")
        steps = []
        
        # Step 1: Crop (if mentioned or default)
        steps.append({
            "id": 1,
            "tool": "crop",
            "original_intent": "Focus on the main subject",
            "params": {"x": 100, "y": 100, "w": 300, "h": 300},
            "status": "pending",
            "image_url": None,
            "thumbnail_url": None
        })
        
        # Step 2: Filter/Style
        if "cyberpunk" in prompt.lower():
            steps.append({
                "id": 2,
                "tool": "filter",
                "original_intent": "Apply cyberpunk style",
                "params": {"type": "cyberpunk"},
                "status": "pending",
                "image_url": None,
                "thumbnail_url": None
            })
        elif "vintage" in prompt.lower() or "sepia" in prompt.lower():
             steps.append({
                "id": 2,
                "tool": "filter",
                "original_intent": "Apply vintage look",
                "params": {"type": "sepia"},
                "status": "pending",
                "image_url": None,
                "thumbnail_url": None
            })
        else:
             steps.append({
                "id": 2,
                "tool": "contrast",
                "original_intent": "Enhance contrast",
                "params": {"factor": 1.2},
                "status": "pending",
                "image_url": None,
                "thumbnail_url": None
            })
            
        # Step 3: Overlay (if mentioned)
        if "rain" in prompt.lower():
            steps.append({
                "id": 3,
                "tool": "overlay",
                "original_intent": "Add rain effect",
                "params": {"type": "rain"},
                "status": "pending",
                "image_url": None,
                "thumbnail_url": None
            })
            
        return steps

    async def recover_from_error(self, tool: str, error_msg: str, context: str = "") -> dict:
        """
        Asks the LLM for a recovery strategy when a tool fails.
        """
        if not self.model:
            return {"strategy": "manual", "reason": "No LLM available"}

        prompt = (
            f"You tried to execute the tool '{tool}' but it failed with the error: '{error_msg}'.\n"
            f"Context: {context}\n\n"
            "What should we do? Choose the best recovery strategy:\n"
            "1. 'skip': Skip this step and continue if it's not critical.\n"
            "2. 'manual': Ask the user to perform this action manually (e.g. manual crop).\n"
            "3. 'retry': Retry with different parameters if you think it might work.\n\n"
            "Return ONLY a JSON object with the following format:\n"
            "{\n"
            '  "strategy": "skip" | "manual" | "retry",\n'
            '  "reason": "brief explanation",\n'
            '  "new_params": { ... } // Only if strategy is retry\n'
            "}"
        )
        
        try:
            response = self.model.generate_content(prompt)
            text = response.text.strip()
            # Clean up markdown
            if text.startswith("```json"): text = text[7:]
            if text.startswith("```"): text = text[3:]
            if text.endswith("```"): text = text[:-3]
            
            return json.loads(text.strip())
        except Exception as e:
            print(f"Error getting recovery strategy: {e}")
            return {"strategy": "manual", "reason": "Failed to get AI recovery strategy"}

    async def replan_edits(self, current_steps: list, changed_step_index: int) -> list:
        # Placeholder for replanning logic
        return current_steps

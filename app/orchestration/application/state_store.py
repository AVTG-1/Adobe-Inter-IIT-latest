from typing import Dict, Any, List, Optional
import uuid

class StateStore:
    def __init__(self):
        # Structure: {
        #   session_id: {
        #     "root_node_id": str,
        #     "current_node_id": str,
        #     "nodes": { node_id: NodeDict }
        #   }
        # }
        self.sessions: Dict[str, Dict[str, Any]] = {}

    def create_session(self, session_id: str, root_node: Dict[str, Any]):
        self.sessions[session_id] = {
            "root_node_id": root_node["id"],
            "current_node_id": root_node["id"],
            "nodes": {root_node["id"]: root_node}
        }

    def get_session(self, session_id: str) -> Dict[str, Any]:
        return self.sessions.get(session_id, {})

    def add_node(self, session_id: str, node: Dict[str, Any]):
        session = self.get_session(session_id)
        if session:
            session["nodes"][node["id"]] = node
            # Update parent's children list
            if node["parent_id"]:
                parent = session["nodes"].get(node["parent_id"])
                if parent:
                    if "children_ids" not in parent:
                        parent["children_ids"] = []
                    if node["id"] not in parent["children_ids"]:
                        parent["children_ids"].append(node["id"])

    def get_node(self, session_id: str, node_id: str) -> Optional[Dict[str, Any]]:
        session = self.get_session(session_id)
        if session:
            return session["nodes"].get(node_id)
        return None

    def set_current_node(self, session_id: str, node_id: str):
        session = self.get_session(session_id)
        if session and node_id in session["nodes"]:
            session["current_node_id"] = node_id

    def get_current_node(self, session_id: str) -> Optional[Dict[str, Any]]:
        session = self.get_session(session_id)
        if session:
            return session["nodes"].get(session["current_node_id"])
        return None

    def get_path_to_node(self, session_id: str, node_id: str) -> List[Dict[str, Any]]:
        """Backtracks from node_id to root to get the full path."""
        session = self.get_session(session_id)
        if not session:
            return []
        
        path = []
        current_id = node_id
        while current_id:
            node = session["nodes"].get(current_id)
            if not node:
                break
            path.insert(0, node)
            current_id = node.get("parent_id")
        return path

    def get_full_tree(self, session_id: str) -> Dict[str, Any]:
        """Returns the complete tree structure (all nodes)."""
        session = self.get_session(session_id)
        if not session:
            return {}
        return session["nodes"]

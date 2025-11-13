"""Base agent class implementing thought-action-observation pattern."""

from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from dataclasses import dataclass

from PIL import Image


@dataclass
class AgentThought:
    """Represents an agent's thought in the reasoning process."""
    step: int
    thought: str
    action: Optional[str] = None
    observation: Optional[str] = None


class BaseAgent(ABC):
    """Abstract base class for AI agents implementing TAO pattern.
    
    The Thought-Action-Observation (TAO) pattern:
    1. Thought: Agent reasons about the current state and next step
    2. Action: Agent selects and executes a tool
    3. Observation: Agent processes the result
    """
    
    def __init__(self, agent_name: str):
        """Initialize agent.
        
        Args:
            agent_name: Name identifier for the agent
        """
        self.agent_name = agent_name
        self.thoughts: List[AgentThought] = []
        self._step_count = 0
    
    def _add_thought(
        self,
        thought: str,
        action: Optional[str] = None,
        observation: Optional[str] = None
    ):
        """Record a thought in the agent's reasoning chain.
        
        Args:
            thought: The agent's reasoning
            action: Action taken (if any)
            observation: Result of the action (if any)
        """
        self._step_count += 1
        self.thoughts.append(
            AgentThought(
                step=self._step_count,
                thought=thought,
                action=action,
                observation=observation
            )
        )
    
    def get_thought_summary(self) -> List[str]:
        """Get human-readable summary of agent's reasoning.
        
        Returns:
            List of thought strings
        """
        return [
            f"{t.thought}" + (f" → {t.action}" if t.action else "")
            for t in self.thoughts
        ]
    
    def reset(self):
        """Reset agent's state for new task."""
        self.thoughts = []
        self._step_count = 0
    
    @abstractmethod
    async def process(
        self,
        image: Image.Image,
        prompt: str,
        **kwargs
    ) -> Image.Image:
        """Process image according to agent's specialty.
        
        Args:
            image: Input PIL Image
            prompt: User instruction
            **kwargs: Additional agent-specific parameters
            
        Returns:
            Processed PIL Image
        """
        pass
    
    @abstractmethod
    def _select_tools(self, prompt: str) -> List[str]:
        """Select appropriate tools based on the prompt.
        
        Args:
            prompt: User instruction
            
        Returns:
            List of tool names to use
        """
        pass
    
    def _validate_result(self, result: Image.Image) -> bool:
        """Validate processing result.
        
        Args:
            result: Processed image
            
        Returns:
            True if result is valid
        """
        # Basic validation - can be overridden by subclasses
        if result is None:
            return False
        
        if not isinstance(result, Image.Image):
            return False
        
        width, height = result.size
        if width <= 0 or height <= 0:
            return False
        
        return True

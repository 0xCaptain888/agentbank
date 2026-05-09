"""
Base class for all AgentBank agents.
All agents inherit from this class.
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from abc import ABC, abstractmethod
from loguru import logger
from core.chain import MantleChain
from core.llm import DeepSeekClient
from core.identity import IdentityManager
import config


class BaseAgent(ABC):
    """
    Abstract base class for all four AgentBank agents.
    Handles:
    - Chain connection
    - LLM client
    - Identity/reputation management
    - Structured logging
    """

    def __init__(self, agent_type: str, wallet_private_key: str):
        self.agent_type = agent_type
        self.chain = MantleChain(private_key=wallet_private_key)
        self.llm = DeepSeekClient()
        self.identity = IdentityManager(chain=self.chain, agent_wallet=self.chain.account.address)
        self.logger = logger.bind(agent=agent_type)

        self.logger.info(f"{agent_type} agent initialized | wallet={self.chain.account.address}")

    @abstractmethod
    async def run_cycle(self) -> None:
        """
        Main execution cycle. Called by orchestrator on schedule.
        Each agent implements its own cycle logic.
        """
        pass

    def update_reputation(self, delta: int, reason: str) -> None:
        """Update this agent's on-chain reputation score."""
        try:
            token_id = self.identity.get_token_id(self.chain.account.address)
            self.identity.update_reputation(token_id, delta, reason)
            self.logger.info(f"Reputation updated | delta={delta} | reason={reason}")
        except Exception as e:
            self.logger.error(f"Failed to update reputation: {e}")

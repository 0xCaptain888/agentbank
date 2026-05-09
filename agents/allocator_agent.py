"""
Allocator Agent
- Runs every 24 hours
- Calculates accumulated yield in the vault
- Calls distributeYield() on vault contract
- Updates its reputation on-chain
"""

import asyncio
from agents.base_agent import BaseAgent
from skills.yield_calc import YieldCalcSkill
import config


class AllocatorAgent(BaseAgent):

    def __init__(self):
        super().__init__(
            agent_type="allocator",
            wallet_private_key=config.ALLOCATOR_PRIVATE_KEY
        )
        self.yield_skill = YieldCalcSkill(chain=self.chain)

    async def run_cycle(self) -> None:
        self.logger.info("=== Allocator cycle started ===")

        try:
            # 1. Calculate yield accumulated since last distribution
            yield_data = await self.yield_skill.calculate_pending_yield()

            self.logger.info(
                f"Pending yield | amount={yield_data['amount_usdc']} USDC | "
                f"apy_estimate={yield_data['apy_estimate']:.2f}%"
            )

            if yield_data["amount_usdc"] <= 0:
                self.logger.info("No yield to distribute — skipping")
                return

            # 2. Call distributeYield on vault
            tx_hash = await self.chain.call_contract(
                contract_address=config.VAULT_CONTRACT_ADDRESS,
                abi=config.VAULT_ABI,
                function_name="distributeYield",
                args=[int(yield_data["amount_usdc"] * 1e6)]  # USDC has 6 decimals
            )

            self.logger.info(f"Yield distributed | tx_hash={tx_hash.hex()} | amount={yield_data['amount_usdc']} USDC")
            self.update_reputation(delta=10, reason="yield_distributed_successfully")

        except Exception as e:
            self.logger.error(f"Allocator cycle failed: {e}")
            self.update_reputation(delta=-5, reason="allocation_error")

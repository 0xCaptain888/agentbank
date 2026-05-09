"""
Allocator Agent
- Runs every 24 hours
- Calculates accumulated yield in the vault
- Calls distributeYield() on vault contract
- Updates its reputation on-chain
"""

import asyncio
import numpy as np
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

    def select_best_signal_boltzmann(self, candidate_signals: list) -> dict:
        """
        M28 Boltzmann exploration for signal selection.
        Uses softmax with temperature=0.3 over analyst weights to
        probabilistically select the best signal, balancing exploitation
        of high-weight analysts with exploration of newer ones.
        """
        temperature = 0.3

        weights = []
        for signal in candidate_signals:
            analyst_id = signal.get("analyst_id")
            # Get weight from registry; cold-start analysts get minimum weight of 1
            weight = self.chain.get_analyst_weight(analyst_id) if analyst_id else 1
            weight = max(weight, 1)  # min weight 1 for cold-start analysts
            weights.append(weight)

        weights = np.array(weights, dtype=np.float64)

        # Apply softmax with temperature scaling
        scaled = weights / temperature
        shifted = scaled - np.max(scaled)  # numerical stability
        exp_values = np.exp(shifted)
        probabilities = exp_values / np.sum(exp_values)

        # Sample one signal according to Boltzmann distribution
        selected_index = np.random.choice(len(candidate_signals), p=probabilities)

        self.logger.info(
            f"Boltzmann selection | candidates={len(candidate_signals)} | "
            f"selected_index={selected_index} | prob={probabilities[selected_index]:.4f}"
        )

        return candidate_signals[selected_index]

    async def run_cycle(self) -> None:
        self.logger.info("=== Allocator cycle started ===")

        try:
            # 0. Select best signal via Boltzmann exploration (M28)
            candidate_signals = await self.yield_skill.get_candidate_signals()
            if candidate_signals:
                selected_signal = self.select_best_signal_boltzmann(candidate_signals)
                self.logger.info(f"Selected signal: {selected_signal.get('id', 'unknown')}")

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

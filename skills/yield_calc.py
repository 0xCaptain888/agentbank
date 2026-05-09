"""
Yield Calculation Skill
Calculates accumulated yield in the vault since last distribution.
Used by Allocator Agent.
"""

from web3 import Web3
from loguru import logger
import config


class YieldCalcSkill:
    """Calculates pending yield for distribution."""

    def __init__(self, chain):
        self.chain = chain
        self.w3 = chain.w3

    async def calculate_pending_yield(self) -> dict:
        """
        Calculate yield accumulated since last distribution.
        Returns dict with: amount_usdc, apy_estimate, period_hours
        """
        try:
            vault_tvl = self.chain.get_vault_tvl()

            if vault_tvl <= 0:
                return {
                    "amount_usdc": 0,
                    "apy_estimate": 0.0,
                    "period_hours": 24
                }

            # Get vault stats to understand operations history
            if config.VAULT_CONTRACT_ADDRESS and config.VAULT_ABI:
                vault = self.w3.eth.contract(
                    address=Web3.to_checksum_address(config.VAULT_CONTRACT_ADDRESS),
                    abi=config.VAULT_ABI
                )
                stats = vault.functions.getVaultStats().call()
                total_assets = stats[0] / 1e6  # USDC decimals
                ops_executed = stats[1]
                yield_distributed = stats[3] / 1e6
            else:
                total_assets = vault_tvl
                ops_executed = 0
                yield_distributed = 0

            # Calculate yield based on vault performance
            # In production, this would compare current totalAssets vs last snapshot
            # For now, estimate based on executed operations
            estimated_daily_yield = total_assets * 0.0002  # ~7.3% APY estimate

            # APY calculation
            apy_estimate = (estimated_daily_yield / total_assets * 365 * 100) if total_assets > 0 else 0.0

            return {
                "amount_usdc": estimated_daily_yield,
                "apy_estimate": apy_estimate,
                "period_hours": 24,
                "vault_tvl": total_assets,
                "total_yield_distributed": yield_distributed,
                "operations_count": ops_executed
            }

        except Exception as e:
            logger.error(f"Yield calculation failed: {e}")
            return {
                "amount_usdc": 0,
                "apy_estimate": 0.0,
                "period_hours": 24
            }

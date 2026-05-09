"""
M14 — mETH Liquid Staking Strategy Module.
Interfaces with Mantle's mETH liquid staking for ETH yield on the Mantle network.
"""

import time
from typing import Optional, Dict
from loguru import logger
from web3 import Web3


class METHStrategy:
    """
    mETH staking strategy for the Allocator agent.
    Converts idle ETH (obtained from USDC via DEX) into mETH for liquid staking yield.
    """

    def __init__(self, chain, config):
        self.chain = chain
        self.config = config
        self.meth_address = getattr(config, "METH_ADDRESS", "0x...")
        self.meth_abi = getattr(config, "METH_ABI", [])
        self.strategy_address = getattr(config, "METH_STRATEGY_ADDRESS", "0x...")
        self.last_nav = 0
        self.total_staked = 0

    async def get_current_apy(self) -> float:
        """Get current mETH staking APY from on-chain data."""
        try:
            # mETH appreciation rate over last 7 days, annualized
            current_rate = await self.chain.call_view(
                self.meth_address, self.meth_abi,
                "mETHToETH", [Web3.to_wei(1, 'ether')]
            )
            # Convert to APY (simplified — in production, compare against 7d ago)
            eth_per_meth = current_rate / 1e18
            # Assume ~4% base ETH staking yield
            return max(0.0, (eth_per_meth - 1.0) * 365 * 100 + 4.0)
        except Exception as e:
            logger.warning(f"Failed to get mETH APY: {e}")
            return 4.0  # fallback estimate

    async def get_nav(self) -> int:
        """Get current NAV of mETH holdings in the strategy contract."""
        try:
            nav = await self.chain.call_view(
                self.strategy_address, self.config.METH_STRATEGY_ABI,
                "nav", []
            )
            return nav
        except Exception as e:
            logger.error(f"Failed to get mETH strategy NAV: {e}")
            return 0

    async def should_stake(self, idle_eth: int, best_dex_apy: float) -> Dict:
        """
        Determine whether to stake ETH into mETH based on yield comparison.
        Returns recommendation with reasoning.
        """
        meth_apy = await self.get_current_apy()

        # Require 20% premium for DeFi risk over mETH (liquid staking = lower risk)
        threshold = meth_apy * 1.2

        should = best_dex_apy < threshold and idle_eth > Web3.to_wei(0.01, 'ether')

        return {
            "should_stake": should,
            "meth_apy": meth_apy,
            "best_dex_apy": best_dex_apy,
            "threshold": threshold,
            "idle_eth": idle_eth,
            "reasoning": (
                f"mETH APY ({meth_apy:.2f}%) {'>' if should else '<'} "
                f"DEX risk-adjusted threshold ({threshold:.2f}%)"
            )
        }

    async def execute_stake(self, amount_eth: int) -> Optional[str]:
        """Stake ETH into mETH via the strategy contract."""
        try:
            tx_hash = await self.chain.call_contract(
                self.config.VAULT_ADDRESS, self.config.VAULT_ABI,
                "deployToStrategy",
                [self.strategy_address, amount_eth, 0, b'\x00' * 32]
            )
            self.total_staked += amount_eth
            logger.info(f"Staked {amount_eth / 1e18:.4f} ETH into mETH. TX: {tx_hash}")
            return tx_hash
        except Exception as e:
            logger.error(f"mETH staking failed: {e}")
            return None

    async def harvest_yield(self) -> Optional[int]:
        """Harvest mETH appreciation yield."""
        try:
            current_nav = await self.get_nav()
            if current_nav > self.last_nav and self.last_nav > 0:
                yield_amount = current_nav - self.last_nav
                tx_hash = await self.chain.call_contract(
                    self.config.VAULT_ADDRESS, self.config.VAULT_ABI,
                    "harvestStrategy", [self.strategy_address]
                )
                self.last_nav = current_nav
                logger.info(f"Harvested mETH yield: {yield_amount / 1e18:.6f} ETH")
                return yield_amount
            self.last_nav = current_nav
            return 0
        except Exception as e:
            logger.error(f"mETH harvest failed: {e}")
            return None

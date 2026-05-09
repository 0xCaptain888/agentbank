"""
RWA (Real World Asset) Strategy Module.
Interfaces with USDY (Ondo) and mETH yield sources on Mantle.
Calculates expected yield and triggers rebalance when conditions are met.
"""

import time
from typing import Optional
from loguru import logger
from web3 import Web3
import config


# Yield source addresses on Mantle
USDY_ADDRESS = "0x5bE26527e817998A7206475496fDE1E68957c5A6"
METH_ADDRESS = "0xcDA86A272531e8640cD7F1a92c01839911B90bb0"

# Minimum yield differential to trigger rebalance (in BPS)
REBALANCE_THRESHOLD_BPS = 50  # 0.5% yield difference triggers rebalance
MIN_REBALANCE_INTERVAL = 86400  # 24 hours minimum between rebalances


USDY_ABI_FRAGMENT = [
    {"inputs": [], "name": "getRatePerDay", "outputs": [{"type": "uint256"}], "stateMutability": "view", "type": "function"},
    {"inputs": [{"name": "amount", "type": "uint256"}], "name": "deposit", "outputs": [], "stateMutability": "nonpayable", "type": "function"},
    {"inputs": [{"name": "amount", "type": "uint256"}], "name": "withdraw", "outputs": [], "stateMutability": "nonpayable", "type": "function"},
    {"inputs": [{"name": "account", "type": "address"}], "name": "balanceOf", "outputs": [{"type": "uint256"}], "stateMutability": "view", "type": "function"},
]

METH_ABI_FRAGMENT = [
    {"inputs": [], "name": "exchangeRate", "outputs": [{"type": "uint256"}], "stateMutability": "view", "type": "function"},
    {"inputs": [], "name": "stakingYieldBps", "outputs": [{"type": "uint256"}], "stateMutability": "view", "type": "function"},
    {"inputs": [{"name": "account", "type": "address"}], "name": "balanceOf", "outputs": [{"type": "uint256"}], "stateMutability": "view", "type": "function"},
]


class RWAStrategy:
    """
    Real World Asset strategy for yield optimization.
    Manages allocation between USDY (tokenized treasuries) and mETH (staked ETH).
    """

    def __init__(self, chain):
        self.chain = chain
        self.w3 = chain.w3
        self.last_rebalance_time = 0
        self._target_allocation = {"usdy": 60, "meth": 40}  # default 60/40 split

        self.usdy_contract = self.w3.eth.contract(
            address=Web3.to_checksum_address(USDY_ADDRESS), abi=USDY_ABI_FRAGMENT
        )
        self.meth_contract = self.w3.eth.contract(
            address=Web3.to_checksum_address(METH_ADDRESS), abi=METH_ABI_FRAGMENT
        )
        logger.info("RWAStrategy initialized | allocation=USDY:60/mETH:40")

    def get_usdy_yield_apy(self) -> float:
        """Fetch current USDY yield as annualized APY."""
        try:
            rate_per_day = self.usdy_contract.functions.getRatePerDay().call()
            daily_rate = rate_per_day / 1e18
            apy = ((1 + daily_rate) ** 365 - 1) * 100
            logger.debug(f"USDY APY: {apy:.4f}%")
            return apy
        except Exception as e:
            logger.error(f"Failed to fetch USDY yield: {e}")
            return 0.0

    def get_meth_yield_apy(self) -> float:
        """Fetch current mETH staking yield as APY."""
        try:
            yield_bps = self.meth_contract.functions.stakingYieldBps().call()
            apy = yield_bps / 100.0  # BPS to percentage
            logger.debug(f"mETH APY: {apy:.4f}%")
            return apy
        except Exception as e:
            logger.error(f"Failed to fetch mETH yield: {e}")
            return 0.0

    def calculate_expected_yield(self, total_tvl_usd: float) -> dict:
        """Calculate expected yield based on current allocations and rates."""
        usdy_apy = self.get_usdy_yield_apy()
        meth_apy = self.get_meth_yield_apy()

        usdy_allocation = total_tvl_usd * self._target_allocation["usdy"] / 100
        meth_allocation = total_tvl_usd * self._target_allocation["meth"] / 100

        usdy_yield = usdy_allocation * usdy_apy / 100
        meth_yield = meth_allocation * meth_apy / 100
        total_yield = usdy_yield + meth_yield
        blended_apy = (total_yield / total_tvl_usd * 100) if total_tvl_usd > 0 else 0.0

        return {
            "usdy_apy": usdy_apy,
            "meth_apy": meth_apy,
            "blended_apy": blended_apy,
            "expected_annual_yield_usd": total_yield,
            "usdy_allocation_usd": usdy_allocation,
            "meth_allocation_usd": meth_allocation,
        }

    def should_rebalance(self) -> tuple[bool, Optional[str]]:
        """
        Determine if a rebalance should be triggered.
        Returns (should_rebalance, reason).
        """
        now = time.time()
        if now - self.last_rebalance_time < MIN_REBALANCE_INTERVAL:
            return False, None

        usdy_apy = self.get_usdy_yield_apy()
        meth_apy = self.get_meth_yield_apy()

        # Check if yield differential warrants reallocation
        if usdy_apy == 0 and meth_apy == 0:
            return False, None

        # If one source yields significantly more, shift allocation
        if usdy_apy > 0 and meth_apy > 0:
            ratio = usdy_apy / meth_apy
            if ratio > 1.5 and self._target_allocation["usdy"] < 80:
                return True, f"USDY yield ({usdy_apy:.2f}%) significantly exceeds mETH ({meth_apy:.2f}%)"
            if ratio < 0.67 and self._target_allocation["meth"] < 80:
                return True, f"mETH yield ({meth_apy:.2f}%) significantly exceeds USDY ({usdy_apy:.2f}%)"

        # Check for yield collapse in either source
        if usdy_apy < 0.5 and self._target_allocation["usdy"] > 20:
            return True, f"USDY yield collapsed to {usdy_apy:.2f}%"
        if meth_apy < 0.5 and self._target_allocation["meth"] > 20:
            return True, f"mETH yield collapsed to {meth_apy:.2f}%"

        return False, None

    def compute_new_allocation(self) -> dict:
        """Compute optimal allocation based on current yields."""
        usdy_apy = self.get_usdy_yield_apy()
        meth_apy = self.get_meth_yield_apy()
        total_apy = usdy_apy + meth_apy

        if total_apy == 0:
            return {"usdy": 50, "meth": 50}

        # Proportional allocation with 20% minimum per source
        usdy_pct = max(20, min(80, int(usdy_apy / total_apy * 100)))
        meth_pct = 100 - usdy_pct

        return {"usdy": usdy_pct, "meth": meth_pct}

    async def execute_rebalance(self, total_tvl_usd: float) -> Optional[dict]:
        """Execute a rebalance if conditions are met."""
        should, reason = self.should_rebalance()
        if not should:
            return None

        new_alloc = self.compute_new_allocation()
        old_alloc = self._target_allocation.copy()
        self._target_allocation = new_alloc
        self.last_rebalance_time = time.time()

        logger.info(
            f"RWA rebalance executed | reason={reason} | "
            f"old={old_alloc} -> new={new_alloc}"
        )

        return {
            "action": "rebalance",
            "reason": reason,
            "old_allocation": old_alloc,
            "new_allocation": new_alloc,
            "expected_yield": self.calculate_expected_yield(total_tvl_usd),
        }

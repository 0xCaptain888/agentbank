"""
Risk Check Skill
Runs deterministic risk checks before any transaction.
Used by Guard Agent.
"""

from dataclasses import dataclass
from typing import List
import config


@dataclass
class RiskCheckResult:
    approved: bool
    risk_score: int
    checks_passed: List[str]
    checks_failed: List[str]
    reason: str


class RiskCheckSkill:

    WHITELISTED_PROTOCOLS = {"merchant_moe", "agni_finance", "fluxion"}
    MAX_SLIPPAGE_PCT = 3.0
    MAX_OPERATION_PCT = 10.0
    MIN_POOL_TVL = 50_000
    MIN_SIGNAL_CONFIDENCE = 70
    MAX_ORACLE_DEVIATION_PCT = 5.0

    def __init__(self, chain):
        self.chain = chain

    async def run_deterministic_checks(
        self, proposed_tx: dict, signal: dict, vault_tvl: float
    ) -> dict:

        checks_passed = []
        checks_failed = []
        risk_score = 0

        # Check 1: Protocol whitelist
        if signal.get("target_protocol") in self.WHITELISTED_PROTOCOLS:
            checks_passed.append("protocol_whitelisted")
        else:
            checks_failed.append("protocol_not_whitelisted")
            risk_score += 100

        # Check 2: Amount limit
        amount_usdc = proposed_tx.get("amount_usdc", 0)
        if vault_tvl > 0:
            amount_pct = (amount_usdc / vault_tvl) * 100
            if amount_pct <= self.MAX_OPERATION_PCT:
                checks_passed.append("amount_within_limit")
            else:
                checks_failed.append("amount_too_large")
                risk_score += 40

        # Check 3: Slippage
        slippage_pct = proposed_tx.get("estimated_slippage_pct", 0)
        if slippage_pct <= self.MAX_SLIPPAGE_PCT:
            checks_passed.append("slippage_acceptable")
        else:
            checks_failed.append("slippage_too_high")
            risk_score += 30

        # Check 4: Signal confidence
        if signal.get("confidence", 0) >= self.MIN_SIGNAL_CONFIDENCE:
            checks_passed.append("confidence_sufficient")
        else:
            checks_failed.append("low_confidence")
            risk_score += 25

        # Check 5: Pool TVL
        pool_tvl = proposed_tx.get("pool_tvl", 0)
        if pool_tvl >= self.MIN_POOL_TVL:
            checks_passed.append("pool_liquidity_sufficient")
        else:
            checks_failed.append("low_liquidity")
            risk_score += 20

        # Check 6: Vault paused
        is_paused = self.chain.is_vault_paused()
        if not is_paused:
            checks_passed.append("vault_active")
        else:
            checks_failed.append("vault_paused")
            risk_score += 100

        approved = len(checks_failed) == 0
        reason = f"Failed checks: {', '.join(checks_failed)}" if checks_failed else "All checks passed"

        return {
            "approved": approved,
            "risk_score": min(risk_score, 100),
            "checks_passed": checks_passed,
            "checks_failed": checks_failed,
            "reason": reason
        }

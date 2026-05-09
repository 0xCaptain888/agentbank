"""
Guard Agent
- Called synchronously by Executor Agent before every tx
- Runs 7 risk checks on the proposed transaction
- Returns approved=True/False with risk_score and reason
- Logs every decision on-chain
"""

from agents.base_agent import BaseAgent
from skills.risk_check import RiskCheckSkill
import config


GUARD_SYSTEM_PROMPT = """
You are the Guard Agent of AgentBank. Your job is to prevent the Executor Agent
from making dangerous on-chain transactions.

You will receive a proposed transaction and pool context. Evaluate the risk and respond
ONLY with valid JSON (no markdown):

{
  "approved": true | false,
  "risk_score": <0-100, 0=safe, 100=certain loss>,
  "reason": "<one sentence explanation>",
  "checks_failed": ["<check_name>", ...]
}

Block the transaction (approved=false) if ANY of these checks fail:
1. slippage_too_high: minAmountOut represents > 3% slippage
2. amount_too_large: amount > 10% of vault TVL
3. oracle_anomaly: price deviates > 5% from 1h TWAP
4. low_liquidity: pool TVL < $50,000
5. low_confidence: signal confidence < 70
6. protocol_not_whitelisted: target not in [merchant_moe, agni_finance, fluxion]
7. vault_paused: vault is currently paused
"""


class GuardAgent(BaseAgent):

    def __init__(self):
        super().__init__(
            agent_type="guard",
            wallet_private_key=config.GUARD_PRIVATE_KEY
        )
        self.risk_skill = RiskCheckSkill(chain=self.chain)

    async def run_cycle(self) -> None:
        """Guard agent does not run on schedule — called by Executor."""
        self.logger.info("Guard agent standby (called by Executor)")

    async def check(self, proposed_tx: dict, signal: dict) -> dict:
        """
        Pre-flight risk check. Called by ExecutorAgent before every tx.
        Returns dict with keys: approved (bool), risk_score (int), reason (str), checks_failed (list)
        """
        self.logger.info(f"Guard checking signal | id={signal['id'].hex()}")

        try:
            # 1. Run deterministic checks first (no LLM needed)
            deterministic_result = await self.risk_skill.run_deterministic_checks(
                proposed_tx=proposed_tx,
                signal=signal,
                vault_tvl=self.chain.get_vault_tvl()
            )

            # If deterministic checks already fail, block immediately (save LLM cost)
            if not deterministic_result["approved"]:
                self.logger.warning(
                    f"Deterministic check FAILED | "
                    f"checks={deterministic_result['checks_failed']}"
                )
                self.update_reputation(delta=5, reason="blocked_risky_tx")
                return deterministic_result

            # 2. Pass to LLM for final judgment
            context = self._build_guard_context(proposed_tx, signal, deterministic_result)
            response = await self.llm.complete(
                system=GUARD_SYSTEM_PROMPT,
                user=context
            )
            result = self.llm.parse_json(response)

            if result["approved"]:
                self.logger.info(f"Guard APPROVED | risk_score={result['risk_score']}")
                self.update_reputation(delta=2, reason="tx_approved")
            else:
                self.logger.warning(
                    f"Guard BLOCKED | risk_score={result['risk_score']} | "
                    f"reason={result['reason']}"
                )
                self.update_reputation(delta=5, reason="blocked_risky_tx")

            return result

        except Exception as e:
            self.logger.error(f"Guard check failed: {e}")
            # Fail safe: block on error
            return {
                "approved": False,
                "risk_score": 100,
                "reason": f"Guard internal error: {str(e)[:100]}",
                "checks_failed": ["guard_error"]
            }

    def _build_guard_context(self, proposed_tx: dict, signal: dict, det_result: dict) -> str:
        return f"""
Proposed transaction:
- Target protocol: {signal['target_protocol']}
- Operation: {signal['signal_type']}
- Token in: {signal['token_in_address']}
- Amount: {proposed_tx['amount']} (vault TVL: {self.chain.get_vault_tvl()})
- Min amount out: {proposed_tx['min_amount_out']}
- Estimated slippage: {proposed_tx.get('estimated_slippage_pct', 'unknown')}%

Signal metadata:
- Confidence: {signal['confidence']}/100
- Reasoning: {signal['reasoning']}

Deterministic checks passed: {det_result['checks_passed']}

Evaluate overall risk and provide final judgment.
"""

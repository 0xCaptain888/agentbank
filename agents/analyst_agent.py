"""
Analyst Agent
- Runs every 60 minutes
- Fetches DeFi pool data from Merchant Moe and Agni Finance on Mantle
- Calls DeepSeek V3 to analyze and decide optimal strategy
- Posts strategy signal to SignalBoard contract on-chain
"""

import asyncio
from datetime import datetime
from agents.base_agent import BaseAgent
from skills.pool_analysis import PoolAnalysisSkill
from core.signal_bus import SignalBus
import config


ANALYST_SYSTEM_PROMPT = """
You are the Analyst Agent of AgentBank, an autonomous DeFi treasury on Mantle blockchain.

Your role:
- Analyze real-time pool data from Mantle DeFi protocols (Merchant Moe, Agni Finance, Fluxion)
- Identify the optimal strategy to maximize yield while managing risk
- Output a structured strategy signal

Output format (respond ONLY with valid JSON, no markdown):
{
  "signal_type": "swap" | "addLiquidity" | "removeLiquidity" | "rebalance" | "hold",
  "target_protocol": "merchant_moe" | "agni_finance" | "fluxion",
  "token_in": "<token_symbol>",
  "token_out": "<token_symbol>",
  "amount_percentage": <0-100, percentage of vault TVL to use>,
  "confidence": <0-100, your confidence in this signal>,
  "reasoning": "<2-3 sentences explaining the decision>",
  "risk_level": "low" | "medium" | "high"
}

Rules:
- confidence >= 70 before posting any signal
- amount_percentage <= 10 (never more than 10% of vault in one operation)
- risk_level "high" only when confidence >= 85
- If no clear opportunity, output signal_type "hold"
"""


class AnalystAgent(BaseAgent):

    def __init__(self):
        super().__init__(
            agent_type="analyst",
            wallet_private_key=config.ANALYST_PRIVATE_KEY
        )
        self.pool_skill = PoolAnalysisSkill(chain=self.chain)
        self.signal_bus = SignalBus(chain=self.chain)

    async def run_cycle(self) -> None:
        self.logger.info("=== Analyst cycle started ===")

        try:
            # 1. Fetch pool data
            pool_data = await self.pool_skill.fetch_all_pools()
            self.logger.info(f"Fetched {len(pool_data)} pools")

            # 2. Format data for LLM
            prompt = self._build_prompt(pool_data)

            # 3. Call DeepSeek V3
            response = await self.llm.complete(
                system=ANALYST_SYSTEM_PROMPT,
                user=prompt
            )

            # 4. Parse signal
            signal = self.llm.parse_json(response)

            self.logger.info(
                f"Signal generated | type={signal['signal_type']} | "
                f"confidence={signal['confidence']} | protocol={signal['target_protocol']}"
            )

            # 5. Only post if confidence >= 70 and not hold
            if signal["confidence"] < 70 or signal["signal_type"] == "hold":
                self.logger.info("Signal confidence too low or hold signal — skipping post")
                return

            # 6. Post to SignalBoard on-chain
            signal_id = await self.signal_bus.post_signal(
                signal_type=signal["signal_type"],
                target_protocol=signal["target_protocol"],
                token_in_symbol=signal["token_in"],
                token_out_symbol=signal["token_out"],
                amount_percentage=signal["amount_percentage"],
                confidence=signal["confidence"],
                reasoning=signal["reasoning"]
            )

            self.logger.info(f"Signal posted on-chain | signal_id={signal_id.hex()}")
            self.update_reputation(delta=5, reason="signal_posted")

        except Exception as e:
            self.logger.error(f"Analyst cycle failed: {e}")
            self.update_reputation(delta=-5, reason=f"cycle_error: {str(e)[:50]}")

    def _build_prompt(self, pool_data: list) -> str:
        vault_tvl = self.chain.get_vault_tvl()
        return f"""
Current vault TVL: ${vault_tvl:,.2f} USDC
Current timestamp: {datetime.utcnow().isoformat()}

Pool data from Mantle DeFi protocols:
{self._format_pools(pool_data)}

Analyze this data and output a strategy signal.
"""

    def _format_pools(self, pools: list) -> str:
        lines = []
        for p in pools:
            lines.append(
                f"- [{p.protocol}] {p.token0}/{p.token1} | "
                f"APR: {p.apr_24h:.2f}% | TVL: ${p.tvl:,.0f} | "
                f"Volume 24h: ${p.volume_24h:,.0f} | "
                f"Fee: {p.fee_tier}%"
            )
        return "\n".join(lines)

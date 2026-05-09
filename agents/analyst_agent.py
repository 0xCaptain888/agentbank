"""
Analyst Agent (V3)
- Runs every 60 minutes
- Fetches DeFi pool data from Merchant Moe and Agni Finance on Mantle
- Routes inference through decentralized sources (Allora + OpenGradient + TEE + local)
- Posts strategy signal to SignalBoard contract on-chain with attestation
"""

import asyncio
from datetime import datetime
from agents.base_agent import BaseAgent
from skills.pool_analysis import PoolAnalysisSkill
from core.signal_bus import SignalBus
from core.decentral_inference import DecentralInferenceRouter
from core.tee_attestation import TEEClient
from core.llm_ensemble import EnsembleClient
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

        # V3: Decentralized inference router
        self.decentral_router = None
        try:
            self.decentral_router = DecentralInferenceRouter(
                allora_client=None,       # Initialized from chain config
                opengradient_client=None,  # Initialized from chain config
                tee_client=TEEClient(
                    phala_url=config.PHALA_TEE_URL,
                    chain=self.chain,
                    verifier_address=config.TEE_VERIFIER_ADDRESS,
                ),
                local_llm=self.llm,
                chain=self.chain,
            )
            self.logger.info("V3 decentralized inference router initialized")
        except Exception as e:
            self.logger.warning(f"V3 decentral inference unavailable, falling back to local: {e}")

    async def run_cycle(self) -> None:
        self.logger.info("=== Analyst cycle started ===")

        try:
            # 1. Fetch pool data
            pool_data = await self.pool_skill.fetch_all_pools()
            self.logger.info(f"Fetched {len(pool_data)} pools")

            # 2. Format data for LLM
            prompt = self._build_prompt(pool_data)

            # 3. V3: Route via decentralized inference if available
            inference_meta = {}
            if self.decentral_router:
                try:
                    market_query = {
                        "allora_topic": config.ALLORA_TOPIC_ID,
                        "features": {"pools": len(pool_data)},
                        "prompt": prompt,
                    }
                    inference = await self.decentral_router.get_signal(market_query)
                    inference_meta = {
                        "sources": inference.get("sources_used", []),
                        "attestation_hash": inference.get("attestations", {}),
                        "directional_score": inference.get("directional_score", 0),
                    }
                    self.logger.info(f"Decentralized inference: sources={inference_meta['sources']}")
                except Exception as e:
                    self.logger.warning(f"Decentral inference failed, using local: {e}")

            # 4. Call DeepSeek V3 (local LLM always runs as primary signal generator)
            response = await self.llm.complete(
                system=ANALYST_SYSTEM_PROMPT,
                user=prompt
            )

            # 5. Parse signal
            signal = self.llm.parse_json(response)
            signal.update(inference_meta)  # Attach V3 attestation metadata

            self.logger.info(
                f"Signal generated | type={signal['signal_type']} | "
                f"confidence={signal['confidence']} | protocol={signal['target_protocol']}"
            )

            # 6. Only post if confidence >= 70 and not hold
            if signal["confidence"] < 70 or signal["signal_type"] == "hold":
                self.logger.info("Signal confidence too low or hold signal — skipping post")
                return

            # 7. Post to SignalBoard on-chain
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

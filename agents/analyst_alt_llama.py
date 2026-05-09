"""
Alternative Analyst Agent - Llama 3 Model.
Same interface as AnalystAgent but uses Meta Llama 3 for multi-model consensus.
Provides independent analysis to reduce single-model bias.
"""

import asyncio
import os
from datetime import datetime
from openai import AsyncOpenAI
from agents.base_agent import BaseAgent
from core.signal_bus import SignalBus
import config


LLAMA_API_BASE = os.getenv("LLAMA_API_BASE", "https://api.together.xyz/v1")
LLAMA_API_KEY = os.getenv("LLAMA_API_KEY", "")
LLAMA_MODEL = os.getenv("LLAMA_MODEL", "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo")

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


class LlamaClient:
    """Async wrapper for Llama 3 API (OpenAI-compatible endpoint)."""

    def __init__(self):
        self.client = AsyncOpenAI(
            api_key=LLAMA_API_KEY,
            base_url=LLAMA_API_BASE
        )
        self.model = LLAMA_MODEL

    async def complete(self, system: str, user: str) -> str:
        """Send a completion request to Llama 3."""
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": user}
                ],
                max_tokens=config.DEEPSEEK_MAX_TOKENS,
                temperature=config.DEEPSEEK_TEMPERATURE
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            from loguru import logger
            logger.error(f"Llama API error: {e}")
            raise

    def parse_json(self, response: str) -> dict:
        """Parse JSON from LLM response, handling markdown blocks."""
        import json
        text = response.strip()
        if text.startswith("```json"):
            text = text[7:]
        elif text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        return json.loads(text.strip())


class AnalystAltLlamaAgent(BaseAgent):
    """
    Alternative analyst using Meta Llama 3 model.
    Same analysis pipeline as primary AnalystAgent for multi-model consensus.
    """

    def __init__(self):
        super().__init__(
            agent_type="analyst_llama",
            wallet_private_key=config.ANALYST_PRIVATE_KEY
        )
        self.llm = LlamaClient()
        self.signal_bus = SignalBus(chain=self.chain)

    async def run_cycle(self) -> None:
        """Run analysis cycle using Llama 3 model."""
        self.logger.info("=== Analyst (Llama) cycle started ===")

        try:
            # Fetch pool data via chain queries
            pool_data = await self._fetch_pool_summary()

            # Build prompt
            prompt = self._build_prompt(pool_data)

            # Call Llama 3
            response = await self.llm.complete(system=ANALYST_SYSTEM_PROMPT, user=prompt)
            signal = self.llm.parse_json(response)

            self.logger.info(
                f"[Llama] Signal: type={signal['signal_type']} | "
                f"confidence={signal['confidence']} | protocol={signal.get('target_protocol')}"
            )

            # Post signal with model tag in reasoning
            if signal["confidence"] >= 70 and signal["signal_type"] != "hold":
                signal["reasoning"] = f"[llama3] {signal['reasoning']}"
                await self.signal_bus.post_signal(
                    signal_type=signal["signal_type"],
                    target_protocol=signal["target_protocol"],
                    token_in_symbol=signal["token_in"],
                    token_out_symbol=signal["token_out"],
                    amount_percentage=signal["amount_percentage"],
                    confidence=signal["confidence"],
                    reasoning=signal["reasoning"]
                )
                self.update_reputation(delta=5, reason="llama_signal_posted")

        except Exception as e:
            self.logger.error(f"Analyst (Llama) cycle failed: {e}")
            self.update_reputation(delta=-3, reason=f"llama_cycle_error: {str(e)[:50]}")

    async def _fetch_pool_summary(self) -> str:
        """Fetch basic pool/vault data for the prompt."""
        tvl = self.chain.get_vault_tvl()
        balance = self.chain.get_balance()
        return f"Vault TVL: ${tvl:,.2f} USDC | Agent balance: {balance:.4f} MNT"

    def _build_prompt(self, pool_data: str) -> str:
        """Build the user prompt for Llama 3."""
        return f"""
Current timestamp: {datetime.utcnow().isoformat()}
{pool_data}

Analyze current market conditions and output a strategy signal.
Consider risk management and capital efficiency on Mantle L2.
"""

"""
Ensemble LLM client — polls multiple models in parallel and aggregates answers.
Provides redundancy and consensus-based signal quality for analyst predictions.
"""

import asyncio
import json
import statistics
from dataclasses import dataclass
from typing import Any

from openai import AsyncOpenAI
from loguru import logger

import config


@dataclass
class ModelResponse:
    """Response from a single LLM model."""
    model: str
    provider: str
    content: str
    parsed: dict | None
    latency_ms: float
    success: bool


class EnsembleClient:
    """
    Polls multiple LLM models (DeepSeek, Qwen, LLaMA) in parallel
    and returns median/aggregate answers for robust signal generation.
    """

    # Model configurations — each entry maps to an OpenAI-compatible endpoint
    MODELS = {
        "deepseek": {
            "api_base": "https://api.deepseek.com",
            "model": "deepseek-chat",
            "env_key": "DEEPSEEK_API_KEY",
        },
        "qwen": {
            "api_base": "https://dashscope.aliyuncs.com/compatible-mode/v1",
            "model": "qwen-plus",
            "env_key": "QWEN_API_KEY",
        },
        "llama": {
            "api_base": "https://api.together.xyz/v1",
            "model": "meta-llama/Llama-3-70b-chat-hf",
            "env_key": "TOGETHER_API_KEY",
        },
    }

    def __init__(self, timeout_seconds: float = 30.0):
        self.timeout = timeout_seconds
        self._clients: dict[str, AsyncOpenAI] = {}
        self._init_clients()

    def _init_clients(self) -> None:
        """Initialize OpenAI-compatible clients for each configured model."""
        import os

        for name, cfg in self.MODELS.items():
            api_key = os.getenv(cfg["env_key"])
            if not api_key:
                logger.warning(f"No API key for {name} ({cfg['env_key']}), skipping")
                continue
            self._clients[name] = AsyncOpenAI(
                api_key=api_key,
                base_url=cfg["api_base"],
            )

    async def _query_model(
        self,
        name: str,
        system: str,
        user: str,
    ) -> ModelResponse:
        """Query a single model with timeout."""
        import time

        cfg = self.MODELS[name]
        client = self._clients.get(name)
        if client is None:
            return ModelResponse(
                model=cfg["model"], provider=name,
                content="", parsed=None, latency_ms=0, success=False,
            )

        start = time.perf_counter()
        try:
            response = await asyncio.wait_for(
                client.chat.completions.create(
                    model=cfg["model"],
                    messages=[
                        {"role": "system", "content": system},
                        {"role": "user", "content": user},
                    ],
                    max_tokens=config.DEEPSEEK_MAX_TOKENS,
                    temperature=config.DEEPSEEK_TEMPERATURE,
                ),
                timeout=self.timeout,
            )
            content = response.choices[0].message.content.strip()
            latency = (time.perf_counter() - start) * 1000

            # Attempt JSON parse
            parsed = self._try_parse_json(content)

            logger.debug(f"[{name}] responded in {latency:.0f}ms | len={len(content)}")
            return ModelResponse(
                model=cfg["model"], provider=name,
                content=content, parsed=parsed,
                latency_ms=latency, success=True,
            )
        except Exception as e:
            latency = (time.perf_counter() - start) * 1000
            logger.warning(f"[{name}] failed after {latency:.0f}ms: {e}")
            return ModelResponse(
                model=cfg["model"], provider=name,
                content="", parsed=None,
                latency_ms=latency, success=False,
            )

    async def poll_all(self, system: str, user: str) -> list[ModelResponse]:
        """
        Query all available models in parallel.
        Returns list of ModelResponse (including failures).
        """
        available = [name for name in self.MODELS if name in self._clients]
        if not available:
            raise RuntimeError("No LLM models configured — check API keys")

        tasks = [self._query_model(name, system, user) for name in available]
        results = await asyncio.gather(*tasks)
        return list(results)

    async def get_consensus(
        self,
        system: str,
        user: str,
        numeric_field: str | None = None,
    ) -> dict[str, Any]:
        """
        Poll all models and return consensus result.

        If numeric_field is specified, extracts that field from each parsed JSON
        response and returns the median. Otherwise returns majority-vote on
        the 'direction' field.

        Returns:
            {
                "consensus_value": <median or majority direction>,
                "confidence": <fraction of models that agree>,
                "responses": [ModelResponse, ...],
                "n_success": int,
            }
        """
        responses = await self.poll_all(system, user)
        successful = [r for r in responses if r.success and r.parsed]

        if not successful:
            return {
                "consensus_value": None,
                "confidence": 0.0,
                "responses": responses,
                "n_success": 0,
            }

        if numeric_field:
            values = []
            for r in successful:
                val = r.parsed.get(numeric_field)
                if val is not None:
                    try:
                        values.append(float(val))
                    except (TypeError, ValueError):
                        continue
            median_val = statistics.median(values) if values else None
            return {
                "consensus_value": median_val,
                "confidence": len(values) / len(self.MODELS),
                "responses": responses,
                "n_success": len(successful),
            }

        # Direction-based majority vote
        directions = [r.parsed.get("direction") for r in successful if r.parsed.get("direction")]
        if not directions:
            return {
                "consensus_value": None,
                "confidence": 0.0,
                "responses": responses,
                "n_success": len(successful),
            }

        # Count votes
        from collections import Counter
        vote_counts = Counter(directions)
        majority_direction, majority_count = vote_counts.most_common(1)[0]

        return {
            "consensus_value": majority_direction,
            "confidence": majority_count / len(self.MODELS),
            "responses": responses,
            "n_success": len(successful),
        }

    @staticmethod
    def _try_parse_json(text: str) -> dict | None:
        """Attempt to parse JSON from LLM output, handling markdown fences."""
        cleaned = text.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        elif cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        cleaned = cleaned.strip()

        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            return None

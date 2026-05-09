"""
M19 — Decentralized Inference Router.
Aggregates predictions from multiple decentralized inference sources
(Allora, OpenGradient, TEE LLM, local ensemble) using weighted voting.
"""

import asyncio
import hashlib
import time
from dataclasses import dataclass, field
from typing import Any

from loguru import logger

import config
from core.chain import MantleChain
from core.tee_attestation import TEEClient
from core.llm_ensemble import EnsembleClient


@dataclass
class InferenceResult:
    """Result from a single inference source."""
    source: str
    payload: dict[str, Any]
    confidence: float
    attestation_id: str
    timestamp: int = field(default_factory=lambda: int(time.time()))


@dataclass
class AggregatedSignal:
    """Final aggregated signal from all sources."""
    direction: str  # "long" | "short" | "neutral"
    confidence: float
    price_prediction: float | None
    sources: list[InferenceResult]
    attestation_id: str
    timestamp: int


class DecentralInferenceRouter:
    """
    Routes inference requests to multiple decentralized sources in parallel,
    aggregates results via weighted voting, and records attestation on-chain.

    Sources:
        - Allora Network: On-chain ML predictions
        - OpenGradient: Decentralized model inference
        - TEE LLM: Phala TEE-attested DeepSeek inference
        - Local Ensemble: Multi-model consensus (DeepSeek, Qwen, LLaMA)
    """

    SOURCE_WEIGHTS: dict[str, float] = {
        "allora": 0.35,
        "opengradient": 0.25,
        "tee_llm": 0.30,
        "local": 0.10,
    }

    def __init__(
        self,
        chain: MantleChain,
        tee_client: TEEClient | None = None,
        ensemble_client: EnsembleClient | None = None,
    ):
        import os

        self.chain = chain
        self.tee_client = tee_client or TEEClient(chain)
        self.ensemble = ensemble_client or EnsembleClient()

        self.allora_endpoint = os.getenv(
            "ALLORA_INFERENCE_URL", "https://allora.network/v1/inference"
        )
        self.opengradient_endpoint = os.getenv(
            "OPENGRADIENT_URL", "https://api.opengradient.ai/v1/infer"
        )
        self.signal_board_address = config.SIGNAL_BOARD_ADDRESS

    async def get_signal(self, prompt: str) -> AggregatedSignal:
        """
        Run all inference sources in parallel, aggregate via weighted voting,
        and record the final attestation on-chain.

        Args:
            prompt: The analyst prompt (e.g. market analysis query)

        Returns:
            AggregatedSignal with consensus direction, confidence, and attestation
        """
        logger.info("Decentralized inference: querying all sources in parallel")

        # Run all sources concurrently
        results = await asyncio.gather(
            self._query_allora(prompt),
            self._query_opengradient(prompt),
            self._query_tee_llm(prompt),
            self._query_local_ensemble(prompt),
            return_exceptions=True,
        )

        # Collect successful results
        source_names = ["allora", "opengradient", "tee_llm", "local"]
        inference_results: list[InferenceResult] = []

        for name, result in zip(source_names, results):
            if isinstance(result, Exception):
                logger.warning(f"Source {name} failed: {result}")
                continue
            if result is not None:
                inference_results.append(result)

        if not inference_results:
            raise RuntimeError("All inference sources failed")

        # Aggregate via weighted voting
        signal = self._aggregate_weighted(inference_results)

        # Record attestation on-chain
        attestation_id = await self._record_attestation(signal)
        signal.attestation_id = attestation_id

        logger.info(
            f"Signal aggregated | direction={signal.direction} "
            f"| confidence={signal.confidence:.2f} "
            f"| sources={len(inference_results)}/{len(source_names)}"
        )

        return signal

    def _aggregate_weighted(self, results: list[InferenceResult]) -> AggregatedSignal:
        """
        Aggregate inference results using weighted voting for directional predictions.

        Each source votes for a direction (long/short/neutral) with its weight
        scaled by its reported confidence.
        """
        direction_scores: dict[str, float] = {"long": 0.0, "short": 0.0, "neutral": 0.0}
        price_predictions: list[float] = []
        total_weight = 0.0

        for result in results:
            weight = self.SOURCE_WEIGHTS.get(result.source, 0.0)
            effective_weight = weight * result.confidence
            total_weight += effective_weight

            direction = result.payload.get("direction", "neutral")
            if direction in direction_scores:
                direction_scores[direction] += effective_weight

            price = result.payload.get("price_prediction")
            if price is not None:
                try:
                    price_predictions.append(float(price))
                except (TypeError, ValueError):
                    pass

        # Determine consensus direction
        consensus_direction = max(direction_scores, key=direction_scores.get)  # type: ignore
        consensus_score = direction_scores[consensus_direction]

        # Confidence = normalized winning score
        confidence = consensus_score / total_weight if total_weight > 0 else 0.0

        # Median price prediction
        price_prediction = None
        if price_predictions:
            import statistics
            price_prediction = statistics.median(price_predictions)

        return AggregatedSignal(
            direction=consensus_direction,
            confidence=confidence,
            price_prediction=price_prediction,
            sources=results,
            attestation_id="",  # Set after on-chain recording
            timestamp=int(time.time()),
        )

    async def _record_attestation(self, signal: AggregatedSignal) -> str:
        """Record final aggregated signal attestation on-chain."""
        payload_str = f"{signal.direction}:{signal.confidence}:{signal.timestamp}"
        attestation_hash = hashlib.sha256(payload_str.encode()).hexdigest()

        if self.signal_board_address and config.SIGNAL_BOARD_ABI:
            try:
                tx_hash = await self.chain.call_contract(
                    contract_address=self.signal_board_address,
                    abi=config.SIGNAL_BOARD_ABI,
                    function_name="postSignal",
                    args=[
                        signal.direction == "long",  # bullish flag
                        int(signal.confidence * 100),  # confidence bps
                        f"decentral_inference:{attestation_hash[:16]}",
                    ],
                )
                return tx_hash.hex()
            except Exception as e:
                logger.error(f"Failed to record attestation on-chain: {e}")

        return attestation_hash

    # ─── Source Implementations ───────────────────────────────────────────────

    async def _query_allora(self, prompt: str) -> InferenceResult:
        """Query Allora Network for ML-based price prediction."""
        import aiohttp

        try:
            async with aiohttp.ClientSession(
                timeout=aiohttp.ClientTimeout(total=30)
            ) as session:
                async with session.post(
                    self.allora_endpoint,
                    json={
                        "topic_id": "mnt_usd_1h",
                        "prompt": prompt,
                    },
                ) as resp:
                    if resp.status != 200:
                        raise RuntimeError(f"Allora returned {resp.status}")
                    data = await resp.json()

            return InferenceResult(
                source="allora",
                payload={
                    "direction": data.get("direction", "neutral"),
                    "price_prediction": data.get("prediction"),
                    "topic_id": data.get("topic_id"),
                },
                confidence=float(data.get("confidence", 0.5)),
                attestation_id=data.get("inference_id", ""),
            )
        except Exception as e:
            logger.warning(f"Allora query failed: {e}")
            raise

    async def _query_opengradient(self, prompt: str) -> InferenceResult:
        """Query OpenGradient decentralized inference network."""
        import aiohttp

        try:
            async with aiohttp.ClientSession(
                timeout=aiohttp.ClientTimeout(total=30)
            ) as session:
                import os
                async with session.post(
                    self.opengradient_endpoint,
                    json={"prompt": prompt, "model": "price-forecast-v1"},
                    headers={"Authorization": f"Bearer {os.getenv('OPENGRADIENT_API_KEY', '')}"},
                ) as resp:
                    if resp.status != 200:
                        raise RuntimeError(f"OpenGradient returned {resp.status}")
                    data = await resp.json()

            return InferenceResult(
                source="opengradient",
                payload={
                    "direction": data.get("direction", "neutral"),
                    "price_prediction": data.get("prediction"),
                    "model_id": data.get("model_id"),
                },
                confidence=float(data.get("confidence", 0.5)),
                attestation_id=data.get("request_id", ""),
            )
        except Exception as e:
            logger.warning(f"OpenGradient query failed: {e}")
            raise

    async def _query_tee_llm(self, prompt: str) -> InferenceResult:
        """Query Phala TEE-attested LLM for verifiable inference."""
        try:
            analysis_prompt = (
                f"Analyze the following and return JSON with 'direction' "
                f"(long/short/neutral), 'confidence' (0-1), and "
                f"'price_prediction' (numeric or null):\n\n{prompt}"
            )
            result = await self.tee_client.infer_with_attestation(analysis_prompt)

            # Parse the TEE output
            import json
            try:
                parsed = json.loads(result.output)
            except json.JSONDecodeError:
                parsed = {"direction": "neutral", "confidence": 0.5}

            return InferenceResult(
                source="tee_llm",
                payload={
                    "direction": parsed.get("direction", "neutral"),
                    "price_prediction": parsed.get("price_prediction"),
                    "tee_verified": result.verified,
                },
                confidence=float(parsed.get("confidence", 0.5)),
                attestation_id=result.attestation_id,
            )
        except Exception as e:
            logger.warning(f"TEE LLM query failed: {e}")
            raise

    async def _query_local_ensemble(self, prompt: str) -> InferenceResult:
        """Query local multi-model ensemble for consensus prediction."""
        try:
            system = (
                "You are a DeFi market analyst. Respond with JSON: "
                '{"direction": "long"|"short"|"neutral", '
                '"confidence": 0.0-1.0, "price_prediction": <number or null>}'
            )
            consensus = await self.ensemble.get_consensus(
                system=system,
                user=prompt,
                numeric_field="price_prediction",
            )

            direction = consensus["consensus_value"]
            if direction is None:
                direction = "neutral"

            return InferenceResult(
                source="local",
                payload={
                    "direction": direction if isinstance(direction, str) else "neutral",
                    "price_prediction": consensus["consensus_value"] if isinstance(consensus["consensus_value"], (int, float)) else None,
                    "n_models": consensus["n_success"],
                },
                confidence=consensus["confidence"],
                attestation_id=hashlib.sha256(
                    f"local:{time.time()}".encode()
                ).hexdigest(),
            )
        except Exception as e:
            logger.warning(f"Local ensemble query failed: {e}")
            raise

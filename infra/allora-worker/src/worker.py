"""
M19 — Allora Network Worker.
Publishes 1-hour MNT/USD price predictions to the Allora Network topic.
Polls an ensemble of 3 LLMs and submits the median prediction.
"""

import asyncio
import os
import statistics
import time
from typing import Any

import aiohttp
from openai import AsyncOpenAI


# ─── Configuration ────────────────────────────────────────────────────────────

ALLORA_TOPIC_ID = int(os.getenv("ALLORA_TOPIC_ID", "1"))
ALLORA_WORKER_KEY = os.getenv("ALLORA_WORKER_KEY", "")
PREDICTION_INTERVAL_SECONDS = int(os.getenv("PREDICTION_INTERVAL", "3600"))  # 1h

# LLM endpoints (OpenAI-compatible)
LLM_CONFIGS = [
    {
        "name": "deepseek",
        "api_base": "https://api.deepseek.com",
        "model": "deepseek-chat",
        "api_key_env": "DEEPSEEK_API_KEY",
    },
    {
        "name": "qwen",
        "api_base": "https://dashscope.aliyuncs.com/compatible-mode/v1",
        "model": "qwen-plus",
        "api_key_env": "QWEN_API_KEY",
    },
    {
        "name": "llama",
        "api_base": "https://api.together.xyz/v1",
        "model": "meta-llama/Llama-3-70b-chat-hf",
        "api_key_env": "TOGETHER_API_KEY",
    },
]

SYSTEM_PROMPT = (
    "You are a quantitative price prediction model. "
    "Given the current market context, predict the MNT/USD price in 1 hour. "
    "Respond with ONLY a JSON object: {\"prediction\": <float>, \"confidence\": <0-1>}"
)


# ─── LLM Ensemble ────────────────────────────────────────────────────────────

async def query_llm(cfg: dict[str, str], prompt: str) -> float | None:
    """Query a single LLM for a price prediction."""
    api_key = os.getenv(cfg["api_key_env"], "")
    if not api_key:
        return None

    client = AsyncOpenAI(api_key=api_key, base_url=cfg["api_base"])

    try:
        response = await asyncio.wait_for(
            client.chat.completions.create(
                model=cfg["model"],
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": prompt},
                ],
                max_tokens=200,
                temperature=0.1,
            ),
            timeout=30.0,
        )
        content = response.choices[0].message.content.strip()

        # Parse JSON response
        import json
        cleaned = content
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        if cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]

        data = json.loads(cleaned.strip())
        prediction = float(data["prediction"])
        print(f"  [{cfg['name']}] prediction={prediction:.6f}")
        return prediction

    except Exception as e:
        print(f"  [{cfg['name']}] failed: {e}")
        return None


async def get_ensemble_prediction(prompt: str) -> float | None:
    """
    Poll ensemble of 3 LLMs in parallel and return median prediction.
    Requires at least 2 successful responses for validity.
    """
    tasks = [query_llm(cfg, prompt) for cfg in LLM_CONFIGS]
    results = await asyncio.gather(*tasks)

    predictions = [r for r in results if r is not None]
    if len(predictions) < 2:
        print(f"  Insufficient predictions: {len(predictions)}/3")
        return None

    median = statistics.median(predictions)
    print(f"  Ensemble median: {median:.6f} (from {len(predictions)} models)")
    return median


# ─── Market Context ──────────────────────────────────────────────────────────

async def fetch_market_context() -> str:
    """Fetch current MNT/USD market data for LLM context."""
    try:
        async with aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=10)
        ) as session:
            async with session.get(
                "https://api.coingecko.com/api/v3/simple/price",
                params={"ids": "mantle", "vs_currencies": "usd", "include_24hr_change": "true"},
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    price = data["mantle"]["usd"]
                    change_24h = data["mantle"].get("usd_24h_change", 0)
                    return (
                        f"Current MNT/USD price: ${price:.4f}. "
                        f"24h change: {change_24h:.2f}%. "
                        f"Timestamp: {int(time.time())}."
                    )
    except Exception as e:
        print(f"  Market context fetch failed: {e}")

    return f"Predict MNT/USD price 1 hour from now. Current timestamp: {int(time.time())}."


# ─── Allora Submission ────────────────────────────────────────────────────────

async def submit_to_allora(prediction: float) -> bool:
    """Submit prediction to Allora Network via SDK."""
    try:
        from allora_sdk import AlloraWorker, InferenceData

        worker = AlloraWorker(
            worker_key=ALLORA_WORKER_KEY,
            topic_id=ALLORA_TOPIC_ID,
        )

        inference = InferenceData(
            value=str(prediction),
            timestamp=int(time.time()),
        )

        result = await worker.submit_inference(inference)
        print(f"  Submitted to Allora | topic={ALLORA_TOPIC_ID} | tx={result.tx_hash}")
        return True

    except ImportError:
        print("  allora_sdk not available, logging prediction only")
        return False
    except Exception as e:
        print(f"  Allora submission failed: {e}")
        return False


# ─── Main Loop ────────────────────────────────────────────────────────────────

async def prediction_loop() -> None:
    """Main prediction loop — runs every PREDICTION_INTERVAL_SECONDS."""
    print(f"Allora Worker started | topic_id={ALLORA_TOPIC_ID}")
    print(f"Prediction interval: {PREDICTION_INTERVAL_SECONDS}s")

    while True:
        print(f"\n--- Prediction cycle @ {int(time.time())} ---")

        # Fetch market context
        context = await fetch_market_context()
        print(f"  Context: {context[:80]}...")

        # Get ensemble prediction
        prediction = await get_ensemble_prediction(context)

        if prediction is not None:
            # Submit to Allora
            await submit_to_allora(prediction)
        else:
            print("  Skipping submission — no valid prediction")

        # Wait for next cycle
        await asyncio.sleep(PREDICTION_INTERVAL_SECONDS)


def main() -> None:
    """Entry point for the Allora worker."""
    asyncio.run(prediction_loop())


if __name__ == "__main__":
    main()

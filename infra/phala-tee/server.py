"""
Phala TEE FastAPI Service — attested LLM inference.
Runs inside a Phala Network SGX enclave. Produces verifiable attestation
quotes for every inference call via dstack_sdk.
"""

import hashlib
import os
import time

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from openai import AsyncOpenAI

app = FastAPI(title="AgentBank TEE Inference", version="1.0.0")

# ─── Configuration ────────────────────────────────────────────────────────────

DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", "")
MODEL_NAME = os.getenv("MODEL_NAME", "deepseek-chat")
MAX_TOKENS = int(os.getenv("MAX_TOKENS", "1000"))
TEMPERATURE = float(os.getenv("TEMPERATURE", "0.1"))

client = AsyncOpenAI(
    api_key=DEEPSEEK_API_KEY,
    base_url="https://api.deepseek.com",
)


# ─── Models ───────────────────────────────────────────────────────────────────

class InferRequest(BaseModel):
    """Inference request payload."""
    prompt: str
    system_prompt: str = "You are a DeFi analyst."


class InferResponse(BaseModel):
    """Inference response with attestation data."""
    output: str
    input_hash: str
    output_hash: str
    quote: str
    timestamp: int
    model: str


# ─── Attestation Helper ──────────────────────────────────────────────────────

def compute_sha256(data: str) -> str:
    """Compute SHA-256 hex digest of input string."""
    return hashlib.sha256(data.encode("utf-8")).hexdigest()


async def get_attestation_quote(report_data: bytes) -> str:
    """
    Get SGX attestation quote from dstack TDX guest via dstack_sdk.
    The quote cryptographically binds the report_data to the enclave measurement.
    """
    try:
        from dstack_sdk import TappdClient

        tappd = TappdClient()
        quote_result = tappd.tdx_quote(report_data=report_data)
        return quote_result.quote.hex()
    except ImportError:
        # Fallback for local development outside TEE
        return compute_sha256(f"dev-quote:{report_data.hex()}")
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Attestation quote generation failed: {e}",
        )


# ─── Endpoints ────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "ok", "enclave": "tappd-sgx", "timestamp": int(time.time())}


@app.post("/infer", response_model=InferResponse)
async def infer(request: InferRequest) -> InferResponse:
    """
    Perform attested LLM inference.

    1. Receives prompt
    2. Calls DeepSeek API within TEE enclave
    3. Computes hashes of input and output
    4. Gets attestation quote from dstack_sdk binding the hashes
    5. Returns output + hashes + quote
    """
    if not DEEPSEEK_API_KEY:
        raise HTTPException(status_code=500, detail="DEEPSEEK_API_KEY not configured")

    # Step 1: Compute input hash
    input_hash = compute_sha256(f"{request.system_prompt}|{request.prompt}")

    # Step 2: Call DeepSeek LLM
    try:
        response = await client.chat.completions.create(
            model=MODEL_NAME,
            messages=[
                {"role": "system", "content": request.system_prompt},
                {"role": "user", "content": request.prompt},
            ],
            max_tokens=MAX_TOKENS,
            temperature=TEMPERATURE,
        )
        output = response.choices[0].message.content.strip()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"LLM inference failed: {e}")

    # Step 3: Compute output hash
    output_hash = compute_sha256(output)

    # Step 4: Get attestation quote binding both hashes
    report_data = bytes.fromhex(compute_sha256(f"{input_hash}:{output_hash}"))
    quote = await get_attestation_quote(report_data)

    # Step 5: Return attested result
    return InferResponse(
        output=output,
        input_hash=input_hash,
        output_hash=output_hash,
        quote=quote,
        timestamp=int(time.time()),
        model=MODEL_NAME,
    )

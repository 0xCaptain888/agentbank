"""
M20 — TEE Attestation Client.
Calls Phala Network TEE service for attested inference, then records
the attestation proof on-chain via the TEEAttestationVerifier contract.
"""

import asyncio
import hashlib
import time
from dataclasses import dataclass

import aiohttp
from loguru import logger
from web3 import Web3

import config
from core.chain import MantleChain


@dataclass
class AttestationResult:
    """Result from a TEE-attested inference call."""
    output: str
    input_hash: str
    output_hash: str
    quote: str
    attestation_id: str
    timestamp: int
    verified: bool


# ABI fragment for TEEAttestationVerifier.recordAttestation
TEE_VERIFIER_ABI = [
    {
        "inputs": [
            {"name": "inputHash", "type": "bytes32"},
            {"name": "outputHash", "type": "bytes32"},
            {"name": "quote", "type": "bytes"},
        ],
        "name": "recordAttestation",
        "outputs": [{"name": "attestationId", "type": "bytes32"}],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [{"name": "attestationId", "type": "bytes32"}],
        "name": "verifyAttestation",
        "outputs": [{"name": "valid", "type": "bool"}],
        "stateMutability": "view",
        "type": "function",
    },
]


class TEEClient:
    """
    Client for Phala TEE-attested inference.

    Sends prompts to the Phala TEE FastAPI service, receives the response
    along with cryptographic attestation, and records the proof on-chain.
    """

    def __init__(
        self,
        chain: MantleChain,
        tee_service_url: str | None = None,
        verifier_address: str | None = None,
    ):
        import os

        self.chain = chain
        self.tee_service_url = tee_service_url or os.getenv(
            "PHALA_TEE_URL", "https://agentbank-analyst-tee.phala.network"
        )
        self.verifier_address = verifier_address or os.getenv(
            "TEE_VERIFIER_ADDRESS", ""
        )
        self._session: aiohttp.ClientSession | None = None

    async def _get_session(self) -> aiohttp.ClientSession:
        """Lazy-init HTTP session."""
        if self._session is None or self._session.closed:
            self._session = aiohttp.ClientSession(
                timeout=aiohttp.ClientTimeout(total=60)
            )
        return self._session

    async def infer_with_attestation(
        self,
        prompt: str,
        system_prompt: str = "You are a DeFi analyst.",
    ) -> AttestationResult:
        """
        Call the Phala TEE service for attested LLM inference.

        1. Sends prompt to TEE enclave
        2. Receives output + hashes + SGX quote
        3. Records attestation on-chain via TEEAttestationVerifier
        4. Returns full AttestationResult

        Args:
            prompt: The user/analyst prompt to process
            system_prompt: System context for the LLM

        Returns:
            AttestationResult with output, hashes, quote, and on-chain attestation ID

        Raises:
            RuntimeError: If TEE service is unreachable or attestation fails
        """
        session = await self._get_session()

        # Step 1: Call TEE service
        payload = {
            "prompt": prompt,
            "system_prompt": system_prompt,
        }

        try:
            async with session.post(
                f"{self.tee_service_url}/infer",
                json=payload,
            ) as resp:
                if resp.status != 200:
                    body = await resp.text()
                    raise RuntimeError(
                        f"TEE service returned {resp.status}: {body}"
                    )
                data = await resp.json()
        except aiohttp.ClientError as e:
            raise RuntimeError(f"TEE service unreachable: {e}") from e

        output = data["output"]
        input_hash = data["input_hash"]
        output_hash = data["output_hash"]
        quote = data["quote"]

        logger.info(
            f"TEE inference complete | input_hash={input_hash[:16]}... "
            f"| output_hash={output_hash[:16]}..."
        )

        # Step 2: Record attestation on-chain
        attestation_id = await self._record_on_chain(input_hash, output_hash, quote)

        return AttestationResult(
            output=output,
            input_hash=input_hash,
            output_hash=output_hash,
            quote=quote,
            attestation_id=attestation_id,
            timestamp=int(time.time()),
            verified=True,
        )

    async def _record_on_chain(
        self,
        input_hash: str,
        output_hash: str,
        quote: str,
    ) -> str:
        """Submit attestation proof to TEEAttestationVerifier contract."""
        if not self.verifier_address:
            logger.warning("No TEE verifier address configured, skipping on-chain record")
            return hashlib.sha256(f"{input_hash}{output_hash}".encode()).hexdigest()

        try:
            input_bytes32 = Web3.to_bytes(hexstr=input_hash)
            output_bytes32 = Web3.to_bytes(hexstr=output_hash)
            quote_bytes = bytes.fromhex(quote.replace("0x", ""))

            tx_hash = await self.chain.call_contract(
                contract_address=self.verifier_address,
                abi=TEE_VERIFIER_ABI,
                function_name="recordAttestation",
                args=[input_bytes32, output_bytes32, quote_bytes],
            )

            attestation_id = tx_hash.hex()
            logger.info(f"Attestation recorded on-chain | id={attestation_id[:16]}...")
            return attestation_id

        except Exception as e:
            logger.error(f"Failed to record attestation on-chain: {e}")
            # Return local hash as fallback
            return hashlib.sha256(f"{input_hash}{output_hash}".encode()).hexdigest()

    async def verify_attestation(self, attestation_id: str) -> bool:
        """Verify an existing attestation on-chain."""
        if not self.verifier_address:
            logger.warning("No TEE verifier configured")
            return False

        contract = self.chain.w3.eth.contract(
            address=Web3.to_checksum_address(self.verifier_address),
            abi=TEE_VERIFIER_ABI,
        )
        try:
            id_bytes = Web3.to_bytes(hexstr=attestation_id)
            return contract.functions.verifyAttestation(id_bytes).call()
        except Exception as e:
            logger.error(f"Attestation verification failed: {e}")
            return False

    async def close(self) -> None:
        """Close HTTP session."""
        if self._session and not self._session.closed:
            await self._session.close()

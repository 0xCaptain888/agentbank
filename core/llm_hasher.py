"""
LLM Reasoning Hash Chain Module.
Hashes each LLM decision (prompt + response + timestamp) using SHA-256,
chains them together, and submits to the LLMReasoningRegistry contract on-chain.
Provides verifiable audit trail of all AI decisions.
"""

import hashlib
import time
import json
from typing import Optional
from loguru import logger
from web3 import Web3
import config


GENESIS_HASH = "0" * 64  # Initial hash for chain start


class ReasoningHashChain:
    """
    Maintains a hash chain of all LLM reasoning steps.
    Each hash = sha256(prompt + response + timestamp + previous_hash).
    Submits hashes to on-chain LLMReasoningRegistry for auditability.
    """

    def __init__(self, chain, registry_address: str = None, registry_abi: list = None):
        self.chain = chain
        self.w3 = chain.w3
        self.registry_address = registry_address or config.__dict__.get("LLM_REGISTRY_ADDRESS", "")
        self.registry_abi = registry_abi or config._load_abi("LLMReasoningRegistry")
        self.previous_hash = GENESIS_HASH
        self.chain_length = 0
        self._local_chain: list = []

        logger.info(f"ReasoningHashChain initialized | registry={self.registry_address[:10]}...")

    def hash_decision(self, prompt: str, response: str, timestamp: Optional[float] = None) -> str:
        """
        Hash a single LLM decision and append to the chain.
        Returns the new hash.
        """
        ts = timestamp or time.time()
        payload = json.dumps({
            "prompt": prompt,
            "response": response,
            "timestamp": ts,
            "previous_hash": self.previous_hash,
        }, sort_keys=True)

        new_hash = hashlib.sha256(payload.encode("utf-8")).hexdigest()

        entry = {
            "index": self.chain_length,
            "hash": new_hash,
            "previous_hash": self.previous_hash,
            "timestamp": ts,
            "prompt_preview": prompt[:80],
        }
        self._local_chain.append(entry)
        self.previous_hash = new_hash
        self.chain_length += 1

        logger.debug(f"Hash chain entry #{entry['index']} | hash={new_hash[:16]}...")
        return new_hash

    async def submit_to_chain(self, decision_hash: str, agent_address: str) -> Optional[bytes]:
        """Submit a reasoning hash to the on-chain LLMReasoningRegistry."""
        if not self.registry_address or not self.registry_abi:
            logger.warning("LLMReasoningRegistry not configured, skipping on-chain submit")
            return None

        try:
            hash_bytes = bytes.fromhex(decision_hash)
            prev_bytes = bytes.fromhex(self.previous_hash) if self.chain_length > 1 else b'\x00' * 32

            tx_hash = await self.chain.call_contract(
                contract_address=self.registry_address,
                abi=self.registry_abi,
                function_name="submitReasoning",
                args=[hash_bytes, prev_bytes, self.chain_length - 1]
            )
            logger.info(f"Reasoning hash submitted on-chain | tx={tx_hash.hex()}")
            return tx_hash
        except Exception as e:
            logger.error(f"Failed to submit reasoning hash: {e}")
            return None

    def verify_chain_integrity(self) -> bool:
        """Verify the entire local hash chain is consistent."""
        if not self._local_chain:
            return True

        for i, entry in enumerate(self._local_chain):
            if i == 0:
                if entry["previous_hash"] != GENESIS_HASH:
                    logger.error(f"Chain integrity failure at index 0: bad genesis")
                    return False
            else:
                if entry["previous_hash"] != self._local_chain[i - 1]["hash"]:
                    logger.error(f"Chain integrity failure at index {i}")
                    return False

        logger.info(f"Hash chain integrity verified | length={self.chain_length}")
        return True

    def get_latest_hash(self) -> str:
        """Return the most recent hash in the chain."""
        return self.previous_hash

    def get_chain_summary(self) -> dict:
        """Return summary of the hash chain state."""
        return {
            "length": self.chain_length,
            "latest_hash": self.previous_hash,
            "genesis": GENESIS_HASH,
            "integrity_valid": self.verify_chain_integrity(),
        }

"""
M24 — Intent Solver.
Watches IntentPosted events on-chain, evaluates opportunities with the analyst LLM,
and bids on intents where the forecasted APY exceeds the user's minApy threshold.
"""

import asyncio
import json
import time
from dataclasses import dataclass
from typing import Any

from loguru import logger
from web3 import Web3

import config
from core.chain import MantleChain
from core.llm import DeepSeekClient


@dataclass
class Intent:
    """Parsed on-chain intent from IntentPosted event."""
    intent_id: bytes
    depositor: str
    asset: str
    amount: int
    min_apy: int  # basis points (e.g., 500 = 5%)
    deadline: int
    metadata: str
    block_number: int


@dataclass
class Bid:
    """Solver bid on an intent."""
    intent_id: bytes
    forecasted_apy: int  # basis points
    strategy: str
    bond_amount: int
    timestamp: int


# ABI fragment for IntentEngine contract
INTENT_ENGINE_ABI = [
    {
        "anonymous": False,
        "inputs": [
            {"indexed": True, "name": "intentId", "type": "bytes32"},
            {"indexed": True, "name": "depositor", "type": "address"},
            {"indexed": False, "name": "asset", "type": "address"},
            {"indexed": False, "name": "amount", "type": "uint256"},
            {"indexed": False, "name": "minApy", "type": "uint256"},
            {"indexed": False, "name": "deadline", "type": "uint256"},
            {"indexed": False, "name": "metadata", "type": "string"},
        ],
        "name": "IntentPosted",
        "type": "event",
    },
    {
        "inputs": [
            {"name": "intentId", "type": "bytes32"},
            {"name": "forecastedApy", "type": "uint256"},
            {"name": "strategy", "type": "string"},
        ],
        "name": "bidOnIntent",
        "outputs": [],
        "stateMutability": "payable",
        "type": "function",
    },
    {
        "inputs": [{"name": "intentId", "type": "bytes32"}],
        "name": "getIntent",
        "outputs": [
            {"name": "depositor", "type": "address"},
            {"name": "asset", "type": "address"},
            {"name": "amount", "type": "uint256"},
            {"name": "minApy", "type": "uint256"},
            {"name": "deadline", "type": "uint256"},
            {"name": "fulfilled", "type": "bool"},
        ],
        "stateMutability": "view",
        "type": "function",
    },
]


class IntentSolver:
    """
    Watches for IntentPosted events, evaluates each intent with an analyst LLM,
    and submits bids when the forecasted APY exceeds the intent's minApy.

    The solver stakes a bond with each bid to signal confidence.
    """

    # Minimum bond to stake per bid (in wei)
    MIN_BOND_WEI = Web3.to_wei(0.01, "ether")  # 0.01 MNT

    # APY buffer — only bid if forecast exceeds minApy by this margin (bps)
    APY_BUFFER_BPS = 100  # 1% buffer

    def __init__(
        self,
        chain: MantleChain,
        intent_engine_address: str | None = None,
        llm_client: DeepSeekClient | None = None,
        poll_interval: int = 15,
    ):
        import os

        self.chain = chain
        self.llm = llm_client or DeepSeekClient()
        self.intent_engine_address = intent_engine_address or os.getenv(
            "INTENT_ENGINE_ADDRESS", ""
        )
        self.poll_interval = poll_interval
        self._last_block: int = 0
        self._processed_intents: set[str] = set()

    async def start(self) -> None:
        """Start the intent solver event loop."""
        if not self.intent_engine_address:
            raise RuntimeError("INTENT_ENGINE_ADDRESS not configured")

        logger.info(
            f"IntentSolver started | engine={self.intent_engine_address} "
            f"| poll_interval={self.poll_interval}s"
        )

        self._last_block = self.chain.w3.eth.block_number

        while True:
            try:
                await self._poll_events()
            except Exception as e:
                logger.error(f"IntentSolver poll error: {e}")
            await asyncio.sleep(self.poll_interval)

    async def _poll_events(self) -> None:
        """Poll for new IntentPosted events since last checked block."""
        current_block = self.chain.w3.eth.block_number
        if current_block <= self._last_block:
            return

        contract = self.chain.w3.eth.contract(
            address=Web3.to_checksum_address(self.intent_engine_address),
            abi=INTENT_ENGINE_ABI,
        )

        # Fetch IntentPosted events
        try:
            events = contract.events.IntentPosted.get_logs(
                fromBlock=self._last_block + 1,
                toBlock=current_block,
            )
        except Exception as e:
            logger.error(f"Failed to fetch events: {e}")
            self._last_block = current_block
            return

        self._last_block = current_block

        if not events:
            return

        logger.info(f"Found {len(events)} new intent(s) in blocks {self._last_block}-{current_block}")

        for event in events:
            intent = self._parse_event(event)
            if intent is None:
                continue

            intent_hex = intent.intent_id.hex()
            if intent_hex in self._processed_intents:
                continue

            self._processed_intents.add(intent_hex)
            await self._evaluate_and_bid(intent)

    def _parse_event(self, event: Any) -> Intent | None:
        """Parse an IntentPosted event log into an Intent dataclass."""
        try:
            args = event.args
            return Intent(
                intent_id=args.intentId,
                depositor=args.depositor,
                asset=args.asset,
                amount=args.amount,
                min_apy=args.minApy,
                deadline=args.deadline,
                metadata=args.metadata,
                block_number=event.blockNumber,
            )
        except Exception as e:
            logger.warning(f"Failed to parse intent event: {e}")
            return None

    async def _evaluate_and_bid(self, intent: Intent) -> None:
        """
        Evaluate an intent with the analyst LLM and bid if profitable.

        1. Check if intent is still valid (not expired)
        2. Ask LLM to forecast APY for the given asset/amount
        3. If forecast > minApy + buffer, submit bid with bond
        """
        # Check deadline
        if intent.deadline < int(time.time()):
            logger.debug(f"Intent {intent.intent_id.hex()[:16]} expired, skipping")
            return

        # Evaluate with LLM
        forecast = await self._forecast_apy(intent)
        if forecast is None:
            logger.warning(f"No forecast for intent {intent.intent_id.hex()[:16]}")
            return

        forecasted_apy = forecast["apy_bps"]
        strategy = forecast["strategy"]

        logger.info(
            f"Intent {intent.intent_id.hex()[:16]} | "
            f"minApy={intent.min_apy}bps | forecast={forecasted_apy}bps | "
            f"strategy={strategy}"
        )

        # Only bid if forecast exceeds minApy with buffer
        if forecasted_apy < intent.min_apy + self.APY_BUFFER_BPS:
            logger.debug(
                f"Forecast {forecasted_apy}bps < min {intent.min_apy + self.APY_BUFFER_BPS}bps, skipping"
            )
            return

        # Submit bid
        await self._submit_bid(intent, forecasted_apy, strategy)

    async def _forecast_apy(self, intent: Intent) -> dict[str, Any] | None:
        """Use analyst LLM to forecast achievable APY for this intent."""
        system_prompt = (
            "You are a DeFi yield analyst on Mantle Network. "
            "Given an intent (asset, amount, deadline), forecast the best achievable APY "
            "and recommend a strategy. Respond with JSON: "
            '{"apy_bps": <integer basis points>, "strategy": "<strategy name>", '
            '"confidence": <0-100>, "reasoning": "<brief explanation>"}'
        )

        user_prompt = (
            f"Intent details:\n"
            f"- Asset: {intent.asset}\n"
            f"- Amount: {intent.amount / 1e6:.2f} USDC\n"
            f"- Min APY required: {intent.min_apy} bps ({intent.min_apy / 100:.1f}%)\n"
            f"- Deadline: {intent.deadline} (unix timestamp)\n"
            f"- Metadata: {intent.metadata}\n"
            f"\nWhat APY can we achieve and with what strategy?"
        )

        try:
            response = await self.llm.complete(system_prompt, user_prompt)
            parsed = self.llm.parse_json(response)

            # Validate required fields
            if "apy_bps" not in parsed or "strategy" not in parsed:
                logger.warning("LLM forecast missing required fields")
                return None

            return {
                "apy_bps": int(parsed["apy_bps"]),
                "strategy": str(parsed["strategy"]),
                "confidence": int(parsed.get("confidence", 50)),
            }
        except Exception as e:
            logger.error(f"LLM forecast failed: {e}")
            return None

    async def _submit_bid(
        self,
        intent: Intent,
        forecasted_apy: int,
        strategy: str,
    ) -> None:
        """Submit a bid on-chain with a bond."""
        try:
            # Build bid transaction with bond value
            contract = self.chain.w3.eth.contract(
                address=Web3.to_checksum_address(self.intent_engine_address),
                abi=INTENT_ENGINE_ABI,
            )

            func = contract.functions.bidOnIntent(
                intent.intent_id,
                forecasted_apy,
                strategy,
            )

            nonce = self.chain.w3.eth.get_transaction_count(self.chain.address)
            tx = func.build_transaction({
                "from": self.chain.address,
                "nonce": nonce,
                "gas": 300000,
                "gasPrice": self.chain.w3.eth.gas_price,
                "chainId": config.CHAIN_ID,
                "value": self.MIN_BOND_WEI,
            })

            signed = self.chain.account.sign_transaction(tx)
            tx_hash = self.chain.w3.eth.send_raw_transaction(signed.raw_transaction)
            receipt = self.chain.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)

            if receipt["status"] == 1:
                logger.info(
                    f"Bid submitted | intent={intent.intent_id.hex()[:16]} "
                    f"| apy={forecasted_apy}bps | tx={tx_hash.hex()}"
                )
            else:
                logger.error(f"Bid tx reverted | tx={tx_hash.hex()}")

        except Exception as e:
            logger.error(f"Bid submission failed: {e}")

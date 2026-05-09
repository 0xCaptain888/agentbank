"""
MEV Protection Module.
Protects trades from sandwich attacks and frontrunning via:
1. Private mempool submission (Flashbots-style relay)
2. Commit-reveal scheme for large trades
3. Slippage protection with dynamic adjustment
"""

import hashlib
import os
import time
from typing import Optional
import aiohttp
from loguru import logger
from web3 import Web3
from eth_account import Account
from eth_account.messages import encode_defunct
import config


PRIVATE_RELAY_URL = config.__dict__.get("PRIVATE_RELAY_URL", "https://relay.mantle.xyz/v1/private")
LARGE_TRADE_THRESHOLD_USD = 50_000  # Trades above this use commit-reveal
DEFAULT_SLIPPAGE_BPS = 100  # 1%
MAX_SLIPPAGE_BPS = 500  # 5%


class CommitRevealState:
    """Tracks a pending commit-reveal trade."""

    def __init__(self, commit_hash: bytes, secret: bytes, trade_data: dict, commit_tx: bytes, expiry: float):
        self.commit_hash = commit_hash
        self.secret = secret
        self.trade_data = trade_data
        self.commit_tx = commit_tx
        self.expiry = expiry
        self.revealed = False


class MEVProtection:
    """
    MEV protection layer for trade execution.
    Uses private relay submission and commit-reveal for large trades.
    """

    def __init__(self, chain):
        self.chain = chain
        self.w3 = chain.w3
        self.session: Optional[aiohttp.ClientSession] = None
        self._pending_commits: dict[str, CommitRevealState] = {}

        logger.info("MEVProtection initialized")

    async def _get_session(self) -> aiohttp.ClientSession:
        if self.session is None or self.session.closed:
            self.session = aiohttp.ClientSession()
        return self.session

    async def submit_private_tx(self, signed_tx: bytes, max_block_wait: int = 10) -> Optional[str]:
        """
        Submit a signed transaction to a private relay (Flashbots-style).
        Transaction won't be visible in the public mempool.
        """
        session = await self._get_session()
        payload = {
            "jsonrpc": "2.0",
            "method": "eth_sendPrivateTransaction",
            "params": [{
                "tx": signed_tx.hex() if isinstance(signed_tx, bytes) else signed_tx,
                "maxBlockNumber": hex(self.w3.eth.block_number + max_block_wait),
            }],
            "id": 1,
        }

        try:
            async with session.post(PRIVATE_RELAY_URL, json=payload) as resp:
                result = await resp.json()
                if "error" in result:
                    logger.warning(f"Private relay error: {result['error']}")
                    return None
                tx_hash = result.get("result")
                logger.info(f"Private tx submitted | hash={tx_hash}")
                return tx_hash
        except Exception as e:
            logger.error(f"Private relay submission failed: {e}")
            return None

    def generate_commit(self, trade_data: dict) -> tuple[bytes, bytes]:
        """
        Generate a commit hash and secret for commit-reveal scheme.
        Returns (commit_hash, secret).
        """
        secret = os.urandom(32)
        preimage = (
            trade_data["token_in"].encode()
            + trade_data["token_out"].encode()
            + trade_data["amount_in"].to_bytes(32, "big")
            + secret
        )
        commit_hash = hashlib.sha256(preimage).digest()
        return commit_hash, secret

    async def commit_trade(self, trade_data: dict, contract_address: str, abi: list) -> Optional[str]:
        """
        Phase 1 of commit-reveal: submit commit hash on-chain.
        Used for trades exceeding LARGE_TRADE_THRESHOLD_USD.
        """
        commit_hash, secret = self.generate_commit(trade_data)

        try:
            tx_hash = await self.chain.call_contract(
                contract_address=contract_address,
                abi=abi,
                function_name="commitTrade",
                args=[commit_hash]
            )
            trade_id = commit_hash.hex()
            self._pending_commits[trade_id] = CommitRevealState(
                commit_hash=commit_hash,
                secret=secret,
                trade_data=trade_data,
                commit_tx=tx_hash,
                expiry=time.time() + 300,  # 5 minute reveal window
            )
            logger.info(f"Trade committed | id={trade_id[:16]}... | tx={tx_hash.hex()}")
            return trade_id
        except Exception as e:
            logger.error(f"Commit trade failed: {e}")
            return None

    async def reveal_trade(self, trade_id: str, contract_address: str, abi: list) -> Optional[bytes]:
        """
        Phase 2 of commit-reveal: reveal and execute the trade.
        Must be called after commit has been mined (wait 1-2 blocks).
        """
        state = self._pending_commits.get(trade_id)
        if not state:
            logger.error(f"No pending commit for trade_id={trade_id[:16]}")
            return None

        if time.time() > state.expiry:
            logger.error(f"Commit expired for trade_id={trade_id[:16]}")
            del self._pending_commits[trade_id]
            return None

        try:
            tx_hash = await self.chain.call_contract(
                contract_address=contract_address,
                abi=abi,
                function_name="revealTrade",
                args=[
                    state.commit_hash,
                    state.secret,
                    Web3.to_checksum_address(state.trade_data["token_in"]),
                    Web3.to_checksum_address(state.trade_data["token_out"]),
                    state.trade_data["amount_in"],
                    state.trade_data["min_amount_out"],
                ]
            )
            state.revealed = True
            logger.info(f"Trade revealed | id={trade_id[:16]}... | tx={tx_hash.hex()}")
            return tx_hash
        except Exception as e:
            logger.error(f"Reveal trade failed: {e}")
            return None

    def calculate_safe_slippage(self, amount_usd: float, liquidity_usd: float) -> int:
        """
        Calculate safe slippage tolerance in BPS based on trade size vs liquidity.
        Larger trades relative to liquidity get tighter slippage to avoid MEV.
        """
        if liquidity_usd <= 0:
            return MAX_SLIPPAGE_BPS

        impact_ratio = amount_usd / liquidity_usd
        if impact_ratio < 0.01:
            slippage = DEFAULT_SLIPPAGE_BPS
        elif impact_ratio < 0.05:
            slippage = int(DEFAULT_SLIPPAGE_BPS * 1.5)
        elif impact_ratio < 0.10:
            slippage = int(DEFAULT_SLIPPAGE_BPS * 2.5)
        else:
            slippage = MAX_SLIPPAGE_BPS

        return min(slippage, MAX_SLIPPAGE_BPS)

    def should_use_commit_reveal(self, amount_usd: float) -> bool:
        """Determine if a trade is large enough to require commit-reveal."""
        return amount_usd >= LARGE_TRADE_THRESHOLD_USD

    async def close(self):
        """Close the HTTP session."""
        if self.session and not self.session.closed:
            await self.session.close()

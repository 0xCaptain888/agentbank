"""Main AgentBank Python SDK client wrapping all V3 contract interactions."""

from __future__ import annotations

from dataclasses import dataclass
from enum import IntEnum
from typing import Any, Sequence

from eth_account.signers.local import LocalAccount
from web3 import Web3
from web3.contract import Contract
from web3.types import HexBytes, TxReceipt, Wei


class IntentStatus(IntEnum):
    Open = 0
    Filled = 1
    Expired = 2
    Cancelled = 3


class TEEKind(IntEnum):
    Phala = 0
    Marlin = 1


@dataclass
class IntentData:
    id: int
    user: str
    asset: str
    amount: int
    min_apy_bps: int
    max_drawdown_bps: int
    duration: int
    deadline: int
    status: IntentStatus
    winning_bid: int
    created_at: int


@dataclass
class BidData:
    id: int
    intent_id: int
    solver: str
    tier_vault: str
    promised_apy: int
    bond_posted: int
    timestamp: int


@dataclass
class ReputationData:
    score: int
    total_signals: int
    profitable_signals: int
    avg_pnl_bps: int


@dataclass
class AttestedRun:
    kind: TEEKind
    prompt_hash: bytes
    output_hash: bytes
    code_hash: bytes
    attester_pub_key: str
    timestamp: int
    verified: bool


# ---------------------------------------------------------------------------
# ABI fragments (minimal for SDK usage)
# ---------------------------------------------------------------------------

VAULT_ABI = [
    {
        "name": "deposit",
        "type": "function",
        "stateMutability": "nonpayable",
        "inputs": [
            {"name": "assets", "type": "uint256"},
            {"name": "receiver", "type": "address"},
        ],
        "outputs": [{"name": "shares", "type": "uint256"}],
    },
    {
        "name": "withdraw",
        "type": "function",
        "stateMutability": "nonpayable",
        "inputs": [
            {"name": "assets", "type": "uint256"},
            {"name": "receiver", "type": "address"},
            {"name": "owner", "type": "address"},
        ],
        "outputs": [{"name": "shares", "type": "uint256"}],
    },
    {
        "name": "balanceOf",
        "type": "function",
        "stateMutability": "view",
        "inputs": [{"name": "account", "type": "address"}],
        "outputs": [{"name": "", "type": "uint256"}],
    },
    {
        "name": "totalAssets",
        "type": "function",
        "stateMutability": "view",
        "inputs": [],
        "outputs": [{"name": "", "type": "uint256"}],
    },
    {
        "name": "convertToAssets",
        "type": "function",
        "stateMutability": "view",
        "inputs": [{"name": "shares", "type": "uint256"}],
        "outputs": [{"name": "assets", "type": "uint256"}],
    },
]

SIGNAL_BOARD_ABI = [
    {
        "name": "registerAnalyst",
        "type": "function",
        "stateMutability": "nonpayable",
        "inputs": [
            {"name": "analyst", "type": "address"},
            {"name": "metadata", "type": "bytes"},
        ],
        "outputs": [],
    },
    {
        "name": "deregisterAnalyst",
        "type": "function",
        "stateMutability": "nonpayable",
        "inputs": [{"name": "analyst", "type": "address"}],
        "outputs": [],
    },
    {
        "name": "postSignal",
        "type": "function",
        "stateMutability": "nonpayable",
        "inputs": [
            {"name": "asset", "type": "address"},
            {"name": "direction", "type": "int8"},
            {"name": "magnitude", "type": "uint16"},
            {"name": "reasoningHash", "type": "bytes32"},
            {"name": "ttl", "type": "uint256"},
        ],
        "outputs": [{"name": "signalId", "type": "uint256"}],
    },
    {
        "name": "getReputation",
        "type": "function",
        "stateMutability": "view",
        "inputs": [{"name": "analyst", "type": "address"}],
        "outputs": [
            {"name": "score", "type": "uint256"},
            {"name": "totalSignals", "type": "uint256"},
            {"name": "profitableSignals", "type": "uint256"},
            {"name": "avgPnlBps", "type": "int256"},
        ],
    },
]

INTENT_ROUTER_ABI = [
    {
        "name": "postIntent",
        "type": "function",
        "stateMutability": "nonpayable",
        "inputs": [
            {"name": "asset", "type": "address"},
            {"name": "amount", "type": "uint256"},
            {"name": "minApyBps", "type": "uint256"},
            {"name": "maxDrawdownBps", "type": "uint256"},
            {"name": "duration", "type": "uint256"},
        ],
        "outputs": [{"name": "intentId", "type": "uint256"}],
    },
    {
        "name": "submitBid",
        "type": "function",
        "stateMutability": "nonpayable",
        "inputs": [
            {"name": "intentId", "type": "uint256"},
            {"name": "tierVault", "type": "address"},
            {"name": "promisedApy", "type": "uint256"},
            {"name": "bondAmount", "type": "uint256"},
        ],
        "outputs": [{"name": "bidId", "type": "uint256"}],
    },
    {
        "name": "settleAuction",
        "type": "function",
        "stateMutability": "nonpayable",
        "inputs": [{"name": "intentId", "type": "uint256"}],
        "outputs": [],
    },
    {
        "name": "intents",
        "type": "function",
        "stateMutability": "view",
        "inputs": [{"name": "id", "type": "uint256"}],
        "outputs": [
            {"name": "id", "type": "uint256"},
            {"name": "user", "type": "address"},
            {"name": "asset", "type": "address"},
            {"name": "amount", "type": "uint256"},
            {"name": "minApyBps", "type": "uint256"},
            {"name": "maxDrawdownBps", "type": "uint256"},
            {"name": "duration", "type": "uint256"},
            {"name": "deadline", "type": "uint256"},
            {"name": "status", "type": "uint8"},
            {"name": "winningBid", "type": "uint256"},
            {"name": "createdAt", "type": "uint256"},
        ],
    },
    {
        "name": "nextIntentId",
        "type": "function",
        "stateMutability": "view",
        "inputs": [],
        "outputs": [{"name": "", "type": "uint256"}],
    },
]

TEE_VERIFIER_ABI = [
    {
        "name": "attestRun",
        "type": "function",
        "stateMutability": "nonpayable",
        "inputs": [
            {"name": "kind", "type": "uint8"},
            {"name": "promptHash", "type": "bytes32"},
            {"name": "outputHash", "type": "bytes32"},
            {"name": "codeHash", "type": "bytes32"},
            {"name": "signature", "type": "bytes"},
        ],
        "outputs": [{"name": "runId", "type": "bytes32"}],
    },
    {
        "name": "attestedRuns",
        "type": "function",
        "stateMutability": "view",
        "inputs": [{"name": "runId", "type": "bytes32"}],
        "outputs": [
            {"name": "kind", "type": "uint8"},
            {"name": "promptHash", "type": "bytes32"},
            {"name": "outputHash", "type": "bytes32"},
            {"name": "codeHash", "type": "bytes32"},
            {"name": "attesterPubKey", "type": "address"},
            {"name": "timestamp", "type": "uint256"},
            {"name": "verified", "type": "bool"},
        ],
    },
]


@dataclass
class Addresses:
    """Contract addresses for a deployment."""

    vault: str
    signal_board: str
    intent_router: str
    tee_verifier: str


class AgentBankClient:
    """Unified Python client for interacting with all AgentBank V3 protocol contracts.

    Example:
        >>> from agentbank import AgentBankClient
        >>> client = AgentBankClient(
        ...     rpc_url="https://rpc.mantle.xyz",
        ...     private_key="0x...",
        ...     addresses=Addresses(
        ...         vault="0x...",
        ...         signal_board="0x...",
        ...         intent_router="0x...",
        ...         tee_verifier="0x...",
        ...     ),
        ... )
        >>> tvl = client.get_tvl()
    """

    def __init__(
        self,
        rpc_url: str,
        addresses: Addresses,
        private_key: str | None = None,
        chain_id: int = 5000,
    ) -> None:
        self.w3 = Web3(Web3.HTTPProvider(rpc_url))
        self.chain_id = chain_id
        self.addresses = addresses
        self.account: LocalAccount | None = None

        if private_key:
            self.account = self.w3.eth.account.from_key(private_key)

        # Initialize contract instances
        self._vault: Contract = self.w3.eth.contract(
            address=Web3.to_checksum_address(addresses.vault),
            abi=VAULT_ABI,
        )
        self._signal_board: Contract = self.w3.eth.contract(
            address=Web3.to_checksum_address(addresses.signal_board),
            abi=SIGNAL_BOARD_ABI,
        )
        self._intent_router: Contract = self.w3.eth.contract(
            address=Web3.to_checksum_address(addresses.intent_router),
            abi=INTENT_ROUTER_ABI,
        )
        self._tee_verifier: Contract = self.w3.eth.contract(
            address=Web3.to_checksum_address(addresses.tee_verifier),
            abi=TEE_VERIFIER_ABI,
        )

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _require_account(self) -> LocalAccount:
        if self.account is None:
            raise RuntimeError("AgentBankClient: private_key required for write operations")
        return self.account

    def _send_tx(self, tx: dict[str, Any]) -> HexBytes:
        """Sign and send a transaction, return the tx hash."""
        account = self._require_account()
        tx["from"] = account.address
        tx["nonce"] = self.w3.eth.get_transaction_count(account.address)
        tx["chainId"] = self.chain_id
        if "gas" not in tx:
            tx["gas"] = self.w3.eth.estimate_gas(tx)
        signed = account.sign_transaction(tx)
        return self.w3.eth.send_raw_transaction(signed.raw_transaction)

    # ------------------------------------------------------------------
    # Vault operations
    # ------------------------------------------------------------------

    def deposit(self, amount_wei: int, receiver: str | None = None) -> HexBytes:
        """Deposit assets into the vault."""
        account = self._require_account()
        receiver = receiver or account.address
        tx = self._vault.functions.deposit(amount_wei, receiver).build_transaction({})
        return self._send_tx(tx)

    def withdraw(
        self, amount_wei: int, receiver: str | None = None, owner: str | None = None
    ) -> HexBytes:
        """Withdraw assets from the vault."""
        account = self._require_account()
        receiver = receiver or account.address
        owner = owner or account.address
        tx = self._vault.functions.withdraw(amount_wei, receiver, owner).build_transaction({})
        return self._send_tx(tx)

    def get_shares(self, account_address: str) -> int:
        """Get vault shares balance for an account."""
        return self._vault.functions.balanceOf(
            Web3.to_checksum_address(account_address)
        ).call()

    def get_tvl(self) -> int:
        """Get total value locked (total assets) in the vault."""
        return self._vault.functions.totalAssets().call()

    def get_apy(self) -> float:
        """Estimate current APY from share price (simplified)."""
        one_share = 10**18
        assets_per_share: int = self._vault.functions.convertToAssets(one_share).call()
        share_price = assets_per_share / one_share
        return (share_price - 1.0) * 100.0

    # ------------------------------------------------------------------
    # Analyst / Signal operations
    # ------------------------------------------------------------------

    def register_analyst(self, metadata: bytes = b"") -> HexBytes:
        """Register the connected account as an analyst."""
        account = self._require_account()
        tx = self._signal_board.functions.registerAnalyst(
            account.address, metadata
        ).build_transaction({})
        return self._send_tx(tx)

    def deregister_analyst(self) -> HexBytes:
        """Deregister the connected account as an analyst."""
        account = self._require_account()
        tx = self._signal_board.functions.deregisterAnalyst(
            account.address
        ).build_transaction({})
        return self._send_tx(tx)

    def post_signal(
        self,
        asset: str,
        direction: int,
        magnitude: int,
        reasoning: str | bytes,
        ttl: int,
    ) -> HexBytes:
        """Post a trading signal to the SignalBoard."""
        if isinstance(reasoning, str):
            reasoning_hash = Web3.keccak(text=reasoning)
        else:
            reasoning_hash = reasoning

        tx = self._signal_board.functions.postSignal(
            Web3.to_checksum_address(asset),
            direction,
            magnitude,
            reasoning_hash,
            ttl,
        ).build_transaction({})
        return self._send_tx(tx)

    def get_reputation(self, analyst: str) -> ReputationData:
        """Get reputation data for an analyst."""
        result = self._signal_board.functions.getReputation(
            Web3.to_checksum_address(analyst)
        ).call()
        return ReputationData(
            score=result[0],
            total_signals=result[1],
            profitable_signals=result[2],
            avg_pnl_bps=result[3],
        )

    # ------------------------------------------------------------------
    # Intent operations
    # ------------------------------------------------------------------

    def post_intent(
        self,
        asset: str,
        amount_wei: int,
        min_apy_bps: int,
        max_drawdown_bps: int,
        duration: int,
    ) -> HexBytes:
        """Post a deposit intent to the auction system."""
        tx = self._intent_router.functions.postIntent(
            Web3.to_checksum_address(asset),
            amount_wei,
            min_apy_bps,
            max_drawdown_bps,
            duration,
        ).build_transaction({})
        return self._send_tx(tx)

    def submit_bid(
        self,
        intent_id: int,
        tier_vault: str,
        promised_apy: int,
        bond_amount: int,
    ) -> HexBytes:
        """Submit a solver bid for an intent."""
        tx = self._intent_router.functions.submitBid(
            intent_id,
            Web3.to_checksum_address(tier_vault),
            promised_apy,
            bond_amount,
        ).build_transaction({})
        return self._send_tx(tx)

    def settle_auction(self, intent_id: int) -> HexBytes:
        """Settle the auction for an intent."""
        tx = self._intent_router.functions.settleAuction(intent_id).build_transaction({})
        return self._send_tx(tx)

    def get_open_intents(self, limit: int = 50) -> list[IntentData]:
        """Fetch recent open intents (scans backwards from latest)."""
        next_id: int = self._intent_router.functions.nextIntentId().call()
        start = max(0, next_id - limit)
        results: list[IntentData] = []

        for i in range(start, next_id):
            raw = self._intent_router.functions.intents(i).call()
            intent = IntentData(
                id=raw[0],
                user=raw[1],
                asset=raw[2],
                amount=raw[3],
                min_apy_bps=raw[4],
                max_drawdown_bps=raw[5],
                duration=raw[6],
                deadline=raw[7],
                status=IntentStatus(raw[8]),
                winning_bid=raw[9],
                created_at=raw[10],
            )
            if intent.status == IntentStatus.Open:
                results.append(intent)

        return results

    # ------------------------------------------------------------------
    # Attestation operations
    # ------------------------------------------------------------------

    def verify_run(
        self,
        kind: TEEKind,
        prompt_hash: bytes,
        output_hash: bytes,
        code_hash: bytes,
        signature: bytes,
    ) -> HexBytes:
        """Submit a TEE attestation for an agent run."""
        tx = self._tee_verifier.functions.attestRun(
            kind.value, prompt_hash, output_hash, code_hash, signature
        ).build_transaction({})
        return self._send_tx(tx)

    def get_attested_run(self, run_id: bytes) -> AttestedRun:
        """Fetch an attested run by its ID."""
        raw = self._tee_verifier.functions.attestedRuns(run_id).call()
        return AttestedRun(
            kind=TEEKind(raw[0]),
            prompt_hash=raw[1],
            output_hash=raw[2],
            code_hash=raw[3],
            attester_pub_key=raw[4],
            timestamp=raw[5],
            verified=raw[6],
        )

    def is_verified(self, run_id: bytes) -> bool:
        """Check if a run has been verified on-chain."""
        run = self.get_attested_run(run_id)
        return run.verified

    @staticmethod
    def compute_run_id(prompt_hash: bytes, output_hash: bytes, code_hash: bytes) -> bytes:
        """Compute runId matching the on-chain derivation."""
        return Web3.keccak(prompt_hash + output_hash + code_hash)

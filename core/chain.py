"""
Web3 / Mantle connection handler.
Provides account management, contract interaction, and chain state queries.
"""

from web3 import Web3
from web3.middleware import ExtraDataToPOAMiddleware
from eth_account import Account
from loguru import logger
import config


class MantleChain:
    """Manages Web3 connection to Mantle network."""

    def __init__(self, private_key: str):
        self.w3 = Web3(Web3.HTTPProvider(config.RPC_URL))
        self.w3.middleware_onion.inject(ExtraDataToPOAMiddleware, layer=0)

        self.account = Account.from_key(private_key)
        self.address = self.account.address

        if not self.w3.is_connected():
            logger.warning(f"Failed to connect to {config.RPC_URL}")
        else:
            logger.info(f"Connected to Mantle | chain_id={config.CHAIN_ID} | address={self.address}")

    def get_vault_tvl(self) -> float:
        """Get vault total assets in USDC (6 decimals)."""
        if not config.VAULT_CONTRACT_ADDRESS or not config.VAULT_ABI:
            return 0.0

        vault = self.w3.eth.contract(
            address=Web3.to_checksum_address(config.VAULT_CONTRACT_ADDRESS),
            abi=config.VAULT_ABI
        )
        try:
            total_assets = vault.functions.totalAssets().call()
            return total_assets / 1e6  # USDC has 6 decimals
        except Exception as e:
            logger.error(f"Failed to get vault TVL: {e}")
            return 0.0

    def is_vault_paused(self) -> bool:
        """Check if vault is currently paused."""
        if not config.VAULT_CONTRACT_ADDRESS or not config.VAULT_ABI:
            return False

        vault = self.w3.eth.contract(
            address=Web3.to_checksum_address(config.VAULT_CONTRACT_ADDRESS),
            abi=config.VAULT_ABI
        )
        try:
            return vault.functions.paused().call()
        except Exception:
            return False

    async def call_contract(
        self,
        contract_address: str,
        abi: list,
        function_name: str,
        args: list = None
    ) -> bytes:
        """Build, sign, and send a transaction to a contract."""
        if args is None:
            args = []

        contract = self.w3.eth.contract(
            address=Web3.to_checksum_address(contract_address),
            abi=abi
        )

        func = getattr(contract.functions, function_name)(*args)

        # Build transaction
        nonce = self.w3.eth.get_transaction_count(self.address)
        tx = func.build_transaction({
            "from": self.address,
            "nonce": nonce,
            "gas": 500000,
            "gasPrice": self.w3.eth.gas_price,
            "chainId": config.CHAIN_ID,
        })

        # Sign and send
        signed = self.account.sign_transaction(tx)
        tx_hash = self.w3.eth.send_raw_transaction(signed.raw_transaction)

        # Wait for receipt
        receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
        logger.info(f"Tx confirmed | hash={tx_hash.hex()} | status={receipt['status']}")

        return tx_hash

    def get_balance(self) -> float:
        """Get native MNT balance."""
        balance_wei = self.w3.eth.get_balance(self.address)
        return self.w3.from_wei(balance_wei, "ether")

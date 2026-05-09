"""
ERC-8004 Identity & Reputation manager.
Handles reading and updating agent reputation scores on-chain.
"""

from web3 import Web3
from loguru import logger
import config


class IdentityManager:
    """Manages ERC-8004 agent identity and reputation on-chain."""

    def __init__(self, chain, agent_wallet: str):
        self.chain = chain
        self.w3 = chain.w3
        self.agent_wallet = agent_wallet

        if config.AGENT_IDENTITY_ADDRESS and config.IDENTITY_ABI:
            self.contract = self.w3.eth.contract(
                address=Web3.to_checksum_address(config.AGENT_IDENTITY_ADDRESS),
                abi=config.IDENTITY_ABI
            )
        else:
            self.contract = None
            logger.warning("AgentIdentity contract not configured")

    def get_token_id(self, wallet: str) -> int:
        """Get the NFT token ID for a given agent wallet."""
        if not self.contract:
            return 0
        try:
            return self.contract.functions.agentTokenId(
                Web3.to_checksum_address(wallet)
            ).call()
        except Exception as e:
            logger.error(f"Failed to get token ID: {e}")
            return 0

    def update_reputation(self, token_id: int, delta: int, reason: str):
        """Update an agent's reputation score on-chain."""
        if not self.contract:
            logger.warning("Identity contract not configured — skipping reputation update")
            return

        try:
            # Build and send transaction
            nonce = self.w3.eth.get_transaction_count(self.chain.address)
            func = self.contract.functions.updateReputation(token_id, delta, reason)

            tx = func.build_transaction({
                "from": self.chain.address,
                "nonce": nonce,
                "gas": 200000,
                "gasPrice": self.w3.eth.gas_price,
                "chainId": config.CHAIN_ID,
            })

            signed = self.chain.account.sign_transaction(tx)
            tx_hash = self.w3.eth.send_raw_transaction(signed.raw_transaction)
            self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=60)

            logger.info(f"Reputation updated | token_id={token_id} | delta={delta} | reason={reason}")
        except Exception as e:
            logger.error(f"Failed to update reputation: {e}")

    def get_reputation(self, wallet: str = None) -> int:
        """Get current reputation score for an agent."""
        if not self.contract:
            return 100

        target = wallet or self.agent_wallet
        try:
            profile = self.contract.functions.getProfileByWallet(
                Web3.to_checksum_address(target)
            ).call()
            return profile[2]  # reputationScore is 3rd field
        except Exception as e:
            logger.error(f"Failed to get reputation: {e}")
            return 100

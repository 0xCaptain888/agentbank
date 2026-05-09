"""
SignalBoard contract interaction layer.
Handles reading and writing signals to the on-chain SignalBoard.
"""

from web3 import Web3
from loguru import logger
import config


# Token address mapping for Mantle
TOKEN_ADDRESSES = {
    "USDC": "0x09Bc4E0D864854c6aFB6eB9A9cdF58aC190D0dF9",
    "WETH": "0xdEAddEaDdeadDEadDEADDEAddEADDEAddead1111",
    "WMNT": "0x78c1b0C915c4FAA5FffA6CAbf0219DA63d7f4cb8",
    "USDT": "0x201EBa5CC46D216Ce6DC03F6a759e8E766e956aE",
    "WBTC": "0xCAbAE6f6Ea1ecaB08Ad02fE02ce9A44F09aebfA2",
}


class SignalBus:
    """Interface to the SignalBoard contract."""

    def __init__(self, chain):
        self.chain = chain
        self.w3 = chain.w3

        if config.SIGNAL_BOARD_ADDRESS and config.SIGNAL_BOARD_ABI:
            self.contract = self.w3.eth.contract(
                address=Web3.to_checksum_address(config.SIGNAL_BOARD_ADDRESS),
                abi=config.SIGNAL_BOARD_ABI
            )
        else:
            self.contract = None
            logger.warning("SignalBoard contract not configured")

    async def post_signal(
        self,
        signal_type: str,
        target_protocol: str,
        token_in_symbol: str,
        token_out_symbol: str,
        amount_percentage: int,
        confidence: int,
        reasoning: str
    ) -> bytes:
        """Post a new strategy signal to the SignalBoard contract."""
        token_in_addr = TOKEN_ADDRESSES.get(token_in_symbol, TOKEN_ADDRESSES["USDC"])
        token_out_addr = TOKEN_ADDRESSES.get(token_out_symbol, TOKEN_ADDRESSES["USDC"])

        # Calculate amount in based on vault TVL and percentage
        vault_tvl_usdc = self.chain.get_vault_tvl()
        amount_in = int((vault_tvl_usdc * amount_percentage / 100) * 1e6)  # USDC 6 decimals
        min_amount_out = int(amount_in * 0.97)  # 3% slippage tolerance

        tx_hash = await self.chain.call_contract(
            contract_address=config.SIGNAL_BOARD_ADDRESS,
            abi=config.SIGNAL_BOARD_ABI,
            function_name="postSignal",
            args=[
                signal_type,
                target_protocol,
                Web3.to_checksum_address(token_in_addr),
                Web3.to_checksum_address(token_out_addr),
                amount_in,
                min_amount_out,
                confidence,
                reasoning
            ]
        )

        logger.info(f"Signal posted | type={signal_type} | tx={tx_hash.hex()}")
        return tx_hash

    async def get_pending_signals(self) -> list:
        """Fetch all pending signals from the SignalBoard."""
        if not self.contract:
            return []

        try:
            raw_signals = self.contract.functions.getPendingSignals().call()
            signals = []
            for s in raw_signals:
                signals.append({
                    "id": s[0],
                    "from": s[1],
                    "signal_type": s[2],
                    "target_protocol": s[3],
                    "token_in_address": s[4],
                    "token_out_address": s[5],
                    "amount_in": s[6],
                    "min_amount_out": s[7],
                    "confidence": s[8],
                    "reasoning": s[9],
                    "status": s[10],
                    "created_at": s[11],
                })
            return signals
        except Exception as e:
            logger.error(f"Failed to fetch pending signals: {e}")
            return []

    async def update_signal_status(
        self,
        signal_id: bytes,
        new_status: str,
        execution_tx_hash: bytes = b'\x00' * 32
    ):
        """Update a signal's status on-chain."""
        status_map = {"Pending": 0, "Executed": 1, "Blocked": 2, "Expired": 3}
        status_int = status_map.get(new_status, 0)

        await self.chain.call_contract(
            contract_address=config.SIGNAL_BOARD_ADDRESS,
            abi=config.SIGNAL_BOARD_ABI,
            function_name="updateSignalStatus",
            args=[signal_id, status_int, execution_tx_hash]
        )
        logger.info(f"Signal status updated | id={signal_id.hex()} | status={new_status}")

"""
Swap Execution Skill
Builds and encodes swap transactions for Mantle DeFi protocols.
Supports: Merchant Moe, Agni Finance, Fluxion
"""

from web3 import Web3
from loguru import logger
import config


# Known router addresses on Mantle
PROTOCOL_ROUTERS = {
    "merchant_moe": "0x...",  # Merchant Moe LB Router
    "agni_finance": "0x...",  # Agni Finance SwapRouter
    "fluxion": "0x...",       # Fluxion Router
}


class SwapExecutionSkill:
    """Builds swap transaction calldata for vault execution."""

    def __init__(self, chain):
        self.chain = chain
        self.w3 = chain.w3

    async def build_tx(self, signal: dict, vault_address: str) -> dict:
        """
        Build a proposed transaction from a signal.
        Returns dict with: target, data, amount, amount_usdc, min_amount_out,
                          estimated_slippage_pct, pool_tvl
        """
        protocol = signal.get("target_protocol", "merchant_moe")
        signal_type = signal.get("signal_type", "swap")

        # Get router address
        router = PROTOCOL_ROUTERS.get(protocol, PROTOCOL_ROUTERS["merchant_moe"])

        # Build calldata based on signal type
        if signal_type == "swap":
            data = self._build_swap_calldata(signal)
        elif signal_type == "addLiquidity":
            data = self._build_add_liquidity_calldata(signal)
        elif signal_type == "removeLiquidity":
            data = self._build_remove_liquidity_calldata(signal)
        else:
            data = self._build_swap_calldata(signal)

        amount = signal.get("amount_in", 0)
        min_amount_out = signal.get("min_amount_out", 0)

        # Calculate estimated slippage
        if amount > 0 and min_amount_out > 0:
            estimated_slippage = ((amount - min_amount_out) / amount) * 100
        else:
            estimated_slippage = 0.0

        return {
            "target": Web3.to_checksum_address(router) if router.startswith("0x") and len(router) == 42 else vault_address,
            "data": data,
            "amount": amount,
            "amount_usdc": amount / 1e6,  # Convert from raw to USDC
            "min_amount_out": min_amount_out,
            "estimated_slippage_pct": estimated_slippage,
            "pool_tvl": 100_000,  # TODO: fetch real pool TVL
        }

    def _build_swap_calldata(self, signal: dict) -> bytes:
        """Build swap function calldata."""
        # Simplified: encode a basic swap call
        # In production, this would use the specific router's ABI
        token_in = signal.get("token_in_address", config.USDC_ADDRESS)
        token_out = signal.get("token_out_address", config.USDC_ADDRESS)
        amount_in = signal.get("amount_in", 0)
        min_out = signal.get("min_amount_out", 0)

        # Encode swap(address,address,uint256,uint256,address)
        func_sig = Web3.keccak(text="swap(address,address,uint256,uint256,address)")[:4]
        params = Web3.codec.encode(
            ["address", "address", "uint256", "uint256", "address"],
            [token_in, token_out, amount_in, min_out, config.VAULT_CONTRACT_ADDRESS]
        ) if hasattr(Web3, 'codec') else b'\x00' * 160

        return func_sig + params if params != b'\x00' * 160 else b'\x00'

    def _build_add_liquidity_calldata(self, signal: dict) -> bytes:
        """Build addLiquidity calldata."""
        # Placeholder — in production, encode the specific router function
        return b'\x00'

    def _build_remove_liquidity_calldata(self, signal: dict) -> bytes:
        """Build removeLiquidity calldata."""
        # Placeholder — in production, encode the specific router function
        return b'\x00'

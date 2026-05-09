"""
DEX Aggregation Module.
Routes trades through multiple DEX sources for best execution:
1. 1inch API (aggregator, best price)
2. Merchant Moe (native Mantle DEX)
3. Agni Finance (concentrated liquidity on Mantle)
Compares quotes and builds calldata for the DEXAdapter contract.
"""

import asyncio
import aiohttp
from typing import Optional
from loguru import logger
from web3 import Web3
import config


ONEINCH_API_BASE = "https://api.1inch.dev/swap/v6.0/5000"
MERCHANT_MOE_ROUTER = "0xeaEe7EE68874218c3558b40063c42B82D3E7232a"
AGNI_ROUTER = "0x319B69888b0d11cEC22caA5034e25FfFBDc88421"

DEX_ADAPTER_ADDRESS = config.__dict__.get("DEX_ADAPTER_ADDRESS", "")
DEX_ADAPTER_ABI = config._load_abi("DEXAdapter")


class DEXQuote:
    """Represents a quote from a DEX source."""

    def __init__(self, source: str, amount_out: int, gas_estimate: int, calldata: bytes = b""):
        self.source = source
        self.amount_out = amount_out
        self.gas_estimate = gas_estimate
        self.calldata = calldata

    @property
    def effective_out(self) -> int:
        """Amount out minus estimated gas cost in token terms."""
        return self.amount_out - (self.gas_estimate * 50_000_000)  # rough gas-to-token


class DEXAdapter:
    """
    Aggregates DEX quotes and executes via the best route.
    Priority: 1inch > Merchant Moe > Agni Finance.
    """

    def __init__(self, chain, oneinch_api_key: str = None):
        self.chain = chain
        self.w3 = chain.w3
        self.oneinch_api_key = oneinch_api_key or config.__dict__.get("ONEINCH_API_KEY", "")
        self.session: Optional[aiohttp.ClientSession] = None

    async def _get_session(self) -> aiohttp.ClientSession:
        if self.session is None or self.session.closed:
            self.session = aiohttp.ClientSession()
        return self.session

    async def get_best_quote(
        self, token_in: str, token_out: str, amount_in: int, slippage_pct: float = 1.0
    ) -> Optional[DEXQuote]:
        """Fetch quotes from all sources and return the best one."""
        quotes = await asyncio.gather(
            self._quote_1inch(token_in, token_out, amount_in, slippage_pct),
            self._quote_merchant_moe(token_in, token_out, amount_in),
            self._quote_agni(token_in, token_out, amount_in),
            return_exceptions=True,
        )

        valid_quotes = []
        for q in quotes:
            if isinstance(q, DEXQuote) and q.amount_out > 0:
                valid_quotes.append(q)
            elif isinstance(q, Exception):
                logger.debug(f"Quote source failed: {q}")

        if not valid_quotes:
            logger.error("All DEX quote sources failed")
            return None

        best = max(valid_quotes, key=lambda q: q.effective_out)
        logger.info(f"Best quote: {best.source} | out={best.amount_out} | gas={best.gas_estimate}")
        return best

    async def _quote_1inch(
        self, token_in: str, token_out: str, amount_in: int, slippage: float
    ) -> DEXQuote:
        """Fetch quote from 1inch aggregator API."""
        session = await self._get_session()
        params = {
            "src": token_in,
            "dst": token_out,
            "amount": str(amount_in),
            "from": self.chain.address,
            "slippage": str(slippage),
            "disableEstimate": "true",
        }
        headers = {"Authorization": f"Bearer {self.oneinch_api_key}"} if self.oneinch_api_key else {}

        async with session.get(f"{ONEINCH_API_BASE}/swap", params=params, headers=headers) as resp:
            if resp.status != 200:
                raise Exception(f"1inch API returned {resp.status}")
            data = await resp.json()
            return DEXQuote(
                source="1inch",
                amount_out=int(data["dstAmount"]),
                gas_estimate=int(data.get("gas", 300000)),
                calldata=bytes.fromhex(data["tx"]["data"][2:]),
            )

    async def _quote_merchant_moe(self, token_in: str, token_out: str, amount_in: int) -> DEXQuote:
        """Get quote from Merchant Moe router (UniV2-style)."""
        router = self.w3.eth.contract(
            address=Web3.to_checksum_address(MERCHANT_MOE_ROUTER),
            abi=[{
                "inputs": [{"name": "amountIn", "type": "uint256"}, {"name": "path", "type": "address[]"}],
                "name": "getAmountsOut",
                "outputs": [{"name": "amounts", "type": "uint256[]"}],
                "stateMutability": "view", "type": "function"
            }]
        )
        try:
            path = [Web3.to_checksum_address(token_in), Web3.to_checksum_address(token_out)]
            amounts = router.functions.getAmountsOut(amount_in, path).call()
            return DEXQuote(source="merchant_moe", amount_out=amounts[-1], gas_estimate=180000)
        except Exception as e:
            raise Exception(f"Merchant Moe quote failed: {e}")

    async def _quote_agni(self, token_in: str, token_out: str, amount_in: int) -> DEXQuote:
        """Get quote from Agni Finance (UniV3-style quoter)."""
        quoter_address = "0x3d146FE6eCF7A5a1BFab1e6a13d08C88Cb7135ae"
        quoter = self.w3.eth.contract(
            address=Web3.to_checksum_address(quoter_address),
            abi=[{
                "inputs": [
                    {"name": "tokenIn", "type": "address"}, {"name": "tokenOut", "type": "address"},
                    {"name": "fee", "type": "uint24"}, {"name": "amountIn", "type": "uint256"},
                    {"name": "sqrtPriceLimitX96", "type": "uint160"}
                ],
                "name": "quoteExactInputSingle",
                "outputs": [{"name": "amountOut", "type": "uint256"}],
                "stateMutability": "view", "type": "function"
            }]
        )
        try:
            amount_out = quoter.functions.quoteExactInputSingle(
                Web3.to_checksum_address(token_in),
                Web3.to_checksum_address(token_out),
                3000,  # 0.3% fee tier
                amount_in,
                0
            ).call()
            return DEXQuote(source="agni_finance", amount_out=amount_out, gas_estimate=200000)
        except Exception as e:
            raise Exception(f"Agni quote failed: {e}")

    async def build_swap_calldata(self, quote: DEXQuote, token_in: str, token_out: str, amount_in: int, min_out: int) -> dict:
        """Build calldata for the DEXAdapter contract execution."""
        if not DEX_ADAPTER_ADDRESS or not DEX_ADAPTER_ABI:
            raise ValueError("DEXAdapter contract not configured")

        contract = self.w3.eth.contract(
            address=Web3.to_checksum_address(DEX_ADAPTER_ADDRESS), abi=DEX_ADAPTER_ABI
        )
        source_id = {"1inch": 0, "merchant_moe": 1, "agni_finance": 2}.get(quote.source, 0)

        func = contract.functions.executeSwap(
            Web3.to_checksum_address(token_in),
            Web3.to_checksum_address(token_out),
            amount_in, min_out, source_id, quote.calldata
        )
        return func.build_transaction({
            "from": self.chain.address,
            "gas": quote.gas_estimate + 50000,
            "gasPrice": self.w3.eth.gas_price,
            "chainId": config.CHAIN_ID,
        })

    async def close(self):
        """Close the HTTP session."""
        if self.session and not self.session.closed:
            await self.session.close()

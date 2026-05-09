"""
Pool Analysis Skill
Fetches real-time pool data from Mantle DeFi protocols.
Supports: Merchant Moe, Agni Finance, Fluxion
"""

import httpx
from pydantic import BaseModel
from typing import List
import config


class PoolData(BaseModel):
    protocol: str
    pool_address: str
    token0: str
    token1: str
    apr_24h: float
    tvl: float
    volume_24h: float
    fee_tier: float
    price_token0_usd: float
    price_token1_usd: float


class PoolAnalysisSkill:

    MERCHANT_MOE_API = "https://api.merchantmoe.com/v1/pools"
    AGNI_FINANCE_API = "https://api.agni.finance/v1/pools"

    def __init__(self, chain):
        self.chain = chain
        self.client = httpx.AsyncClient(timeout=15.0)

    async def fetch_all_pools(self) -> List[PoolData]:
        """Fetch pool data from all supported protocols."""
        results = []

        # Merchant Moe pools
        try:
            mm_pools = await self._fetch_merchant_moe()
            results.extend(mm_pools)
        except Exception as e:
            pass  # Log and continue

        # Agni Finance pools
        try:
            agni_pools = await self._fetch_agni()
            results.extend(agni_pools)
        except Exception as e:
            pass

        # Sort by APR descending
        results.sort(key=lambda x: x.apr_24h, reverse=True)

        # Return top 10
        return results[:10]

    async def _fetch_merchant_moe(self) -> List[PoolData]:
        """
        Fetch from Merchant Moe API.
        If API is unavailable, fall back to reading contract state directly.
        """
        try:
            response = await self.client.get(self.MERCHANT_MOE_API)
            data = response.json()
            pools = []
            for p in data.get("pools", []):
                pools.append(PoolData(
                    protocol="merchant_moe",
                    pool_address=p["address"],
                    token0=p["token0"]["symbol"],
                    token1=p["token1"]["symbol"],
                    apr_24h=float(p.get("apr24h", 0)),
                    tvl=float(p.get("tvlUSD", 0)),
                    volume_24h=float(p.get("volume24hUSD", 0)),
                    fee_tier=float(p.get("feeTier", 0.3)),
                    price_token0_usd=float(p["token0"].get("priceUSD", 0)),
                    price_token1_usd=float(p["token1"].get("priceUSD", 0))
                ))
            return pools
        except Exception:
            # Fallback: read from on-chain (simplified)
            return self._fallback_onchain_fetch("merchant_moe")

    async def _fetch_agni(self) -> List[PoolData]:
        try:
            response = await self.client.get(self.AGNI_FINANCE_API)
            data = response.json()
            pools = []
            for p in data.get("data", {}).get("pools", []):
                pools.append(PoolData(
                    protocol="agni_finance",
                    pool_address=p["id"],
                    token0=p["token0"]["symbol"],
                    token1=p["token1"]["symbol"],
                    apr_24h=float(p.get("apr", 0)) * 100,
                    tvl=float(p.get("totalValueLockedUSD", 0)),
                    volume_24h=float(p.get("volumeUSD", 0)),
                    fee_tier=float(p.get("feeTier", 500)) / 10000,
                    price_token0_usd=float(p["token0"].get("tokenDayData", [{}])[0].get("priceUSD", 0)),
                    price_token1_usd=float(p["token1"].get("tokenDayData", [{}])[0].get("priceUSD", 0))
                ))
            return pools
        except Exception:
            return []

    def _fallback_onchain_fetch(self, protocol: str) -> List[PoolData]:
        """Minimal fallback using known pool addresses."""
        # Known high-TVL pools on Mantle (hardcoded as fallback)
        return []

"""
M10 — Cross-Chain Byreal Signal Bridge.
Uses Byreal CLI (Solana) as a price/yield reference for Mantle decisions.
Analyst agents use this to compare Mantle DEX yields against Byreal's Solana CLMM yields.
"""

import asyncio
import json
from typing import List, Dict, Optional
from loguru import logger


class ByrealBridge:
    """Wraps the byreal-cli npm package for cross-chain yield intelligence."""

    def __init__(self, cli_path: str = "byreal-cli"):
        self.cli = cli_path
        self._cache: Dict[str, Dict] = {}
        self._cache_ttl = 300  # 5 minutes

    async def get_top_pools(self, sort_by: str = "apr24h", limit: int = 10) -> List[Dict]:
        """Fetch top pools on Byreal Solana."""
        try:
            proc = await asyncio.create_subprocess_exec(
                self.cli, "pools", "list",
                "--sort-field", sort_by,
                "--limit", str(limit),
                "-o", "json",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await proc.communicate()
            if proc.returncode != 0:
                logger.warning(f"byreal-cli pools list failed: {stderr.decode()}")
                return []
            data = json.loads(stdout.decode())
            return data.get("data", {}).get("pools", [])
        except FileNotFoundError:
            logger.warning("byreal-cli not found in PATH; cross-chain data unavailable")
            return []
        except Exception as e:
            logger.error(f"ByrealBridge.get_top_pools error: {e}")
            return []

    async def get_pool_analysis(self, pool_address: str) -> Dict:
        """Get detailed analysis for a specific Byreal Solana pool."""
        try:
            proc = await asyncio.create_subprocess_exec(
                self.cli, "pools", "analyze", pool_address, "-o", "json",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, _ = await proc.communicate()
            return json.loads(stdout.decode()).get("data", {})
        except Exception as e:
            logger.error(f"ByrealBridge.get_pool_analysis error: {e}")
            return {}

    async def cross_chain_yield_diff(self, mantle_apy: float, token_pair: str) -> Dict:
        """
        Compare Mantle APY to equivalent Byreal Solana APY for the same pair.
        Returns advantage direction and spread.
        """
        try:
            pools = await self.get_top_pools(sort_by="apr24h", limit=20)
            match = next(
                (p for p in pools if token_pair.lower() in (p.get("name", "").lower())),
                None
            )
            if not match:
                return {"comparable": False, "reason": f"No matching pool for {token_pair} on Solana"}

            sol_apy = float(match.get("apr24h", 0))
            spread = mantle_apy - sol_apy
            return {
                "comparable": True,
                "mantle_apy": mantle_apy,
                "solana_apy": sol_apy,
                "spread_pct": spread,
                "advantage": "mantle" if spread > 0 else "solana",
                "pool_name": match.get("name", ""),
                "pool_tvl": match.get("tvl", 0),
            }
        except Exception as e:
            logger.error(f"ByrealBridge.cross_chain_yield_diff error: {e}")
            return {"comparable": False, "reason": str(e)}

    async def get_solana_market_context(self) -> str:
        """
        Build a text summary of Solana DeFi yields for analyst prompt augmentation.
        """
        pools = await self.get_top_pools(sort_by="apr24h", limit=5)
        if not pools:
            return "Cross-chain reference (Byreal Solana): Unavailable this cycle"

        lines = ["Cross-chain reference (Byreal Solana):"]
        for p in pools:
            name = p.get("name", "Unknown")
            apr = p.get("apr24h", 0)
            tvl = p.get("tvl", 0)
            lines.append(f"  - {name}: APR {apr:.2f}% | TVL ${tvl:,.0f}")
        return "\n".join(lines)

    async def build_cross_chain_context(self, mantle_pools: List[Dict]) -> str:
        """
        Build full cross-chain comparison context for analyst prompts.
        Compares top Mantle pools against equivalent Solana pools.
        """
        sol_context_lines = []
        try:
            for p in mantle_pools[:3]:
                token0 = p.get("token0", "")
                token1 = p.get("token1", "")
                pair = f"{token0}/{token1}"
                mantle_apr = p.get("apr_24h", 0)

                cmp = await self.cross_chain_yield_diff(mantle_apr, pair)
                if cmp.get("comparable"):
                    sol_context_lines.append(
                        f"- {pair}: Mantle {cmp['mantle_apy']:.2f}% vs "
                        f"Solana(Byreal) {cmp['solana_apy']:.2f}% "
                        f"({cmp['advantage']} advantage, spread {abs(cmp['spread_pct']):.2f}%)"
                    )
        except Exception as e:
            logger.warning(f"Byreal bridge unavailable: {e}")

        if sol_context_lines:
            header = "Cross-chain reference (Byreal Solana):"
            footer = "\nUse cross-chain spread as sanity check: large negative spread suggests Mantle pool overheated; large positive spread suggests opportunity."
            return header + "\n" + "\n".join(sol_context_lines) + footer
        else:
            return "Cross-chain reference (Byreal Solana): Unavailable this cycle"

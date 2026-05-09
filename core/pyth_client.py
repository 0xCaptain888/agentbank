"""
Pyth Oracle Client.
Fetches price feeds from Pyth Network, calculates TWAP,
detects price anomalies, and feeds data into the RiskOracle contract.
"""

import asyncio
import time
from collections import deque
from typing import Optional
import aiohttp
from loguru import logger
from web3 import Web3
import config


PYTH_HERMES_URL = "https://hermes.pyth.network"

# Common Pyth price feed IDs on Mantle
PRICE_FEED_IDS = {
    "ETH/USD": "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
    "BTC/USD": "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43",
    "MNT/USD": "0x4e3cd07832351aab4e2ee20bf4c43e4d0f72718ddd013e42a23a3b5ebfedcc12",
    "USDC/USD": "0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a",
    "USDT/USD": "0x2b89b9dc8fdf9f34709a5b106b472f0f39bb6ca9ce04b0fd7f2e971688e2e53b",
}

ANOMALY_THRESHOLD_PCT = 5.0  # 5% deviation triggers anomaly


class PriceEntry:
    """Single price observation."""

    def __init__(self, price: float, confidence: float, timestamp: float):
        self.price = price
        self.confidence = confidence
        self.timestamp = timestamp


class PythClient:
    """
    Client for Pyth Network oracle data.
    Provides real-time prices, TWAP calculation, and anomaly detection.
    """

    def __init__(self, chain, risk_oracle_address: str = None, risk_oracle_abi: list = None):
        self.chain = chain
        self.w3 = chain.w3
        self.risk_oracle_address = risk_oracle_address or config.__dict__.get("RISK_ORACLE_ADDRESS", "")
        self.risk_oracle_abi = risk_oracle_abi or config._load_abi("RiskOracle")
        self.session: Optional[aiohttp.ClientSession] = None
        self._price_history: dict[str, deque] = {}
        self._twap_window = 3600  # 1 hour TWAP

        logger.info("PythClient initialized")

    async def _get_session(self) -> aiohttp.ClientSession:
        if self.session is None or self.session.closed:
            self.session = aiohttp.ClientSession()
        return self.session

    async def fetch_price(self, pair: str) -> Optional[PriceEntry]:
        """Fetch latest price for a trading pair from Pyth Hermes."""
        feed_id = PRICE_FEED_IDS.get(pair)
        if not feed_id:
            logger.error(f"Unknown price feed: {pair}")
            return None

        session = await self._get_session()
        url = f"{PYTH_HERMES_URL}/v2/updates/price/latest"
        params = {"ids[]": feed_id, "parsed": "true"}

        try:
            async with session.get(url, params=params) as resp:
                if resp.status != 200:
                    logger.error(f"Pyth API error: status={resp.status}")
                    return None
                data = await resp.json()

            parsed = data["parsed"][0]["price"]
            price = float(parsed["price"]) * (10 ** int(parsed["expo"]))
            conf = float(parsed["conf"]) * (10 ** int(parsed["expo"]))
            ts = float(data["parsed"][0]["price"]["publish_time"])

            entry = PriceEntry(price=price, confidence=conf, timestamp=ts)
            self._record_price(pair, entry)
            return entry

        except Exception as e:
            logger.error(f"Failed to fetch Pyth price for {pair}: {e}")
            return None

    def _record_price(self, pair: str, entry: PriceEntry):
        """Store price in history for TWAP calculation."""
        if pair not in self._price_history:
            self._price_history[pair] = deque(maxlen=360)  # ~1hr at 10s intervals
        self._price_history[pair].append(entry)

    def calculate_twap(self, pair: str, window_seconds: int = None) -> Optional[float]:
        """Calculate time-weighted average price over the given window."""
        window = window_seconds or self._twap_window
        history = self._price_history.get(pair)
        if not history or len(history) < 2:
            return None

        now = time.time()
        cutoff = now - window
        relevant = [e for e in history if e.timestamp >= cutoff]

        if len(relevant) < 2:
            return None

        total_weight = 0.0
        weighted_sum = 0.0
        for i in range(1, len(relevant)):
            dt = relevant[i].timestamp - relevant[i - 1].timestamp
            avg_price = (relevant[i].price + relevant[i - 1].price) / 2
            weighted_sum += avg_price * dt
            total_weight += dt

        if total_weight == 0:
            return relevant[-1].price

        twap = weighted_sum / total_weight
        logger.debug(f"TWAP for {pair}: {twap:.4f} (window={window}s, points={len(relevant)})")
        return twap

    def detect_anomaly(self, pair: str, current_price: float) -> bool:
        """Detect if current price deviates from TWAP by more than threshold."""
        twap = self.calculate_twap(pair)
        if twap is None or twap == 0:
            return False

        deviation_pct = abs(current_price - twap) / twap * 100
        if deviation_pct > ANOMALY_THRESHOLD_PCT:
            logger.warning(
                f"Price anomaly detected for {pair}: "
                f"current={current_price:.4f} twap={twap:.4f} deviation={deviation_pct:.2f}%"
            )
            return True
        return False

    async def feed_risk_oracle(self, pair: str, price: float, is_anomaly: bool) -> Optional[bytes]:
        """Submit price data and anomaly flag to the RiskOracle contract."""
        if not self.risk_oracle_address or not self.risk_oracle_abi:
            return None

        try:
            price_scaled = int(price * 1e8)  # 8 decimal precision
            twap = self.calculate_twap(pair) or price
            twap_scaled = int(twap * 1e8)

            tx_hash = await self.chain.call_contract(
                contract_address=self.risk_oracle_address,
                abi=self.risk_oracle_abi,
                function_name="updatePrice",
                args=[pair.encode("utf-8"), price_scaled, twap_scaled, is_anomaly]
            )
            logger.info(f"RiskOracle updated | pair={pair} | anomaly={is_anomaly} | tx={tx_hash.hex()}")
            return tx_hash
        except Exception as e:
            logger.error(f"Failed to feed RiskOracle: {e}")
            return None

    async def close(self):
        """Close the HTTP session."""
        if self.session and not self.session.closed:
            await self.session.close()

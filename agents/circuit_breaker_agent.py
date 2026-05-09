"""
Circuit Breaker Agent.
Monitors system health metrics and auto-triggers the circuit breaker
contract when thresholds are breached. Alerts via SignalBoard.
"""

import asyncio
from datetime import datetime
from agents.base_agent import BaseAgent
from core.signal_bus import SignalBus
import config


# PnL thresholds (in BPS relative to vault TVL)
PNL_DRAWDOWN_THRESHOLD_BPS = -500   # -5% triggers warning
PNL_CRITICAL_THRESHOLD_BPS = -1000  # -10% triggers circuit breaker
HEALTH_CHECK_INTERVAL_SEC = 30

CIRCUIT_BREAKER_ADDRESS = config.__dict__.get("CIRCUIT_BREAKER_ADDRESS", "")
CIRCUIT_BREAKER_ABI = config._load_abi("CircuitBreaker")


class CircuitBreakerAgent(BaseAgent):
    """
    Monitors vault PnL and system health.
    Triggers on-chain circuit breaker when critical thresholds are breached.
    Posts alerts to SignalBoard for other agents to observe.
    """

    def __init__(self):
        super().__init__(
            agent_type="circuit_breaker",
            wallet_private_key=config.__dict__.get("CIRCUIT_BREAKER_PRIVATE_KEY", config.GUARD_PRIVATE_KEY)
        )
        self.signal_bus = SignalBus(chain=self.chain)
        self._initial_tvl: float = 0.0
        self._high_water_mark: float = 0.0
        self._breaker_triggered = False
        self._alert_cooldown = 0.0

    async def run_cycle(self) -> None:
        """Main monitoring cycle. Checks health and triggers breaker if needed."""
        self.logger.info("=== Circuit Breaker cycle started ===")

        try:
            current_tvl = self.chain.get_vault_tvl()
            if current_tvl <= 0:
                self.logger.warning("Vault TVL is zero or unavailable")
                return

            # Initialize reference points
            if self._initial_tvl == 0:
                self._initial_tvl = current_tvl
                self._high_water_mark = current_tvl
                self.logger.info(f"Reference TVL set: ${current_tvl:,.2f}")
                return

            # Update high water mark
            if current_tvl > self._high_water_mark:
                self._high_water_mark = current_tvl

            # Calculate drawdown from high water mark
            drawdown_bps = int((current_tvl - self._high_water_mark) / self._high_water_mark * 10000)

            self.logger.info(
                f"Health check | TVL=${current_tvl:,.2f} | HWM=${self._high_water_mark:,.2f} | "
                f"drawdown={drawdown_bps}bps"
            )

            # Check thresholds
            if drawdown_bps <= PNL_CRITICAL_THRESHOLD_BPS:
                await self._trigger_circuit_breaker(current_tvl, drawdown_bps)
            elif drawdown_bps <= PNL_DRAWDOWN_THRESHOLD_BPS:
                await self._post_warning(current_tvl, drawdown_bps)

            # Additional health checks
            await self._check_vault_paused()
            await self._check_gas_health()

        except Exception as e:
            self.logger.error(f"Circuit breaker cycle failed: {e}")

    async def _trigger_circuit_breaker(self, current_tvl: float, drawdown_bps: int):
        """Trigger the on-chain circuit breaker to pause all operations."""
        if self._breaker_triggered:
            self.logger.info("Circuit breaker already triggered, skipping")
            return

        self.logger.critical(
            f"CRITICAL DRAWDOWN: {drawdown_bps}bps | TVL=${current_tvl:,.2f} | Triggering circuit breaker"
        )

        if CIRCUIT_BREAKER_ADDRESS and CIRCUIT_BREAKER_ABI:
            try:
                tx_hash = await self.chain.call_contract(
                    contract_address=CIRCUIT_BREAKER_ADDRESS,
                    abi=CIRCUIT_BREAKER_ABI,
                    function_name="triggerBreaker",
                    args=[abs(drawdown_bps)]
                )
                self.logger.info(f"Circuit breaker triggered on-chain | tx={tx_hash.hex()}")
                self._breaker_triggered = True
            except Exception as e:
                self.logger.error(f"Failed to trigger circuit breaker contract: {e}")

        # Alert via SignalBoard
        await self._post_alert(
            alert_type="CIRCUIT_BREAKER_TRIGGERED",
            message=f"Critical drawdown {drawdown_bps}bps. Vault paused. TVL=${current_tvl:,.2f}",
            severity="critical"
        )
        self.update_reputation(delta=-10, reason="circuit_breaker_triggered")

    async def _post_warning(self, current_tvl: float, drawdown_bps: int):
        """Post a warning signal when drawdown exceeds warning threshold."""
        import time
        now = time.time()
        if now - self._alert_cooldown < 300:  # 5 min cooldown between warnings
            return
        self._alert_cooldown = now

        await self._post_alert(
            alert_type="DRAWDOWN_WARNING",
            message=f"Drawdown warning: {drawdown_bps}bps. TVL=${current_tvl:,.2f}",
            severity="warning"
        )

    async def _post_alert(self, alert_type: str, message: str, severity: str):
        """Post an alert signal to SignalBoard."""
        try:
            await self.signal_bus.post_signal(
                signal_type="hold",
                target_protocol="system",
                token_in_symbol="USDC",
                token_out_symbol="USDC",
                amount_percentage=0,
                confidence=99,
                reasoning=f"[{severity.upper()}] {alert_type}: {message}"
            )
            self.logger.info(f"Alert posted to SignalBoard | type={alert_type}")
        except Exception as e:
            self.logger.error(f"Failed to post alert: {e}")

    async def _check_vault_paused(self):
        """Verify vault pause state matches expectations."""
        is_paused = self.chain.is_vault_paused()
        if is_paused and not self._breaker_triggered:
            self.logger.warning("Vault is paused externally (not by this agent)")

    async def _check_gas_health(self):
        """Check if agent has enough gas to operate."""
        balance = self.chain.get_balance()
        if balance < 0.01:  # Less than 0.01 MNT
            self.logger.warning(f"Low gas balance: {balance:.6f} MNT")

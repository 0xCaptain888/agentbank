"""
AgentBank Orchestrator
Entry point. Initializes all agents and runs them on schedule.

Schedule:
- Analyst (primary): every 60 minutes
- Analyst (Llama): every 60 minutes, staggered +60 min
- Analyst (Qwen): every 60 minutes, staggered +120 min
- Executor: every 15 minutes
- Guard: called by Executor (not scheduled independently)
- Allocator: every 24 hours
- Pyth Price Snapshot: every 5 minutes
- Circuit Breaker: every 15 minutes
"""

import asyncio
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from loguru import logger

from agents.analyst_agent import AnalystAgent
from agents.analyst_alt_llama import LlamaAnalystAgent
from agents.analyst_alt_qwen import QwenAnalystAgent
from agents.executor_agent import ExecutorAgent
from agents.guard_agent import GuardAgent
from agents.allocator_agent import AllocatorAgent
from agents.circuit_breaker_agent import CircuitBreakerAgent
from core.pyth_client import PythClient, PRICE_FEED_IDS
from core.chain import Chain
import config


async def snapshot_pyth_prices():
    """Fetch latest prices from Pyth and submit snapshots to the RiskOracle contract."""
    chain = Chain()
    pyth = PythClient(chain=chain)
    try:
        for token_pair in PRICE_FEED_IDS:
            entry = await pyth.fetch_price(token_pair)
            if entry is not None:
                is_anomaly = pyth.detect_anomaly(token_pair, entry.price)
                await pyth.feed_risk_oracle(token_pair, entry.price, is_anomaly)
                logger.debug(f"Pyth snapshot | {token_pair} = {entry.price:.4f}")
            else:
                logger.warning(f"Pyth snapshot skipped for {token_pair} — no price")
    finally:
        await pyth.close()


async def main():
    logger.info("=== AgentBank Starting ===")
    logger.info(f"Network: {config.NETWORK_NAME}")
    logger.info(f"Vault: {config.VAULT_CONTRACT_ADDRESS}")
    logger.info(f"Chain ID: {config.CHAIN_ID}")

    # Initialize agents
    analyst       = AnalystAgent()
    analyst_llama = LlamaAnalystAgent()
    analyst_qwen  = QwenAnalystAgent()
    guard         = GuardAgent()
    executor      = ExecutorAgent(guard_agent=guard)
    allocator     = AllocatorAgent()
    circuit_breaker = CircuitBreakerAgent()

    logger.info("All agents initialized")

    # Run first cycle immediately
    await analyst.run_cycle()
    await executor.run_cycle()

    # Set up scheduler
    scheduler = AsyncIOScheduler()

    scheduler.add_job(
        analyst.run_cycle,
        trigger=IntervalTrigger(minutes=config.ANALYST_INTERVAL_MINUTES),
        id="analyst",
        name="Analyst Agent"
    )

    scheduler.add_job(
        analyst_llama.run_cycle,
        trigger=IntervalTrigger(minutes=config.ANALYST_INTERVAL_MINUTES),
        id="analyst_llama",
        name="Analyst Agent (Llama)",
        next_run_time=None,  # stagger: starts after explicit delay
    )

    scheduler.add_job(
        analyst_qwen.run_cycle,
        trigger=IntervalTrigger(minutes=config.ANALYST_INTERVAL_MINUTES),
        id="analyst_qwen",
        name="Analyst Agent (Qwen)",
        next_run_time=None,  # stagger: starts after explicit delay
    )

    # Stagger alternate analysts by 60-minute offsets
    from datetime import datetime, timedelta
    now = datetime.now()
    scheduler.reschedule_job("analyst_llama", trigger=IntervalTrigger(minutes=config.ANALYST_INTERVAL_MINUTES), next_run_time=now + timedelta(minutes=60))
    scheduler.reschedule_job("analyst_qwen", trigger=IntervalTrigger(minutes=config.ANALYST_INTERVAL_MINUTES), next_run_time=now + timedelta(minutes=120))

    scheduler.add_job(
        executor.run_cycle,
        trigger=IntervalTrigger(minutes=config.EXECUTOR_INTERVAL_MINUTES),
        id="executor",
        name="Executor Agent"
    )

    scheduler.add_job(
        allocator.run_cycle,
        trigger=IntervalTrigger(hours=config.ALLOCATOR_INTERVAL_HOURS),
        id="allocator",
        name="Allocator Agent"
    )

    scheduler.add_job(
        snapshot_pyth_prices,
        trigger=IntervalTrigger(minutes=5),
        id="pyth_snapshot",
        name="Pyth Price Snapshot"
    )

    scheduler.add_job(
        circuit_breaker.run_cycle,
        trigger=IntervalTrigger(minutes=config.EXECUTOR_INTERVAL_MINUTES),
        id="circuit_breaker",
        name="Circuit Breaker Agent"
    )

    scheduler.start()
    logger.info("Scheduler started — all agents running")

    # Keep alive
    try:
        while True:
            await asyncio.sleep(60)
    except (KeyboardInterrupt, SystemExit):
        scheduler.shutdown()
        logger.info("AgentBank stopped")


if __name__ == "__main__":
    asyncio.run(main())

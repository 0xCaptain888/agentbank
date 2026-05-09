"""
AgentBank Orchestrator
Entry point. Initializes all four agents and runs them on schedule.

Schedule:
- Analyst: every 60 minutes
- Executor: every 15 minutes
- Guard: called by Executor (not scheduled independently)
- Allocator: every 24 hours
"""

import asyncio
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from loguru import logger

from agents.analyst_agent import AnalystAgent
from agents.executor_agent import ExecutorAgent
from agents.guard_agent import GuardAgent
from agents.allocator_agent import AllocatorAgent
import config


async def main():
    logger.info("=== AgentBank Starting ===")
    logger.info(f"Network: {config.NETWORK_NAME}")
    logger.info(f"Vault: {config.VAULT_CONTRACT_ADDRESS}")
    logger.info(f"Chain ID: {config.CHAIN_ID}")

    # Initialize agents
    analyst   = AnalystAgent()
    guard     = GuardAgent()
    executor  = ExecutorAgent(guard_agent=guard)
    allocator = AllocatorAgent()

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

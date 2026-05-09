"""
Executor Agent
- Runs every 15 minutes
- Reads pending signals from SignalBoard
- Submits proposed tx to Guard Agent for pre-flight check
- If approved, executes operation via AgentBankVault.executeOperation()
"""

import asyncio
from agents.base_agent import BaseAgent
from skills.swap_execution import SwapExecutionSkill
from core.signal_bus import SignalBus
from agents.guard_agent import GuardAgent
import config


class ExecutorAgent(BaseAgent):

    def __init__(self, guard_agent: GuardAgent):
        super().__init__(
            agent_type="executor",
            wallet_private_key=config.EXECUTOR_PRIVATE_KEY
        )
        self.swap_skill = SwapExecutionSkill(chain=self.chain)
        self.signal_bus = SignalBus(chain=self.chain)
        self.guard = guard_agent

    async def run_cycle(self) -> None:
        self.logger.info("=== Executor cycle started ===")

        try:
            # 1. Fetch pending signals from SignalBoard
            pending_signals = await self.signal_bus.get_pending_signals()

            if not pending_signals:
                self.logger.info("No pending signals — idle")
                return

            # Process only the latest signal per cycle
            signal = pending_signals[-1]
            self.logger.info(
                f"Processing signal | id={signal['id'].hex()} | "
                f"type={signal['signal_type']} | confidence={signal['confidence']}"
            )

            # 2. Build proposed transaction (dry run, not submitted yet)
            proposed_tx = await self.swap_skill.build_tx(
                signal=signal,
                vault_address=config.VAULT_CONTRACT_ADDRESS
            )

            # 3. Submit to Guard Agent for pre-flight check
            guard_result = await self.guard.check(
                proposed_tx=proposed_tx,
                signal=signal
            )

            if not guard_result["approved"]:
                # Guard blocked the operation
                self.logger.warning(
                    f"Operation BLOCKED by Guard | "
                    f"reason={guard_result['reason']} | "
                    f"risk_score={guard_result['risk_score']}"
                )
                # Log block on-chain
                await self.chain.call_contract(
                    contract_address=config.VAULT_CONTRACT_ADDRESS,
                    abi=config.VAULT_ABI,
                    function_name="logBlockedOperation",
                    args=[
                        self.chain.account.address,
                        guard_result["reason"],
                        guard_result["risk_score"],
                        signal["id"]
                    ]
                )
                await self.signal_bus.update_signal_status(signal["id"], "Blocked")
                self.update_reputation(delta=-2, reason="operation_blocked_by_guard")
                return

            # 4. Guard approved — execute operation
            self.logger.info("Guard approved — executing operation")

            tx_hash = await self.chain.call_contract(
                contract_address=config.VAULT_CONTRACT_ADDRESS,
                abi=config.VAULT_ABI,
                function_name="executeOperation",
                args=[
                    proposed_tx["target"],
                    proposed_tx["data"],
                    proposed_tx["amount"],
                    signal["signal_type"],
                    signal["id"]
                ]
            )

            self.logger.info(f"Operation executed | tx_hash={tx_hash.hex()}")

            # 5. Update signal status on SignalBoard
            await self.signal_bus.update_signal_status(
                signal_id=signal["id"],
                new_status="Executed",
                execution_tx_hash=tx_hash
            )

            self.update_reputation(delta=10, reason="operation_executed_successfully")

        except Exception as e:
            self.logger.error(f"Executor cycle failed: {e}")
            self.update_reputation(delta=-10, reason=f"execution_error: {str(e)[:50]}")

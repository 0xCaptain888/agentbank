import { BigInt, Bytes } from "@graphprotocol/graph-ts";
import {
  Deposit as DepositEvent,
  Withdraw as WithdrawEvent,
  OperationExecuted as OperationExecutedEvent
} from "../generated/AgentBankVaultV2/AgentBankVaultV2";
import { VaultDeposit, VaultWithdraw, Operation } from "../generated/schema";

export function handleDeposit(event: DepositEvent): void {
  let id = event.transaction.hash.toHexString() + "-" + event.logIndex.toString();
  let deposit = new VaultDeposit(id);

  deposit.user = event.params.sender;
  deposit.assets = event.params.assets;
  deposit.shares = event.params.shares;
  deposit.timestamp = event.block.timestamp;

  deposit.save();
}

export function handleWithdraw(event: WithdrawEvent): void {
  let id = event.transaction.hash.toHexString() + "-" + event.logIndex.toString();
  let withdraw = new VaultWithdraw(id);

  withdraw.user = event.params.sender;
  withdraw.assets = event.params.assets;
  withdraw.shares = event.params.shares;
  withdraw.timestamp = event.block.timestamp;

  withdraw.save();
}

export function handleOperationExecuted(event: OperationExecutedEvent): void {
  let id = event.transaction.hash.toHexString() + "-" + event.logIndex.toString();
  let operation = new Operation(id);

  operation.agent = event.params.executorAgent;
  operation.target = event.params.target;

  // Calculate PnL as value; positive means success
  let pnl = event.params.pnl;
  let assetsAfter = event.params.assetsAfter;
  operation.value = assetsAfter;
  operation.success = pnl.ge(BigInt.fromI32(0));
  operation.timestamp = event.block.timestamp;

  operation.save();
}

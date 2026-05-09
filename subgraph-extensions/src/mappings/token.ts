import { BigInt, Bytes, Address } from "@graphprotocol/graph-ts";
import {
  Transfer as TransferEvent,
  Approval as ApprovalEvent,
} from "../../generated/ABNKToken/ABNKToken";
import {
  LockCreated as LockCreatedEvent,
  AmountIncreased as AmountIncreasedEvent,
  LockTimeIncreased as LockTimeIncreasedEvent,
  Withdrawn as WithdrawnEvent,
} from "../../generated/VotingEscrow/VotingEscrow";
import {
  ABNKToken,
  TokenHolder,
  TokenTransfer,
  TokenApproval,
  VotingEscrow,
  VoteLock,
} from "../../generated/schema";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const TOKEN_ID = Bytes.fromHexString("0x01") as Bytes;
const ESCROW_ID = Bytes.fromHexString("0x02") as Bytes;

function getOrCreateToken(): ABNKToken {
  let token = ABNKToken.load(TOKEN_ID);
  if (token == null) {
    token = new ABNKToken(TOKEN_ID);
    token.totalSupply = BigInt.zero();
    token.maxSupply = BigInt.fromString("100000000000000000000000000"); // 100M * 1e18
    token.holderCount = 0;
    token.transferCount = BigInt.zero();
    token.lastUpdatedBlock = BigInt.zero();
  }
  return token;
}

function getOrCreateHolder(address: Bytes): TokenHolder {
  let holder = TokenHolder.load(address);
  if (holder == null) {
    holder = new TokenHolder(address);
    holder.balance = BigInt.zero();
    holder.transfersIn = BigInt.zero();
    holder.transfersOut = BigInt.zero();
    holder.firstTransferAt = BigInt.zero();
    holder.lastTransferAt = BigInt.zero();
  }
  return holder;
}

function getOrCreateEscrow(): VotingEscrow {
  let escrow = VotingEscrow.load(ESCROW_ID);
  if (escrow == null) {
    escrow = new VotingEscrow(ESCROW_ID);
    escrow.totalLocked = BigInt.zero();
    escrow.lockCount = 0;
    escrow.lastUpdatedBlock = BigInt.zero();
  }
  return escrow;
}

export function handleTransfer(event: TransferEvent): void {
  let token = getOrCreateToken();
  token.transferCount = token.transferCount.plus(BigInt.fromI32(1));
  token.lastUpdatedBlock = event.block.number;

  // Handle mint (from zero address)
  if (event.params.from.toHexString() == ZERO_ADDRESS) {
    token.totalSupply = token.totalSupply.plus(event.params.value);
  }

  // Handle burn (to zero address)
  if (event.params.to.toHexString() == ZERO_ADDRESS) {
    token.totalSupply = token.totalSupply.minus(event.params.value);
  }

  // Update sender
  if (event.params.from.toHexString() != ZERO_ADDRESS) {
    let sender = getOrCreateHolder(event.params.from);
    sender.balance = sender.balance.minus(event.params.value);
    sender.transfersOut = sender.transfersOut.plus(BigInt.fromI32(1));
    sender.lastTransferAt = event.block.timestamp;
    sender.save();

    if (sender.balance.equals(BigInt.zero())) {
      token.holderCount = token.holderCount - 1;
    }
  }

  // Update receiver
  if (event.params.to.toHexString() != ZERO_ADDRESS) {
    let receiver = getOrCreateHolder(event.params.to);
    let wasZero = receiver.balance.equals(BigInt.zero());
    receiver.balance = receiver.balance.plus(event.params.value);
    receiver.transfersIn = receiver.transfersIn.plus(BigInt.fromI32(1));
    receiver.lastTransferAt = event.block.timestamp;
    if (receiver.firstTransferAt.equals(BigInt.zero())) {
      receiver.firstTransferAt = event.block.timestamp;
    }
    receiver.save();

    if (wasZero && receiver.balance.gt(BigInt.zero())) {
      token.holderCount = token.holderCount + 1;
    }
  }

  token.save();

  // Create immutable transfer record
  let transferId = event.transaction.hash.concatI32(event.logIndex.toI32());
  let transfer = new TokenTransfer(transferId);
  transfer.from = event.params.from;
  transfer.to = event.params.to;
  transfer.amount = event.params.value;
  transfer.blockNumber = event.block.number;
  transfer.timestamp = event.block.timestamp;
  transfer.txHash = event.transaction.hash;
  transfer.save();
}

export function handleApproval(event: ApprovalEvent): void {
  let approvalId = event.params.owner.concat(event.params.spender);
  let approval = new TokenApproval(approvalId);
  approval.owner = event.params.owner;
  approval.spender = event.params.spender;
  approval.amount = event.params.value;
  approval.timestamp = event.block.timestamp;
  approval.save();
}

export function handleLockCreated(event: LockCreatedEvent): void {
  let escrow = getOrCreateEscrow();
  escrow.totalLocked = escrow.totalLocked.plus(
    BigInt.fromUnsignedBytes(Bytes.fromBigInt(BigInt.fromI32(event.params.amount)))
  );
  escrow.lockCount = escrow.lockCount + 1;
  escrow.lastUpdatedBlock = event.block.number;
  escrow.save();

  let lock = new VoteLock(event.params.user);
  lock.user = event.params.user;
  lock.amount = BigInt.fromI32(event.params.amount);
  lock.end = BigInt.fromI32(event.params.end);
  lock.votingPower = lock.amount
    .toBigDecimal()
    .times(lock.end.minus(event.block.timestamp).toBigDecimal())
    .div(BigInt.fromI32(4 * 365 * 86400).toBigDecimal());
  lock.createdAt = event.block.timestamp;
  lock.lastModifiedAt = event.block.timestamp;
  lock.save();
}

export function handleAmountIncreased(event: AmountIncreasedEvent): void {
  let lock = VoteLock.load(event.params.user);
  if (lock == null) return;

  let additional = BigInt.fromI32(event.params.additionalAmount);
  lock.amount = lock.amount.plus(additional);
  lock.lastModifiedAt = event.block.timestamp;
  lock.votingPower = lock.amount
    .toBigDecimal()
    .times(lock.end.minus(event.block.timestamp).toBigDecimal())
    .div(BigInt.fromI32(4 * 365 * 86400).toBigDecimal());
  lock.save();

  let escrow = getOrCreateEscrow();
  escrow.totalLocked = escrow.totalLocked.plus(additional);
  escrow.lastUpdatedBlock = event.block.number;
  escrow.save();
}

export function handleLockTimeIncreased(event: LockTimeIncreasedEvent): void {
  let lock = VoteLock.load(event.params.user);
  if (lock == null) return;

  lock.end = BigInt.fromI32(event.params.newEnd);
  lock.lastModifiedAt = event.block.timestamp;
  lock.votingPower = lock.amount
    .toBigDecimal()
    .times(lock.end.minus(event.block.timestamp).toBigDecimal())
    .div(BigInt.fromI32(4 * 365 * 86400).toBigDecimal());
  lock.save();
}

export function handleWithdrawn(event: WithdrawnEvent): void {
  let lock = VoteLock.load(event.params.user);
  if (lock == null) return;

  let escrow = getOrCreateEscrow();
  escrow.totalLocked = escrow.totalLocked.minus(lock.amount);
  escrow.lockCount = escrow.lockCount - 1;
  escrow.lastUpdatedBlock = event.block.number;
  escrow.save();

  lock.amount = BigInt.zero();
  lock.votingPower = BigInt.zero().toBigDecimal();
  lock.lastModifiedAt = event.block.timestamp;
  lock.save();
}

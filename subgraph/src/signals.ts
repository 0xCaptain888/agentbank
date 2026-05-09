import { BigInt, Bytes } from "@graphprotocol/graph-ts";
import {
  SignalPosted as SignalPostedEvent,
  SignalStatusUpdated as SignalStatusUpdatedEvent
} from "../generated/SignalBoardV2/SignalBoardV2";
import { Signal } from "../generated/schema";

function statusToString(status: i32): string {
  if (status == 0) return "Pending";
  if (status == 1) return "Executed";
  if (status == 2) return "Blocked";
  if (status == 3) return "Expired";
  return "Unknown";
}

export function handleSignalPosted(event: SignalPostedEvent): void {
  let id = event.params.id.toHexString();
  let signal = new Signal(id);

  signal.from = event.params.from;
  signal.signalType = event.params.signalType;
  signal.targetProtocol = event.params.targetProtocol;
  signal.tokenIn = Bytes.empty();
  signal.tokenOut = Bytes.empty();
  signal.amountIn = BigInt.fromI32(0);
  signal.minAmountOut = BigInt.fromI32(0);
  signal.confidence = event.params.confidence;
  signal.reasoning = "";
  signal.status = "Pending";
  signal.createdAt = event.params.timestamp;
  signal.executedAt = null;

  signal.save();
}

export function handleSignalStatusUpdated(event: SignalStatusUpdatedEvent): void {
  let id = event.params.id.toHexString();
  let signal = Signal.load(id);
  if (signal == null) return;

  let newStatus = event.params.newStatus;
  signal.status = statusToString(newStatus);

  if (newStatus == 1) {
    // Executed
    signal.executedAt = event.params.timestamp;
  }

  signal.save();
}

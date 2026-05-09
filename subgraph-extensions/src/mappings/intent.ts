import { BigInt, Bytes } from "@graphprotocol/graph-ts";
import {
  IntentPosted as IntentPostedEvent,
  BidSubmitted as BidSubmittedEvent,
  IntentFilled as IntentFilledEvent,
  IntentCancelled as IntentCancelledEvent,
  IntentExpired as IntentExpiredEvent,
} from "../../generated/IntentRouter/IntentRouter";
import { Intent, Bid, ProtocolMetrics } from "../../generated/schema";

function getOrCreateMetrics(): ProtocolMetrics {
  let metrics = ProtocolMetrics.load("singleton");
  if (metrics == null) {
    metrics = new ProtocolMetrics("singleton");
    metrics.totalIntents = BigInt.zero();
    metrics.totalBids = BigInt.zero();
    metrics.totalAttestations = BigInt.zero();
    metrics.totalSignalNFTs = BigInt.zero();
    metrics.totalLockedABNK = BigInt.zero();
    metrics.lastUpdatedBlock = BigInt.zero();
  }
  return metrics;
}

export function handleIntentPosted(event: IntentPostedEvent): void {
  let intentId = event.params.intentId.toString();
  let intent = new Intent(intentId);

  intent.intentId = event.params.intentId;
  intent.user = event.params.user;
  intent.asset = event.params.asset;
  intent.amount = event.params.amount;
  intent.minApyBps = event.params.minApyBps;
  intent.maxDrawdownBps = event.params.maxDrawdownBps;
  intent.duration = event.params.duration;
  intent.deadline = event.params.deadline;
  intent.status = "Open";
  intent.winningBid = null;
  intent.createdAt = event.block.timestamp;
  intent.settledAt = null;
  intent.txHash = event.transaction.hash;
  intent.save();

  let metrics = getOrCreateMetrics();
  metrics.totalIntents = metrics.totalIntents.plus(BigInt.fromI32(1));
  metrics.lastUpdatedBlock = event.block.number;
  metrics.save();
}

export function handleBidSubmitted(event: BidSubmittedEvent): void {
  let bidId = event.params.bidId.toString();
  let bid = new Bid(bidId);

  bid.bidId = event.params.bidId;
  bid.intent = event.params.intentId.toString();
  bid.solver = event.params.solver;
  bid.tierVault = event.params.tierVault;
  bid.promisedApy = event.params.promisedApy;
  bid.bondPosted = event.params.bondPosted;
  bid.timestamp = event.block.timestamp;
  bid.txHash = event.transaction.hash;
  bid.save();

  let metrics = getOrCreateMetrics();
  metrics.totalBids = metrics.totalBids.plus(BigInt.fromI32(1));
  metrics.lastUpdatedBlock = event.block.number;
  metrics.save();
}

export function handleIntentFilled(event: IntentFilledEvent): void {
  let intentId = event.params.intentId.toString();
  let intent = Intent.load(intentId);
  if (intent == null) return;

  intent.status = "Filled";
  intent.winningBid = event.params.winningBidId.toString();
  intent.settledAt = event.block.timestamp;
  intent.save();
}

export function handleIntentCancelled(event: IntentCancelledEvent): void {
  let intentId = event.params.intentId.toString();
  let intent = Intent.load(intentId);
  if (intent == null) return;

  intent.status = "Cancelled";
  intent.settledAt = event.block.timestamp;
  intent.save();
}

export function handleIntentExpired(event: IntentExpiredEvent): void {
  let intentId = event.params.intentId.toString();
  let intent = Intent.load(intentId);
  if (intent == null) return;

  intent.status = "Expired";
  intent.settledAt = event.block.timestamp;
  intent.save();
}

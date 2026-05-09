import { BigInt, Bytes } from "@graphprotocol/graph-ts";
import { RunAttested as RunAttestedEvent } from "../../generated/TEEAttestationVerifier/TEEAttestationVerifier";
import { Attestation, ProtocolMetrics } from "../../generated/schema";

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

function teeKindToString(kind: i32): string {
  if (kind == 0) return "Phala";
  if (kind == 1) return "Marlin";
  return "Phala"; // default fallback
}

export function handleRunAttested(event: RunAttestedEvent): void {
  let runId = event.params.runId;
  let attestation = new Attestation(runId);

  attestation.kind = teeKindToString(event.params.kind);
  attestation.promptHash = Bytes.empty(); // populated from contract call if needed
  attestation.outputHash = Bytes.empty();
  attestation.codeHash = Bytes.empty();
  attestation.attesterPubKey = event.params.attester;
  attestation.timestamp = event.params.timestamp;
  attestation.verified = true;
  attestation.blockNumber = event.block.number;
  attestation.txHash = event.transaction.hash;

  // Attempt to read full run data from contract state via call
  // Note: In production, you would use a contract call handler or
  // decode the transaction input for the full data. For the event-based
  // approach, we rely on the indexed event params plus tx receipt data.
  attestation.save();

  let metrics = getOrCreateMetrics();
  metrics.totalAttestations = metrics.totalAttestations.plus(BigInt.fromI32(1));
  metrics.lastUpdatedBlock = event.block.number;
  metrics.save();
}

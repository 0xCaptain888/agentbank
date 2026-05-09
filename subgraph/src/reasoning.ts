import { BigInt, Bytes } from "@graphprotocol/graph-ts";
import {
  ReasoningRecorded as ReasoningRecordedEvent
} from "../generated/LLMReasoningRegistry/LLMReasoningRegistry";
import { ReasoningEntry } from "../generated/schema";

export function handleReasoningRecorded(event: ReasoningRecordedEvent): void {
  let id = event.params.id.toHexString();
  let entry = new ReasoningEntry(id);

  entry.agent = event.params.agent;
  entry.promptHash = event.params.promptHash;
  entry.responseHash = event.params.outputHash;
  entry.chainHash = event.params.parentHash;
  entry.timestamp = event.block.timestamp;

  entry.save();
}

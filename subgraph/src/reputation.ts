import { BigInt, Bytes } from "@graphprotocol/graph-ts";
import {
  FeedbackSubmitted as FeedbackSubmittedEvent
} from "../generated/ReputationRegistry/ReputationRegistry";
import { ReputationChange, Agent } from "../generated/schema";

export function handleFeedbackSubmitted(event: FeedbackSubmittedEvent): void {
  let id = event.transaction.hash.toHexString() + "-" + event.logIndex.toString();
  let change = new ReputationChange(id);

  let agentId = event.params.agentId.toString();

  change.agent = event.params.client;
  change.delta = event.params.score;
  change.reason = "";
  change.timestamp = event.block.timestamp;

  // Update the agent's reputation score
  let agent = Agent.load(agentId);
  if (agent != null) {
    agent.reputationScore = agent.reputationScore.plus(event.params.score);
    agent.totalActions = agent.totalActions.plus(BigInt.fromI32(1));
    if (event.params.score.gt(BigInt.fromI32(0))) {
      agent.successfulActions = agent.successfulActions.plus(BigInt.fromI32(1));
    }
    agent.save();

    change.agent = agent.wallet;
    change.newScore = agent.reputationScore;
  } else {
    change.newScore = event.params.score;
  }

  change.save();
}

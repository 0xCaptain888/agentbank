import { BigInt, Bytes } from "@graphprotocol/graph-ts";
import {
  AgentRegistered as AgentRegisteredEvent,
  AgentUpdated as AgentUpdatedEvent,
  AgentDeactivated as AgentDeactivatedEvent
} from "../generated/IdentityRegistry/IdentityRegistry";
import { Agent } from "../generated/schema";

export function handleAgentRegistered(event: AgentRegisteredEvent): void {
  let id = event.params.id.toString();
  let agent = new Agent(id);

  agent.wallet = event.params.agentAddress;
  agent.name = event.params.domain;
  agent.agentType = event.params.agentType;
  agent.reputationScore = BigInt.fromI32(0);
  agent.totalActions = BigInt.fromI32(0);
  agent.successfulActions = BigInt.fromI32(0);
  agent.active = true;
  agent.mintedAt = event.block.timestamp;

  agent.save();
}

export function handleAgentUpdated(event: AgentUpdatedEvent): void {
  let id = event.params.id.toString();
  let agent = Agent.load(id);
  if (agent == null) return;

  agent.name = event.params.domain;
  agent.save();
}

export function handleAgentDeactivated(event: AgentDeactivatedEvent): void {
  let id = event.params.id.toString();
  let agent = Agent.load(id);
  if (agent == null) return;

  agent.active = false;
  agent.save();
}

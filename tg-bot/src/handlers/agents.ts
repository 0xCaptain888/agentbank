import { Context } from "telegraf";
import { JsonRpcProvider, Contract } from "ethers";
import { config, IDENTITY_REGISTRY_ABI } from "../config";

/** Agent information from the IdentityRegistry */
interface AgentInfo {
  name: string;
  reputation: bigint;
  active: boolean;
  registeredAt: bigint;
}

function truncateAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function formatReputation(rep: bigint): string {
  // Reputation is stored as basis points (0-10000)
  const percentage = Number(rep) / 100;
  return `${percentage.toFixed(1)}%`;
}

/**
 * Handle /agents command.
 * Shows active agents and their reputation scores from the IdentityRegistry.
 */
export async function handleAgents(ctx: Context): Promise<void> {
  try {
    await ctx.reply("Fetching active agents...");

    const provider = new JsonRpcProvider(config.chain.rpcUrl);
    const registry = new Contract(
      config.contracts.identityRegistry,
      IDENTITY_REGISTRY_ABI,
      provider
    );

    const activeAddresses: string[] = await registry.getActiveAgents();

    if (!activeAddresses || activeAddresses.length === 0) {
      await ctx.reply("No active agents registered.");
      return;
    }

    // Fetch details for each agent
    const agentDetails = await Promise.all(
      activeAddresses.map(async (addr) => {
        try {
          const info: AgentInfo = await registry.getAgent(addr);
          return { address: addr, info };
        } catch {
          return null;
        }
      })
    );

    const validAgents = agentDetails.filter(
      (a): a is { address: string; info: AgentInfo } => a !== null
    );

    // Sort by reputation descending
    validAgents.sort((a, b) => Number(b.info.reputation - a.info.reputation));

    const header = [
      "Active Agents",
      "━━━━━━━━━━━━━━━━━━━━━",
      "",
    ];

    const agentLines = validAgents.map((agent, i) => {
      const status = agent.info.active ? "[ACTIVE]" : "[PAUSED]";
      const regDate = new Date(Number(agent.info.registeredAt) * 1000)
        .toISOString()
        .slice(0, 10);

      return [
        `${i + 1}. ${agent.info.name} ${status}`,
        `   Address: ${truncateAddress(agent.address)}`,
        `   Reputation: ${formatReputation(agent.info.reputation)}`,
        `   Registered: ${regDate}`,
        "",
      ].join("\n");
    });

    const footer = [
      "━━━━━━━━━━━━━━━━━━━━━",
      `Total active agents: ${validAgents.length}`,
    ];

    const message = [...header, ...agentLines, ...footer].join("\n");
    await ctx.reply(message);
  } catch (error) {
    console.error("[AgentsHandler] Error fetching agents:", error);
    await ctx.reply("Failed to fetch agent information. Please try again later.");
  }
}

import { Context } from "telegraf";
import { ethers, JsonRpcProvider, Contract } from "ethers";
import { config, SIGNAL_BOARD_ABI } from "../config";

/** Signal direction enum matching the contract */
enum SignalDirection {
  LONG = 0,
  SHORT = 1,
  NEUTRAL = 2,
}

/** Decoded signal from the SignalBoard contract */
interface Signal {
  agent: string;
  direction: SignalDirection;
  confidence: bigint;
  timestamp: bigint;
  rationale: string;
}

function directionLabel(direction: number): string {
  switch (direction) {
    case SignalDirection.LONG:
      return "LONG";
    case SignalDirection.SHORT:
      return "SHORT";
    case SignalDirection.NEUTRAL:
      return "NEUTRAL";
    default:
      return "UNKNOWN";
  }
}

function directionEmoji(direction: number): string {
  switch (direction) {
    case SignalDirection.LONG:
      return "+";
    case SignalDirection.SHORT:
      return "-";
    case SignalDirection.NEUTRAL:
      return "=";
    default:
      return "?";
  }
}

function formatTimestamp(ts: bigint): string {
  const date = new Date(Number(ts) * 1000);
  return date.toISOString().replace("T", " ").slice(0, 19) + " UTC";
}

function truncateAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

/**
 * Handle /signals command.
 * Shows recent signals from the SignalBoard contract.
 * Usage: /signals [count]
 */
export async function handleSignals(ctx: Context): Promise<void> {
  const text = (ctx.message && "text" in ctx.message) ? ctx.message.text : "";
  const parts = text.split(/\s+/);
  const countStr = parts[1];
  const count = countStr ? Math.min(parseInt(countStr, 10) || 5, 10) : 5;

  try {
    await ctx.reply("Fetching recent signals...");

    const provider = new JsonRpcProvider(config.chain.rpcUrl);
    const signalBoard = new Contract(
      config.contracts.signalBoard,
      SIGNAL_BOARD_ABI,
      provider
    );

    const rawSignals: Signal[] = await signalBoard.getRecentSignals(count);

    if (!rawSignals || rawSignals.length === 0) {
      await ctx.reply("No signals found. The SignalBoard is currently empty.");
      return;
    }

    const header = [
      "Recent Signals",
      "━━━━━━━━━━━━━━━━━━━━━",
      "",
    ];

    const signalLines = rawSignals.map((signal, i) => {
      const dir = directionLabel(Number(signal.direction));
      const marker = directionEmoji(Number(signal.direction));
      const confidence = Number(signal.confidence);
      const time = formatTimestamp(signal.timestamp);
      const agent = truncateAddress(signal.agent);

      return [
        `${i + 1}. [${marker}] ${dir} (${confidence}% confidence)`,
        `   Agent: ${agent}`,
        `   Time: ${time}`,
        `   Rationale: ${signal.rationale.slice(0, 100)}${signal.rationale.length > 100 ? "..." : ""}`,
        "",
      ].join("\n");
    });

    const footer = [
      "━━━━━━━━━━━━━━━━━━━━━",
      `Showing ${rawSignals.length} most recent signal(s)`,
      "Use /signals <count> to see more (max 10)",
    ];

    const message = [...header, ...signalLines, ...footer].join("\n");
    await ctx.reply(message);
  } catch (error) {
    console.error("[SignalsHandler] Error fetching signals:", error);
    await ctx.reply("Failed to fetch signals. Please try again later.");
  }
}

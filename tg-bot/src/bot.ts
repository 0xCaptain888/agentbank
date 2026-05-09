import { Telegraf, Context, Markup } from "telegraf";
import express from "express";
import { config } from "./config";
import { handleWallet } from "./handlers/wallet";
import { handleBalance, handleDeposit, handleWithdraw } from "./handlers/vault";
import { handleSignals } from "./handlers/signals";
import { handleAgents } from "./handlers/agents";
import { EventListener } from "./events/listener";
import { privyService } from "./services/privy";

// --- Bot initialization ---

const bot = new Telegraf(config.telegram.botToken);
const eventListener = new EventListener(bot);

// --- Middleware ---

/** Logging middleware - logs all incoming updates */
bot.use(async (ctx, next) => {
  const start = Date.now();
  const userId = ctx.from?.id || "unknown";
  const updateType = ctx.updateType;

  console.log(`[Bot] Incoming ${updateType} from user ${userId}`);

  try {
    await next();
  } finally {
    const duration = Date.now() - start;
    console.log(`[Bot] Processed ${updateType} from user ${userId} in ${duration}ms`);
  }
});

/** Error handling middleware */
bot.catch((err: unknown, ctx: Context) => {
  const errorMessage = err instanceof Error ? err.message : String(err);
  console.error(`[Bot] Error for update ${ctx.updateType}:`, errorMessage);
  ctx.reply("An unexpected error occurred. Please try again later.").catch(() => {});
});

// --- Commands ---

bot.command("start", async (ctx) => {
  const username = ctx.from?.first_name || "there";

  const welcomeMessage = [
    `Welcome to AgentBank, ${username}!`,
    "",
    "AgentBank is a decentralized vault managed by AI agents on Mantle.",
    "Use the commands below to interact with the protocol:",
    "",
    "Wallet:",
    "  /wallet - View your wallet address & balance",
    "",
    "Vault:",
    "  /deposit <amount> - Deposit MNT into the vault",
    "  /withdraw <amount> - Withdraw MNT from the vault",
    "  /balance - Check your vault shares",
    "",
    "Intelligence:",
    "  /signals - View recent trading signals",
    "  /agents - View active agents & reputation",
    "",
    "System:",
    "  /status - Bot & protocol status",
    "  /subscribe - Subscribe to event notifications",
    "",
    "Get started by creating your wallet with /wallet",
  ].join("\n");

  // M30: Reply with Mini App launch button
  await ctx.reply(welcomeMessage, {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "Open AgentBank App",
            web_app: { url: "https://miniapp.agentbank.xyz" },
          },
        ],
      ],
    },
  });
});

bot.command("wallet", handleWallet);
bot.command("balance", handleBalance);
bot.command("deposit", handleDeposit);
bot.command("withdraw", handleWithdraw);
bot.command("signals", handleSignals);
bot.command("agents", handleAgents);

bot.command("status", async (ctx) => {
  const uptime = process.uptime();
  const hours = Math.floor(uptime / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);

  const message = [
    "AgentBank Bot Status",
    "━━━━━━━━━━━━━━━━━━━━━",
    "",
    `Status: Online`,
    `Uptime: ${hours}h ${minutes}m`,
    `Network: ${config.chain.name} (Chain ID: ${config.chain.chainId})`,
    `RPC: ${config.chain.rpcUrl}`,
    "",
    "Contracts:",
    `  Vault: ${config.contracts.vault}`,
    `  SignalBoard: ${config.contracts.signalBoard}`,
    `  Registry: ${config.contracts.identityRegistry}`,
  ].join("\n");

  await ctx.reply(message);
});

bot.command("subscribe", async (ctx) => {
  const chatId = ctx.chat.id;
  const telegramId = ctx.from?.id;

  if (!telegramId) {
    await ctx.reply("Unable to identify your account.");
    return;
  }

  try {
    const wallet = await privyService.getOrCreateWallet(telegramId, ctx.from?.username);
    eventListener.subscribe(chatId, wallet.address);
    eventListener.subscribeGlobal(chatId);

    await ctx.reply(
      "Subscribed to notifications!\n\n" +
        "You will receive alerts for:\n" +
        "- Your vault deposits & withdrawals\n" +
        "- New signal submissions from agents"
    );
  } catch (error) {
    console.error(`[Bot] Subscribe error for user ${telegramId}:`, error);
    await ctx.reply("Failed to subscribe. Please try again.");
  }
});

// --- Express server for webhooks ---

const app = express();
app.use(express.json());

/** Health check endpoint */
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// --- Startup ---

async function start(): Promise<void> {
  console.log("[Bot] Starting AgentBank Telegram Bot...");

  // Start event listener
  eventListener.start();

  if (config.telegram.webhookDomain) {
    // Webhook mode for production
    const webhookPath = `/webhook/${config.telegram.botToken}`;
    const webhookUrl = `${config.telegram.webhookDomain}${webhookPath}`;

    app.use(bot.webhookCallback(webhookPath));
    await bot.telegram.setWebhook(webhookUrl);

    app.listen(config.telegram.webhookPort, () => {
      console.log(`[Bot] Webhook server listening on port ${config.telegram.webhookPort}`);
      console.log(`[Bot] Webhook URL: ${webhookUrl}`);
    });
  } else {
    // Long polling mode for development
    app.listen(config.telegram.webhookPort, () => {
      console.log(`[Bot] Health server listening on port ${config.telegram.webhookPort}`);
    });

    await bot.launch();
    console.log("[Bot] Running in long-polling mode.");
  }

  console.log("[Bot] AgentBank Telegram Bot is live!");
}

// --- Graceful shutdown ---

function shutdown(signal: string): void {
  console.log(`[Bot] Received ${signal}. Shutting down gracefully...`);

  eventListener.stop();
  bot.stop(signal);

  setTimeout(() => {
    console.log("[Bot] Shutdown complete.");
    process.exit(0);
  }, 3000);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

process.on("unhandledRejection", (reason) => {
  console.error("[Bot] Unhandled rejection:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("[Bot] Uncaught exception:", error);
  shutdown("uncaughtException");
});

// Start the bot
start().catch((error) => {
  console.error("[Bot] Fatal startup error:", error);
  process.exit(1);
});

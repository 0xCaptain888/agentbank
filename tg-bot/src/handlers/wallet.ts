import { Context } from "telegraf";
import { privyService } from "../services/privy";
import { vaultService } from "../services/vault";
import { config } from "../config";

/**
 * Handle /wallet command.
 * Shows the user's wallet address and native balance.
 * Creates a new wallet if the user doesn't have one yet.
 */
export async function handleWallet(ctx: Context): Promise<void> {
  const telegramId = ctx.from?.id;
  const username = ctx.from?.username;

  if (!telegramId) {
    await ctx.reply("Unable to identify your account. Please try again.");
    return;
  }

  try {
    await ctx.reply("Loading your wallet...");

    const wallet = await privyService.getOrCreateWallet(telegramId, username);
    const nativeBalance = await vaultService.getNativeBalance(telegramId);

    const explorerUrl = `https://explorer.mantle.xyz/address/${wallet.address}`;

    const message = [
      "Your AgentBank Wallet",
      "━━━━━━━━━━━━━━━━━━━━━",
      "",
      `Address: \`${wallet.address}\``,
      `Network: ${config.chain.name}`,
      `Balance: ${nativeBalance} MNT`,
      "",
      `[View on Explorer](${explorerUrl})`,
      "",
      "To deposit MNT into the vault, use /deposit <amount>",
      "To check your vault shares, use /balance",
    ].join("\n");

    await ctx.reply(message, { parse_mode: "Markdown" });
  } catch (error) {
    console.error(`[WalletHandler] Error for TG user ${telegramId}:`, error);
    await ctx.reply(
      "Failed to load wallet information. Please try again later."
    );
  }
}

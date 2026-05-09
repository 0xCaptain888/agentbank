import { Context } from "telegraf";
import { vaultService } from "../services/vault";
import { config } from "../config";

/**
 * Handle /balance command.
 * Shows the user's vault share balance and total vault assets.
 */
export async function handleBalance(ctx: Context): Promise<void> {
  const telegramId = ctx.from?.id;

  if (!telegramId) {
    await ctx.reply("Unable to identify your account.");
    return;
  }

  try {
    const [vaultBalance, nativeBalance] = await Promise.all([
      vaultService.getBalance(telegramId),
      vaultService.getNativeBalance(telegramId),
    ]);

    const message = [
      "Vault Balance",
      "━━━━━━━━━━━━━━━━━━━━━",
      "",
      `Wallet Balance: ${nativeBalance} MNT`,
      `Vault Shares: ${vaultBalance.userShares}`,
      `Total Vault Assets: ${vaultBalance.totalAssets} MNT`,
      "",
      "Use /deposit <amount> to add funds",
      "Use /withdraw <amount> to remove funds",
    ].join("\n");

    await ctx.reply(message);
  } catch (error) {
    console.error(`[VaultHandler] Balance error for TG user ${telegramId}:`, error);
    await ctx.reply("Failed to fetch balance. Please try again later.");
  }
}

/**
 * Handle /deposit command.
 * Deposits MNT from the user's wallet into the AgentBank vault.
 * Usage: /deposit <amount>
 */
export async function handleDeposit(ctx: Context): Promise<void> {
  const telegramId = ctx.from?.id;

  if (!telegramId) {
    await ctx.reply("Unable to identify your account.");
    return;
  }

  // Parse amount from message text
  const text = (ctx.message && "text" in ctx.message) ? ctx.message.text : "";
  const parts = text.split(/\s+/);
  const amountStr = parts[1];

  if (!amountStr || isNaN(parseFloat(amountStr)) || parseFloat(amountStr) <= 0) {
    await ctx.reply("Usage: /deposit <amount>\nExample: /deposit 1.5");
    return;
  }

  try {
    await ctx.reply(`Depositing ${amountStr} MNT into the vault...`);

    const txHash = await vaultService.deposit(telegramId, amountStr);

    const explorerUrl = `https://explorer.mantle.xyz/tx/${txHash}`;
    await ctx.reply(
      `Deposit submitted!\n\nTx: \`${txHash}\`\n[View on Explorer](${explorerUrl})\n\nWaiting for confirmation...`,
      { parse_mode: "Markdown" }
    );

    const confirmed = await vaultService.waitForTransaction(txHash);
    if (confirmed) {
      await ctx.reply(`Deposit of ${amountStr} MNT confirmed! Use /balance to check your shares.`);
    } else {
      await ctx.reply("Transaction may have failed. Please check the explorer and try again.");
    }
  } catch (error) {
    console.error(`[VaultHandler] Deposit error for TG user ${telegramId}:`, error);
    await ctx.reply("Deposit failed. Please ensure you have sufficient MNT balance and try again.");
  }
}

/**
 * Handle /withdraw command.
 * Withdraws from the vault back to the user's wallet.
 * Usage: /withdraw <amount>
 */
export async function handleWithdraw(ctx: Context): Promise<void> {
  const telegramId = ctx.from?.id;

  if (!telegramId) {
    await ctx.reply("Unable to identify your account.");
    return;
  }

  const text = (ctx.message && "text" in ctx.message) ? ctx.message.text : "";
  const parts = text.split(/\s+/);
  const amountStr = parts[1];

  if (!amountStr || isNaN(parseFloat(amountStr)) || parseFloat(amountStr) <= 0) {
    await ctx.reply("Usage: /withdraw <amount>\nExample: /withdraw 1.0");
    return;
  }

  try {
    await ctx.reply(`Withdrawing ${amountStr} MNT from the vault...`);

    const txHash = await vaultService.withdraw(telegramId, amountStr);

    const explorerUrl = `https://explorer.mantle.xyz/tx/${txHash}`;
    await ctx.reply(
      `Withdrawal submitted!\n\nTx: \`${txHash}\`\n[View on Explorer](${explorerUrl})\n\nWaiting for confirmation...`,
      { parse_mode: "Markdown" }
    );

    const confirmed = await vaultService.waitForTransaction(txHash);
    if (confirmed) {
      await ctx.reply(`Withdrawal of ${amountStr} MNT confirmed! Use /balance to check your updated shares.`);
    } else {
      await ctx.reply("Transaction may have failed. Please check the explorer and try again.");
    }
  } catch (error) {
    console.error(`[VaultHandler] Withdraw error for TG user ${telegramId}:`, error);
    await ctx.reply("Withdrawal failed. Please ensure you have sufficient vault shares and try again.");
  }
}

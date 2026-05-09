import { JsonRpcProvider, Contract } from "ethers";
import { Telegraf } from "telegraf";
import { config, VAULT_ABI, SIGNAL_BOARD_ABI } from "../config";

/** Subscription entry mapping wallet addresses to Telegram chat IDs */
interface Subscription {
  telegramChatId: number;
  walletAddress: string;
}

/**
 * EventListener monitors on-chain events and broadcasts notifications
 * to subscribed Telegram users.
 */
export class EventListener {
  private provider: JsonRpcProvider;
  private bot: Telegraf;
  private subscriptions: Map<string, Set<number>> = new Map(); // address -> chatIds
  private globalSubscribers: Set<number> = new Set(); // chatIds for all events
  private isRunning = false;

  constructor(bot: Telegraf) {
    this.provider = new JsonRpcProvider(config.chain.rpcUrl);
    this.bot = bot;
  }

  /**
   * Subscribe a user to events related to their wallet address.
   */
  subscribe(chatId: number, walletAddress: string): void {
    const normalized = walletAddress.toLowerCase();
    if (!this.subscriptions.has(normalized)) {
      this.subscriptions.set(normalized, new Set());
    }
    this.subscriptions.get(normalized)!.add(chatId);
    console.log(`[EventListener] Subscribed chat ${chatId} for address ${normalized}`);
  }

  /**
   * Subscribe a user to all broadcast events (signals, major deposits).
   */
  subscribeGlobal(chatId: number): void {
    this.globalSubscribers.add(chatId);
    console.log(`[EventListener] Subscribed chat ${chatId} to global events`);
  }

  /**
   * Unsubscribe a user from all events.
   */
  unsubscribe(chatId: number): void {
    this.globalSubscribers.delete(chatId);
    for (const subscribers of this.subscriptions.values()) {
      subscribers.delete(chatId);
    }
    console.log(`[EventListener] Unsubscribed chat ${chatId} from all events`);
  }

  /**
   * Start listening to on-chain events.
   */
  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;

    console.log("[EventListener] Starting on-chain event listeners...");

    this.listenToVaultEvents();
    this.listenToSignalEvents();
  }

  /**
   * Stop all event listeners.
   */
  stop(): void {
    this.isRunning = false;
    this.provider.removeAllListeners();
    console.log("[EventListener] Stopped all event listeners.");
  }

  /**
   * Listen to Vault deposit and withdrawal events.
   */
  private listenToVaultEvents(): void {
    const vault = new Contract(config.contracts.vault, VAULT_ABI, this.provider);

    vault.on("Deposit", (sender: string, amount: bigint) => {
      this.handleVaultDeposit(sender, amount).catch((err) =>
        console.error("[EventListener] Error handling Deposit event:", err)
      );
    });

    vault.on("Withdraw", (receiver: string, amount: bigint) => {
      this.handleVaultWithdraw(receiver, amount).catch((err) =>
        console.error("[EventListener] Error handling Withdraw event:", err)
      );
    });

    console.log("[EventListener] Vault event listeners active.");
  }

  /**
   * Listen to SignalBoard signal submission events.
   */
  private listenToSignalEvents(): void {
    const signalBoard = new Contract(
      config.contracts.signalBoard,
      SIGNAL_BOARD_ABI,
      this.provider
    );

    signalBoard.on(
      "SignalSubmitted",
      (agent: string, direction: number, confidence: bigint, rationale: string) => {
        this.handleSignalSubmitted(agent, direction, confidence, rationale).catch(
          (err) =>
            console.error("[EventListener] Error handling SignalSubmitted event:", err)
        );
      }
    );

    console.log("[EventListener] SignalBoard event listeners active.");
  }

  /**
   * Notify relevant users about a vault deposit.
   */
  private async handleVaultDeposit(sender: string, amount: bigint): Promise<void> {
    const amountFormatted = (Number(amount) / 1e18).toFixed(4);
    const message = [
      "Vault Deposit Detected",
      "",
      `Address: ${sender.slice(0, 6)}...${sender.slice(-4)}`,
      `Amount: ${amountFormatted} MNT`,
    ].join("\n");

    await this.notifyAddress(sender, message);
  }

  /**
   * Notify relevant users about a vault withdrawal.
   */
  private async handleVaultWithdraw(receiver: string, amount: bigint): Promise<void> {
    const amountFormatted = (Number(amount) / 1e18).toFixed(4);
    const message = [
      "Vault Withdrawal Detected",
      "",
      `Address: ${receiver.slice(0, 6)}...${receiver.slice(-4)}`,
      `Amount: ${amountFormatted} MNT`,
    ].join("\n");

    await this.notifyAddress(receiver, message);
  }

  /**
   * Broadcast signal submissions to all global subscribers.
   */
  private async handleSignalSubmitted(
    agent: string,
    direction: number,
    confidence: bigint,
    rationale: string
  ): Promise<void> {
    const dirLabel = direction === 0 ? "LONG" : direction === 1 ? "SHORT" : "NEUTRAL";
    const message = [
      "New Signal Submitted",
      "",
      `Agent: ${agent.slice(0, 6)}...${agent.slice(-4)}`,
      `Direction: ${dirLabel}`,
      `Confidence: ${Number(confidence)}%`,
      `Rationale: ${rationale.slice(0, 120)}${rationale.length > 120 ? "..." : ""}`,
    ].join("\n");

    await this.broadcastGlobal(message);
  }

  /**
   * Send notification to subscribers of a specific address.
   */
  private async notifyAddress(address: string, message: string): Promise<void> {
    const normalized = address.toLowerCase();
    const chatIds = this.subscriptions.get(normalized);

    if (!chatIds || chatIds.size === 0) return;

    for (const chatId of chatIds) {
      try {
        await this.bot.telegram.sendMessage(chatId, message);
      } catch (error) {
        console.error(
          `[EventListener] Failed to send message to chat ${chatId}:`,
          error
        );
      }
    }
  }

  /**
   * Broadcast a message to all global subscribers.
   */
  private async broadcastGlobal(message: string): Promise<void> {
    for (const chatId of this.globalSubscribers) {
      try {
        await this.bot.telegram.sendMessage(chatId, message);
      } catch (error) {
        console.error(
          `[EventListener] Failed to broadcast to chat ${chatId}:`,
          error
        );
      }
    }
  }
}

import { PrivyClient } from "@privy-io/server-auth";
import { config } from "../config";

/** Wallet information for a Telegram user */
export interface UserWallet {
  address: string;
  userId: string;
  telegramId: number;
}

/**
 * PrivyWalletService manages non-custodial embedded wallets for Telegram users.
 * Each Telegram user gets a unique Privy-managed wallet mapped to their user ID.
 */
export class PrivyWalletService {
  private client: PrivyClient;
  private walletCache: Map<number, UserWallet> = new Map();

  constructor() {
    this.client = new PrivyClient(config.privy.appId, config.privy.appSecret);
  }

  /**
   * Get or create a wallet for the given Telegram user.
   * If the user already has a wallet, returns the cached/stored version.
   */
  async getOrCreateWallet(telegramId: number, username?: string): Promise<UserWallet> {
    // Check local cache first
    const cached = this.walletCache.get(telegramId);
    if (cached) {
      return cached;
    }

    try {
      // Attempt to find existing user by Telegram linked account
      const user = await this.findUserByTelegram(telegramId);

      if (user) {
        const wallet: UserWallet = {
          address: user.address,
          userId: user.userId,
          telegramId,
        };
        this.walletCache.set(telegramId, wallet);
        return wallet;
      }

      // Create new user with embedded wallet
      const newWallet = await this.createWalletForUser(telegramId, username);
      this.walletCache.set(telegramId, newWallet);
      return newWallet;
    } catch (error) {
      console.error(`[PrivyService] Failed to get/create wallet for TG user ${telegramId}:`, error);
      throw new Error("Failed to provision wallet. Please try again later.");
    }
  }

  /**
   * Find an existing Privy user linked to a Telegram ID.
   */
  private async findUserByTelegram(
    telegramId: number
  ): Promise<{ address: string; userId: string } | null> {
    try {
      // Use custom ID format for Telegram user mapping
      const customId = `telegram:${telegramId}`;
      const user = await this.client.getUserByCustomId(customId);

      if (!user || !user.wallet) {
        return null;
      }

      return {
        address: user.wallet.address,
        userId: user.id,
      };
    } catch {
      // User not found
      return null;
    }
  }

  /**
   * Create a new Privy user with an embedded wallet, linked to a Telegram ID.
   */
  private async createWalletForUser(
    telegramId: number,
    username?: string
  ): Promise<UserWallet> {
    const customId = `telegram:${telegramId}`;

    const user = await this.client.importUser({
      linkedAccounts: [],
      customMetadata: {
        telegramId: String(telegramId),
        telegramUsername: username || "",
        createdAt: new Date().toISOString(),
      },
      createEthereumWallet: true,
      customId,
    });

    if (!user.wallet) {
      throw new Error("Privy did not create an embedded wallet for the user.");
    }

    console.log(
      `[PrivyService] Created wallet ${user.wallet.address} for TG user ${telegramId}`
    );

    return {
      address: user.wallet.address,
      userId: user.id,
      telegramId,
    };
  }

  /**
   * Sign and send a transaction on behalf of a Telegram user.
   * Uses Privy's server-side signing for the embedded wallet.
   */
  async signTransaction(
    telegramId: number,
    transaction: {
      to: string;
      value?: string;
      data?: string;
      gasLimit?: string;
    }
  ): Promise<string> {
    const wallet = await this.getOrCreateWallet(telegramId);

    try {
      const result = await this.client.walletApi.ethereum.sendTransaction({
        walletId: wallet.userId,
        caip2: `eip155:${config.chain.chainId}`,
        transaction: {
          to: transaction.to,
          value: transaction.value ? BigInt(transaction.value) : undefined,
          data: transaction.data,
          gasLimit: transaction.gasLimit ? BigInt(transaction.gasLimit) : undefined,
        },
      });

      console.log(
        `[PrivyService] Transaction sent for TG user ${telegramId}: ${result.hash}`
      );

      return result.hash;
    } catch (error) {
      console.error(
        `[PrivyService] Transaction failed for TG user ${telegramId}:`,
        error
      );
      throw new Error("Transaction failed. Please try again.");
    }
  }

  /**
   * Get wallet address for a Telegram user without creating one.
   * Returns null if no wallet exists.
   */
  async getWalletAddress(telegramId: number): Promise<string | null> {
    const cached = this.walletCache.get(telegramId);
    if (cached) {
      return cached.address;
    }

    const user = await this.findUserByTelegram(telegramId);
    return user?.address || null;
  }

  /** Clear the wallet cache (useful for testing or forced refresh) */
  clearCache(): void {
    this.walletCache.clear();
  }
}

/** Singleton instance */
export const privyService = new PrivyWalletService();

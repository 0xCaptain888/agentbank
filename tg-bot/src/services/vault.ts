import { ethers, JsonRpcProvider, Contract, formatEther, parseEther } from "ethers";
import { config, VAULT_ABI } from "../config";
import { privyService } from "./privy";

/** Vault balance information */
export interface VaultBalance {
  userShares: string;
  totalAssets: string;
}

/**
 * VaultService interacts with the AgentBank Vault contract.
 * Handles deposits, withdrawals, and balance queries for user wallets.
 */
export class VaultService {
  private provider: JsonRpcProvider;
  private vault: Contract;

  constructor() {
    this.provider = new JsonRpcProvider(config.chain.rpcUrl);
    this.vault = new Contract(config.contracts.vault, VAULT_ABI, this.provider);
  }

  /**
   * Get vault balance for a Telegram user's wallet.
   */
  async getBalance(telegramId: number): Promise<VaultBalance> {
    const wallet = await privyService.getOrCreateWallet(telegramId);

    try {
      const [userShares, totalAssets] = await Promise.all([
        this.vault.balanceOf(wallet.address),
        this.vault.totalAssets(),
      ]);

      return {
        userShares: formatEther(userShares),
        totalAssets: formatEther(totalAssets),
      };
    } catch (error) {
      console.error(`[VaultService] Failed to get balance for ${wallet.address}:`, error);
      throw new Error("Failed to fetch vault balance.");
    }
  }

  /**
   * Get the native token (MNT) balance of the user's wallet.
   */
  async getNativeBalance(telegramId: number): Promise<string> {
    const wallet = await privyService.getOrCreateWallet(telegramId);

    try {
      const balance = await this.provider.getBalance(wallet.address);
      return formatEther(balance);
    } catch (error) {
      console.error(`[VaultService] Failed to get native balance for ${wallet.address}:`, error);
      throw new Error("Failed to fetch wallet balance.");
    }
  }

  /**
   * Deposit MNT into the vault on behalf of a Telegram user.
   * The deposit is sent from the user's Privy embedded wallet.
   */
  async deposit(telegramId: number, amountEther: string): Promise<string> {
    const amount = parseEther(amountEther);

    // Encode the deposit function call
    const iface = new ethers.Interface(VAULT_ABI);
    const data = iface.encodeFunctionData("deposit");

    try {
      const txHash = await privyService.signTransaction(telegramId, {
        to: config.contracts.vault,
        value: amount.toString(),
        data,
        gasLimit: "200000",
      });

      console.log(`[VaultService] Deposit of ${amountEther} MNT initiated: ${txHash}`);
      return txHash;
    } catch (error) {
      console.error(`[VaultService] Deposit failed for TG user ${telegramId}:`, error);
      throw new Error("Deposit transaction failed.");
    }
  }

  /**
   * Withdraw from the vault on behalf of a Telegram user.
   */
  async withdraw(telegramId: number, amountEther: string): Promise<string> {
    const amount = parseEther(amountEther);

    const iface = new ethers.Interface(VAULT_ABI);
    const data = iface.encodeFunctionData("withdraw", [amount]);

    try {
      const txHash = await privyService.signTransaction(telegramId, {
        to: config.contracts.vault,
        data,
        gasLimit: "200000",
      });

      console.log(`[VaultService] Withdrawal of ${amountEther} MNT initiated: ${txHash}`);
      return txHash;
    } catch (error) {
      console.error(`[VaultService] Withdrawal failed for TG user ${telegramId}:`, error);
      throw new Error("Withdrawal transaction failed.");
    }
  }

  /**
   * Get total assets managed by the vault.
   */
  async getTotalAssets(): Promise<string> {
    try {
      const total = await this.vault.totalAssets();
      return formatEther(total);
    } catch (error) {
      console.error("[VaultService] Failed to get total assets:", error);
      throw new Error("Failed to fetch vault total assets.");
    }
  }

  /**
   * Wait for a transaction to be confirmed.
   */
  async waitForTransaction(txHash: string, confirmations = 1): Promise<boolean> {
    try {
      const receipt = await this.provider.waitForTransaction(txHash, confirmations, 60000);
      return receipt !== null && receipt.status === 1;
    } catch (error) {
      console.error(`[VaultService] Transaction wait failed for ${txHash}:`, error);
      return false;
    }
  }
}

/** Singleton instance */
export const vaultService = new VaultService();

import { type Address, type PublicClient, type WalletClient } from "viem";
import { VaultClient, type VaultClientConfig } from "./vault";
import { AnalystClient, type AnalystClientConfig } from "./analyst";
import { IntentClient, type IntentClientConfig } from "./intent";
import { AttestationClient, type AttestationClientConfig } from "./attestation";

export { VaultClient } from "./vault";
export type { VaultClientConfig, DepositParams, WithdrawParams, RedeemParams } from "./vault";

export { AnalystClient } from "./analyst";
export type {
  AnalystClientConfig,
  SignalParams,
  ReputationData,
  AnalystInfo,
} from "./analyst";

export { IntentClient, IntentStatus } from "./intent";
export type {
  IntentClientConfig,
  IntentData,
  BidData,
  PostIntentParams,
  SubmitBidParams,
} from "./intent";

export { AttestationClient, TEEKind } from "./attestation";
export type {
  AttestationClientConfig,
  AttestedRun,
  VerifyRunParams,
} from "./attestation";

/**
 * Contract addresses for a specific chain deployment.
 */
export interface AgentBankAddresses {
  vault: Address;
  signalBoard: Address;
  intentRouter: Address;
  teeVerifier: Address;
}

/**
 * Configuration for the top-level AgentBankClient.
 */
export interface AgentBankClientConfig {
  publicClient: PublicClient;
  walletClient?: WalletClient;
  addresses: AgentBankAddresses;
  /** Decimals of the primary vault asset (default: 18) */
  assetDecimals?: number;
}

/**
 * AgentBankClient provides a unified entry point to all AgentBank V3 protocol modules.
 *
 * @example
 * ```ts
 * import { AgentBankClient } from "@agentbank/sdk";
 * import { createPublicClient, createWalletClient, http } from "viem";
 * import { mainnet } from "viem/chains";
 *
 * const publicClient = createPublicClient({ chain: mainnet, transport: http() });
 * const walletClient = createWalletClient({ chain: mainnet, transport: http(), account });
 *
 * const ab = new AgentBankClient({
 *   publicClient,
 *   walletClient,
 *   addresses: {
 *     vault: "0x...",
 *     signalBoard: "0x...",
 *     intentRouter: "0x...",
 *     teeVerifier: "0x...",
 *   },
 * });
 *
 * // Deposit into the vault
 * const txHash = await ab.vault.deposit({ amount: "1000" });
 *
 * // Post a signal
 * await ab.analyst.postSignal({ asset: "0x...", direction: 1, magnitude: 500, reasoning: "bullish divergence", ttl: 3600 });
 *
 * // Check attestation
 * const verified = await ab.attestation.isVerified(runId);
 * ```
 */
export class AgentBankClient {
  public readonly vault: VaultClient;
  public readonly analyst: AnalystClient;
  public readonly intent: IntentClient;
  public readonly attestation: AttestationClient;

  constructor(config: AgentBankClientConfig) {
    this.vault = new VaultClient({
      publicClient: config.publicClient,
      walletClient: config.walletClient,
      vaultAddress: config.addresses.vault,
      assetDecimals: config.assetDecimals,
    });

    this.analyst = new AnalystClient({
      publicClient: config.publicClient,
      walletClient: config.walletClient,
      signalBoardAddress: config.addresses.signalBoard,
    });

    this.intent = new IntentClient({
      publicClient: config.publicClient,
      walletClient: config.walletClient,
      intentRouterAddress: config.addresses.intentRouter,
    });

    this.attestation = new AttestationClient({
      publicClient: config.publicClient,
      walletClient: config.walletClient,
      verifierAddress: config.addresses.teeVerifier,
    });
  }
}

export default AgentBankClient;

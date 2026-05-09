import {
  type Address,
  type PublicClient,
  type WalletClient,
  type Hash,
  parseUnits,
  formatUnits,
} from "viem";

const INTENT_ROUTER_ABI = [
  {
    name: "postIntent",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "asset", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "minApyBps", type: "uint256" },
      { name: "maxDrawdownBps", type: "uint256" },
      { name: "duration", type: "uint256" },
    ],
    outputs: [{ name: "intentId", type: "uint256" }],
  },
  {
    name: "submitBid",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "intentId", type: "uint256" },
      { name: "tierVault", type: "address" },
      { name: "promisedApy", type: "uint256" },
      { name: "bondAmount", type: "uint256" },
    ],
    outputs: [{ name: "bidId", type: "uint256" }],
  },
  {
    name: "settleAuction",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "intentId", type: "uint256" }],
    outputs: [],
  },
  {
    name: "cancelIntent",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "intentId", type: "uint256" }],
    outputs: [],
  },
  {
    name: "intents",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [
      { name: "id", type: "uint256" },
      { name: "user", type: "address" },
      { name: "asset", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "minApyBps", type: "uint256" },
      { name: "maxDrawdownBps", type: "uint256" },
      { name: "duration", type: "uint256" },
      { name: "deadline", type: "uint256" },
      { name: "status", type: "uint8" },
      { name: "winningBid", type: "uint256" },
      { name: "createdAt", type: "uint256" },
    ],
  },
  {
    name: "bids",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [
      { name: "id", type: "uint256" },
      { name: "intentId", type: "uint256" },
      { name: "solver", type: "address" },
      { name: "tierVault", type: "address" },
      { name: "promisedApy", type: "uint256" },
      { name: "bondPosted", type: "uint256" },
      { name: "timestamp", type: "uint256" },
    ],
  },
  {
    name: "nextIntentId",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export enum IntentStatus {
  Open = 0,
  Filled = 1,
  Expired = 2,
  Cancelled = 3,
}

export interface IntentData {
  id: bigint;
  user: Address;
  asset: Address;
  amount: bigint;
  minApyBps: bigint;
  maxDrawdownBps: bigint;
  duration: bigint;
  deadline: bigint;
  status: IntentStatus;
  winningBid: bigint;
  createdAt: bigint;
}

export interface BidData {
  id: bigint;
  intentId: bigint;
  solver: Address;
  tierVault: Address;
  promisedApy: bigint;
  bondPosted: bigint;
  timestamp: bigint;
}

export interface PostIntentParams {
  asset: Address;
  /** Human-readable deposit amount */
  amount: string;
  /** Minimum acceptable APY in basis points */
  minApyBps: number;
  /** Maximum acceptable drawdown in basis points */
  maxDrawdownBps: number;
  /** Lock duration in seconds */
  duration: number;
  /** Asset decimals (default: 18) */
  decimals?: number;
}

export interface SubmitBidParams {
  intentId: bigint;
  /** Vault address the solver proposes to route to */
  tierVault: Address;
  /** Promised APY in basis points */
  promisedApy: number;
  /** Bond amount in human-readable form */
  bondAmount: string;
  /** Bond token decimals (default: 18) */
  decimals?: number;
}

export interface IntentClientConfig {
  publicClient: PublicClient;
  walletClient?: WalletClient;
  intentRouterAddress: Address;
}

export class IntentClient {
  private readonly publicClient: PublicClient;
  private readonly walletClient: WalletClient | undefined;
  private readonly intentRouterAddress: Address;

  constructor(config: IntentClientConfig) {
    this.publicClient = config.publicClient;
    this.walletClient = config.walletClient;
    this.intentRouterAddress = config.intentRouterAddress;
  }

  /**
   * Post a new deposit intent to the auction system.
   * @returns Transaction hash
   */
  async postIntent(params: PostIntentParams): Promise<Hash> {
    this.requireWallet();
    const decimals = params.decimals ?? 18;
    const amount = parseUnits(params.amount, decimals);

    const { request } = await this.publicClient.simulateContract({
      address: this.intentRouterAddress,
      abi: INTENT_ROUTER_ABI,
      functionName: "postIntent",
      args: [
        params.asset,
        amount,
        BigInt(params.minApyBps),
        BigInt(params.maxDrawdownBps),
        BigInt(params.duration),
      ],
      account: this.walletClient!.account!,
    });

    return this.walletClient!.writeContract(request);
  }

  /**
   * Submit a solver bid for an open intent.
   * @returns Transaction hash
   */
  async submitBid(params: SubmitBidParams): Promise<Hash> {
    this.requireWallet();
    const decimals = params.decimals ?? 18;
    const bondAmount = parseUnits(params.bondAmount, decimals);

    const { request } = await this.publicClient.simulateContract({
      address: this.intentRouterAddress,
      abi: INTENT_ROUTER_ABI,
      functionName: "submitBid",
      args: [
        params.intentId,
        params.tierVault,
        BigInt(params.promisedApy),
        bondAmount,
      ],
      account: this.walletClient!.account!,
    });

    return this.walletClient!.writeContract(request);
  }

  /**
   * Settle the auction for a given intent (selects winning bid).
   * Can be called by anyone after the auction deadline.
   * @returns Transaction hash
   */
  async settleAuction(intentId: bigint): Promise<Hash> {
    this.requireWallet();

    const { request } = await this.publicClient.simulateContract({
      address: this.intentRouterAddress,
      abi: INTENT_ROUTER_ABI,
      functionName: "settleAuction",
      args: [intentId],
      account: this.walletClient!.account!,
    });

    return this.walletClient!.writeContract(request);
  }

  /**
   * Cancel an open intent (only callable by intent creator before deadline).
   * @returns Transaction hash
   */
  async cancelIntent(intentId: bigint): Promise<Hash> {
    this.requireWallet();

    const { request } = await this.publicClient.simulateContract({
      address: this.intentRouterAddress,
      abi: INTENT_ROUTER_ABI,
      functionName: "cancelIntent",
      args: [intentId],
      account: this.walletClient!.account!,
    });

    return this.walletClient!.writeContract(request);
  }

  /**
   * Fetch all open intents by scanning from 0 to nextIntentId.
   * For production, use the subgraph instead.
   */
  async getOpenIntents(limit = 50): Promise<IntentData[]> {
    const nextId = await this.publicClient.readContract({
      address: this.intentRouterAddress,
      abi: INTENT_ROUTER_ABI,
      functionName: "nextIntentId",
    });

    const results: IntentData[] = [];
    const start = nextId > BigInt(limit) ? nextId - BigInt(limit) : 0n;

    for (let i = start; i < nextId; i++) {
      const raw = await this.publicClient.readContract({
        address: this.intentRouterAddress,
        abi: INTENT_ROUTER_ABI,
        functionName: "intents",
        args: [i],
      });

      const intent: IntentData = {
        id: raw[0],
        user: raw[1],
        asset: raw[2],
        amount: raw[3],
        minApyBps: raw[4],
        maxDrawdownBps: raw[5],
        duration: raw[6],
        deadline: raw[7],
        status: Number(raw[8]) as IntentStatus,
        winningBid: raw[9],
        createdAt: raw[10],
      };

      if (intent.status === IntentStatus.Open) {
        results.push(intent);
      }
    }

    return results;
  }

  /**
   * Get a specific intent by ID.
   */
  async getIntent(intentId: bigint): Promise<IntentData> {
    const raw = await this.publicClient.readContract({
      address: this.intentRouterAddress,
      abi: INTENT_ROUTER_ABI,
      functionName: "intents",
      args: [intentId],
    });

    return {
      id: raw[0],
      user: raw[1],
      asset: raw[2],
      amount: raw[3],
      minApyBps: raw[4],
      maxDrawdownBps: raw[5],
      duration: raw[6],
      deadline: raw[7],
      status: Number(raw[8]) as IntentStatus,
      winningBid: raw[9],
      createdAt: raw[10],
    };
  }

  /**
   * Get a specific bid by ID.
   */
  async getBid(bidId: bigint): Promise<BidData> {
    const raw = await this.publicClient.readContract({
      address: this.intentRouterAddress,
      abi: INTENT_ROUTER_ABI,
      functionName: "bids",
      args: [bidId],
    });

    return {
      id: raw[0],
      intentId: raw[1],
      solver: raw[2],
      tierVault: raw[3],
      promisedApy: raw[4],
      bondPosted: raw[5],
      timestamp: raw[6],
    };
  }

  private requireWallet(): asserts this is { walletClient: WalletClient } {
    if (!this.walletClient) {
      throw new Error("IntentClient: walletClient required for write operations");
    }
    if (!this.walletClient.account) {
      throw new Error("IntentClient: walletClient must have an account");
    }
  }
}

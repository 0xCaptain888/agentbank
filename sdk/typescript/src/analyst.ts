import {
  type Address,
  type PublicClient,
  type WalletClient,
  type Hash,
  type Hex,
  encodeFunctionData,
  keccak256,
  toHex,
} from "viem";

const SIGNAL_BOARD_ABI = [
  {
    name: "registerAnalyst",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "analyst", type: "address" },
      { name: "metadata", type: "bytes" },
    ],
    outputs: [],
  },
  {
    name: "deregisterAnalyst",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "analyst", type: "address" }],
    outputs: [],
  },
  {
    name: "postSignal",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "asset", type: "address" },
      { name: "direction", type: "int8" },
      { name: "magnitude", type: "uint16" },
      { name: "reasoningHash", type: "bytes32" },
      { name: "ttl", type: "uint256" },
    ],
    outputs: [{ name: "signalId", type: "uint256" }],
  },
  {
    name: "getReputation",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "analyst", type: "address" }],
    outputs: [
      { name: "score", type: "uint256" },
      { name: "totalSignals", type: "uint256" },
      { name: "profitableSignals", type: "uint256" },
      { name: "avgPnlBps", type: "int256" },
    ],
  },
  {
    name: "isRegistered",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "analyst", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "analysts",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "analyst", type: "address" }],
    outputs: [
      { name: "registered", type: "bool" },
      { name: "stakedAmount", type: "uint256" },
      { name: "reputation", type: "uint256" },
      { name: "registeredAt", type: "uint256" },
    ],
  },
] as const;

export interface AnalystClientConfig {
  publicClient: PublicClient;
  walletClient?: WalletClient;
  signalBoardAddress: Address;
}

export interface SignalParams {
  /** Target asset address */
  asset: Address;
  /** -1 = short, 0 = neutral, 1 = long */
  direction: -1 | 0 | 1;
  /** Signal magnitude in basis points (0-10000) */
  magnitude: number;
  /** Reasoning text or hash; if string is passed it will be hashed */
  reasoning: string | Hex;
  /** Time-to-live in seconds */
  ttl: number;
}

export interface ReputationData {
  score: bigint;
  totalSignals: bigint;
  profitableSignals: bigint;
  avgPnlBps: bigint;
}

export interface AnalystInfo {
  registered: boolean;
  stakedAmount: bigint;
  reputation: bigint;
  registeredAt: bigint;
}

export class AnalystClient {
  private readonly publicClient: PublicClient;
  private readonly walletClient: WalletClient | undefined;
  private readonly signalBoardAddress: Address;

  constructor(config: AnalystClientConfig) {
    this.publicClient = config.publicClient;
    this.walletClient = config.walletClient;
    this.signalBoardAddress = config.signalBoardAddress;
  }

  /**
   * Register the connected wallet as an analyst on the SignalBoard.
   * @param metadata Optional metadata bytes (e.g. IPFS CID of analyst profile)
   * @returns Transaction hash
   */
  async register(metadata: Hex = "0x"): Promise<Hash> {
    this.requireWallet();
    const account = this.walletClient!.account!.address;

    const { request } = await this.publicClient.simulateContract({
      address: this.signalBoardAddress,
      abi: SIGNAL_BOARD_ABI,
      functionName: "registerAnalyst",
      args: [account, metadata],
      account: this.walletClient!.account!,
    });

    return this.walletClient!.writeContract(request);
  }

  /**
   * Deregister the connected wallet as an analyst.
   * @returns Transaction hash
   */
  async deregister(): Promise<Hash> {
    this.requireWallet();
    const account = this.walletClient!.account!.address;

    const { request } = await this.publicClient.simulateContract({
      address: this.signalBoardAddress,
      abi: SIGNAL_BOARD_ABI,
      functionName: "deregisterAnalyst",
      args: [account],
      account: this.walletClient!.account!,
    });

    return this.walletClient!.writeContract(request);
  }

  /**
   * Post a trading signal to the SignalBoard.
   * @returns Transaction hash
   */
  async postSignal(params: SignalParams): Promise<Hash> {
    this.requireWallet();

    const reasoningHash: Hex =
      params.reasoning.startsWith("0x") && params.reasoning.length === 66
        ? (params.reasoning as Hex)
        : keccak256(toHex(params.reasoning));

    const { request } = await this.publicClient.simulateContract({
      address: this.signalBoardAddress,
      abi: SIGNAL_BOARD_ABI,
      functionName: "postSignal",
      args: [
        params.asset,
        params.direction,
        params.magnitude,
        reasoningHash,
        BigInt(params.ttl),
      ],
      account: this.walletClient!.account!,
    });

    return this.walletClient!.writeContract(request);
  }

  /**
   * Get the reputation data for a given analyst address.
   */
  async getReputation(analyst: Address): Promise<ReputationData> {
    const [score, totalSignals, profitableSignals, avgPnlBps] =
      await this.publicClient.readContract({
        address: this.signalBoardAddress,
        abi: SIGNAL_BOARD_ABI,
        functionName: "getReputation",
        args: [analyst],
      });

    return { score, totalSignals, profitableSignals, avgPnlBps };
  }

  /**
   * Check if an address is a registered analyst.
   */
  async isRegistered(analyst: Address): Promise<boolean> {
    return this.publicClient.readContract({
      address: this.signalBoardAddress,
      abi: SIGNAL_BOARD_ABI,
      functionName: "isRegistered",
      args: [analyst],
    });
  }

  /**
   * Get full analyst info struct.
   */
  async getAnalystInfo(analyst: Address): Promise<AnalystInfo> {
    const [registered, stakedAmount, reputation, registeredAt] =
      await this.publicClient.readContract({
        address: this.signalBoardAddress,
        abi: SIGNAL_BOARD_ABI,
        functionName: "analysts",
        args: [analyst],
      });

    return { registered, stakedAmount, reputation, registeredAt };
  }

  private requireWallet(): asserts this is { walletClient: WalletClient } {
    if (!this.walletClient) {
      throw new Error("AnalystClient: walletClient required for write operations");
    }
    if (!this.walletClient.account) {
      throw new Error("AnalystClient: walletClient must have an account");
    }
  }
}

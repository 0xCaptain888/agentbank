import {
  type Address,
  type PublicClient,
  type WalletClient,
  type Hash,
  parseUnits,
  formatUnits,
  getContract,
} from "viem";

/** ERC-4626 vault ABI subset used by VaultClient */
const VAULT_ABI = [
  {
    name: "deposit",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "assets", type: "uint256" },
      { name: "receiver", type: "address" },
    ],
    outputs: [{ name: "shares", type: "uint256" }],
  },
  {
    name: "withdraw",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "assets", type: "uint256" },
      { name: "receiver", type: "address" },
      { name: "owner", type: "address" },
    ],
    outputs: [{ name: "shares", type: "uint256" }],
  },
  {
    name: "redeem",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "shares", type: "uint256" },
      { name: "receiver", type: "address" },
      { name: "owner", type: "address" },
    ],
    outputs: [{ name: "assets", type: "uint256" }],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "totalAssets",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "totalSupply",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "convertToAssets",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "shares", type: "uint256" }],
    outputs: [{ name: "assets", type: "uint256" }],
  },
  {
    name: "convertToShares",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "assets", type: "uint256" }],
    outputs: [{ name: "shares", type: "uint256" }],
  },
  {
    name: "asset",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
] as const;

export interface VaultClientConfig {
  publicClient: PublicClient;
  walletClient?: WalletClient;
  vaultAddress: Address;
  /** Decimals of the underlying asset (default: 18) */
  assetDecimals?: number;
}

export interface DepositParams {
  /** Human-readable amount (e.g. "100.5") */
  amount: string;
  /** Receiver of shares; defaults to connected wallet */
  receiver?: Address;
}

export interface WithdrawParams {
  /** Human-readable amount to withdraw */
  amount: string;
  receiver?: Address;
  owner?: Address;
}

export interface RedeemParams {
  /** Human-readable share amount to redeem */
  shares: string;
  receiver?: Address;
  owner?: Address;
}

export class VaultClient {
  private readonly publicClient: PublicClient;
  private readonly walletClient: WalletClient | undefined;
  private readonly vaultAddress: Address;
  private readonly decimals: number;

  constructor(config: VaultClientConfig) {
    this.publicClient = config.publicClient;
    this.walletClient = config.walletClient;
    this.vaultAddress = config.vaultAddress;
    this.decimals = config.assetDecimals ?? 18;
  }

  /**
   * Deposit assets into the vault and receive shares.
   * @returns Transaction hash
   */
  async deposit(params: DepositParams): Promise<Hash> {
    this.requireWallet();
    const assets = parseUnits(params.amount, this.decimals);
    const receiver = params.receiver ?? this.walletClient!.account!.address;

    const { request } = await this.publicClient.simulateContract({
      address: this.vaultAddress,
      abi: VAULT_ABI,
      functionName: "deposit",
      args: [assets, receiver],
      account: this.walletClient!.account!,
    });

    return this.walletClient!.writeContract(request);
  }

  /**
   * Withdraw underlying assets from the vault by specifying asset amount.
   * @returns Transaction hash
   */
  async withdraw(params: WithdrawParams): Promise<Hash> {
    this.requireWallet();
    const assets = parseUnits(params.amount, this.decimals);
    const account = this.walletClient!.account!.address;
    const receiver = params.receiver ?? account;
    const owner = params.owner ?? account;

    const { request } = await this.publicClient.simulateContract({
      address: this.vaultAddress,
      abi: VAULT_ABI,
      functionName: "withdraw",
      args: [assets, receiver, owner],
      account: this.walletClient!.account!,
    });

    return this.walletClient!.writeContract(request);
  }

  /**
   * Redeem shares for underlying assets.
   * @returns Transaction hash
   */
  async redeem(params: RedeemParams): Promise<Hash> {
    this.requireWallet();
    const shares = parseUnits(params.shares, this.decimals);
    const account = this.walletClient!.account!.address;
    const receiver = params.receiver ?? account;
    const owner = params.owner ?? account;

    const { request } = await this.publicClient.simulateContract({
      address: this.vaultAddress,
      abi: VAULT_ABI,
      functionName: "redeem",
      args: [shares, receiver, owner],
      account: this.walletClient!.account!,
    });

    return this.walletClient!.writeContract(request);
  }

  /**
   * Get shares balance for an account.
   * @returns Formatted share balance
   */
  async getShares(account: Address): Promise<string> {
    const balance = await this.publicClient.readContract({
      address: this.vaultAddress,
      abi: VAULT_ABI,
      functionName: "balanceOf",
      args: [account],
    });
    return formatUnits(balance, this.decimals);
  }

  /**
   * Get total value locked in the vault (total assets).
   * @returns Formatted TVL in underlying asset units
   */
  async getTVL(): Promise<string> {
    const total = await this.publicClient.readContract({
      address: this.vaultAddress,
      abi: VAULT_ABI,
      functionName: "totalAssets",
    });
    return formatUnits(total, this.decimals);
  }

  /**
   * Estimate current APY based on share price appreciation.
   * Uses a heuristic: fetches convertToAssets(1e18) and compares to 1:1 ratio.
   * For production, integrate with off-chain oracle or historical data.
   * @returns APY as a percentage string (e.g. "5.23")
   */
  async getAPY(): Promise<string> {
    const oneShare = parseUnits("1", this.decimals);
    const assetsPerShare = await this.publicClient.readContract({
      address: this.vaultAddress,
      abi: VAULT_ABI,
      functionName: "convertToAssets",
      args: [oneShare],
    });

    // sharePrice = assetsPerShare / oneShare
    const sharePriceFloat =
      Number(assetsPerShare) / Number(oneShare);

    // Annualized from the current premium (simplified model)
    // In reality, this would compare two historical points
    const apyEstimate = (sharePriceFloat - 1) * 100;
    return apyEstimate.toFixed(4);
  }

  /**
   * Get the underlying asset address of the vault.
   */
  async getUnderlyingAsset(): Promise<Address> {
    return this.publicClient.readContract({
      address: this.vaultAddress,
      abi: VAULT_ABI,
      functionName: "asset",
    }) as Promise<Address>;
  }

  private requireWallet(): asserts this is { walletClient: WalletClient } {
    if (!this.walletClient) {
      throw new Error("VaultClient: walletClient required for write operations");
    }
    if (!this.walletClient.account) {
      throw new Error("VaultClient: walletClient must have an account");
    }
  }
}

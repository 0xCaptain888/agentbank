import {
  type Address,
  type PublicClient,
  type WalletClient,
  type Hash,
  type Hex,
  keccak256,
  encodePacked,
} from "viem";

export enum TEEKind {
  Phala = 0,
  Marlin = 1,
}

export interface AttestedRun {
  kind: TEEKind;
  promptHash: Hex;
  outputHash: Hex;
  codeHash: Hex;
  attesterPubKey: Address;
  timestamp: bigint;
  verified: boolean;
}

const TEE_VERIFIER_ABI = [
  {
    name: "attestRun",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "kind", type: "uint8" },
      { name: "promptHash", type: "bytes32" },
      { name: "outputHash", type: "bytes32" },
      { name: "codeHash", type: "bytes32" },
      { name: "signature", type: "bytes" },
    ],
    outputs: [{ name: "runId", type: "bytes32" }],
  },
  {
    name: "attestedRuns",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "runId", type: "bytes32" }],
    outputs: [
      { name: "kind", type: "uint8" },
      { name: "promptHash", type: "bytes32" },
      { name: "outputHash", type: "bytes32" },
      { name: "codeHash", type: "bytes32" },
      { name: "attesterPubKey", type: "address" },
      { name: "timestamp", type: "uint256" },
      { name: "verified", type: "bool" },
    ],
  },
  {
    name: "approvedCode",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "codeHash", type: "bytes32" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "approvedAttester",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "kind", type: "uint8" },
      { name: "attester", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

export interface AttestationClientConfig {
  publicClient: PublicClient;
  walletClient?: WalletClient;
  verifierAddress: Address;
}

export interface VerifyRunParams {
  kind: TEEKind;
  promptHash: Hex;
  outputHash: Hex;
  codeHash: Hex;
  /** Attester signature over the run parameters */
  signature: Hex;
}

export class AttestationClient {
  private readonly publicClient: PublicClient;
  private readonly walletClient: WalletClient | undefined;
  private readonly verifierAddress: Address;

  constructor(config: AttestationClientConfig) {
    this.publicClient = config.publicClient;
    this.walletClient = config.walletClient;
    this.verifierAddress = config.verifierAddress;
  }

  /**
   * Submit a TEE attestation for an agent run.
   * @returns Transaction hash
   */
  async verifyRun(params: VerifyRunParams): Promise<Hash> {
    this.requireWallet();

    const { request } = await this.publicClient.simulateContract({
      address: this.verifierAddress,
      abi: TEE_VERIFIER_ABI,
      functionName: "attestRun",
      args: [
        params.kind,
        params.promptHash,
        params.outputHash,
        params.codeHash,
        params.signature,
      ],
      account: this.walletClient!.account!,
    });

    return this.walletClient!.writeContract(request);
  }

  /**
   * Compute the runId from the three content hashes (matches on-chain derivation).
   */
  computeRunId(promptHash: Hex, outputHash: Hex, codeHash: Hex): Hex {
    return keccak256(
      encodePacked(
        ["bytes32", "bytes32", "bytes32"],
        [promptHash, outputHash, codeHash]
      )
    );
  }

  /**
   * Fetch an attested run by its runId.
   */
  async getAttestedRun(runId: Hex): Promise<AttestedRun> {
    const raw = await this.publicClient.readContract({
      address: this.verifierAddress,
      abi: TEE_VERIFIER_ABI,
      functionName: "attestedRuns",
      args: [runId],
    });

    return {
      kind: Number(raw[0]) as TEEKind,
      promptHash: raw[1],
      outputHash: raw[2],
      codeHash: raw[3],
      attesterPubKey: raw[4],
      timestamp: raw[5],
      verified: raw[6],
    };
  }

  /**
   * Fetch multiple attested runs by their IDs.
   */
  async getAttestedRuns(runIds: Hex[]): Promise<AttestedRun[]> {
    const results = await Promise.all(
      runIds.map((id) => this.getAttestedRun(id))
    );
    return results;
  }

  /**
   * Check if a specific run has been verified on-chain.
   * @param runId The run identifier or compute from hashes
   */
  async isVerified(runId: Hex): Promise<boolean> {
    const run = await this.getAttestedRun(runId);
    return run.verified;
  }

  /**
   * Convenience: check verification by providing the three hashes directly.
   */
  async isVerifiedByHashes(
    promptHash: Hex,
    outputHash: Hex,
    codeHash: Hex
  ): Promise<boolean> {
    const runId = this.computeRunId(promptHash, outputHash, codeHash);
    return this.isVerified(runId);
  }

  /**
   * Check if a code hash is in the approved set.
   */
  async isCodeApproved(codeHash: Hex): Promise<boolean> {
    return this.publicClient.readContract({
      address: this.verifierAddress,
      abi: TEE_VERIFIER_ABI,
      functionName: "approvedCode",
      args: [codeHash],
    });
  }

  /**
   * Check if an attester is approved for a given TEE kind.
   */
  async isAttesterApproved(kind: TEEKind, attester: Address): Promise<boolean> {
    return this.publicClient.readContract({
      address: this.verifierAddress,
      abi: TEE_VERIFIER_ABI,
      functionName: "approvedAttester",
      args: [kind, attester],
    });
  }

  private requireWallet(): asserts this is { walletClient: WalletClient } {
    if (!this.walletClient) {
      throw new Error("AttestationClient: walletClient required for write operations");
    }
    if (!this.walletClient.account) {
      throw new Error("AttestationClient: walletClient must have an account");
    }
  }
}

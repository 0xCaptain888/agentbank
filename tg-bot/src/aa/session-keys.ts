/**
 * M25 Session Key Management
 *
 * Provides session key creation and validation for AgentBank accounts.
 * Session keys allow delegated execution with limited permissions:
 * - Daily transaction cap
 * - Whitelisted target contracts only
 * - Time-bounded expiry
 */

import { Address, Hex, encodeFunctionData, keccak256, toHex } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

/** Configuration for the AgentAccountFactory contract */
const AGENT_ACCOUNT_FACTORY_ADDRESS: Address =
  (process.env.AGENT_ACCOUNT_FACTORY_ADDRESS as Address) ||
  "0x0000000000000000000000000000000000000000";

const AGENT_ACCOUNT_FACTORY_ABI = [
  {
    name: "registerSessionKey",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "account", type: "address" },
      { name: "sessionKey", type: "address" },
      { name: "validUntil", type: "uint48" },
      { name: "dailyCap", type: "uint256" },
      { name: "whitelistedTargets", type: "address[]" },
    ],
    outputs: [],
  },
  {
    name: "revokeSessionKey",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "account", type: "address" },
      { name: "sessionKey", type: "address" },
    ],
    outputs: [],
  },
] as const;

export interface SessionKeyConfig {
  /** Maximum number of operations per day */
  dailyCap: bigint;
  /** Whitelisted target contract addresses the session key can interact with */
  whitelistedTargets: Address[];
  /** Validity duration in seconds (default: 24 hours) */
  validityDuration?: number;
}

export interface SessionKey {
  /** The session key's private key (store securely) */
  privateKey: Hex;
  /** The session key's public address */
  address: Address;
  /** Unix timestamp when the session key expires */
  expiresAt: number;
  /** Daily operation cap */
  dailyCap: bigint;
  /** Allowed target contracts */
  whitelistedTargets: Address[];
}

const DEFAULT_VALIDITY_DURATION = 24 * 60 * 60; // 24 hours in seconds

/**
 * Creates a new session key for a user's smart account.
 * The session key is registered on-chain via the AgentAccountFactory contract.
 *
 * @param userAccount - The user's smart account address
 * @param config - Session key configuration (daily cap, whitelisted targets)
 * @returns The created session key details and calldata for on-chain registration
 */
export function createSessionKey(
  userAccount: Address,
  config: SessionKeyConfig
): { sessionKey: SessionKey; registrationCalldata: Hex } {
  const validityDuration = config.validityDuration || DEFAULT_VALIDITY_DURATION;
  const expiresAt = Math.floor(Date.now() / 1000) + validityDuration;

  // Generate a fresh session key pair
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);

  const sessionKey: SessionKey = {
    privateKey,
    address: account.address,
    expiresAt,
    dailyCap: config.dailyCap,
    whitelistedTargets: config.whitelistedTargets,
  };

  // Encode the on-chain registration call
  const registrationCalldata = encodeFunctionData({
    abi: AGENT_ACCOUNT_FACTORY_ABI,
    functionName: "registerSessionKey",
    args: [
      userAccount,
      account.address,
      expiresAt,
      config.dailyCap,
      config.whitelistedTargets,
    ],
  });

  console.log(
    `[SessionKeys] Created session key ${account.address} for account ${userAccount} | ` +
      `expires=${new Date(expiresAt * 1000).toISOString()} | ` +
      `dailyCap=${config.dailyCap} | targets=${config.whitelistedTargets.length}`
  );

  return { sessionKey, registrationCalldata };
}

/**
 * Validates whether a session key is still valid (not expired).
 *
 * @param sessionKey - The session key to validate
 * @returns true if the session key has not yet expired
 */
export function validateSessionKeyExpiry(sessionKey: SessionKey): boolean {
  const now = Math.floor(Date.now() / 1000);
  const isValid = now < sessionKey.expiresAt;

  if (!isValid) {
    console.log(
      `[SessionKeys] Session key ${sessionKey.address} expired at ${new Date(sessionKey.expiresAt * 1000).toISOString()}`
    );
  }

  return isValid;
}

/**
 * Generates calldata to revoke a session key on-chain via the AgentAccountFactory.
 *
 * @param userAccount - The user's smart account address
 * @param sessionKeyAddress - The session key address to revoke
 * @returns Encoded calldata for the revocation transaction
 */
export function revokeSessionKey(
  userAccount: Address,
  sessionKeyAddress: Address
): Hex {
  return encodeFunctionData({
    abi: AGENT_ACCOUNT_FACTORY_ABI,
    functionName: "revokeSessionKey",
    args: [userAccount, sessionKeyAddress],
  });
}

/**
 * M25 Pimlico Paymaster Integration
 *
 * Provides gas sponsorship for user operations on Mantle chain.
 * Sponsors the first 5 operations per user to reduce onboarding friction.
 */

import {
  createPimlicoPaymasterClient,
  PimlicoPaymasterClient,
} from "permissionless/clients/pimlico";
import { http, Address } from "viem";
import { mantle } from "viem/chains";

// In-memory tracking of sponsored ops per user (production: use persistent store)
const userOpCount: Map<Address, number> = new Map();

const MAX_SPONSORED_OPS_PER_USER = 5;

const PIMLICO_API_KEY = process.env.PIMLICO_API_KEY || "";
const PIMLICO_MANTLE_URL = `https://api.pimlico.io/v2/mantle/rpc?apikey=${PIMLICO_API_KEY}`;

/**
 * Pimlico paymaster client configured for Mantle chain.
 */
export const paymasterClient: PimlicoPaymasterClient = createPimlicoPaymasterClient({
  transport: http(PIMLICO_MANTLE_URL),
  chain: mantle,
});

/**
 * Sponsors a user operation if the user has not exceeded the free sponsorship limit.
 *
 * @param userAddress - The sender's account address
 * @param userOperation - The unsigned user operation to sponsor
 * @returns Sponsored user operation with paymaster fields, or null if limit exceeded
 */
export async function sponsorUserOperation(
  userAddress: Address,
  userOperation: {
    sender: Address;
    nonce: bigint;
    initCode: `0x${string}`;
    callData: `0x${string}`;
    callGasLimit: bigint;
    verificationGasLimit: bigint;
    preVerificationGas: bigint;
    maxFeePerGas: bigint;
    maxPriorityFeePerGas: bigint;
    paymasterAndData: `0x${string}`;
    signature: `0x${string}`;
  }
): Promise<{
  paymasterAndData: `0x${string}`;
  callGasLimit: bigint;
  verificationGasLimit: bigint;
  preVerificationGas: bigint;
} | null> {
  const currentCount = userOpCount.get(userAddress) || 0;

  if (currentCount >= MAX_SPONSORED_OPS_PER_USER) {
    console.log(
      `[Paymaster] User ${userAddress} exceeded sponsored op limit (${MAX_SPONSORED_OPS_PER_USER})`
    );
    return null;
  }

  const sponsorResult = await paymasterClient.sponsorUserOperation({
    userOperation,
    entryPoint: "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789" as Address,
  });

  // Increment the user's op count
  userOpCount.set(userAddress, currentCount + 1);

  console.log(
    `[Paymaster] Sponsored op for ${userAddress} (${currentCount + 1}/${MAX_SPONSORED_OPS_PER_USER})`
  );

  return sponsorResult;
}

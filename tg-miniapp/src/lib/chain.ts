import { createPublicClient, createWalletClient, http, defineChain, type Address, type PublicClient, type WalletClient } from 'viem';

/** Mantle mainnet chain definition */
export const mantle = defineChain({
  id: 5000,
  name: 'Mantle',
  nativeCurrency: { name: 'Mantle', symbol: 'MNT', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.mantle.xyz'] },
  },
  blockExplorers: {
    default: { name: 'Mantle Explorer', url: 'https://explorer.mantle.xyz' },
  },
});

/** Mantle testnet chain definition */
export const mantleTestnet = defineChain({
  id: 5003,
  name: 'Mantle Sepolia',
  nativeCurrency: { name: 'Mantle', symbol: 'MNT', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.sepolia.mantle.xyz'] },
  },
  blockExplorers: {
    default: { name: 'Mantle Sepolia Explorer', url: 'https://explorer.sepolia.mantle.xyz' },
  },
  testnet: true,
});

/** Public client for read-only chain interactions */
export const publicClient: PublicClient = createPublicClient({
  chain: mantle,
  transport: http(),
});

/** Known contract addresses */
export const CONTRACTS = {
  vaultRouter: '0x0000000000000000000000000000000000000001' as Address,
  intentEngine: '0x0000000000000000000000000000000000000002' as Address,
  abnkToken: '0x0000000000000000000000000000000000000003' as Address,
  reputationRegistry: '0x0000000000000000000000000000000000000004' as Address,
} as const;

/** ERC-20 read helpers */
export async function getTokenBalance(token: Address, account: Address): Promise<bigint> {
  return publicClient.readContract({
    address: token,
    abi: [
      {
        name: 'balanceOf',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'account', type: 'address' }],
        outputs: [{ name: '', type: 'uint256' }],
      },
    ],
    functionName: 'balanceOf',
    args: [account],
  });
}

/** Format bigint to human-readable with decimals */
export function formatTokenAmount(amount: bigint, decimals: number = 18): string {
  const divisor = BigInt(10 ** decimals);
  const whole = amount / divisor;
  const fraction = amount % divisor;
  const fractionStr = fraction.toString().padStart(decimals, '0').slice(0, 4);
  return `${whole}.${fractionStr}`;
}

import { createPublicClient, createWalletClient, http, Chain } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Mantle chain definitions
const mantle: Chain = {
  id: 5000,
  name: 'Mantle',
  nativeCurrency: { name: 'MNT', symbol: 'MNT', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.mantle.xyz'] } },
  blockExplorers: { default: { name: 'MantleScan', url: 'https://mantlescan.xyz' } },
};

const mantleSepolia: Chain = {
  id: 5003,
  name: 'Mantle Sepolia',
  nativeCurrency: { name: 'MNT', symbol: 'MNT', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.sepolia.mantle.xyz'] } },
  blockExplorers: { default: { name: 'MantleScan', url: 'https://sepolia.mantlescan.xyz' } },
};

// Contract addresses (loaded from deployments or env)
const DEFAULT_ADDRESSES = {
  mantle: {
    vaultAddress: process.env.VAULT_ADDRESS || '0x0000000000000000000000000000000000000000',
    signalBoardAddress: process.env.SIGNAL_BOARD_ADDRESS || '0x0000000000000000000000000000000000000000',
    identityRegistryAddress: process.env.IDENTITY_REGISTRY_ADDRESS || '0x0000000000000000000000000000000000000000',
    analystRegistryAddress: process.env.ANALYST_REGISTRY_ADDRESS || '0x0000000000000000000000000000000000000000',
    riskOracleAddress: process.env.RISK_ORACLE_ADDRESS || '0x0000000000000000000000000000000000000000',
  },
  mantle_sepolia: {
    vaultAddress: process.env.VAULT_ADDRESS || '0x0000000000000000000000000000000000000000',
    signalBoardAddress: process.env.SIGNAL_BOARD_ADDRESS || '0x0000000000000000000000000000000000000000',
    identityRegistryAddress: process.env.IDENTITY_REGISTRY_ADDRESS || '0x0000000000000000000000000000000000000000',
    analystRegistryAddress: process.env.ANALYST_REGISTRY_ADDRESS || '0x0000000000000000000000000000000000000000',
    riskOracleAddress: process.env.RISK_ORACLE_ADDRESS || '0x0000000000000000000000000000000000000000',
  },
};

export interface AgentBankClient {
  readContract: (params: { address: string; abi: any; functionName: string; args?: any[] }) => Promise<any>;
  writeContract: (params: { address: string; abi: any; functionName: string; args?: any[] }) => Promise<string>;
  config: typeof DEFAULT_ADDRESSES.mantle;
  account?: { address: string };
}

function getChain(network: string): Chain {
  return network === 'mantle_sepolia' ? mantleSepolia : mantle;
}

function loadPrivateKey(network: string): string | null {
  const configDir = path.join(os.homedir(), '.config', 'agentbank', 'keys');
  const configFile = path.join(configDir, `${network}.json`);
  try {
    const data = JSON.parse(fs.readFileSync(configFile, 'utf-8'));
    return data.privateKey || null;
  } catch {
    return process.env.PRIVATE_KEY || null;
  }
}

function loadDeploymentAddresses(network: string) {
  // Try to load from deployments directory
  const deployPath = path.join(process.cwd(), 'deployments', `v2_${network}.json`);
  try {
    const data = JSON.parse(fs.readFileSync(deployPath, 'utf-8'));
    return {
      vaultAddress: data.tiers?.balanced || data.vault || DEFAULT_ADDRESSES[network as keyof typeof DEFAULT_ADDRESSES]?.vaultAddress,
      signalBoardAddress: data.signalBoard || DEFAULT_ADDRESSES[network as keyof typeof DEFAULT_ADDRESSES]?.signalBoardAddress,
      identityRegistryAddress: data.identity || DEFAULT_ADDRESSES[network as keyof typeof DEFAULT_ADDRESSES]?.identityRegistryAddress,
      analystRegistryAddress: data.analystRegistry || DEFAULT_ADDRESSES[network as keyof typeof DEFAULT_ADDRESSES]?.analystRegistryAddress,
      riskOracleAddress: data.riskOracle || DEFAULT_ADDRESSES[network as keyof typeof DEFAULT_ADDRESSES]?.riskOracleAddress,
    };
  } catch {
    return DEFAULT_ADDRESSES[network as keyof typeof DEFAULT_ADDRESSES] || DEFAULT_ADDRESSES.mantle;
  }
}

/**
 * Get an AgentBank client instance.
 * @param requireSigner If true, loads private key for write operations
 */
export async function getClient(requireSigner: boolean = false): Promise<AgentBankClient> {
  const network = process.env.AGENTBANK_NETWORK || 'mantle';
  const chain = getChain(network);
  const config = loadDeploymentAddresses(network);

  const publicClient = createPublicClient({
    chain,
    transport: http(),
  });

  let account: any = undefined;
  if (requireSigner) {
    const pk = loadPrivateKey(network);
    if (!pk) {
      throw new Error('No private key configured. Run: agentbank-cli wallet set --network <net> --private-key <key>');
    }
    account = privateKeyToAccount(pk as `0x${string}`);
  }

  return {
    readContract: async (params) => {
      return publicClient.readContract({
        address: params.address as `0x${string}`,
        abi: params.abi,
        functionName: params.functionName,
        args: params.args || [],
      });
    },
    writeContract: async (params) => {
      if (!account) throw new Error('Signer required for write operations');
      const walletClient = createWalletClient({
        account,
        chain,
        transport: http(),
      });
      const hash = await walletClient.writeContract({
        address: params.address as `0x${string}`,
        abi: params.abi,
        functionName: params.functionName,
        args: params.args || [],
      });
      return hash;
    },
    config,
    account: account ? { address: account.address } : undefined,
  };
}

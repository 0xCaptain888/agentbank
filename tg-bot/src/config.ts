import dotenv from "dotenv";
dotenv.config();

export interface AppConfig {
  telegram: {
    botToken: string;
    webhookDomain?: string;
    webhookPort: number;
  };
  privy: {
    appId: string;
    appSecret: string;
  };
  chain: {
    rpcUrl: string;
    chainId: number;
    name: string;
  };
  contracts: {
    vault: string;
    signalBoard: string;
    identityRegistry: string;
  };
}

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const config: AppConfig = {
  telegram: {
    botToken: requireEnv("TELEGRAM_BOT_TOKEN"),
    webhookDomain: process.env.WEBHOOK_DOMAIN,
    webhookPort: parseInt(process.env.WEBHOOK_PORT || "3000", 10),
  },
  privy: {
    appId: requireEnv("PRIVY_APP_ID"),
    appSecret: requireEnv("PRIVY_APP_SECRET"),
  },
  chain: {
    rpcUrl: process.env.MANTLE_RPC_URL || "https://rpc.mantle.xyz",
    chainId: 5000,
    name: "Mantle",
  },
  contracts: {
    vault: requireEnv("VAULT_ADDRESS"),
    signalBoard: requireEnv("SIGNAL_BOARD_ADDRESS"),
    identityRegistry: requireEnv("IDENTITY_REGISTRY_ADDRESS"),
  },
};

/** Vault ABI (subset used by the bot) */
export const VAULT_ABI = [
  "function deposit() external payable",
  "function withdraw(uint256 amount) external",
  "function balanceOf(address account) external view returns (uint256)",
  "function totalAssets() external view returns (uint256)",
  "event Deposit(address indexed sender, uint256 amount)",
  "event Withdraw(address indexed receiver, uint256 amount)",
];

/** SignalBoard ABI (subset used by the bot) */
export const SIGNAL_BOARD_ABI = [
  "function getRecentSignals(uint256 count) external view returns (tuple(address agent, uint8 direction, uint256 confidence, uint256 timestamp, string rationale)[])",
  "event SignalSubmitted(address indexed agent, uint8 direction, uint256 confidence, string rationale)",
];

/** IdentityRegistry ABI (subset used by the bot) */
export const IDENTITY_REGISTRY_ABI = [
  "function getAgent(address agent) external view returns (tuple(string name, uint256 reputation, bool active, uint256 registeredAt))",
  "function getActiveAgents() external view returns (address[])",
];

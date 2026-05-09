"""
Central configuration. All values loaded from environment variables.
Never hardcode private keys or API keys.
"""

import os
from dotenv import load_dotenv

load_dotenv()

# ─── Network ─────────────────────────────────────────────────────────────────
NETWORK_NAME = os.getenv("NETWORK_NAME", "mantle_sepolia")  # "mantle_sepolia" | "mantle"

NETWORKS = {
    "mantle_sepolia": {
        "chain_id": 5003,
        "rpc_url": "https://rpc.sepolia.mantle.xyz",
        "explorer": "https://explorer.sepolia.mantle.xyz",
        "usdc_address": "0x...",  # USDC on Mantle Sepolia — fill in after deployment
    },
    "mantle": {
        "chain_id": 5000,
        "rpc_url": "https://rpc.mantle.xyz",
        "explorer": "https://explorer.mantle.xyz",
        "usdc_address": "0x09Bc4E0D864854c6aFB6eB9A9cdF58aC190D0dF9",  # USDC on Mantle mainnet
    }
}

CHAIN_ID  = NETWORKS[NETWORK_NAME]["chain_id"]
RPC_URL   = os.getenv("RPC_URL", NETWORKS[NETWORK_NAME]["rpc_url"])
EXPLORER  = NETWORKS[NETWORK_NAME]["explorer"]

# ─── Contracts ────────────────────────────────────────────────────────────────
VAULT_CONTRACT_ADDRESS    = os.getenv("VAULT_CONTRACT_ADDRESS", "")
SIGNAL_BOARD_ADDRESS      = os.getenv("SIGNAL_BOARD_ADDRESS", "")
AGENT_IDENTITY_ADDRESS    = os.getenv("AGENT_IDENTITY_ADDRESS", "")
USDC_ADDRESS              = os.getenv("USDC_ADDRESS", NETWORKS[NETWORK_NAME]["usdc_address"])

# ─── Agent Wallets ────────────────────────────────────────────────────────────
# Each agent has its own wallet for on-chain identity
ANALYST_PRIVATE_KEY   = os.getenv("ANALYST_PRIVATE_KEY")
EXECUTOR_PRIVATE_KEY  = os.getenv("EXECUTOR_PRIVATE_KEY")
GUARD_PRIVATE_KEY     = os.getenv("GUARD_PRIVATE_KEY")
ALLOCATOR_PRIVATE_KEY = os.getenv("ALLOCATOR_PRIVATE_KEY")
OWNER_PRIVATE_KEY     = os.getenv("OWNER_PRIVATE_KEY")

# ─── LLM ──────────────────────────────────────────────────────────────────────
DEEPSEEK_API_KEY       = os.getenv("DEEPSEEK_API_KEY")
DEEPSEEK_API_BASE      = "https://api.deepseek.com"
DEEPSEEK_MODEL         = "deepseek-chat"   # DeepSeek V3
DEEPSEEK_MAX_TOKENS    = 1000
DEEPSEEK_TEMPERATURE   = 0.1              # Low temp for deterministic outputs

# ─── Risk Parameters ──────────────────────────────────────────────────────────
MAX_OPERATION_BPS      = 1000   # 10% of vault per operation
MIN_SIGNAL_CONFIDENCE  = 70     # Analyst must have >= 70% confidence
MAX_SLIPPAGE_PCT       = 3.0    # 3% max slippage
MIN_POOL_TVL_USD       = 50_000 # Pool must have >= $50k TVL

# ─── Schedules ────────────────────────────────────────────────────────────────
ANALYST_INTERVAL_MINUTES   = 60
EXECUTOR_INTERVAL_MINUTES  = 15
ALLOCATOR_INTERVAL_HOURS   = 24

# ─── ABI paths (loaded at runtime) ───────────────────────────────────────────
import json, pathlib

def _load_abi(name: str) -> list:
    path = pathlib.Path(__file__).parent / "contracts" / "abi" / f"{name}.json"
    if path.exists():
        return json.loads(path.read_text())
    return []

VAULT_ABI         = _load_abi("AgentBankVault")
SIGNAL_BOARD_ABI  = _load_abi("SignalBoard")
IDENTITY_ABI      = _load_abi("AgentIdentity")

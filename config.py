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

# ─── V3: Decentralized Inference (M19) ───────────────────────────────────────
TOGETHER_API_KEY       = os.getenv("TOGETHER_API_KEY")       # Llama 3
DASHSCOPE_API_KEY      = os.getenv("DASHSCOPE_API_KEY")      # Qwen 2.5
ALLORA_TOPIC_ID        = int(os.getenv("ALLORA_TOPIC_ID", "1"))
ALLORA_WORKER_KEY      = os.getenv("ALLORA_WORKER_KEY")

# ─── V3: TEE Attestation (M20) ──────────────────────────────────────────────
PHALA_TEE_URL          = os.getenv("PHALA_TEE_URL", "https://tee.agentbank.xyz")
TEE_VERIFIER_ADDRESS   = os.getenv("TEE_VERIFIER_ADDRESS", "")

# ─── V3: Token (M21) ────────────────────────────────────────────────────────
ABNK_TOKEN_ADDRESS     = os.getenv("ABNK_TOKEN_ADDRESS", "")
VOTING_ESCROW_ADDRESS  = os.getenv("VOTING_ESCROW_ADDRESS", "")
FEE_DISTRIBUTOR_ADDRESS = os.getenv("FEE_DISTRIBUTOR_ADDRESS", "")

# ─── V3: Intent Router (M24) ────────────────────────────────────────────────
INTENT_ROUTER_ADDRESS  = os.getenv("INTENT_ROUTER_ADDRESS", "")
SOLVER_REGISTRY_ADDRESS = os.getenv("SOLVER_REGISTRY_ADDRESS", "")

# ─── V3: Cross-Chain (M27) ──────────────────────────────────────────────────
AGENTBANK_OFT_ADDRESS  = os.getenv("AGENTBANK_OFT_ADDRESS", "")
CROSS_CHAIN_ENTRYPOINT = os.getenv("CROSS_CHAIN_ENTRYPOINT", "")

# ─── V3: Account Abstraction (M25) ──────────────────────────────────────────
PIMLICO_API_KEY        = os.getenv("PIMLICO_API_KEY")
AA_FACTORY_ADDRESS     = os.getenv("AA_FACTORY_ADDRESS", "")

# ─── V3: Signal NFT (M26) ───────────────────────────────────────────────────
SIGNAL_NFT_ADDRESS     = os.getenv("SIGNAL_NFT_ADDRESS", "")
AUCTION_HOUSE_ADDRESS  = os.getenv("AUCTION_HOUSE_ADDRESS", "")

# ─── V3: Mechanism Hardening (M28) ──────────────────────────────────────────
ANTI_SYBIL_ADDRESS     = os.getenv("ANTI_SYBIL_ADDRESS", "")
COMMIT_REVEAL_ADDRESS  = os.getenv("COMMIT_REVEAL_ADDRESS", "")

# ─── V3: LLM Reasoning Registry ─────────────────────────────────────────────
LLM_REGISTRY_ADDRESS   = os.getenv("LLM_REGISTRY_ADDRESS", "")
LLM_REGISTRY_ABI       = _load_abi("LLMReasoningRegistry")

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

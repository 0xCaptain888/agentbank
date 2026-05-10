/**
 * Round 2: Generate on-chain activity with corrected function signatures
 */
const hre = require("hardhat");

const V2 = {
  LLMReasoningRegistry: "0x8a8C3532359aAACb6C3a1060deF4938F6006c8F1",
  SignalBoardV2: "0x2A46cF6493b377D45908254B0528e38990AA323f",
  ReputationRegistry: "0x494960e21058290BB2F1328b6b837dCF26aA5DCb",
  IdentityRegistry: "0x7058132Ba4aE19983c61590644F2943A3B7fDf80",
};
const V3 = {
  SignalNFT: "0x185346Bd15223740dA8D6D7A11F18b1c93971525",
};

const USDC = "0x09Bc4E0D864854c6aFB6eB9A9cdF58aC190D0dF9";
const WMNT = "0x78c1b0C915c4FAA5FffA6CAbf0219DA63d7f4cb8";
const AGENTS = {
  analyst:   "0xc7e424c1e4b346c06a35241e7bca469477483683",
  executor:  "0x4c9cef3bc7f5455d2581b717f115b2c76fc1d092",
  guard:     "0xc2203fd52c6f2a4429a22aa2eec78d4d2db72a59",
  allocator: "0x6f3d2708e59491db653ec794b54c775f390b3dc0"
};

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Round 2 activity with:", deployer.address);
  console.log("Balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "MNT\n");

  let tx, receipt;

  // ═══ LLM REASONING — record(model, promptHash, outputHash, storageURI) ═══
  console.log("=== LLM Reasoning Records ===");
  const reasoning = await hre.ethers.getContractAt("LLMReasoningRegistry", V2.LLMReasoningRegistry);

  const reasoningEntries = [
    { model: "deepseek-v4", prompt: "Analyze MNT/USDC 4h chart. RSI=42, MACD bearish crossover.", output: "HOLD. Bearish momentum building, no breakdown below 0.38.", uri: "ipfs://Qm_reasoning_001" },
    { model: "deepseek-v4", prompt: "ETH correlation analysis for MNT. ETH at 3800 resistance.", output: "BUY. MNT underperforming ETH by 12%, mean reversion expected.", uri: "ipfs://Qm_reasoning_002" },
    { model: "deepseek-v4", prompt: "On-chain flow: 3 whale wallets added 2M MNT in 24h.", output: "STRONG BUY. Whale accumulation + low exchange reserves.", uri: "ipfs://Qm_reasoning_003" },
    { model: "deepseek-v4", prompt: "Risk assessment: MNT liquidity depth on Merchant Moe.", output: "CAUTION. Slippage >2% for 50k. Split into 10k tranches.", uri: "ipfs://Qm_reasoning_004" },
    { model: "deepseek-v4", prompt: "Market regime: BTC dominance rising, altcoin index=28.", output: "DEFENSIVE. Rotate 30% to USDC stables.", uri: "ipfs://Qm_reasoning_005" },
  ];

  for (let i = 0; i < reasoningEntries.length; i++) {
    const e = reasoningEntries[i];
    try {
      tx = await reasoning.record(e.model, hre.ethers.id(e.prompt), hre.ethers.id(e.output), e.uri);
      receipt = await tx.wait();
      console.log(`  Reasoning #${i+1}: ${e.model} (tx: ${receipt.hash})`);
    } catch (err) {
      console.log(`  Skip reasoning #${i+1}: ${err.message.slice(0, 100)}`);
    }
  }

  // ═══ SIGNAL BOARD — postSignal(signalType, targetProtocol, tokenIn, tokenOut, amountIn, minAmountOut, confidence, reasoning, reasoningHash) ═══
  console.log("\n=== Trading Signals ===");
  const signalBoard = await hre.ethers.getContractAt("SignalBoardV2", V2.SignalBoardV2);

  const signals = [
    { type: "BUY",  proto: "merchant_moe", tIn: USDC, tOut: WMNT, amtIn: "10000000000", minOut: "24000000000000000000", conf: 82, reason: "Whale accumulation + RSI oversold bounce" },
    { type: "SELL", proto: "agni_finance", tIn: WMNT, tOut: USDC, amtIn: "25000000000000000000", minOut: "9500000000", conf: 71, reason: "Bearish divergence on 4h" },
    { type: "BUY",  proto: "merchant_moe", tIn: USDC, tOut: WMNT, amtIn: "25000000000", minOut: "60000000000000000000", conf: 88, reason: "ETH breakout, MNT beta play" },
    { type: "BUY",  proto: "merchant_moe", tIn: USDC, tOut: WMNT, amtIn: "5000000000",  minOut: "12000000000000000000", conf: 65, reason: "Consolidation, small position" },
    { type: "BUY",  proto: "agni_finance", tIn: USDC, tOut: WMNT, amtIn: "50000000000", minOut: "120000000000000000000", conf: 91, reason: "Mantle TVL surge +15%" },
  ];

  for (let i = 0; i < signals.length; i++) {
    const s = signals[i];
    const reasoningHash = hre.ethers.id(s.reason);
    try {
      tx = await signalBoard.postSignal(s.type, s.proto, s.tIn, s.tOut, s.amtIn, s.minOut, s.conf, s.reason, reasoningHash);
      receipt = await tx.wait();
      console.log(`  Signal #${i+1}: ${s.type} conf=${s.conf}% (tx: ${receipt.hash})`);
    } catch (err) {
      console.log(`  Skip signal #${i+1}: ${err.message.slice(0, 120)}`);
    }
  }

  // ═══ SIGNAL NFT — mintExecutedSignal(analyst, signalId, pnl, reasoningHash, attestationId, tokenURI_) ═══
  console.log("\n=== Signal NFT Minting ===");
  const signalNFT = await hre.ethers.getContractAt("SignalNFT", V3.SignalNFT);

  const nfts = [
    { analyst: AGENTS.analyst, signalId: 1, pnl: 320,  rHash: hre.ethers.id("whale-buy"), aId: hre.ethers.id("tee-att-1"), uri: "ipfs://Qm_signal_nft_001" },
    { analyst: AGENTS.analyst, signalId: 2, pnl: -150, rHash: hre.ethers.id("eth-corr"),   aId: hre.ethers.id("tee-att-2"), uri: "ipfs://Qm_signal_nft_002" },
    { analyst: AGENTS.analyst, signalId: 3, pnl: 870,  rHash: hre.ethers.id("tvl-surge"),  aId: hre.ethers.id("tee-att-3"), uri: "ipfs://Qm_signal_nft_003" },
  ];

  for (let i = 0; i < nfts.length; i++) {
    const n = nfts[i];
    try {
      tx = await signalNFT.mintExecutedSignal(n.analyst, n.signalId, n.pnl, n.rHash, n.aId, n.uri);
      receipt = await tx.wait();
      console.log(`  Minted NFT #${i+1}: PnL=${n.pnl} bps (tx: ${receipt.hash})`);
    } catch (err) {
      console.log(`  Skip NFT #${i+1}: ${err.message.slice(0, 100)}`);
    }
  }

  // ═══ REPUTATION — Need to authorize first, then submitFeedback(agentId, score, contextHash, reason) ═══
  console.log("\n=== Reputation Feedback ===");
  const reputation = await hre.ethers.getContractAt("ReputationRegistry", V2.ReputationRegistry);
  const identity = await hre.ethers.getContractAt("IdentityRegistry", V2.IdentityRegistry);

  // Get agent IDs and authorize deployer as client
  for (const [role, addr] of Object.entries(AGENTS)) {
    try {
      const agentId = await identity.agentByAddress(addr);
      if (agentId.toString() !== "0") {
        try {
          tx = await reputation.authorize(agentId, deployer.address);
          await tx.wait();
          console.log(`  Authorized deployer as ${role} reputation client (agentId=${agentId})`);
        } catch (e) {
          // might already be authorized
        }
      }
    } catch (e) {}
  }

  // Now submit feedback
  const feedbacks = [
    { role: "analyst",  score: 45,  reason: "Accurate BUY signal, +3.2% realized" },
    { role: "executor", score: 80,  reason: "Clean execution, 0.1% slippage" },
    { role: "guard",    score: 60,  reason: "Correctly blocked high-slippage trade" },
    { role: "analyst",  score: -20, reason: "SELL signal premature, missed upside" },
    { role: "executor", score: 90,  reason: "Optimal split order fill" },
  ];

  for (let i = 0; i < feedbacks.length; i++) {
    const fb = feedbacks[i];
    try {
      const agentId = await identity.agentByAddress(AGENTS[fb.role]);
      tx = await reputation.submitFeedback(agentId, fb.score, hre.ethers.id(fb.reason), fb.reason);
      receipt = await tx.wait();
      console.log(`  Feedback #${i+1}: score=${fb.score} for ${fb.role} (tx: ${receipt.hash})`);
    } catch (err) {
      console.log(`  Skip feedback #${i+1}: ${err.message.slice(0, 100)}`);
    }
  }

  console.log("\n=== Round 2 complete ===");
  console.log("Remaining:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "MNT");
}

main()
  .then(() => process.exit(0))
  .catch((error) => { console.error(error); process.exit(1); });

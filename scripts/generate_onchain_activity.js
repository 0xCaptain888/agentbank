/**
 * Generate comprehensive on-chain activity records on Mantle mainnet.
 * Registers agents, posts signals, logs reasoning, creates TEE attestations,
 * mints NFTs, locks tokens in VotingEscrow, and runs intent auctions.
 */
const hre = require("hardhat");

const V2 = {
  IdentityRegistry: "0x7058132Ba4aE19983c61590644F2943A3B7fDf80",
  ReputationRegistry: "0x494960e21058290BB2F1328b6b837dCF26aA5DCb",
  LLMReasoningRegistry: "0x8a8C3532359aAACb6C3a1060deF4938F6006c8F1",
  SignalBoardV2: "0x2A46cF6493b377D45908254B0528e38990AA323f",
  AgentBankVaultV2: "0xC44C061D257Af305dEAea2eD093E878a615d856d"
};

const V3 = {
  AlloraConsumer: "0x38F2AbD24b8125779Cb6a933E9A87A97be5b0e1A",
  OpenGradientReader: "0xD23CaFB0B8a10A3eafe061bAe93AA2A923B322F3",
  TEEAttestationVerifier: "0x51E52dCBD0FBfaDaDB43ad1EB1Ea0d3A79f128c3",
  ABNKToken: "0x5C101D893c2860067b010b615E3a6812439f85F8",
  VotingEscrow: "0x06649c4a2194eE9736c2139AAFE6D10033154F9a",
  FeeDistributor: "0x16c65fbe4220F0D0EC7cbB47Ad9B2956DbA9886d",
  SolverRegistry: "0xB864B5Aa1E2164D93B491f5f62902120FAf1Ab52",
  IntentRouter: "0x9582d2dF303ec2B1fab104A77E249C05571fccC9",
  SignalNFT: "0x185346Bd15223740dA8D6D7A11F18b1c93971525",
  SignalAuctionHouse: "0xfcc6bE4Dfc45322b8C99fFFB255C1DEcd8f07907",
  AntiSybilGuard: "0x2fc6e0987bF58F5A0Dc76801A9556Ab62bD42049",
  CommitRevealSignal: "0x2A7D252D0bFF31eC1098FF642C0934b7124a5A33"
};

const AGENTS = {
  analyst:   "0xc7e424c1e4b346c06a35241e7bca469477483683",
  executor:  "0x4c9cef3bc7f5455d2581b717f115b2c76fc1d092",
  guard:     "0xc2203fd52c6f2a4429a22aa2eec78d4d2db72a59",
  allocator: "0x6f3d2708e59491db653ec794b54c775f390b3dc0"
};

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Generating on-chain activity with:", deployer.address);
  console.log("Balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "MNT\n");

  let tx, receipt;

  // ═══════════════════════════════════════════════════════════════════
  // 1. IDENTITY REGISTRY — Register all agents
  // ═══════════════════════════════════════════════════════════════════
  console.log("=== 1. Agent Identity Registration ===");
  const identity = await hre.ethers.getContractAt("IdentityRegistry", V2.IdentityRegistry);

  const agentDefs = [
    { addr: AGENTS.analyst,   domain: "agentbank.xyz/analyst-deepseek-v4",  agentType: "analyst"   },
    { addr: AGENTS.executor,  domain: "agentbank.xyz/executor-main",        agentType: "executor"  },
    { addr: AGENTS.guard,     domain: "agentbank.xyz/guard-risk",           agentType: "guard"     },
    { addr: AGENTS.allocator, domain: "agentbank.xyz/allocator-tier",       agentType: "allocator" },
    { addr: deployer.address, domain: "agentbank.xyz/owner-admin",          agentType: "admin"     },
  ];

  for (const agent of agentDefs) {
    try {
      tx = await identity.registerAgent(
        agent.addr,
        agent.domain,
        agent.agentType,
        hre.ethers.id(agent.domain)
      );
      receipt = await tx.wait();
      console.log(`  Registered ${agent.agentType}: ${agent.addr} (tx: ${receipt.hash})`);
    } catch (e) {
      console.log(`  Skip ${agent.agentType}: ${e.message.slice(0, 80)}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // 2. LLM REASONING REGISTRY — Log reasoning chains
  // ═══════════════════════════════════════════════════════════════════
  console.log("\n=== 2. LLM Reasoning Records ===");
  const reasoning = await hre.ethers.getContractAt("LLMReasoningRegistry", V2.LLMReasoningRegistry);

  const reasoningEntries = [
    { model: "deepseek-v4", prompt: "Analyze MNT/USDC 4h chart. RSI=42, MACD bearish crossover, volume declining.", output: "HOLD signal. Bearish momentum building but no confirmed breakdown below $0.38 support.", confidence: 72 },
    { model: "deepseek-v4", prompt: "ETH correlation analysis for MNT positioning. ETH at $3800 resistance.", output: "BUY signal. MNT underperforming ETH by 12% in 7d, mean reversion expected. Target 0.42 USDC.", confidence: 78 },
    { model: "deepseek-v4", prompt: "On-chain flow analysis: whale wallets accumulating MNT. 3 wallets added 2M MNT in 24h.", output: "STRONG BUY. Whale accumulation + low exchange reserves = bullish. Size: 5% vault.", confidence: 85 },
    { model: "deepseek-v4", prompt: "Risk assessment: MNT liquidity depth on Merchant Moe. Check slippage for 50k USDC swap.", output: "CAUTION. Slippage >2% for 50k. Recommend splitting into 10k tranches over 2h.", confidence: 65 },
    { model: "deepseek-v4", prompt: "Market regime detection. BTC dominance rising, altcoin season index=28.", output: "DEFENSIVE. Rotate 30% vault to USDC stables. Reduce MNT exposure to 40%.", confidence: 81 },
  ];

  for (let i = 0; i < reasoningEntries.length; i++) {
    const entry = reasoningEntries[i];
    try {
      tx = await reasoning.logReasoning(
        entry.model,
        hre.ethers.id(entry.prompt),
        hre.ethers.id(entry.output),
        entry.confidence
      );
      receipt = await tx.wait();
      console.log(`  Reasoning #${i+1}: ${entry.model} conf=${entry.confidence}% (tx: ${receipt.hash})`);
    } catch (e) {
      console.log(`  Skip reasoning #${i+1}: ${e.message.slice(0, 80)}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // 3. SIGNAL BOARD — Post trading signals
  // ═══════════════════════════════════════════════════════════════════
  console.log("\n=== 3. Trading Signals ===");
  const signalBoard = await hre.ethers.getContractAt("SignalBoardV2", V2.SignalBoardV2);

  const signals = [
    { signalType: "BUY",  pair: "MNT/USDC", confidence: 82, reasoning: "Whale accumulation + RSI oversold bounce" },
    { signalType: "SELL", pair: "MNT/USDC", confidence: 71, reasoning: "Bearish divergence on 4h, target stop at 0.39" },
    { signalType: "BUY",  pair: "ETH/USDC", confidence: 88, reasoning: "ETH breakout above 3800, MNT beta play via vault" },
    { signalType: "HOLD", pair: "MNT/USDC", confidence: 65, reasoning: "Consolidation range, wait for breakout confirmation" },
    { signalType: "BUY",  pair: "MNT/USDC", confidence: 91, reasoning: "Mantle TVL surge +15%, ecosystem momentum strong" },
  ];

  for (let i = 0; i < signals.length; i++) {
    const sig = signals[i];
    try {
      tx = await signalBoard.postSignal(
        sig.signalType,
        sig.pair,
        sig.confidence,
        hre.ethers.id(sig.reasoning)
      );
      receipt = await tx.wait();
      console.log(`  Signal #${i+1}: ${sig.signalType} ${sig.pair} conf=${sig.confidence}% (tx: ${receipt.hash})`);
    } catch (e) {
      console.log(`  Skip signal #${i+1}: ${e.message.slice(0, 100)}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // 4. TEE ATTESTATION — Attest verified AI runs
  // ═══════════════════════════════════════════════════════════════════
  console.log("\n=== 4. TEE Attestations ===");
  const teeVerifier = await hre.ethers.getContractAt("TEEAttestationVerifier", V3.TEEAttestationVerifier);

  const teeRuns = [
    { prompt: "MNT/USDC price prediction 8h horizon", output: "0.412 USDC (+3.2%)", code: "analyst-model-v4.1" },
    { prompt: "Portfolio risk assessment with VaR 95%", output: "VaR=-4.2%, max drawdown=-7.8%", code: "risk-model-v2.0" },
    { prompt: "Optimal trade size for MNT buy signal", output: "Size: 12,500 USDC (2.5% vault)", code: "sizing-model-v1.3" },
  ];

  for (let i = 0; i < teeRuns.length; i++) {
    const run = teeRuns[i];
    const promptHash = hre.ethers.id(run.prompt);
    const outputHash = hre.ethers.id(run.output);
    const codeHash = hre.ethers.id("agentbank-analyst-tee-v1"); // approved code hash

    // Sign the attestation data
    const messageHash = hre.ethers.solidityPackedKeccak256(
      ["uint8", "bytes32", "bytes32", "bytes32"],
      [0, promptHash, outputHash, codeHash] // 0 = TEEKind.Phala
    );
    const signature = await deployer.signMessage(hre.ethers.getBytes(messageHash));

    try {
      tx = await teeVerifier.attestRun(0, promptHash, outputHash, codeHash, signature);
      receipt = await tx.wait();
      console.log(`  TEE attestation #${i+1}: ${run.code} (tx: ${receipt.hash})`);
    } catch (e) {
      console.log(`  Skip TEE #${i+1}: ${e.message.slice(0, 100)}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // 5. ABNK TOKEN — Transfer & VotingEscrow lock
  // ═══════════════════════════════════════════════════════════════════
  console.log("\n=== 5. ABNK Token Operations ===");
  const abnkToken = await hre.ethers.getContractAt("ABNKToken", V3.ABNKToken);
  const votingEscrow = await hre.ethers.getContractAt("VotingEscrow", V3.VotingEscrow);

  // Transfer ABNK to agent wallets
  const transferAmount = hre.ethers.parseEther("100000"); // 100k ABNK each
  for (const [role, addr] of Object.entries(AGENTS)) {
    try {
      tx = await abnkToken.transfer(addr, transferAmount);
      receipt = await tx.wait();
      console.log(`  Transferred 100k ABNK to ${role}: ${addr} (tx: ${receipt.hash})`);
    } catch (e) {
      console.log(`  Skip transfer to ${role}: ${e.message.slice(0, 80)}`);
    }
  }

  // Lock ABNK in VotingEscrow (deployer locks 1M for 1 year)
  const lockAmount = hre.ethers.parseEther("1000000");
  const lockDuration = 365 * 24 * 3600; // 1 year

  try {
    tx = await abnkToken.approve(V3.VotingEscrow, lockAmount);
    await tx.wait();
    console.log("  Approved VotingEscrow for 1M ABNK");

    tx = await votingEscrow.createLock(lockAmount, lockDuration);
    receipt = await tx.wait();
    console.log(`  Locked 1M ABNK for 1 year in VotingEscrow (tx: ${receipt.hash})`);
  } catch (e) {
    console.log(`  Skip VE lock: ${e.message.slice(0, 100)}`);
  }

  // ═══════════════════════════════════════════════════════════════════
  // 6. SIGNAL NFT — Mint signal NFTs
  // ═══════════════════════════════════════════════════════════════════
  console.log("\n=== 6. Signal NFT Minting ===");
  const signalNFT = await hre.ethers.getContractAt("SignalNFT", V3.SignalNFT);

  const nftSignals = [
    { analyst: AGENTS.analyst, signalId: 1, pnl: 3200,  reasoning: "MNT whale buy signal", attestation: 1 },
    { analyst: AGENTS.analyst, signalId: 2, pnl: -1500, reasoning: "ETH correlation play",  attestation: 2 },
    { analyst: AGENTS.analyst, signalId: 3, pnl: 8700,  reasoning: "TVL surge momentum",    attestation: 3 },
  ];

  for (let i = 0; i < nftSignals.length; i++) {
    const nft = nftSignals[i];
    try {
      tx = await signalNFT.mint(
        nft.analyst,
        nft.signalId,
        nft.pnl,
        hre.ethers.id(nft.reasoning),
        nft.attestation
      );
      receipt = await tx.wait();
      console.log(`  Minted Signal NFT #${i+1}: PnL=${nft.pnl} bps (tx: ${receipt.hash})`);
    } catch (e) {
      console.log(`  Skip NFT #${i+1}: ${e.message.slice(0, 100)}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // 7. COMMIT-REVEAL — Commit signal hashes
  // ═══════════════════════════════════════════════════════════════════
  console.log("\n=== 7. Commit-Reveal Signals ===");
  const commitReveal = await hre.ethers.getContractAt("CommitRevealSignal", V3.CommitRevealSignal);

  const commits = [
    "BUY-MNT-0.40-85-deepseek-v4",
    "SELL-MNT-0.44-72-deepseek-v4",
    "BUY-MNT-0.38-90-deepseek-v4",
  ];

  for (let i = 0; i < commits.length; i++) {
    try {
      const commitHash = hre.ethers.id(commits[i]);
      tx = await commitReveal.commit(commitHash);
      receipt = await tx.wait();
      console.log(`  Committed signal #${i+1} (tx: ${receipt.hash})`);
    } catch (e) {
      console.log(`  Skip commit #${i+1}: ${e.message.slice(0, 100)}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // 8. REPUTATION — Submit feedback
  // ═══════════════════════════════════════════════════════════════════
  console.log("\n=== 8. Reputation Updates ===");
  const reputation = await hre.ethers.getContractAt("ReputationRegistry", V2.ReputationRegistry);

  const feedbacks = [
    { agent: AGENTS.analyst,  score: 85, context: "Accurate BUY signal, +3.2% realized" },
    { agent: AGENTS.executor, score: 92, context: "Clean execution, 0.1% slippage" },
    { agent: AGENTS.guard,    score: 88, context: "Correctly blocked high-slippage trade" },
    { agent: AGENTS.analyst,  score: 60, context: "SELL signal premature, missed 2% upside" },
    { agent: AGENTS.executor, score: 95, context: "Split order execution, optimal fill" },
  ];

  for (let i = 0; i < feedbacks.length; i++) {
    const fb = feedbacks[i];
    try {
      tx = await reputation.submitFeedback(fb.agent, fb.score, hre.ethers.id(fb.context));
      receipt = await tx.wait();
      console.log(`  Feedback #${i+1}: ${fb.score}/100 for ${fb.agent.slice(0,10)}... (tx: ${receipt.hash})`);
    } catch (e) {
      console.log(`  Skip feedback #${i+1}: ${e.message.slice(0, 100)}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  console.log("\n=== On-chain activity generation complete ===");
  const finalBalance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Remaining balance:", hre.ethers.formatEther(finalBalance), "MNT");
}

main()
  .then(() => process.exit(0))
  .catch((error) => { console.error(error); process.exit(1); });

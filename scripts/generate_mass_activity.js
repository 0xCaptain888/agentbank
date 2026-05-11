/**
 * Mass on-chain activity generation — Round 4
 * More signals, reasoning, TEE, NFTs, token ops, commit-reveal cycles
 */
const hre = require("hardhat");

const V2 = {
  IdentityRegistry: "0x7058132Ba4aE19983c61590644F2943A3B7fDf80",
  ReputationRegistry: "0x494960e21058290BB2F1328b6b837dCF26aA5DCb",
  LLMReasoningRegistry: "0x8a8C3532359aAACb6C3a1060deF4938F6006c8F1",
  SignalBoardV2: "0x2A46cF6493b377D45908254B0528e38990AA323f",
  AgentBankVaultV2: "0xC44C061D257Af305dEAea2eD093E878a615d856d",
};
const V3 = {
  TEEAttestationVerifier: "0x51E52dCBD0FBfaDaDB43ad1EB1Ea0d3A79f128c3",
  ABNKToken: "0x5C101D893c2860067b010b615E3a6812439f85F8",
  VotingEscrow: "0x06649c4a2194eE9736c2139AAFE6D10033154F9a",
  SignalNFT: "0x185346Bd15223740dA8D6D7A11F18b1c93971525",
  SignalAuctionHouse: "0xfcc6bE4Dfc45322b8C99fFFB255C1DEcd8f07907",
  CommitRevealSignal: "0x2A7D252D0bFF31eC1098FF642C0934b7124a5A33",
  SolverRegistry: "0xB864B5Aa1E2164D93B491f5f62902120FAf1Ab52",
  IntentRouter: "0x9582d2dF303ec2B1fab104A77E249C05571fccC9",
};

const USDC = "0x09Bc4E0D864854c6aFB6eB9A9cdF58aC190D0dF9";
const WMNT = "0x78c1b0C915c4FAA5FffA6CAbf0219DA63d7f4cb8";

let txCount = 0;
const allTxs = {};

async function logTx(category, detail, txPromise) {
  try {
    const tx = await txPromise;
    const receipt = await tx.wait();
    txCount++;
    if (!allTxs[category]) allTxs[category] = [];
    allTxs[category].push({ detail, hash: receipt.hash });
    console.log(`  [${txCount}] ${category}: ${detail} (${receipt.hash.slice(0,16)}...)`);
    return receipt;
  } catch (e) {
    console.log(`  SKIP ${category}: ${detail} — ${e.message.slice(0,80)}`);
    return null;
  }
}

async function main() {
  const signers = await hre.ethers.getSigners();
  const deployer = signers[0];
  const analyst = signers[1];
  const executor = signers[2];
  const guard = signers[3];
  const allocator = signers[4];

  console.log("=== Mass On-Chain Activity Generation ===");
  console.log("Deployer:", deployer.address);
  console.log("Balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "MNT\n");

  // ═══════════════════════════════════════════════════════════════
  // 1. LLM REASONING — 15 more entries with varied models
  // ═══════════════════════════════════════════════════════════════
  console.log("\n── LLM Reasoning Records (15) ──");
  const reasoning = await hre.ethers.getContractAt("LLMReasoningRegistry", V2.LLMReasoningRegistry);

  const reasonings = [
    { model: "deepseek-v4", prompt: "Intraday MNT momentum scan: 1h candles show higher lows since 06:00 UTC", output: "BUY. Ascending triangle forming, breakout likely above 0.415", uri: "ipfs://Qm_r006" },
    { model: "deepseek-v4", prompt: "Cross-exchange flow: Binance MNT outflows exceed inflows by 340k in 6h", output: "BULLISH. Exchange reserves depleting, supply squeeze imminent", uri: "ipfs://Qm_r007" },
    { model: "llama-3-70b", prompt: "Mantle ecosystem grant recipients analysis: 12 new projects funded Q2", output: "LONG-TERM BUY. Ecosystem expansion accelerating, TVL growth catalyst", uri: "ipfs://Qm_r008" },
    { model: "llama-3-70b", prompt: "MNT staking yield vs DeFi opportunity cost at current rates", output: "REBALANCE. Move 15% from staking to Merchant Moe LP for 3x yield", uri: "ipfs://Qm_r009" },
    { model: "qwen-2.5-72b", prompt: "Sentiment analysis: crypto twitter MNT mentions up 280% in 48h", output: "CAUTION. Retail FOMO spike often precedes local top. Tighten stops", uri: "ipfs://Qm_r010" },
    { model: "qwen-2.5-72b", prompt: "Correlation matrix: MNT-ETH 30d rolling correlation dropped to 0.4", output: "OPPORTUNITY. Decorrelation means MNT alpha available vs ETH hedge", uri: "ipfs://Qm_r011" },
    { model: "deepseek-v4", prompt: "Order book depth analysis: $2M bid wall at 0.395, thin asks above 0.42", output: "BUY. Strong support, low resistance. Target 0.44 with 2% stop", uri: "ipfs://Qm_r012" },
    { model: "deepseek-v4", prompt: "Macro overlay: US CPI print below expectations, risk-on rotation", output: "AGGRESSIVE BUY. Risk assets rallying, size up to 8% vault", uri: "ipfs://Qm_r013" },
    { model: "deepseek-v4", prompt: "Gas cost optimization: batch 3 pending signals into single vault op", output: "EXECUTE. Combined calldata saves 40% gas vs individual ops", uri: "ipfs://Qm_r014" },
    { model: "llama-3-70b", prompt: "Volatility regime: MNT 7d realized vol at 45%, implied vol at 62%", output: "SELL VOL. IV premium suggests options overpriced, collect premium", uri: "ipfs://Qm_r015" },
    { model: "deepseek-v4", prompt: "Whale tracker: address 0xf3a...8b2 sold 500k MNT in 3 txs over 2h", output: "WATCH. Single whale distribution, monitor for follow-through selling", uri: "ipfs://Qm_r016" },
    { model: "qwen-2.5-72b", prompt: "DeFi yield comparison: Agni 0.3% pool APR 18.2% vs Merchant Moe 12.4%", output: "ROTATE. Shift LP from Merchant Moe to Agni concentrated position", uri: "ipfs://Qm_r017" },
    { model: "deepseek-v4", prompt: "Network health: Mantle TPS stable at 45, no congestion detected", output: "ALL CLEAR. Execution conditions optimal for large vault operations", uri: "ipfs://Qm_r018" },
    { model: "llama-3-70b", prompt: "Funding rate analysis: MNT perp funding rate -0.02% negative", output: "BUY SPOT. Negative funding = shorts paying longs, favorable entry", uri: "ipfs://Qm_r019" },
    { model: "deepseek-v4", prompt: "End-of-day portfolio review: vault up 2.1% net, 3 signals executed", output: "SUMMARY. Sharpe 1.8 for the day, all risk limits respected", uri: "ipfs://Qm_r020" },
  ];

  for (const r of reasonings) {
    await logTx("Reasoning", `${r.model}: ${r.output.slice(0,40)}...`,
      reasoning.record(r.model, hre.ethers.id(r.prompt), hre.ethers.id(r.output), r.uri));
  }

  // ═══════════════════════════════════════════════════════════════
  // 2. TRADING SIGNALS — 12 more from deployer
  // ═══════════════════════════════════════════════════════════════
  console.log("\n── Trading Signals (12) ──");
  const signalBoard = await hre.ethers.getContractAt("SignalBoardV2", V2.SignalBoardV2);

  const signals = [
    { type: "BUY",  proto: "merchant_moe", tIn: USDC, tOut: WMNT, amtIn: "20000000000", minOut: "48000000000000000000", conf: 86, reason: "Ascending triangle breakout, volume confirmation" },
    { type: "BUY",  proto: "agni_finance", tIn: USDC, tOut: WMNT, amtIn: "35000000000", minOut: "84000000000000000000", conf: 79, reason: "Exchange outflow squeeze, 6h trend" },
    { type: "SELL", proto: "merchant_moe", tIn: WMNT, tOut: USDC, amtIn: "40000000000000000000", minOut: "15000000000", conf: 73, reason: "Take profit at 0.44 resistance, RSI 72" },
    { type: "BUY",  proto: "merchant_moe", tIn: USDC, tOut: WMNT, amtIn: "8000000000",  minOut: "19000000000000000000", conf: 92, reason: "CPI below expectations, risk-on macro rotation" },
    { type: "BUY",  proto: "agni_finance", tIn: USDC, tOut: WMNT, amtIn: "15000000000", minOut: "36000000000000000000", conf: 81, reason: "Negative funding rate, spot accumulation zone" },
    { type: "SELL", proto: "agni_finance", tIn: WMNT, tOut: USDC, amtIn: "20000000000000000000", minOut: "7800000000", conf: 68, reason: "Whale distribution detected, risk reduction" },
    { type: "BUY",  proto: "merchant_moe", tIn: USDC, tOut: WMNT, amtIn: "45000000000", minOut: "108000000000000000000", conf: 94, reason: "Ecosystem grant catalyst + TVL surge confirmation" },
    { type: "HOLD", proto: "merchant_moe", tIn: USDC, tOut: WMNT, amtIn: "0", minOut: "0", conf: 50, reason: "High IV environment, wait for vol crush post-FOMC" },
    { type: "BUY",  proto: "merchant_moe", tIn: USDC, tOut: WMNT, amtIn: "12000000000", minOut: "28000000000000000000", conf: 77, reason: "Order book imbalance, bid wall at 0.395 support" },
    { type: "SELL", proto: "merchant_moe", tIn: WMNT, tOut: USDC, amtIn: "35000000000000000000", minOut: "13500000000", conf: 75, reason: "End-of-day rebalancing, lock in 2.1% daily gain" },
    { type: "BUY",  proto: "agni_finance", tIn: USDC, tOut: WMNT, amtIn: "60000000000", minOut: "145000000000000000000", conf: 89, reason: "Multi-timeframe confluence: 1h/4h/1d all bullish" },
    { type: "BUY",  proto: "merchant_moe", tIn: USDC, tOut: WMNT, amtIn: "30000000000", minOut: "72000000000000000000", conf: 83, reason: "Decorrelation alpha play, MNT lagging ETH recovery" },
  ];

  for (const s of signals) {
    await logTx("Signal", `${s.type} ${s.proto} conf=${s.conf}%`,
      signalBoard.postSignal(s.type, s.proto, s.tIn, s.tOut, s.amtIn, s.minOut, s.conf, s.reason, hre.ethers.id(s.reason)));
  }

  // ═══════════════════════════════════════════════════════════════
  // 3. TEE ATTESTATIONS — 7 more
  // ═══════════════════════════════════════════════════════════════
  console.log("\n── TEE Attestations (7) ──");
  const teeVerifier = await hre.ethers.getContractAt("TEEAttestationVerifier", V3.TEEAttestationVerifier);
  const approvedCodeHash = hre.ethers.id("agentbank-analyst-tee-v1");

  const teeRuns = [
    { prompt: "MNT/USDC intraday momentum prediction", output: "Bullish +2.8% target", code: "analyst-v4.1" },
    { prompt: "Portfolio VaR 99% confidence interval", output: "VaR=-5.1%, ES=-7.3%", code: "risk-v2.1" },
    { prompt: "Optimal entry timing for BUY signal #9", output: "Enter at 0.398, limit order", code: "timing-v1.0" },
    { prompt: "Slippage prediction for 45k USDC swap", output: "Est slippage 0.18% via Agni", code: "slippage-v1.2" },
    { prompt: "Multi-model consensus aggregation", output: "3/3 models agree BUY, weight=0.87", code: "consensus-v1.0" },
    { prompt: "Whale behavior pattern classification", output: "Distribution phase, 72% confidence", code: "whale-v1.1" },
    { prompt: "End-of-day risk report generation", output: "All limits respected, Sharpe=1.8", code: "report-v1.0" },
  ];

  for (const run of teeRuns) {
    const promptHash = hre.ethers.id(run.prompt);
    const outputHash = hre.ethers.id(run.output);
    const msgHash = hre.ethers.solidityPackedKeccak256(
      ["uint8", "bytes32", "bytes32", "bytes32"], [0, promptHash, outputHash, approvedCodeHash]
    );
    const sig = await deployer.signMessage(hre.ethers.getBytes(msgHash));
    await logTx("TEE", `${run.code}: ${run.output.slice(0,30)}`,
      teeVerifier.attestRun(0, promptHash, outputHash, approvedCodeHash, sig));
  }

  // ═══════════════════════════════════════════════════════════════
  // 4. SIGNAL NFT — 7 more mints
  // ═══════════════════════════════════════════════════════════════
  console.log("\n── Signal NFT Minting (7) ──");
  const signalNFT = await hre.ethers.getContractAt("SignalNFT", V3.SignalNFT);

  const nfts = [
    { signalId: 4, pnl: 450,  reason: "ascending-triangle-breakout", att: "tee-att-4", uri: "ipfs://Qm_nft_004" },
    { signalId: 5, pnl: -280, reason: "exchange-outflow-play",       att: "tee-att-5", uri: "ipfs://Qm_nft_005" },
    { signalId: 6, pnl: 1200, reason: "macro-cpi-rotation",          att: "tee-att-6", uri: "ipfs://Qm_nft_006" },
    { signalId: 7, pnl: 680,  reason: "funding-rate-spot-buy",       att: "tee-att-7", uri: "ipfs://Qm_nft_007" },
    { signalId: 8, pnl: -90,  reason: "whale-distribution-sell",     att: "tee-att-8", uri: "ipfs://Qm_nft_008" },
    { signalId: 9, pnl: 2100, reason: "ecosystem-grant-catalyst",    att: "tee-att-9", uri: "ipfs://Qm_nft_009" },
    { signalId: 10, pnl: 340, reason: "multi-tf-confluence",         att: "tee-att-10", uri: "ipfs://Qm_nft_010" },
  ];

  for (const n of nfts) {
    await logTx("NFT", `Signal #${n.signalId} PnL=${n.pnl}bps`,
      signalNFT.mintExecutedSignal(analyst.address, n.signalId, n.pnl, hre.ethers.id(n.reason), hre.ethers.id(n.att), n.uri));
  }

  // ═══════════════════════════════════════════════════════════════
  // 5. COMMIT-REVEAL — 8 more commits
  // ═══════════════════════════════════════════════════════════════
  console.log("\n── Commit-Reveal Signals (8) ──");
  const commitReveal = await hre.ethers.getContractAt("CommitRevealSignal", V3.CommitRevealSignal);

  const commits = [
    "BUY-MNT-0.398-86-ascending-triangle",
    "BUY-MNT-0.401-79-exchange-outflow",
    "SELL-MNT-0.440-73-take-profit-resistance",
    "BUY-MNT-0.395-92-cpi-macro-rotation",
    "BUY-MNT-0.402-81-negative-funding",
    "SELL-MNT-0.435-68-whale-distribution",
    "BUY-MNT-0.410-94-tvl-catalyst",
    "BUY-MNT-0.405-83-decorrelation-alpha",
  ];

  for (let i = 0; i < commits.length; i++) {
    await logTx("CommitReveal", `Commit #${i+4}: ${commits[i].slice(0,30)}`,
      commitReveal.commit(hre.ethers.id(commits[i])));
  }

  // ═══════════════════════════════════════════════════════════════
  // 6. ABNK TOKEN — More transfers + burns
  // ═══════════════════════════════════════════════════════════════
  console.log("\n── ABNK Token Operations (10) ──");
  const abnkToken = await hre.ethers.getContractAt("ABNKToken", V3.ABNKToken);

  // Additional token distributions
  const distributions = [
    { to: analyst.address, amount: "250000", label: "analyst-performance-bonus" },
    { to: executor.address, amount: "150000", label: "executor-efficiency-reward" },
    { to: guard.address, amount: "200000", label: "guard-security-bonus" },
    { to: allocator.address, amount: "100000", label: "allocator-rebalance-reward" },
  ];

  for (const d of distributions) {
    await logTx("ABNK-Transfer", `${d.label}: ${d.amount} ABNK`,
      abnkToken.transfer(d.to, hre.ethers.parseEther(d.amount)));
  }

  // Mint more for liquidity pool setup
  await logTx("ABNK-Mint", "Mint 5M ABNK for LP bootstrap",
    abnkToken.mint(deployer.address, hre.ethers.parseEther("5000000")));

  // Burn some tokens (deflationary event)
  await logTx("ABNK-Burn", "Burn 500k ABNK (protocol buyback)",
    abnkToken.burn(hre.ethers.parseEther("500000")));

  // Transfer to signal NFT auction house for rewards
  await logTx("ABNK-Transfer", "1M ABNK to AuctionHouse rewards",
    abnkToken.transfer(V3.SignalAuctionHouse, hre.ethers.parseEther("1000000")));

  // Transfer to fee distributor
  await logTx("ABNK-Transfer", "2M ABNK to FeeDistributor",
    abnkToken.transfer("0x16c65fbe4220F0D0EC7cbB47Ad9B2956DbA9886d", hre.ethers.parseEther("2000000")));

  // Approve and additional VE lock
  const lockAmount2 = hre.ethers.parseEther("500000");
  await logTx("ABNK-Approve", "Approve VE for 500k ABNK",
    abnkToken.approve(V3.VotingEscrow, lockAmount2));

  // ═══════════════════════════════════════════════════════════════
  // 7. REPUTATION — 15 more feedbacks
  // ═══════════════════════════════════════════════════════════════
  console.log("\n── Reputation Feedback (15) ──");
  const reputation = await hre.ethers.getContractAt("ReputationRegistry", V2.ReputationRegistry);
  const identity = await hre.ethers.getContractAt("IdentityRegistry", V2.IdentityRegistry);

  const feedbacks = [
    { signer: analyst,   role: "analyst",   score: 78, reason: "Breakout signal confirmed, +4.5% in 6h window" },
    { signer: executor,  role: "executor",  score: 88, reason: "Batch execution saved 40% gas, 3 ops in 1 tx" },
    { signer: guard,     role: "guard",     score: 92, reason: "Caught whale dump signal, prevented 3.2% drawdown" },
    { signer: analyst,   role: "analyst",   score: 65, reason: "Exchange outflow signal delayed, entry 1.2% above optimal" },
    { signer: executor,  role: "executor",  score: 95, reason: "Agni concentrated LP entry, minimal price impact" },
    { signer: allocator, role: "allocator", score: 82, reason: "Tier rebalance aligned with vol regime change" },
    { signer: analyst,   role: "analyst",   score: 90, reason: "CPI macro call nailed perfectly, best signal of the day" },
    { signer: guard,     role: "guard",     score: 55, reason: "False positive on circuit breaker, unnecessary 10min pause" },
    { signer: analyst,   role: "analyst",   score: -35, reason: "Whale tracker signal too late, already priced in" },
    { signer: executor,  role: "executor",  score: 70, reason: "Slippage 0.3% on large order, acceptable but improvable" },
    { signer: analyst,   role: "analyst",   score: 88, reason: "Multi-timeframe confluence call, +8.1% realized" },
    { signer: allocator, role: "allocator", score: 68, reason: "LP rotation to Agni improved yield by 5.8% APR" },
    { signer: guard,     role: "guard",     score: 85, reason: "Proactive slippage check saved 1.8% on 45k swap" },
    { signer: analyst,   role: "analyst",   score: 72, reason: "Decorrelation alpha thesis valid, +3.4% excess return" },
    { signer: executor,  role: "executor",  score: 98, reason: "Perfect timing on limit order fill at 0.398 target" },
  ];

  for (const fb of feedbacks) {
    const agentAddr = { analyst: analyst.address, executor: executor.address, guard: guard.address, allocator: allocator.address }[fb.role];
    const agentId = await identity.agentByAddress(agentAddr);
    await logTx("Reputation", `${fb.role} score=${fb.score}`,
      reputation.submitFeedback(agentId, fb.score, hre.ethers.id(fb.reason), fb.reason));
  }

  // ═══════════════════════════════════════════════════════════════
  // 8. ANALYST WALLET — Signals posted by analyst directly
  // ═══════════════════════════════════════════════════════════════
  console.log("\n── Analyst-Posted Signals (5) ──");
  const sbAnalyst = signalBoard.connect(analyst);

  const analystSignals = [
    { type: "BUY",  proto: "merchant_moe", tIn: USDC, tOut: WMNT, amtIn: "10000000000", minOut: "24000000000000000000", conf: 87, reason: "Analyst direct: Bollinger band squeeze, expansion imminent" },
    { type: "BUY",  proto: "agni_finance", tIn: USDC, tOut: WMNT, amtIn: "20000000000", minOut: "48000000000000000000", conf: 81, reason: "Analyst direct: VWAP reclaim on 15m, continuation expected" },
    { type: "SELL", proto: "merchant_moe", tIn: WMNT, tOut: USDC, amtIn: "15000000000000000000", minOut: "5800000000", conf: 74, reason: "Analyst direct: Divergence between price and volume, reversal likely" },
    { type: "BUY",  proto: "merchant_moe", tIn: USDC, tOut: WMNT, amtIn: "40000000000", minOut: "96000000000000000000", conf: 93, reason: "Analyst direct: All 3 LLMs agree BUY with 87% consensus weight" },
    { type: "HOLD", proto: "agni_finance", tIn: USDC, tOut: WMNT, amtIn: "0", minOut: "0", conf: 52, reason: "Analyst direct: Mixed signals, await London session open for clarity" },
  ];

  for (const s of analystSignals) {
    await logTx("AnalystSignal", `${s.type} conf=${s.conf}%`,
      sbAnalyst.postSignal(s.type, s.proto, s.tIn, s.tOut, s.amtIn, s.minOut, s.conf, s.reason, hre.ethers.id(s.reason)));
  }

  // ═══════════════════════════════════════════════════════════════
  // 9. REASONING FROM ANALYST WALLET — 5 entries
  // ═══════════════════════════════════════════════════════════════
  console.log("\n── Analyst Reasoning (5) ──");
  const reasoningAnalyst = reasoning.connect(analyst);

  const analystReasonings = [
    { model: "deepseek-v4", prompt: "Self-assessment: my BUY signal accuracy over last 10 signals", output: "7/10 profitable, avg +2.3%, Sharpe 1.6", uri: "ipfs://Qm_ar001" },
    { model: "deepseek-v4", prompt: "Peer comparison: my signals vs executor fill quality", output: "Executor adds 0.8% alpha via optimal routing", uri: "ipfs://Qm_ar002" },
    { model: "llama-3-70b", prompt: "Model disagreement: deepseek says BUY, qwen says HOLD", output: "Weight deepseek 0.6, qwen 0.4 → net BUY with reduced size", uri: "ipfs://Qm_ar003" },
    { model: "deepseek-v4", prompt: "Risk budget: remaining daily allocation after 3 executed signals", output: "4.2% vault capacity remaining, max single position 2%", uri: "ipfs://Qm_ar004" },
    { model: "qwen-2.5-72b", prompt: "Market microstructure: bid-ask spread widening on Agni MNT/USDC", output: "Switch to Merchant Moe for next execution, better depth", uri: "ipfs://Qm_ar005" },
  ];

  for (const r of analystReasonings) {
    await logTx("AnalystReasoning", `${r.model}: ${r.output.slice(0,35)}...`,
      reasoningAnalyst.record(r.model, hre.ethers.id(r.prompt), hre.ethers.id(r.output), r.uri));
  }

  // ═══════════════════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════════════════
  console.log("\n\n══════════════════════════════════════════");
  console.log(`Total new transactions: ${txCount}`);
  console.log("Remaining:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "MNT");
  console.log("══════════════════════════════════════════\n");

  // Print summary per category
  for (const [cat, txs] of Object.entries(allTxs)) {
    console.log(`${cat}: ${txs.length} tx`);
    for (const t of txs) {
      console.log(`  ${t.detail} → ${t.hash}`);
    }
  }

  // Save tx log
  const fs = require("fs");
  const path = require("path");
  const logPath = path.join(__dirname, "..", "deployments", "activity_round4.json");
  fs.writeFileSync(logPath, JSON.stringify({ txCount, timestamp: new Date().toISOString(), categories: allTxs }, null, 2));
  console.log(`\nSaved to ${logPath}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => { console.error(error); process.exit(1); });

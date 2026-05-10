/**
 * Round 3: Authorize deployer as poster, then post signals + reputation
 */
const hre = require("hardhat");

const V2 = {
  SignalBoardV2: "0x2A46cF6493b377D45908254B0528e38990AA323f",
  ReputationRegistry: "0x494960e21058290BB2F1328b6b837dCF26aA5DCb",
  IdentityRegistry: "0x7058132Ba4aE19983c61590644F2943A3B7fDf80",
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
  console.log("Round 3 with:", deployer.address);
  let tx, receipt;

  // ═══ Authorize deployer as poster on SignalBoard ═══
  console.log("\n=== Authorizing deployer as poster ===");
  const signalBoard = await hre.ethers.getContractAt("SignalBoardV2", V2.SignalBoardV2);
  tx = await signalBoard.setAuthorizedPoster(deployer.address, true);
  await tx.wait();
  console.log("  Deployer authorized as poster");

  // ═══ Post signals ═══
  console.log("\n=== Trading Signals ===");
  const signals = [
    { type: "BUY",  proto: "merchant_moe", tIn: USDC, tOut: WMNT, amtIn: "10000000000", minOut: "24000000000000000000", conf: 82, reason: "Whale accumulation + RSI oversold bounce at 0.38 support" },
    { type: "SELL", proto: "agni_finance", tIn: WMNT, tOut: USDC, amtIn: "25000000000000000000", minOut: "9500000000", conf: 71, reason: "Bearish divergence on 4h MACD, stop at 0.39" },
    { type: "BUY",  proto: "merchant_moe", tIn: USDC, tOut: WMNT, amtIn: "25000000000", minOut: "60000000000000000000", conf: 88, reason: "ETH breakout above 3800, MNT beta play via vault reallocation" },
    { type: "BUY",  proto: "merchant_moe", tIn: USDC, tOut: WMNT, amtIn: "5000000000",  minOut: "12000000000000000000", conf: 65, reason: "Consolidation range, small position for breakout capture" },
    { type: "BUY",  proto: "agni_finance", tIn: USDC, tOut: WMNT, amtIn: "50000000000", minOut: "120000000000000000000", conf: 91, reason: "Mantle TVL surge +15%, strong ecosystem momentum" },
    { type: "SELL", proto: "merchant_moe", tIn: WMNT, tOut: USDC, amtIn: "30000000000000000000", minOut: "11000000000", conf: 77, reason: "Profit taking after 8% run, RSI overbought at 74" },
    { type: "BUY",  proto: "merchant_moe", tIn: USDC, tOut: WMNT, amtIn: "15000000000", minOut: "36000000000000000000", conf: 84, reason: "Institutional inflows detected via on-chain metrics" },
    { type: "HOLD", proto: "merchant_moe", tIn: USDC, tOut: WMNT, amtIn: "0", minOut: "0", conf: 55, reason: "Unclear macro, wait for FOMC decision" },
  ];

  for (let i = 0; i < signals.length; i++) {
    const s = signals[i];
    try {
      tx = await signalBoard.postSignal(s.type, s.proto, s.tIn, s.tOut, s.amtIn, s.minOut, s.conf, s.reason, hre.ethers.id(s.reason));
      receipt = await tx.wait();
      console.log(`  Signal #${i+1}: ${s.type} ${s.proto} conf=${s.conf}% (tx: ${receipt.hash})`);
    } catch (err) {
      console.log(`  Skip signal #${i+1}: ${err.message.slice(0, 120)}`);
    }
  }

  // ═══ Reputation: authorize deployer for each agent, then submit ═══
  console.log("\n=== Reputation Feedback ===");
  const reputation = await hre.ethers.getContractAt("ReputationRegistry", V2.ReputationRegistry);
  const identity = await hre.ethers.getContractAt("IdentityRegistry", V2.IdentityRegistry);

  // First get the deployer's own agentId (we registered deployer as admin agent)
  const deployerAgentId = await identity.agentByAddress(deployer.address);
  console.log("  Deployer agentId:", deployerAgentId.toString());

  // For ReputationRegistry.authorize: the agent owner calls authorize(agentId, client)
  // Since deployer registered these agents, deployer should be able to authorize
  for (const [role, addr] of Object.entries(AGENTS)) {
    try {
      const agentId = await identity.agentByAddress(addr);
      console.log(`  ${role} agentId: ${agentId.toString()}`);
      tx = await reputation.authorize(agentId, deployer.address);
      await tx.wait();
      console.log(`    Authorized deployer as ${role} client`);
    } catch (e) {
      console.log(`    Auth skip ${role}: ${e.message.slice(0, 80)}`);
    }
  }

  // Submit feedback
  const feedbacks = [
    { role: "analyst",  score: 45,  reason: "Accurate BUY signal, realized +3.2% in 8h" },
    { role: "executor", score: 80,  reason: "Clean execution via Merchant Moe, 0.12% slippage" },
    { role: "guard",    score: 60,  reason: "Correctly flagged high-slippage trade, saved 2.1% loss" },
    { role: "analyst",  score: -20, reason: "Premature SELL signal, missed 4% upside before reversal" },
    { role: "executor", score: 90,  reason: "Optimal split order fill across 3 tranches" },
    { role: "guard",    score: 70,  reason: "Timely circuit breaker trigger during flash crash" },
    { role: "analyst",  score: 85,  reason: "Called TVL surge momentum play perfectly" },
  ];

  for (let i = 0; i < feedbacks.length; i++) {
    const fb = feedbacks[i];
    try {
      const agentId = await identity.agentByAddress(AGENTS[fb.role]);
      tx = await reputation.submitFeedback(agentId, fb.score, hre.ethers.id(fb.reason), fb.reason);
      receipt = await tx.wait();
      console.log(`  Feedback #${i+1}: ${fb.role} score=${fb.score} (tx: ${receipt.hash})`);
    } catch (err) {
      console.log(`  Skip feedback #${i+1}: ${err.message.slice(0, 100)}`);
    }
  }

  console.log("\n=== Round 3 complete ===");
  console.log("Remaining:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "MNT");
}

main()
  .then(() => process.exit(0))
  .catch((error) => { console.error(error); process.exit(1); });

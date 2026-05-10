/**
 * Generate reputation records using agent wallets to authorize, then deployer submits feedback
 */
const hre = require("hardhat");

const V2 = {
  ReputationRegistry: "0x494960e21058290BB2F1328b6b837dCF26aA5DCb",
  IdentityRegistry: "0x7058132Ba4aE19983c61590644F2943A3B7fDf80",
};

async function main() {
  // signers[0]=owner, [1]=analyst, [2]=executor, [3]=guard, [4]=allocator
  const signers = await hre.ethers.getSigners();
  const deployer = signers[0];
  const agentSigners = {
    analyst:   signers[1],
    executor:  signers[2],
    guard:     signers[3],
    allocator: signers[4],
  };

  console.log("Deployer:", deployer.address);

  const reputation = await hre.ethers.getContractAt("ReputationRegistry", V2.ReputationRegistry);
  const identity = await hre.ethers.getContractAt("IdentityRegistry", V2.IdentityRegistry);

  let tx, receipt;

  // Step 1: Each agent authorizes deployer as a reputation client
  console.log("\n=== Authorizing deployer as reputation client ===");
  for (const [role, signer] of Object.entries(agentSigners)) {
    try {
      const agentId = await identity.agentByAddress(signer.address);
      console.log(`  ${role} (${signer.address}) agentId=${agentId}`);
      tx = await reputation.connect(signer).authorize(agentId, deployer.address);
      receipt = await tx.wait();
      console.log(`    Authorized deployer (tx: ${receipt.hash})`);
    } catch (e) {
      console.log(`    Skip ${role}: ${e.message.slice(0, 80)}`);
    }
  }

  // Step 2: Deployer submits feedback for each agent
  console.log("\n=== Submitting Reputation Feedback ===");
  const feedbacks = [
    { role: "analyst",   score: 45,  reason: "Accurate BUY signal on MNT, realized +3.2% in 8h window" },
    { role: "executor",  score: 80,  reason: "Clean execution via Merchant Moe router, only 0.12% slippage" },
    { role: "guard",     score: 60,  reason: "Correctly flagged and blocked high-slippage trade, saved 2.1% loss" },
    { role: "analyst",   score: -20, reason: "Premature SELL signal at 0.39, missed subsequent 4% rally" },
    { role: "executor",  score: 90,  reason: "Optimal split order fill across 3 tranches, avg slippage 0.05%" },
    { role: "guard",     score: 70,  reason: "Timely circuit breaker during flash crash, prevented cascade" },
    { role: "analyst",   score: 85,  reason: "Called TVL surge momentum perfectly, +8.7% PnL realized" },
    { role: "allocator", score: 75,  reason: "Tier rebalancing reduced drawdown from 6% to 3.2%" },
    { role: "analyst",   score: 55,  reason: "HOLD signal appropriate during range consolidation" },
    { role: "executor",  score: 95,  reason: "Executed 50k USDC swap with only 0.08% impact via Agni" },
  ];

  for (let i = 0; i < feedbacks.length; i++) {
    const fb = feedbacks[i];
    try {
      const agentAddr = agentSigners[fb.role].address;
      const agentId = await identity.agentByAddress(agentAddr);
      tx = await reputation.submitFeedback(agentId, fb.score, hre.ethers.id(fb.reason), fb.reason);
      receipt = await tx.wait();
      console.log(`  Feedback #${i+1}: ${fb.role} score=${fb.score} (tx: ${receipt.hash})`);
    } catch (err) {
      console.log(`  Skip feedback #${i+1}: ${err.message.slice(0, 100)}`);
    }
  }

  console.log("\n=== Reputation generation complete ===");
  console.log("Remaining:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "MNT");
}

main()
  .then(() => process.exit(0))
  .catch((error) => { console.error(error); process.exit(1); });

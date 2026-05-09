const { ethers } = require("hardhat");
const fs = require("fs");

/**
 * Seed initial state after V2 deployment.
 * - Register all core agents in IdentityRegistry
 * - Set up reputation authorizations
 * - Set Pyth price IDs
 * - Stake agents in SlashingPool
 * - Seed allowedCall mappings
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Seeding with account:", deployer.address);

  // Load deployment addresses
  const network = hre.network.name;
  const deploymentPath = `./deployments/v2_${network}.json`;
  let addresses;
  try {
    addresses = JSON.parse(fs.readFileSync(deploymentPath, "utf-8"));
  } catch {
    console.error(`No deployment found at ${deploymentPath}. Run deploy first.`);
    process.exit(1);
  }

  // Contracts
  const identity = await ethers.getContractAt("IdentityRegistry", addresses.identity);
  const reputation = await ethers.getContractAt("ReputationRegistry", addresses.reputation);
  const riskOracle = await ethers.getContractAt("RiskOracle", addresses.riskOracle);
  const slashing = await ethers.getContractAt("SlashingPool", addresses.slashing);

  // ─── 1. Register Core Agents ───────────────────────────────────────
  const agents = [
    { address: addresses.executor || deployer.address, domain: "agentbank.xyz/executor-1", type: "executor" },
    { address: addresses.guard || deployer.address, domain: "agentbank.xyz/guard-1", type: "guard" },
    { address: addresses.allocator || deployer.address, domain: "agentbank.xyz/allocator-1", type: "allocator" },
    { address: addresses.analyst || deployer.address, domain: "agentbank.xyz/analyst-deepseek", type: "analyst" },
  ];

  for (const agent of agents) {
    try {
      const existing = await identity.agentByAddress(agent.address);
      if (existing.toString() === "0") {
        const tx = await identity.registerAgent(
          agent.address,
          agent.domain,
          agent.type,
          ethers.id(agent.domain)
        );
        await tx.wait();
        console.log(`  Registered ${agent.type}: ${agent.address}`);
      } else {
        console.log(`  Already registered: ${agent.type} (id=${existing})`);
      }
    } catch (e) {
      console.log(`  Skip ${agent.type}: ${e.message}`);
    }
  }

  // ─── 2. Set Pyth Price IDs ─────────────────────────────────────────
  // Mantle Pyth price feed IDs
  const priceFeeds = [
    { token: "0x09Bc4E0D864854c6aFB6eB9A9cdF58aC190D0dF9", id: "0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a" }, // USDC/USD
    { token: "0xdEAddEaDdeadDEadDEADDEAddEADDEAddead1111", id: "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace" }, // ETH/USD
    { token: "0x78c1b0C915c4FAA5FffA6CAbf0219DA63d7f4cb8", id: "0x4e3037c822d852d79af3ac80e35eb420ee3b870dca49f9571b43e2f60ed2f17e" }, // MNT/USD
  ];

  for (const feed of priceFeeds) {
    try {
      const tx = await riskOracle.setPriceId(feed.token, feed.id);
      await tx.wait();
      console.log(`  Price feed set for ${feed.token.slice(0, 10)}...`);
    } catch (e) {
      console.log(`  Skip price feed: ${e.message}`);
    }
  }

  // ─── 3. Stake Agents in SlashingPool ───────────────────────────────
  const stakeAmount = ethers.parseEther("5");
  try {
    const tx = await slashing.stake({ value: stakeAmount });
    await tx.wait();
    console.log(`  Staked ${ethers.formatEther(stakeAmount)} MNT for deployer`);
  } catch (e) {
    console.log(`  Staking skip: ${e.message}`);
  }

  // ─── 4. Authorize Vault as Reputation Client ───────────────────────
  for (const agent of agents) {
    try {
      const agentId = await identity.agentByAddress(agent.address);
      if (agentId.toString() !== "0" && addresses.tiers) {
        for (const tierAddr of Object.values(addresses.tiers)) {
          await reputation.connect(deployer).authorize(agentId, tierAddr);
        }
      }
    } catch (e) {
      // Expected if deployer doesn't own the agent
    }
  }

  console.log("\n✅ Seeding complete!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

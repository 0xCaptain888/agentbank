const { run } = require("hardhat");
const fs = require("fs");

/**
 * Verify all V2 contracts on MantleScan / block explorer.
 */
async function main() {
  const network = hre.network.name;
  const deploymentPath = `./deployments/v2_${network}.json`;

  let addresses;
  try {
    addresses = JSON.parse(fs.readFileSync(deploymentPath, "utf-8"));
  } catch {
    console.error(`No deployment found at ${deploymentPath}`);
    process.exit(1);
  }

  const contracts = [
    { name: "AgentBankTimelock", address: addresses.timelock },
    { name: "IdentityRegistry", address: addresses.identity },
    { name: "ReputationRegistry", address: addresses.reputation, args: [addresses.identity] },
    { name: "ValidationRegistry", address: addresses.validation, args: [addresses.identity] },
    { name: "LLMReasoningRegistry", address: addresses.llmRegistry },
    { name: "CircuitBreaker", address: addresses.circuitBreaker, args: [addresses.timelock] },
    { name: "RiskOracle", address: addresses.riskOracle },
    { name: "SlashingPool", address: addresses.slashing, args: [addresses.timelock, addresses.insurance] },
    { name: "InsurancePool", address: addresses.insurance },
    { name: "DEXAdapter", address: addresses.dexAdapter },
    { name: "AnalystRegistry", address: addresses.analystRegistry },
    { name: "MultiTierFactory", address: addresses.multiTierFactory },
    { name: "RWAStrategy", address: addresses.rwa },
  ];

  for (const c of contracts) {
    if (!c.address) {
      console.log(`⏭  Skip ${c.name} (no address)`);
      continue;
    }
    try {
      console.log(`🔍 Verifying ${c.name} at ${c.address}...`);
      await run("verify:verify", {
        address: c.address,
        constructorArguments: c.args || [],
      });
      console.log(`✅ ${c.name} verified`);
    } catch (e) {
      if (e.message.includes("Already Verified")) {
        console.log(`✅ ${c.name} already verified`);
      } else {
        console.log(`❌ ${c.name}: ${e.message}`);
      }
    }
  }

  console.log("\n🏁 Verification complete!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

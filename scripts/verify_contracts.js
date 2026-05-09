const { run } = require("hardhat");
require("dotenv").config();

async function main() {
  const network = process.env.NETWORK_NAME || "mantle_sepolia";

  const VAULT_ADDRESS = process.env.VAULT_CONTRACT_ADDRESS;
  const SIGNAL_BOARD_ADDRESS = process.env.SIGNAL_BOARD_ADDRESS;
  const AGENT_IDENTITY_ADDRESS = process.env.AGENT_IDENTITY_ADDRESS;
  const USDC_ADDRESS = process.env.USDC_ADDRESS;

  const executorWallet  = new (require("ethers").Wallet)(process.env.EXECUTOR_PRIVATE_KEY);
  const guardWallet     = new (require("ethers").Wallet)(process.env.GUARD_PRIVATE_KEY);
  const allocatorWallet = new (require("ethers").Wallet)(process.env.ALLOCATOR_PRIVATE_KEY);

  console.log(`Verifying contracts on ${network}...`);

  // Verify AgentIdentity
  try {
    await run("verify:verify", {
      address: AGENT_IDENTITY_ADDRESS,
      constructorArguments: [],
    });
    console.log("AgentIdentity verified");
  } catch (e) {
    console.log("AgentIdentity verification:", e.message);
  }

  // Verify SignalBoard
  try {
    await run("verify:verify", {
      address: SIGNAL_BOARD_ADDRESS,
      constructorArguments: [],
    });
    console.log("SignalBoard verified");
  } catch (e) {
    console.log("SignalBoard verification:", e.message);
  }

  // Verify AgentBankVault
  try {
    await run("verify:verify", {
      address: VAULT_ADDRESS,
      constructorArguments: [
        USDC_ADDRESS,
        executorWallet.address,
        guardWallet.address,
        allocatorWallet.address,
        AGENT_IDENTITY_ADDRESS,
      ],
    });
    console.log("AgentBankVault verified");
  } catch (e) {
    console.log("AgentBankVault verification:", e.message);
  }

  console.log("\n=== Verification Complete ===");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

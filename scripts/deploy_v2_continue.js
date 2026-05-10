const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [owner] = await ethers.getSigners();
  console.log("Deployer:", owner.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(owner.address)), "MNT");

  const usdcAddress = process.env.MAINNET_USDC_ADDRESS;
  const executorAddress = process.env.EXECUTOR_ADDRESS;
  const guardAddress = process.env.GUARD_ADDRESS;
  const allocatorAddress = process.env.ALLOCATOR_ADDRESS;

  // Already deployed contracts
  const deployed = {
    IdentityRegistry: "0x7058132Ba4aE19983c61590644F2943A3B7fDf80",
    ReputationRegistry: "0x494960e21058290BB2F1328b6b837dCF26aA5DCb",
    LLMReasoningRegistry: "0x8a8C3532359aAACb6C3a1060deF4938F6006c8F1",
    SignalBoardV2: "0x2A46cF6493b377D45908254B0528e38990AA323f"
  };
  const txHashes = {};

  // 5. Deploy AgentBankVaultV2
  console.log("[5/6] Deploying AgentBankVaultV2...");
  const timelockAddress = owner.address;
  const AgentBankVaultV2 = await ethers.getContractFactory("AgentBankVaultV2");
  const vault = await AgentBankVaultV2.deploy(usdcAddress, executorAddress, guardAddress, allocatorAddress, timelockAddress);
  await vault.waitForDeployment();
  deployed.AgentBankVaultV2 = await vault.getAddress();
  txHashes.AgentBankVaultV2 = vault.deploymentTransaction().hash;
  console.log("  AgentBankVaultV2:", deployed.AgentBankVaultV2);

  // 6. Wire up SignalBoard permissions
  console.log("[6/6] Wiring SignalBoard permissions...");
  const signalBoard = await ethers.getContractAt("SignalBoardV2", deployed.SignalBoardV2);

  let tx;
  tx = await signalBoard.authorizePoster(executorAddress);
  await tx.wait();
  tx = await signalBoard.authorizeExecutor(executorAddress);
  await tx.wait();
  console.log("  Authorized executor on SignalBoard");

  // Verify USDC
  const usdcCode = await ethers.provider.getCode(usdcAddress);
  if (usdcCode === "0x") {
    console.log("  WARNING: USDC address has no code.");
  } else {
    console.log("  USDC contract verified at:", usdcAddress);
  }

  // Save
  const deploymentData = {
    network: "mantle",
    chainId: 5000,
    deployer: owner.address,
    timestamp: new Date().toISOString(),
    contracts: deployed,
    transactions: txHashes,
    dependencies: { usdc: usdcAddress }
  };

  const outputPath = path.join(__dirname, "..", "deployments.json");
  fs.writeFileSync(outputPath, JSON.stringify(deploymentData, null, 2));
  console.log("\n=== V2 Deployment Complete ===");
  console.log(JSON.stringify(deployed, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });

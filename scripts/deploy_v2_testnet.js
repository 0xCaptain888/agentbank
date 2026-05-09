const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [owner] = await ethers.getSigners();
  console.log("=== AgentBank V2 Testnet Deployment (Mantle Sepolia) ===");
  console.log("Deployer:", owner.address);
  console.log("Network:", (await ethers.provider.getNetwork()).chainId.toString());
  console.log("");

  const deployed = {};

  // 1. Deploy Mock USDC (testnet only)
  console.log("[1/7] Deploying MockERC20 (USDC)...");
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const usdc = await MockERC20.deploy("USD Coin", "USDC", 6);
  await usdc.waitForDeployment();
  deployed.MockUSDC = await usdc.getAddress();
  console.log("  MockUSDC:", deployed.MockUSDC);

  // 2. Deploy IdentityRegistry
  console.log("[2/7] Deploying IdentityRegistry...");
  const IdentityRegistry = await ethers.getContractFactory("IdentityRegistry");
  const identity = await IdentityRegistry.deploy();
  await identity.waitForDeployment();
  deployed.IdentityRegistry = await identity.getAddress();
  console.log("  IdentityRegistry:", deployed.IdentityRegistry);

  // 3. Deploy ReputationRegistry (depends on IdentityRegistry)
  console.log("[3/7] Deploying ReputationRegistry...");
  const ReputationRegistry = await ethers.getContractFactory("ReputationRegistry");
  const reputation = await ReputationRegistry.deploy(deployed.IdentityRegistry);
  await reputation.waitForDeployment();
  deployed.ReputationRegistry = await reputation.getAddress();
  console.log("  ReputationRegistry:", deployed.ReputationRegistry);

  // 4. Deploy LLMReasoningRegistry
  console.log("[4/7] Deploying LLMReasoningRegistry...");
  const LLMReasoningRegistry = await ethers.getContractFactory("LLMReasoningRegistry");
  const reasoning = await LLMReasoningRegistry.deploy();
  await reasoning.waitForDeployment();
  deployed.LLMReasoningRegistry = await reasoning.getAddress();
  console.log("  LLMReasoningRegistry:", deployed.LLMReasoningRegistry);

  // 5. Deploy SignalBoardV2
  console.log("[5/7] Deploying SignalBoardV2...");
  const SignalBoardV2 = await ethers.getContractFactory("SignalBoardV2");
  const signalBoard = await SignalBoardV2.deploy();
  await signalBoard.waitForDeployment();
  deployed.SignalBoardV2 = await signalBoard.getAddress();
  console.log("  SignalBoardV2:", deployed.SignalBoardV2);

  // 6. Deploy AgentBankVaultV2
  console.log("[6/7] Deploying AgentBankVaultV2...");
  const AgentBankVaultV2 = await ethers.getContractFactory("AgentBankVaultV2");
  const vault = await AgentBankVaultV2.deploy(deployed.MockUSDC);
  await vault.waitForDeployment();
  deployed.AgentBankVaultV2 = await vault.getAddress();
  console.log("  AgentBankVaultV2:", deployed.AgentBankVaultV2);

  // 7. Wire up permissions
  console.log("[7/7] Wiring permissions...");

  // Grant EXECUTOR_ROLE on vault to deployer (for testnet testing)
  const EXECUTOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("EXECUTOR_ROLE"));
  const GUARD_ROLE = ethers.keccak256(ethers.toUtf8Bytes("GUARD_ROLE"));
  const ALLOCATOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("ALLOCATOR_ROLE"));

  let tx;
  tx = await vault.grantRole(EXECUTOR_ROLE, owner.address);
  await tx.wait();
  console.log("  Granted EXECUTOR_ROLE to deployer");

  tx = await vault.grantRole(GUARD_ROLE, owner.address);
  await tx.wait();
  console.log("  Granted GUARD_ROLE to deployer");

  tx = await vault.grantRole(ALLOCATOR_ROLE, owner.address);
  await tx.wait();
  console.log("  Granted ALLOCATOR_ROLE to deployer");

  // Authorize deployer as poster and executor on SignalBoard
  tx = await signalBoard.authorizePoster(owner.address);
  await tx.wait();
  console.log("  Authorized deployer as SignalBoard poster");

  tx = await signalBoard.authorizeExecutor(owner.address);
  await tx.wait();
  console.log("  Authorized deployer as SignalBoard executor");

  // Mint testnet USDC to deployer
  tx = await usdc.mint(owner.address, ethers.parseUnits("1000000", 6));
  await tx.wait();
  console.log("  Minted 1M testnet USDC to deployer");

  // Save deployment addresses
  const deploymentData = {
    network: "mantle_sepolia",
    chainId: 5003,
    deployer: owner.address,
    timestamp: new Date().toISOString(),
    contracts: deployed
  };

  const outputPath = path.join(__dirname, "..", "deployments.json");
  fs.writeFileSync(outputPath, JSON.stringify(deploymentData, null, 2));
  console.log("");
  console.log("=== Deployment Complete ===");
  console.log("Addresses saved to:", outputPath);
  console.log(JSON.stringify(deployed, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });

const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [owner] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);

  // Safety checks for mainnet
  if (chainId !== 5000) {
    throw new Error(`Expected Mantle mainnet (chainId 5000), got chainId ${chainId}`);
  }

  if (!process.env.OWNER_PRIVATE_KEY) {
    throw new Error("OWNER_PRIVATE_KEY not set in environment");
  }

  if (!process.env.MAINNET_USDC_ADDRESS) {
    throw new Error("MAINNET_USDC_ADDRESS not set. Set the USDC token address on Mantle mainnet.");
  }

  const usdcAddress = process.env.MAINNET_USDC_ADDRESS;

  // Verify deployer balance
  const balance = await ethers.provider.getBalance(owner.address);
  const minBalance = ethers.parseEther("1"); // At least 1 MNT for deployment gas
  if (balance < minBalance) {
    throw new Error(
      `Insufficient deployer balance: ${ethers.formatEther(balance)} MNT. Need at least 1 MNT.`
    );
  }

  console.log("=== AgentBank V2 Mainnet Deployment (Mantle) ===");
  console.log("Deployer:", owner.address);
  console.log("Balance:", ethers.formatEther(balance), "MNT");
  console.log("USDC Address:", usdcAddress);
  console.log("Chain ID:", chainId);
  console.log("");

  // Confirm deployment (manual check in CI - script continues after delay)
  console.log("WARNING: This is a MAINNET deployment. Proceeding in 5 seconds...");
  await new Promise((r) => setTimeout(r, 5000));

  const deployed = {};
  const txHashes = {};

  // 1. Deploy IdentityRegistry
  console.log("[1/6] Deploying IdentityRegistry...");
  const IdentityRegistry = await ethers.getContractFactory("IdentityRegistry");
  const identity = await IdentityRegistry.deploy();
  await identity.waitForDeployment();
  deployed.IdentityRegistry = await identity.getAddress();
  txHashes.IdentityRegistry = identity.deploymentTransaction().hash;
  console.log("  IdentityRegistry:", deployed.IdentityRegistry);

  // 2. Deploy ReputationRegistry
  console.log("[2/6] Deploying ReputationRegistry...");
  const ReputationRegistry = await ethers.getContractFactory("ReputationRegistry");
  const reputation = await ReputationRegistry.deploy(deployed.IdentityRegistry);
  await reputation.waitForDeployment();
  deployed.ReputationRegistry = await reputation.getAddress();
  txHashes.ReputationRegistry = reputation.deploymentTransaction().hash;
  console.log("  ReputationRegistry:", deployed.ReputationRegistry);

  // 3. Deploy LLMReasoningRegistry
  console.log("[3/6] Deploying LLMReasoningRegistry...");
  const LLMReasoningRegistry = await ethers.getContractFactory("LLMReasoningRegistry");
  const reasoning = await LLMReasoningRegistry.deploy();
  await reasoning.waitForDeployment();
  deployed.LLMReasoningRegistry = await reasoning.getAddress();
  txHashes.LLMReasoningRegistry = reasoning.deploymentTransaction().hash;
  console.log("  LLMReasoningRegistry:", deployed.LLMReasoningRegistry);

  // 4. Deploy SignalBoardV2
  console.log("[4/6] Deploying SignalBoardV2...");
  const SignalBoardV2 = await ethers.getContractFactory("SignalBoardV2");
  const signalBoard = await SignalBoardV2.deploy();
  await signalBoard.waitForDeployment();
  deployed.SignalBoardV2 = await signalBoard.getAddress();
  txHashes.SignalBoardV2 = signalBoard.deploymentTransaction().hash;
  console.log("  SignalBoardV2:", deployed.SignalBoardV2);

  // 5. Deploy AgentBankVaultV2
  console.log("[5/6] Deploying AgentBankVaultV2...");
  const executorAddress = process.env.EXECUTOR_ADDRESS;
  const guardAddress = process.env.GUARD_ADDRESS;
  const allocatorAddress = process.env.ALLOCATOR_ADDRESS;
  const timelockAddress = owner.address; // owner acts as timelock for now
  const AgentBankVaultV2 = await ethers.getContractFactory("AgentBankVaultV2");
  const vault = await AgentBankVaultV2.deploy(usdcAddress, executorAddress, guardAddress, allocatorAddress, timelockAddress);
  await vault.waitForDeployment();
  deployed.AgentBankVaultV2 = await vault.getAddress();
  txHashes.AgentBankVaultV2 = vault.deploymentTransaction().hash;
  console.log("  AgentBankVaultV2:", deployed.AgentBankVaultV2);

  // 6. Wire up permissions with dedicated agent wallets
  console.log("[6/6] Wiring permissions...");

  if (!executorAddress || !guardAddress || !allocatorAddress) {
    console.log("  WARNING: Agent addresses not set. Skipping role grants.");
    console.log("  Set EXECUTOR_ADDRESS, GUARD_ADDRESS, ALLOCATOR_ADDRESS to wire roles.");
  } else {
    const EXECUTOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("EXECUTOR_ROLE"));
    const GUARD_ROLE = ethers.keccak256(ethers.toUtf8Bytes("GUARD_ROLE"));
    const ALLOCATOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("ALLOCATOR_ROLE"));

    let tx;
    tx = await vault.grantRole(EXECUTOR_ROLE, executorAddress);
    await tx.wait();
    console.log("  Granted EXECUTOR_ROLE to:", executorAddress);

    tx = await vault.grantRole(GUARD_ROLE, guardAddress);
    await tx.wait();
    console.log("  Granted GUARD_ROLE to:", guardAddress);

    tx = await vault.grantRole(ALLOCATOR_ROLE, allocatorAddress);
    await tx.wait();
    console.log("  Granted ALLOCATOR_ROLE to:", allocatorAddress);

    // Authorize executor on SignalBoard
    tx = await signalBoard.authorizePoster(executorAddress);
    await tx.wait();
    tx = await signalBoard.authorizeExecutor(executorAddress);
    await tx.wait();
    console.log("  Authorized executor on SignalBoard");
  }

  // Verify USDC contract is accessible
  const usdcCode = await ethers.provider.getCode(usdcAddress);
  if (usdcCode === "0x") {
    console.log("  WARNING: USDC address has no code. Double-check the address.");
  } else {
    console.log("  USDC contract verified at:", usdcAddress);
  }

  // Save deployment addresses
  const deploymentData = {
    network: "mantle",
    chainId: 5000,
    deployer: owner.address,
    timestamp: new Date().toISOString(),
    contracts: deployed,
    transactions: txHashes,
    dependencies: {
      usdc: usdcAddress
    }
  };

  const outputPath = path.join(__dirname, "..", "deployments.json");
  fs.writeFileSync(outputPath, JSON.stringify(deploymentData, null, 2));
  console.log("");
  console.log("=== Mainnet Deployment Complete ===");
  console.log("Addresses saved to:", outputPath);
  console.log(JSON.stringify(deployed, null, 2));
  console.log("");
  console.log("Next steps:");
  console.log("  1. Verify contracts on MantleScan");
  console.log("  2. Transfer ownership to multisig/timelock");
  console.log("  3. Update subgraph manifest with deployed addresses");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Mainnet deployment failed:", error);
    process.exit(1);
  });

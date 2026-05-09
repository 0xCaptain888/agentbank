const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [owner] = await ethers.getSigners();
  console.log("Deploying with:", owner.address);

  // 1. Deploy AgentIdentity
  const AgentIdentity = await ethers.getContractFactory("AgentIdentity");
  const identity = await AgentIdentity.deploy();
  await identity.waitForDeployment();
  console.log("AgentIdentity deployed:", await identity.getAddress());

  // 2. Deploy SignalBoard
  const SignalBoard = await ethers.getContractFactory("SignalBoard");
  const signalBoard = await SignalBoard.deploy();
  await signalBoard.waitForDeployment();
  console.log("SignalBoard deployed:", await signalBoard.getAddress());

  // 3. Deploy Mock USDC for testnet
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const usdc = await MockERC20.deploy("USD Coin", "USDC", 6);
  await usdc.waitForDeployment();
  console.log("MockUSDC deployed:", await usdc.getAddress());

  // Agent wallets (from env)
  const executorWallet  = new ethers.Wallet(process.env.EXECUTOR_PRIVATE_KEY);
  const guardWallet     = new ethers.Wallet(process.env.GUARD_PRIVATE_KEY);
  const allocatorWallet = new ethers.Wallet(process.env.ALLOCATOR_PRIVATE_KEY);
  const analystWallet   = new ethers.Wallet(process.env.ANALYST_PRIVATE_KEY);

  // 4. Deploy AgentBankVault
  const Vault = await ethers.getContractFactory("AgentBankVault");
  const vault = await Vault.deploy(
    await usdc.getAddress(),
    executorWallet.address,
    guardWallet.address,
    allocatorWallet.address,
    await identity.getAddress()
  );
  await vault.waitForDeployment();
  console.log("AgentBankVault deployed:", await vault.getAddress());

  // 5. Set up SignalBoard permissions
  await signalBoard.setAuthorizedPoster(analystWallet.address, true);
  await signalBoard.setAuthorizedExecutor(executorWallet.address, true);

  // 6. Mint ERC-8004 identity NFTs for each agent
  await identity.mintAgent(analystWallet.address,  "Analyst Agent",  "analyst");
  await identity.mintAgent(executorWallet.address, "Executor Agent", "executor");
  await identity.mintAgent(guardWallet.address,    "Guard Agent",    "guard");
  await identity.mintAgent(allocatorWallet.address,"Allocator Agent","allocator");
  await identity.setAuthorizedUpdater(await vault.getAddress(), true);

  console.log("\n=== Deployment Complete ===");
  console.log(`VAULT_CONTRACT_ADDRESS=${await vault.getAddress()}`);
  console.log(`SIGNAL_BOARD_ADDRESS=${await signalBoard.getAddress()}`);
  console.log(`AGENT_IDENTITY_ADDRESS=${await identity.getAddress()}`);
  console.log(`USDC_ADDRESS=${await usdc.getAddress()}`);

  // Export ABIs
  const abiDir = path.join(__dirname, "../contracts/abi");
  if (!fs.existsSync(abiDir)) fs.mkdirSync(abiDir, { recursive: true });

  const contractNames = ["AgentBankVault", "SignalBoard", "AgentIdentity"];
  for (const name of contractNames) {
    const artifact = await ethers.getContractFactory(name);
    const abi = artifact.interface.formatJson();
    fs.writeFileSync(
      path.join(abiDir, `${name}.json`),
      JSON.stringify(JSON.parse(abi), null, 2)
    );
    console.log(`ABI exported: contracts/abi/${name}.json`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

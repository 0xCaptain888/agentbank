/**
 * AgentBank V3 Deployment Script
 * Deploys all V3 contracts (M19-M28) on Mantle
 */

const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying V3 contracts with:", deployer.address);
  console.log("Network:", hre.network.name);
  console.log("Balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "MNT");

  const deployed = {};

  // ─── M19: Decentralized AI Inference ─────────────────────────────────────

  // AlloraConsumer (placeholder Allora address — replace with real address on mainnet)
  const alloraAddress = process.env.ALLORA_CONSUMER_ADDRESS || deployer.address;
  const AlloraConsumer = await hre.ethers.getContractFactory("AlloraConsumer");
  const alloraConsumer = await AlloraConsumer.deploy(alloraAddress);
  await alloraConsumer.waitForDeployment();
  deployed.AlloraConsumer = await alloraConsumer.getAddress();
  console.log("AlloraConsumer:", deployed.AlloraConsumer);

  // OpenGradientReader
  const OpenGradientReader = await hre.ethers.getContractFactory("OpenGradientReader");
  const openGradientReader = await OpenGradientReader.deploy(deployer.address);
  await openGradientReader.waitForDeployment();
  deployed.OpenGradientReader = await openGradientReader.getAddress();
  console.log("OpenGradientReader:", deployed.OpenGradientReader);

  // ─── M20: TEE Attestation Layer ─────────────────────────────────────────

  const TEEAttestationVerifier = await hre.ethers.getContractFactory("TEEAttestationVerifier");
  const teeVerifier = await TEEAttestationVerifier.deploy(deployer.address);
  await teeVerifier.waitForDeployment();
  deployed.TEEAttestationVerifier = await teeVerifier.getAddress();
  console.log("TEEAttestationVerifier:", deployed.TEEAttestationVerifier);

  // ─── M21: $ABNK Token + ve-Governance ───────────────────────────────────

  const ABNKToken = await hre.ethers.getContractFactory("ABNKToken");
  const abnkToken = await ABNKToken.deploy(deployer.address);
  await abnkToken.waitForDeployment();
  deployed.ABNKToken = await abnkToken.getAddress();
  console.log("ABNKToken:", deployed.ABNKToken);

  const VotingEscrow = await hre.ethers.getContractFactory("VotingEscrow");
  const votingEscrow = await VotingEscrow.deploy(deployed.ABNKToken);
  await votingEscrow.waitForDeployment();
  deployed.VotingEscrow = await votingEscrow.getAddress();
  console.log("VotingEscrow:", deployed.VotingEscrow);

  // FeeDistributor
  const usdcAddress = process.env.USDC_ADDRESS || "0x09Bc4E0D864854c6aFB6eB9A9cdF58aC190D0dF9";
  const dexAdapterAddress = process.env.DEX_ADAPTER_ADDRESS || deployer.address;
  const FeeDistributor = await hre.ethers.getContractFactory("contracts/v3/FeeDistributor.sol:FeeDistributor");
  const feeDistributor = await FeeDistributor.deploy(
    deployed.ABNKToken,
    usdcAddress,
    deployed.VotingEscrow,
    dexAdapterAddress
  );
  await feeDistributor.waitForDeployment();
  deployed.FeeDistributor = await feeDistributor.getAddress();
  console.log("FeeDistributor:", deployed.FeeDistributor);

  // ─── M24: Intent-Based Architecture ─────────────────────────────────────

  const SolverRegistry = await hre.ethers.getContractFactory("SolverRegistry");
  const solverRegistry = await SolverRegistry.deploy(deployer.address);
  await solverRegistry.waitForDeployment();
  deployed.SolverRegistry = await solverRegistry.getAddress();
  console.log("SolverRegistry:", deployed.SolverRegistry);

  const IntentRouter = await hre.ethers.getContractFactory("IntentRouter");
  const intentRouter = await IntentRouter.deploy(deployed.SolverRegistry);
  await intentRouter.waitForDeployment();
  deployed.IntentRouter = await intentRouter.getAddress();
  console.log("IntentRouter:", deployed.IntentRouter);

  // ─── M25: Account Abstraction ───────────────────────────────────────────

  // Note: AgentAccountFactory requires ERC-4337 EntryPoint — use canonical address
  const ENTRY_POINT = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789"; // canonical 4337 EntryPoint
  console.log("AgentAccountFactory: requires ERC-4337 EntryPoint at", ENTRY_POINT);
  // Deployment of AA factory is handled separately with AA infrastructure

  // ─── M26: Signal NFT Marketplace ────────────────────────────────────────

  const SignalNFT = await hre.ethers.getContractFactory("SignalNFT");
  const signalNFT = await SignalNFT.deploy();
  await signalNFT.waitForDeployment();
  deployed.SignalNFT = await signalNFT.getAddress();
  console.log("SignalNFT:", deployed.SignalNFT);

  const SignalAuctionHouse = await hre.ethers.getContractFactory("SignalAuctionHouse");
  const auctionHouse = await SignalAuctionHouse.deploy(deployed.ABNKToken);
  await auctionHouse.waitForDeployment();
  deployed.SignalAuctionHouse = await auctionHouse.getAddress();
  console.log("SignalAuctionHouse:", deployed.SignalAuctionHouse);

  // ─── M28: Mechanism Design Hardening ────────────────────────────────────

  const AntiSybilGuard = await hre.ethers.getContractFactory("AntiSybilGuard");
  const antiSybilGuard = await AntiSybilGuard.deploy(deployer.address);
  await antiSybilGuard.waitForDeployment();
  deployed.AntiSybilGuard = await antiSybilGuard.getAddress();
  console.log("AntiSybilGuard:", deployed.AntiSybilGuard);

  const CommitRevealSignal = await hre.ethers.getContractFactory("CommitRevealSignal");
  const commitReveal = await CommitRevealSignal.deploy();
  await commitReveal.waitForDeployment();
  deployed.CommitRevealSignal = await commitReveal.getAddress();
  console.log("CommitRevealSignal:", deployed.CommitRevealSignal);

  // ─── Post-Deployment Setup ──────────────────────────────────────────────

  // Mint initial ABNK supply (5% airdrop + 5% liquidity + 10% LBP = 20M)
  console.log("\n--- Post-deployment setup ---");
  const initialMint = hre.ethers.parseEther("20000000"); // 20M ABNK
  await abnkToken.mint(deployer.address, initialMint);
  console.log("Minted 20M ABNK to deployer for initial distribution");

  // Approve TEE attester (placeholder — replace with real Phala attester key)
  await teeVerifier.approveAttester(deployer.address, "initial-phala-attester");
  console.log("Approved initial TEE attester");

  // Register Allora topic
  await alloraConsumer.registerTopic(1, "MNT/USD 8h prediction");
  console.log("Registered Allora topic 1: MNT/USD 8h prediction");

  // ─── Summary ────────────────────────────────────────────────────────────

  console.log("\n=== V3 Deployment Complete ===");
  console.log(JSON.stringify(deployed, null, 2));

  // Save to deployments
  const fs = require("fs");
  const path = require("path");
  const deployPath = path.join(__dirname, "..", "deployments", `v3_${hre.network.name}.json`);
  fs.writeFileSync(deployPath, JSON.stringify(deployed, null, 2));
  console.log(`Saved to ${deployPath}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

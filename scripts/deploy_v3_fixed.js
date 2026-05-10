/**
 * AgentBank V3 Deployment - Fixed constructor args
 */
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying V3 with:", deployer.address);
  console.log("Balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "MNT");

  const deployed = {};

  // ─── M19: Decentralized AI Inference ─────────────────────────────
  // AlloraConsumer(address _allora) - use deployer as placeholder
  console.log("[1] AlloraConsumer...");
  const AlloraConsumer = await hre.ethers.getContractFactory("AlloraConsumer");
  const alloraConsumer = await AlloraConsumer.deploy(deployer.address);
  await alloraConsumer.waitForDeployment();
  deployed.AlloraConsumer = await alloraConsumer.getAddress();
  console.log("  ", deployed.AlloraConsumer);

  // OpenGradientReader(address _zkVerifier) - use deployer as placeholder
  console.log("[2] OpenGradientReader...");
  const OpenGradientReader = await hre.ethers.getContractFactory("OpenGradientReader");
  const ogReader = await OpenGradientReader.deploy(deployer.address);
  await ogReader.waitForDeployment();
  deployed.OpenGradientReader = await ogReader.getAddress();
  console.log("  ", deployed.OpenGradientReader);

  // ─── M20: TEE Attestation ────────────────────────────────────────
  // TEEAttestationVerifier() - no args
  console.log("[3] TEEAttestationVerifier...");
  const TEEVerifier = await hre.ethers.getContractFactory("TEEAttestationVerifier");
  const teeVerifier = await TEEVerifier.deploy();
  await teeVerifier.waitForDeployment();
  deployed.TEEAttestationVerifier = await teeVerifier.getAddress();
  console.log("  ", deployed.TEEAttestationVerifier);

  // ─── M21: $ABNK Token + ve-Governance ────────────────────────────
  // ABNKToken(address admin)
  console.log("[4] ABNKToken...");
  const ABNKToken = await hre.ethers.getContractFactory("ABNKToken");
  const abnkToken = await ABNKToken.deploy(deployer.address);
  await abnkToken.waitForDeployment();
  deployed.ABNKToken = await abnkToken.getAddress();
  console.log("  ", deployed.ABNKToken);

  // VotingEscrow(address _token)
  console.log("[5] VotingEscrow...");
  const VotingEscrow = await hre.ethers.getContractFactory("VotingEscrow");
  const votingEscrow = await VotingEscrow.deploy(deployed.ABNKToken);
  await votingEscrow.waitForDeployment();
  deployed.VotingEscrow = await votingEscrow.getAddress();
  console.log("  ", deployed.VotingEscrow);

  // FeeDistributor(address _usdc, address _abnk, address _dexAdapter, address _veABNK)
  const usdcAddress = "0x09Bc4E0D864854c6aFB6eB9A9cdF58aC190D0dF9";
  console.log("[6] FeeDistributor...");
  const FeeDistributor = await hre.ethers.getContractFactory("contracts/v3/FeeDistributor.sol:FeeDistributor");
  const feeDist = await FeeDistributor.deploy(usdcAddress, deployed.ABNKToken, deployer.address, deployed.VotingEscrow);
  await feeDist.waitForDeployment();
  deployed.FeeDistributor = await feeDist.getAddress();
  console.log("  ", deployed.FeeDistributor);

  // ─── M24: Intent-Based Architecture ──────────────────────────────
  // SolverRegistry(address _stakeToken, uint256 _minStake)
  console.log("[7] SolverRegistry...");
  const SolverRegistry = await hre.ethers.getContractFactory("SolverRegistry");
  const solverReg = await SolverRegistry.deploy(deployed.ABNKToken, hre.ethers.parseEther("100"));
  await solverReg.waitForDeployment();
  deployed.SolverRegistry = await solverReg.getAddress();
  console.log("  ", deployed.SolverRegistry);

  // IntentRouter(address _mntToken, address _solverRegistry)
  // Use WMNT or deployer as MNT placeholder
  const WMNT = "0x78c1b0C915c4FAA5FffA6CAbf0219DA63d7f4cb8";
  console.log("[8] IntentRouter...");
  const IntentRouter = await hre.ethers.getContractFactory("IntentRouter");
  const intentRouter = await IntentRouter.deploy(WMNT, deployed.SolverRegistry);
  await intentRouter.waitForDeployment();
  deployed.IntentRouter = await intentRouter.getAddress();
  console.log("  ", deployed.IntentRouter);

  // ─── M26: Signal NFT Marketplace ─────────────────────────────────
  // SignalNFT() - no args
  console.log("[9] SignalNFT...");
  const SignalNFT = await hre.ethers.getContractFactory("SignalNFT");
  const signalNFT = await SignalNFT.deploy();
  await signalNFT.waitForDeployment();
  deployed.SignalNFT = await signalNFT.getAddress();
  console.log("  ", deployed.SignalNFT);

  // SignalAuctionHouse(address _abnkToken)
  console.log("[10] SignalAuctionHouse...");
  const AuctionHouse = await hre.ethers.getContractFactory("SignalAuctionHouse");
  const auctionHouse = await AuctionHouse.deploy(deployed.ABNKToken);
  await auctionHouse.waitForDeployment();
  deployed.SignalAuctionHouse = await auctionHouse.getAddress();
  console.log("  ", deployed.SignalAuctionHouse);

  // ─── M28: Mechanism Design Hardening ─────────────────────────────
  // AntiSybilGuard(address _worldId, address _gitcoinPassport, uint256 _groupId, uint256 _externalNullifierHash, uint256 _minPassportScore)
  console.log("[11] AntiSybilGuard...");
  const AntiSybilGuard = await hre.ethers.getContractFactory("AntiSybilGuard");
  const antiSybil = await AntiSybilGuard.deploy(
    deployer.address,  // worldId placeholder
    deployer.address,  // gitcoinPassport placeholder
    1,                 // groupId
    hre.ethers.id("agentbank-anti-sybil"),  // externalNullifierHash
    15                 // minPassportScore
  );
  await antiSybil.waitForDeployment();
  deployed.AntiSybilGuard = await antiSybil.getAddress();
  console.log("  ", deployed.AntiSybilGuard);

  // CommitRevealSignal - check if it has constructor args
  console.log("[12] CommitRevealSignal...");
  const CommitReveal = await hre.ethers.getContractFactory("CommitRevealSignal");
  const commitReveal = await CommitReveal.deploy();
  await commitReveal.waitForDeployment();
  deployed.CommitRevealSignal = await commitReveal.getAddress();
  console.log("  ", deployed.CommitRevealSignal);

  // ─── Post-Deployment Setup ───────────────────────────────────────
  console.log("\n--- Post-deployment setup ---");

  // Mint 20M ABNK
  const initialMint = hre.ethers.parseEther("20000000");
  let tx = await abnkToken.mint(deployer.address, initialMint);
  await tx.wait();
  console.log("  Minted 20M ABNK to deployer");

  // Approve TEE attester
  tx = await teeVerifier.approveAttester(deployer.address, "initial-phala-attester");
  await tx.wait();
  console.log("  Approved initial TEE attester");

  // Register Allora topic
  tx = await alloraConsumer.registerTopic(1, "MNT/USD 8h prediction");
  await tx.wait();
  console.log("  Registered Allora topic 1");

  // ─── Save ────────────────────────────────────────────────────────
  console.log("\n=== V3 Deployment Complete ===");
  console.log(JSON.stringify(deployed, null, 2));

  const deployDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deployDir)) fs.mkdirSync(deployDir, { recursive: true });
  const deployPath = path.join(deployDir, `v3_mantle.json`);
  fs.writeFileSync(deployPath, JSON.stringify(deployed, null, 2));
  console.log("Saved to", deployPath);
}

main()
  .then(() => process.exit(0))
  .catch((error) => { console.error(error); process.exit(1); });

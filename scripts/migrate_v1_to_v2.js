const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [owner] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);

  console.log("=== AgentBank V1 -> V2 Migration ===");
  console.log("Migrator:", owner.address);
  console.log("Chain ID:", chainId);
  console.log("");

  // Read V1 deployment addresses
  const deploymentsPath = path.join(__dirname, "..", "deployments.json");
  if (!fs.existsSync(deploymentsPath)) {
    throw new Error("deployments.json not found. Deploy V1 contracts first or provide the file.");
  }

  const v1Deployment = JSON.parse(fs.readFileSync(deploymentsPath, "utf8"));
  console.log("V1 Deployment loaded from:", deploymentsPath);
  console.log("V1 Contracts:", JSON.stringify(v1Deployment.contracts, null, 2));
  console.log("");

  // Resolve V1 addresses
  const v1Addresses = {
    vault: v1Deployment.contracts.AgentBankVault || v1Deployment.contracts.AgentBankVaultV2,
    identity: v1Deployment.contracts.AgentIdentity || v1Deployment.contracts.IdentityRegistry,
    signalBoard: v1Deployment.contracts.SignalBoard || v1Deployment.contracts.SignalBoardV2,
    usdc: v1Deployment.contracts.MockUSDC || v1Deployment.dependencies?.usdc
  };

  if (!v1Addresses.usdc) {
    throw new Error("Cannot determine USDC address from V1 deployment");
  }

  console.log("Resolved V1 addresses:");
  console.log("  Vault:", v1Addresses.vault || "N/A");
  console.log("  Identity:", v1Addresses.identity || "N/A");
  console.log("  SignalBoard:", v1Addresses.signalBoard || "N/A");
  console.log("  USDC:", v1Addresses.usdc);
  console.log("");

  const deployed = {};

  // Step 1: Deploy V2 IdentityRegistry
  console.log("[Step 1] Deploying V2 IdentityRegistry...");
  const IdentityRegistry = await ethers.getContractFactory("IdentityRegistry");
  const identity = await IdentityRegistry.deploy();
  await identity.waitForDeployment();
  deployed.IdentityRegistry = await identity.getAddress();
  console.log("  Deployed:", deployed.IdentityRegistry);

  // Step 2: Deploy V2 ReputationRegistry
  console.log("[Step 2] Deploying V2 ReputationRegistry...");
  const ReputationRegistry = await ethers.getContractFactory("ReputationRegistry");
  const reputation = await ReputationRegistry.deploy(deployed.IdentityRegistry);
  await reputation.waitForDeployment();
  deployed.ReputationRegistry = await reputation.getAddress();
  console.log("  Deployed:", deployed.ReputationRegistry);

  // Step 3: Deploy V2 LLMReasoningRegistry
  console.log("[Step 3] Deploying V2 LLMReasoningRegistry...");
  const LLMReasoningRegistry = await ethers.getContractFactory("LLMReasoningRegistry");
  const reasoning = await LLMReasoningRegistry.deploy();
  await reasoning.waitForDeployment();
  deployed.LLMReasoningRegistry = await reasoning.getAddress();
  console.log("  Deployed:", deployed.LLMReasoningRegistry);

  // Step 4: Deploy V2 SignalBoardV2
  console.log("[Step 4] Deploying V2 SignalBoardV2...");
  const SignalBoardV2 = await ethers.getContractFactory("SignalBoardV2");
  const signalBoard = await SignalBoardV2.deploy();
  await signalBoard.waitForDeployment();
  deployed.SignalBoardV2 = await signalBoard.getAddress();
  console.log("  Deployed:", deployed.SignalBoardV2);

  // Step 5: Deploy V2 Vault
  console.log("[Step 5] Deploying V2 AgentBankVaultV2...");
  const AgentBankVaultV2 = await ethers.getContractFactory("AgentBankVaultV2");
  const vault = await AgentBankVaultV2.deploy(v1Addresses.usdc);
  await vault.waitForDeployment();
  deployed.AgentBankVaultV2 = await vault.getAddress();
  console.log("  Deployed:", deployed.AgentBankVaultV2);

  // Step 6: Migrate agent identities from V1 (if V1 identity contract exists)
  if (v1Addresses.identity) {
    console.log("[Step 6] Migrating agent identities from V1...");
    try {
      const v1Identity = await ethers.getContractAt("AgentIdentity", v1Addresses.identity);
      // Try to read registered agents from V1
      // V1 AgentIdentity may use different interface; attempt common patterns
      const agentCount = await v1Identity.nextId().catch(() => null);
      if (agentCount) {
        const count = Number(agentCount);
        console.log(`  Found ${count - 1} agents in V1 registry`);
        for (let i = 1; i < count; i++) {
          try {
            const agent = await v1Identity.agents(i);
            if (agent.agentAddress && agent.agentAddress !== ethers.ZeroAddress) {
              const tx = await identity.registerAgent(
                agent.agentAddress,
                agent.domain || `agent-${i}`,
                agent.agentType || "unknown",
                agent.metadataHash || ethers.ZeroHash
              );
              await tx.wait();
              console.log(`  Migrated agent ${i}: ${agent.agentAddress}`);
            }
          } catch (e) {
            console.log(`  Skipping agent ${i}: ${e.message}`);
          }
        }
      } else {
        console.log("  V1 identity contract does not expose nextId, skipping migration");
      }
    } catch (e) {
      console.log("  Could not read V1 identity contract:", e.message);
    }
  } else {
    console.log("[Step 6] No V1 identity contract found, skipping identity migration");
  }

  // Step 7: Wire up V2 permissions
  console.log("[Step 7] Wiring V2 permissions...");
  const EXECUTOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("EXECUTOR_ROLE"));
  const GUARD_ROLE = ethers.keccak256(ethers.toUtf8Bytes("GUARD_ROLE"));
  const ALLOCATOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("ALLOCATOR_ROLE"));

  // Grant deployer all roles for initial setup
  let tx;
  tx = await vault.grantRole(EXECUTOR_ROLE, owner.address);
  await tx.wait();
  tx = await vault.grantRole(GUARD_ROLE, owner.address);
  await tx.wait();
  tx = await vault.grantRole(ALLOCATOR_ROLE, owner.address);
  await tx.wait();
  console.log("  Granted all vault roles to deployer");

  tx = await signalBoard.authorizePoster(owner.address);
  await tx.wait();
  tx = await signalBoard.authorizeExecutor(owner.address);
  await tx.wait();
  console.log("  Authorized deployer on SignalBoard");

  // Step 8: Pause V1 contracts (if possible)
  console.log("[Step 8] Pausing V1 contracts...");
  if (v1Addresses.vault) {
    try {
      const v1Vault = await ethers.getContractAt("AgentBankVault", v1Addresses.vault);
      // Attempt to pause - may fail if not pausable or not owner
      tx = await v1Vault.pause();
      await tx.wait();
      console.log("  V1 Vault paused successfully");
    } catch (e) {
      console.log("  Could not pause V1 Vault:", e.message);
      console.log("  Manual intervention may be required to pause V1");
    }
  }

  if (v1Addresses.signalBoard) {
    try {
      const v1SignalBoard = await ethers.getContractAt("SignalBoard", v1Addresses.signalBoard);
      // Attempt to pause or deactivate
      tx = await v1SignalBoard.pause();
      await tx.wait();
      console.log("  V1 SignalBoard paused successfully");
    } catch (e) {
      console.log("  Could not pause V1 SignalBoard:", e.message);
    }
  }

  // Save V2 deployment
  const migrationData = {
    network: chainId === 5000 ? "mantle" : "mantle_sepolia",
    chainId: chainId,
    migrator: owner.address,
    timestamp: new Date().toISOString(),
    v1Contracts: v1Addresses,
    v2Contracts: deployed,
    migrationNotes: [
      "V2 contracts deployed with same USDC asset",
      "Agent identities migrated where possible",
      "V1 contracts paused (if owner permissions allowed)",
      "Users should withdraw from V1 and deposit into V2"
    ]
  };

  const v2OutputPath = path.join(__dirname, "..", "deployments.json");
  fs.writeFileSync(v2OutputPath, JSON.stringify(migrationData, null, 2));

  console.log("");
  console.log("=== Migration Complete ===");
  console.log("V2 Contracts:", JSON.stringify(deployed, null, 2));
  console.log("");
  console.log("Post-migration steps:");
  console.log("  1. Verify V1 is fully paused (check on-chain)");
  console.log("  2. Notify users to migrate deposits from V1 vault to V2");
  console.log("  3. Transfer V2 ownership to multisig/timelock");
  console.log("  4. Update frontend and subgraph with new addresses");
  console.log("  5. Revoke deployer roles once dedicated agents are set up");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  });

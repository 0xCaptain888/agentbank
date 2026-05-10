const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [owner] = await ethers.getSigners();
  const executorAddress = process.env.EXECUTOR_ADDRESS;
  const analystAddress = "0xc7e424c1e4b346c06a35241e7bca469477483683";

  const deployed = {
    IdentityRegistry: "0x7058132Ba4aE19983c61590644F2943A3B7fDf80",
    ReputationRegistry: "0x494960e21058290BB2F1328b6b837dCF26aA5DCb",
    LLMReasoningRegistry: "0x8a8C3532359aAACb6C3a1060deF4938F6006c8F1",
    SignalBoardV2: "0x2A46cF6493b377D45908254B0528e38990AA323f",
    AgentBankVaultV2: "0xC44C061D257Af305dEAea2eD093E878a615d856d"
  };

  console.log("Wiring SignalBoard permissions...");
  const signalBoard = await ethers.getContractAt("SignalBoardV2", deployed.SignalBoardV2);

  // Authorize analyst as poster, executor as executor
  let tx;
  tx = await signalBoard.setAuthorizedPoster(analystAddress, true);
  await tx.wait();
  console.log("  Authorized analyst as poster:", analystAddress);

  tx = await signalBoard.setAuthorizedPoster(executorAddress, true);
  await tx.wait();
  console.log("  Authorized executor as poster:", executorAddress);

  tx = await signalBoard.setAuthorizedExecutor(executorAddress, true);
  await tx.wait();
  console.log("  Authorized executor:", executorAddress);

  // Save full deployment
  const deploymentData = {
    network: "mantle",
    chainId: 5000,
    deployer: owner.address,
    timestamp: new Date().toISOString(),
    contracts: deployed,
    dependencies: { usdc: "0x09Bc4E0D864854c6aFB6eB9A9cdF58aC190D0dF9" }
  };

  const outputPath = path.join(__dirname, "..", "deployments.json");
  fs.writeFileSync(outputPath, JSON.stringify(deploymentData, null, 2));
  console.log("\n=== V2 Wiring Complete ===");
  console.log(JSON.stringify(deployed, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => { console.error(error); process.exit(1); });

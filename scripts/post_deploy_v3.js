const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  const teeAddr = "0x51E52dCBD0FBfaDaDB43ad1EB1Ea0d3A79f128c3";
  const teeVerifier = await hre.ethers.getContractAt("TEEAttestationVerifier", teeAddr);

  // approveAttesterAddress(TEEKind kind, address attester, bool approved)
  // TEEKind.Phala = 0
  let tx = await teeVerifier.approveAttesterAddress(0, deployer.address, true);
  await tx.wait();
  console.log("Approved deployer as Phala TEE attester");

  // Approve a code hash for the TEE
  const codeHash = hre.ethers.id("agentbank-analyst-tee-v1");
  tx = await teeVerifier.approveCode(codeHash, true);
  await tx.wait();
  console.log("Approved TEE code hash");

  console.log("\n=== Post-deploy V3 setup complete ===");
}

main()
  .then(() => process.exit(0))
  .catch((error) => { console.error(error); process.exit(1); });

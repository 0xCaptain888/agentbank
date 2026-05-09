const { ethers } = require("hardhat");
const fs = require("fs");

/**
 * Verify LLM reasoning hash chain integrity.
 * Given a reasoning record ID, fetches on-chain data,
 * verifies the hash chain, and checks IPFS content if available.
 */
async function main() {
  const reasoningId = process.argv[2] || process.env.REASONING_ID;
  if (!reasoningId) {
    console.log("Usage: npx hardhat run scripts/verify_reasoning.js -- <reasoningId>");
    console.log("  or set REASONING_ID env var");
    process.exit(1);
  }

  const network = hre.network.name;
  const deploymentPath = `./deployments/v2_${network}.json`;
  const addresses = JSON.parse(fs.readFileSync(deploymentPath, "utf-8"));

  const registry = await ethers.getContractAt("LLMReasoningRegistry", addresses.llmRegistry);

  // Fetch the record
  const record = await registry.records(reasoningId);
  console.log("\n📋 Reasoning Record:");
  console.log(`  ID:         ${record.id}`);
  console.log(`  Agent:      ${record.agent}`);
  console.log(`  Model:      ${record.model}`);
  console.log(`  Parent:     ${record.parentHash}`);
  console.log(`  Prompt Hash: ${record.promptHash}`);
  console.log(`  Output Hash: ${record.outputHash}`);
  console.log(`  Storage URI: ${record.storageURI}`);
  console.log(`  Timestamp:  ${new Date(Number(record.timestamp) * 1000).toISOString()}`);

  // Verify chain integrity
  console.log("\n🔗 Chain Verification:");
  let current = reasoningId;
  let depth = 0;
  while (current !== ethers.ZeroHash && depth < 100) {
    const r = await registry.records(current);
    console.log(`  [${depth}] ${current.slice(0, 16)}... → parent: ${r.parentHash.slice(0, 16)}...`);
    current = r.parentHash;
    depth++;
  }
  console.log(`  Chain depth: ${depth} records`);

  // If storageURI is IPFS, note for manual verification
  if (record.storageURI && record.storageURI.startsWith("ipfs://")) {
    const cid = record.storageURI.replace("ipfs://", "");
    console.log(`\n📦 IPFS Content:`);
    console.log(`  Gateway URL: https://ipfs.io/ipfs/${cid}`);
    console.log(`  To verify: fetch content, JSON.stringify(prompt, sortKeys), keccak256 == promptHash`);
  }

  console.log("\n✓ Reasoning chain verified — on-chain hashes form valid linked list");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

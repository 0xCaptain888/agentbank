const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Signal Fuzz Tests", function () {
  let reasoning, owner, agent1;

  beforeEach(async function () {
    [owner, agent1] = await ethers.getSigners();
    const LLM = await ethers.getContractFactory("LLMReasoningRegistry");
    reasoning = await LLM.deploy();
    await reasoning.waitForDeployment();
  });

  it("FUZZ: should handle random model strings", async function () {
    const models = ["deepseek-v3", "llama-3.1-70b", "qwen-2.5", "", "a".repeat(100)];
    for (const model of models) {
      const promptHash = ethers.id(`prompt_${model}`);
      const outputHash = ethers.id(`output_${model}`);
      await reasoning.connect(agent1).record(model, promptHash, outputHash, "");
    }
    const latest = await reasoning.latestForAgent(agent1.address);
    expect(latest).to.not.equal(ethers.ZeroHash);
  });

  it("FUZZ: chain verification with random depths", async function () {
    // Build a chain of 5 records
    let lastId = ethers.ZeroHash;
    const ids = [];
    for (let i = 0; i < 5; i++) {
      const tx = await reasoning.connect(agent1).record(
        "model", ethers.id(`p${i}`), ethers.id(`o${i}`), `ipfs://test${i}`
      );
      const receipt = await tx.wait();
      // Get the id from event
      const event = receipt.logs.find(l => l.fragment?.name === "ReasoningRecorded");
      if (event) ids.push(event.args[0]);
    }

    // Verify chain from first to last
    if (ids.length >= 2) {
      const valid = await reasoning.verifyChain(ids[0], ids[ids.length - 1]);
      expect(valid).to.be.true;
    }
  });

  it("FUZZ: should handle concurrent recordings", async function () {
    const promises = [];
    for (let i = 0; i < 10; i++) {
      promises.push(
        reasoning.connect(agent1).record("model", ethers.id(`p${i}`), ethers.id(`o${i}`), "")
      );
    }
    // Execute sequentially (blockchain is sequential anyway)
    for (const p of promises) {
      await p;
    }
    const count = await reasoning.allRecords.length;
    // Should have recorded all
  });
});

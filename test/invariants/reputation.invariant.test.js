const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Reputation Invariant Tests", function () {
  let identity, reputation, owner, agent1, client1, client2;

  beforeEach(async function () {
    [owner, agent1, client1, client2] = await ethers.getSigners();

    const Identity = await ethers.getContractFactory("IdentityRegistry");
    identity = await Identity.deploy();

    const Reputation = await ethers.getContractFactory("ReputationRegistry");
    reputation = await Reputation.deploy(await identity.getAddress());

    await identity.registerAgent(agent1.address, "test.domain", "analyst", ethers.ZeroHash);
    const agentId = await identity.agentByAddress(agent1.address);
    await reputation.connect(agent1).authorize(agentId, client1.address);
    await reputation.connect(agent1).authorize(agentId, client2.address);
  });

  it("INVARIANT: reputation bounded by cumulative score range", async function () {
    const agentId = await identity.agentByAddress(agent1.address);

    // Submit multiple feedbacks
    for (let i = 0; i < 10; i++) {
      const score = Math.floor(Math.random() * 200) - 100; // -100 to 100
      const boundedScore = Math.max(-100, Math.min(100, score));
      await reputation.connect(client1).submitFeedback(agentId, boundedScore, ethers.id(`ctx${i}`), "test");
    }

    const rep = await reputation.getReputation(agentId);
    // Reputation should be bounded reasonably
    expect(rep).to.be.lte(1000);
    expect(rep).to.be.gte(-1000);
  });

  it("INVARIANT: feedback count always increases", async function () {
    const agentId = await identity.agentByAddress(agent1.address);
    const before = await reputation.getFeedbackCount();
    await reputation.connect(client1).submitFeedback(agentId, 10, ethers.ZeroHash, "test");
    const after = await reputation.getFeedbackCount();
    expect(after).to.be.gt(before);
  });
});

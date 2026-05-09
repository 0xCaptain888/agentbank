const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ReputationRegistry", function () {
  let identity, reputation, owner, agent1, client1;

  beforeEach(async function () {
    [owner, agent1, client1] = await ethers.getSigners();

    const Identity = await ethers.getContractFactory("IdentityRegistry");
    identity = await Identity.deploy();
    await identity.waitForDeployment();

    const Reputation = await ethers.getContractFactory("ReputationRegistry");
    reputation = await Reputation.deploy(await identity.getAddress());
    await reputation.waitForDeployment();

    // Register agent
    await identity.registerAgent(agent1.address, "domain1", "analyst", ethers.ZeroHash);
  });

  describe("Authorization", function () {
    it("should allow agent to authorize a client", async function () {
      const agentData = await identity.getAgentByAddress(agent1.address);
      await reputation.connect(agent1).authorize(agentData.id, client1.address);
      expect(await reputation.authorized(agentData.id, client1.address)).to.be.true;
    });

    it("should allow agent to revoke a client", async function () {
      const agentData = await identity.getAgentByAddress(agent1.address);
      await reputation.connect(agent1).authorize(agentData.id, client1.address);
      await reputation.connect(agent1).revoke(agentData.id, client1.address);
      expect(await reputation.authorized(agentData.id, client1.address)).to.be.false;
    });
  });

  describe("Feedback", function () {
    it("should accept feedback from authorized client", async function () {
      const agentData = await identity.getAgentByAddress(agent1.address);
      await reputation.connect(agent1).authorize(agentData.id, client1.address);
      await reputation.connect(client1).submitFeedback(agentData.id, 50, ethers.id("context"), "good work");
      expect(await reputation.getReputation(agentData.id)).to.equal(50);
    });

    it("should reject feedback from unauthorized client", async function () {
      const agentData = await identity.getAgentByAddress(agent1.address);
      await expect(
        reputation.connect(client1).submitFeedback(agentData.id, 50, ethers.ZeroHash, "")
      ).to.be.revertedWith("not authorized client");
    });

    it("should enforce score range", async function () {
      const agentData = await identity.getAgentByAddress(agent1.address);
      await reputation.connect(agent1).authorize(agentData.id, client1.address);
      await expect(
        reputation.connect(client1).submitFeedback(agentData.id, 101, ethers.ZeroHash, "")
      ).to.be.revertedWith("score range");
    });
  });
});

const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("IdentityRegistry", function () {
  let identity, owner, agent1, agent2;

  beforeEach(async function () {
    [owner, agent1, agent2] = await ethers.getSigners();
    const Identity = await ethers.getContractFactory("IdentityRegistry");
    identity = await Identity.deploy();
    await identity.waitForDeployment();
  });

  describe("Registration", function () {
    it("should register a new agent", async function () {
      await identity.registerAgent(
        agent1.address,
        "agentbank.xyz/analyst-1",
        "analyst",
        ethers.id("metadata")
      );
      const agent = await identity.getAgentByAddress(agent1.address);
      expect(agent.agentAddress).to.equal(agent1.address);
      expect(agent.agentType).to.equal("analyst");
      expect(agent.active).to.be.true;
    });

    it("should not allow duplicate registration", async function () {
      await identity.registerAgent(agent1.address, "domain1", "analyst", ethers.ZeroHash);
      await expect(
        identity.registerAgent(agent1.address, "domain2", "executor", ethers.ZeroHash)
      ).to.be.revertedWith("agent exists");
    });

    it("should not allow duplicate domains", async function () {
      await identity.registerAgent(agent1.address, "domain1", "analyst", ethers.ZeroHash);
      await expect(
        identity.registerAgent(agent2.address, "domain1", "executor", ethers.ZeroHash)
      ).to.be.revertedWith("domain taken");
    });
  });

  describe("Updates", function () {
    it("should allow agent to update their own data", async function () {
      await identity.registerAgent(agent1.address, "old-domain", "analyst", ethers.ZeroHash);
      const agentData = await identity.getAgentByAddress(agent1.address);
      await identity.connect(agent1).updateAgent(agentData.id, "new-domain", ethers.id("new-meta"));
      const updated = await identity.getAgentByAddress(agent1.address);
      expect(updated.domain).to.equal("new-domain");
    });

    it("should not allow others to update", async function () {
      await identity.registerAgent(agent1.address, "domain", "analyst", ethers.ZeroHash);
      const agentData = await identity.getAgentByAddress(agent1.address);
      await expect(
        identity.connect(agent2).updateAgent(agentData.id, "hacked", ethers.ZeroHash)
      ).to.be.revertedWith("not agent owner");
    });
  });

  describe("Deactivation", function () {
    it("should allow agent to deactivate themselves", async function () {
      await identity.registerAgent(agent1.address, "domain", "analyst", ethers.ZeroHash);
      const agentData = await identity.getAgentByAddress(agent1.address);
      await identity.connect(agent1).deactivateAgent(agentData.id);
      const updated = await identity.getAgent(agentData.id);
      expect(updated.active).to.be.false;
    });
  });
});

const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AgentIdentity", function () {
  let identity;
  let owner, agent1, agent2, updater;

  beforeEach(async function () {
    [owner, agent1, agent2, updater] = await ethers.getSigners();

    const AgentIdentity = await ethers.getContractFactory("AgentIdentity");
    identity = await AgentIdentity.deploy();
  });

  it("Owner can mint agent identity", async function () {
    await expect(
      identity.mintAgent(agent1.address, "Analyst Agent", "analyst")
    ).to.emit(identity, "AgentMinted");

    const profile = await identity.getProfile(0);
    expect(profile.name).to.equal("Analyst Agent");
    expect(profile.agentType).to.equal("analyst");
    expect(profile.reputationScore).to.equal(100);
    expect(profile.active).to.equal(true);
  });

  it("Non-owner cannot mint agent", async function () {
    await expect(
      identity.connect(agent1).mintAgent(agent2.address, "Test", "test")
    ).to.be.revertedWithCustomError(identity, "OwnableUnauthorizedAccount");
  });

  it("Authorized updater can update reputation (positive)", async function () {
    await identity.mintAgent(agent1.address, "Executor Agent", "executor");
    await identity.setAuthorizedUpdater(updater.address, true);

    await expect(
      identity.connect(updater).updateReputation(0, 10, "operation_success")
    ).to.emit(identity, "ReputationUpdated");

    const profile = await identity.getProfile(0);
    expect(profile.reputationScore).to.equal(110);
    expect(profile.successfulActions).to.equal(1);
    expect(profile.totalActions).to.equal(1);
  });

  it("Authorized updater can update reputation (negative)", async function () {
    await identity.mintAgent(agent1.address, "Executor Agent", "executor");
    await identity.setAuthorizedUpdater(updater.address, true);

    await identity.connect(updater).updateReputation(0, -20, "operation_failed");

    const profile = await identity.getProfile(0);
    expect(profile.reputationScore).to.equal(80);
  });

  it("Reputation cannot go below zero", async function () {
    await identity.mintAgent(agent1.address, "Executor Agent", "executor");
    await identity.setAuthorizedUpdater(updater.address, true);

    // Start at 100, subtract 150
    await identity.connect(updater).updateReputation(0, -150, "catastrophic_failure");

    const profile = await identity.getProfile(0);
    expect(profile.reputationScore).to.equal(0);
  });

  it("Unauthorized address cannot update reputation", async function () {
    await identity.mintAgent(agent1.address, "Guard Agent", "guard");

    await expect(
      identity.connect(agent2).updateReputation(0, 10, "hack_attempt")
    ).to.be.revertedWith("Not authorized");
  });

  it("Can lookup profile by wallet", async function () {
    await identity.mintAgent(agent1.address, "Allocator Agent", "allocator");

    const profile = await identity.getProfileByWallet(agent1.address);
    expect(profile.name).to.equal("Allocator Agent");
    expect(profile.agentType).to.equal("allocator");
  });

  it("Multiple agents can be minted", async function () {
    await identity.mintAgent(agent1.address, "Analyst", "analyst");
    await identity.mintAgent(agent2.address, "Executor", "executor");

    expect(await identity.agentTokenId(agent1.address)).to.equal(0);
    expect(await identity.agentTokenId(agent2.address)).to.equal(1);
  });
});

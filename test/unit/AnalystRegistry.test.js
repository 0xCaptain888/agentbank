const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AnalystRegistry", function () {
  let identity, reputation, analyst, usdc, owner, analyst1, allocator;

  beforeEach(async function () {
    [owner, analyst1, allocator] = await ethers.getSigners();

    const Identity = await ethers.getContractFactory("IdentityRegistry");
    identity = await Identity.deploy();
    await identity.waitForDeployment();

    const Reputation = await ethers.getContractFactory("ReputationRegistry");
    reputation = await Reputation.deploy(await identity.getAddress());
    await reputation.waitForDeployment();

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    usdc = await MockERC20.deploy("USDC", "USDC", 6);
    await usdc.waitForDeployment();

    const Analyst = await ethers.getContractFactory("AnalystRegistry");
    analyst = await Analyst.deploy(
      await identity.getAddress(),
      await reputation.getAddress(),
      await usdc.getAddress()
    );
    await analyst.waitForDeployment();

    // Grant allocator role
    const ALLOCATOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("ALLOCATOR_ROLE"));
    await analyst.grantRole(ALLOCATOR_ROLE, allocator.address);
  });

  describe("Registration", function () {
    it("should register analyst with sufficient stake", async function () {
      await analyst.connect(analyst1).register(
        "analyst1.domain", ethers.id("meta"),
        { value: ethers.parseEther("100") }
      );
      const agentId = await identity.agentByAddress(analyst1.address);
      const data = await analyst.analysts(agentId);
      expect(data.active).to.be.true;
      expect(data.stakedMNT).to.equal(ethers.parseEther("100"));
    });

    it("should reject insufficient stake", async function () {
      await expect(
        analyst.connect(analyst1).register("domain", ethers.ZeroHash, { value: ethers.parseEther("1") })
      ).to.be.revertedWith("stake below min");
    });
  });
});

const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SlashingPool", function () {
  let slashing, insurance, owner, agent1, slasher;

  beforeEach(async function () {
    [owner, agent1, slasher] = await ethers.getSigners();

    // Deploy a mock insurance (just receives ETH)
    const Insurance = await ethers.getContractFactory("InsurancePool");
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const usdc = await MockERC20.deploy("USDC", "USDC", 6);
    insurance = await Insurance.deploy(owner.address, await usdc.getAddress());
    await insurance.waitForDeployment();

    const Slashing = await ethers.getContractFactory("SlashingPool");
    slashing = await Slashing.deploy(owner.address, await insurance.getAddress());
    await slashing.waitForDeployment();

    // Grant slasher role
    const SLASHER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("SLASHER_ROLE"));
    await slashing.grantRole(SLASHER_ROLE, slasher.address);
  });

  describe("Staking", function () {
    it("should accept stakes", async function () {
      await slashing.connect(agent1).stake({ value: ethers.parseEther("5") });
      expect(await slashing.stakeOf(agent1.address)).to.equal(ethers.parseEther("5"));
    });

    it("should mark agent as operational", async function () {
      await slashing.connect(agent1).stake({ value: ethers.parseEther("2") });
      expect(await slashing.isOperational(agent1.address)).to.be.true;
    });
  });

  describe("Slashing", function () {
    it("should slash agent stake", async function () {
      await slashing.connect(agent1).stake({ value: ethers.parseEther("5") });
      await slashing.connect(slasher).slash(agent1.address, ethers.parseEther("2"), "test_slash");
      expect(await slashing.stakeOf(agent1.address)).to.equal(ethers.parseEther("3"));
    });

    it("should reject slash from non-slasher", async function () {
      await slashing.connect(agent1).stake({ value: ethers.parseEther("5") });
      await expect(
        slashing.connect(agent1).slash(agent1.address, ethers.parseEther("1"), "self")
      ).to.be.reverted;
    });
  });

  describe("Unstaking", function () {
    it("should enforce delay", async function () {
      await slashing.connect(agent1).stake({ value: ethers.parseEther("5") });
      await slashing.connect(agent1).requestUnstake();
      await expect(slashing.connect(agent1).executeUnstake()).to.be.revertedWith("delay");
    });
  });
});

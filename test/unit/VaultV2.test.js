const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AgentBankVaultV2", function () {
  let vault, usdc, owner, executor, guard, allocator, timelock, user;

  beforeEach(async function () {
    [owner, executor, guard, allocator, timelock, user] = await ethers.getSigners();

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    usdc = await MockERC20.deploy("USDC", "USDC", 6);
    await usdc.waitForDeployment();

    const Vault = await ethers.getContractFactory("AgentBankVaultV2");
    vault = await Vault.deploy(
      await usdc.getAddress(),
      executor.address,
      guard.address,
      allocator.address,
      timelock.address
    );
    await vault.waitForDeployment();

    // Mint USDC to user
    await usdc.mint(user.address, ethers.parseUnits("10000", 6));
    await usdc.connect(user).approve(await vault.getAddress(), ethers.MaxUint256);
  });

  describe("Deposits", function () {
    it("should accept deposits and mint shares", async function () {
      const amount = ethers.parseUnits("1000", 6);
      await vault.connect(user).deposit(amount, user.address);
      expect(await vault.balanceOf(user.address)).to.be.gt(0);
    });

    it("should update lastDeposit timestamp", async function () {
      const amount = ethers.parseUnits("100", 6);
      await vault.connect(user).deposit(amount, user.address);
      expect(await vault.lastDeposit(user.address)).to.be.gt(0);
    });

    it("should revert deposit when paused", async function () {
      await vault.connect(guard).emergencyPause();
      const amount = ethers.parseUnits("100", 6);
      await expect(vault.connect(user).deposit(amount, user.address)).to.be.reverted;
    });
  });

  describe("Withdrawals", function () {
    it("should enforce cooldown period", async function () {
      const amount = ethers.parseUnits("1000", 6);
      await vault.connect(user).deposit(amount, user.address);
      const shares = await vault.balanceOf(user.address);
      await expect(vault.connect(user).redeem(shares, user.address, user.address)).to.be.reverted;
    });

    it("should allow withdrawal after cooldown", async function () {
      const amount = ethers.parseUnits("1000", 6);
      await vault.connect(user).deposit(amount, user.address);
      const shares = await vault.balanceOf(user.address);

      // Advance time past cooldown
      await ethers.provider.send("evm_increaseTime", [86401]);
      await ethers.provider.send("evm_mine");

      await vault.connect(user).redeem(shares, user.address, user.address);
      expect(await vault.balanceOf(user.address)).to.equal(0);
    });
  });

  describe("Access Control", function () {
    it("should only allow executor to call executeOperation", async function () {
      await expect(
        vault.connect(user).executeOperation(
          ethers.ZeroAddress, "0x00000000", 0, 0,
          ethers.ZeroHash, ethers.ZeroHash
        )
      ).to.be.reverted;
    });

    it("should only allow guard to call logBlockedOperation", async function () {
      await expect(
        vault.connect(user).logBlockedOperation(ethers.ZeroHash, 50, "test")
      ).to.be.reverted;
    });

    it("should only allow timelock to set parameters", async function () {
      await expect(vault.connect(user).setMaxOperationBps(500)).to.be.reverted;
    });
  });

  describe("Stats", function () {
    it("should track total operations", async function () {
      expect(await vault.totalOpsExecuted()).to.equal(0);
      expect(await vault.totalOpsBlocked()).to.equal(0);
    });
  });
});

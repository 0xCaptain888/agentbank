const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AgentBankVault", function () {
  let vault, usdc, identity;
  let owner, executor, guard, allocator, user1;

  beforeEach(async function () {
    [owner, executor, guard, allocator, user1] = await ethers.getSigners();

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    usdc = await MockERC20.deploy("USD Coin", "USDC", 6);

    const AgentIdentity = await ethers.getContractFactory("AgentIdentity");
    identity = await AgentIdentity.deploy();

    const Vault = await ethers.getContractFactory("AgentBankVault");
    vault = await Vault.deploy(
      await usdc.getAddress(),
      executor.address,
      guard.address,
      allocator.address,
      await identity.getAddress()
    );

    // Mint USDC to user and approve vault
    await usdc.mint(user1.address, ethers.parseUnits("1000", 6));
    await usdc.connect(user1).approve(await vault.getAddress(), ethers.MaxUint256);
  });

  it("User can deposit USDC and receive shares", async function () {
    await vault.connect(user1).deposit(ethers.parseUnits("100", 6), user1.address);
    expect(await vault.balanceOf(user1.address)).to.be.gt(0);
    expect(await vault.totalAssets()).to.equal(ethers.parseUnits("100", 6));
  });

  it("Only executor can call executeOperation", async function () {
    await vault.connect(user1).deposit(ethers.parseUnits("100", 6), user1.address);
    await expect(
      vault.connect(user1).executeOperation(
        ethers.ZeroAddress, "0x", 0, "swap", ethers.ZeroHash
      )
    ).to.be.reverted;
  });

  it("Operation blocked if amount exceeds 10% of TVL", async function () {
    await vault.connect(user1).deposit(ethers.parseUnits("100", 6), user1.address);
    await expect(
      vault.connect(executor).executeOperation(
        ethers.ZeroAddress, "0x",
        ethers.parseUnits("20", 6), // 20% — should fail
        "swap",
        ethers.ZeroHash
      )
    ).to.be.revertedWithCustomError(vault, "ExceedsMaxOperationLimit");
  });

  it("Guard can log blocked operation", async function () {
    await expect(
      vault.connect(guard).logBlockedOperation(
        executor.address, "oracle_anomaly", 85, ethers.ZeroHash
      )
    ).to.emit(vault, "OperationBlocked");
  });

  it("Emergency pause stops all operations", async function () {
    await vault.connect(owner).setPaused(true);
    await vault.connect(user1).deposit(ethers.parseUnits("100", 6), user1.address);
    await expect(
      vault.connect(executor).executeOperation(
        ethers.ZeroAddress, "0x", ethers.parseUnits("1", 6), "swap", ethers.ZeroHash
      )
    ).to.be.revertedWithCustomError(vault, "VaultIsPaused");
  });

  it("getVaultStats returns correct values", async function () {
    await vault.connect(user1).deposit(ethers.parseUnits("100", 6), user1.address);
    const [tvl, ops_exec, ops_blocked, yield_dist, is_paused] = await vault.getVaultStats();
    expect(tvl).to.equal(ethers.parseUnits("100", 6));
    expect(is_paused).to.equal(false);
  });

  it("Only allocator can distribute yield", async function () {
    await vault.connect(user1).deposit(ethers.parseUnits("100", 6), user1.address);
    await expect(
      vault.connect(user1).distributeYield(ethers.parseUnits("5", 6))
    ).to.be.reverted;
  });

  it("Allocator can distribute yield", async function () {
    await vault.connect(user1).deposit(ethers.parseUnits("100", 6), user1.address);
    await expect(
      vault.connect(allocator).distributeYield(ethers.parseUnits("5", 6))
    ).to.emit(vault, "YieldDistributed");
    expect(await vault.totalYieldDistributed()).to.equal(ethers.parseUnits("5", 6));
  });

  it("Cannot distribute zero yield", async function () {
    await expect(
      vault.connect(allocator).distributeYield(0)
    ).to.be.revertedWithCustomError(vault, "ZeroAmount");
  });

  it("Admin can set max operation bps", async function () {
    await vault.connect(owner).setMaxOperationBps(2000);
    expect(await vault.maxOperationBps()).to.equal(2000);
  });

  it("Max operation bps cannot exceed 50%", async function () {
    await expect(
      vault.connect(owner).setMaxOperationBps(6000)
    ).to.be.revertedWith("Max 50%");
  });
});

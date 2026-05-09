const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Vault Invariant Tests", function () {
  let vault, usdc, owner, executor, guard, allocator, timelock;
  let users = [];

  beforeEach(async function () {
    const signers = await ethers.getSigners();
    [owner, executor, guard, allocator, timelock, ...users] = signers;

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    usdc = await MockERC20.deploy("USDC", "USDC", 6);

    const Vault = await ethers.getContractFactory("AgentBankVaultV2");
    vault = await Vault.deploy(
      await usdc.getAddress(),
      executor.address,
      guard.address,
      allocator.address,
      timelock.address
    );

    // Fund users
    for (const user of users.slice(0, 5)) {
      await usdc.mint(user.address, ethers.parseUnits("100000", 6));
      await usdc.connect(user).approve(await vault.getAddress(), ethers.MaxUint256);
    }
  });

  it("INVARIANT: totalAssets >= totalSupply (solvency)", async function () {
    // Multiple deposits
    for (const user of users.slice(0, 5)) {
      const amount = ethers.parseUnits(String(Math.floor(Math.random() * 1000) + 100), 6);
      await vault.connect(user).deposit(amount, user.address);
    }

    const totalAssets = await vault.totalAssets();
    const totalSupply = await vault.totalSupply();
    expect(totalAssets).to.be.gte(totalSupply);
  });

  it("INVARIANT: sum of user shares == totalSupply", async function () {
    for (const user of users.slice(0, 3)) {
      await vault.connect(user).deposit(ethers.parseUnits("500", 6), user.address);
    }

    let sumShares = 0n;
    for (const user of users.slice(0, 3)) {
      sumShares += await vault.balanceOf(user.address);
    }
    expect(sumShares).to.equal(await vault.totalSupply());
  });

  it("INVARIANT: share price never decreases without operation", async function () {
    await vault.connect(users[0]).deposit(ethers.parseUnits("1000", 6), users[0].address);
    const priceBefore = await vault.convertToAssets(ethers.parseUnits("1", 18));

    await vault.connect(users[1]).deposit(ethers.parseUnits("500", 6), users[1].address);
    const priceAfter = await vault.convertToAssets(ethers.parseUnits("1", 18));

    expect(priceAfter).to.be.gte(priceBefore);
  });
});

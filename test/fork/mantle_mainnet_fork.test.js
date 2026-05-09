const { expect } = require("chai");
const { ethers } = require("hardhat");

/**
 * Fork tests against Mantle Mainnet.
 * Requires MANTLE_RPC_URL in hardhat.config.js forking section.
 * Run with: npx hardhat test test/fork/mantle_mainnet_fork.test.js --network hardhat
 */
describe("Mantle Mainnet Fork", function () {
  this.timeout(120000);

  let vault, dex, usdc;
  let owner, executor, guard, allocator, timelock;

  // Mantle mainnet addresses
  const USDC_MANTLE = "0x09Bc4E0D864854c6aFB6eB9A9cdF58aC190D0dF9";
  const WMNT = "0x78c1b0C915c4FAA5FffA6CAbf0219DA63d7f4cb8";
  const ONEINCH_ROUTER = "0x111111125421cA6dc452d289314280a0f8842A65";

  before(async function () {
    // Skip if not forking
    const blockNumber = await ethers.provider.getBlockNumber();
    if (blockNumber < 1000000) {
      this.skip();
      return;
    }

    [owner, executor, guard, allocator, timelock] = await ethers.getSigners();
    usdc = await ethers.getContractAt("IERC20", USDC_MANTLE);

    // Deploy V2 vault
    const Vault = await ethers.getContractFactory("AgentBankVaultV2");
    vault = await Vault.deploy(
      USDC_MANTLE,
      executor.address,
      guard.address,
      allocator.address,
      timelock.address
    );
    await vault.waitForDeployment();

    // Deploy DEX Adapter
    const DEX = await ethers.getContractFactory("DEXAdapter");
    dex = await DEX.deploy();
    await dex.waitForDeployment();
  });

  it("should deploy vault with correct asset on Mantle fork", async function () {
    const asset = await vault.asset();
    expect(asset.toLowerCase()).to.equal(USDC_MANTLE.toLowerCase());
  });

  it("should interact with real USDC on Mantle", async function () {
    const decimals = await usdc.decimals();
    expect(decimals).to.be.oneOf([6n, 6]);
  });

  it("should verify 1inch router exists on Mantle", async function () {
    const code = await ethers.provider.getCode(ONEINCH_ROUTER);
    expect(code).to.not.equal("0x");
  });

  it("should verify wMNT exists on Mantle", async function () {
    const code = await ethers.provider.getCode(WMNT);
    expect(code).to.not.equal("0x");
  });
});

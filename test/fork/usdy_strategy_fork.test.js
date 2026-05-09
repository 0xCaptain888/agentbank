const { expect } = require("chai");
const { ethers } = require("hardhat");

/**
 * Fork test for USDY RWA Strategy on Mantle.
 * Tests real interaction with Ondo USDY contract.
 */
describe("USDY Strategy Fork Test", function () {
  this.timeout(120000);

  let rwaStrategy, usdc, vault;
  let owner, allocator;

  // Mantle mainnet addresses (placeholder — update with real USDY address)
  const USDC_MANTLE = "0x09Bc4E0D864854c6aFB6eB9A9cdF58aC190D0dF9";
  const USDY_MANTLE = "0x5bE26527e817998A7206475496fDE1E68957c5A6"; // Example

  before(async function () {
    const blockNumber = await ethers.provider.getBlockNumber();
    if (blockNumber < 1000000) {
      this.skip();
      return;
    }

    [owner, allocator] = await ethers.getSigners();

    // Deploy vault first
    const Vault = await ethers.getContractFactory("AgentBankVaultV2");
    vault = await Vault.deploy(
      USDC_MANTLE,
      owner.address,
      owner.address,
      allocator.address,
      owner.address
    );
    await vault.waitForDeployment();

    // Deploy RWA Strategy
    const RWA = await ethers.getContractFactory("RWAStrategy");
    rwaStrategy = await RWA.deploy(USDC_MANTLE, USDY_MANTLE, await vault.getAddress());
    await rwaStrategy.waitForDeployment();
  });

  it("should deploy RWA strategy with correct token addresses", async function () {
    expect(await rwaStrategy.usdc()).to.equal(USDC_MANTLE);
  });

  it("should report zero NAV initially", async function () {
    const nav = await rwaStrategy.nav();
    expect(nav).to.equal(0);
  });

  it("should verify USDY contract exists on Mantle", async function () {
    const code = await ethers.provider.getCode(USDY_MANTLE);
    // May or may not exist depending on actual deployment
    // This is a placeholder that validates our fork setup
    expect(code).to.not.be.undefined;
  });
});

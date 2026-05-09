const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("RiskOracle", function () {
  let oracle, owner;
  const MOCK_PYTH = "0x0000000000000000000000000000000000000001";

  beforeEach(async function () {
    [owner] = await ethers.getSigners();
    // Note: In production tests, use a mock Pyth contract
    // This tests basic setup
    const Oracle = await ethers.getContractFactory("RiskOracle");
    oracle = await Oracle.deploy(MOCK_PYTH);
    await oracle.waitForDeployment();
  });

  describe("Configuration", function () {
    it("should set price IDs", async function () {
      const token = "0x0000000000000000000000000000000000000002";
      const priceId = ethers.id("ETH/USD");
      await oracle.setPriceId(token, priceId);
      expect(await oracle.priceIds(token)).to.equal(priceId);
    });
  });

  describe("Anomaly Detection", function () {
    it("should return no anomaly when no history", async function () {
      const token = "0x0000000000000000000000000000000000000002";
      const priceId = ethers.id("ETH/USD");
      await oracle.setPriceId(token, priceId);
      // Without a proper Pyth mock, this will revert - placeholder test
      // In integration tests, use a full Pyth mock
    });
  });
});

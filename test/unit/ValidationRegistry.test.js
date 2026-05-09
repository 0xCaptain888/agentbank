const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ValidationRegistry", function () {
  let identity, validation, owner, requester, validator;

  beforeEach(async function () {
    [owner, requester, validator] = await ethers.getSigners();

    const Identity = await ethers.getContractFactory("IdentityRegistry");
    identity = await Identity.deploy();
    await identity.waitForDeployment();

    const Validation = await ethers.getContractFactory("ValidationRegistry");
    validation = await Validation.deploy(await identity.getAddress());
    await validation.waitForDeployment();

    // Register agents
    await identity.registerAgent(requester.address, "requester.domain", "executor", ethers.ZeroHash);
    await identity.registerAgent(validator.address, "validator.domain", "guard", ethers.ZeroHash);
  });

  describe("Request Validation", function () {
    it("should create a validation request", async function () {
      const dataHash = ethers.id("test_data");
      const tx = await validation.requestValidation(requester.address, validator.address, dataHash, 0);
      const receipt = await tx.wait();
      expect(receipt.logs.length).to.be.gt(0);
    });

    it("should reject unregistered agents", async function () {
      await expect(
        validation.requestValidation(owner.address, validator.address, ethers.ZeroHash, 0)
      ).to.be.revertedWith("unregistered agent");
    });
  });

  describe("Respond Validation", function () {
    it("should allow validator to respond with Valid", async function () {
      const dataHash = ethers.id("test_data");
      await validation.requestValidation(requester.address, validator.address, dataHash, 0);
      const requestId = await validation.requestIds(0);
      await validation.connect(validator).respondValidation(requestId, 1, ethers.id("response"), "ipfs://evidence");
      const req = await validation.requests(requestId);
      expect(req.status).to.equal(1); // Valid
    });
  });
});

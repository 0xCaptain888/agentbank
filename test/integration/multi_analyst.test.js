const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Multi-Analyst Integration", function () {
  let identity, reputation, analystRegistry, usdc;
  let owner, analyst1, analyst2, analyst3, allocator;

  beforeEach(async function () {
    [owner, analyst1, analyst2, analyst3, allocator] = await ethers.getSigners();

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    usdc = await MockERC20.deploy("USDC", "USDC", 6);

    const Identity = await ethers.getContractFactory("IdentityRegistry");
    identity = await Identity.deploy();

    const Reputation = await ethers.getContractFactory("ReputationRegistry");
    reputation = await Reputation.deploy(await identity.getAddress());

    const Analyst = await ethers.getContractFactory("AnalystRegistry");
    analystRegistry = await Analyst.deploy(
      await identity.getAddress(),
      await reputation.getAddress(),
      await usdc.getAddress()
    );

    const ALLOCATOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("ALLOCATOR_ROLE"));
    await analystRegistry.grantRole(ALLOCATOR_ROLE, allocator.address);
  });

  it("should register multiple analysts with different stakes", async function () {
    await analystRegistry.connect(analyst1).register("analyst1.xyz", ethers.ZeroHash, { value: ethers.parseEther("100") });
    await analystRegistry.connect(analyst2).register("analyst2.xyz", ethers.ZeroHash, { value: ethers.parseEther("200") });
    await analystRegistry.connect(analyst3).register("analyst3.xyz", ethers.ZeroHash, { value: ethers.parseEther("150") });

    const actives = await analystRegistry.getActiveAnalysts();
    expect(actives.length).to.equal(3);
  });

  it("should calculate weight based on stake and reputation", async function () {
    await analystRegistry.connect(analyst1).register("analyst1.xyz", ethers.ZeroHash, { value: ethers.parseEther("100") });
    const agentId = await identity.agentByAddress(analyst1.address);
    const weight = await analystRegistry.weight(agentId);
    expect(weight).to.be.gt(0);
  });

  it("should attribute positive outcome and generate rewards", async function () {
    await analystRegistry.connect(analyst1).register("analyst1.xyz", ethers.ZeroHash, { value: ethers.parseEther("100") });
    const agentId = await identity.agentByAddress(analyst1.address);

    // Mint USDC to allocator for fee payment
    await usdc.mint(allocator.address, ethers.parseUnits("1000", 6));
    await usdc.connect(allocator).approve(await analystRegistry.getAddress(), ethers.MaxUint256);

    await analystRegistry.connect(allocator).recordSignalChosen(agentId, ethers.id("signal1"));
    await analystRegistry.connect(allocator).attributeOutcome(agentId, ethers.id("signal1"), ethers.parseUnits("100", 6), ethers.parseUnits("2000", 6));

    const data = await analystRegistry.analysts(agentId);
    expect(data.unclaimedRewards).to.be.gt(0);
  });
});

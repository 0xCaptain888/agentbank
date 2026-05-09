const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Full Cycle Integration", function () {
  let vault, identity, reputation, validation, reasoning, breaker;
  let usdc, owner, executor, guard, allocator, timelock, user;

  beforeEach(async function () {
    [owner, executor, guard, allocator, timelock, user] = await ethers.getSigners();

    // Deploy USDC mock
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    usdc = await MockERC20.deploy("USDC", "USDC", 6);

    // Deploy identity system
    const Identity = await ethers.getContractFactory("IdentityRegistry");
    identity = await Identity.deploy();

    const Reputation = await ethers.getContractFactory("ReputationRegistry");
    reputation = await Reputation.deploy(await identity.getAddress());

    const Validation = await ethers.getContractFactory("ValidationRegistry");
    validation = await Validation.deploy(await identity.getAddress());

    // Deploy reasoning registry
    const LLM = await ethers.getContractFactory("LLMReasoningRegistry");
    reasoning = await LLM.deploy();

    // Deploy circuit breaker
    const Breaker = await ethers.getContractFactory("CircuitBreaker");
    breaker = await Breaker.deploy(timelock.address);

    // Deploy vault
    const Vault = await ethers.getContractFactory("AgentBankVaultV2");
    vault = await Vault.deploy(
      await usdc.getAddress(),
      executor.address,
      guard.address,
      allocator.address,
      timelock.address
    );

    // Register agents
    await identity.registerAgent(executor.address, "agentbank.xyz/executor", "executor", ethers.ZeroHash);
    await identity.registerAgent(guard.address, "agentbank.xyz/guard", "guard", ethers.ZeroHash);
    await identity.registerAgent(allocator.address, "agentbank.xyz/allocator", "allocator", ethers.ZeroHash);

    // Fund user
    await usdc.mint(user.address, ethers.parseUnits("10000", 6));
    await usdc.connect(user).approve(await vault.getAddress(), ethers.MaxUint256);
  });

  it("should complete a full deposit → signal → execute → withdraw cycle", async function () {
    // 1. User deposits
    const depositAmount = ethers.parseUnits("1000", 6);
    await vault.connect(user).deposit(depositAmount, user.address);
    expect(await vault.totalAssets()).to.be.gte(depositAmount);

    // 2. Record reasoning
    const promptHash = ethers.id("test_prompt");
    const outputHash = ethers.id("test_output");
    await reasoning.connect(executor).record("deepseek-v3", promptHash, outputHash, "ipfs://test");

    // 3. Guard blocks an operation
    await vault.connect(guard).logBlockedOperation(ethers.id("signal1"), 85, "high_risk");
    expect(await vault.totalOpsBlocked()).to.equal(1);

    // 4. Advance time for withdrawal
    await ethers.provider.send("evm_increaseTime", [86401]);
    await ethers.provider.send("evm_mine");

    // 5. User withdraws
    const shares = await vault.balanceOf(user.address);
    await vault.connect(user).redeem(shares, user.address, user.address);
    expect(await vault.balanceOf(user.address)).to.equal(0);
  });

  it("should maintain ERC-8004 identity across operations", async function () {
    const executorAgent = await identity.getAgentByAddress(executor.address);
    expect(executorAgent.active).to.be.true;
    expect(executorAgent.agentType).to.equal("executor");

    // Authorize vault as feedback client
    const executorId = await identity.agentByAddress(executor.address);
    await reputation.connect(executor).authorize(executorId, await vault.getAddress());
  });
});

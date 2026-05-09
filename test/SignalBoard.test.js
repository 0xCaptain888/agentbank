const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SignalBoard", function () {
  let signalBoard;
  let owner, analyst, executor, unauthorized;

  beforeEach(async function () {
    [owner, analyst, executor, unauthorized] = await ethers.getSigners();

    const SignalBoard = await ethers.getContractFactory("SignalBoard");
    signalBoard = await SignalBoard.deploy();

    // Set up permissions
    await signalBoard.setAuthorizedPoster(analyst.address, true);
    await signalBoard.setAuthorizedExecutor(executor.address, true);
  });

  it("Authorized poster can post signal", async function () {
    const tx = await signalBoard.connect(analyst).postSignal(
      "swap",
      "merchant_moe",
      ethers.ZeroAddress,
      ethers.ZeroAddress,
      ethers.parseUnits("100", 6),
      ethers.parseUnits("97", 6),
      85,
      "High APR opportunity on USDC/WETH pool"
    );

    await expect(tx).to.emit(signalBoard, "SignalPosted");
    expect(await signalBoard.getTotalSignals()).to.equal(1);
  });

  it("Unauthorized address cannot post signal", async function () {
    await expect(
      signalBoard.connect(unauthorized).postSignal(
        "swap", "merchant_moe",
        ethers.ZeroAddress, ethers.ZeroAddress,
        100, 97, 85, "test"
      )
    ).to.be.revertedWith("Not authorized poster");
  });

  it("Confidence must be <= 100", async function () {
    await expect(
      signalBoard.connect(analyst).postSignal(
        "swap", "merchant_moe",
        ethers.ZeroAddress, ethers.ZeroAddress,
        100, 97, 101, "test"
      )
    ).to.be.revertedWith("Confidence must be 0-100");
  });

  it("Can fetch pending signals", async function () {
    await signalBoard.connect(analyst).postSignal(
      "swap", "merchant_moe",
      ethers.ZeroAddress, ethers.ZeroAddress,
      ethers.parseUnits("100", 6),
      ethers.parseUnits("97", 6),
      85,
      "Signal 1"
    );

    await signalBoard.connect(analyst).postSignal(
      "rebalance", "agni_finance",
      ethers.ZeroAddress, ethers.ZeroAddress,
      ethers.parseUnits("50", 6),
      ethers.parseUnits("48", 6),
      72,
      "Signal 2"
    );

    const pending = await signalBoard.getPendingSignals();
    expect(pending.length).to.equal(2);
  });

  it("Executor can update signal status", async function () {
    await signalBoard.connect(analyst).postSignal(
      "swap", "merchant_moe",
      ethers.ZeroAddress, ethers.ZeroAddress,
      100, 97, 85, "test"
    );

    const signal = await signalBoard.getLatestSignal();
    const signalId = signal.id;

    await expect(
      signalBoard.connect(executor).updateSignalStatus(
        signalId,
        1, // Executed
        ethers.ZeroHash
      )
    ).to.emit(signalBoard, "SignalStatusUpdated");

    const updated = await signalBoard.getSignalById(signalId);
    expect(updated.status).to.equal(1); // Executed
  });

  it("Unauthorized address cannot update signal status", async function () {
    await signalBoard.connect(analyst).postSignal(
      "swap", "merchant_moe",
      ethers.ZeroAddress, ethers.ZeroAddress,
      100, 97, 85, "test"
    );

    const signal = await signalBoard.getLatestSignal();

    await expect(
      signalBoard.connect(unauthorized).updateSignalStatus(signal.id, 1, ethers.ZeroHash)
    ).to.be.revertedWith("Not authorized executor");
  });

  it("getLatestSignal returns the most recent signal", async function () {
    await signalBoard.connect(analyst).postSignal(
      "swap", "merchant_moe",
      ethers.ZeroAddress, ethers.ZeroAddress,
      100, 97, 75, "First signal"
    );

    await signalBoard.connect(analyst).postSignal(
      "rebalance", "agni_finance",
      ethers.ZeroAddress, ethers.ZeroAddress,
      200, 194, 90, "Second signal"
    );

    const latest = await signalBoard.getLatestSignal();
    expect(latest.signalType).to.equal("rebalance");
    expect(latest.confidence).to.equal(90);
  });
});

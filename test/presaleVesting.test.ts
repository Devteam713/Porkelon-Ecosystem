import { expect } from "chai";
import { ethers } from "hardhat";

const TAX_BPS = 100n;
const BPS = 10000n;
const NET_DENOM = BPS - TAX_BPS; // 9900

describe("PresaleVesting (tax-aware)", function () {
  let deployer: any, buyer: any, devWallet: any;
  let taxToken: any, PresaleVesting: any, vesting: any;

  beforeEach(async function () {
    [deployer, buyer, devWallet] = await ethers.getSigners();

    const MockTaxToken = await ethers.getContractFactory("MockTaxToken");
    taxToken = await MockTaxToken.deploy(
      "MockPORK",
      "mPORK",
      ethers.parseUnits("1000000000", 18),
      await devWallet.getAddress(),
      100 // 1% tax
    );
    await taxToken.waitForDeployment();

    PresaleVesting = await ethers.getContractFactory("PresaleVesting");
    vesting = await PresaleVesting.deploy(taxToken.target);
    await vesting.waitForDeployment();

    // Transfer some PORK (gross) to vesting contract for release pool
    const netTotal = ethers.parseUnits("10000", 18);
    const grossNumerator = BigInt(netTotal.toString()) * BPS;
    let gross = grossNumerator / NET_DENOM;
    if (grossNumerator % NET_DENOM !== 0n) gross += 1n;
    await (await taxToken.transfer(vesting.target, gross.toString())).wait();
  });

  it("should release vested net tokens correctly, dev wallet gets tax", async function () {
    const totalVested = ethers.parseUnits("1000", 18);
    const start = (await ethers.provider.getBlock("latest")).timestamp;
    const duration = 60 * 60 * 24 * 30; // 30 days

    await (await vesting.createVesting(await buyer.getAddress(), totalVested, start, duration)).wait();

    // move halfway through vesting
    await ethers.provider.send("evm_increaseTime", [duration / 2]);
    await ethers.provider.send("evm_mine", []);

    // buyer claims half the vested tokens
    const expectedNet = BigInt(totalVested.toString()) / 2n;
    const grossNumerator = expectedNet * BPS;
    let gross = grossNumerator / NET_DENOM;
    if (grossNumerator % NET_DENOM !== 0n) gross += 1n;
    const expectedTax = (gross * TAX_BPS) / BPS;

    const buyerBefore = BigInt((await taxToken.balanceOf(await buyer.getAddress())).toString());
    const devBefore = BigInt((await taxToken.balanceOf(await devWallet.getAddress())).toString());

    await (await vesting.connect(buyer).release()).wait();

    const buyerAfter = BigInt((await taxToken.balanceOf(await buyer.getAddress())).toString());
    const devAfter = BigInt((await taxToken.balanceOf(await devWallet.getAddress())).toString());

    const buyerReceived = buyerAfter - buyerBefore;
    const devReceived = devAfter - devBefore;

    expect(buyerReceived).to.equal(expectedNet);
    expect(devReceived).to.equal(expectedTax);
  });
});

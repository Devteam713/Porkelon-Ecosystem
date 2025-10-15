import { expect } from "chai";
import { ethers } from "hardhat";

const TAX_BPS = 100n;
const BPS = 10000n;
const NET_DENOM = BPS - TAX_BPS;

describe("StakingRewards (tax-aware)", function () {
  let deployer: any, alice: any, devWallet: any;
  let taxToken: any, stakingToken: any, stakingRewards: any;

  beforeEach(async function () {
    [deployer, alice, devWallet] = await ethers.getSigners();

    const MockTaxToken = await ethers.getContractFactory("MockTaxToken");
    taxToken = await MockTaxToken.deploy(
      "MockPORK",
      "mPORK",
      ethers.parseUnits("1000000000", 18),
      await devWallet.getAddress(),
      100
    );
    await taxToken.waitForDeployment();

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    stakingToken = await MockERC20.deploy("StakeToken", "STK");
    await stakingToken.waitForDeployment();
    await (await stakingToken.mint(await alice.getAddress(), ethers.parseUnits("1000", 18))).wait();

    const StakingRewards = await ethers.getContractFactory("StakingRewards");
    stakingRewards = await StakingRewards.deploy(stakingToken.target, taxToken.target);
    await stakingRewards.waitForDeployment();

    // fund rewards pool with gross PORK
    const netRewards = ethers.parseUnits("5000", 18);
    const grossNumerator = BigInt(netRewards.toString()) * BPS;
    let gross = grossNumerator / NET_DENOM;
    if (grossNumerator % NET_DENOM !== 0n) gross += 1n;
    await (await taxToken.transfer(stakingRewards.target, gross.toString())).wait();
    await (await stakingRewards.notifyRewardAmount(netRewards, 7 * 24 * 60 * 60)).wait(); // 1 week
  });

  it("should reward staker net correctly after full duration", async function () {
    const stakeAmount = ethers.parseUnits("1000", 18);
    await (await stakingToken.connect(alice).approve(stakingRewards.target, stakeAmount)).wait();
    await (await stakingRewards.connect(alice).stake(stakeAmount)).wait();

    // move forward full week
    await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60]);
    await ethers.provider.send("evm_mine", []);

    // claim rewards
    const aliceBefore = BigInt((await taxToken.balanceOf(await alice.getAddress())).toString());
    const devBefore = BigInt((await taxToken.balanceOf(await devWallet.getAddress())).toString());
    await (await stakingRewards.connect(alice).getReward()).wait();
    const aliceAfter = BigInt((await taxToken.balanceOf(await alice.getAddress())).toString());
    const devAfter = BigInt((await taxToken.balanceOf(await devWallet.getAddress())).toString());

    const aliceReceived = aliceAfter - aliceBefore;
    const devReceived = devAfter - devBefore;

    // she should receive full net reward = netRewards
    const expectedNet = BigInt(ethers.parseUnits("5000", 18).toString());
    expect(aliceReceived).to.equal(expectedNet);

    // dev should receive 1% of gross
    const grossNum = expectedNet * BPS;
    let gross = grossNum / NET_DENOM;
    if (grossNum % NET_DENOM !== 0n) gross += 1n;
    const expectedTax = (gross * TAX_BPS) / BPS;
    expect(devReceived).to.equal(expectedTax);
  });
});

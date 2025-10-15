import { expect } from "chai";
import { ethers } from "hardhat";

const TAX_BPS = 100n; // 1%
const BPS = 10000n;
const NET_DENOM = BPS - TAX_BPS; // 9900

describe("LiquidityMining (integration with taxed reward token)", function () {
  let deployer: any;
  let alice: any;
  let bob: any;
  let devWallet: any;

  let MockTaxToken: any;
  let MockERC20: any;
  let LiquidityMining: any;

  beforeEach(async function () {
    [deployer, alice, bob, devWallet] = await ethers.getSigners();

    MockTaxToken = await ethers.getContractFactory("MockTaxToken");
    MockERC20 = await ethers.getContractFactory("MockERC20");
    LiquidityMining = await ethers.getContractFactory("LiquidityMining");

    // Deploy MockTaxToken with large supply to deployer
    const initialSupply = ethers.parseUnits("1000000000", 18); // 1B
    const taxToken = await MockTaxToken.deploy("MockPORK", "mPORK", initialSupply, await devWallet.getAddress(), 100);
    await taxToken.waitForDeployment();

    // Deploy LP token and mint LP to alice and bob
    const lp = await MockERC20.deploy("LPToken", "LP");
    await lp.waitForDeployment();
    // Mint LPs
    const lpMint = ethers.parseUnits("1000", 18);
    await (await lp.mint(await alice.getAddress(), lpMint)).wait();
    await (await lp.mint(await bob.getAddress(), lpMint)).wait();

    // Deploy LiquidityMining with lp token and taxed reward token
    const mining = await LiquidityMining.deploy(lp.target, taxToken.target);
    await mining.waitForDeployment();

    // Expose to tests
    this.taxToken = taxToken;
    this.lp = lp;
    this.mining = mining;
  });

  it("should distribute net rewards correctly to single staker (gross-up math)", async function () {
    const { taxToken, lp, mining } = this;

    // params
    const netTotal = ethers.parseUnits("1000", 18); // we want to distribute 1000 net tokens
    const duration = 60 * 60 * 24 * 7; // 7 days
    // compute gross required: gross = ceil(net * BPS / NET_DENOM)
    const netBig = BigInt(netTotal.toString());
    const grossNumerator = netBig * BPS;
    let grossBig = grossNumerator / NET_DENOM;
    if (grossNumerator % NET_DENOM !== 0n) grossBig = grossBig + 1n;
    const gross = grossBig.toString();

    // transfer gross from deployer to mining contract
    const deployerAddr = await (await ethers.getSigners())[0].getAddress();
    // Ensure deployer has enough taxToken: already minted initialSupply to deployer in beforeEach
    await (await taxToken.transfer(mining.target, gross)).wait();

    // Notify net reward and duration
    await (await mining.notifyRewardAmount(netTotal, duration)).wait();

    // alice stakes LP
    const stakeAmount = ethers.parseUnits("1000", 18); // she stakes all (only staker)
    // approve and stake
    await (await lp.connect(alice).approve(mining.target, stakeAmount)).wait();
    await (await mining.connect(alice).stake(stakeAmount)).wait();

    // advance time by half duration
    const half = Math.floor(duration / 2);
    await ethers.provider.send("evm_increaseTime", [half]);
    await ethers.provider.send("evm_mine", []);

    // compute expected net earned for alice:
    // rewardRate = netTotal / duration (net/sec)
    // earned = rewardRate * elapsed (since she is only staker)
    const netTotalBig = BigInt(netTotal.toString());
    const elapsed = BigInt(half);
    const expectedNetEarnedBig = (netTotalBig * elapsed) / BigInt(duration);
    const expectedNetEarned = expectedNetEarnedBig.toString();

    // check earned view matches expected (approx)
    const earned = await mining.earned(await alice.getAddress());
    expect(earned).to.equal(expectedNetEarned);

    // track alice and devWallet balances before claim
    const aliceBefore = await taxToken.balanceOf(await alice.getAddress());
    const devBefore = await taxToken.balanceOf(await devWallet.getAddress());

    // alice claims reward
    await (await mining.connect(alice).getReward()).wait();

    // After getReward, taxToken should have transferred gross to alice (which then taxed 1% to dev)
    // The user net received should equal expectedNetEarned
    const aliceAfter = await taxToken.balanceOf(await alice.getAddress());
    const devAfter = await taxToken.balanceOf(await devWallet.getAddress());

    const aliceReceived = BigInt(aliceAfter.toString()) - BigInt(aliceBefore.toString());
    const devReceived = BigInt(devAfter.toString()) - BigInt(devBefore.toString());

    // aliceReceived should equal expectedNetEarned (net)
    expect(aliceReceived).to.equal(expectedNetEarnedBig);

    // devReceived should equal tax on gross claimed: tax = grossUser * TAX_BPS / BPS_DIVISOR
    // compute gross for alice's net: gross_user = ceil(net_user * BPS / NET_DENOM)
    const grossNumeratorUser = expectedNetEarnedBig * BPS;
    let grossUser = grossNumeratorUser / NET_DENOM;
    if (grossNumeratorUser % NET_DENOM !== 0n) grossUser = grossUser + 1n;
    const expectedTaxUser = (grossUser * TAX_BPS) / BPS;
    expect(devReceived).to.equal(expectedTaxUser);
  });

  it("should split rewards between multiple stakers proportionally", async function () {
    const { taxToken, lp, mining } = this;

    // fund mining with gross for netTotal=1000
    const netTotal = ethers.parseUnits("1000", 18);
    const netBig = BigInt(netTotal.toString());
    const grossNumerator = netBig * BPS;
    let grossBig = grossNumerator / NET_DENOM;
    if (grossNumerator % NET_DENOM !== 0n) grossBig = grossBig + 1n;
    await (await taxToken.transfer(mining.target, grossBig.toString())).wait();
    const duration = 60 * 60 * 24 * 7;
    await (await mining.notifyRewardAmount(netTotal, duration)).wait();

    // alice stakes 750 LP, bob stakes 250 LP -> total 1000
    const aliceStake = ethers.parseUnits("750", 18);
    const bobStake = ethers.parseUnits("250", 18);

    await (await lp.connect(alice).approve(mining.target, aliceStake)).wait();
    await (await lp.connect(bob).approve(mining.target, bobStake)).wait();
    await (await mining.connect(alice).stake(aliceStake)).wait();
    await (await mining.connect(bob).stake(bobStake)).wait();

    // advance whole duration so all rewards available
    await ethers.provider.send("evm_increaseTime", [duration]);
    await ethers.provider.send("evm_mine", []);

    // earned for alice should be 75% of netTotal, bob 25%
    const earnedAlice = await mining.earned(await alice.getAddress());
    const earnedBob = await mining.earned(await bob.getAddress());
    const expectedAliceNet = (netBig * 75n) / 100n;
    const expectedBobNet = (netBig * 25n) / 100n;
    expect(BigInt(earnedAlice.toString())).to.equal(expectedAliceNet);
    expect(BigInt(earnedBob.toString())).to.equal(expectedBobNet);

    // track balances before
    const aliceBefore = BigInt((await taxToken.balanceOf(await alice.getAddress())).toString());
    const bobBefore = BigInt((await taxToken.balanceOf(await bob.getAddress())).toString());
    const devBefore = BigInt((await taxToken.balanceOf(await devWallet.getAddress())).toString());

    // claim for both
    await (await mining.connect(alice).getReward()).wait();
    await (await mining.connect(bob).getReward()).wait();

    const aliceAfter = BigInt((await taxToken.balanceOf(await alice.getAddress())).toString());
    const bobAfter = BigInt((await taxToken.balanceOf(await bob.getAddress())).toString());
    const devAfter = BigInt((await taxToken.balanceOf(await devWallet.getAddress())).toString());

    const aliceNetReceived = aliceAfter - aliceBefore;
    const bobNetReceived = bobAfter - bobBefore;
    const devReceived = devAfter - devBefore;

    // They should receive net amounts equal to expected
    expect(aliceNetReceived).to.equal(expectedAliceNet);
    expect(bobNetReceived).to.equal(expectedBobNet);

    // dev received taxes from both gross transfers
    // compute gross for each
    const grossAliceNum = expectedAliceNet * BPS;
    let grossAlice = grossAliceNum / NET_DENOM;
    if (grossAliceNum % NET_DENOM !== 0n) grossAlice += 1n;
    const taxAlice = (grossAlice * TAX_BPS) / BPS;

    const grossBobNum = expectedBobNet * BPS;
    let grossBob = grossBobNum / NET_DENOM;
    if (grossBobNum % NET_DENOM !== 0n) grossBob += 1n;
    const taxBob = (grossBob * TAX_BPS) / BPS;

    expect(devReceived).to.equal(taxAlice + taxBob);
  });

  it("getReward reverts if contract lacks gross balance", async function () {
    const { taxToken, lp, mining } = this;

    // set up a small net reward but DO NOT fund contract
    const netTotal = ethers.parseUnits("1000", 18);
    const duration = 60 * 60 * 24;
    await (await mining.notifyRewardAmount(netTotal, duration)).wait();

    // stake as alice
    const stakeAmount = ethers.parseUnits("1000", 18);
    await (await lp.connect(alice).approve(mining.target, stakeAmount)).wait();
    await (await mining.connect(alice).stake(stakeAmount)).wait();

    // fast forward some time
    await ethers.provider.send("evm_increaseTime", [3600]);
    await ethers.provider.send("evm_mine", []);

    // attempt to claim when contract has zero reward token balance -> should revert due to insufficient reward pool
    await expect(mining.connect(alice).getReward()).to.be.revertedWith("insufficient reward pool");
  });
});

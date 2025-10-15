
import { expect } from "chai";
import { ethers } from "hardhat";

describe("Porkelon smoke test", function () {
  it("compiles and deploys token", async function () {
    const Pork = await ethers.getContractFactory("PorkelonToken");
    const pork = await Pork.deploy("Porkelon", "PORK", ethers.parseUnits("1000", 18), ethers.parseUnits("1000000", 18));
    await pork.waitForDeployment();
    expect(await pork.name()).to.equal("Porkelon");
  });
});

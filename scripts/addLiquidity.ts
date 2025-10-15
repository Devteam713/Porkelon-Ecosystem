import { ethers } from "hardhat";
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
  const [signer] = await ethers.getSigners();
  const routerAddr = process.env.ROUTER_ADDRESS!;
  const porkAddr = process.env.PORK_ADDRESS!;
  const usdt = process.env.USDT_ADDRESS!;

  const routerAbi = [
    "function addLiquidity(address,address,uint,uint,uint,uint,address,uint) returns (uint,uint,uint)",
    "function addLiquidityETH(address,uint,uint,uint,address,uint) payable returns (uint,uint,uint)"
  ];
  const router = new ethers.Contract(routerAddr, routerAbi, signer);
  const token = await ethers.getContractAt("PorkelonToken", porkAddr);

  const amtPork = ethers.parseUnits("50000000", 18);
  const amtMatic = ethers.parseEther("1000");
  await token.approve(routerAddr, amtPork);
  const deadline = Math.floor(Date.now() / 1000) + 1200;

  await router.addLiquidityETH(porkAddr, amtPork, 0, 0, await signer.getAddress(), deadline, { value: amtMatic });

  const usdtContract = await ethers.getContractAt("IERC20", usdt);
  const amtUSDT = ethers.parseUnits("500000", 6);
  await token.approve(routerAddr, amtPork);
  await usdtContract.approve(routerAddr, amtUSDT);
  await router.addLiquidity(porkAddr, usdt, amtPork, amtUSDT, 0, 0, await signer.getAddress(), deadline);

  console.log("Liquidity pairs added: PORK/MATIC & PORK/USDT");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

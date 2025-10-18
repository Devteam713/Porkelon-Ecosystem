const { ethers, upgrades } = require('hardhat');

async function main() {
  const [deployer, proposer1, proposer2, executor1, executor2] = await ethers.getSigners();
  console.log('Deploying with:', deployer.address);

  // Deploy Timelock
  const Timelock = await ethers.getContractFactory('PorkelonTimelock');
  const timelock = await Timelock.deploy(
    [proposer1.address, proposer2.address],
    [executor1.address, executor2.address]
  );
  await timelock.waitForDeployment();
  console.log('Timelock deployed to:', timelock.target);

  // Deploy Porkelon (proxy)
  const Porkelon = await ethers.getContractFactory('Porkelon');
  const porkelon = await upgrades.deployProxy(Porkelon, [deployer.address], {
    initializer: 'initialize',
    kind: 'transparent',
    admin: timelock.target,
  });
  await porkelon.waitForDeployment();
  console.log('Porkelon deployed to:', porkelon.target);

  // Deploy Presale
  const Presale = await ethers.getContractFactory('Presale');
  const presale = await Presale.deploy(porkelon.target);
  await presale.waitForDeployment();
  console.log('Presale deployed to:', presale.target);

  // Transfer presale tokens
  await porkelon.transfer(presale.target, ethers.parseEther('40000000000'));
  console.log('Transferred 40B $PORK to presale');

  // Deploy Staking
  const Staking = await ethers.getContractFactory('Staking');
  const staking = await Staking.deploy(porkelon.target);
  await staking.waitForDeployment();
  console.log('Staking deployed to:', staking.target);

  // Deploy Liquidity
  const Liquidity = await ethers.getContractFactory('Liquidity');
  const liquidity = await Liquidity.deploy(porkelon.target, '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45');
  await liquidity.waitForDeployment();
  console.log('Liquidity deployed to:', liquidity.target);

  // Transfer ownership to timelock
  await porkelon.transferOwnership(timelock.target);
  await presale.transferOwnership(timelock.target);
  await staking.transferOwnership(timelock.target);
  await liquidity.transferOwnership(timelock.target);
  console.log('Ownership transferred to timelock');

  console.log('Update constants.ts with:');
  console.log(`PRESALE_CONTRACT: "${presale.target}"`);
  console.log(`TOKEN_CONTRACT: "${porkelon.target}"`);
  console.log(`STAKING_CONTRACT: "${staking.target}"`);
  console.log(`LIQUIDITY_CONTRACT: "${liquidity.target}"`);
  console.log(`TIMELOCK_CONTRACT: "${timelock.target}"`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

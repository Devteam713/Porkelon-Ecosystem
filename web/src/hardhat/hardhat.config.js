require('@nomicfoundation/hardhat-toolbox');
require('@openzeppelin/hardhat-upgrades');

module.exports = {
  solidity: '0.8.29',
  networks: {
    hardhat: {},
    amoy: {
      url: 'https://rpc-amoy.polygon.technology/',
      accounts: ['YOUR_PRIVATE_KEY'], // Add deployer private key
    },
  },
};

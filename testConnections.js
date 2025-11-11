require('dotenv').config();

const Web3Module = require('web3');
const Web3 = Web3Module.default || Web3Module;
const web3 = new Web3(process.env.GANACHE_RPC);


// const Web3 = require('web3'); // DON'T use .default for web3@1.x
const { create } = require('ipfs-http-client');

// const web3 = new Web3(process.env.GANACHE_RPC); // This should work for web3@1.x
const ipfs = create(process.env.IPFS_API + "/api/v0");
// ... rest of your code


async function testGanache() {
  try {
    const accounts = await web3.eth.getAccounts();
    console.log("Ganache connected. Accounts:", accounts);
  } catch (err) {
    console.error("Failed to connect to Ganache:", err);
  }
}

async function testIPFS() {
  try {
    const version = await ipfs.version();
    console.log("IPFS connected. Version:", version.version);
  } catch (err) {
    console.error("Failed to connect to IPFS:", err);
  }
}

(async () => {
  await testGanache();
  await testIPFS();
})();

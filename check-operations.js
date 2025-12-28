// Quick script to check if operations were scheduled on BSC Mainnet
// Run with: node check-operations.js

const { ethers } = require('ethers');

const CORE_ADDRESS = '0x101450a49E730d2e9502467242d0B6f157BABe60';
const BSC_RPC = 'https://bsc-dataseed.binance.org/';

async function checkOperations() {
  const provider = new ethers.JsonRpcProvider(BSC_RPC);

  console.log('Checking for OperationScheduled events on BSC Mainnet...\n');
  console.log('Core Address:', CORE_ADDRESS);

  try {
    const currentBlock = await provider.getBlockNumber();
    console.log('Current Block:', currentBlock);

    // Check last 200k blocks (~30 days on BSC)
    const fromBlock = currentBlock - 200000;

    const filter = {
      address: CORE_ADDRESS,
      topics: [
        ethers.id('OperationScheduled(bytes32,bytes32,uint256)')
      ],
      fromBlock,
      toBlock: 'latest'
    };

    console.log(`Searching blocks ${fromBlock} to ${currentBlock}...\n`);

    const logs = await provider.getLogs(filter);

    console.log(`Found ${logs.length} OperationScheduled events\n`);

    if (logs.length > 0) {
      logs.forEach((log, i) => {
        const opId = log.topics[1];
        const tag = log.topics[2];
        const readyAt = BigInt(log.data);
        const readyDate = new Date(Number(readyAt) * 1000);
        const now = new Date();
        const isReady = now >= readyDate;

        console.log(`Operation ${i + 1}:`);
        console.log(`  OpId: ${opId.slice(0, 10)}...${opId.slice(-8)}`);
        console.log(`  Tag: ${tag.slice(0, 10)}...`);
        console.log(`  Ready At: ${readyDate.toLocaleString()}`);
        console.log(`  Status: ${isReady ? '✅ READY TO EXECUTE' : `⏳ ${Math.ceil((readyDate - now) / 1000 / 3600)}h remaining`}`);
        console.log('');
      });
    } else {
      console.log('❌ No operations found!');
      console.log('\nPossible reasons:');
      console.log('1. Operations were scheduled more than 200k blocks ago');
      console.log('2. Operations were never scheduled (deployment didn\'t run scheduleOp)');
      console.log('3. Wrong network or contract address');
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkOperations();

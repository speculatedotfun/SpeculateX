// Targeted script to check operations from exact deployment block
// Run with: node check-operations-targeted.js

const { ethers } = require('ethers');

const CORE_ADDRESS = '0x101450a49E730d2e9502467242d0B6f157BABe60';
const BSC_RPC = 'https://bsc-dataseed.binance.org/';
const DEPLOYMENT_BLOCK = 73210700; // Just before actual deployment at 73210707

async function checkOperations() {
  const provider = new ethers.JsonRpcProvider(BSC_RPC);

  console.log('Checking for OperationScheduled events on BSC Mainnet...\n');
  console.log('Core Address:', CORE_ADDRESS);
  console.log('Deployment Block:', DEPLOYMENT_BLOCK);

  try {
    const currentBlock = await provider.getBlockNumber();
    console.log('Current Block:', currentBlock);

    // Search from deployment block + 2000 blocks (ultra conservative)
    const fromBlock = DEPLOYMENT_BLOCK;
    const toBlock = Math.min(DEPLOYMENT_BLOCK + 2000, currentBlock);

    const filter = {
      address: CORE_ADDRESS,
      topics: [
        ethers.id('OperationScheduled(bytes32,bytes32,uint256)')
      ],
      fromBlock,
      toBlock
    };

    console.log(`Searching blocks ${fromBlock} to ${toBlock} (${toBlock - fromBlock} blocks)...\n`);

    const logs = await provider.getLogs(filter);

    console.log(`Found ${logs.length} OperationScheduled events\n`);

    if (logs.length > 0) {
      // Group by block to show deployment batches
      const byBlock = {};
      logs.forEach(log => {
        const blockNum = log.blockNumber;
        if (!byBlock[blockNum]) byBlock[blockNum] = [];
        byBlock[blockNum].push(log);
      });

      console.log(`Operations across ${Object.keys(byBlock).length} block(s):\n`);

      Object.keys(byBlock).forEach(blockNum => {
        const blockLogs = byBlock[blockNum];
        console.log(`Block ${blockNum}: ${blockLogs.length} operation(s)`);
      });

      console.log('\nDetailed breakdown:\n');

      logs.forEach((log, i) => {
        const opId = log.topics[1];
        const tag = log.topics[2];
        const readyAt = BigInt(log.data);
        const readyDate = new Date(Number(readyAt) * 1000);
        const now = new Date();
        const isReady = now >= readyDate;

        console.log(`Operation ${i + 1}:`);
        console.log(`  Block: ${log.blockNumber}`);
        console.log(`  OpId: ${opId.slice(0, 10)}...${opId.slice(-8)}`);
        console.log(`  Tag: ${tag.slice(0, 10)}...`);
        console.log(`  Ready At: ${readyDate.toLocaleString()}`);

        if (isReady) {
          console.log(`  Status: ✅ READY TO EXECUTE`);
        } else {
          const hoursLeft = Math.ceil((readyDate - now) / 1000 / 3600);
          console.log(`  Status: ⏳ ${hoursLeft}h remaining`);
        }
        console.log('');
      });

      console.log('Summary:');
      console.log(`Total operations: ${logs.length}`);
      const readyCount = logs.filter(log => {
        const readyAt = BigInt(log.data);
        const now = Date.now();
        return now >= Number(readyAt) * 1000;
      }).length;
      console.log(`Ready to execute: ${readyCount}`);
      console.log(`Still in timelock: ${logs.length - readyCount}`);

    } else {
      console.log('❌ No operations found in this range!');
      console.log('\nPossible reasons:');
      console.log('1. Operations were scheduled in a different block range');
      console.log('2. Wrong deployment block number');
      console.log('3. Check BscScan for OperationScheduled events manually:');
      console.log(`   https://bscscan.com/address/${CORE_ADDRESS}#events`);
    }

  } catch (error) {
    console.error('Error:', error.message);
    console.log('\nTip: If rate limited, check BscScan directly:');
    console.log(`https://bscscan.com/address/${CORE_ADDRESS}#events`);
  }
}

checkOperations();

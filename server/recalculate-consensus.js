#!/usr/bin/env node

import sqlite3 from 'sqlite3';
import ConsensusService from './services/consensusService.js';

const db = new sqlite3.Database('../database/quilt.db');
const consensusService = new ConsensusService(db);

console.log('🔄 Starting consensus recalculation for blocks with multiple votes...');

// Find all blocks with 2 or more votes that don't have consensus
const query = `
    SELECT b.blockID, COUNT(v.voteID) as vote_count, b.consensus_reached
    FROM blocks b
    INNER JOIN votes v ON b.blockID = v.blockID
    WHERE b.consensus_reached = 0 OR b.consensus_reached IS NULL
    GROUP BY b.blockID
    HAVING vote_count >= 2
    ORDER BY b.blockID
`;

db.all(query, (err, blocks) => {
    if (err) {
        console.error('❌ Error finding blocks:', err);
        process.exit(1);
    }
    
    console.log(`📋 Found ${blocks.length} blocks with multiple votes but no consensus:`);
    blocks.forEach(block => {
        console.log(`  - Block ${block.blockID}: ${block.vote_count} votes`);
    });
    
    let processed = 0;
    
    function processNext() {
        if (processed >= blocks.length) {
            console.log('✅ Consensus recalculation complete!');
            db.close();
            return;
        }
        
        const block = blocks[processed];
        console.log(`\n🔍 Processing block ${block.blockID} (${processed + 1}/${blocks.length})...`);
        
        consensusService.checkConsensus(block.blockID, (consensusErr, consensusResult) => {
            if (consensusErr) {
                console.error(`❌ Error checking consensus for block ${block.blockID}:`, consensusErr);
            } else {
                console.log(`✅ Block ${block.blockID} consensus check completed: ${consensusResult ? 'CONSENSUS REACHED' : 'NO CONSENSUS'}`);
            }
            
            processed++;
            processNext();
        });
    }
    
    processNext();
});

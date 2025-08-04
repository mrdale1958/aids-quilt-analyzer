class ConsensusService {
    constructor(db) {
        this.db = db;
    }

    checkConsensus(blockID, callback) {
        console.log(`🔍 Checking consensus for block ${blockID}...`);
        
        this.db.all(
            "SELECT orientation_data, needsRecrop, not8Panel FROM votes WHERE blockID = ?", 
            [blockID], 
            (err, votes) => {
                if (err) {
                    console.error(`❌ Error getting votes for block ${blockID}:`, err);
                    callback(err);
                    return;
                }
                
                console.log(`📊 Block ${blockID} has ${votes.length} votes:`, votes);
                
                if (votes.length < 2) {
                    console.log(`⏳ Block ${blockID} needs more votes (has ${votes.length})`);
                    callback(null, false);
                    return;
                }
                
                const votePatterns = {};
                
                votes.forEach((vote, index) => {
                    const pattern = JSON.stringify({
                        orientation: vote.orientation_data,
                        needsRecrop: vote.needsRecrop,
                        not8Panel: vote.not8Panel
                    });
                    
                    console.log(`Vote ${index + 1} pattern:`, pattern);
                    votePatterns[pattern] = (votePatterns[pattern] || 0) + 1;
                });
                
                console.log(`🗳️ Vote patterns for block ${blockID}:`, votePatterns);
                
                let consensusPattern = null;
                let maxCount = 0;
                
                Object.entries(votePatterns).forEach(([pattern, count]) => {
                    console.log(`Pattern "${pattern}" has ${count} votes`);
                    if (count >= 2 && count > maxCount) {
                        consensusPattern = JSON.parse(pattern);
                        maxCount = count;
                    }
                });
                
                if (consensusPattern) {
                    console.log(`🎉 Consensus reached for block ${blockID}! Pattern:`, consensusPattern, `(${maxCount} votes)`);
                    this.updateBlockWithConsensus(blockID, consensusPattern, callback);
                } else {
                    console.log(`⏳ Block ${blockID} has ${votes.length} votes but no consensus yet`);
                    callback(null, false);
                }
            }
        );
    }

    updateBlockWithConsensus(blockID, consensusPattern, callback) {
        const updateQuery = `
            UPDATE blocks 
            SET consensus_reached = 1, 
                completed = 1,
                not8Panel = ?,
                needsRecrop = ?,
                final_orientation_data = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE blockID = ?
        `;
        
        const finalOrientation = consensusPattern.not8Panel === 1 ? 
            'NON_STANDARD_BLOCK' : consensusPattern.orientation;
        
        this.db.run(updateQuery, [
            consensusPattern.not8Panel,
            consensusPattern.needsRecrop,
            finalOrientation,
            blockID
        ], function(err) {
            if (err) {
                console.error(`❌ Error updating block ${blockID} with consensus:`, err);
                callback(err);
            } else {
                console.log(`✅ Block ${blockID} marked as complete! Rows affected:`, this.changes);
                callback(null, true);
            }
        });
    }
}

export default ConsensusService;
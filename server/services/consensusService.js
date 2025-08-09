class ConsensusService {
    constructor(db) {
        this.db = db;
    }

    checkConsensus(blockID, callback) {
        console.log(`🔍 Checking consensus for block ${blockID}...`);
        
        this.db.all(
            "SELECT orientation_data, not8Panel FROM votes WHERE blockID = ?", 
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
                    let orientationKey = null;
                    
                    if (vote.not8Panel === 1) {
                        // For not8Panel votes, orientation doesn't matter
                        orientationKey = null;
                    } else {
                        // Parse the orientation data and extract selectedPoints
                        try {
                            const orientationData = JSON.parse(vote.orientation_data);
                            if (orientationData.selectedPoints && Array.isArray(orientationData.selectedPoints)) {
                                // Sort the selectedPoints to treat them as an unordered set
                                orientationKey = [...orientationData.selectedPoints].sort((a, b) => a - b).join(',');
                            } else {
                                console.warn(`Vote ${index + 1} has invalid selectedPoints:`, orientationData);
                                orientationKey = vote.orientation_data; // fallback to original string comparison
                            }
                        } catch (parseErr) {
                            console.warn(`Vote ${index + 1} has invalid JSON orientation_data:`, parseErr);
                            orientationKey = vote.orientation_data; // fallback to original string comparison
                        }
                    }
                    
                    const pattern = JSON.stringify({
                        orientation: orientationKey,
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
        let updateQuery, params;
        const isNot8Panel = consensusPattern.not8Panel === 1;
        let finalOrientation;
        
        if (isNot8Panel) {
            finalOrientation = 'NON_STANDARD_BLOCK';
        } else {
            // Convert the sorted comma-separated string back to a proper JSON format
            if (consensusPattern.orientation) {
                const pointsArray = consensusPattern.orientation.split(',').map(Number);
                finalOrientation = JSON.stringify({
                    selectedPoints: pointsArray,
                    consensus: true,
                    timestamp: new Date().toISOString()
                });
            } else {
                finalOrientation = 'UNKNOWN_ORIENTATION';
            }
        }
        
        // Count votes for this block (not just not8Panel votes)
        this.db.get(
            'SELECT COUNT(*) as count FROM votes WHERE blockID = ?',
            [blockID],
            (countErr, row) => {
                if (countErr) {
                    console.error(`❌ Error counting votes for block ${blockID}:`, countErr);
                    callback(countErr);
                    return;
                }
                const voteCount = row ? row.count : 0;
                if (isNot8Panel) {
                    updateQuery = `
                        UPDATE blocks 
                        SET consensus_reached = 1,
                            completed = 1,
                            not8Panel = 1,
                            not8PanelConfirmed = 1,
                            final_orientation_data = ?,
                            vote_count = ?,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE blockID = ?
                    `;
                    params = [
                        finalOrientation,
                        voteCount,
                        blockID
                    ];
                } else {
                    updateQuery = `
                        UPDATE blocks 
                        SET consensus_reached = 1,
                            completed = 1,
                            not8Panel = 0,
                            not8PanelConfirmed = 0,
                            final_orientation_data = ?,
                            vote_count = ?,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE blockID = ?
                    `;
                    params = [
                        finalOrientation,
                        voteCount,
                        blockID
                    ];
                }
                this.db.run(updateQuery, params, function(err) {
                    if (err) {
                        console.error(`❌ Error updating block ${blockID} with consensus:`, err);
                        callback(err);
                    } else {
                        console.log(`✅ Block ${blockID} marked as complete! Rows affected:`, this.changes);
                        callback(null, true);
                    }
                });
            }
        );
    }
}

export default ConsensusService;
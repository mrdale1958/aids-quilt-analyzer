import express from 'express';

const router = express.Router();

export default function createStatsRoutes(db) {
    // Total blocks
    router.get('/total', (req, res) => {
        db.get("SELECT COUNT(*) as count FROM blocks", (err, result) => {
            if (err) {
                console.error('Error getting total count:', err);
                res.status(500).json({ error: 'Database error' });
            } else {
                res.json({ count: result.count });
            }
        });
    });

    // Completed blocks
    router.get('/completed', (req, res) => {
        db.get("SELECT COUNT(*) as count FROM blocks WHERE consensus_reached = 1", (err, result) => {
            if (err) {
                db.get("SELECT COUNT(*) as count FROM blocks WHERE completed = 1", (fallbackErr, fallbackResult) => {
                    if (fallbackErr) {
                        console.error('Error getting completed count:', fallbackErr);
                        res.status(500).json({ error: 'Database error' });
                    } else {
                        res.json({ count: fallbackResult.count });
                    }
                });
            } else {
                res.json({ count: result.count });
            }
        });
    });

    // Voting stats
    router.get('/voting', (req, res) => {
        console.log('📊 Getting detailed voting statistics...');
        
        // Get total votes
        db.get('SELECT COUNT(*) as totalVotes FROM votes', (err, totalResult) => {
            if (err) {
                console.error('Error getting total votes:', err);
                return res.status(500).json({ error: 'Database error' });
            }

            // Get blocks by vote count
            const voteCountQuery = `
                SELECT 
                    CASE 
                        WHEN vote_count = 1 THEN 'oneVote'
                        WHEN vote_count = 2 THEN 'twoVotes' 
                        WHEN vote_count >= 3 THEN 'threeOrMore'
                        ELSE 'unknown'
                    END as category,
                    COUNT(*) as count,
                    SUM(vote_count) as total_votes_in_category
                FROM (
                    SELECT blockID, COUNT(*) as vote_count 
                    FROM votes 
                    GROUP BY blockID
                )
                GROUP BY category
            `;

            db.all(voteCountQuery, (err, voteResults) => {
                if (err) {
                    console.error('Error getting vote breakdown:', err);
                    return res.status(500).json({ error: 'Database error' });
                }

                // Get consensus reached count
                db.get('SELECT COUNT(*) as consensusReached FROM blocks WHERE consensus_reached = 1', (err, consensusResult) => {
                    if (err) {
                        console.error('Error getting consensus count:', err);
                        return res.status(500).json({ error: 'Database error' });
                    }

                    // Get special flag counts
                    db.all(`
                        SELECT 
                            SUM(CASE WHEN not8Panel = 1 THEN 1 ELSE 0 END) as not8PanelVotes,
                            SUM(CASE WHEN needsRecrop = 1 THEN 1 ELSE 0 END) as needsRecropVotes,
                            COUNT(DISTINCT CASE WHEN not8Panel = 1 THEN blockID END) as uniqueNot8PanelBlocks,
                            COUNT(DISTINCT CASE WHEN needsRecrop = 1 THEN blockID END) as uniqueNeedsRecropBlocks
                        FROM votes
                    `, (err, flagResults) => {
                        if (err) {
                            console.error('Error getting flag counts:', err);
                            return res.status(500).json({ error: 'Database error' });
                        }

                        // Get standard block counts
                        db.get('SELECT COUNT(*) as count FROM blocks WHERE not8Panel = 0 OR not8Panel IS NULL', (err, standardBlocksResult) => {
                            if (err) {
                                console.error('Error getting standardBlocks:', err);
                                return res.status(500).json({ error: 'Database error' });
                            }
                            db.get('SELECT COUNT(*) as count FROM blocks WHERE (not8Panel = 0 OR not8Panel IS NULL) AND consensus_reached = 1', (err, standardCompletedResult) => {
                                if (err) {
                                    console.error('Error getting standardCompleted:', err);
                                    return res.status(500).json({ error: 'Database error' });
                                }

                                // Get non-standard completed count
                                db.get('SELECT COUNT(*) as count FROM blocks WHERE not8Panel = 1 AND consensus_reached = 1', (err, nonStandardCompletedResult) => {
                                    if (err) {
                                        console.error('Error getting nonStandardCompleted:', err);
                                        return res.status(500).json({ error: 'Database error' });
                                    }

                                // Process results
                                const breakdown = {
                                    oneVote: 0,
                                    twoVotes: 0, 
                                    threeOrMore: 0,
                                    oneVoteTotal: 0,
                                    twoVoteTotal: 0,
                                    threeOrMoreTotal: 0
                                };

                                voteResults.forEach(row => {
                                    breakdown[row.category] = row.count || 0;
                                    breakdown[row.category + 'Total'] = row.total_votes_in_category || 0;
                                });

                                const stats = {
                                    totalVotes: totalResult.totalVotes || 0,
                                    blocksWithOneVote: breakdown.oneVote,
                                    blocksWithTwoVotes: breakdown.twoVotes,
                                    blocksWithThreeOrMore: breakdown.threeOrMore,
                                    consensusReached: consensusResult.consensusReached || 0,

                                    // Vote totals by category
                                    votesFromOneVoteBlocks: breakdown.oneVoteTotal,
                                    votesFromTwoVoteBlocks: breakdown.twoVoteTotal, 
                                    votesFromThreeOrMoreBlocks: breakdown.threeOrMoreTotal,

                                    // Flag-specific stats
                                    not8PanelVotes: flagResults[0].not8PanelVotes || 0,
                                    needsRecropVotes: flagResults[0].needsRecropVotes || 0,
                                    uniqueNot8PanelBlocks: flagResults[0].uniqueNot8PanelBlocks || 0,
                                    uniqueNeedsRecropBlocks: flagResults[0].uniqueNeedsRecropBlocks || 0,

                                    // Calculated fields
                                    totalUniqueBlocksVoted: breakdown.oneVote + breakdown.twoVotes + breakdown.threeOrMore,
                                    accountedVotes: breakdown.oneVoteTotal + breakdown.twoVoteTotal + breakdown.threeOrMoreTotal,

                                    // New fields for standard blocks
                                    standardBlocks: standardBlocksResult.count || 0,
                                    standardCompleted: standardCompletedResult.count || 0,
                                    nonStandardCompleted: nonStandardCompletedResult.count || 0
                                };

                                console.log('📊 Complete voting stats:', stats);
                                console.log('📊 Vote accounting check:', {
                                    totalVotes: stats.totalVotes,
                                    accountedVotes: stats.accountedVotes,
                                    difference: stats.totalVotes - stats.accountedVotes
                                });

                                res.json(stats);
                                });
                            });
                        });
                    });
                });
            });
        });
    });
    
    // Get blocks with multiple votes but no consensus
    router.get('/multivote-blocks', (req, res) => {
        console.log('📊 Getting blocks with multiple votes but no consensus...');
        
        const query = `
            SELECT 
                b.blockID,
                b.vote_count,
                b.consensus_reached,
                b.not8Panel,
                b.needsRecrop,
                b.updated_at,
                GROUP_CONCAT(v.orientation_data) as all_orientations,
                GROUP_CONCAT(v.needsRecrop) as all_needsRecrop,
                GROUP_CONCAT(v.not8Panel) as all_not8Panel
            FROM blocks b
            INNER JOIN votes v ON b.blockID = v.blockID
            WHERE b.vote_count >= 2 AND (b.consensus_reached = 0 OR b.consensus_reached IS NULL)
            GROUP BY b.blockID
            ORDER BY b.vote_count DESC, b.blockID ASC
        `;
        
        db.all(query, (err, rows) => {
            if (err) {
                console.error('Error getting multi-vote blocks:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            
            console.log(`📋 Found ${rows.length} blocks with multiple votes but no consensus`);
            res.json(rows);
        });
    });
    
    // Add a new debug endpoint to break down all votes
    router.get('/voting/debug', (req, res) => {
        console.log('🔍 Debug: Analyzing all votes in detail...');
        
        const queries = [
            {
                name: 'Total votes in votes table',
                sql: 'SELECT COUNT(*) as count FROM votes'
            },
            {
                name: 'Votes by blockID count',
                sql: `
                    SELECT 
                        COUNT(DISTINCT blockID) as unique_blocks,
                        COUNT(*) as total_votes,
                        AVG(vote_count) as avg_votes_per_block
                    FROM (
                        SELECT blockID, COUNT(*) as vote_count 
                        FROM votes 
                        GROUP BY blockID
                    )
                `
            },
            {
                name: 'Breakdown by vote count per block',
                sql: `
                    SELECT 
                        vote_count,
                        COUNT(*) as blocks_with_this_count,
                        (vote_count * COUNT(*)) as total_votes_for_this_count
                    FROM (
                        SELECT blockID, COUNT(*) as vote_count 
                        FROM votes 
                        GROUP BY blockID
                    )
                    GROUP BY vote_count
                    ORDER BY vote_count
                `
            },
            {
                name: 'Blocks with consensus_reached flag',
                sql: 'SELECT COUNT(*) as count FROM blocks WHERE consensus_reached = 1'
            },
            {
                name: 'Votes for not8Panel blocks',
                sql: 'SELECT COUNT(*) as count FROM votes WHERE not8Panel = 1'
            },
            {
                name: 'Votes for needsRecrop blocks', 
                sql: 'SELECT COUNT(*) as count FROM votes WHERE needsRecrop = 1'
            },
            {
                name: 'Votes with neither flag',
                sql: 'SELECT COUNT(*) as count FROM votes WHERE (not8Panel = 0 OR not8Panel IS NULL) AND (needsRecrop = 0 OR needsRecrop IS NULL)'
            },
            {
                name: 'Sample of all votes',
                sql: 'SELECT blockID, not8Panel, needsRecrop, created_at FROM votes ORDER BY created_at DESC LIMIT 10'
            }
        ];
        
        const results = {};
        let completed = 0;
        
        queries.forEach(query => {
            db.all(query.sql, (err, rows) => {
                completed++;
                
                if (err) {
                    console.error(`❌ Error in ${query.name}:`, err);
                    results[query.name] = { error: err.message };
                } else {
                    console.log(`✅ ${query.name}:`, rows);
                    results[query.name] = rows;
                }
                
                if (completed === queries.length) {
                    res.json(results);
                }
            });
        });
    });

    // Update block with consensus
    function updateBlockWithConsensus(blockID, consensusPattern, callback) {
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
        
        db.run(updateQuery, [
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
                console.log(`📋 Final state: not8Panel=${consensusPattern.not8Panel}, needsRecrop=${consensusPattern.needsRecrop}`);
                callback(null, true);
            }
        });
    }

    // Non-standard stats
    router.get('/nonstandard', (req, res) => {
        console.log('Getting non-standard block stats...');
        
        db.all("PRAGMA table_info(blocks)", (err, columns) => {
            if (err) {
                console.error('Error checking columns:', err);
                res.status(500).json({ error: 'Database error' });
                return;
            }
            
            const columnNames = columns.map(col => col.name);
            const hasNot8Panel = columnNames.includes('not8Panel');
            const hasConsensusReached = columnNames.includes('consensus_reached');
            
            if (!hasNot8Panel) {
                const defaultResult = {
                    totalNonStandard: 0,
                    nonStandardCompleted: 0,
                    nonStandardNeedingVotes: 0
                };
                res.json(defaultResult);
                return;
            }
            
            const queries = {
                totalNonStandard: "SELECT COUNT(*) as count FROM blocks WHERE not8Panel = 1",
                nonStandardCompleted: "SELECT COUNT(*) as count FROM blocks WHERE not8Panel = 1 AND not8PanelConfirmed = 1",
                nonStandardNeedingVotes: "SELECT COUNT(*) as count FROM blocks WHERE not8Panel = 1 AND not8PanelConfirmed = 0"
            };
            
            const results = {};
            let completed = 0;
            
            Object.entries(queries).forEach(([key, query]) => {
                db.get(query, (err, result) => {
                    if (err) {
                        console.error(`Error getting ${key}:`, err);
                        results[key] = 0;
                    } else {
                        results[key] = result ? result.count : 0;
                    }
                    
                    completed++;
                    if (completed === Object.keys(queries).length) {
                        res.json(results);
                    }
                });
            });
        });
    });

    // Recrop stats
    router.get('/recrop', (req, res) => {
        console.log('Getting recrop stats...');
        
        const queries = {
            totalNeedingRecrop: "SELECT COUNT(*) as count FROM blocks WHERE needsRecrop = 1",
            totalRecropped: "SELECT COUNT(*) as count FROM blocks WHERE needsRecrop = 0 AND updated_at IS NOT NULL"
        };
        
        const results = {};
        let completed = 0;
        
        Object.entries(queries).forEach(([key, query]) => {
            db.get(query, (err, result) => {
                if (err) {
                    console.error(`Error getting ${key}:`, err);
                    results[key] = 0;
                } else {
                    results[key] = result ? result.count : 0;
                }
                
                completed++;
                if (completed === Object.keys(queries).length) {
                    res.json(results);
                }
            });
        });
    });

    return router;
}
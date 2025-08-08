import express from 'express';

export default function createBlockRoutes(db, consensusService) {
    const router = express.Router();

    // Test route (this is working)
    router.get('/test', (req, res) => {
        res.json({ message: 'Blocks routes are working!', timestamp: new Date() });
    });

    // Get next incomplete block - MOVE THIS BEFORE THE SPECIFIC BLOCK ROUTE
    router.get('/incomplete/next', (req, res) => {
        console.log('🎯 Getting next incomplete block...');
        console.log('📝 Request URL:', req.originalUrl);
        console.log('📝 Request method:', req.method);
        
        // Add column check first
        db.all("PRAGMA table_info(blocks)", (err, columns) => {
            if (err) {
                console.error('❌ Error checking columns:', err);
                res.status(500).json({ error: 'Database error checking columns' });
                return;
            }
            
            const columnNames = columns.map(col => col.name);
            console.log('📋 Available columns:', columnNames);
            
            const hasConsensusReached = columnNames.includes('consensus_reached');
            
            // Use appropriate query based on available columns
            const query = hasConsensusReached ? 
                `SELECT blockID, needsRecrop, completed, started, not8Panel, 
                        orientation_data, ip_address, vote_count, consensus_reached
                 FROM blocks 
                 WHERE consensus_reached = 0 OR consensus_reached IS NULL
                 ORDER BY RANDOM() 
                 LIMIT 1` :
                `SELECT blockID, needsRecrop, completed, started, not8Panel, 
                        orientation_data, ip_address, vote_count
                 FROM blocks 
                 WHERE completed = 0 OR completed IS NULL
                 ORDER BY RANDOM() 
                 LIMIT 1`;
            
            console.log('🔍 Executing query:', query);
            
            db.get(query, (err, result) => {
                if (err) {
                    console.error('❌ Error getting next incomplete block:', err);
                    res.status(500).json({ error: 'Database error', details: err.message });
                } else if (result) {
                    console.log('✅ Found random block:', result.blockID);
                    res.json(result);
                } else {
                    console.log('🎉 No incomplete blocks found');
                    res.json(null);
                }
            });
        });
    });

    // Get confirmed non-standard blocks - MOVE BEFORE SPECIFIC BLOCK ROUTE
    router.get('/nonstandard', (req, res) => {
        console.log('📊 API: Getting confirmed non-standard blocks...');
        
        db.all("PRAGMA table_info(blocks)", (err, columns) => {
            if (err) {
                console.error('❌ Database error:', err);
                res.status(500).json({ error: 'Database error' });
                return;
            }
            
            const columnNames = columns.map(col => col.name);
            const hasNot8Panel = columnNames.includes('not8Panel');
            const hasConsensusReached = columnNames.includes('consensus_reached');
            
            console.log('📋 Available columns:', columnNames);
            console.log('📋 Has not8Panel:', hasNot8Panel);
            console.log('📋 Has consensus_reached:', hasConsensusReached);
            
            if (!hasNot8Panel) {
                console.log('⚠️  not8Panel column missing, returning empty array');
                res.json([]);
                return;
            }
            
            // Try different query variations to see what's in the database
            const queries = [
                {
                    name: 'All blocks with not8Panel=1',
                    sql: 'SELECT blockID, not8Panel, consensus_reached FROM blocks WHERE not8Panel = 1'
                },
                {
                    name: 'All blocks with consensus_reached=1',
                    sql: hasConsensusReached ? 'SELECT blockID, not8Panel, consensus_reached FROM blocks WHERE consensus_reached = 1' : null
                },
                {
                    name: 'Combined query (what we actually use)',
                    sql: hasConsensusReached ? 
                        'SELECT blockID, consensus_reached, vote_count, final_orientation_data, updated_at FROM blocks WHERE not8Panel = 1 AND consensus_reached = 1 ORDER BY blockID' :
                        'SELECT blockID, vote_count, updated_at FROM blocks WHERE not8Panel = 1 ORDER BY blockID'
                }
            ];
            
            // Run all queries for debugging
            queries.forEach(queryObj => {
                if (queryObj.sql) {
                    db.all(queryObj.sql, (debugErr, debugResults) => {
                        if (debugErr) {
                            console.error(`❌ Error in ${queryObj.name}:`, debugErr);
                        } else {
                            console.log(`🔍 ${queryObj.name}: Found ${debugResults.length} blocks`);
                            if (debugResults.length > 0) {
                                console.log(`   First few results:`, debugResults.slice(0, 3));
                            }
                        }
                    });
                }
            });
            
            // Use the actual query
            const query = hasConsensusReached ? 
                `SELECT blockID, consensus_reached, vote_count, final_orientation_data, updated_at 
                 FROM blocks WHERE not8Panel = 1 AND consensus_reached = 1 ORDER BY blockID` :
                `SELECT blockID, vote_count, updated_at 
                 FROM blocks WHERE not8Panel = 1 ORDER BY blockID`;
            
            console.log('🔍 Executing main query:', query);
            
            db.all(query, (err, results) => {
                if (err) {
                    console.error('❌ Error:', err);
                    res.status(500).json({ error: 'Database error: ' + err.message });
                } else {
                    console.log(`✅ Found ${results.length} confirmed non-standard blocks`);
                    if (results.length > 0) {
                        console.log('📋 Results:', results);
                    }
                    res.json(results);
                }
            });
        });
    });

    // Get pending non-standard blocks
    router.get('/nonstandard/pending', (req, res) => {
        console.log('📊 API: Getting pending non-standard blocks...');
        
        // Check if votes table exists
        db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='votes'", (err, table) => {
            if (err || !table) {
                console.log('⚠️  Votes table missing, returning empty array');
                res.json([]);
                return;
            }
            
            // Check what's actually in the votes table
            db.all("SELECT DISTINCT blockID, not8Panel FROM votes WHERE not8Panel = 1 LIMIT 10", (debugErr, debugVotes) => {
                if (debugErr) {
                    console.error('❌ Error checking votes:', debugErr);
                } else {
                    console.log('🔍 Sample votes with not8Panel=1:', debugVotes);
                }
            });
            
            const query = `
                SELECT v.blockID, 
                       COUNT(*) as vote_count,
                       MAX(v.created_at) as updated_at
                FROM votes v
                WHERE v.not8Panel = 1 
                AND v.blockID NOT IN (
                    SELECT COALESCE(blockID, 0) FROM blocks WHERE consensus_reached = 1
                )
                GROUP BY v.blockID
                ORDER BY v.blockID
            `;
            
            console.log('🔍 Executing pending query:', query);
            
            db.all(query, (err, results) => {
                if (err) {
                    console.error('❌ Error:', err);
                    res.status(500).json({ error: 'Database error: ' + err.message });
                } else {
                    console.log(`✅ Found ${results.length} pending non-standard blocks`);
                    if (results.length > 0) {
                        console.log('📋 Pending results:', results);
                    }
                    res.json(results);
                }
            });
        });
    });

    // Get blocks needing recrop
    router.get('/recrop', (req, res) => {
        console.log('📊 API: Getting blocks needing recrop...');
        
        db.all("PRAGMA table_info(blocks)", (err, columns) => {
            if (err) {
                console.error('❌ Database error:', err);
                res.status(500).json({ error: 'Database error' });
                return;
            }
            
            const columnNames = columns.map(col => col.name);
            const hasNeedsRecrop = columnNames.includes('needsRecrop');
            
            if (!hasNeedsRecrop) {
                console.log('⚠️  needsRecrop column missing, returning empty array');
                res.json([]);
                return;
            }
            
            const query = `
                SELECT blockID, needsRecrop, updated_at, 
                       (SELECT COUNT(*) FROM votes WHERE votes.blockID = blocks.blockID) as vote_count
                FROM blocks 
                WHERE needsRecrop = 1 
                ORDER BY blockID
            `;
            
            console.log('🔍 Executing recrop query');
            
            db.all(query, (err, results) => {
                if (err) {
                    console.error('❌ Error:', err);
                    res.status(500).json({ error: 'Database error: ' + err.message });
                } else {
                    console.log(`✅ Found ${results.length} blocks needing recrop`);
                    res.json(results);
                }
            });
        });
    });
 // Get next block that needs recrop
    router.get('/recrop/next', (req, res) => {
        console.log('📊 API: Getting next block that needs recrop...');
        
        const query = `
            SELECT blockID, needsRecrop, updated_at, verified_by, verified_at
            FROM blocks 
            WHERE needsRecrop = 1 AND consensus_reached = 1
            ORDER BY blockID 
            LIMIT 1
        `;
        
        console.log('🔍 Executing next recrop query:', query);
        
        db.get(query, (err, result) => {
            if (err) {
                console.error('❌ Error:', err);
                res.status(500).json({ error: 'Database error: ' + err.message });
            } else if (result) {
                console.log(`✅ Found next recrop block: ${result.blockID}`);
                res.json(result);
            } else {
                console.log('✅ No blocks need recrop');
                res.json(null);
            }
        });
    });


    // Update non-standard flag for a specific block
    router.patch('/:id/nonstandard', (req, res) => {
        const blockId = req.params.id;
        const { not8Panel, verifiedBy, timestamp } = req.body;
        
        console.log('🔧 Updating non-standard flag for block:', blockId);
        console.log('   - not8Panel:', not8Panel);
        console.log('   - verifiedBy:', verifiedBy);
        
        const updateQuery = `
            UPDATE blocks 
            SET not8Panel = ?, 
                updated_at = datetime('now'),
                verified_by = ?,
                verified_at = ?
            WHERE blockID = ?
        `;
        
        db.run(updateQuery, [not8Panel, verifiedBy, timestamp, blockId], function(err) {
            if (err) {
                console.error('❌ Error updating non-standard flag:', err);
                res.status(500).json({ error: 'Database error updating non-standard flag' });
            } else if (this.changes === 0) {
                console.log('⚠️ No block found with ID:', blockId);
                res.status(404).json({ error: 'Block not found' });
            } else {
                console.log('✅ Non-standard flag updated for block:', blockId, 'Rows affected:', this.changes);
                
                // Verify the update
                db.get('SELECT blockID, not8Panel, updated_at FROM blocks WHERE blockID = ?', [blockId], (verifyErr, row) => {
                    if (verifyErr) {
                        console.error('❌ Error verifying update:', verifyErr);
                    } else {
                        console.log('✅ Verified update:', row);
                    }
                });
                
                res.json({ 
                    success: true, 
                    blockID: blockId, 
                    not8Panel: not8Panel,
                    rowsAffected: this.changes 
                });
            }
        });
    });

    // Update recrop status for a block
    router.patch('/:id/recrop', (req, res) => {
        const blockId = req.params.id;
        const { needsRecrop, verifiedBy, timestamp } = req.body;
        
        console.log(`🔧 API: Updating recrop status for block ${blockId}:`, {
            needsRecrop,
            verifiedBy,
            timestamp
        });
        
        // First, check if the block exists in the blocks table
        const checkQuery = `SELECT blockID FROM blocks WHERE blockID = ?`;
        
        db.get(checkQuery, [blockId], (err, existingBlock) => {
            if (err) {
                console.error('❌ Error checking if block exists:', err);
                return res.status(500).json({ error: 'Database error: ' + err.message });
            }
            
            if (existingBlock) {
                // Block exists, update it
                const updateQuery = `
                    UPDATE blocks 
                    SET needsRecrop = ?, 
                        verified_by = ?, 
                        verified_at = ?,
                        consensus_reached = 1,
                        updated_at = datetime('now')
                    WHERE blockID = ?
                `;
                
                db.run(updateQuery, [needsRecrop, verifiedBy, timestamp, blockId], function(err) {
                    if (err) {
                        console.error('❌ Error updating block:', err);
                        res.status(500).json({ error: 'Database error: ' + err.message });
                    } else {
                        console.log(`✅ Updated block ${blockId} recrop status to ${needsRecrop} with consensus`);
                        res.json({ 
                            success: true, 
                            message: `Block ${blockId} recrop status updated with consensus`,
                            changes: this.changes
                        });
                    }
                });
            } else {
                // Block doesn't exist, insert it with consensus
                const insertQuery = `
                    INSERT INTO blocks (blockID, needsRecrop, verified_by, verified_at, consensus_reached, updated_at) 
                    VALUES (?, ?, ?, ?, 1, datetime('now'))
                `;
                
                db.run(insertQuery, [blockId, needsRecrop, verifiedBy, timestamp], function(err) {
                    if (err) {
                        console.error('❌ Error inserting block:', err);
                        res.status(500).json({ error: 'Database error: ' + err.message });
                    } else {
                        console.log(`✅ Inserted new block ${blockId} with recrop status ${needsRecrop} and consensus`);
                        res.json({ 
                            success: true, 
                            message: `Block ${blockId} recrop status set with consensus`,
                            changes: this.changes
                        });
                    }
                });
            }
        });
    });

    // Add this route to mark recrop as completed:

    router.patch('/:id/recrop/complete', (req, res) => {
        const blockId = req.params.id;
        const { verifiedBy, timestamp } = req.body;
        
        console.log(`✅ API: Completing recrop for block ${blockId}`);
        
        const updateQuery = `
            UPDATE blocks 
            SET needsRecrop = 0, 
                verified_by = ?, 
                verified_at = ?,
                updated_at = datetime('now')
            WHERE blockID = ?
        `;
        
        db.run(updateQuery, [verifiedBy, timestamp, blockId], function(err) {
            if (err) {
                console.error('❌ Error completing recrop:', err);
                res.status(500).json({ error: 'Database error: ' + err.message });
            } else {
                console.log(`✅ Completed recrop for block ${blockId}`);
                res.json({ 
                    success: true, 
                    message: `Block ${blockId} recrop completed`,
                    changes: this.changes
                });
            }
        });
    });

   
    // Get specific block - MOVE TO THE END AND REMOVE THE REGEX
    router.get('/:id', (req, res) => {
        const blockId = req.params.id;
        
        // Validate that id is a number
        if (!/^\d+$/.test(blockId)) {
            return res.status(400).json({ error: 'Block ID must be a number' });
        }
        
        const query = `
            SELECT blockID, needsRecrop, completed, started, not8Panel, 
                   orientation_data, ip_address, vote_count, consensus_reached
            FROM blocks 
            WHERE blockID = ?
        `;
        
        db.get(query, [blockId], (err, row) => {
            if (err) {
                console.error('Error getting block:', err);
                res.status(500).json({ error: 'Database error' });
            } else if (row) {
                res.json(row);
            } else {
                res.status(404).json({ error: 'Block not found' });
            }
        });
    });

    // Add this route to get correct dashboard statistics
    router.get('/stats', (req, res) => {
        console.log('📊 API: Getting dashboard statistics...');
        
        // Check available columns first
        db.all("PRAGMA table_info(blocks)", (err, columns) => {
            if (err) {
                console.error('❌ Database error:', err);
                res.status(500).json({ error: 'Database error' });
                return;
            }
            
            const columnNames = columns.map(col => col.name);
            const hasConsensusReached = columnNames.includes('consensus_reached');
            const hasNot8Panel = columnNames.includes('not8Panel');
            const hasCompleted = columnNames.includes('completed');
            
            console.log('📋 Available columns for stats:', columnNames);
            
            const statsQueries = [];
            
            // Total blocks count
            statsQueries.push({
                name: 'totalBlocks',
                query: 'SELECT COUNT(*) as count FROM blocks'
            });
            
            // Standard 8-panel blocks (assuming most blocks are standard unless marked otherwise)
            if (hasNot8Panel) {
                statsQueries.push({
                    name: 'standard8Panel',
                    query: 'SELECT COUNT(*) as count FROM blocks WHERE not8Panel = 0 OR not8Panel IS NULL'
                });
            } else {
                // If no not8Panel column, assume all blocks are standard for now
                statsQueries.push({
                    name: 'standard8Panel', 
                    query: 'SELECT COUNT(*) as count FROM blocks'
                });
            }
            
            // Completed blocks (with consensus)
            if (hasConsensusReached) {
                statsQueries.push({
                    name: 'standardCompleted',
                    query: 'SELECT COUNT(*) as count FROM blocks WHERE consensus_reached = 1 AND (not8Panel = 0 OR not8Panel IS NULL)'
                });
            } else if (hasCompleted) {
                statsQueries.push({
                    name: 'standardCompleted',
                    query: 'SELECT COUNT(*) as count FROM blocks WHERE completed = 1 AND (not8Panel = 0 OR not8Panel IS NULL)'
                });
            } else {
                statsQueries.push({
                    name: 'standardCompleted',
                    query: 'SELECT 0 as count' // No completion tracking available
                });
            }
            
            // Non-standard confirmed
            if (hasNot8Panel && hasConsensusReached) {
                statsQueries.push({
                    name: 'nonStandardConfirmed',
                    query: 'SELECT COUNT(*) as count FROM blocks WHERE not8Panel = 1 AND consensus_reached = 1'
                });
            } else if (hasNot8Panel) {
                statsQueries.push({
                    name: 'nonStandardConfirmed',
                    query: 'SELECT COUNT(*) as count FROM blocks WHERE not8Panel = 1'
                });
            } else {
                statsQueries.push({
                    name: 'nonStandardConfirmed',
                    query: 'SELECT 0 as count'
                });
            }
            
            // Non-standard pending (has votes but not confirmed)
            statsQueries.push({
                name: 'nonStandardPending',
                query: `
                    SELECT COUNT(*) as count FROM (
                        SELECT v.blockID 
                        FROM votes v 
                        WHERE v.not8Panel = 1 
                        AND v.blockID NOT IN (
                            SELECT COALESCE(blockID, 0) FROM blocks WHERE not8Panel = 1 AND consensus_reached = 1
                        )
                        GROUP BY v.blockID
                    ) as pending_blocks
                `
            });
            
            // Non-standard completed (same as confirmed for now)
            if (hasNot8Panel && hasConsensusReached) {
                statsQueries.push({
                    name: 'nonStandardCompleted',
                    query: 'SELECT COUNT(*) as count FROM blocks WHERE not8Panel = 1 AND consensus_reached = 1'
                });
            } else {
                statsQueries.push({
                    name: 'nonStandardCompleted',
                    query: 'SELECT 0 as count'
                });
            }
            
            // Execute all queries and collect results
            const results = {};
            let completed = 0;
            
            statsQueries.forEach((queryObj, index) => {
                db.get(queryObj.query, (err, result) => {
                    if (err) {
                        console.error(`❌ Error in ${queryObj.name} query:`, err);
                        results[queryObj.name] = 0;
                    } else {
                        results[queryObj.name] = result.count || 0;
                        console.log(`📊 ${queryObj.name}: ${results[queryObj.name]}`);
                    }
                    
                    completed++;
                    if (completed === statsQueries.length) {
                        // All queries completed, send results
                        console.log('✅ All stats queries completed:', results);
                        res.json({
                            totalBlocks: results.totalBlocks || 0,
                            standard8Panel: results.standard8Panel || 0,
                            standardCompleted: results.standardCompleted || 0,
                            nonStandardConfirmed: results.nonStandardConfirmed || 0,
                            nonStandardPending: results.nonStandardPending || 0,
                            nonStandardCompleted: results.nonStandardCompleted || 0
                        });
                    }
                });
            });
        });
    });

    // Get recrop statistics
    router.get('/stats/recrop', (req, res) => {
        console.log('📊 API: Getting recrop statistics...');
        
        const needsRecropQuery = 'SELECT COUNT(*) as count FROM blocks WHERE needsRecrop = 1';
        const completedQuery = 'SELECT COUNT(*) as count FROM blocks WHERE needsRecrop = 0 AND verified_by IS NOT NULL';
        
        db.get(needsRecropQuery, (err, needsResult) => {
            if (err) {
                console.error('❌ Error getting recrop stats:', err);
                res.status(500).json({ error: 'Database error' });
                return;
            }
            
            db.get(completedQuery, (err, completedResult) => {
                if (err) {
                    console.error('❌ Error getting completed recrop stats:', err);
                    res.status(500).json({ error: 'Database error' });
                    return;
                }
                
                const stats = {
                    needsRecrop: needsResult.count || 0,
                    completed: completedResult.count || 0
                };
                
                console.log('✅ Recrop stats:', stats);
                res.json(stats);
            });
        });
    });

    // Get non-standard statistics
    router.get('/stats/nonstandard', (req, res) => {
        console.log('📊 API: Getting non-standard statistics...');
        
        const confirmedQuery = 'SELECT COUNT(*) as count FROM blocks WHERE not8Panel = 1 AND consensus_reached = 1';
        const pendingQuery = `
            SELECT COUNT(*) as count FROM (
                SELECT v.blockID 
                FROM votes v 
                WHERE v.not8Panel = 1 
                AND v.blockID NOT IN (
                    SELECT COALESCE(blockID, 0) FROM blocks WHERE not8Panel = 1 AND consensus_reached = 1
                )
                GROUP BY v.blockID
            ) as pending_blocks
        `;
        
        db.get(confirmedQuery, (err, confirmedResult) => {
            if (err) {
                console.error('❌ Error getting confirmed non-standard stats:', err);
                res.status(500).json({ error: 'Database error' });
                return;
            }
            
            db.get(pendingQuery, (err, pendingResult) => {
                if (err) {
                    console.error('❌ Error getting pending non-standard stats:', err);
                    res.status(500).json({ error: 'Database error' });
                    return;
                }
                
                const stats = {
                    confirmed: confirmedResult.count || 0,
                    pending: pendingResult.count || 0
                };
                
                console.log('✅ Non-standard stats:', stats);
                res.json(stats);
            });
        });
    });

    return router;
}
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

    // Update recrop flag for a specific block
    router.patch('/:id/recrop', (req, res) => {
        const blockId = req.params.id;
        const { needsRecrop, verifiedBy, timestamp } = req.body;
        
        console.log('🔧 Updating recrop flag for block:', blockId);
        console.log('   - needsRecrop:', needsRecrop);
        console.log('   - verifiedBy:', verifiedBy);
        
        const updateQuery = `
            UPDATE blocks 
            SET needsRecrop = ?, 
                updated_at = datetime('now'),
                verified_by = ?,
                verified_at = ?
            WHERE blockID = ?
        `;
        
        db.run(updateQuery, [needsRecrop, verifiedBy, timestamp, blockId], function(err) {
            if (err) {
                console.error('❌ Error updating recrop flag:', err);
                res.status(500).json({ error: 'Database error updating recrop flag' });
            } else if (this.changes === 0) {
                console.log('⚠️ No block found with ID:', blockId);
                res.status(404).json({ error: 'Block not found' });
            } else {
                console.log('✅ Recrop flag updated for block:', blockId, 'Rows affected:', this.changes);
                
                // Verify the update
                db.get('SELECT blockID, needsRecrop, updated_at FROM blocks WHERE blockID = ?', [blockId], (verifyErr, row) => {
                    if (verifyErr) {
                        console.error('❌ Error verifying update:', verifyErr);
                    } else {
                        console.log('✅ Verified update:', row);
                    }
                });
                
                res.json({ 
                    success: true, 
                    blockID: blockId, 
                    needsRecrop: needsRecrop,
                    rowsAffected: this.changes 
                });
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

    return router;
}
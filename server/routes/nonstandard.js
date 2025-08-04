import express from 'express';

export default function createNonStandardRoutes(db) {
    const router = express.Router();

    // Get confirmed non-standard blocks
    router.get('/nonstandard', (req, res) => {
        console.log('📊 Getting confirmed non-standard blocks...');
        
        // Check if columns exist
        db.all("PRAGMA table_info(blocks)", (err, columns) => {
            if (err) {
                console.error('❌ Database error checking columns:', err);
                res.status(500).json({ error: 'Database error' });
                return;
            }
            
            const columnNames = columns.map(col => col.name);
            console.log('📋 Available columns in blocks table:', columnNames);
            
            const hasNot8Panel = columnNames.includes('not8Panel');
            const hasConsensusReached = columnNames.includes('consensus_reached');
            
            if (!hasNot8Panel) {
                console.log('⚠️  not8Panel column does not exist, returning empty array');
                res.json([]);
                return;
            }
            
            // Query for confirmed non-standard blocks
            const query = hasConsensusReached ? 
                `SELECT blockID, consensus_reached, vote_count, final_orientation_data, updated_at 
                 FROM blocks WHERE not8Panel = 1 AND consensus_reached = 1 ORDER BY blockID` :
                `SELECT blockID, completed, vote_count, orientation_data, updated_at 
                 FROM blocks WHERE not8Panel = 1 AND completed = 1 ORDER BY blockID`;
            
            console.log('🔍 Executing confirmed query:', query);
            
            db.all(query, (err, results) => {
                if (err) {
                    console.error('❌ Error getting confirmed non-standard blocks:', err);
                    res.status(500).json({ error: 'Database error: ' + err.message });
                } else {
                    console.log(`✅ Found ${results.length} confirmed non-standard blocks`);
                    res.json(results);
                }
            });
        });
    });

    // Get pending non-standard blocks  
    router.get('/nonstandard/pending', (req, res) => {
        console.log('📊 Getting pending non-standard blocks...');
        
        // First check if votes table exists
        db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='votes'", (err, table) => {
            if (err) {
                console.error('❌ Error checking if votes table exists:', err);
                res.status(500).json({ error: 'Database error' });
                return;
            }
            
            if (!table) {
                console.log('⚠️  Votes table does not exist, returning empty array');
                res.json([]);
                return;
            }
            
            // Check if columns exist in votes table
            db.all("PRAGMA table_info(votes)", (err, columns) => {
                if (err) {
                    console.error('❌ Error checking votes table columns:', err);
                    res.status(500).json({ error: 'Database error' });
                    return;
                }
                
                const columnNames = columns.map(col => col.name);
                console.log('📋 Available columns in votes table:', columnNames);
                
                const hasNot8Panel = columnNames.includes('not8Panel');
                
                if (!hasNot8Panel) {
                    console.log('⚠️  not8Panel column does not exist in votes table, returning empty array');
                    res.json([]);
                    return;
                }
                
                // Get blocks that have non-standard votes but haven't reached consensus
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
                        console.error('❌ Error getting pending non-standard blocks:', err);
                        res.status(500).json({ error: 'Database error: ' + err.message });
                    } else {
                        console.log(`✅ Found ${results.length} pending non-standard blocks`);
                        res.json(results);
                    }
                });
            });
        });
    });

    // Get non-standard statistics
    router.get('/nonstandard/stats', (req, res) => {
        console.log('📊 Getting non-standard statistics...');
        
        // Check if columns exist
        db.all("PRAGMA table_info(blocks)", (err, columns) => {
            if (err) {
                console.error('❌ Database error checking columns:', err);
                res.status(500).json({ error: 'Database error' });
                return;
            }
            
            const columnNames = columns.map(col => col.name);
            const hasNot8Panel = columnNames.includes('not8Panel');
            const hasConsensusReached = columnNames.includes('consensus_reached');
            
            if (!hasNot8Panel) {
                console.log('⚠️  not8Panel column does not exist, returning default stats');
                res.json({
                    totalNonStandard: 0,
                    nonStandardCompleted: 0,
                    nonStandardPending: 0
                });
                return;
            }
            
            // Get statistics
            const queries = {
                totalNonStandard: hasConsensusReached ? 
                    "SELECT COUNT(*) as count FROM blocks WHERE not8Panel = 1 AND consensus_reached = 1" :
                    "SELECT COUNT(*) as count FROM blocks WHERE not8Panel = 1 AND completed = 1",
                nonStandardPending: `SELECT COUNT(DISTINCT blockID) as count FROM votes 
                                     WHERE not8Panel = 1 AND blockID NOT IN 
                                     (SELECT COALESCE(blockID, 0) FROM blocks WHERE consensus_reached = 1)`
            };
            
            const results = {};
            let completed = 0;
            const queryCount = Object.keys(queries).length;
            
            Object.entries(queries).forEach(([key, query]) => {
                db.get(query, (err, result) => {
                    if (err) {
                        console.error(`❌ Error getting ${key}:`, err);
                        results[key] = 0;
                    } else {
                        results[key] = result ? result.count : 0;
                    }
                    
                    completed++;
                    if (completed === queryCount) {
                        const finalResults = {
                            totalNonStandard: results.totalNonStandard || 0,
                            nonStandardCompleted: results.totalNonStandard || 0,
                            nonStandardPending: results.nonStandardPending || 0
                        };
                        
                        console.log('📊 Non-standard stats:', finalResults);
                        res.json(finalResults);
                    }
                });
            });
        });
    });

    return router;
}
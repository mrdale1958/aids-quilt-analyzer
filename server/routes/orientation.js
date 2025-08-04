import express from 'express';

const router = express.Router();

export default function createOrientationRoutes(db, consensusService) {
    // Submit orientation vote
router.post('/orientation/submit', (req, res) => {
    console.log('🗳️ Raw request body received:', JSON.stringify(req.body, null, 2));
    
    const { blockID, orientation_data, needsRecrop, not8Panel, ip_address, user_session } = req.body;
    
    console.log('🗳️ Extracted values:');
    console.log('  - blockID:', blockID, '(type:', typeof blockID, ')');
    console.log('  - orientation_data:', orientation_data, '(type:', typeof orientation_data, ')');
    console.log('  - needsRecrop:', needsRecrop, '(type:', typeof needsRecrop, ')');
    console.log('  - not8Panel:', not8Panel, '(type:', typeof not8Panel, ')');
    console.log('  - ip_address:', ip_address, '(type:', typeof ip_address, ')');
    console.log('  - user_session:', user_session, '(type:', typeof user_session, ')');

    if (!blockID) {
        return res.status(400).json({ error: 'Block ID is required' });
    }

    // Convert to integers for database
    const needsRecropInt = needsRecrop ? 1 : 0;
    const not8PanelInt = not8Panel ? 1 : 0;
    
    console.log('🔢 Converted values:');
    console.log('  - needsRecropInt:', needsRecropInt);
    console.log('  - not8PanelInt:', not8PanelInt);

    // Insert the vote into votes table
    const insertVoteQuery = `
        INSERT INTO votes (blockID, orientation_data, needsRecrop, not8Panel, ip_address, user_session, created_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `;

    const voteParams = [
        blockID, 
        orientation_data, 
        needsRecropInt,
        not8PanelInt,
        ip_address, 
        user_session
    ];

    console.log('🗃️ SQL Query:', insertVoteQuery);
    console.log('🗃️ SQL Parameters:', voteParams);

    db.run(insertVoteQuery, voteParams, function(err) {
        if (err) {
            console.error('❌ Error inserting vote:', err);
            return res.status(500).json({ error: 'Database error inserting vote' });
        }

        console.log('✅ Vote inserted with ID:', this.lastID);

        // Verify the vote was inserted correctly
        db.get('SELECT * FROM votes WHERE id = ?', [this.lastID], (selectErr, row) => {
            if (selectErr) {
                console.error('❌ Error verifying vote insertion:', selectErr);
            } else {
                console.log('✅ Verified inserted vote:', JSON.stringify(row, null, 2));
            }
        });

        // If needsRecrop was flagged, update the blocks table immediately
        if (needsRecropInt === 1) {
            console.log('🔧 needsRecrop is 1, updating blocks table for blockID:', blockID);
            
            const updateRecropQuery = `
                UPDATE blocks 
                SET needsRecrop = ?, updated_at = datetime('now')
                WHERE blockID = ?
            `;
            
            const updateParams = [1, blockID];
            console.log('🗃️ Update SQL:', updateRecropQuery);
            console.log('🗃️ Update Parameters:', updateParams);
            
            db.run(updateRecropQuery, updateParams, function(updateErr) {
                if (updateErr) {
                    console.error('❌ Error updating needsRecrop flag:', updateErr);
                } else {
                    console.log('✅ needsRecrop flag updated. Rows affected:', this.changes);
                    
                    // Verify the update worked
                    db.get('SELECT blockID, needsRecrop, updated_at FROM blocks WHERE blockID = ?', [blockID], (verifyErr, blockRow) => {
                        if (verifyErr) {
                            console.error('❌ Error verifying block update:', verifyErr);
                        } else {
                            console.log('✅ Verified block update:', JSON.stringify(blockRow, null, 2));
                        }
                    });
                }
            });
        } else {
            console.log('ℹ️ needsRecrop is 0, not updating blocks table');
        }

        // Similar logging for not8Panel
        if (not8PanelInt === 1) {
            console.log('🔧 not8Panel is 1, updating blocks table for blockID:', blockID);
            
            const updateNot8PanelQuery = `
                UPDATE blocks 
                SET not8Panel = ?, updated_at = datetime('now')
                WHERE blockID = ?
            `;
            
            const updateParams = [1, blockID];
            console.log('🗃️ Update SQL:', updateNot8PanelQuery);
            console.log('🗃️ Update Parameters:', updateParams);
            
            db.run(updateNot8PanelQuery, updateParams, function(updateErr) {
                if (updateErr) {
                    console.error('❌ Error updating not8Panel flag:', updateErr);
                } else {
                    console.log('✅ not8Panel flag updated. Rows affected:', this.changes);
                }
            });
        }

        // Now check for consensus
        consensusService.checkConsensus(blockID, (consensusErr, consensusResult) => {
            if (consensusErr) {
                console.error('❌ Error checking consensus:', consensusErr);
                return res.json({ 
                    success: true, 
                    voteId: this.lastID,
                    consensusError: consensusErr.message 
                });
            }

            console.log('🎯 Consensus check result:', consensusResult);

            res.json({ 
                success: true, 
                voteId: this.lastID,
                consensus: consensusResult 
            });
        });
    });
});

    return router;
}
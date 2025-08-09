import express from 'express';

export default function createNot8PanelRoutes(db) {
    const router = express.Router();

    // Get confirmed not8Panel blocks
    router.get('/not8panel', (req, res) => {
        console.log('📊 Getting confirmed not8Panel blocks...');
        db.all("PRAGMA table_info(blocks)", (err, columns) => {
            if (err) {
                console.error('❌ Database error checking columns:', err);
                res.status(500).json({ error: 'Database error' });
                return;
            }
            const columnNames = columns.map(col => col.name);
            const hasNot8Panel = columnNames.includes('not8Panel');
            const hasConfirmed = columnNames.includes('not8PanelConfirmed');
            if (!hasNot8Panel || !hasConfirmed) {
                res.json([]);
                return;
            }
            const query = `SELECT blockID, not8PanelConfirmed, vote_count, final_orientation_data, updated_at FROM blocks WHERE not8Panel = 1 AND not8PanelConfirmed = 1 ORDER BY blockID`;
            db.all(query, (err, results) => {
                if (err) {
                    console.error('❌ Error getting confirmed not8Panel blocks:', err);
                    res.status(500).json({ error: 'Database error: ' + err.message });
                } else {
                    res.json(results);
                }
            });
        });
    });

    // Get pending not8Panel blocks
    router.get('/not8panel/pending', (req, res) => {
        db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='votes'", (err, table) => {
            if (err || !table) {
                res.json([]);
                return;
            }
            db.all("PRAGMA table_info(votes)", (err, columns) => {
                if (err) {
                    res.json([]);
                    return;
                }
                const columnNames = columns.map(col => col.name);
                if (!columnNames.includes('not8Panel')) {
                    res.json([]);
                    return;
                }
                const query = `SELECT v.blockID, COUNT(*) as vote_count, MAX(v.created_at) as updated_at FROM votes v WHERE v.not8Panel = 1 AND v.blockID IN (SELECT blockID FROM blocks WHERE not8Panel = 1 AND not8PanelConfirmed = 0) GROUP BY v.blockID ORDER BY v.blockID`;
                db.all(query, (err, results) => {
                    if (err) {
                        res.status(500).json({ error: 'Database error: ' + err.message });
                    } else {
                        res.json(results);
                    }
                });
            });
        });
    });

    // Get not8Panel statistics
    router.get('/not8panel/stats', (req, res) => {
        db.all("PRAGMA table_info(blocks)", (err, columns) => {
            if (err) {
                res.status(500).json({ error: 'Database error' });
                return;
            }
            const columnNames = columns.map(col => col.name);
            if (!columnNames.includes('not8Panel') || !columnNames.includes('not8PanelConfirmed')) {
                res.json({ totalNot8Panel: 0, not8PanelCompleted: 0, not8PanelPending: 0 });
                return;
            }
            const queries = {
                totalNot8Panel: "SELECT COUNT(*) as count FROM blocks WHERE not8Panel = 1 AND not8PanelConfirmed = 1",
                not8PanelPending: "SELECT COUNT(*) as count FROM blocks WHERE not8Panel = 1 AND not8PanelConfirmed = 0"
            };
            const results = {};
            let completed = 0;
            const queryCount = Object.keys(queries).length;
            Object.entries(queries).forEach(([key, query]) => {
                db.get(query, (err, result) => {
                    results[key] = (err || !result) ? 0 : result.count;
                    completed++;
                    if (completed === queryCount) {
                        res.json({
                            totalNot8Panel: results.totalNot8Panel || 0,
                            not8PanelCompleted: results.totalNot8Panel || 0,
                            not8PanelPending: results.not8PanelPending || 0
                        });
                    }
                });
            });
        });
    });

    return router;
}

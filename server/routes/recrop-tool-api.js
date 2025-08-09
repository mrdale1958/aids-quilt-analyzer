import express from 'express';
import ImageService from '../services/imageService.js';

export default function createRecropToolApi(db) {
    const router = express.Router();
    const imageService = new ImageService();

    // Get next block needing recrop (for recrop tool)
    router.get('/block/recrop/next', async (req, res) => {
        db.get(`SELECT blockID, needsRecrop, recropCompleted, updated_at
                FROM blocks
                WHERE needsRecrop = 1 AND recropCompleted = 0
                ORDER BY blockID LIMIT 1`, async (err, row) => {
            if (err) {
                console.error('Error fetching next recrop block:', err);
                res.status(500).json({ error: 'Database error' });
            } else if (row) {
                // Check for image existence
                try {
                    const imageResponse = await imageService.getBlockImage(row.blockID);
                    if (imageResponse) {
                        // Zero-pad blockID to 5 digits
                        const paddedId = String(row.blockID).padStart(5, '0');
                        res.json({ ...row, imageUrl: `/api/image/${paddedId}` });
                    } else {
                        res.status(404).json({ error: 'No image found for block', block: row });
                    }
                } catch (imgErr) {
                    res.status(500).json({ error: 'Image check error', details: imgErr.message, block: row });
                }
            } else {
                res.json(null);
            }
        });
    });

    return router;
}

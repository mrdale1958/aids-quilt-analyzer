import express from 'express';
import path from 'path';
import fs from 'fs-extra';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

export default function createRecropRoutes(db, imageService) {
    // Generate crop preview
    router.post('/recrop/preview', async (req, res) => {
        const { blockID, corners } = req.body;
        console.log(`Generating crop preview for block ${blockID}`);
        
        try {
            const result = await generateCropPreview(blockID, corners, imageService);
            res.json({ success: true, previewUrl: result.previewUrl });
        } catch (error) {
            console.error('Error generating crop preview:', error);
            res.status(500).json({ error: 'Failed to generate preview' });
        }
    });

    // Accept crop
    router.post('/recrop/accept', async (req, res) => {
        const { blockID, corners } = req.body;
        console.log(`Accepting crop for block ${blockID}`);
        
        try {
            const result = await processFinalCrop(blockID, corners, imageService);
            
            const updateQuery = `
                UPDATE blocks 
                SET needsRecrop = 0,
                    updated_at = CURRENT_TIMESTAMP
                WHERE blockID = ?
            `;
            
            db.run(updateQuery, [blockID], function(err) {
                if (err) {
                    console.error('Error updating recrop status:', err);
                    res.status(500).json({ error: 'Database error' });
                } else {
                    console.log(`✅ Block ${blockID} recrop completed`);
                    res.json({ 
                        success: true, 
                        message: 'Recrop completed successfully',
                        finalImageUrl: result.finalImageUrl
                    });
                }
            });
            
        } catch (error) {
            console.error('Error processing final crop:', error);
            res.status(500).json({ error: 'Failed to process crop' });
        }
    });

    return router;
}

// Helper functions
async function generateCropPreview(blockID, corners, imageService) {
    const paddedID = blockID.toString().padStart(5, '0');
    const previewDir = path.join(__dirname, '..', '..', 'tmp');
    const previewPath = path.join(previewDir, `${paddedID}_preview.jpg`);
    
    if (!fs.existsSync(previewDir)) {
        fs.mkdirSync(previewDir, { recursive: true });
    }
    
    const sourceImage = path.join(__dirname, '..', '..', 'quilt512', `${paddedID}.png`);
    
    if (!fs.existsSync(sourceImage)) {
        throw new Error(`Source image not found: ${sourceImage}`);
    }
    
    const bounds = imageService.getBoundingBoxFromCorners(corners);
    await imageService.cropImage(sourceImage, previewPath, bounds);
    
    return {
        previewUrl: `/tmp/${paddedID}_preview.jpg`
    };
}

async function processFinalCrop(blockID, corners, imageService) {
    const paddedID = blockID.toString().padStart(5, '0');
    
    const finalDir = path.join(__dirname, '..', '..', 'final');
    const finalPath = path.join(finalDir, `${paddedID}.jpg`);
    const final2kDir = path.join(__dirname, '..', '..', 'final', '2k');
    const final2kPath = path.join(final2kDir, `${paddedID}.jpg`);
    
    [finalDir, final2kDir].forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });
    
    const sourceImage = path.join(__dirname, '..', '..', 'quilt512', `${paddedID}.png`);
    const bounds = imageService.getBoundingBoxFromCorners(corners);
    
    await imageService.cropImage(sourceImage, finalPath, bounds);
    await imageService.resizeImage(finalPath, final2kPath, '2048x2048');
    
    const quilt512Path = path.join(__dirname, '..', '..', 'quilt512', `${paddedID}.png`);
    await imageService.resizeImage(finalPath, quilt512Path, '512x512');
    
    return {
        finalImageUrl: `/final/${paddedID}.jpg`
    };
}
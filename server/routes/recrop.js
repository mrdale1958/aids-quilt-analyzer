import express from 'express';
import path from 'path';
import fs from 'fs-extra';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

export default function createRecropRoutes(db, imageService) {

    // Recrop tool password check endpoint
    router.post('/recrop/access', (req, res) => {
        const { password } = req.body;
        // Set your password here or use process.env.RECROP_PASSWORD for production
        const RECROP_PASSWORD = process.env.RECROP_PASSWORD || 'quilt2025';
        if (password === RECROP_PASSWORD) {
            res.json({ success: true });
        } else {
            res.status(401).json({ success: false, error: 'Incorrect password' });
        }
    });

    // Recrop statistics endpoint
    router.get('/recrop/stats', (req, res) => {
        // Count blocks needing recrop
        db.get('SELECT COUNT(*) as totalNeedingRecrop FROM blocks WHERE needsRecrop = 1', (err, needRow) => {
            if (err) {
                console.error('Error counting blocks needing recrop:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            // Count blocks that have been recropped (needsRecrop = 0 and recropCompleted = 1)
            db.get('SELECT COUNT(*) as totalRecropped FROM blocks WHERE needsRecrop = 0 AND recropCompleted = 1', (err2, recroppedRow) => {
                if (err2) {
                    console.error('Error counting recropped blocks:', err2);
                    return res.status(500).json({ error: 'Database error' });
                }
                res.json({
                    totalNeedingRecrop: needRow.totalNeedingRecrop,
                    totalRecropped: recroppedRow.totalRecropped
                });
            });
        });
    });
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
                    recropCompleted = 1,
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
    const sourceImagePath = path.join(previewDir, `${paddedID}_source.png`);
    
    if (!fs.existsSync(previewDir)) {
        fs.mkdirSync(previewDir, { recursive: true });
    }
    
    // Download the image from the remote URL first
    console.log(`Downloading source image for block ${blockID}...`);
    const imageResponse = await imageService.getBlockImage(blockID);
    
    if (!imageResponse) {
        throw new Error(`Source image not found for block ${blockID}`);
    }
    
    // Save the downloaded image to a temporary file
    const buffer = Buffer.from(await imageResponse.arrayBuffer());
    await fs.writeFile(sourceImagePath, buffer);
    
    console.log(`Source image saved to: ${sourceImagePath}`);
    
    const bounds = imageService.getBoundingBoxFromCorners(corners);
    await imageService.cropImage(sourceImagePath, previewPath, bounds);
    
    // Clean up the temporary source file
    try {
        await fs.remove(sourceImagePath);
    } catch (error) {
        console.warn(`Failed to clean up temporary file: ${sourceImagePath}`, error);
    }
    
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
    const tempDir = path.join(__dirname, '..', '..', 'tmp');
    const sourceImagePath = path.join(tempDir, `${paddedID}_final_source.png`);
    
    [finalDir, final2kDir, tempDir].forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });
    
    // Download the image from the remote URL first
    console.log(`Downloading source image for final crop of block ${blockID}...`);
    const imageResponse = await imageService.getBlockImage(blockID);
    
    if (!imageResponse) {
        throw new Error(`Source image not found for block ${blockID}`);
    }
    
    // Save the downloaded image to a temporary file
    const buffer = Buffer.from(await imageResponse.arrayBuffer());
    await fs.writeFile(sourceImagePath, buffer);
    
    const bounds = imageService.getBoundingBoxFromCorners(corners);
    
    await imageService.cropImage(sourceImagePath, finalPath, bounds);
    await imageService.resizeImage(finalPath, final2kPath, '2048x2048');
    
    const quilt512Path = path.join(__dirname, '..', '..', 'quilt512', `${paddedID}.png`);
    // Create quilt512 directory if it doesn't exist
    const quilt512Dir = path.dirname(quilt512Path);
    if (!fs.existsSync(quilt512Dir)) {
        fs.mkdirSync(quilt512Dir, { recursive: true });
    }
    await imageService.resizeImage(finalPath, quilt512Path, '512x512');
    
    // Clean up the temporary source file
    try {
        await fs.remove(sourceImagePath);
    } catch (error) {
        console.warn(`Failed to clean up temporary file: ${sourceImagePath}`, error);
    }
    
    return {
        finalImageUrl: `/final/${paddedID}.jpg`
    };
}
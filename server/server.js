import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// Import services
import DatabaseService from './services/database.js';
import ImageService from './services/imageService.js';
import ConsensusService from './services/consensusService.js';

// Import routes
console.log('📦 Importing route modules...');
import createBlockRoutes from './routes/blocks.js';
console.log('✅ createBlockRoutes imported:', typeof createBlockRoutes);

import createStatsRoutes from './routes/stats.js';
import createOrientationRoutes from './routes/orientation.js';
import createRecropRoutes from './routes/recrop.js';
import createRecropToolApi from './routes/recrop-tool-api.js';

// ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize services
const databaseService = new DatabaseService();
const db = databaseService.getDatabase();
const imageService = new ImageService();
const consensusService = new ConsensusService(db);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use('/images', express.static(path.join(__dirname, '../public/images')));
app.use('/tmp', express.static(path.join(__dirname, '..', 'tmp')));

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        port: PORT 
    });
});

// MOVE THIS BEFORE THE ROUTES
app.use((req, res, next) => {
    console.log(`📝 ${req.method} ${req.path}`);
    next();
});

// Mount routes
console.log('🚀 Mounting routes...');
const blockRoutes = createBlockRoutes(db, consensusService);
console.log('🔧 Block routes created:', !!blockRoutes);
app.use('/api/blocks', blockRoutes);
console.log('✅ Blocks routes mounted at /api/blocks');

app.use('/api/stats', createStatsRoutes(db));
console.log('✅ Stats routes mounted at /api/stats');

app.use('/api', createOrientationRoutes(db, consensusService));
console.log('✅ Orientation routes mounted at /api');

app.use('/api', createRecropRoutes(db, imageService));
console.log('✅ Recrop routes mounted at /api');

app.use('/api', createRecropToolApi(db));
console.log('✅ Recrop Tool API mounted at /api');

// Image proxy route
app.get('/api/image/:blockId', async (req, res) => {
    const { blockId } = req.params;
    
    try {
        const imageResponse = await imageService.getBlockImage(blockId);
        
        if (imageResponse) {
            res.set('Content-Type', 'image/png');
            res.set('Cache-Control', 'public, max-age=86400');
            imageResponse.body.pipe(res);
        } else {
            console.log(`No image found for block ${blockId}, sending placeholder`);
            const placeholder = imageService.createPlaceholder(blockId);
            res.set('Content-Type', 'image/svg+xml');
            res.send(placeholder);
        }
    } catch (error) {
        console.error('Error in image proxy:', error);
        res.status(500).json({ error: 'Image service error' });
    }
});

// Remove the inline non-standard and recrop endpoints - they're now in route modules

// Add this database migration function
function ensureColumnsExist(db) {
    console.log('Checking database schema...');
    
    // Check blocks table
    db.all("PRAGMA table_info(blocks)", (err, columns) => {
        if (err) {
            console.error('Error getting column info:', err);
            return;
        }
        
        const columnNames = columns.map(col => col.name);
        console.log('Existing columns in blocks:', columnNames);
        
        const neededColumns = [
            { name: 'needsRecrop', type: 'INTEGER DEFAULT 0' },
            { name: 'not8Panel', type: 'INTEGER DEFAULT 0' },
            { name: 'vote_count', type: 'INTEGER DEFAULT 0' },
            { name: 'consensus_reached', type: 'INTEGER DEFAULT 0' },
            { name: 'final_orientation_data', type: 'TEXT' },
            { name: 'updated_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
            { name: 'verified_by', type: 'TEXT' },         // Add this
            { name: 'verified_at', type: 'TEXT' }          // Add this
        ];
        
        neededColumns.forEach(column => {
            if (!columnNames.includes(column.name)) {
                console.log(`Adding missing column to blocks: ${column.name}`);
                db.run(`ALTER TABLE blocks ADD COLUMN ${column.name} ${column.type}`, (err) => {
                    if (err) {
                        console.error(`Error adding column ${column.name}:`, err);
                    } else {
                        console.log(`✅ Added column: ${column.name}`);
                    }
                });
            }
        });
    });
    
    // Check votes table
    db.all("PRAGMA table_info(votes)", (err, columns) => {
        if (err) {
            console.error('Error getting votes column info:', err);
            return;
        }
        
        const columnNames = columns.map(col => col.name);
        console.log('Existing columns in votes:', columnNames);
        
        const neededVoteColumns = [
            { name: 'needsRecrop', type: 'INTEGER DEFAULT 0' },
            { name: 'not8Panel', type: 'INTEGER DEFAULT 0' }
        ];
        
        neededVoteColumns.forEach(column => {
            if (!columnNames.includes(column.name)) {
                console.log(`Adding missing column to votes: ${column.name}`);
                db.run(`ALTER TABLE votes ADD COLUMN ${column.name} ${column.type}`, (err) => {
                    if (err) {
                        console.error(`Error adding column ${column.name}:`, err);
                    } else {
                        console.log(`✅ Added column to votes: ${column.name}`);
                    }
                });
            }
        });
    });
}

// Call this function after database initialization
ensureColumnsExist(db);

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('Closing database connection...');
    databaseService.close((err) => {
        if (err) {
            console.error('Error closing database:', err);
        } else {
            console.log('Database connection closed.');
        }
        process.exit(0);
    });
});
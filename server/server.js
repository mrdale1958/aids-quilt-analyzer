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

// Reduce logging in production to prevent memory buildup
if (process.env.NODE_ENV !== 'production') {
    app.use((req, res, next) => {
        console.log(`📝 ${req.method} ${req.path}`);
        next();
    });
}

// Mount routes
try {
  console.log('🚀 Mounting routes...');
const blockRoutes = createBlockRoutes(db, consensusService);
console.log('🔧 Block routes created:', !!blockRoutes);
app.use('/api/blocks', blockRoutes);
console.log('✅ Blocks routes mounted at /api/blocks');
} catch (error) {
    console.error('❌ Error with blocks:', error);
        process.exit(1);

}
app.use('/api/stats', createStatsRoutes(db));
console.log('✅ Stats routes mounted at /api/stats');

app.use('/api', createOrientationRoutes(db, consensusService));
console.log('✅ Orientation routes mounted at /api');

app.use('/api', createRecropRoutes(db, imageService));
console.log('✅ Recrop routes mounted at /api');

// Image proxy route
app.get('/api/image/:blockId', async (req, res) => {
    const { blockId } = req.params;

    try {
        const imageResponse = await imageService.getBlockImage(blockId);

        if (imageResponse) {
            res.set('Content-Type', 'image/png');
            res.set('Cache-Control', 'public, max-age=86400');

            // Handle stream cleanup properly to prevent memory leaks
            imageResponse.body.pipe(res);

            imageResponse.body.on('end', () => {
                imageResponse.body.destroy();
            });

            imageResponse.body.on('error', (err) => {
                console.error('Stream error:', err);
                imageResponse.body.destroy();
                if (!res.headersSent) {
                    res.status(500).json({ error: 'Stream error' });
                }
            });

            res.on('close', () => {
                imageResponse.body.destroy();
            });
        } else {
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

// Graceful shutdown with cleanup
process.on('SIGINT', () => {
    console.log('Shutting down gracefully...');

    // Optimize database before closing
    databaseService.finalize();

    databaseService.close((err) => {
        if (err) {
            console.error('Error closing database:', err);
        } else {
            console.log('Database connection closed.');
        }

        // Force garbage collection if available
        if (global.gc) {
            global.gc();
        }

        process.exit(0);
    });
});

// Handle memory pressure
process.on('warning', (warning) => {
    if (warning.name === 'MaxListenersExceededWarning') {
        console.warn('Memory warning - too many event listeners:', warning.message);
    }
});

// Periodic cleanup
setInterval(() => {
    if (global.gc) {
        global.gc();
    }
}, 300000); // Every 5 minutes

// Add this route to your server:
app.post('/api/recrop/access', (req, res) => {
    const { password } = req.body;
    
    // Set your desired password here
    const RECROP_PASSWORD = 'admin123'; // Change this to your preferred password
    
    if (password === RECROP_PASSWORD) {
        res.json({ success: true });
    } else {
        res.status(401).json({ error: 'Invalid password' });
    }
});
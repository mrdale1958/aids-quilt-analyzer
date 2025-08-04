import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs-extra';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class DatabaseService {
    constructor() {
        this.db = null;
        this.dbPath = path.join(__dirname, '../../database/quilt.db');
        this.initialize();
    }

    initialize() {
        // Ensure database directory exists
        const dbDir = path.dirname(this.dbPath);
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }

        this.db = new sqlite3.Database(this.dbPath);
        this.createTables();
    }

    createTables() {
        this.db.serialize(() => {
            // Create blocks table
            this.db.run(`CREATE TABLE IF NOT EXISTS blocks (
                blockID INTEGER PRIMARY KEY,
                needsRecrop INTEGER DEFAULT 0,
                completed INTEGER DEFAULT 0,
                started INTEGER DEFAULT 0,
                not8Panel INTEGER DEFAULT 0,
                vote_count INTEGER DEFAULT 0,
                consensus_reached INTEGER DEFAULT 0,
                final_orientation_data TEXT,
                orientation_data TEXT,
                ip_address TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`, (err) => {
                if (err) console.error('Error creating blocks table:', err);
                else console.log('Blocks table ready');
                this.migrateDatabase();
            });
            
            // Create votes table
            this.db.run(`CREATE TABLE IF NOT EXISTS votes (
                voteID INTEGER PRIMARY KEY AUTOINCREMENT,
                blockID INTEGER,
                orientation_data TEXT,
                needsRecrop INTEGER,
                not8Panel INTEGER,
                ip_address TEXT,
                user_session TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (blockID) REFERENCES blocks(blockID)
            )`, (err) => {
                if (err) console.error('Error creating votes table:', err);
                else console.log('Votes table ready');
            });
            
            // Create panels table
            this.db.run(`CREATE TABLE IF NOT EXISTS panels (
                panelID INTEGER PRIMARY KEY AUTOINCREMENT,
                blockID INTEGER,
                panel_number INTEGER,
                x_coord INTEGER,
                y_coord INTEGER,
                width INTEGER,
                height INTEGER,
                FOREIGN KEY (blockID) REFERENCES blocks(blockID)
            )`, (err) => {
                if (err) console.error('Error creating panels table:', err);
                else console.log('Panels table ready');
            });
            
            this.initializeBlocks();
        });
    }

    initializeBlocks() {
        this.db.get("SELECT COUNT(*) as count FROM blocks", (err, result) => {
            if (err) {
                console.error('Error checking blocks count:', err);
                return;
            }
            
            if (result.count === 0) {
                console.log('Initializing blocks database...');
                const stmt = this.db.prepare("INSERT INTO blocks (blockID) VALUES (?)");
                
                for (let i = 1; i <= 6066; i++) {
                    stmt.run(i);
                }
                
                stmt.finalize((err) => {
                    if (err) {
                        console.error('Error initializing blocks:', err);
                    } else {
                        console.log('Initialized 6066 blocks in database');
                    }
                });
            } else {
                console.log(`Database already has ${result.count} blocks`);
            }
        });
    }

    migrateDatabase() {
        console.log('Checking database schema...');
        
        this.db.all("PRAGMA table_info(blocks)", (err, columns) => {
            if (err) {
                console.error('Error getting column info:', err);
                return;
            }
            
            const columnNames = columns.map(col => col.name);
            const needsMigration = [];
            
            if (!columnNames.includes('vote_count')) {
                needsMigration.push('ADD COLUMN vote_count INTEGER DEFAULT 0');
            }
            if (!columnNames.includes('consensus_reached')) {
                needsMigration.push('ADD COLUMN consensus_reached INTEGER DEFAULT 0');
            }
            if (!columnNames.includes('final_orientation_data')) {
                needsMigration.push('ADD COLUMN final_orientation_data TEXT');
            }
            
            if (needsMigration.length > 0) {
                console.log('Migrating database schema...');
                let completed = 0;
                needsMigration.forEach(alteration => {
                    this.db.run(`ALTER TABLE blocks ${alteration}`, (err) => {
                        if (err) {
                            console.error(`Error adding column: ${alteration}`, err);
                        } else {
                            console.log(`✓ Applied: ${alteration}`);
                        }
                        
                        completed++;
                        if (completed === needsMigration.length) {
                            console.log('Database migration completed!');
                        }
                    });
                });
            } else {
                console.log('Database schema is up to date.');
            }
        });
    }

    getDatabase() {
        return this.db;
    }

    close(callback) {
        if (this.db) {
            this.db.close(callback);
        }
    }
}

export default DatabaseService;
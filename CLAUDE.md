# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

**Start Development Server:**
```bash
npm run dev          # Runs both frontend and backend concurrently
npm run server       # Backend only (Express server on port 3001)
npm run client       # Frontend only (Vite dev server on port 3000)
```

**Build and Preview:**
```bash
npm run build        # Build for production
npm run preview      # Preview production build
```

**Database Operations:**
The SQLite database is auto-created on first run in `/database/quilt.db`.

## Architecture Overview

**Frontend (React + Vite):**
- Single-page application with client-side routing
- Main components: Dashboard, QuiltAnalyzer, RecropPage, NonStandardPage
- CSS Modules for component-specific styling
- Proxy configuration routes `/api` and `/images` to backend

**Backend (Node.js + Express):**
- RESTful API structure with modular route handlers
- Service layer: DatabaseService, ImageService, ConsensusService
- Serves static images from `/public/images` and temporary files from `/tmp`
- CORS enabled for cross-origin requests

**Key Service Classes:**
- `DatabaseService` (`server/services/database.js`): SQLite operations and schema management
- `ImageService` (`server/services/imageService.js`): Image processing and file operations
- `ConsensusService` (`server/services/consensusService.js`): Aggregates crowdsourced annotations

**Route Structure:**
- `/routes/blocks.js`: Block data retrieval and management
- `/routes/orientation.js`: Panel annotation submissions
- `/routes/stats.js`: Statistics and analytics
- `/routes/recrop.js`: Re-cropping workflow
- `/routes/nonstandard.js`: Non-standard block handling

**State Management:**
- React state for page navigation (`currentPage` in App.jsx)
- No external state management library used
- Database state managed through API calls

**Database Schema:**
- `blocks` table: Block metadata, completion status, orientation data
- `panels` table: Individual panel coordinates within blocks
- Foreign key relationship: panels.blockID → blocks.blockID

**Development Workflow:**
- Frontend runs on port 3000 with Vite hot reload
- Backend runs on port 3001 with auto-restart via concurrently
- API proxy allows frontend to call `/api/*` endpoints seamlessly
- Images served at `/images/*` route from public directory

**Important Notes:**
- This is a crowdsourced annotation tool for AIDS Memorial Quilt preservation
- Handle data with appropriate respect for the memorial's significance
- The application migrated from PHP/MySQL to Node.js/React/SQLite
- Uses ES modules throughout (type: "module" in package.json)
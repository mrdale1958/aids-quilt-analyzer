# AIDS Quilt Crowdsourced Image Analyzer

A modern web application for analyzing and annotating AIDS Memorial Quilt blocks through crowdsourced contributions. This project helps preserve the history of the AIDS Memorial Quilt by enabling volunteers to identify and mark the centers of individual artifacts within quilt blocks.

## 🎯 Purpose

The AIDS Memorial Quilt is one of the most significant works of community folk art in the world. This application helps digitally preserve and analyze quilt blocks by crowdsourcing the identification of individual artifact boundaries, enabling better archival and research capabilities.

## ✨ Features

- **Interactive Image Analysis**: Click on numbered overlay points to mark artifact centers
- **Quality Control**: Options to flag blocks that need re-cropping or aren't standard 8-artifact blocks
- **Session Tracking**: Keep track of blocks analyzed in each session
- **Responsive Design**: Works on desktop and mobile devices
- **Real-time Statistics**: Dashboard showing progress and completion rates
- **Modern Architecture**: Built with Node.js, React, and SQLite

## 🏗️ Architecture

**Frontend**: React with Vite
**Backend**: Node.js with Express
**Database**: SQLite
**Styling**: CSS with responsive design

## 📋 Prerequisites

- Node.js (v16 or higher)
- npm or yarn package manager
- Git

## 🚀 Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/aids-quilt-analyzer.git
   cd aids-quilt-analyzer
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Initialize the database**
   ```bash
   # Database will be created automatically on first run
   mkdir -p database
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

## 📁 Project Structure

```
aids-quilt-analyzer/
├── src/                    # React frontend source
│   ├── components/         # React components
│   ├── App.jsx            # Main application component
│   └── main.jsx           # Application entry point
├── server/                # Node.js backend
│   └── server.js          # Express server and API routes
├── database/              # SQLite database files
│   ├── schema.sql         # Database schema
│   └── quilt.db          # SQLite database (auto-generated)
├── public/               # Static assets
│   └── images/           # Quilt block images
├── package.json          # Node.js dependencies
└── vite.config.js        # Vite configuration
```

## 🔧 API Endpoints

### Blocks
- `GET /api/block/:id` - Get specific block data
- `GET /api/block/incomplete/next` - Get next incomplete block
- `POST /api/orientation` - Submit block analysis data

### Statistics
- `GET /api/stats/completed` - Get completed blocks count
- `GET /api/stats/total` - Get total blocks count
- `GET /api/health` - Health check endpoint

## 💾 Database Schema

### Blocks Table
```sql
CREATE TABLE blocks (
    blockID INTEGER PRIMARY KEY,
    needsRecrop INTEGER DEFAULT 0,
    completed INTEGER DEFAULT 0,
    started INTEGER DEFAULT 0,
    not8Artifact INTEGER DEFAULT 0,
    orientation_data TEXT,
    ip_address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Artifacts Table
```sql
CREATE TABLE artifacts (
    artifactID INTEGER PRIMARY KEY,
    blockID INTEGER,
    artifact_number INTEGER,
    x_coord INTEGER,
    y_coord INTEGER,
    width INTEGER,
    height INTEGER,
    FOREIGN KEY (blockID) REFERENCES blocks(blockID)
);
```

## 🎮 How to Use

### For Analysts
1. **Dashboard**: View statistics and start analyzing blocks
2. **Image Analysis**: 
   - Click numbered points closest to each of the 8 artifact centers
   - Mark blocks that need re-cropping
   - Indicate blocks that aren't standard 8-artifact layouts
3. **Submit**: Save your analysis and move to the next block

### For Developers
1. **Adding Images**: Place quilt block images in `/public/images/`
2. **Database Management**: Use SQLite browser or command line tools
3. **API Testing**: Use the `/api/health` endpoint to verify server status

## 🛠️ Development

### Available Scripts

```bash
npm run dev        # Start both frontend and backend in development mode
npm run server     # Start only the backend server
npm run client     # Start only the frontend development server
npm run build      # Build for production
npm run preview    # Preview production build
```

### Environment Variables

Create a `.env` file in the root directory:

```env
PORT=3001
DATABASE_PATH=./database/quilt.db
NODE_ENV=development
```

## 🧪 Testing

```bash
# Test API endpoints
curl http://localhost:3001/api/health

# Test block retrieval
curl http://localhost:3001/api/block/1
```

## 📦 Deployment

### Production Build
```bash
npm run build
npm start
```

### Environment Setup
- Set `NODE_ENV=production`
- Configure proper database path
- Set up reverse proxy (nginx recommended)
- Enable HTTPS for production

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow React best practices
- Use meaningful commit messages
- Test your changes thoroughly
- Update documentation as needed

## 📝 License

This project is dedicated to preserving the AIDS Memorial Quilt. Please use responsibly and with respect for the memorial's significance.

## 🙏 Acknowledgments

- The AIDS Memorial Quilt Project
- All volunteers who contribute to quilt block analysis
- The original PHP application developers
- The open-source community

## 📞 Support

For questions or issues:
1. Check the [Issues](https://github.com/YOUR_USERNAME/aids-quilt-analyzer/issues) page
2. Create a new issue with detailed information
3. Contact the maintainers

## 🔄 Migration from PHP

This project is a modern conversion of the original PHP/MySQL application to Node.js/React/SQLite. Key improvements include:

- Modern JavaScript framework (React)
- Responsive mobile-friendly design
- RESTful API architecture
- Lightweight SQLite database
- Improved user experience
- Better code maintainability

---

**Remember**: This application helps preserve important historical artifacts. Please approach the work with the respect and dignity that the AIDS Memorial Quilt
import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import QuiltAnalyzer from './components/QuiltAnalyzer';
import RecropPage from './components/RecropPage';
import NonStandardPage from './components/NonStandardPage';
import RecropListPage from './components/RecropListPage';
import RecropAccessModal from './components/RecropAccessModal';
import './App.css';

function App() {
    const [currentPage, setCurrentPage] = useState('dashboard'); // Make sure this defaults to 'dashboard'
    const [selectedBlock, setSelectedBlock] = useState(null);
    const [nextBlock, setNextBlock] = useState(null);
    const [recropAccess, setRecropAccess] = useState(false);
    const [showRecropModal, setShowRecropModal] = useState(false);

    // Debug: Log the current page state
    useEffect(() => {
        console.log('🔍 Current page state:', currentPage);
        console.log('🔍 Selected block:', selectedBlock);
    }, [currentPage, selectedBlock]);

    const handleAnalyzeBlock = (blockData) => {
        console.log('🎯 Analyzing block:', blockData);
        setSelectedBlock(blockData);
        setCurrentPage('analyzer');
    };

    const handleRecropAccess = () => {
        setShowRecropModal(true);
    };

    const handleRecropPasswordSubmit = async (password) => {
        try {
            const response = await fetch('/api/recrop/access', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ password })
            });

            if (response.ok) {
                setRecropAccess(true);
                setShowRecropModal(false);
                setCurrentPage('recrop');
            } else {
                alert('Incorrect password. Access denied.');
            }
        } catch (error) {
            console.error('Error checking recrop access:', error);
            alert('Error checking access. Please try again.');
        }
    };

    const handleRecropModalClose = () => {
        setShowRecropModal(false);
    };

    const handleDashboardUpdate = (dashboardData) => {
        console.log('📊 Dashboard update received:', dashboardData);
        setNextBlock(dashboardData.nextBlock);
    };

    const renderCurrentPage = () => {
        console.log('🎯 App renderCurrentPage called with currentPage:', currentPage);
        console.log('🎯 Type of currentPage:', typeof currentPage);
        console.log('🎯 currentPage === "dashboard":', currentPage === 'dashboard');
        
        switch (currentPage) {
            case 'dashboard':
                console.log('🎯 Rendering Dashboard component...');
                return (
                    <Dashboard 
                        onAnalyzeBlock={handleAnalyzeBlock}
                        onViewNonStandard={() => setCurrentPage('nonstandard')}
                        onViewRecropQueue={() => setCurrentPage('recroplist')}
                        onDashboardUpdate={handleDashboardUpdate}
                    />
                );
            case 'analyzer':
                console.log('🎯 Rendering Analyzer component...');
                return (
                    <QuiltAnalyzer 
                        blockId={selectedBlock.blockID} 
                        blockData={selectedBlock}
                        onBack={() => setCurrentPage('dashboard')} 
                    />
                );
            case 'nonstandard':
                console.log('🎯 Rendering NonStandardPage component...');
                return (
                    <NonStandardPage 
                        onBack={() => setCurrentPage('dashboard')}
                    />
                );
            case 'recroplist':
                console.log('🎯 Rendering RecropListPage component...');
                return (
                    <RecropListPage 
                        onBack={() => setCurrentPage('dashboard')}
                    />
                );
            case 'recrop':
                console.log('🎯 Rendering RecropPage component...');
                if (recropAccess) {
                    return (
                        <RecropPage 
                            onBack={() => setCurrentPage('dashboard')} 
                        />
                    );
                } else {
                    setCurrentPage('dashboard');
                    return null;
                }
            default:
                console.log('🎯 Default case - currentPage was:', currentPage);
                console.log('🎯 Setting currentPage to dashboard...');
                setCurrentPage('dashboard');
                return null;
        }
    };

    const pageContent = renderCurrentPage();
    console.log('🎨 Page content:', pageContent); // Debug log

    // Also add debugging to the main App component render:
    console.log('🔧 App component rendering...');
    //console.log('🔍 Current state - currentPage:', currentPage, 'loading:', loading);

    return (
        <div className="App">
            {/* Add this debug info temporarily */}
            <div style={{
                position: 'fixed', 
                top: 0, 
                right: 0, 
                background: 'red', 
                color: 'white', 
                padding: '10px',
                zIndex: 9999,
                fontSize: '12px'
            }}>
                Debug: currentPage = "{currentPage}"<br/>
                Loading = 
            </div>
            
            {/* Your existing header */}
            <header className="app-header">
                <div className="app-header-content">
                    <h1 className="app-title">AIDS Quilt Digital Archive</h1>
                    <nav className="app-nav">
                        <button 
                            className={`nav-btn ${currentPage === 'dashboard' ? 'active' : ''}`}
                            onClick={() => setCurrentPage('dashboard')}
                        >
                            Dashboard
                        </button>
                        <button 
                            className={`nav-btn ${currentPage === 'analyzer' ? 'active' : ''}`}
                            onClick={() => {
                                if (nextBlock) {
                                    handleAnalyzeBlock(nextBlock);
                                } else {
                                    alert('No block available for analysis');
                                }
                            }}
                        >
                            Analyzer
                        </button>
                        <button 
                            className={`nav-btn ${currentPage === 'nonstandard' ? 'active' : ''}`}
                            onClick={() => setCurrentPage('nonstandard')}
                        >
                            Non-Standard Blocks
                        </button>
                        <button 
                            className={`nav-btn ${currentPage === 'recroplist' ? 'active' : ''}`}
                            onClick={() => setCurrentPage('recroplist')} // Direct navigation, no password
                        >
                            Blocks Needing Recrop
                        </button>
                        <button 
                            className={`nav-btn ${currentPage === 'recrop' ? 'active' : ''}`}
                            onClick={handleRecropAccess} // Password required for actual tool
                        >
                            Block Recrop Tool
                        </button>
                    </nav>
                </div>
            </header>

            {/* Page content with top padding to account for fixed header */}
            <main className="app-main">
                {renderCurrentPage()}
            </main>
            
            <RecropAccessModal
                isOpen={showRecropModal}
                onClose={handleRecropModalClose}
                onSubmit={handleRecropPasswordSubmit}
            />
        </div>
    );
}

export default App;
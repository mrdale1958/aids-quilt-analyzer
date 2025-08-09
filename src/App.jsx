import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import QuiltAnalyzer from './components/QuiltAnalyzer';
import RecropPage from './components/RecropPage';
import Not8PanelPage from './components/Not8PanelPage';
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
        console.log('🎨 Rendering page:', currentPage);
        
        switch (currentPage) {
            case 'analyzer':
                if (!selectedBlock) {
                    console.log('❌ No block selected, returning to dashboard');
                    setCurrentPage('dashboard');
                    return null;
                }
                return (
                    <QuiltAnalyzer 
                        blockId={selectedBlock.blockID} 
                        blockData={selectedBlock}
                        onBack={() => setCurrentPage('dashboard')} 
                    />
                );
            
            case 'recrop':
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
            
            case 'not8panel':
                return (
                    <Not8PanelPage 
                        onBack={() => setCurrentPage('dashboard')}
                    />
                );
            
            case 'recroplist':
                return (
                    <RecropListPage 
                        onBack={() => setCurrentPage('dashboard')}
                    />
                );
            
            case 'dashboard':
            default:
                return (
                    <Dashboard 
                        onAnalyzeBlock={handleAnalyzeBlock}
                        onViewNot8Panel={() => setCurrentPage('not8panel')}
                        onViewRecropQueue={handleRecropAccess}
                        onDashboardUpdate={handleDashboardUpdate}
                    />
                );
        }
    };

    const pageContent = renderCurrentPage();
    console.log('🎨 Page content:', pageContent); // Debug log

    return (
        <div className="App">
            {/* Add navigation header */}
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
                            className={`nav-btn ${currentPage === 'not8panel' ? 'active' : ''}`}
                            onClick={() => setCurrentPage('not8panel')}
                        >
                            Not 8-Panel Blocks
                        </button>
                        <button 
                            className={`nav-btn ${currentPage === 'recroplist' ? 'active' : ''}`}
                            onClick={handleRecropAccess}
                        >
                            Blocks Needing Recrop
                        </button>
                        <button 
                            className={`nav-btn ${currentPage === 'recrop' ? 'active' : ''}`}
                            onClick={() => {
                                if (recropAccess) {
                                    setCurrentPage('recrop');
                                } else {
                                    handleRecropAccess();
                                }
                            }}
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
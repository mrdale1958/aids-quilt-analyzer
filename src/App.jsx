import React, { useState, useEffect, useCallback } from 'react';
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

    // Handle URL parameters for direct block access
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const blockParam = urlParams.get('block');
        
        if (blockParam && !selectedBlock) {
            const blockId = parseInt(blockParam);
            if (!isNaN(blockId) && blockId > 0) {
                // Load the specific block
                loadSpecificBlock(blockId);
            }
        }
    }, [selectedBlock]);

    const loadSpecificBlock = async (blockId) => {
        try {
            const response = await fetch(`/api/blocks/${blockId}`);
            if (response.ok) {
                const blockData = await response.json();
                console.log('🎯 Loading block from URL:', blockData);
                setSelectedBlock(blockData);
                setCurrentPage('analyzer');
                // Update URL without the parameter to clean it up
                window.history.replaceState({}, '', window.location.pathname);
            } else if (response.status === 404) {
                alert(`Block #${blockId} not found in the database`);
            } else {
                console.error('Error loading block from URL');
            }
        } catch (error) {
            console.error('Error loading specific block from URL:', error);
        }
    };

    const handleAnalyzeBlock = (blockData) => {
        console.log('🎯 Analyzing block:', blockData);
        setSelectedBlock(blockData);
        setCurrentPage('analyzer');
    };


    // Handler for recrop list (public)
    const handleRecropList = () => {
        setCurrentPage('recroplist');
    };

    // Handler for recrop tool (password protected)
    const handleRecropToolAccess = () => {
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

    // Memoize the onBack callback to prevent unnecessary re-renders
    const handleBackToDashboard = useCallback(() => {
        setCurrentPage('dashboard');
    }, []);

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
                // Only accessible via password, keep as is
                if (recropAccess) {
                    return (
                        <RecropPage 
                            onBack={handleBackToDashboard} 
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
                        onViewRecropQueue={handleRecropList}
                        onViewRecropTool={handleRecropToolAccess}
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
                            onClick={handleRecropList}
                        >
                            Blocks Needing Recrop
                        </button>
                        <button 
                            className={`nav-btn ${currentPage === 'recrop' ? 'active' : ''}`}
                            onClick={handleRecropToolAccess}
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
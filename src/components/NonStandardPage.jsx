import React, { useState, useEffect } from 'react';

const NonStandardPage = ({ onBack }) => {
    const [confirmedBlocks, setConfirmedBlocks] = useState([]);
    const [pendingBlocks, setPendingBlocks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('confirmed');
    const [verifying, setVerifying] = useState(new Set());

    useEffect(() => {
        loadNonStandardBlocks();
    }, []);

    const loadNonStandardBlocks = async () => {
        setLoading(true);
        setError(null);
        
        try {
            // Load confirmed blocks
            const confirmedResponse = await fetch('/api/blocks/nonstandard');
            if (!confirmedResponse.ok) {
                throw new Error(`HTTP ${confirmedResponse.status}: ${confirmedResponse.statusText}`);
            }
            const confirmedData = await confirmedResponse.json();
            setConfirmedBlocks(confirmedData);

            // Load pending blocks
            const pendingResponse = await fetch('/api/blocks/nonstandard/pending');
            if (!pendingResponse.ok) {
                throw new Error(`HTTP ${pendingResponse.status}: ${pendingResponse.statusText}`);
            }
            const pendingData = await pendingResponse.json();
            setPendingBlocks(pendingData);

            console.log('Confirmed non-standard blocks:', confirmedData);
            console.log('Pending non-standard blocks:', pendingData);
        } catch (error) {
            console.error('Error loading non-standard blocks:', error);
            setError('Failed to load non-standard blocks');
        } finally {
            setLoading(false);
        }
    };

    const loadConfirmedBlocks = async () => {
        try {
            console.log('📊 NonStandardPage: Loading confirmed blocks...');
            const response = await fetch('/api/blocks/nonstandard');
            console.log('📊 NonStandardPage confirmed response status:', response.status);
            
            if (response.ok) {
                const data = await response.json();
                console.log('📊 NonStandardPage confirmed raw data:', data);
                console.log('📊 NonStandardPage confirmed count:', Array.isArray(data) ? data.length : 0);
                setConfirmedBlocks(Array.isArray(data) ? data : []);
            } else {
                const errorText = await response.text();
                console.error('Failed to fetch confirmed non-standard blocks:', response.status, errorText);
                setConfirmedBlocks([]);
            }
        } catch (error) {
            console.error('Error loading confirmed blocks:', error);
            setConfirmedBlocks([]);
        }
    };

    const loadPendingBlocks = async () => {
        try {
            console.log('📊 NonStandardPage: Loading pending blocks...');
            const response = await fetch('/api/blocks/nonstandard/pending');
            console.log('📊 NonStandardPage pending response status:', response.status);
            
            if (response.ok) {
                const data = await response.json();
                console.log('📊 NonStandardPage pending raw data:', data);
                console.log('📊 NonStandardPage pending count:', Array.isArray(data) ? data.length : 0);
                setPendingBlocks(Array.isArray(data) ? data : []);
            } else {
                const errorText = await response.text();
                console.error('Failed to fetch pending non-standard blocks:', response.status, errorText);
                setPendingBlocks([]);
            }
        } catch (error) {
            console.error('Error loading pending blocks:', error);
            setPendingBlocks([]);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString();
    };

    const getStatusBadge = (block, isPending = false) => {
        if (isPending) {
            const voteCount = block.vote_count || 0;
            return (
                <span className="status-badge pending">
                    Pending ({voteCount} vote{voteCount !== 1 ? 's' : ''})
                </span>
            );
        } else {
            return (
                <span className="status-badge confirmed">
                    Confirmed
                </span>
            );
        }
    };

    const handleVerifyBlock = async (block, isNonStandard) => {
        const blockId = block.blockID;
        console.log('🔍 Verifying non-standard block:', blockId, 'isNonStandard:', isNonStandard);
        
        setVerifying(prev => new Set(prev).add(blockId));
        
        try {
            const response = await fetch(`/api/blocks/${blockId}/nonstandard`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    not8Panel: isNonStandard ? 1 : 0,
                    verifiedBy: 'manual_verification',
                    timestamp: new Date().toISOString()
                })
            });

            if (response.ok) {
                const result = await response.json();
                console.log('✅ Block verification updated:', result);
                
                // Show success message
                alert(isNonStandard ? 
                    `Block ${blockId} confirmed as non-standard` :
                    `Block ${blockId} marked as standard 8-panel`
                );
                
                // Reload both lists
                loadConfirmedBlocks();
                loadPendingBlocks();
            } else {
                throw new Error(`Failed to update block: ${response.status}`);
            }
        } catch (error) {
            console.error('❌ Error verifying block:', error);
            alert('Error updating block verification. Please try again.');
        } finally {
            setVerifying(prev => {
                const newSet = new Set(prev);
                newSet.delete(blockId);
                return newSet;
            });
        }
    };

    const renderBlockCard = (block, isPending = false) => (
        <div key={block.blockID} className="block-card">
            <div className="block-header">
                <h3>Block #{block.blockID}</h3>
                <div className="block-actions">
                    <button 
                        className="btn-verify-correct"
                        onClick={() => handleVerifyBlock(block, false)}
                        disabled={verifying.has(block.blockID)}
                        title="Mark as standard 8-panel"
                    >
                        {verifying.has(block.blockID) ? '⏳' : '✅'} Standard
                    </button>
                    <button 
                        className="btn-verify-confirm"
                        onClick={() => handleVerifyBlock(block, true)}
                        disabled={verifying.has(block.blockID)}
                        title="Confirm as non-standard"
                    >
                        {verifying.has(block.blockID) ? '⏳' : '🔧'} Non-Standard
                    </button>
                </div>
            </div>
            
            <div className="block-image">
                <img 
                    src={`/api/image/${block.blockID}`}
                    alt={`Block ${block.blockID}`}
                    onError={(e) => {
                        e.target.src = '/images/placeholder.png';
                    }}
                />
            </div>
            
            <div className="block-info">
                <div className="info-row">
                    <span className="label">Status:</span>
                    <span className={`value ${isPending ? 'pending' : 'confirmed'}`}>
                        {isPending ? 'Pending Review' : 'Confirmed Non-Standard'}
                    </span>
                </div>
                <div className="info-row">
                    <span className="label">Votes:</span>
                    <span className="value">{block.vote_count || 0}</span>
                </div>
                {block.updated_at && (
                    <div className="info-row">
                        <span className="label">Updated:</span>
                        <span className="value">{new Date(block.updated_at).toLocaleDateString()}</span>
                    </div>
                )}
            </div>
        </div>
    );

    if (loading) {
        return (
            <div className="nonstandard-loading">
                <h2>Loading non-standard blocks...</h2>
                <div className="spinner"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="nonstandard-error">
                <h2>Error Loading Non-Standard Blocks</h2>
                <p>{error}</p>
                <button onClick={onBack} className="btn-primary">
                    Back to Dashboard
                </button>
                <button onClick={loadNonStandardBlocks} className="btn-secondary">
                    Try Again
                </button>
            </div>
        );
    }

    const currentBlocks = activeTab === 'confirmed' ? confirmedBlocks : pendingBlocks;

    return (
        <div className="non-standard-page">
            <div className="page-header">
                <button onClick={onBack} className="btn-back">
                    ← Back to Dashboard
                </button>
                <h1>Non-Standard Blocks</h1>
                <p className="page-description">
                    Blocks that don't follow the standard 8-panel layout
                </p>
            </div>

            <div className="tabs">
                <button 
                    className={`tab ${activeTab === 'confirmed' ? 'active' : ''}`}
                    onClick={() => setActiveTab('confirmed')}
                >
                    Confirmed ({confirmedBlocks.length})
                </button>
                <button 
                    className={`tab ${activeTab === 'pending' ? 'active' : ''}`}
                    onClick={() => setActiveTab('pending')}
                >
                    Pending Review ({pendingBlocks.length})
                </button>
            </div>

            <div className="blocks-grid">
                {activeTab === 'confirmed' ? (
                    confirmedBlocks.length > 0 ? (
                        confirmedBlocks.map(block => renderBlockCard(block, false))
                    ) : (
                        <div className="empty-state">
                            <h2>No confirmed non-standard blocks</h2>
                            <p>No blocks have been confirmed as non-standard yet.</p>
                        </div>
                    )
                ) : (
                    pendingBlocks.length > 0 ? (
                        pendingBlocks.map(block => renderBlockCard(block, true))
                    ) : (
                        <div className="empty-state">
                            <h2>No pending non-standard blocks</h2>
                            <p>No blocks are currently pending review for non-standard layout.</p>
                        </div>
                    )
                )}
            </div>
        </div>
    );
};

export default NonStandardPage;
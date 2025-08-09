import React, { useState, useEffect } from 'react';

const RecropListPage = ({ onBack }) => {
    const [blocks, setBlocks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [verifying, setVerifying] = useState(new Set()); // Track which blocks are being verified

    useEffect(() => {
        loadBlocks();
    }, []);

    const loadBlocks = async () => {
        setLoading(true);
        setError(null);
        
        try {
            console.log('Fetching recrop blocks...');
            const response = await fetch('/api/blocks/recrop');
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('Recrop blocks data:', data);
            setBlocks(data);
        } catch (error) {
            console.error('Error loading recrop blocks:', error);
            setError('Failed to load blocks needing re-crop');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyBlock = async (block, shouldNeedRecrop) => {
        const blockId = block.blockID;
        console.log('🔍 Verifying block:', blockId, 'shouldNeedRecrop:', shouldNeedRecrop);
        
        setVerifying(prev => new Set(prev).add(blockId));
        
        try {
            const response = await fetch(`/api/blocks/${blockId}/recrop`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    needsRecrop: shouldNeedRecrop ? 1 : 0,
                    verifiedBy: 'manual_verification',
                    timestamp: new Date().toISOString()
                })
            });

            if (response.ok) {
                const result = await response.json();
                console.log('✅ Block verification updated:', result);
                
                // Show success message
                alert(shouldNeedRecrop ? 
                    `Block ${blockId} confirmed as needing re-cropping` :
                    `Block ${blockId} marked as properly cropped`
                );
                
                // Reload the blocks list
                loadBlocks();
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

    if (loading) {
        return (
            <div className="recroplist-loading">
                <h2>Loading blocks needing re-crop...</h2>
                <div className="spinner"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="recroplist-error">
                <h2>Error Loading Re-crop Queue</h2>
                <p>{error}</p>
                <button onClick={onBack} className="btn-primary">
                    Back to Dashboard
                </button>
                <button onClick={loadBlocks} className="btn-secondary">
                    Try Again
                </button>
            </div>
        );
    }

    return (
        <div className="recrop-list-page">
            <div className="page-header">
                <button onClick={onBack} className="btn-back">
                    ← Back to Dashboard
                </button>
                <h1>Re-crop Queue</h1>
                <p className="page-description">
                    Blocks that have been flagged as needing re-cropping
                </p>
            </div>

            <div className="blocks-grid">
                {blocks.map(block => (
                    <div key={block.blockID} className="block-card">
                        <div className="block-header">
                            <h3>Block #{block.blockID}</h3>
                            <div className="block-actions">
                                <button 
                                    className="btn-verify-correct"
                                    onClick={() => handleVerifyBlock(block, false)}
                                    disabled={verifying.has(block.blockID)}
                                    title="Mark as properly cropped (remove from queue)"
                                >
                                    {verifying.has(block.blockID) ? '⏳' : '✅'} Properly Cropped
                                </button>
                                <button 
                                    className="btn-verify-confirm"
                                    onClick={() => handleVerifyBlock(block, true)}
                                    disabled={verifying.has(block.blockID)}
                                    title="Confirm it needs re-cropping"
                                >
                                    {verifying.has(block.blockID) ? '⏳' : '🔧'} Needs Re-crop
                                </button>
                            </div>
                        </div>
                        
                        <div className="block-image">
                            <img 
                                src={`/api/image/${String(block.blockID).padStart(5, '0')}`}
                                alt={`Block ${block.blockID}`}
                                onError={(e) => {
                                    e.target.src = '/images/placeholder.png';
                                }}
                            />
                        </div>
                        
                        <div className="block-info">
                            <div className="info-row">
                                <span className="label">Status:</span>
                                <span className="value recrop-flag">Needs Re-cropping</span>
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
                ))}
            </div>

            {blocks.length === 0 && !loading && (
                <div className="empty-state">
                    <h2>No blocks need re-cropping</h2>
                    <p>All blocks have been properly cropped!</p>
                </div>
            )}
        </div>
    );
};

export default RecropListPage;
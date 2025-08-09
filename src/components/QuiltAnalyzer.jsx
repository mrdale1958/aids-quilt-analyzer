import React, { useState, useEffect, useRef } from 'react';

const QuiltAnalyzer = ({ blockId, blockData, onBack }) => {
    console.log('🎯 QuiltAnalyzer received:', { blockId, blockData });
    
    // Use blockData if available, otherwise fetch using blockId
    const [block, setBlock] = useState(blockData || null);
    const canvasRef = useRef(null);
    const [currentBlock, setCurrentBlock] = useState(null);
    const [selectedPoints, setSelectedPoints] = useState([]);
    const [needsRecrop, setNeedsRecrop] = useState(false);
    const [not8Panel, setNot8Panel] = useState(false);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [sessionCount, setSessionCount] = useState(0);
    const [pendingImageLoad, setPendingImageLoad] = useState(null); // Add this state

    // Overlay points positions (24 points matching original PHP layout)
    const overlayPoints = [
        { id: 1, top: '12.5%', left: '25%' },
        { id: 2, top: '12.5%', left: '50%' },
        { id: 3, top: '12.5%', left: '75%' },
        { id: 4, top: '25%', left: '12.5%' },
        { id: 5, top: '25%', left: '37.5%' },
        { id: 6, top: '25%', left: '62.5%' },
        { id: 7, top: '25%', left: '87.5%' },
        { id: 8, top: '37.5%', left: '25%' },
        { id: 9, top: '37.5%', left: '50%' },
        { id: 10, top: '37.5%', left: '75%' },
        { id: 11, top: '50%', left: '12.5%' },
        { id: 12, top: '50%', left: '37.5%' },
        { id: 13, top: '50%', left: '62.5%' },
        { id: 14, top: '50%', left: '87.5%' },
        { id: 15, top: '62.5%', left: '25%' },
        { id: 16, top: '62.5%', left: '50%' },
        { id: 17, top: '62.5%', left: '75%' },
        { id: 18, top: '75%', left: '12.5%' },
        { id: 19, top: '75%', left: '37.5%' },
        { id: 20, top: '75%', left: '62.5%' },
        { id: 21, top: '75%', left: '87.5%' },
        // Add the missing bottom row:
        { id: 22, top: '87.5%', left: '25%' },
        { id: 23, top: '87.5%', left: '50%' },
        { id: 24, top: '87.5%', left: '75%' }
    ];

    // Add effect to handle pending image loads when canvas becomes available
    useEffect(() => {
        if (canvasRef.current && pendingImageLoad) {
            console.log('🎯 Canvas is now available, loading pending image:', pendingImageLoad);
            loadImage(pendingImageLoad);
            setPendingImageLoad(null);
        }
    }, [canvasRef.current, pendingImageLoad]);

    useEffect(() => {
        if (blockId) {
            loadBlock(blockId);
        } else {
            loadNextIncompleteBlock();
        }
        
        // Get session count from localStorage
        const count = localStorage.getItem('sessionBlockCount') || 0;
        setSessionCount(parseInt(count));
    }, [blockId]);

    const loadBlock = async (id) => {
        setLoading(true);
        // Clear points when loading new block
        setSelectedPoints([]);
        setNeedsRecrop(false);
        setNot8Panel(false);
        
        try {
            // FIX: Change from '/api/block/' to '/api/blocks/'
            const response = await fetch(`/api/blocks/${id}`);
            if (response.ok) {
                const blockData = await response.json();
                setCurrentBlock(blockData);
                setNeedsRecrop(blockData.needsRecrop === 1);
                
                // Check if canvas is ready, if not, store the blockID for later
                if (canvasRef.current) {
                    loadImage(blockData.blockID);
                } else {
                    console.log('⏳ Canvas not ready, storing blockID for pending load:', blockData.blockID);
                    setPendingImageLoad(blockData.blockID);
                    setLoading(false); // Set loading false since we're waiting for canvas
                }
            } else {
                console.error('Block not found');
                loadNextIncompleteBlock();
            }
        } catch (error) {
            console.error('Error loading block:', error);
            setLoading(false);
        }
    };

    const loadNextIncompleteBlock = async () => {
        setLoading(true);
        // Clear points when loading new block
        setSelectedPoints([]);
        setNeedsRecrop(false);
        setNot8Panel(false);
        
        try {
            // FIX: Change from '/api/block/incomplete/next' to '/api/blocks/incomplete/next'
            const response = await fetch('/api/blocks/incomplete/next');
            if (response.ok) {
                const blockData = await response.json();
                if (blockData) {
                    setCurrentBlock(blockData);
                    setNeedsRecrop(blockData.needsRecrop === 1);
                    
                    // Check if canvas is ready, if not, store the blockID for later
                    if (canvasRef.current) {
                        loadImage(blockData.blockID);
                    } else {
                        console.log('⏳ Canvas not ready, storing blockID for pending load:', blockData.blockID);
                        setPendingImageLoad(blockData.blockID);
                        setLoading(false); // Set loading false since we're waiting for canvas
                    }
                } else {
                    alert('No more blocks to analyze!');
                    onBack();
                }
            }
        } catch (error) {
            console.error('Error loading next block:', error);
            setLoading(false);
        }
    };

    const loadImage = (blockId) => {
        console.log(`🖼️ loadImage called for block ${blockId}`);
        
        const canvas = canvasRef.current;
        if (!canvas) {
            console.error('❌ Canvas ref is still null, will retry when available');
            setPendingImageLoad(blockId);
            return;
        }

        const ctx = canvas.getContext('2d');
        
        // Clear canvas first
        ctx.clearRect(0, 0, 512, 512);
        
        // Create image element
        const img = new Image();
        
        img.onload = () => {
            console.log(`✅ Image loaded successfully for block ${blockId}`);
            ctx.drawImage(img, 0, 0, 512, 512);
            setLoading(false);
        };
        
        img.onerror = (error) => {
            console.error(`❌ Failed to load image for block ${blockId}:`, error);
            
            // Draw a placeholder directly on canvas
            ctx.fillStyle = '#f0f0f0';
            ctx.fillRect(0, 0, 512, 512);
            
            // Add border
            ctx.strokeStyle = '#ddd';
            ctx.lineWidth = 2;
            ctx.strokeRect(1, 1, 510, 510);
            
            // Add text
            ctx.fillStyle = '#999';
            ctx.font = 'bold 24px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`Block ${blockId}`, 256, 240);
            
            ctx.font = '16px Arial';
            ctx.fillStyle = '#666';
            ctx.fillText('Image not available', 256, 270);
            
            ctx.font = '14px Arial';
            ctx.fillStyle = '#aaa';
            ctx.fillText('This block may need to be processed', 256, 300);
            
            setLoading(false);
        };
        
        // Set the image source
        const imageUrl = `/api/image/${blockId}`;
        console.log(`🚀 Setting image src to: ${imageUrl}`);
        img.src = imageUrl;
    };

    const handlePointClick = (pointId) => {
        setSelectedPoints(prev => {
            if (prev.includes(pointId)) {
                // Remove point if already selected
                return prev.filter(id => id !== pointId);
            } else if (prev.length < 8) {
                // Add point if less than 8 selected
                return [...prev, pointId];
            } else {
                // Replace last point if 8 already selected
                return [...prev.slice(0, 7), pointId];
            }
        });
    };

    const submitVote = async () => {
        // Add the validation logic from handleSubmit
        if (not8Panel) {
            console.log('Not 8-Panel block - submitting without point validation');
        } else if (selectedPoints.length !== 8) {
            alert('Please select exactly 8 panel centers before submitting.');
            return;
        }
        
        if (selectedPoints.length === 0 && !needsRecrop && !not8Panel) {
            alert('Please select at least one corner point or mark as needs recrop/not 8-panel.');
            return;
        }

        setSubmitting(true);
        
        try {
            const voteData = {
                blockID: currentBlock.blockID,
                orientation_data: JSON.stringify(selectedPoints),
                needsRecrop: needsRecrop,
                not8Panel: not8Panel,
                ip_address: 'web_client',
                user_session: `session_${Date.now()}`
            };

            console.log('🗳️ Frontend sending vote data:');
            console.log('  - blockID:', voteData.blockID, '(type:', typeof voteData.blockID, ')');
            console.log('  - needsRecrop:', voteData.needsRecrop, '(type:', typeof voteData.needsRecrop, ')');
            console.log('  - not8Panel:', voteData.not8Panel, '(type:', typeof voteData.not8Panel, ')');
            
            console.log('🗳️ Full JSON being sent:', JSON.stringify(voteData, null, 2));

            const response = await fetch('/api/orientation/submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(voteData)
            });

            console.log('📡 Response status:', response.status);

            if (response.ok) {
                const result = await response.json();
                console.log('✅ Vote submitted successfully:', result);
                
                setSessionCount(prev => prev + 1);
                
                // Update session count in localStorage
                const currentCount = parseInt(localStorage.getItem('sessionBlockCount') || 0);
                localStorage.setItem('sessionBlockCount', (currentCount + 1).toString());
                
                // Load next block
                loadNextIncompleteBlock();
            } else {
                const errorText = await response.text();
                console.error('❌ Response error:', errorText);
                throw new Error(`Failed to submit vote: ${response.status} ${errorText}`);
            }
        } catch (error) {
            console.error('❌ Error submitting vote:', error);
            alert('Error submitting vote. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    // Update the loading condition to handle pending loads
    if (loading && !pendingImageLoad) {
        return (
            <div className="analyzer-loading">
                <h2>Loading quilt block...</h2>
                <div className="spinner"></div>
            </div>
        );
    }

    if (!currentBlock) {
        return (
            <div className="analyzer-error">
                <h2>No block available</h2>
                <button onClick={onBack} className="btn-primary">
                    Back to Dashboard
                </button>
            </div>
        );
    }

    return (
        <div className="quilt-analyzer">
            <div className="analyzer-header">
                <button onClick={onBack} className="btn-back">
                    ← Back to Dashboard
                </button>
                <div className="block-info">
                    <h2>Block #{currentBlock.blockID}</h2>
                    <p>Session blocks analyzed: {sessionCount}</p>
                    {pendingImageLoad && (
                        <p className="loading-status">Loading image...</p>
                    )}
                </div>
            </div>

            <div className="analyzer-content">
                <div className="image-container">
                    <canvas 
                        ref={canvasRef}
                        width="512" 
                        height="512"
                        className="quilt-canvas"
                    />
                    
                    {/* Only show overlay points for standard 8-panel blocks */}
                    {!not8Panel && (
                        <div className="overlay-points">
                            {overlayPoints.map(point => (
                                <button
                                    key={point.id}
                                    className={`overlay-point ${selectedPoints.includes(point.id) ? 'selected' : ''}`}
                                    style={{
                                        position: 'absolute',
                                        top: point.top,
                                        left: point.left,
                                        transform: 'translate(-50%, -50%)'
                                    }}
                                    onClick={() => handlePointClick(point.id)}
                                >
                                    {point.id}
                                </button>
                            ))}
                        </div>
                    )}
                    
                    {/* Show message for Not 8-Panel blocks */}
                    {not8Panel && (
                        <div className="not8panel-overlay">
                            <div className="not8panel-message">
                                <h3>Not 8-Panel Block</h3>
                                <p>Point selection disabled for Not 8-Panel layouts</p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="controls">
                    <div className="control-section">
                        <h3>Block Analysis</h3>
                        
                        {!not8Panel && (
                            <div className="selection-info">
                                <p>Selected points: <strong>{selectedPoints.length}/8</strong></p>
                                <p className="instruction">Click on the 8 points closest to each panel center</p>
                            </div>
                        )}
                        
                        <div className="checkboxes">
                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={needsRecrop}
                                    onChange={(e) => setNeedsRecrop(e.target.checked)}
                                />
                                This block needs re-cropping
                            </label>
                            
                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={not8Panel}
                                    onChange={(e) => {
                                        setNot8Panel(e.target.checked);
                                        // Clear selected points when switching to Not 8-Panel
                                        if (e.target.checked) {
                                            setSelectedPoints([]);
                                        }
                                    }}
                                />
                                This is not a standard 8-panel block
                            </label>
                        </div>
                    </div>

                    <div className="submit-section">
                        <button
                            className="btn-primary"
                            onClick={submitVote}
                            disabled={submitting || (!not8Panel && selectedPoints.length !== 8)}
                        >
                            {submitting ? 'Submitting...' : 'Submit Analysis'}
                        </button>
                        
                        <button
                            className="btn-secondary"
                            onClick={loadNextIncompleteBlock}
                            disabled={submitting}
                        >
                            Skip Block
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default QuiltAnalyzer;
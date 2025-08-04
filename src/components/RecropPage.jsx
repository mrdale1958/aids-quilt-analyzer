import React, { useState, useRef, useEffect } from 'react';

const RecropPage = ({ onBack }) => {
    const canvasRef = useRef(null);
    const [currentBlock, setCurrentBlock] = useState(null);
    const [cropCorners, setCropCorners] = useState([]);
    const [isDragging, setIsDragging] = useState(false);
    const [dragIndex, setDragIndex] = useState(-1);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [previewMode, setPreviewMode] = useState(false);
    const [sessionCount, setSessionCount] = useState(0);

    useEffect(() => {
        loadNextRecropBlock();
        
        // Get session count from localStorage
        const count = localStorage.getItem('sessionRecropCount') || 0;
        setSessionCount(parseInt(count));
    }, []);

    const loadNextRecropBlock = async () => {
        setLoading(true);
        setCropCorners([]);
        setPreviewMode(false);
        
        try {
            const response = await fetch('/api/block/recrop/next');
            if (response.ok) {
                const blockData = await response.json();
                if (blockData) {
                    setCurrentBlock(blockData);
                    loadImage(blockData.blockID);
                } else {
                    alert('No more blocks need re-cropping!');
                    onBack();
                }
            } else {
                throw new Error('Failed to load next recrop block');
            }
        } catch (error) {
            console.error('Error loading recrop block:', error);
            setLoading(false);
        }
    };

    const loadImage = (blockId) => {
        console.log(`🖼️ Loading image for recrop block ${blockId}`);
        
        const canvas = canvasRef.current;
        if (!canvas) {
            console.error('❌ Canvas ref is null');
            return;
        }

        const ctx = canvas.getContext('2d');
        
        // Clear canvas first
        ctx.clearRect(0, 0, 512, 512);
        
        // Create image element
        const img = new Image();
        
        img.onload = () => {
            console.log(`✅ Image loaded for recrop block ${blockId}`);
            ctx.drawImage(img, 0, 0, 512, 512);
            
            // Initialize default crop corners (full image)
            setCropCorners([
                { x: 50, y: 50 },   // Top-left
                { x: 462, y: 50 },  // Top-right  
                { x: 462, y: 462 }, // Bottom-right
                { x: 50, y: 462 }   // Bottom-left
            ]);
            
            setLoading(false);
        };
        
        img.onerror = (error) => {
            console.error(`❌ Failed to load image for block ${blockId}:`, error);
            
            // Draw placeholder
            ctx.fillStyle = '#f0f0f0';
            ctx.fillRect(0, 0, 512, 512);
            ctx.strokeStyle = '#ddd';
            ctx.lineWidth = 2;
            ctx.strokeRect(1, 1, 510, 510);
            
            ctx.fillStyle = '#999';
            ctx.font = 'bold 24px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`Block ${blockId}`, 256, 240);
            ctx.font = '16px Arial';
            ctx.fillStyle = '#666';
            ctx.fillText('Image not available', 256, 270);
            
            setLoading(false);
        };
        
        const imageUrl = `/api/image/${blockId}`;
        console.log(`🚀 Setting image src to: ${imageUrl}`);
        img.src = imageUrl;
    };

    const drawCropOverlay = () => {
        const canvas = canvasRef.current;
        if (!canvas || cropCorners.length !== 4) return;

        const ctx = canvas.getContext('2d');
        
        // Draw crop boundary
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cropCorners[0].x, cropCorners[0].y);
        for (let i = 1; i < 4; i++) {
            ctx.lineTo(cropCorners[i].x, cropCorners[i].y);
        }
        ctx.closePath();
        ctx.stroke();

        // Draw corner handles
        cropCorners.forEach((corner, index) => {
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(corner.x - 5, corner.y - 5, 10, 10);
            
            // Add corner labels
            ctx.fillStyle = '#000';
            ctx.font = '12px Arial';
            ctx.fillText(index + 1, corner.x + 8, corner.y - 8);
        });

        // Draw semi-transparent overlay outside crop area
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(0, 0, 512, 512);
        
        // Clear the crop area
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.moveTo(cropCorners[0].x, cropCorners[0].y);
        for (let i = 1; i < 4; i++) {
            ctx.lineTo(cropCorners[i].x, cropCorners[i].y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
    };

    const handleCanvasMouseDown = (e) => {
        if (cropCorners.length !== 4) return;

        const rect = canvasRef.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Check if clicking near any corner
        for (let i = 0; i < cropCorners.length; i++) {
            const corner = cropCorners[i];
            const distance = Math.sqrt(
                Math.pow(mouseX - corner.x, 2) + Math.pow(mouseY - corner.y, 2)
            );
            
            if (distance <= 10) {
                setIsDragging(true);
                setDragIndex(i);
                return;
            }
        }
    };

    const handleCanvasMouseMove = (e) => {
        if (!isDragging || dragIndex === -1) return;

        const rect = canvasRef.current.getBoundingClientRect();
        const mouseX = Math.max(0, Math.min(512, e.clientX - rect.left));
        const mouseY = Math.max(0, Math.min(512, e.clientY - rect.top));

        const newCorners = [...cropCorners];
        newCorners[dragIndex] = { x: mouseX, y: mouseY };
        setCropCorners(newCorners);
    };

    const handleCanvasMouseUp = () => {
        setIsDragging(false);
        setDragIndex(-1);
    };

    const handlePreviewCrop = async () => {
        if (cropCorners.length !== 4) {
            alert('Please set all 4 crop corners');
            return;
        }

        setProcessing(true);
        try {
            const response = await fetch('/api/recrop/preview', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    blockID: currentBlock.blockID,
                    corners: cropCorners
                }),
            });

            if (response.ok) {
                const result = await response.json();
                setPreviewMode(true);
                
                // Load preview image
                const img = new Image();
                img.onload = () => {
                    const canvas = canvasRef.current;
                    const ctx = canvas.getContext('2d');
                    ctx.clearRect(0, 0, 512, 512);
                    ctx.drawImage(img, 0, 0, 512, 512);
                };
                img.src = result.previewUrl + '?t=' + Date.now(); // Cache bust
            } else {
                throw new Error('Failed to generate preview');
            }
        } catch (error) {
            console.error('Error generating preview:', error);
            alert('Error generating preview. Please try again.');
        } finally {
            setProcessing(false);
        }
    };

    const handleAcceptCrop = async () => {
        if (!previewMode) {
            alert('Please preview the crop first');
            return;
        }

        setProcessing(true);
        try {
            const response = await fetch('/api/recrop/accept', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    blockID: currentBlock.blockID,
                    corners: cropCorners
                }),
            });

            if (response.ok) {
                const result = await response.json();
                
                // Update session count
                const currentCount = parseInt(localStorage.getItem('sessionRecropCount') || 0);
                localStorage.setItem('sessionRecropCount', (currentCount + 1).toString());
                setSessionCount(currentCount + 1);
                
                alert(`✅ Block ${currentBlock.blockID} recropped successfully!`);
                
                // Load next block
                loadNextRecropBlock();
            } else {
                throw new Error('Failed to accept crop');
            }
        } catch (error) {
            console.error('Error accepting crop:', error);
            alert('Error accepting crop. Please try again.');
        } finally {
            setProcessing(false);
        }
    };

    const resetCrop = () => {
        setPreviewMode(false);
        if (currentBlock) {
            loadImage(currentBlock.blockID);
        }
    };

    // Redraw overlay when corners change
    useEffect(() => {
        if (!previewMode && cropCorners.length === 4) {
            // Small delay to ensure image is drawn first
            setTimeout(drawCropOverlay, 10);
        }
    }, [cropCorners, previewMode]);

    if (loading) {
        return (
            <div className="recrop-loading">
                <h2>Loading block for re-cropping...</h2>
                <div className="spinner"></div>
            </div>
        );
    }

    if (!currentBlock) {
        return (
            <div className="recrop-error">
                <h2>No blocks available for re-cropping</h2>
                <button onClick={onBack} className="btn-primary">
                    Back to Dashboard
                </button>
            </div>
        );
    }

    return (
        <div className="recrop-page">
            <div className="recrop-header">
                <button onClick={onBack} className="btn-back">
                    ← Back to Dashboard
                </button>
                <div className="block-info">
                    <h2>Re-crop Block #{currentBlock.blockID}</h2>
                    <p>Session blocks re-cropped: {sessionCount}</p>
                </div>
            </div>

            <div className="recrop-content">
                <div className="image-container">
                    <canvas 
                        ref={canvasRef}
                        width="512" 
                        height="512"
                        className="recrop-canvas"
                        onMouseDown={handleCanvasMouseDown}
                        onMouseMove={handleCanvasMouseMove}
                        onMouseUp={handleCanvasMouseUp}
                        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
                    />
                </div>

                <div className="recrop-controls">
                    <div className="control-section">
                        <h3>Crop Instructions</h3>
                        <ol>
                            <li>Drag the red corner handles to define the crop area</li>
                            <li>The crop should tightly frame the quilt block</li>
                            <li>Preview the crop to see the result</li>
                            <li>Accept to apply the crop to the high-resolution image</li>
                        </ol>
                        
                        {previewMode && (
                            <div className="preview-info">
                                <p><strong>Preview Mode:</strong> This shows how the cropped image will look.</p>
                            </div>
                        )}
                    </div>

                    <div className="action-buttons">
                        {!previewMode ? (
                            <>
                                <button
                                    className="btn-secondary"
                                    onClick={handlePreviewCrop}
                                    disabled={processing || cropCorners.length !== 4}
                                >
                                    {processing ? 'Generating Preview...' : 'Preview Crop'}
                                </button>
                                
                                <button
                                    className="btn-secondary"
                                    onClick={loadNextRecropBlock}
                                    disabled={processing}
                                >
                                    Skip Block
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    className="btn-primary"
                                    onClick={handleAcceptCrop}
                                    disabled={processing}
                                >
                                    {processing ? 'Processing...' : 'Accept Crop'}
                                </button>
                                
                                <button
                                    className="btn-secondary"
                                    onClick={resetCrop}
                                    disabled={processing}
                                >
                                    Reset
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RecropPage;
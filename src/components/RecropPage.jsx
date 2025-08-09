
import React, { useState, useEffect, useCallback, memo } from 'react';
import CropCanvas from './CropCanvas';
import CropControls from './CropControls';

const RecropPage = memo(({ onBack }) => {
    const [currentBlock, setCurrentBlock] = useState(null);
    const [skipCount, setSkipCount] = useState(0);
    const [lastTriedBlock, setLastTriedBlock] = useState(null); // for debug
    const SKIP_LIMIT = 5;
    const [cropCorners, setCropCorners] = useState([]);
    const [loading, setLoading] = useState(true);
    const [imageLoading, setImageLoading] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [previewMode, setPreviewMode] = useState(false);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [sessionCount, setSessionCount] = useState(0);

    const loadNextRecropBlock = useCallback(async () => {
        setLoading(true);
        setCropCorners([]);
        setPreviewMode(false);
        setPreviewUrl(null);
        try {
            const response = await fetch('/api/block/recrop/next');
            if (response.ok) {
                const blockData = await response.json();
                if (blockData) {
                    console.log('✅ RecropPage: Received block from backend:', blockData);
                    setCurrentBlock(blockData);
                    setLastTriedBlock(blockData);
                    setLoading(false); // Stop loading once we have the block data
                } else {
                    alert('No more blocks need re-cropping!');
                    setCurrentBlock(null);
                    setLoading(false);
                    onBack();
                }
            } else {
                // Try to get error details from backend
                let errorMsg = 'Failed to load next recrop block';
                try {
                    const text = await response.text();
                    try {
                        const errData = JSON.parse(text);
                        if (errData && errData.error && errData.block) {
                            errorMsg = `No image found for block ${errData.block.blockID}. Block data: ` + JSON.stringify(errData.block, null, 2);
                        } else if (errData && errData.error) {
                            errorMsg = errData.error;
                        } else {
                            errorMsg = text;
                        }
                    } catch {
                        errorMsg = text;
                    }
                } catch (e) {
                    errorMsg = 'Failed to load next recrop block (network or server error)';
                }
                alert(errorMsg);
                setLoading(false);
            }
        } catch (error) {
            console.error('Error loading recrop block:', error);
            setLoading(false);
        }
    }, [onBack]);

    // Load the next recrop block on mount
    useEffect(() => {
        loadNextRecropBlock();
        // Get session count from localStorage
        const count = localStorage.getItem('sessionRecropCount') || 0;
        setSessionCount(parseInt(count));
    }, [loadNextRecropBlock]);

    const padBlockId = (id) => String(id).padStart(5, '0');

    const getImageUrl = (blockId) => {
        if (!blockId) return null;
        const paddedId = padBlockId(blockId);
        return `/api/image/${paddedId}`;
    };

    const handleImageLoaded = () => {
        console.log('✅ RecropPage: Image loaded successfully');
        setImageLoading(false);
        setSkipCount(0); // reset skip count on success
    };

    const handleImageLoadStart = () => {
        console.log('🔄 RecropPage: Image loading started');
        setImageLoading(true);
    };

    const handleImageError = (error) => {
        console.error('❌ RecropPage: Image load failed:', error);
        setImageLoading(false);
        setSkipCount(prev => prev + 1);
        
        if (skipCount + 1 >= SKIP_LIMIT) {
            alert(`No valid images found after ${SKIP_LIMIT} attempts. Stopping.`);
            setCurrentBlock(null);
        } else {
            const paddedId = currentBlock ? padBlockId(currentBlock.blockID) : '';
            alert(`Image failed to load. URL: /api/image/${paddedId}. Check network tab for details.`);
        }
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
                setPreviewUrl(result.previewUrl + '?t=' + Date.now());
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
        setPreviewUrl(null);
    };

    if (loading) {
        // Always show zero-padded image URL in debug
        const paddedId = lastTriedBlock && lastTriedBlock.blockID ? padBlockId(lastTriedBlock.blockID) : '';
        return (
            <div className="recrop-loading">
                <h2>Loading block for re-cropping...</h2>
                <div className="spinner"></div>
                {lastTriedBlock && (
                    <div style={{marginTop: 12, color: '#888', fontSize: 14}}>
                        <div>Block ID: {lastTriedBlock.blockID}</div>
                        <div>Image URL: /api/image/{paddedId}</div>
                        <div>Skip attempt: {skipCount}/{SKIP_LIMIT}</div>
                        <div style={{marginTop: 8}}>
                            <pre style={{fontSize: 12, color: '#666', background: '#f8f8f8', padding: 4, borderRadius: 4, maxWidth: 400, overflowX: 'auto'}}>
                                {JSON.stringify(lastTriedBlock.currentBlock, null, 2)}
                            </pre>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    if (!currentBlock) {
        return (
            <div className="recrop-error">
                <h2>No blocks available for re-cropping</h2>
                {lastTriedBlock && (
                    <div style={{marginTop: 12, color: '#888', fontSize: 14}}>
                        <div>Last tried Block ID: {lastTriedBlock.blockID}</div>
                        <div>Image URL: {lastTriedBlock.imageUrl}</div>
                        <div>Skip attempts: {skipCount}/{SKIP_LIMIT}</div>
                        <div style={{marginTop: 8}}>
                            <pre style={{fontSize: 12, color: '#666', background: '#f8f8f8', padding: 4, borderRadius: 4, maxWidth: 400, overflowX: 'auto'}}>
                                {JSON.stringify(lastTriedBlock.currentBlock, null, 2)}
                            </pre>
                        </div>
                    </div>
                )}
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
                <CropCanvas
                    imageUrl={previewMode && previewUrl ? 
                        previewUrl : 
                        getImageUrl(currentBlock?.blockID)
                    }
                    cropCorners={cropCorners}
                    onCropChange={setCropCorners}
                    previewMode={previewMode}
                    onImageLoadStart={handleImageLoadStart}
                    onImageLoaded={handleImageLoaded}
                    onImageError={handleImageError}
                />

                <CropControls
                    previewMode={previewMode}
                    processing={processing}
                    cropCorners={cropCorners}
                    onPreview={handlePreviewCrop}
                    onAccept={handleAcceptCrop}
                    onReset={resetCrop}
                    onSkip={loadNextRecropBlock}
                />
            </div>
        </div>
    );
});

RecropPage.displayName = 'RecropPage';

export default RecropPage;
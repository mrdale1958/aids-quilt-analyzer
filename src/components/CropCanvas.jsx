import React, { useRef, useEffect, useState, memo } from 'react';

const CropCanvas = memo(({ 
    imageUrl, 
    cropCorners, 
    onCropChange, 
    previewMode,
    onImageLoadStart,
    onImageLoaded,
    onImageError 
}) => {
    const canvasRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dragIndex, setDragIndex] = useState(-1);
    const [hoveredCorner, setHoveredCorner] = useState(-1);
    const imageRef = useRef(null); // Store reference to loaded image

    // Load image when imageUrl changes
    useEffect(() => {
        if (imageUrl) {
            loadImage(imageUrl);
        }
    }, [imageUrl]);

    // Redraw overlay when corners change (but not in preview mode)
    useEffect(() => {
        if (!previewMode && cropCorners.length === 4) {
            // Small delay to ensure image is drawn first
            setTimeout(drawCropOverlay, 10);
        }
    }, [cropCorners, previewMode]);

    // Global mouse event handlers for dragging outside canvas
    useEffect(() => {
        const handleGlobalMouseMove = (e) => {
            if (!isDragging || dragIndex === -1 || previewMode) return;

            const canvas = canvasRef.current;
            if (!canvas) return;

            const rect = canvas.getBoundingClientRect();
            const mouseX = Math.max(0, Math.min(512, e.clientX - rect.left));
            const mouseY = Math.max(0, Math.min(512, e.clientY - rect.top));

            const newCorners = [...cropCorners];
            newCorners[dragIndex] = { x: mouseX, y: mouseY };
            onCropChange?.(newCorners);
        };

        const handleGlobalMouseUp = () => {
            if (isDragging) {
                setIsDragging(false);
                setDragIndex(-1);
            }
        };

        if (isDragging) {
            document.addEventListener('mousemove', handleGlobalMouseMove);
            document.addEventListener('mouseup', handleGlobalMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleGlobalMouseMove);
            document.removeEventListener('mouseup', handleGlobalMouseUp);
        };
    }, [isDragging, dragIndex, previewMode, cropCorners, onCropChange]);

    const loadImage = (url) => {
        console.log(`🖼️ CropCanvas: Loading image from ${url}`);
        onImageLoadStart?.(); // Notify parent that image loading started
        
        const canvas = canvasRef.current;
        if (!canvas) {
            console.error('❌ CropCanvas: Canvas ref is null');
            onImageError?.(new Error('Canvas not available'));
            return;
        }

        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, 512, 512);

        const img = new window.Image();

        let didFinish = false;
        const finish = (type, error = null) => {
            if (didFinish) return;
            didFinish = true;
            clearTimeout(timeoutId);
            
            if (type === 'success') {
                console.log('✅ CropCanvas: Image loaded successfully');
                try {
                    ctx.drawImage(img, 0, 0, 512, 512);
                    imageRef.current = img; // Store image reference for redrawing
                    console.log('✅ CropCanvas: Image drawn to canvas');
                    onImageLoaded?.();
                    // Set default crop corners if none exist
                    if (cropCorners.length === 0) {
                        onCropChange?.([
                            { x: 50, y: 50 },
                            { x: 462, y: 50 },
                            { x: 462, y: 462 },
                            { x: 50, y: 462 }
                        ]);
                    }
                } catch (e) {
                    console.error('❌ CropCanvas: Failed to draw image:', e);
                    onImageError?.(e);
                }
            } else {
                console.error('❌ CropCanvas: Image failed to load:', error);
                // Draw placeholder
                ctx.fillStyle = '#f0f0f0';
                ctx.fillRect(0, 0, 512, 512);
                ctx.strokeStyle = '#ddd';
                ctx.lineWidth = 2;
                ctx.strokeRect(1, 1, 510, 510);
                ctx.fillStyle = '#999';
                ctx.font = 'bold 24px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('Image not available', 256, 256);
                onImageError?.(error || new Error('Image failed to load'));
            }
        };

        img.onload = () => finish('success');
        img.onerror = () => finish('error', new Error('Image load error'));

        const timeoutId = setTimeout(() => finish('timeout', new Error('Image load timeout')), 5000);

        img.src = url;
    };

    const drawCropOverlay = () => {
        const canvas = canvasRef.current;
        if (!canvas || cropCorners.length !== 4) return;

        const ctx = canvas.getContext('2d');
        
        // Clear canvas and redraw the image first
        ctx.clearRect(0, 0, 512, 512);
        if (imageRef.current) {
            ctx.drawImage(imageRef.current, 0, 0, 512, 512);
        }
        
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
        if (cropCorners.length !== 4 || previewMode) return;

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
        const rect = canvasRef.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        if (isDragging && dragIndex !== -1 && !previewMode) {
            // Handle dragging
            const boundedX = Math.max(0, Math.min(512, mouseX));
            const boundedY = Math.max(0, Math.min(512, mouseY));

            const newCorners = [...cropCorners];
            newCorners[dragIndex] = { x: boundedX, y: boundedY };
            onCropChange?.(newCorners);
        } else if (!previewMode && cropCorners.length === 4) {
            // Handle hover detection for cursor feedback
            let foundHover = -1;
            for (let i = 0; i < cropCorners.length; i++) {
                const corner = cropCorners[i];
                const distance = Math.sqrt(
                    Math.pow(mouseX - corner.x, 2) + Math.pow(mouseY - corner.y, 2)
                );
                if (distance <= 15) { // Slightly larger hover area than click area
                    foundHover = i;
                    break;
                }
            }
            setHoveredCorner(foundHover);
        }
    };

    const handleCanvasMouseUp = () => {
        // This will be handled by global event handler
        // Keep this for potential future use
    };

    const handleCanvasMouseLeave = () => {
        if (!isDragging) {
            setHoveredCorner(-1);
        }
    };

    const getCursor = () => {
        if (previewMode) return 'default';
        if (isDragging) return 'grabbing';
        if (hoveredCorner !== -1) return 'grab';
        return 'crosshair';
    };

    return (
        <div className="image-container">
            <canvas
                ref={canvasRef}
                width="512"
                height="512"
                className="recrop-canvas"
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={handleCanvasMouseLeave}
                style={{ 
                    cursor: getCursor()
                }}
            />
        </div>
    );
});

CropCanvas.displayName = 'CropCanvas';

export default CropCanvas;

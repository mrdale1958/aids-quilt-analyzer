import React, { memo } from 'react';

const CropControls = memo(({ 
    previewMode,
    processing,
    cropCorners,
    onPreview,
    onAccept,
    onReset,
    onSkip
}) => {
    return (
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
                            onClick={onPreview}
                            disabled={processing || cropCorners.length !== 4}
                        >
                            {processing ? 'Generating Preview...' : 'Preview Crop'}
                        </button>
                        
                        <button
                            className="btn-secondary"
                            onClick={onSkip}
                            disabled={processing}
                        >
                            Skip Block
                        </button>
                    </>
                ) : (
                    <>
                        <button
                            className="btn-primary"
                            onClick={onAccept}
                            disabled={processing}
                        >
                            {processing ? 'Processing...' : 'Accept Crop'}
                        </button>
                        
                        <button
                            className="btn-secondary"
                            onClick={onReset}
                            disabled={processing}
                        >
                            Reset
                        </button>
                    </>
                )}
            </div>
        </div>
    );
});

CropControls.displayName = 'CropControls';

export default CropControls;

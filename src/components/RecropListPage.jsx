import React, { useState, useEffect } from 'react';

const RecropListPage = ({ onBack }) => {
    const [blocks, setBlocks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadRecropBlocks();
    }, []);

    const loadRecropBlocks = async () => {
        try {
            setLoading(true);
            console.log('🔄 Loading blocks that need recrop...');
            
            const response = await fetch('/api/blocks/recrop');
            if (response.ok) {
                const data = await response.json();
                console.log('📊 Recrop blocks data:', data);
                setBlocks(Array.isArray(data) ? data : []);
            } else {
                console.error('Failed to fetch recrop blocks:', response.status);
                setError('Failed to load blocks needing recrop');
            }
        } catch (error) {
            console.error('Error loading recrop blocks:', error);
            setError('Error loading recrop blocks');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyRecrop = async (blockId, needsRecrop) => {
        try {
            console.log(`🔧 ${needsRecrop ? 'Confirming' : 'Rejecting'} recrop for block:`, blockId);
            
            const requestBody = {
                needsRecrop: needsRecrop ? 1 : 0,
                verifiedBy: 'User', // You can get actual user info if available
                timestamp: new Date().toISOString()
            };
            
            console.log('📤 Request body:', requestBody);
            console.log('📤 Request URL:', `/api/blocks/${blockId}/recrop`);
            
            const response = await fetch(`/api/blocks/${blockId}/recrop`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });
            
            console.log('📥 Response status:', response.status);
            console.log('📥 Response ok:', response.ok);
            
            if (response.ok) {
                const result = await response.json();
                console.log('✅ Recrop verification successful:', result);
                
                // Show success message
                alert(`Block ${blockId} ${needsRecrop ? 'confirmed for recrop' : 'marked as good'}`);
                
                // Reload the list to reflect changes
                await loadRecropBlocks();
            } else {
                const errorText = await response.text();
                console.error('❌ Failed to verify recrop:', response.status, errorText);
                alert(`Failed to update recrop status: ${response.status} - ${errorText}`);
            }
        } catch (error) {
            console.error('❌ Error verifying recrop:', error);
            alert('Error updating recrop status. Please try again.');
        }
    };

    if (loading) {
        return (
            <div style={{ padding: '20px' }}>
                <h1>Blocks Needing Recrop</h1>
                <button onClick={onBack} style={{ marginBottom: '20px' }}>
                    ← Back to Dashboard
                </button>
                <div>Loading blocks that need recrop...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ padding: '20px' }}>
                <h1>Blocks Needing Recrop</h1>
                <button onClick={onBack} style={{ marginBottom: '20px' }}>
                    ← Back to Dashboard
                </button>
                <div style={{ color: 'red' }}>Error: {error}</div>
            </div>
        );
    }

    return (
        <div style={{ padding: '20px' }}>
            <h1>Blocks Needing Recrop</h1>
            <button onClick={onBack} style={{ marginBottom: '20px' }}>
                ← Back to Dashboard
            </button>
            
            {blocks.length === 0 ? (
                <p>No blocks currently need recropping.</p>
            ) : (
                <div>
                    <p>Found {blocks.length} blocks that need recropping:</p>
                    
                    <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
                        gap: '20px',
                        marginTop: '20px'
                    }}>
                        {blocks.map(block => (
                            <div key={block.blockID} style={{
                                border: '1px solid #ddd',
                                borderRadius: '8px',
                                padding: '15px',
                                backgroundColor: '#f9f9f9'
                            }}>
                                <h3>Block #{block.blockID}</h3>
                                
                                {/* Block Image */}
                                <div style={{ marginBottom: '15px' }}>
                                    <img 
                                        src={`/api/image/${block.blockID}`}
                                        alt={`Block ${block.blockID}`}
                                        style={{
                                            width: '100%',
                                            maxWidth: '200px',
                                            height: 'auto',
                                            border: '1px solid #ccc',
                                            borderRadius: '4px'
                                        }}
                                        onError={(e) => {
                                            e.target.style.display = 'none';
                                            e.target.nextSibling.style.display = 'block';
                                        }}
                                    />
                                    <div style={{ display: 'none', color: '#666', fontStyle: 'italic' }}>
                                        Image not available
                                    </div>
                                </div>

                                {/* Block Info */}
                                <div style={{ marginBottom: '15px', fontSize: '14px' }}>
                                    {block.updated_at && (
                                        <div>Updated: {new Date(block.updated_at).toLocaleDateString()}</div>
                                    )}
                                    {block.verified_by && (
                                        <div>Flagged by: {block.verified_by}</div>
                                    )}
                                </div>

                                {/* Verification Buttons */}
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button
                                        onClick={() => handleVerifyRecrop(block.blockID, true)}
                                        style={{
                                            flex: 1,
                                            padding: '8px 12px',
                                            backgroundColor: '#dc3545',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '4px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        ✓ Confirm Needs Recrop
                                    </button>
                                    <button
                                        onClick={() => handleVerifyRecrop(block.blockID, false)}
                                        style={{
                                            flex: 1,
                                            padding: '8px 12px',
                                            backgroundColor: '#28a745',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '4px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        ✗ Looks Good
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default RecropListPage;
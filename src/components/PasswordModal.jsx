import React, { useState } from 'react';

const PasswordModal = ({ isOpen, onClose, onSuccess }) => {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        
        const correctPassword = "quiltcrop2024";
        
        if (password === correctPassword) {
            onSuccess();
            onClose();
            setPassword('');
            setError('');
        } else {
            setError('Incorrect password. Please contact the administrator for access.');
            setPassword('');
        }
    };

    const handleClose = () => {
        onClose();
        setPassword('');
        setError('');
    };

    if (!isOpen) return null;

    return (
        <div className="password-modal-overlay" onClick={handleClose}>
            <div className="password-modal" onClick={e => e.stopPropagation()}>
                <div className="password-modal-header">
                    <h3>🎨 Re-crop Tool Access</h3>
                    <button className="close-button" onClick={handleClose}>×</button>
                </div>
                
                <div className="password-modal-content">
                    <p className="access-description">
                        Welcome to the advanced re-crop tool! This feature is designed for 
                        trained users who understand image cropping and the AIDS Memorial 
                        Quilt digitization process.
                    </p>
                    
                    <form onSubmit={handleSubmit}>
                        <div className="password-input-group">
                            <label htmlFor="password">Access Password:</label>
                            <input
                                type="password"
                                id="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter password..."
                                autoFocus
                            />
                        </div>
                        
                        {error && (
                            <div className="error-message">
                                ❌ {error}
                            </div>
                        )}
                        
                        <div className="modal-actions">
                            <button type="button" onClick={handleClose} className="btn-secondary">
                                Cancel
                            </button>
                            <button type="submit" className="btn-primary">
                                Access Tool
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default PasswordModal;
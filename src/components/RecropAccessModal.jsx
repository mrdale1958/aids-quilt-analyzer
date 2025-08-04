import React, { useState } from 'react';

const RecropAccessModal = ({ isOpen, onClose, onSubmit }) => {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!password.trim()) {
            setError('Please enter a password');
            return;
        }
        onSubmit(password);
        setPassword('');
        setError('');
    };

    const handleClose = () => {
        setPassword('');
        setError('');
        onClose();
    };

    return (
        <div className="modal-overlay" onClick={handleClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Recrop Tool Access</h3>
                    <button className="modal-close" onClick={handleClose}>×</button>
                </div>
                
                <div className="modal-body">
                    <p>This tool is restricted to authorized users only.</p>
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label htmlFor="recrop-password">Password:</label>
                            <input
                                id="recrop-password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter recrop tool password"
                                autoFocus
                            />
                        </div>
                        {error && <div className="error-message">{error}</div>}
                        
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

export default RecropAccessModal;
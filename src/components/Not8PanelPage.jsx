
import React, { useEffect, useState } from 'react';
import styles from './Not8PanelPage.module.css';

const Not8PanelPage = ({ onBack }) => {
    const [confirmed, setConfirmed] = useState([]);
    const [pending, setPending] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [verifying, setVerifying] = useState(new Set());
    const [popupImg, setPopupImg] = useState(null);

    const fetchBlocks = async () => {
        setLoading(true);
        setError(null);
        try {
            const [confirmedRes, pendingRes] = await Promise.all([
                fetch('/api/blocks/not8panel'),
                fetch('/api/blocks/not8panel/pending')
            ]);
            if (!confirmedRes.ok || !pendingRes.ok) throw new Error('Failed to fetch blocks');
            setConfirmed(await confirmedRes.json());
            setPending(await pendingRes.json());
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBlocks();
    }, []);

    const handleConfirm = async (block) => {
        setVerifying(prev => new Set(prev).add(block.blockID));
        try {
            const response = await fetch('/api/orientation/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    blockID: block.blockID,
                    orientation_data: null,
                    needsRecrop: 0,
                    not8Panel: 1,
                    ip_address: 'web_client',
                    user_session: `manual_confirm_${Date.now()}`
                })
            });
            if (!response.ok) {
                let msg = 'Failed to submit not8Panel vote';
                try {
                    const errJson = await response.json();
                    if (errJson && errJson.error) msg += `: ${errJson.error}`;
                } catch {}
                alert(msg);
                return;
            }
            await fetchBlocks();
        } catch (err) {
            alert('Error submitting not8Panel vote: ' + err.message);
        } finally {
            setVerifying(prev => { const s = new Set(prev); s.delete(block.blockID); return s; });
        }
    };

    return (
        <div className={styles.not8panelPage}>
            <h2>Not 8-Panel Blocks</h2>
            <button className={styles.backBtn} onClick={onBack}>← Back</button>
            {loading ? (
                <div>Loading...</div>
            ) : error ? (
                <div className={styles.error}>Error: {error}</div>
            ) : (
                <>

                    <section>
                        <h3>Pending Not 8-Panel Blocks</h3>
                        {pending.length === 0 ? <div>None</div> : (
                            <div className={styles.tableWrapper}>
                                <table className={styles.blockTable}>
                                    <thead>
                                        <tr>
                                            <th>Block #</th>
                                            <th>Image</th>
                                            <th>Votes</th>
                                            <th>Last Updated</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pending.map(block => (
                                            <tr key={block.blockID} className={styles.blockRow}>
                                                <td>{block.blockID}</td>
                                                <td>
                                                    <img
                                                        src={`https://www.aidsquilttouch.org/pyramids/quilt512/${String(block.blockID).padStart(5, '0')}.png`}
                                                        alt={`Block ${block.blockID}`}
                                                        className={styles.blockImg}
                                                        onError={e => { e.target.onerror = null; e.target.src = '/images/placeholder.png'; }}
                                                        width={64}
                                                        height={64}
                                                        style={{ cursor: 'zoom-in' }}
                                                        onClick={() => setPopupImg(`https://www.aidsquilttouch.org/pyramids/quilt512/${String(block.blockID).padStart(5, '0')}.png`)}
                                                    />
                                                </td>
                                                <td>{block.vote_count || 0}</td>
                                                <td>{block.updated_at ? new Date(block.updated_at).toLocaleDateString() : 'N/A'}</td>
                                                <td>
                                                    <button
                                                        className={styles.confirmBtn}
                                                        disabled={verifying.has(block.blockID)}
                                                        onClick={() => handleConfirm(block)}
                                                    >
                                                        {verifying.has(block.blockID) ? 'Confirming...' : 'Confirm as Not 8-Panel'}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>
                    <section>
                        <h3>Confirmed Not 8-Panel Blocks</h3>
                        {confirmed.length === 0 ? <div>None</div> : (
                            <div className={styles.tableWrapper}>
                                <table className={styles.blockTable}>
                                    <thead>
                                        <tr>
                                            <th>Block #</th>
                                            <th>Votes</th>
                                            <th>Last Updated</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {confirmed.map(block => (
                                            <tr key={block.blockID} className={styles.blockRow}>
                                                <td>{block.blockID}</td>
                                                <td>{block.vote_count || 0}</td>
                                                <td>{block.updated_at ? new Date(block.updated_at).toLocaleDateString() : 'N/A'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>                </>
            )}
            {popupImg && (
                <div className={styles.popupOverlay} onClick={() => setPopupImg(null)}>
                    <div className={styles.popupContent} onClick={e => e.stopPropagation()}>
                        <img src={popupImg} alt="Block preview" className={styles.popupImg} />
                        <button className={styles.closeBtn} onClick={() => setPopupImg(null)}>Close</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Not8PanelPage;

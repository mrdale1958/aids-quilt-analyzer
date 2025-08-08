import React from 'react';
import styles from './StatsPanel.module.css';

const StatsPanel = ({ 
    stats, 
    votingStats, 
    nonStandardStats, 
    recropStats, 
    onViewNonStandard, 
    onViewRecropQueue 
}) => {
    // Add debug logging
    console.log('📊 StatsPanel received data:');
    console.log('  - stats:', stats);
    console.log('  - votingStats:', votingStats);
    console.log('  - nonStandardStats:', nonStandardStats);
    console.log('  - recropStats:', recropStats);

    return (
        <div className={styles.statsPanel}>
            <h3>Analysis Progress</h3>
            <div className={styles.statsGrid}>
                {/* Voting Progress Card */}
                <div className={styles.statCard}>
                    <h4>Voting Progress</h4>
                    <div className={styles.statRow}>
                        <span className={styles.statLabel}>Total Analyses:</span>
                        <span className={styles.statValue}>{votingStats.totalVotes || 0}</span>
                    </div>
                    <div className={styles.statRow}>
                        <span className={styles.statLabel}>Blocks with 1 Vote:</span>
                        <span className={styles.statValue}>{votingStats.blocksWithOneVote || 0}</span>
                    </div>
                    <div className={styles.statRow}>
                        <span className={styles.statLabel}>Blocks Queued For Consensus:</span>
                        <span className={styles.statValue}>{votingStats.blocksNeedingVotes || 0}</span>
                    </div>
                    <div className={`${styles.statRow} ${styles.highlight}`}>
                        <span className={styles.statLabel}>Consensus Reached:</span>
                        <span className={styles.statValue}>
                            {(votingStats.standardCompleted || 0) + (votingStats.nonStandardCompleted || 0)}
                        </span>
                    </div>
                </div>

                {/* Block Types Card */}
                <div className={styles.statCard}>
                    <h3>Block Types</h3>
                    <div className={styles.statRow}>
                        <div className={styles.statLabel}>Standard 8-Panel</div>
                        <div className={styles.statNumber}>{stats.standard8Panel || 0}</div>
                    </div>
                    <div className={styles.statRow}>
                            <div className={styles.statLabel}>Standard Completed</div>
                            <div className={styles.statNumber}>{stats.standardCompleted || 0}</div>
                    </div>
                    <div className={styles.statRow}>
                        <div className={styles.statLabel}>Non-Standard Confirmed</div>
                        <div className={styles.statNumber}>{stats.nonStandardConfirmed || 0}</div>
                    </div>
                    <div className={styles.statRow}>
                            <div className={styles.statLabel}>Non-Standard Pending</div>
                            <div className={styles.statNumber}>{stats.nonStandardPending || 0}</div>
                    </div>
                    <div className={styles.statRow}>
                             <div className={styles.statLabel}>Non-Standard Completed</div>
                           <div className={styles.statNumber}>{stats.nonStandardCompleted || 0}</div>
                    </div>
                    </div>

                {/* Re-crop Card - FIXED */}
                <div className={styles.statCard}>
                    <h4>Re-crop Status</h4>
                    <div className={styles.statRow}>
                        <span className={styles.statLabel}>Blocks Needing Re-crop:</span>
                        <span className={styles.statValue}>{recropStats.needsRecrop || 0}</span>
                    </div>
                    <div className={styles.statRow}>
                        <span className={styles.statLabel}>Blocks Re-cropped:</span>
                        <span className={styles.statValue}>{recropStats.completed || 0}</span>
                    </div>
                    <div className={styles.progressIndicator}>
                        <div className={styles.progressBar}>
                            <div 
                                className={styles.progressFill}
                                style={{
                                    width: `${(recropStats.needsRecrop || 0) > 0 ? 
                                        ((recropStats.completed || 0) / (recropStats.needsRecrop || 1)) * 100 : 0}%`
                                }}
                            />
                        </div>
                        <span className={styles.progressText}>
                            {(recropStats.needsRecrop || 0) > 0 ? 
                                `${Math.round(((recropStats.completed || 0) / (recropStats.needsRecrop || 1)) * 100)}%` : 
                                '0%'} complete
                        </span>
                    </div>
                    {(recropStats.needsRecrop || 0) > 0 && (
                        <button 
                            className={styles.btnLink}
                            onClick={onViewRecropQueue}
                        >
                            View Re-crop Queue →
                        </button>
                    )}
                </div>
                {/* Non-standard Card - FIXED */}
                <div className={styles.statCard}>
                    <h4>Non-standard Status</h4>
                    <div className={styles.statRow}>
                        <span className={styles.statLabel}>Non-8 panel blocks noted:</span>
                        <span className={styles.statValue}>{nonStandardStats.pending || 0}</span>
                    </div>
                    <div className={styles.statRow}>
                        <span className={styles.statLabel}>Non-Standard Completed:</span>
                        <span className={styles.statValue}>{nonStandardStats.confirmed || 0}</span>
                    </div>
                    
                    {(nonStandardStats.pending || 0) > 0 && (
                        <button 
                            className={styles.btnLink}
                            onClick={onViewNonStandard}
                        >
                            View Non-Standard Queue →
                        </button>
                    )}
                </div>

                {/* Overall Progress Card */}
                <div className={styles.statCard}>
                    <h4>Overall Progress</h4>
                    <div className={styles.statRow}>
                        <span className={styles.statLabel}>Total Blocks:</span>
                        <span className={styles.statValue}>{stats.total || 6066}</span>
                    </div>
                    <div className={`${styles.statRow} ${styles.highlight}`}>
                        <span className={styles.statLabel}>Analysis Complete:</span>
                        <span className={styles.statValue}>{stats.completed || 0}</span>
                    </div>
                    <div className={styles.statRow}>
                        <span className={styles.statLabel}>Remaining:</span>
                        <span className={styles.statValue}>{stats.remaining || 6066}</span>
                    </div>
                    <div className={styles.progressIndicator}>
                        <div className={styles.progressBar}>
                            <div 
                                className={styles.progressFill}
                                style={{
                                    width: `${stats.total > 0 ? (stats.completed / stats.total) * 100 : 0}%`
                                }}
                            />
                        </div>
                        <span className={styles.progressText}>
                            {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}% complete
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StatsPanel;
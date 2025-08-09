import React from 'react';
import styles from './StatsPanel.module.css';

const StatsPanel = ({ 
    stats, 
    votingStats, 
    not8PanelStats, 
    recropStats, 
    onViewNot8Panel, 
    onViewRecropQueue, 
    onViewRecropTool
}) => {
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
                            {votingStats.consensusReached || 0}
                        </span>
                    </div>
                </div>

                {/* Block Types Card */}
                <div className={styles.statCard}>
                    <h4>Block Types</h4>
                    <div className={styles.statRow}>
                        <span className={styles.statLabel}>Standard 8-Panel:</span>
                        <span className={styles.statValue}>{votingStats.standardBlocks || 0}</span>
                    </div>
                    <div className={styles.statRow}>
                        <span className={styles.statLabel}>Standard Completed:</span>
                        <span className={styles.statValue}>{votingStats.standardCompleted || 0}</span>
                    </div>
                    <div className={`${styles.statRow} ${styles.highlight}`}>
                        <span className={styles.statLabel}>Not 8-Panel Confirmed:</span>
                        <span className={styles.statValue}>{not8PanelStats.confirmed || 0}</span>
                    </div>
                    <div className={styles.statRow}>
                        <span className={styles.statLabel}>Not 8-Panel Pending:</span>
                        <span className={styles.statValue}>{not8PanelStats.pending || 0}</span>
                    </div>
                    {(not8PanelStats.confirmed || 0) + (not8PanelStats.pending || 0) > 0 && (
                        <button 
                            className={styles.btnLink}
                            onClick={onViewNot8Panel}
                        >
                            View Not 8-Panel Blocks →
                        </button>
                    )}
                </div>

                {/* Re-crop Card */}
                <div className={styles.statCard}>
                    <h4>Re-crop Status</h4>
                    <div className={styles.statRow}>
                        <span className={styles.statLabel}>Blocks Needing Re-crop:</span>
                        <span className={styles.statValue}>{recropStats.totalNeedingRecrop || 0}</span>
                    </div>
                    <div className={styles.statRow}>
                        <span className={styles.statLabel}>Blocks Re-cropped:</span>
                        <span className={styles.statValue}>{recropStats.totalRecropped || 0}</span>
                    </div>
                    <div className={styles.progressIndicator}>
                        <div className={styles.progressBar}>
                            <div 
                                className={styles.progressFill}
                                style={{
                                    width: `${recropStats.totalNeedingRecrop > 0 ? 
                                        (recropStats.totalRecropped / recropStats.totalNeedingRecrop) * 100 : 0}%`
                                }}
                            />
                        </div>
                        <span className={styles.progressText}>
                            {recropStats.totalNeedingRecrop > 0 ? 
                                `${Math.round((recropStats.totalRecropped / recropStats.totalNeedingRecrop) * 100)}%` : 
                                '0%'} complete
                        </span>
                    </div>
                    {(recropStats.totalNeedingRecrop || 0) > 0 && (
                        <>
                            <button 
                                className={styles.btnLink}
                                onClick={onViewRecropQueue}
                            >
                                View Re-crop Queue →
                            </button>
                            <button 
                                className={styles.btnLink}
                                style={{ marginLeft: 8 }}
                                onClick={onViewRecropTool}
                            >
                                Open Recrop Tool
                            </button>
                        </>
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
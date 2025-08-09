import React, { useState, useEffect } from 'react';
import StatsPanel from './StatsPanel';
import styles from './Dashboard.module.css';

const Dashboard = ({ onAnalyzeBlock, onViewNot8Panel, onViewRecropQueue, onDashboardUpdate }) => {
    console.log('📊 Dashboard component rendering...');
    console.log('🎨 Styles object:', styles);
    
    const [stats, setStats] = useState({});
    const [votingStats, setVotingStats] = useState({});
    const [not8PanelStats, setNot8PanelStats] = useState({ confirmed: 0, pending: 0 });
    const [recropStats, setRecropStats] = useState({ needsRecrop: 0 });
    const [nextBlock, setNextBlock] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Add debug logging for state changes
    console.log('🔍 Current loading state:', isLoading);
    console.log('🔍 Current error state:', error);
    console.log('🔍 Current nextBlock:', nextBlock?.blockID || 'none');

    // SINGLE useEffect and loading logic
    useEffect(() => {
        console.log('📊 Dashboard useEffect starting...');
        
        // Add a timeout to prevent infinite loading
        const loadingTimeout = setTimeout(() => {
            console.log('⏰ Loading timeout - forcing show');
            setIsLoading(false);
        }, 5000); // 5 second timeout
        
        const loadAllData = async () => {
            try {
                setIsLoading(true);
                setError(null);
                console.log('🔄 Starting data load sequence...');
                
                // Load all data in parallel
                await Promise.all([
                    fetchNextBlock(),
                    fetchStats(),
                    fetchVotingStats(),
                    fetchNot8PanelStats(),
                    fetchRecropStats()
                ]);
                
                console.log('🎉 All data loaded successfully');
                clearTimeout(loadingTimeout); // Clear timeout on success
            } catch (error) {
                console.error('❌ Error loading dashboard data:', error);
                setError('Failed to load dashboard data. Please try again.');
                clearTimeout(loadingTimeout); // Clear timeout on error
            } finally {
                setIsLoading(false);
            }
        };
        
        loadAllData();
        
        // Cleanup timeout on unmount
        return () => clearTimeout(loadingTimeout);
    }, []);

    const fetchNextBlock = async () => {
        try {
            console.log('🔄 Fetching next block...');
            const response = await fetch('/api/blocks/incomplete/next');
            if (response.ok) {
                const data = await response.json();
                console.log('📊 Next block data:', data);
                setNextBlock(data);
                
                // Notify App about the dashboard update
                if (onDashboardUpdate) {
                    onDashboardUpdate({ nextBlock: data });
                }
            } else {
                console.error('❌ Failed to fetch next block:', response.status);
                setNextBlock(null);
            }
        } catch (error) {
            console.error('❌ Error fetching next block:', error);
            setNextBlock(null);
        }
    };

    const fetchStats = async () => {
        try {
            console.log('🔄 Fetching general stats...');
            const response = await fetch('/api/stats');
            if (response.ok) {
                const data = await response.json();
                console.log('📊 General stats:', data);
                setStats(data);
            } else {
                console.error('❌ Failed to fetch stats:', response.status);
                setStats({});
            }
        } catch (error) {
            console.error('❌ Error fetching stats:', error);
            setStats({});
        }
    };

    const fetchVotingStats = async () => {
        try {
            console.log('🔄 Fetching voting stats...');
            const response = await fetch('/api/stats/voting');
            if (response.ok) {
                const data = await response.json();
                console.log('📊 Voting stats:', data);
                setVotingStats(data);
            } else {
                console.error('❌ Failed to fetch voting stats:', response.status);
                setVotingStats({
                    totalVotes: 0,
                    blocksWithOneVote: 0,
                    consensusReached: 0,
                    totalUniqueBlocks: 0
                });
            }
        } catch (error) {
            console.error('❌ Error fetching voting stats:', error);
            setVotingStats({
                totalVotes: 0,
                blocksWithOneVote: 0,
                consensusReached: 0,
                totalUniqueBlocks: 0
            });
        }
    };

    const fetchNot8PanelStats = async () => {
        try {
            console.log('🔄 Fetching not8panel stats...');
            const [confirmedRes, pendingRes] = await Promise.all([
                fetch('/api/blocks/not8panel'),
                fetch('/api/blocks/not8panel/pending')
            ]);

            if (confirmedRes.ok && pendingRes.ok) {
                const confirmedData = await confirmedRes.json();
                const pendingData = await pendingRes.json();
                
                console.log('📊 Not8Panel stats - confirmed:', confirmedData.length, 'pending:', pendingData.length);
                
                setNot8PanelStats({
                    confirmed: Array.isArray(confirmedData) ? confirmedData.length : 0,
                    pending: Array.isArray(pendingData) ? pendingData.length : 0
                });
            } else {
                console.error('❌ Failed to fetch not8panel stats');
                setNot8PanelStats({ confirmed: 0, pending: 0 });
            }
        } catch (error) {
            console.error('❌ Error fetching not8panel stats:', error);
            setNot8PanelStats({ confirmed: 0, pending: 0 });
        }
    };

    const fetchRecropStats = async () => {
        try {
            console.log('🔄 Fetching recrop stats...');
            const response = await fetch('/api/blocks/recrop');
            if (response.ok) {
                const data = await response.json();
                console.log('📊 Recrop stats:', data.length, 'blocks');
                setRecropStats({
                    needsRecrop: Array.isArray(data) ? data.length : 0
                });
            } else {
                console.error('❌ Failed to fetch recrop stats:', response.status);
                setRecropStats({ needsRecrop: 0 });
            }
        } catch (error) {
            console.error('❌ Error fetching recrop stats:', error);
            setRecropStats({ needsRecrop: 0 });
        }
    };

    const handleStartAnalyzing = () => {
        if (nextBlock) {
            console.log('🎯 Starting analysis for block:', nextBlock.blockID);
            onAnalyzeBlock(nextBlock);
        } else {
            console.log('❌ No nextBlock available');
            alert('No block available for analysis. Please refresh the dashboard.');
        }
    };

    const handleRefresh = async () => {
        console.log('🔄 Manual refresh triggered');
        setIsLoading(true);
        setError(null);
        
        try {
            await Promise.all([
                fetchNextBlock(),
                fetchStats(),
                fetchVotingStats(),
                fetchNot8PanelStats(),
                fetchRecropStats()
            ]);
        } catch (error) {
            console.error('❌ Error during refresh:', error);
            setError('Failed to refresh dashboard data');
        } finally {
            setIsLoading(false);
        }
    };

    // Update the loading check with more detailed logging
    if (isLoading) {
        console.log('🔄 Showing loading state...');
        return (
            <div className={styles.dashboard}>
                <div style={{padding: '40px', textAlign: 'center'}}>
                    <h2>Loading Dashboard...</h2>
                    <div style={{marginTop: '10px', fontSize: '24px'}}>🔄</div>
                    <div style={{marginTop: '10px', fontSize: '12px', color: '#666'}}>
                        Debug: isLoading = {isLoading.toString()}
                    </div>
                </div>
            </div>
        );
    }

    // Add debug to error state
    if (error) {
        console.log('❌ Showing error state:', error);
        return (
            <div className={styles.dashboard}>
                <div style={{padding: '40px', textAlign: 'center'}}>
                    <h2>⚠️ Error Loading Dashboard</h2>
                    <p>{error}</p>
                    <button onClick={handleRefresh} className="btn-primary">
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    // Main dashboard render
    console.log('🎨 Rendering main dashboard content...');
    return (
        <div className={styles.dashboard}>
        
            <div className={styles.dashboardHeader} style={{
    background: '#007bff', 
    color: 'white', 
    padding: '30px', 
    margin: '20px 0',
    border: '3px solid red'
}}>
    <h2 style={{color: 'white', fontSize: '28px'}}>AIDS Quilt Analysis Dashboard</h2>
    <p style={{color: 'white'}}>Help analyze quilt blocks using our quality control voting system</p>
    <p className={styles.votingInfo} style={{color: 'yellow'}}>
        Each block needs 2 matching analyses to reach consensus
    </p>
    <button onClick={handleRefresh} className={`btn-secondary ${styles.refreshBtn}`}>
        Refresh Data
    </button>
</div>

            <div className={styles.actionSection}>
                <div className={styles.nextBlockCard}>
                    <h3>Next Block to Analyze: {nextBlock.blockID}</h3>
                    {nextBlock ? (
                        <div>
                            <div className={styles.blockVotingStatus}>
                                <p>Current votes: <strong>{nextBlock.vote_count || 0}</strong></p>
                                <p className={styles.votesNeeded}>
                                    {(!nextBlock.vote_count || nextBlock.vote_count === 0) && "First analysis needed"}
                                    {nextBlock.vote_count === 1 && "Second analysis needed for potential consensus"}
                                    {nextBlock.vote_count >= 2 && "Additional analysis needed (no consensus yet)"}
                                </p>
                            </div>
                            <button 
                                className={`btn-primary ${styles.analyzeBtn}`}
                                onClick={handleStartAnalyzing}
                            >
                                {(!nextBlock.vote_count || nextBlock.vote_count === 0) ? 'Start First Analysis of Block #' + nextBlock.blockID : 
                                 nextBlock.vote_count === 1 ? 'Provide Second Analysis of Block #' + nextBlock.blockID :
                                 'Provide Additional Analysis of Block #' + nextBlock.blockID}
                            </button>
                        </div>
                    ) : (
                        <div>
                            <p>🎉 All blocks have reached consensus!</p>
                            <p>Thank you for your contribution to preserving the AIDS Memorial Quilt.</p>
                        </div>
                    )}
                </div>

                <div className={styles.instructionsCard}>
                    <div className={styles.votingProgress}>
                        <h3>Current Progress</h3>
                        <div className={styles.votingBreakdown}>
                            <div className={styles.voteStat}>
                                <span className={styles.voteNumber}>{votingStats.totalVotes || 0}</span>
                                <span className={styles.voteLabel}>Total Analyses</span>
                            </div>
                            <div className={styles.voteStat}>
                                <span className={styles.voteNumber}>{votingStats.totalUniqueBlocksVoted || 0}</span>
                                <span className={styles.voteLabel}>Unique Blocks Voted</span>
                            </div>
                            <div className={styles.voteStat}>
                                <span className={styles.voteNumber}>{votingStats.blocksWithOneVote || 0}</span>
                                <span className={styles.voteLabel}>Blocks Need 2nd Vote</span>
                            </div>
                            <div className={styles.voteStat}>
                                <span className={styles.voteNumber}>{(votingStats.blocksWithTwoVotes || 0) + (votingStats.blocksWithThreeOrMore || 0)}</span>
                                <span className={styles.voteLabel}>Multi-Vote Blocks</span>
                            </div>
                            <div className={styles.voteStat}>
                                <span className={styles.voteNumber}>{votingStats.consensusReached || 0}</span>
                                <span className={styles.voteLabel}>Consensus Reached</span>
                            </div>
                        </div>
                    </div>
                    
                    <h3>How the Voting System Works</h3>
                    <ol>
                        <li><strong>Quality Control:</strong> Each block needs 2 matching analyses</li>
                        <li><strong>Random Selection:</strong> Blocks are presented in random order</li>
                        <li><strong>Consensus:</strong> When 2 analyses match exactly, the block is complete</li>
                        <li><strong>Efficiency:</strong> Most blocks are completed with just 2-3 analyses</li>
                        <li><strong>Your Impact:</strong> Your analysis helps validate or challenge existing data</li>
                    </ol>
                </div>
            </div>

           

            <StatsPanel 
                stats={stats}
                votingStats={votingStats}
                not8PanelStats={not8PanelStats}
                recropStats={recropStats}
                onViewNot8Panel={onViewNot8Panel}
                onViewRecropQueue={onViewRecropQueue}
            />
                
        </div>
    );
};

export default Dashboard;
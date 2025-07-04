import * as linera from "@linera/client";

// Configuration
const DANNY_GAME_APP_ID = '874908d0f33738169e805d70bdd8b3bad43485333772b9d19c9c1838b078990f';
const LEADERBOARD_CHAIN_ID = 'dfc88cbb06b5a844be804c5b9220c26ce7a2963cc06d47492bdf28c073892ac6';

// Global state
let wallet = null;
let client = null;
let chainId = null;
let gameContract = null;
let playerName = "";
let isInitialized = false;
let isGameConfigured = false;
let leaderboard = [];
let playerStats = {
    best: 0,
    currentKills: 0,
    rank: null
};

// Initialize Linera integration
async function initializeLinera() {
    try {
        updateStatus('🔄 Завантаження Linera SDK...');
        
        // Initialize WebAssembly
        await linera.default();
        
        // Create wallet and client
        updateStatus('🔄 Створення кошелька...');
        const faucet = await new linera.Faucet(
            'https://faucet.testnet-babbage.linera.net'
        );
        
        wallet = await faucet.createWallet();
        client = await new linera.Client(wallet);
        
        // Get chain with tokens
        updateStatus('🔄 Отримання тестових токенів...');
        chainId = await faucet.claimChain(client);
        
        // Initialize game contract
        updateStatus('🔄 Ініціалізація контракту...');
        gameContract = await client.frontend().application(DANNY_GAME_APP_ID);
        
        // Set up player
        playerName = promptPlayerName();
        
        // Configure the game
        await setupGame();
        
        // Fetch initial leaderboard
        await fetchLeaderboard();
        
        isInitialized = true;
        updateStatus('✅ Готово до гри!');
        updateChainInfo();
        
        console.log('Linera initialized successfully:', {
            chainId,
            playerName,
            isGameConfigured
        });
        
    } catch (error) {
        console.error('Failed to initialize Linera:', error);
        updateStatus('❌ Помилка підключення до Linera');
        
        // Continue with offline mode
        isInitialized = false;
    }
}

// Setup game with leaderboard configuration
async function setupGame() {
    try {
        // Set player name
        const setNameQuery = `mutation {
            setPlayerName(name: "${playerName}")
        }`;
        
        await gameContract.query(JSON.stringify({ query: setNameQuery }));
        
        // Configure leaderboard chain if available
        if (LEADERBOARD_CHAIN_ID) {
            const setLeaderboardQuery = `mutation {
                setLeaderboardChain(chainId: "${LEADERBOARD_CHAIN_ID}")
            }`;
            
            await gameContract.query(JSON.stringify({ query: setLeaderboardQuery }));
        } else {
            // Use current chain as leaderboard
            const setLeaderboardQuery = `mutation {
                setLeaderboardChain(chainId: "${chainId}")
            }`;
            
            await gameContract.query(JSON.stringify({ query: setLeaderboardQuery }));
        }
        
        isGameConfigured = true;
        console.log('Game configured successfully');
        
    } catch (error) {
        console.error('Failed to setup game:', error);
        isGameConfigured = false;
    }
}

// Update kills during gameplay
async function updateKills(kills) {
    if (!isInitialized || !gameContract) {
        return false;
    }
    
    try {
        const incrementQuery = `mutation {
            Increment(value: 1)
        }`;
        
        await gameContract.query(JSON.stringify({ query: incrementQuery }));
        playerStats.currentKills = kills;
        return true;
        
    } catch (error) {
        console.error('Failed to update kills:', error);
        return false;
    }
}

// Submit final score to leaderboard
async function submitScore(finalKills) {
    if (!isInitialized || !gameContract) {
        console.log('Contract not ready, cannot submit score');
        return false;
    }
    
    try {
        // Submit the best score (this will automatically send to leaderboard)
        const setBestQuery = `mutation {
            SetBest(best: ${finalKills})
        }`;
        
        await gameContract.query(JSON.stringify({ query: setBestQuery }));
        
        console.log('Score submitted successfully:', finalKills);
        
        // Request leaderboard update
        await requestLeaderboardUpdate();
        
        return true;
        
    } catch (error) {
        console.error('Failed to submit score:', error);
        return false;
    }
}

// Request leaderboard update
async function requestLeaderboardUpdate() {
    if (!isInitialized || !gameContract) {
        return;
    }
    
    try {
        const requestQuery = `mutation {
            RequestLeaderboard
        }`;
        
        await gameContract.query(JSON.stringify({ query: requestQuery }));
        
        // Wait and fetch updated leaderboard
        setTimeout(async () => {
            await fetchLeaderboard();
        }, 2000);
        
    } catch (error) {
        console.error('Failed to request leaderboard update:', error);
    }
}

// Fetch leaderboard data
async function fetchLeaderboard() {
    if (!isInitialized || !gameContract) {
        return {
            leaderboard: [],
            playerStats: playerStats
        };
    }
    
    try {
        const leaderboardQuery = `query {
            leaderboard {
                playerName
                score
                timestamp
                playerChainId
            }
            playerName
            best
            value
            myRank
            isLeaderboardChain
        }`;
        
        const response = await gameContract.query(JSON.stringify({ query: leaderboardQuery }));
        const data = JSON.parse(response).data;
        
        // Update global state
        leaderboard = data.leaderboard || [];
        playerStats = {
            best: data.best || 0,
            currentKills: data.value || 0,
            rank: data.myRank,
            playerName: data.playerName || playerName,
            isLeaderboardChain: data.isLeaderboardChain || false
        };
        
        // Update UI
        updateLeaderboardUI();
        updatePlayerStatsUI();
        
        console.log('Leaderboard updated:', {
            entries: leaderboard.length,
            playerRank: playerStats.rank,
            playerBest: playerStats.best
        });
        
        return {
            leaderboard: leaderboard,
            playerStats: playerStats
        };
        
    } catch (error) {
        console.error('Failed to fetch leaderboard:', error);
        return {
            leaderboard: [],
            playerStats: playerStats
        };
    }
}

// Update leaderboard UI
function updateLeaderboardUI() {
    const leaderboardList = document.getElementById('leaderboard-list');
    if (!leaderboardList) return;
    
    if (leaderboard.length === 0) {
        leaderboardList.innerHTML = '<div class="no-scores">Поки що немає результатів!</div>';
        return;
    }
    
    leaderboardList.innerHTML = leaderboard
        .slice(0, 10)
        .map((entry, index) => {
            const rank = index + 1;
            let className = 'leaderboard-entry';
            
            if (rank === 1) className += ' gold';
            else if (rank === 2) className += ' silver';
            else if (rank === 3) className += ' bronze';
            
            if (entry.playerName === playerName) className += ' current-player';
            
            // Format timestamp
            const date = new Date(entry.timestamp / 1000);
            const timeStr = date.toLocaleTimeString('uk-UA', {
                hour: '2-digit',
                minute: '2-digit'
            });
            
            return `
                <div class="${className}">
                    <div class="rank">#${rank}</div>
                    <div class="player-info">
                        <div class="player-name">${entry.playerName}</div>
                        <div class="player-time">${timeStr}</div>
                    </div>
                    <div class="score">${entry.score}</div>
                </div>
            `;
        })
        .join('');
}

// Update player stats UI
function updatePlayerStatsUI() {
    const elements = {
        playerName: document.getElementById('player-name'),
        playerBest: document.getElementById('player-best'),
        playerRank: document.getElementById('player-rank'),
        currentKills: document.getElementById('current-kills')
    };
    
    if (elements.playerName) {
        elements.playerName.textContent = playerStats.playerName || playerName;
    }
    
    if (elements.playerBest) {
        elements.playerBest.textContent = playerStats.best || 0;
    }
    
    if (elements.playerRank) {
        elements.playerRank.textContent = playerStats.rank ? `#${playerStats.rank}` : '-';
    }
    
    if (elements.currentKills) {
        elements.currentKills.textContent = playerStats.currentKills || 0;
    }
}

// Utility functions
function promptPlayerName() {
    const name = prompt('Введіть ваше ім\'я (максимум 20 символів):');
    if (name && name.trim()) {
        return name.trim().substring(0, 20);
    }
    return `Гравець${Math.floor(Math.random() * 1000)}`;
}

function updateStatus(message) {
    const statusElement = document.getElementById('walletStatus');
    if (statusElement) {
        statusElement.textContent = message;
    }
}

function updateChainInfo() {
    const chainIdElement = document.getElementById('chainId');
    if (chainIdElement && chainId) {
        chainIdElement.textContent = chainId.substring(0, 8) + '...';
    }
}

// Get current player statistics
function getPlayerStats() {
    return {
        ...playerStats,
        playerName: playerName,
        isInitialized: isInitialized,
        isGameConfigured: isGameConfigured
    };
}

// Get current leaderboard
function getLeaderboard() {
    return leaderboard;
}

// Export functions for use in game.js
window.lineraIntegration = {
    initialize: initializeLinera,
    updateKills: updateKills,
    submitScore: submitScore,
    fetchLeaderboard: fetchLeaderboard,
    requestLeaderboardUpdate: requestLeaderboardUpdate,
    getPlayerStats: getPlayerStats,
    getLeaderboard: getLeaderboard,
    isInitialized: () => isInitialized,
    isGameConfigured: () => isGameConfigured
};

// Auto-initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    // Add small delay to ensure everything is ready
    setTimeout(() => {
        initializeLinera();
    }, 1000);
});

export {
    initializeLinera,
    updateKills,
    submitScore,
    fetchLeaderboard,
    requestLeaderboardUpdate,
    getPlayerStats,
    getLeaderboard
}; 
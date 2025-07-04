import * as linera from "@linera/client";

// Константи для вашого контракту
const DANNY_GAME_APP_ID = "9e52814b39d70f0638750f05f6d3050285409797eee4d5596d933e539e791058";
const LEADERBOARD_CHAIN_ID = "dfc88cbb06b5a844be804c5b9220c26ce7a2963cc06d47492bdf28c073892ac6";

// Глобальні змінні
let dannyGameContract;
let currentChainId;
let playerName = "";
let isInitialized = false;

// Utility функції
function log(message, data = null) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] DEBUG: ${message}`, data || "");
  
  // Додати до UI
  const debugLog = document.getElementById('debug-log');
  if (debugLog) {
    const logEntry = document.createElement('div');
    logEntry.className = 'log-entry';
    logEntry.innerHTML = `<span class="timestamp">${timestamp}</span> ${message}`;
    if (data) {
      logEntry.innerHTML += `<br><pre>${JSON.stringify(data, null, 2)}</pre>`;
    }
    debugLog.appendChild(logEntry);
    debugLog.scrollTop = debugLog.scrollHeight;
  }
}

function clearLog() {
  const debugLog = document.getElementById('debug-log');
  if (debugLog) {
    debugLog.innerHTML = '';
  }
}

// Тести контракту
async function testIncrement() {
  try {
    log("Testing Increment operation...");
    
    const incrementQuery = {
      query: `mutation { increment(value: 5) }`
    };
    
    const result = await dannyGameContract.query(JSON.stringify(incrementQuery));
    log("Increment result:", result);
    
    // Перевірити поточне значення
    await getCurrentValue();
    
  } catch (error) {
    log("Error in testIncrement:", error.message);
  }
}

async function testSetupGame() {
  try {
    log("Testing SetupGame operation...");
    
    const setupQuery = {
      query: `mutation { 
        setupGame(
          leaderboardChainId: "${LEADERBOARD_CHAIN_ID}",
          playerName: "${playerName}"
        ) 
      }`
    };
    
    const result = await dannyGameContract.query(JSON.stringify(setupQuery));
    log("SetupGame result:", result);
    
  } catch (error) {
    log("Error in testSetupGame:", error.message);
  }
}

async function testSetBestAndSubmit() {
  try {
    log("Testing SetBestAndSubmit operation...");
    
    const bestScore = Math.floor(Math.random() * 1000) + 100; // Рандомний результат від 100 до 1100
    
    const submitQuery = {
      query: `mutation { setBestAndSubmit(best: ${bestScore}) }`
    };
    
    const result = await dannyGameContract.query(JSON.stringify(submitQuery));
    log(`SetBestAndSubmit result (score: ${bestScore}):`, result);
    
    // Перевірити оновлений best score
    await getBestScore();
    
  } catch (error) {
    log("Error in testSetBestAndSubmit:", error.message);
  }
}

async function testRequestLeaderboard() {
  try {
    log("Testing RequestLeaderboard operation...");
    
    const requestQuery = {
      query: `mutation { requestLeaderboard }`
    };
    
    const result = await dannyGameContract.query(JSON.stringify(requestQuery));
    log("RequestLeaderboard result:", result);
    
    // Почекати трохи і потім отримати лідерборд
    setTimeout(async () => {
      await getLeaderboard();
    }, 2000);
    
  } catch (error) {
    log("Error in testRequestLeaderboard:", error.message);
  }
}

// Query функції
async function getCurrentValue() {
  try {
    log("Getting current value...");
    
    const valueQuery = {
      query: `query { value }`
    };
    
    const result = await dannyGameContract.query(JSON.stringify(valueQuery));
    const data = JSON.parse(result);
    log("Current value:", data.data.value);
    
    // Оновити UI
    document.getElementById('current-value').textContent = data.data.value;
    
  } catch (error) {
    log("Error in getCurrentValue:", error.message);
  }
}

async function getBestScore() {
  try {
    log("Getting best score...");
    
    const bestQuery = {
      query: `query { best }`
    };
    
    const result = await dannyGameContract.query(JSON.stringify(bestQuery));
    const data = JSON.parse(result);
    log("Best score:", data.data.best);
    
    // Оновити UI
    document.getElementById('best-score').textContent = data.data.best;
    
  } catch (error) {
    log("Error in getBestScore:", error.message);
  }
}

async function getPlayerName() {
  try {
    log("Getting player name...");
    
    const nameQuery = {
      query: `query { playerName }`
    };
    
    const result = await dannyGameContract.query(JSON.stringify(nameQuery));
    const data = JSON.parse(result);
    log("Player name:", data.data.playerName);
    
    // Оновити UI
    document.getElementById('player-name').textContent = data.data.playerName;
    
  } catch (error) {
    log("Error in getPlayerName:", error.message);
  }
}

async function getLeaderboard() {
  try {
    log("Getting leaderboard...");
    
    const leaderboardQuery = {
      query: `query { 
        leaderboard {
          playerName
          score
          chainId
          timestamp
        }
        myRank
      }`
    };
    
    const result = await dannyGameContract.query(JSON.stringify(leaderboardQuery));
    const data = JSON.parse(result);
    log("Leaderboard data:", data.data);
    
    // Оновити UI
    updateLeaderboardUI(data.data.leaderboard, data.data.myRank);
    
  } catch (error) {
    log("Error in getLeaderboard:", error.message);
  }
}

async function getAllGameData() {
  try {
    log("Getting all game data...");
    
    const allDataQuery = {
      query: `query { 
        value
        best
        playerName
        isLeaderboardChain
        leaderboard {
          playerName
          score
          chainId
          timestamp
        }
        myRank
      }`
    };
    
    const result = await dannyGameContract.query(JSON.stringify(allDataQuery));
    const data = JSON.parse(result);
    log("All game data:", data.data);
    
    // Оновити всі UI елементи
    if (data.data.value !== undefined) {
      document.getElementById('current-value').textContent = data.data.value;
    }
    if (data.data.best !== undefined) {
      document.getElementById('best-score').textContent = data.data.best;
    }
    if (data.data.playerName) {
      document.getElementById('player-name').textContent = data.data.playerName;
    }
    if (data.data.myRank !== undefined) {
      document.getElementById('my-rank').textContent = data.data.myRank || "-";
    }
    if (data.data.isLeaderboardChain !== undefined) {
      document.getElementById('is-leaderboard-chain').textContent = data.data.isLeaderboardChain ? "Yes" : "No";
    }
    if (data.data.leaderboard) {
      updateLeaderboardUI(data.data.leaderboard, data.data.myRank);
    }
    
  } catch (error) {
    log("Error in getAllGameData:", error.message);
  }
}

function updateLeaderboardUI(leaderboard, myRank) {
  const leaderboardList = document.getElementById('leaderboard-list');
  
  if (!leaderboard || leaderboard.length === 0) {
    leaderboardList.innerHTML = '<div class="no-data">No scores yet!</div>';
    return;
  }
  
  leaderboardList.innerHTML = leaderboard
    .slice(0, 10)
    .map((entry, index) => {
      const rank = index + 1;
      const isCurrentPlayer = entry.playerName === playerName;
      const timestamp = new Date(entry.timestamp / 1000).toLocaleString();
      
      return `
        <div class="leaderboard-entry ${isCurrentPlayer ? 'current-player' : ''}">
          <div class="rank">#${rank}</div>
          <div class="player-info">
            <div class="player-name">${entry.playerName}</div>
            <div class="chain-id">${entry.chainId.substring(0, 8)}...</div>
          </div>
          <div class="score">${entry.score}</div>
          <div class="timestamp">${timestamp}</div>
        </div>
      `;
    })
    .join('');
}

// Комплексні тести
async function runFullTestSuite() {
  log("🚀 Starting full test suite...");
  
  try {
    // 1. Налаштування гри
    await testSetupGame();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 2. Тестування increment
    await testIncrement();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 3. Тестування submit best score
    await testSetBestAndSubmit();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 4. Запит лідерборду
    await testRequestLeaderboard();
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 5. Отримання всіх даних
    await getAllGameData();
    
    log("✅ Full test suite completed!");
    
  } catch (error) {
    log("❌ Test suite failed:", error.message);
  }
}

// Ініціалізація
async function initializeContract() {
  try {
    log("🔄 Initializing Linera client...");
    
    await linera.default();
    
    // Створити faucet та wallet
    log("Creating faucet and wallet...");
    const faucet = await new linera.Faucet("https://faucet.testnet-babbage.linera.net");
    const wallet = await faucet.createWallet();
    const client = await new linera.Client(wallet);
    
    // Отримати chain ID
    currentChainId = await faucet.claimChain(client);
    log("Connected to chain:", currentChainId);
    
    // Підключити контракт
    dannyGameContract = await client.frontend().application(DANNY_GAME_APP_ID);
    log("Connected to Danny Game contract:", DANNY_GAME_APP_ID);
    
    // Встановити ім'я гравця
    playerName = `TestPlayer${Math.floor(Math.random() * 1000)}`;
    log("Generated player name:", playerName);
    
    // Оновити UI
    document.getElementById('chain-id').textContent = currentChainId;
    document.getElementById('app-id').textContent = DANNY_GAME_APP_ID;
    document.getElementById('leaderboard-chain').textContent = LEADERBOARD_CHAIN_ID;
    document.getElementById('test-player-name').textContent = playerName;
    
    isInitialized = true;
    log("✅ Contract initialized successfully!");
    
    // Отримати початкові дані
    await getAllGameData();
    
  } catch (error) {
    log("❌ Failed to initialize contract:", error.message);
    throw error;
  }
}

// Event listeners
document.addEventListener('DOMContentLoaded', async () => {
  log("🌐 DOM loaded, initializing...");
  
  try {
    await initializeContract();
  } catch (error) {
    log("❌ Initialization failed:", error.message);
  }
});

// Експортувати функції для використання в консолі
window.dannyGameDebug = {
  testIncrement,
  testSetupGame,
  testSetBestAndSubmit,
  testRequestLeaderboard,
  getCurrentValue,
  getBestScore,
  getPlayerName,
  getLeaderboard,
  getAllGameData,
  runFullTestSuite,
  clearLog,
  log
}; 
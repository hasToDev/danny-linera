// Game state
let gameState = {
    screen: 'menu', // menu, game, upgrades, leaderboard
    isGameRunning: false,
    totalCoins: parseInt(localStorage.getItem('totalCoins')) || 0,
    swordLevel: parseInt(localStorage.getItem('swordLevel')) || 1,
    currentGameCoins: 0,
    kills: 0,
    gameTime: 0,
    gameSeconds: 0, // Track game time in seconds
    spawnRate: 120, // Initial spawn rate (frames between spawns)
    allowedMobTypes: [1], // Start with only type 1 mobs
    maxMobs: 8, // Maximum mobs on screen at once
    targetMobs: 3, // Target number of mobs to maintain
    absoluteMaxMobs: 15 // Hard limit for performance
};

// Canvas and context
let canvas, ctx;

// Images
let swordImages = {};
let mobImages = {};
let backgroundImage = null;
let cakeImage = null;
let dannyImage = null;
let imagesLoaded = 0;
let totalImages = 9; // 3 swords + 1 background + 1 cake + 3 mobs + 1 danny

// World boundaries (rectangular map)
const WORLD_WIDTH = 2000; // Wide map
const WORLD_HEIGHT = 1200; // Shorter height for rectangular shape (5:3 ratio)
const WORLD_BORDER = 50; // Thickness of border wall

// Camera system
let camera = {
    x: 0,
    y: 0
};

// Game objects
let player = {
    x: 0, // World coordinates
    y: 0, // World coordinates
    width: 30,
    height: 30,
    maxHealth: 100,
    health: 100,
    speed: 1.33, // Reduced speed (4/3)
    color: '#4169E1',
    sword: {
        active: false,
        angle: 0,
        damage: 1,
        level: 1,
        tempSword: null,
        tempUses: 0,
        swingProgress: 0, // Animation progress 0-1
        swingDuration: 30, // Duration in frames
        targetAngle: 0 // Target angle for auto-aim
    }
};

let mobs = [];
let drops = [];
let keys = {};

// Mob types (base stats - will be modified by difficulty scaling)
const mobTypes = {
    1: { hp: 2, color: '#FF69B4', baseSpeed: 1.13, baseDamage: 10, size: 20 },
    2: { hp: 4, color: '#FF1493', baseSpeed: 1.13, baseDamage: 15, size: 25 },
    3: { hp: 8, color: '#C71585', baseSpeed: 1.13, baseDamage: 20, size: 30 }
};

// Sword data
const swordData = {
    1: { damage: 1, color: '#C0C0C0' },
    2: { damage: 2, color: '#FFD700' },
    3: { damage: 4, color: '#FF4500' }
};

// Drop types
const dropTypes = {
    coin: { color: '#FFD700', size: 8, value: 1 },
    cake: { color: '#FFB6C1', size: 12, heal: 20 },
    sword2: { color: '#FFD700', size: 10, swordLevel: 2 },
    sword3: { color: '#FF4500', size: 10, swordLevel: 3 }
};

// Calculate scaled mob stats based on game time
function getScaledMobStats(mobType) {
    const baseStats = mobTypes[mobType];
    
    // Scaling starts only after 3rd mob type appears (180 seconds)
    if (gameState.gameSeconds < 180) {
        return {
            speed: baseStats.baseSpeed,
            damage: baseStats.baseDamage,
            hp: baseStats.hp,
            color: baseStats.color,
            size: baseStats.size
        };
    }
    
    // Very gradual scaling after 3 minutes: +5% speed and +10% damage per minute
    const minutesAfterThirdMob = (gameState.gameSeconds - 180) / 60;
    const speedMultiplier = 1 + (minutesAfterThirdMob * 0.05); // +5% per minute
    const damageMultiplier = 1 + (minutesAfterThirdMob * 0.10); // +10% per minute
    
    return {
        speed: baseStats.baseSpeed * speedMultiplier,
        damage: Math.floor(baseStats.baseDamage * damageMultiplier),
        hp: baseStats.hp,
        color: baseStats.color,
        size: baseStats.size
    };
}

// Load images
function loadImages() {
    const swordFiles = ['sword1.png', 'sword2.png', 'sword3.png'];
    
    // Load background image
    const bgImg = new Image();
    bgImg.onload = function() {
        backgroundImage = bgImg;
        imagesLoaded++;
        console.log('Background image loaded');
        if (imagesLoaded === totalImages) {
            console.log('All images loaded');
        }
    };
    bgImg.onerror = function() {
        console.error('Failed to load background image');
        imagesLoaded++;
    };
    bgImg.src = 'assets/field.avif';
    
    // Load cake image
    const cakeImg = new Image();
    cakeImg.onload = function() {
        cakeImage = cakeImg;
        imagesLoaded++;
        console.log('Cake image loaded');
        if (imagesLoaded === totalImages) {
            console.log('All images loaded');
        }
    };
    cakeImg.onerror = function() {
        console.error('Failed to load cake image');
        imagesLoaded++;
    };
    cakeImg.src = 'assets/cake.png';
    
    // Load sword images
    swordFiles.forEach((file, index) => {
        const img = new Image();
        img.onload = function() {
            swordImages[index + 1] = img;
            imagesLoaded++;
            if (imagesLoaded === totalImages) {
                console.log('All images loaded');
            }
        };
        img.onerror = function() {
            console.error(`Failed to load ${file}`);
            imagesLoaded++;
        };
        img.src = 'assets/' + file;
    });
    
    // Load mob images
    const mobFiles = ['mob1.png', 'mob2.png', 'mob3.png'];
    mobFiles.forEach((file, index) => {
        const img = new Image();
        img.onload = function() {
            mobImages[index + 1] = img;
            imagesLoaded++;
            console.log(`Mob ${index + 1} image loaded`);
            if (imagesLoaded === totalImages) {
                console.log('All images loaded');
            }
        };
        img.onerror = function() {
            console.error(`Failed to load ${file}`);
            imagesLoaded++;
        };
        img.src = 'assets/' + file;
    });
    
    // Load Danny image
    const dannyImg = new Image();
    dannyImg.onload = function() {
        dannyImage = dannyImg;
        imagesLoaded++;
        console.log('Danny image loaded');
        if (imagesLoaded === totalImages) {
            console.log('All images loaded');
        }
    };
    dannyImg.onerror = function() {
        console.error('Failed to load danny.png');
        imagesLoaded++;
    };
    dannyImg.src = 'assets/Danny.png';
}

// Notification system
function showNotification(message, type = 'default') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type}`;
    
    // Show notification
    setTimeout(() => notification.classList.add('show'), 100);
    
    // Hide notification after 2 seconds
    setTimeout(() => {
        notification.classList.remove('show');
    }, 2000);
}

// Add roundRect polyfill for older browsers
if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function(x, y, width, height, radius) {
        this.beginPath();
        this.moveTo(x + radius, y);
        this.lineTo(x + width - radius, y);
        this.quadraticCurveTo(x + width, y, x + width, y + radius);
        this.lineTo(x + width, y + height - radius);
        this.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        this.lineTo(x + radius, y + height);
        this.quadraticCurveTo(x, y + height, x, y + height - radius);
        this.lineTo(x, y + radius);
        this.quadraticCurveTo(x, y, x + radius, y);
        this.closePath();
    };
}

// Update camera to follow player
function updateCamera() {
    if (canvas) {
        camera.x = player.x - canvas.width / 2;
        camera.y = player.y - canvas.height / 2;
    }
}

// Resize canvas to full screen
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    // Update camera to center on player
    updateCamera();
}

// Initialize game
function init() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    
    // Очищуємо старі локальні записи лідерборду (тепер все через сервер)
    localStorage.removeItem('leaderboard');
    
    // Set initial canvas size
    resizeCanvas();
    
    // Resize canvas when window resizes
    window.addEventListener('resize', resizeCanvas);
    
    // Load images
    loadImages();
    
    // Event listeners
    document.addEventListener('keydown', (e) => {
        keys[e.key.toLowerCase()] = true;
        if (e.key === ' ') {
            e.preventDefault();
            activateSword();
        }
    });
    
    document.addEventListener('keyup', (e) => {
        keys[e.key.toLowerCase()] = false;
    });
    
    // Mouse click handler
    canvas.addEventListener('click', (e) => {
        if (gameState.isGameRunning) {
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            const mouseX = (e.clientX - rect.left) * scaleX;
            const mouseY = (e.clientY - rect.top) * scaleY;
            
            // Convert screen coordinates to world coordinates
            const worldMouseX = mouseX + camera.x;
            const worldMouseY = mouseY + camera.y;
            
            // Calculate sword angle based on world mouse position
            player.sword.angle = Math.atan2(worldMouseY - player.y, worldMouseX - player.x);
            activateSword();
        }
    });
    
    // Touch handler for mobile devices
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (gameState.isGameRunning && e.touches.length > 0) {
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            const touchX = (e.touches[0].clientX - rect.left) * scaleX;
            const touchY = (e.touches[0].clientY - rect.top) * scaleY;
            
            // Convert screen coordinates to world coordinates
            const worldTouchX = touchX + camera.x;
            const worldTouchY = touchY + camera.y;
            
            // Calculate sword angle based on world touch position
            player.sword.angle = Math.atan2(worldTouchY - player.y, worldTouchX - player.x);
            activateSword();
        }
    });
    
    updateUpgradeButtons();
}

// Screen management
function showScreen(screenName) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    
    // Handle different screen naming conventions
    let screenId;
    if (screenName === 'mainMenu') {
        screenId = 'mainMenu';
    } else {
        screenId = screenName + 'Screen';
    }
    
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.classList.add('active');
        gameState.screen = screenName;
    } else {
        console.error(`Screen element not found: ${screenId}`);
    }
}

function showMainMenu() {
    showScreen('mainMenu');
    if (gameState.isGameRunning) {
        endGame();
    }
}

function showUpgrades() {
    showScreen('upgrades');
    updateUpgradeButtons();
    document.getElementById('totalCoins').textContent = gameState.totalCoins;
}

function showLeaderboard() {
    showScreen('leaderboard');
    updateLineraStatus();
    updateLeaderboard();
}

function startGame() {
    showScreen('game');
    const gameContainer = document.querySelector('.game-container');
    if (gameContainer) {
        gameContainer.style.display = 'block';
    }
    
    // Reset game state
    gameState.isGameRunning = true;
    gameState.currentGameCoins = 0;
    gameState.kills = 0;
    gameState.gameTime = 0;
    
    // Reset player to world center
    player.x = 0;
    player.y = 0;
    player.health = player.maxHealth;
    
    // Start with purchased sword level
    player.sword.level = gameState.swordLevel;
    player.sword.damage = swordData[gameState.swordLevel].damage;
    player.sword.tempSword = null;
    player.sword.tempUses = 0;
    
    // Reset difficulty progression
    gameState.gameSeconds = 0;
    gameState.spawnRate = 120; // Balanced initial spawn rate
    gameState.allowedMobTypes = [1];
    gameState.maxMobs = 8;
    gameState.targetMobs = 3;
    
    // Clear arrays
    mobs = [];
    drops = [];
    
    updateUI();
    gameLoop();
}

function endGame() {
    // Запобігаємо повторному виклику
    if (!gameState.isGameRunning) {
        return;
    }
    
    gameState.isGameRunning = false;
    const gameContainer = document.querySelector('.game-container');
    if (gameContainer) {
        gameContainer.style.display = 'none';
    }
    
    // Add coins to total
    gameState.totalCoins += gameState.currentGameCoins;
    localStorage.setItem('totalCoins', gameState.totalCoins);
    
    // Save to leaderboard (тільки якщо є вбивства)
    if (gameState.kills > 0) {
        saveScore(gameState.kills);
    }
    
    // Clean up UI elements
    const swordUsesElement = document.getElementById('sword-uses');
    if (swordUsesElement) swordUsesElement.remove();
    
    const mobCountElement = document.getElementById('mob-count');
    if (mobCountElement) mobCountElement.remove();
    
    const difficultyElement = document.getElementById('difficulty-info');
    if (difficultyElement) difficultyElement.remove();
    
    const gameTimeElement = document.getElementById('game-time');
    if (gameTimeElement) gameTimeElement.remove();
    
    // Clear game objects
    mobs = [];
    drops = [];
    
    // Reset player
    player.health = player.maxHealth;
    player.x = 0;
    player.y = 0;
    player.sword.tempSword = null;
    player.sword.tempUses = 0;
    
    showMainMenu();
}

// Upgrade system
function updateUpgradeButtons() {
    const upgrade2Btn = document.getElementById('upgrade2Btn');
    const upgrade3Btn = document.getElementById('upgrade3Btn');
    
    // Level 2 upgrade
    if (gameState.swordLevel >= 2) {
        upgrade2Btn.textContent = 'Куплено';
        upgrade2Btn.disabled = true;
    } else if (gameState.totalCoins >= 500) {
        upgrade2Btn.disabled = false;
    } else {
        upgrade2Btn.disabled = true;
    }
    
    // Level 3 upgrade
    if (gameState.swordLevel >= 3) {
        upgrade3Btn.textContent = 'Куплено';
        upgrade3Btn.disabled = true;
    } else if (gameState.totalCoins >= 1500 && gameState.swordLevel >= 2) {
        upgrade3Btn.disabled = false;
    } else {
        upgrade3Btn.disabled = true;
    }
}

function buyUpgrade(level) {
    const costs = { 2: 500, 3: 1500 };
    
    if (gameState.totalCoins >= costs[level] && gameState.swordLevel < level) {
        gameState.totalCoins -= costs[level];
        gameState.swordLevel = level;
        
        localStorage.setItem('totalCoins', gameState.totalCoins);
        localStorage.setItem('swordLevel', gameState.swordLevel);
        
        updateUpgradeButtons();
        document.getElementById('totalCoins').textContent = gameState.totalCoins;
    }
}

function resetProgress() {
    // Confirm before reset
    if (confirm('Ви впевнені? Це видалить всі ваші монети та апгрейди!')) {
        // Reset game state
        gameState.totalCoins = 0;
        gameState.swordLevel = 1;
        
        // Clear localStorage
        localStorage.removeItem('totalCoins');
        localStorage.removeItem('swordLevel');
        localStorage.removeItem('leaderboard');
        
        // Update UI
        updateUpgradeButtons();
        document.getElementById('totalCoins').textContent = gameState.totalCoins;
        
        // Show notification
        showNotification('Прогрес скинуто!', 'damage');
        
        console.log('Progress reset successfully');
    }
}

// Leaderboard system
async function saveScore(kills) {
    console.log(`saveScore called with kills: ${kills}`);
    
    const survivalTime = gameState.gameSeconds;
    
    // Спробуємо зберегти через Linera блокчейн
    if (window.lineraIntegration && window.lineraIntegration.isInitialized) {
        try {
            console.log('Saving score to Linera blockchain:', {
                kills: kills,
                survivalTime: survivalTime
            });
            
            // Відправляємо результат в блокчейн
            const success = await window.lineraIntegration.submitFinalScore(kills, survivalTime);
            
            if (success) {
                showNotification(`🎉 Результат збережено в блокчейн! ${kills} вбивств за ${Math.floor(survivalTime/60)}:${(survivalTime%60).toString().padStart(2, '0')}`, 'coin');
                console.log('Score successfully saved to blockchain');
            } else {
                showNotification('⚠️ Помилка збереження в блокчейн, спробуємо локально...', 'damage');
                await saveScoreToServer(kills);
            }
        } catch (error) {
            console.error('Error saving to blockchain:', error);
            showNotification('⚠️ Помилка блокчейну, спробуємо локально...', 'damage');
            await saveScoreToServer(kills);
        }
    } else {
        // Fallback до старого серверного API
        console.log('Blockchain not ready, using server API');
        await saveScoreToServer(kills);
    }
}

// Fallback функція для збереження на сервер (якщо блокчейн недоступний)
async function saveScoreToServer(kills) {
    // Отримуємо інформацію про ланцюг з Linera
    let playerWallet = null;
    let chainId = 'unknown';
    
    // Спробуємо отримати дані з Linera інтеграції
    if (window.lineraIntegration && window.lineraIntegration.isInitialized) {
        try {
            const walletInfo = window.lineraIntegration.getWalletInfo();
            if (walletInfo && walletInfo.chainId) {
                playerWallet = walletInfo.chainId;
                chainId = 'linera-testnet';
                console.log('Using Linera chain:', walletInfo.chainId);
            }
        } catch (error) {
            console.error('Error getting Linera wallet info:', error);
        }
    }
    
    // Якщо немає підключення до Linera, не зберігаємо результат
    if (!playerWallet) {
        showNotification('❌ Потрібне підключення до Linera для збереження результату', 'damage');
        console.log('No Linera connection - score not saved');
        return;
    }
    
    // Відправляємо результат на сервер
    try {
        const response = await fetch('/api/leaderboard', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                playerWallet: playerWallet,
                chainId: chainId,
                kills: kills
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            if (result.isNewRecord) {
                if (result.previousRecord) {
                    showNotification(`🎉 НОВИЙ РЕКОРД! ${kills} вбивств (попередній: ${result.previousRecord})`, 'coin');
                } else {
                    showNotification(`🎉 ПЕРШИЙ РЕЗУЛЬТАТ! ${kills} вбивств`, 'coin');
                }
            } else {
                showNotification(`📊 Результат: ${kills} вбивств (рекорд: ${result.currentRecord})`, 'default');
            }
            console.log('Score processed:', result);
        } else {
            const error = await response.json();
            console.error('Error saving to global leaderboard:', error);
            showNotification('❌ Помилка збереження результату', 'damage');
        }
    } catch (error) {
        console.error('Network error saving score:', error);
        showNotification('❌ Помилка з\'єднання з сервером', 'damage');
    }
}

async function updateLeaderboard() {
    const list = document.getElementById('leaderboardList');
    if (!list) {
        console.error('Element leaderboardList not found!');
        return;
    }
    
    list.innerHTML = '<div class="leaderboard-item"><span>🔄 Завантаження лідерборду з блокчейну...</span></div>';
    
    // Оновлюємо статус Linera
    updateLineraStatus();
    
    let leaderboard = [];
    
    // Спочатку спробуємо завантажити з блокчейну
    if (window.lineraIntegration && window.lineraIntegration.isInitialized) {
        try {
            console.log('Fetching leaderboard from Linera blockchain...');
            const leaderboardData = await window.lineraIntegration.fetchLeaderboard();
            console.log('Blockchain leaderboard fetched:', leaderboardData);
            
            if (leaderboardData.leaderboard && leaderboardData.leaderboard.length > 0) {
                renderLeaderboard(leaderboardData.leaderboard, true); // true означає блокчейн джерело
                return;
            } else {
                console.log('Empty blockchain leaderboard, trying server...');
            }
        } catch (error) {
            console.error('Error fetching from blockchain:', error);
        }
    }
    
    // Fallback до серверного API
    try {
        console.log('Fetching leaderboard from server...');
        list.innerHTML = '<div class="leaderboard-item"><span>🔄 Завантаження з сервера...</span></div>';
        
        const response = await fetch('/api/leaderboard');
        if (response.ok) {
            leaderboard = await response.json();
            console.log('Server leaderboard fetched:', leaderboard);
            renderLeaderboard(leaderboard, false); // false означає серверне джерело
        } else {
            console.error('Error fetching server leaderboard:', response.status);
            list.innerHTML = '<div class="leaderboard-item"><span>❌ Помилка завантаження лідерборду</span></div>';
        }
    } catch (error) {
        console.error('Network error fetching leaderboard:', error);
        list.innerHTML = '<div class="leaderboard-item"><span>❌ Немає з\'єднання</span></div>';
    }
}

function renderLeaderboard(leaderboard, isBlockchain = false) {
    const list = document.getElementById('leaderboardList');
    if (!list) return;
    
    list.innerHTML = '';
    
    if (leaderboard.length === 0) {
        const sourceText = isBlockchain ? 'у блокчейні' : 'на сервері';
        list.innerHTML = `<div class="leaderboard-item"><span>Поки що немає результатів ${sourceText}</span></div>`;
        return;
    }
    
    // Додаємо заголовок джерела даних
    const headerItem = document.createElement('div');
    headerItem.className = 'leaderboard-header';
    headerItem.innerHTML = isBlockchain ? 
        '<span>🔗 Дані з Linera блокчейну</span>' : 
        '<span>🌐 Дані з локального сервера</span>';
    headerItem.style.cssText = `
        text-align: center;
        padding: 10px;
        background: rgba(0,255,255,0.1);
        border: 1px solid rgba(0,255,255,0.3);
        border-radius: 5px;
        margin-bottom: 10px;
        font-size: 14px;
        color: #00ffff;
    `;
    list.appendChild(headerItem);
    
    leaderboard.forEach((entry, index) => {
        const item = document.createElement('div');
        item.className = 'leaderboard-item';
        
        // Визначаємо іконку та назву ланцюга
        let chainIcon = '🔗';
        let chainName = entry.chainId || 'Unknown';
        let playerDisplay = '';
        
        if (isBlockchain) {
            // Для блокчейн даних використовуємо playerName якщо є
            playerDisplay = entry.playerName || 'Anonymous';
            chainIcon = '⛓️';
            chainName = 'Linera';
            
            // Також показуємо скорочений chainId
            if (entry.playerWallet && entry.playerWallet.length > 20) {
                const shortWallet = entry.playerWallet.substring(0, 8) + '...' + entry.playerWallet.substring(entry.playerWallet.length - 6);
                playerDisplay += ` (${shortWallet})`;
            } else if (entry.playerWallet) {
                playerDisplay += ` (${entry.playerWallet})`;
            }
        } else {
            // Для серверних даних як раніше
            if (entry.chainId === 'linera-testnet') {
                chainIcon = '⛓️';
                chainName = 'Linera Testnet';
            } else if (entry.chainId && entry.chainId !== 'unknown') {
                chainIcon = '🔗';
                chainName = entry.chainId;
            }
            
            playerDisplay = entry.playerWallet && entry.playerWallet.length > 20 ? 
                entry.playerWallet.substring(0, 8) + '...' + entry.playerWallet.substring(entry.playerWallet.length - 6) :
                entry.playerWallet || 'Unknown';
        }
        
        // Час виживання більше не зберігається в блокчейні, показуємо тільки kills
        let survivalTimeText = '';
        
        item.innerHTML = `
            <div class="leaderboard-rank">${isBlockchain ? '🔗' : '🌍'} #${index + 1}</div>
            <div class="leaderboard-player">
                <span class="player-name">${playerDisplay}</span>
                <span class="player-chain">${chainIcon} ${chainName}</span>
            </div>
            <div class="leaderboard-stats">
                <span class="stat-kills">⚔️ ${entry.kills}</span>
                ${survivalTimeText}
            </div>
        `;
        list.appendChild(item);
    });
}

// Функція для оновлення статусу Linera
function updateLineraStatus() {
    const statusElement = document.getElementById('lineraStatus');
    if (!statusElement) return;
    
    if (window.lineraIntegration && window.lineraIntegration.isInitialized) {
        const walletInfo = window.lineraIntegration.getWalletInfo();
        if (walletInfo && walletInfo.chainId) {
            const shortChainId = walletInfo.chainId.substring(0, 8) + '...' + walletInfo.chainId.substring(walletInfo.chainId.length - 6);
            statusElement.innerHTML = `⛓️ Підключено до Linera: ${shortChainId}`;
            statusElement.style.color = '#a0ffa0';
            statusElement.parentElement.style.borderColor = 'rgba(108, 255, 108, 0.8)';
        } else {
            statusElement.innerHTML = '🔄 Ініціалізація Linera...';
            statusElement.style.color = '#ffff80';
            statusElement.parentElement.style.borderColor = 'rgba(255, 255, 108, 0.8)';
        }
    } else {
        statusElement.innerHTML = '📱 Локальний режим (Linera недоступна)';
        statusElement.style.color = '#ffa0a0';
        statusElement.parentElement.style.borderColor = 'rgba(255, 108, 108, 0.8)';
    }
}

// Game logic
function spawnMob() {
    // Choose mob type based on allowed types
    const allowedTypes = gameState.allowedMobTypes;
    const type = allowedTypes[Math.floor(Math.random() * allowedTypes.length)];
    
    // World boundaries for spawning
    const worldMinX = -WORLD_WIDTH/2 + WORLD_BORDER + 20;
    const worldMaxX = WORLD_WIDTH/2 - WORLD_BORDER - 20;
    const worldMinY = -WORLD_HEIGHT/2 + WORLD_BORDER + 20;
    const worldMaxY = WORLD_HEIGHT/2 - WORLD_BORDER - 20;
    
    // Calculate camera bounds with extra margin for guaranteed off-screen spawn
    const margin = 200; // Extra space outside camera view
    const cameraLeft = camera.x - margin;
    const cameraRight = camera.x + canvas.width + margin;
    const cameraTop = camera.y - margin;
    const cameraBottom = camera.y + canvas.height + margin;
    
    let x, y;
    let attempts = 0;
    let validSpawn = false;
    
    // Try to spawn outside camera view
    while (!validSpawn && attempts < 10) {
        const side = Math.floor(Math.random() * 4); // Choose which side to spawn from
        
        switch (side) {
            case 0: // Left of camera
                x = Math.max(worldMinX, cameraLeft - Math.random() * 300);
                y = cameraTop + Math.random() * (cameraBottom - cameraTop);
                break;
            case 1: // Right of camera
                x = Math.min(worldMaxX, cameraRight + Math.random() * 300);
                y = cameraTop + Math.random() * (cameraBottom - cameraTop);
                break;
            case 2: // Above camera
                x = cameraLeft + Math.random() * (cameraRight - cameraLeft);
                y = Math.max(worldMinY, cameraTop - Math.random() * 300);
                break;
            case 3: // Below camera
                x = cameraLeft + Math.random() * (cameraRight - cameraLeft);
                y = Math.min(worldMaxY, cameraBottom + Math.random() * 300);
                break;
        }
        
        // Ensure spawn is within world bounds
        x = Math.max(worldMinX, Math.min(worldMaxX, x));
        y = Math.max(worldMinY, Math.min(worldMaxY, y));
        
        // Check if spawn is outside camera view
        const outsideCamera = (x < cameraLeft || x > cameraRight || y < cameraTop || y > cameraBottom);
        if (outsideCamera) {
            validSpawn = true;
        }
        
        attempts++;
    }
    
    // Fallback: spawn at world edges if no valid position found
    if (!validSpawn) {
        const edges = [
            { x: worldMinX + 50, y: player.y + (Math.random() - 0.5) * 200 }, // Left world edge
            { x: worldMaxX - 50, y: player.y + (Math.random() - 0.5) * 200 }, // Right world edge
            { x: player.x + (Math.random() - 0.5) * 200, y: worldMinY + 50 }, // Top world edge
            { x: player.x + (Math.random() - 0.5) * 200, y: worldMaxY - 50 }  // Bottom world edge
        ];
        
        const randomEdge = edges[Math.floor(Math.random() * edges.length)];
        x = randomEdge.x;
        y = randomEdge.y;
    }
    
    mobs.push({
        x: x,
        y: y,
        type: type,
        hp: mobTypes[type].hp,
        maxHp: mobTypes[type].hp,
        lastAttack: 0
    });
}

function activateSword() {
    if (player.sword.active) return; // Prevent multiple swings
    
    // Find closest mob for auto-aim
    let closestMob = null;
    let closestDistance = Infinity;
    
    mobs.forEach(mob => {
        const distance = Math.sqrt((mob.x - player.x) ** 2 + (mob.y - player.y) ** 2);
        if (distance < 120 && distance < closestDistance) { // Within sword range
            closestDistance = distance;
            closestMob = mob;
        }
    });
    
    // Set target angle based on closest mob or current mouse position
    if (closestMob) {
        player.sword.targetAngle = Math.atan2(closestMob.y - player.y, closestMob.x - player.x);
    } else {
        player.sword.targetAngle = player.sword.angle; // Use current angle if no mob nearby
    }
    
    player.sword.active = true;
    player.sword.swingProgress = 0;
    
    // Reset hit flags for all mobs
    mobs.forEach(mob => {
        mob.hitThisSwing = false;
    });
}

function createDrop(x, y) {
    const rand = Math.random();
    let type;
    
    if (rand < 0.6) { // 60% chance
        type = 'coin';
    } else if (rand < 0.85) { // 25% chance (0.6 + 0.25 = 0.85)
        type = 'cake';
    } else if (rand < 0.95) { // 10% chance (0.85 + 0.10 = 0.95)
        type = 'sword2';
    } else { // 5% chance (remaining)
        type = 'sword3';
    }
    
    drops.push({
        x: x,
        y: y,
        type: type,
        size: dropTypes[type].size
    });
}

function updatePlayer() {
    // Movement
    if (keys['w'] || keys['arrowup']) player.y -= player.speed;
    if (keys['s'] || keys['arrowdown']) player.y += player.speed;
    if (keys['a'] || keys['arrowleft']) player.x -= player.speed;
    if (keys['d'] || keys['arrowright']) player.x += player.speed;
    
    // Keep player within world boundaries
    const halfWidth = player.width / 2;
    const halfHeight = player.height / 2;
    const minX = -WORLD_WIDTH/2 + WORLD_BORDER + halfWidth;
    const maxX = WORLD_WIDTH/2 - WORLD_BORDER - halfWidth;
    const minY = -WORLD_HEIGHT/2 + WORLD_BORDER + halfHeight;
    const maxY = WORLD_HEIGHT/2 - WORLD_BORDER - halfHeight;
    
    player.x = Math.max(minX, Math.min(maxX, player.x));
    player.y = Math.max(minY, Math.min(maxY, player.y));
    
    // Update sword swing animation
    if (player.sword.active) {
        player.sword.swingProgress += 1 / player.sword.swingDuration;
        
        if (player.sword.swingProgress >= 1) {
            player.sword.active = false;
            player.sword.swingProgress = 0;
        } else {
            // Create arc swing animation
            const swingArc = Math.PI / 3; // 60 degree arc
            const centerAngle = player.sword.targetAngle;
            const progress = player.sword.swingProgress;
            
            // Smooth swing using sine wave for natural motion
            const animatedProgress = Math.sin(progress * Math.PI);
            player.sword.angle = centerAngle - swingArc/2 + swingArc * animatedProgress;
        }
    }
    
    // Update camera to follow player
    updateCamera();
}

function updateMobs() {
    for (let i = mobs.length - 1; i >= 0; i--) {
        const mob = mobs[i];
        const mobStats = getScaledMobStats(mob.type);
        
        // Move towards player (optimized calculation)
        const dx = player.x - mob.x;
        const dy = player.y - mob.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
            const moveX = (dx / distance) * mobStats.speed;
            const moveY = (dy / distance) * mobStats.speed;
            mob.x += moveX;
            mob.y += moveY;
        }
        
        // Attack player if close (using scaled damage)
        if (distance < 30 && Date.now() - mob.lastAttack > 1000) {
            const damage = mobStats.damage;
            player.health -= damage;
            mob.lastAttack = Date.now();
            showNotification(`-${damage} ХП`, 'damage');
            
            if (player.health <= 0) {
                showNotification('Гра закінчена!', 'damage');
                setTimeout(() => endGame(), 1000);
                return;
            }
        }
        
        // Check sword collision (adjusted for new sword position)
        if (player.sword.active && distance < 80) {
            // Check if this mob was already hit this swing
            if (!mob.hitThisSwing) {
                const currentDamage = player.sword.tempSword ? 
                    swordData[player.sword.tempSword].damage : 
                    swordData[player.sword.level].damage;
                
                mob.hp -= currentDamage;
                mob.hitThisSwing = true;
                
                // Visual feedback for hit
                mob.lastHit = Date.now();
                
                // Only reduce temp sword uses when actually hitting a mob
                if (player.sword.tempSword) {
                    player.sword.tempUses--;
                    if (player.sword.tempUses <= 0) {
                        player.sword.tempSword = null;
                        showNotification('Тимчасовий меч зламався!', 'damage');
                    }
                }
                
                if (mob.hp <= 0) {
                    // Create drop
                    createDrop(mob.x, mob.y);
                    
                    // Remove mob
                    mobs.splice(i, 1);
                    gameState.kills++;
                    
                    // Update blockchain with current kills (async, non-blocking)
                    if (window.leaderboardBlockchain && window.leaderboardBlockchain.isReady()) {
                        window.leaderboardBlockchain.updateKills(gameState.kills).catch(error => {
                            console.log('Non-critical blockchain update error:', error);
                        });
                    }
                    
                    continue;
                }
            }
        }
    }
    
    // Remove mobs too far from player (optimized distance check)
    const maxDistance = 800;
    const maxDistanceSquared = maxDistance * maxDistance; // Avoid sqrt calculation
    
    mobs = mobs.filter(mob => {
        const dx = mob.x - player.x;
        const dy = mob.y - player.y;
        const distanceSquared = dx * dx + dy * dy;
        return distanceSquared < maxDistanceSquared;
    });
}

function updateDrops() {
    for (let i = drops.length - 1; i >= 0; i--) {
        const drop = drops[i];
        const dx = player.x - drop.x;
        const dy = player.y - drop.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 25) {
            switch (drop.type) {
                case 'coin':
                    gameState.currentGameCoins += dropTypes.coin.value;
                    showNotification(`+${dropTypes.coin.value} монета`, 'coin');
                    break;
                case 'cake':
                    const healAmount = Math.floor(player.maxHealth * 0.2);
                    player.health = Math.min(player.maxHealth, 
                        player.health + healAmount);
                    showNotification(`+${healAmount} ХП`, 'heal');
                    break;
                case 'sword2':
                case 'sword3':
                    const swordLevel = drop.type === 'sword2' ? 2 : 3;
                    // Only give temporary sword if player doesn't have permanent upgrade of this level or higher
                    if (gameState.swordLevel < swordLevel) {
                        player.sword.tempSword = swordLevel;
                        player.sword.tempUses = 5;
                        showNotification(`Меч рівень ${swordLevel}! (5 ударів)`, 'default');
                    } else {
                        // Give 1 coin instead if player already has this upgrade
                        gameState.currentGameCoins += 1;
                        showNotification(`+1 монета (вже маєте цей меч)`, 'coin');
                    }
                    break;
            }
            
            drops.splice(i, 1);
        }
    }
}

function updateUI() {
    document.getElementById('coins').textContent = gameState.currentGameCoins;
    document.getElementById('kills').textContent = gameState.kills;
    
    // Show game time
    const gameTimeElement = document.getElementById('game-time');
    if (!gameTimeElement) {
        const gameTimeDiv = document.createElement('div');
        gameTimeDiv.id = 'game-time';
        gameTimeDiv.style.cssText = `
            position: fixed;
            top: 80px;
            left: 20px;
            color: #87CEEB;
            font-family: 'Orbitron', monospace;
            font-size: 16px;
            font-weight: bold;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
            z-index: 1000;
            background: rgba(0,0,0,0.7);
            padding: 8px 12px;
            border-radius: 5px;
            border: 2px solid #87CEEB;
        `;
        document.body.appendChild(gameTimeDiv);
    }
    
    const minutes = Math.floor(gameState.gameSeconds / 60);
    const seconds = gameState.gameSeconds % 60;
    document.getElementById('game-time').textContent = `Час: ${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    // Show temp sword uses if player has a temporary sword
    const swordUsesElement = document.getElementById('sword-uses');
    if (player.sword.tempSword) {
        if (!swordUsesElement) {
            // Create sword uses display
            const swordUsesDiv = document.createElement('div');
            swordUsesDiv.id = 'sword-uses';
            swordUsesDiv.style.cssText = `
                position: fixed;
                top: 120px;
                left: 20px;
                color: #FFD700;
                font-family: 'Orbitron', monospace;
                font-size: 16px;
                font-weight: bold;
                text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
                z-index: 1000;
                background: rgba(0,0,0,0.7);
                padding: 8px 12px;
                border-radius: 5px;
                border: 2px solid #FFD700;
            `;
            document.body.appendChild(swordUsesDiv);
        }
        document.getElementById('sword-uses').textContent = `Меч ${player.sword.tempSword}: ${player.sword.tempUses} ударів`;
    } else if (swordUsesElement) {
        // Remove sword uses display when no temp sword
        swordUsesElement.remove();
    }
    
    // Show mob count in UI for monitoring performance
    const mobCountElement = document.getElementById('mob-count');
    if (!mobCountElement) {
        // Create mob count display
        const mobCountDiv = document.createElement('div');
        mobCountDiv.id = 'mob-count';
        mobCountDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 160px;
            color: #FF6B6B;
            font-family: 'Orbitron', monospace;
            font-size: 14px;
            font-weight: bold;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
            z-index: 1000;
            background: rgba(0,0,0,0.7);
            padding: 6px 10px;
            border-radius: 5px;
            border: 1px solid #FF6B6B;
        `;
        document.body.appendChild(mobCountDiv);
    }
    document.getElementById('mob-count').textContent = `Мобів: ${mobs.length}/${gameState.absoluteMaxMobs}`;
    
    // Show difficulty scaling info only after 3rd mob appears
    const difficultyElement = document.getElementById('difficulty-info');
    
    if (gameState.gameSeconds >= 180) {
        // Show scaling info after 3 minutes
        if (!difficultyElement) {
            const difficultyDiv = document.createElement('div');
            difficultyDiv.id = 'difficulty-info';
            difficultyDiv.style.cssText = `
                position: fixed;
                top: 50px;
                right: 20px;
                color: #FFA500;
                font-family: 'Orbitron', monospace;
                font-size: 13px;
                font-weight: bold;
                text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
                z-index: 1000;
                background: rgba(0,0,0,0.7);
                padding: 6px 10px;
                border-radius: 5px;
                border: 1px solid #FFA500;
            `;
            document.body.appendChild(difficultyDiv);
        }
        
        const minutesAfterThirdMob = (gameState.gameSeconds - 180) / 60;
        const speedBonus = Math.floor(minutesAfterThirdMob * 5);
        const damageBonus = Math.floor(minutesAfterThirdMob * 10);
        document.getElementById('difficulty-info').textContent = `+${speedBonus}% швидкість, +${damageBonus}% урон`;
    } else if (difficultyElement) {
        // Remove element if it exists but we're before 3 minutes
        difficultyElement.remove();
    }
    
    // Debug info (can be removed later)
    // console.log(`Mobs: ${mobs.length}/${gameState.maxMobs} (target: ${gameState.targetMobs})`);
}

function render() {
    // Clear canvas with background (optimized)
    if (backgroundImage) {
        // Draw background image covering the entire world
        ctx.save();
        ctx.translate(-camera.x, -camera.y);
        
        // Draw the background image to cover the world
        const worldLeft = -WORLD_WIDTH/2;
        const worldTop = -WORLD_HEIGHT/2;
        ctx.drawImage(backgroundImage, worldLeft, worldTop, WORLD_WIDTH, WORLD_HEIGHT);
        
        ctx.restore();
    } else {
        // Optimized fallback: solid color instead of gradient
        ctx.fillStyle = '#5a6d33';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    // Save context and apply camera transformation
    ctx.save();
    ctx.translate(-camera.x, -camera.y);
    
    // Optional: Draw subtle grid pattern over background (uncomment if needed)
    /*
    ctx.strokeStyle = 'rgba(255,255,255,0.02)';
    ctx.lineWidth = 1;
    
    const gridSize = 40;
    const worldLeft = -WORLD_WIDTH/2 + WORLD_BORDER;
    const worldRight = WORLD_WIDTH/2 - WORLD_BORDER;
    const worldTop = -WORLD_HEIGHT/2 + WORLD_BORDER;
    const worldBottom = WORLD_HEIGHT/2 - WORLD_BORDER;
    
    const startX = Math.max(worldLeft, Math.floor(camera.x / gridSize) * gridSize);
    const startY = Math.max(worldTop, Math.floor(camera.y / gridSize) * gridSize);
    const endX = Math.min(worldRight, startX + canvas.width + gridSize);
    const endY = Math.min(worldBottom, startY + canvas.height + gridSize);
    
    for (let x = startX; x < endX; x += gridSize) {
        if (x >= worldLeft && x <= worldRight) {
            ctx.beginPath();
            ctx.moveTo(x, Math.max(worldTop, startY));
            ctx.lineTo(x, Math.min(worldBottom, endY));
            ctx.stroke();
        }
    }
    for (let y = startY; y < endY; y += gridSize) {
        if (y >= worldTop && y <= worldBottom) {
            ctx.beginPath();
            ctx.moveTo(Math.max(worldLeft, startX), y);
            ctx.lineTo(Math.min(worldRight, endX), y);
            ctx.stroke();
        }
    }
    */
    
    // Draw world boundaries (walls)
    const wallLeft = -WORLD_WIDTH/2;
    const wallRight = WORLD_WIDTH/2;
    const wallTop = -WORLD_HEIGHT/2;
    const wallBottom = WORLD_HEIGHT/2;
    
    ctx.fillStyle = '#2d3a0f';
    ctx.strokeStyle = '#5a6d33';
    ctx.lineWidth = 3;
    
    // Left wall
    ctx.fillRect(wallLeft, wallTop, WORLD_BORDER, WORLD_HEIGHT);
    ctx.strokeRect(wallLeft, wallTop, WORLD_BORDER, WORLD_HEIGHT);
    
    // Right wall
    ctx.fillRect(wallRight - WORLD_BORDER, wallTop, WORLD_BORDER, WORLD_HEIGHT);
    ctx.strokeRect(wallRight - WORLD_BORDER, wallTop, WORLD_BORDER, WORLD_HEIGHT);
    
    // Top wall
    ctx.fillRect(wallLeft, wallTop, WORLD_WIDTH, WORLD_BORDER);
    ctx.strokeRect(wallLeft, wallTop, WORLD_WIDTH, WORLD_BORDER);
    
    // Bottom wall
    ctx.fillRect(wallLeft, wallBottom - WORLD_BORDER, WORLD_WIDTH, WORLD_BORDER);
    ctx.strokeRect(wallLeft, wallBottom - WORLD_BORDER, WORLD_WIDTH, WORLD_BORDER);
    
    // Add corner decorations
    ctx.fillStyle = '#1a2208';
    const cornerSize = WORLD_BORDER;
    
    // Corner blocks for visual appeal
    ctx.fillRect(wallLeft, wallTop, cornerSize, cornerSize);
    ctx.fillRect(wallRight - cornerSize, wallTop, cornerSize, cornerSize);
    ctx.fillRect(wallLeft, wallBottom - cornerSize, cornerSize, cornerSize);
    ctx.fillRect(wallRight - cornerSize, wallBottom - cornerSize, cornerSize, cornerSize);
    
    // Draw player
    if (dannyImage) {
        ctx.save();
        ctx.shadowBlur = 10;
        ctx.shadowColor = 'rgba(65,105,225,0.5)';
        
        // Draw Danny image (3x bigger)
        const playerSize = Math.max(player.width, player.height) * 2;
        ctx.drawImage(dannyImage, 
                     player.x - playerSize/2, player.y - playerSize/2, 
                     playerSize, playerSize);
        
        ctx.shadowBlur = 0;
        ctx.restore();
    } else {
        // Fallback to colored rectangle
        ctx.fillStyle = player.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = 'rgba(65,105,225,0.5)';
        ctx.fillRect(player.x - player.width/2, player.y - player.height/2, 
                     player.width, player.height);
        ctx.shadowBlur = 0;
    }
    
    // Draw player health bar above head (in world coordinates)
    const healthBarWidth = 40;
    const healthBarHeight = 6;
    const healthBarX = player.x - healthBarWidth/2;
    const healthBarY = player.y - player.height/2 - 15;
    
    // Health bar background
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fillRect(healthBarX - 2, healthBarY - 2, healthBarWidth + 4, healthBarHeight + 4);
    
    // Health bar border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(healthBarX - 2, healthBarY - 2, healthBarWidth + 4, healthBarHeight + 4);
    
    // Health bar fill
    const healthPercent = player.health / player.maxHealth;
    const healthColor = healthPercent > 0.6 ? '#4CAF50' : 
                       healthPercent > 0.3 ? '#FFC107' : '#F44336';
    ctx.fillStyle = healthColor;
    ctx.fillRect(healthBarX, healthBarY, healthBarWidth * healthPercent, healthBarHeight);
    
    // Draw sword if active
    if (player.sword.active) {
        const swordLevel = player.sword.tempSword || player.sword.level;
        
        // Draw sword image if loaded
        if (swordImages[swordLevel]) {
            ctx.save();
            ctx.translate(player.x, player.y);
            ctx.rotate(player.sword.angle);
            
            // Add glow effect
            ctx.shadowBlur = 15;
            ctx.shadowColor = swordData[swordLevel].color;
            
            // Draw sword image (smaller and further from player)
            const swordWidth = 55; // Reduced from 80
            const swordHeight = 22; // Reduced from 30
            const swordOffset = 25; // Distance from player center
            ctx.drawImage(swordImages[swordLevel], 
                         swordOffset, -swordHeight/2, swordWidth, swordHeight);
            
            ctx.shadowBlur = 0;
            ctx.restore();
        } else {
            // Fallback to simple sword shape
            ctx.save();
            ctx.translate(player.x, player.y);
            ctx.rotate(player.sword.angle);
            
            ctx.fillStyle = swordData[swordLevel].color;
            ctx.shadowBlur = 12;
            ctx.shadowColor = swordData[swordLevel].color;
            
            // Draw sword blade (smaller and further from player)
            const swordOffset = 25; // Distance from player center
            ctx.fillRect(swordOffset, -6, 40, 12); // Reduced from 60x16
            // Draw sword handle
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(swordOffset - 15, -3, 12, 6); // Reduced handle
            
            ctx.shadowBlur = 0;
            ctx.restore();
        }
    }
    
    // Draw mobs (optimized rendering)
    mobs.forEach(mob => {
        const mobData = mobTypes[mob.type];
        
        // Simple flash effect (no heavy operations)
        const timeSinceHit = Date.now() - (mob.lastHit || 0);
        const isFlashing = timeSinceHit < 100; // Shorter flash duration
        
        // Draw mob using image if available
        if (mobImages[mob.type]) {
            // Minimal glow effect for performance
            if (isFlashing) {
                ctx.shadowBlur = 5;
                ctx.shadowColor = '#FFFFFF';
            }
            
            const size = mobData.size * 3; // Make images 3x bigger
            ctx.drawImage(mobImages[mob.type], 
                         mob.x - size/2, mob.y - size/2, size, size);
            
            if (isFlashing) {
                ctx.shadowBlur = 0;
            }
        } else {
            // Optimized fallback rendering
            ctx.fillStyle = isFlashing ? '#FFFFFF' : mobData.color;
            
            const size = mobData.size;
            const x = mob.x - size/2;
            const y = mob.y - size/2;
            
            ctx.fillRect(x, y, size, size); // Simple rectangle instead of rounded
        }
        
        // Health bar for damaged mobs
        if (mob.hp < mob.maxHp) {
            const barWidth = mobData.size;
            const barHeight = 4;
            const barX = mob.x - barWidth/2;
            const barY = mob.y - mobData.size/2 - 10;
            
            // Health bar background
            ctx.fillStyle = 'rgba(0,0,0,0.8)';
            ctx.fillRect(barX - 1, barY - 1, barWidth + 2, barHeight + 2);
            
            // Health bar fill
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(barX, barY, barWidth, barHeight);
            ctx.fillStyle = '#00ff00';
            ctx.fillRect(barX, barY, (mob.hp / mob.maxHp) * barWidth, barHeight);
            
            // Health bar border
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            ctx.strokeRect(barX - 1, barY - 1, barWidth + 2, barHeight + 2);
        }
    });
    
    // Draw drops with optimized animations
    const time = Date.now() * 0.003; // Calculate once outside loop
    drops.forEach((drop, index) => {
        const dropData = dropTypes[drop.type];
        const bounce = Math.sin(time + index) * 2; // Reduced bounce
        const rotation = time + index;
        
        ctx.save();
        ctx.translate(drop.x, drop.y + bounce);
        
        // Minimal glow effect for performance
        ctx.shadowBlur = 8;
        ctx.shadowColor = dropData.color;
        
        if (drop.type === 'coin') {
            // Draw spinning coin
            ctx.rotate(rotation);
            ctx.fillStyle = dropData.color;
            ctx.beginPath();
            ctx.ellipse(0, 0, drop.size, drop.size * Math.abs(Math.cos(rotation)), 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Add inner circle
            ctx.fillStyle = '#FFB000';
            ctx.beginPath();
            ctx.ellipse(0, 0, drop.size * 0.6, drop.size * 0.6 * Math.abs(Math.cos(rotation)), 0, 0, Math.PI * 2);
            ctx.fill();
        } else if (drop.type === 'cake') {
            // Draw cake using image or fallback
            const pulse = 1 + Math.sin(time * 2 + index) * 0.2;
            ctx.scale(pulse, pulse);
            
            if (cakeImage) {
                // Draw actual cake image
                const cakeSize = drop.size * 2; // Make cake bigger
                ctx.drawImage(cakeImage, -cakeSize/2, -cakeSize/2, cakeSize, cakeSize);
            } else {
                // Fallback to original drawing
                ctx.fillStyle = dropData.color;
                ctx.beginPath();
                ctx.arc(0, 0, drop.size, 0, Math.PI * 2);
                ctx.fill();
                
                // Add cake details
                ctx.fillStyle = '#FF69B4';
                ctx.beginPath();
                ctx.arc(0, -drop.size * 0.3, drop.size * 0.3, 0, Math.PI * 2);
                ctx.fill();
            }
        } else if (drop.type === 'sword2' || drop.type === 'sword3') {
            // Draw sword drops using actual sword images
            const swordLevel = drop.type === 'sword2' ? 2 : 3;
            
            ctx.rotate(rotation * 0.5);
            
            if (swordImages[swordLevel]) {
                // Draw actual sword image
                const swordWidth = drop.size * 3;
                const swordHeight = drop.size * 1.2;
                ctx.drawImage(swordImages[swordLevel], 
                             -swordWidth/2, -swordHeight/2, swordWidth, swordHeight);
            } else {
                // Fallback drawing
                ctx.fillStyle = dropData.color;
                ctx.fillRect(-drop.size * 1.5, -drop.size * 0.3, drop.size * 3, drop.size * 0.6);
                
                ctx.fillStyle = '#8B4513';
                ctx.fillRect(-drop.size * 0.5, -drop.size * 0.4, drop.size, drop.size * 0.8);
            }
        }
        
        ctx.shadowBlur = 0;
        ctx.restore();
    });
    
    // Restore context (return to screen coordinates)
    ctx.restore();
    
    // Draw mini-map in screen coordinates
    const miniMapSize = 120;
    const miniMapX = canvas.width - miniMapSize - 20;
    const miniMapY = 20;
    
    // Mini-map background
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(miniMapX, miniMapY, miniMapSize, miniMapSize);
    
    // Mini-map border
    ctx.strokeStyle = '#ffdd44';
    ctx.lineWidth = 2;
    ctx.strokeRect(miniMapX, miniMapY, miniMapSize, miniMapSize);
    
    // Draw world boundaries on mini-map
    ctx.strokeStyle = '#5a6d33';
    ctx.lineWidth = 1;
    ctx.strokeRect(miniMapX + 5, miniMapY + 5, miniMapSize - 10, miniMapSize - 10);
    
    // Draw player position on mini-map
    const playerMapX = miniMapX + 5 + ((player.x + WORLD_WIDTH/2) / WORLD_WIDTH) * (miniMapSize - 10);
    const playerMapY = miniMapY + 5 + ((player.y + WORLD_HEIGHT/2) / WORLD_HEIGHT) * (miniMapSize - 10);
    
    ctx.fillStyle = '#4169E1';
    ctx.beginPath();
    ctx.arc(playerMapX, playerMapY, 3, 0, Math.PI * 2);
    ctx.fill();
    
    // Mini-map label
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Карта', miniMapX + miniMapSize/2, miniMapY + miniMapSize + 15);
}

// Update difficulty progression
function updateDifficulty() {
    // Update game time in seconds
    gameState.gameSeconds = Math.floor(gameState.gameTime / 60);
    
    // Mob type progression (revised timings)
    if (gameState.gameSeconds >= 60 && !gameState.allowedMobTypes.includes(2)) {
        gameState.allowedMobTypes.push(2);
        showNotification('Нові вороги з\'явилися!', 'damage');
    }
    if (gameState.gameSeconds >= 180 && !gameState.allowedMobTypes.includes(3)) {
        gameState.allowedMobTypes.push(3);
        showNotification('Сильні вороги з\'явилися!', 'damage');
    }
    
    // Dynamic mob count based on time (with hard limits for performance)
    const baseTargetMobs = 3;
    const baseMaxMobs = 8;
    
    // Gradually increase mob count over time but cap at absoluteMaxMobs
    const difficultyMultiplier = 1 + Math.min(gameState.gameSeconds / 120, 1.5); // Max 2.5x after 2 minutes
    gameState.targetMobs = Math.min(Math.floor(baseTargetMobs * difficultyMultiplier), gameState.absoluteMaxMobs - 3);
    gameState.maxMobs = Math.min(Math.floor(baseMaxMobs * difficultyMultiplier), gameState.absoluteMaxMobs);
    
    // Spawn rate for maintaining mob count
    const baseSpawnRate = 120; // 2 seconds base
    const minSpawnRate = 45; // Fastest spawn every 0.75 seconds
    const difficultyIncrease = Math.min(gameState.gameSeconds * 1.5, 75);
    gameState.spawnRate = Math.max(minSpawnRate, baseSpawnRate - difficultyIncrease);
}

function gameLoop() {
    if (!gameState.isGameRunning) return;
    
    gameState.gameTime++;
    
    // Update difficulty progression
    updateDifficulty();
    
    // Smart mob spawning system with absolute limit
    const currentMobCount = mobs.length;
    
    // Strict check: NEVER exceed absolute maximum
    if (currentMobCount >= gameState.absoluteMaxMobs) {
        // Don't spawn any new mobs - performance protection
        console.log(`Mob limit reached: ${currentMobCount}/${gameState.absoluteMaxMobs}`);
    } else {
        // Always try to maintain target mob count
        if (currentMobCount < gameState.targetMobs) {
            // Spawn more frequently if under target
            if (gameState.gameTime % Math.max(30, gameState.spawnRate / 2) === 0) {
                spawnMob();
            }
        } else if (currentMobCount < gameState.maxMobs) {
            // Normal spawn rate if between target and max
            if (gameState.gameTime % gameState.spawnRate === 0) {
                spawnMob();
            }
        }
        // Don't spawn if at or above max mob count
    }
    
    updatePlayer();
    updateMobs();
    updateDrops();
    updateUI();
    render();
    
    requestAnimationFrame(gameLoop);
}

// Initialize when page loads
window.addEventListener('load', init); 
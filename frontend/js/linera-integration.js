// Linera Integration для Danny VS CatGirls
class LineraGameIntegration {
    constructor() {
        this.wallet = null;
        this.client = null;
        this.chainId = null;
        this.isInitialized = false;
        this.gameContract = null;
        this.playerName = null;
        this.isGameConfigured = false;
        
        // Configuration for Danny VS CatGirls contract
        this.appId = null; // Will be set from environment or prompt
        this.leaderboardChainId = null; // Will be set during setup
    }

    async initialize() {
        try {
            this.updateStatus('🔄 Завантаження Linera SDK...');
            
            // Імпортуємо Linera модуль
            const linera = await import('@linera/client');
            console.log('Linera module loaded:', linera);
            
            // Ініціалізація WebAssembly
            this.updateStatus('🔄 Ініціалізація WebAssembly...');
            await linera.default();
            
            // Підключення до faucet і створення кошелька
            this.updateStatus('🔄 Створення кошелька...');
            const faucet = await new linera.Faucet(
                'https://faucet.testnet-babbage.linera.net'
            );
            
            this.wallet = await faucet.createWallet();
            this.client = await new linera.Client(this.wallet);
            
            // Отримуємо новий ланцюг з токенами
            this.updateStatus('🔄 Отримання тестових токенів...');
            this.chainId = await faucet.claimChain(this.client);
            
            // Ініціалізуємо контракт
            await this.initializeContract();
            
            // Оновлюємо UI
            this.updateChainInfo();
            this.updateStatus('✅ Готово до гри!');
            
            this.isInitialized = true;
            console.log('Linera initialized successfully:', {
                chainId: this.chainId,
                wallet: this.wallet,
                playerName: this.playerName
            });
            
            // Показуємо інформацію про ланцюг та оновлюємо статус лідерборда через 2 секунди
            setTimeout(() => {
                document.getElementById('chainInfo').style.display = 'block';
                this.updateLeaderboardStatus();
            }, 2000);
            
        } catch (error) {
            console.error('Failed to initialize Linera wallet:', error);
            this.updateStatus('❌ Помилка підключення до Linera');
            
            // Показуємо детальну помилку в консолі
            if (error.message) {
                console.error('Error message:', error.message);
            }
        }
    }

    async initializeContract() {
        try {
            // Get player name
            this.playerName = this.promptPlayerName();
            
            // Set app ID (you'll need to replace this with your deployed contract ID)
            this.appId = prompt('Введіть ID контракта Danny VS CatGirls (або залиште порожнім для тестування):') || 'default-app-id';
            
            // Use current chain as leaderboard chain for simplicity
            this.leaderboardChainId = this.chainId;
            
            // Initialize contract frontend
            this.gameContract = await this.client.frontend().application(this.appId);
            
            // Try to get current state
            const stateQuery = `query {
                playerName
                best
                isLeaderboardChain
            }`;
            
            const response = await this.gameContract.query(JSON.stringify({ query: stateQuery }));
            const data = JSON.parse(response).data;
            
            console.log('Current contract state:', data);
            
            // Set up the game if needed
            await this.setupGame();
            
        } catch (error) {
            console.error('Failed to initialize contract:', error);
            // Continue anyway - the contract might not be deployed yet
        }
    }

    async setupGame() {
        try {
            this.updateStatus('🔄 Налаштування гри...');
            
            const setupQuery = `mutation {
                setupGame(
                    leaderboardChainId: "${this.leaderboardChainId}",
                    leaderboardName: "${this.playerName}"
                )
            }`;
            
            const queryObject = { query: setupQuery };
            await this.gameContract.query(JSON.stringify(queryObject));
            console.log('Game setup completed with player:', this.playerName);
            this.isGameConfigured = true;
            
        } catch (error) {
            console.log('Game setup skipped:', error.message);
            // Continue anyway - might already be set up
        }
    }

    promptPlayerName() {
        const name = prompt('Введіть ваше ім\'я (макс. 20 символів):');
        if (name && name.trim()) {
            return name.trim().substring(0, 20);
        }
        return `Гравець${Math.floor(Math.random() * 1000)}`;
    }

    updateStatus(message) {
        const statusElement = document.getElementById('walletStatus');
        if (statusElement) {
            statusElement.textContent = message;
        }
    }

    updateChainInfo() {
        const chainIdElement = document.getElementById('chainId');
        if (chainIdElement && this.chainId) {
            chainIdElement.textContent = this.chainId.substring(0, 8) + '...';
        }
    }

    // Метод для отримання інформації про кошелек
    getWalletInfo() {
        if (!this.isInitialized) {
            return null;
        }
        
        return {
            chainId: this.chainId,
            wallet: this.wallet,
            client: this.client
        };
    }

    // Метод для перевірки балансу (для майбутнього використання)
    async getBalance() {
        if (!this.isInitialized || !this.client) {
            throw new Error('Linera not initialized');
        }
        
        try {
            // Тут можна додати логіку для отримання балансу
            // return await this.client.getBalance();
            return 0; // поки що заглушка
        } catch (error) {
            console.error('Failed to get balance:', error);
            throw error;
        }
    }

    // Метод для оновлення поточної кількості вбивств під час гри
    async updateKills(kills) {
        if (!this.isInitialized || !this.gameContract) {
            console.log('Contract not ready, skipping kills update');
            return false;
        }
        
        try {
            const updateQuery = `mutation {
                increment(value: 1)
            }`;
            
            const queryObject = { query: updateQuery };
            await this.gameContract.query(JSON.stringify(queryObject));
            return true;
        } catch (error) {
            console.error('Failed to update kills:', error);
            return false;
        }
    }

    // Метод для відправки фінального результату
    async submitFinalScore(kills, survivalTime) {
        if (!this.isInitialized || !this.gameContract) {
            console.log('Contract not ready, cannot submit score');
            return false;
        }
        
        try {
            // Submit the final score
            const submitQuery = `mutation {
                setBestAndSubmit(best: ${kills})
            }`;
            
            const queryObject = { query: submitQuery };
            await this.gameContract.query(JSON.stringify(queryObject));
            
            console.log('Score submitted successfully:', kills);
            
            // Fetch updated leaderboard
            await this.fetchLeaderboard();
            
            return true;
        } catch (error) {
            console.error('Failed to submit final score:', error);
            return false;
        }
    }

    // Метод для отримання лідерборда
    async fetchLeaderboard() {
        if (!this.isInitialized || !this.gameContract) {
            console.log('Contract not ready, cannot fetch leaderboard');
            return [];
        }
        
        try {
            // Request leaderboard update if we're configured
            if (this.isGameConfigured) {
                const requestQuery = `mutation {
                    requestLeaderboard
                }`;
                
                const queryObject = { query: requestQuery };
                await this.gameContract.query(JSON.stringify(queryObject));
            }
            
            // Fetch leaderboard data
            const leaderboardQuery = `query {
                leaderboard {
                    playerName
                    score
                    chainId
                    timestamp
                }
                myRank
                playerName
                best
            }`;
            
            const queryObject = { query: leaderboardQuery };
            const response = await this.gameContract.query(JSON.stringify(queryObject));
            const data = JSON.parse(response).data;
            
            console.log('Leaderboard data:', data);
            
            return {
                leaderboard: data.leaderboard || [],
                myRank: data.myRank,
                playerName: data.playerName,
                best: data.best
            };
            
        } catch (error) {
            console.error('Failed to fetch leaderboard:', error);
            return {
                leaderboard: [],
                myRank: null,
                playerName: this.playerName,
                best: 0
            };
        }
    }

    // Метод для отримання статистики гравця
    async getPlayerStats() {
        if (!this.isInitialized || !this.gameContract) {
            return {
                playerName: this.playerName || 'Unknown',
                best: 0,
                currentValue: 0,
                rank: null
            };
        }
        
        try {
            const statsQuery = `query {
                playerName
                best
                value
                myRank
            }`;
            
            const queryObject = { query: statsQuery };
            const response = await this.gameContract.query(JSON.stringify(queryObject));
            const data = JSON.parse(response).data;
            
            return {
                playerName: data.playerName,
                best: data.best,
                currentValue: data.value,
                rank: data.myRank
            };
            
        } catch (error) {
            console.error('Failed to get player stats:', error);
            return {
                playerName: this.playerName || 'Unknown',
                best: 0,
                currentValue: 0,
                rank: null
            };
        }
    }

    updateLeaderboardStatus() {
        const statusElement = document.getElementById('leaderboardStatusText');
        if (statusElement) {
            if (this.isInitialized && this.gameContract) {
                statusElement.textContent = 'Активний';
                document.getElementById('leaderboardStatus').style.display = 'block';
            } else {
                statusElement.textContent = 'Недоступний';
                document.getElementById('leaderboardStatus').style.display = 'block';
            }
        }
    }
}

// Створюємо глобальний екземпляр
window.lineraIntegration = new LineraGameIntegration();

// Автоматично ініціалізуємо при завантаженні сторінки
document.addEventListener('DOMContentLoaded', () => {
    window.lineraIntegration.initialize();
});

export default LineraGameIntegration; 
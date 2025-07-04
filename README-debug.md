# Danny VS CatGirls - Linera Smart Contract Game

Це гра на блокчейні Linera версії 0.14.1 з централізованим лідербордом.

## Архітектура

### Централізований лідерборд

Нова архітектура використовує **централізований підхід** для зберігання даних лідерборду:

1. **Один центральний ланцюжок лідерборду** - зберігає дані всіх гравців
2. **Гравецькі ланцюжки** - кожен гравець має свій ланцюжок для локальної гри
3. **Міжланцюгові повідомлення** - автоматична передача результатів до центрального лідерборду

### Як це працює

1. **Ініціалізація гравця:**
   - Гравець створює свій ланцюжок
   - Встановлює ім'я гравця (`SetPlayerName`)
   - Налаштовує ID центрального лідерборду (`SetLeaderboardChain`)

2. **Під час гри:**
   - Гравець збільшує рахунок (`Increment`)
   - Дані зберігаються локально на ланцюжку гравця

3. **Завершення гри:**
   - Гравець встановлює найкращий результат (`SetBest`)
   - **Автоматично** надсилається повідомлення `SubmitScore` до центрального лідерборду
   - Центральний лідерборд оновлює топ-10

4. **Перегляд лідерборду:**
   - Гравець запитує оновлення (`RequestLeaderboard`)
   - Центральний лідерборд надсилає актуальні дані
   - Гравець отримує оновлений лідерборд

## Структури даних

### Operations (Операції)
```rust
pub enum Operation {
    Increment { value: u64 },                    // Збільшити рахунок
    SetBest { best: u64 },                      // Встановити найкращий результат
    SetPlayerName { name: String },             // Встановити ім'я гравця
    SetLeaderboardChain { chain_id: ChainId },  // Налаштувати лідерборд
    RequestLeaderboard,                         // Запросити оновлення лідерборду
}
```

### Messages (Міжланцюгові повідомлення)
```rust
pub enum DannyGameMessage {
    SubmitScore {                               // Надіслати результат
        player_name: String,
        score: u64,
        player_chain_id: ChainId,
    },
    RequestLeaderboard {                        // Запросити лідерборд
        requester_chain_id: ChainId,
    },
    LeaderboardResponse {                       // Відповідь з лідербордом
        leaderboard: Vec<LeaderboardEntry>,
    },
}
```

### State (Стан контракту)
```rust
pub struct DannyGameState {
    pub value: RegisterView<u64>,                           // Поточний рахунок
    pub best: RegisterView<u64>,                           // Найкращий результат
    pub player_name: RegisterView<String>,                 // Ім'я гравця
    
    // Для центрального лідерборду
    pub leaderboard: MapView<String, LeaderboardEntry>,    // Всі гравці
    pub top_leaderboard: RegisterView<Vec<LeaderboardEntry>>, // Топ-10
    
    // Конфігурація
    pub leaderboard_chain_id: RegisterView<Option<ChainId>>, // ID лідерборду
    pub is_leaderboard_chain: RegisterView<bool>,           // Чи це центральний лідерборд
}
```

## Переваги нової архітектури

1. **Централізовані дані** - всі результати зберігаються в одному місці
2. **Автоматичне оновлення** - результати автоматично надсилаються до лідерборду
3. **Масштабованість** - необмежена кількість гравців
4. **Консистентність** - єдиний джерело правди для лідерборду
5. **Ефективність** - тільки топ-10 зберігається для швидкого доступу

## Розгортання

### 1. Створення центрального лідерборду
```bash
# Створити ланцюжок для лідерборду
linera create-chain --application danny-game

# Отримати ID ланцюжка (наприклад: e476187f7b99bd6bf4f6b2b6c98d3b0e8a8e8e8e...)
```

### 2. Налаштування гравців
```javascript
// У frontend коді
this.leaderboardChainId = "e476187f7b99bd6bf4f6b2b6c98d3b0e8a8e8e8e...";
await this.setLeaderboardChain();
```

### 3. Гра
Гравці можуть грати незалежно, їх результати автоматично синхронізуються з центральним лідербордом.

## Frontend Integration

Frontend автоматично:
- Налаштовує підключення до лідерборду
- Надсилає результати після кожної гри
- Запитує оновлення лідерборду
- Відображає актуальний топ-10

## Технічні деталі

- **Версія Linera:** 0.14.1
- **Мова програмування:** Rust
- **Frontend:** JavaScript з Linera SDK
- **Зберігання:** Linera Views (RegisterView, MapView)
- **Комунікація:** Linera Cross-Chain Messages

## Безпека

- Результати можуть бути оновлені тільки самим гравцем
- Центральний лідерборд приймає тільки кращі результати
- Всі операції захищені криптографічними підписами Linera

## Troubleshooting

Якщо виникають проблеми з десеріалізацією, переконайтеся що:
1. Версія Linera SDK 0.14.1
2. Всі типи правильно імплементують Serialize/Deserialize
3. InstantiationArgument має правильний тип (у нас `()`)

Це забезпечує стабільну роботу контракту без паніки під час виконання.

# Danny Game Contract Debug Tool

A tool for testing the Danny Game smart contract on the Linera blockchain.

## 📋 Description

This debug tool allows you to test all functions of your Danny Game contract:

- **Connect to the leaderboard** - set up the game with a leaderboard
- **Test operations** - increment, submit score, request leaderboard
- **Fetch data** - current game state, leaderboard, player ranking
- **Automated testing** - run a full test suite with one click

## 🔧 Setup

### Contract configuration

In the `danny-game-debug.js` file, your identifiers are already set:

```javascript
const DANNY_GAME_APP_ID = "fbed39bc36686dc65ed8d81047138f91cc82c3521158d09ec55891123409d203";
const LEADERBOARD_CHAIN_ID = "dfc88cbb06b5a844be804c5b9220c26ce7a2963cc06d47492bdf28c073892ac6";
```

### File structure

```
/
├── danny-game-debug.html     # Main page with UI
├── danny-game-debug.js       # Testing logic
├── README-debug.md           # This documentation
└── public/js/@linera/client/ # Linera Web client (from the main project)
```

## 🚀 Launch

### Option 1: Simple HTTP server

```bash
# Python 3
python -m http.server 8000

# Node.js
npx http-server -p 8000

# PHP
php -S localhost:8000
```

### Option 2: Use an existing server

Copy the files to your main project folder and open `danny-game-debug.html`.

## 💡 Usage

### Automated testing

1. Open `danny-game-debug.html` in your browser
2. Wait for the contract to initialize
3. Click **"Run Full Test Suite"** for comprehensive testing

### Manual testing

#### Set up the game
```javascript
// Via UI
dannyGameDebug.testSetupGame()

// Via browser console
dannyGameDebug.testSetupGame()
```

#### Test operations
```javascript
// Increment current value
dannyGameDebug.testIncrement()

// Submit best score
dannyGameDebug.testSetBestAndSubmit()

// Request leaderboard
dannyGameDebug.testRequestLeaderboard()
```

#### Fetch data
```javascript
// Current value
dannyGameDebug.getCurrentValue()

// Best score
dannyGameDebug.getBestScore()

// Player name
dannyGameDebug.getPlayerName()

// Leaderboard
dannyGameDebug.getLeaderboard()

// All data at once
dannyGameDebug.getAllGameData()
```

## 🔍 Contract functions

### Mutations (Operations)

1. **setupGame** - set up the game with a leaderboard
   ```graphql
   mutation {
     setupGame(
       leaderboardChainId: "CHAIN_ID",
       playerName: "Player_Name"
     )
   }
   ```

2. **increment** - increase the current score
   ```graphql
   mutation {
     increment(value: 5)
   }
   ```

3. **setBestAndSubmit** - set the best score and submit
   ```graphql
   mutation {
     setBestAndSubmit(best: 100)
   }
   ```

4. **requestLeaderboard** - request the leaderboard
   ```graphql
   mutation {
     requestLeaderboard
   }
   ```

### Queries

1. **value** - current value
2. **best** - best score
3. **playerName** - player name
4. **isLeaderboardChain** - whether this chain is the leaderboard
5. **leaderboard** - leaderboard data
6. **myRank** - current player's rank

## 🎯 Testing scenarios

### Basic scenario

1. **Setup Game** - set up the game
2. **Test Increment** - increase the score
3. **Submit Score** - submit the result
4. **Request Leaderboard** - request the leaderboard
5. **Get All Data** - check all data

### Leaderboard testing

1. Create several players with different scores
2. Check leaderboard sorting
3. Check player ranking
4. Check leaderboard updates

### Cross-chain communication testing

1. Set up the game on different chains
2. Check score submission to the leaderboard
3. Check data synchronization

## 🐛 Troubleshooting

### Common issues

1. **Contract does not initialize**
   - Make sure the Linera node is running
   - Check the APP ID is correct
   - Check the browser console for errors

2. **GraphQL errors**
   - Check query syntax
   - Make sure the required methods exist in the contract
   - Check the debug panel logs

3. **Leaderboard does not update**
   - Make sure the correct Chain ID is set
   - Check cross-chain communication
   - Try the Request Leaderboard button

### Logs

All actions are recorded in the Debug Log panel. Use them for troubleshooting.

## 📝 Useful commands

```javascript
// Clear logs
dannyGameDebug.clearLog()

// Manual logging
dannyGameDebug.log("Custom message", {data: "example"})

// List all available functions
console.log(window.dannyGameDebug)
```

## 🔗 Links

- [Linera Documentation](https://docs.linera.io)
- [GraphQL Documentation](https://graphql.org/learn/)
- [Linera Web Client](https://github.com/linera-io/linera-web)

## 📧 Support

If you have issues:

1. Check the logs in the Debug Log panel
2. Open the browser console (F12)
3. Check network requests in Developer Tools
4. Make sure all identifiers are correct

---

**Note**: This tool is for development and testing only. Do not use in production. 
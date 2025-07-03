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
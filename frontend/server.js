const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Cross-origin isolation headers for WASM threads/SharedArrayBuffer
app.use((req, res, next) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    next();
});

// Статичні файли
app.use(express.static('.'));
app.use('/assets', express.static('assets'));
app.use('/css', express.static('css'));
app.use('/js', express.static('js'));
app.use('/@linera', express.static('@linera'));

// Шлях до файлу з лідербордом
const LEADERBOARD_FILE = path.join(__dirname, 'leaderboard.json');

// Ініціалізація файлу лідерборду
function initLeaderboard() {
    if (!fs.existsSync(LEADERBOARD_FILE)) {
        fs.writeFileSync(LEADERBOARD_FILE, JSON.stringify([]));
    }
}

// Читання лідерборду
function readLeaderboard() {
    try {
        const data = fs.readFileSync(LEADERBOARD_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Помилка читання лідерборду:', error);
        return [];
    }
}

// Запис лідерборду
function writeLeaderboard(data) {
    try {
        fs.writeFileSync(LEADERBOARD_FILE, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error('Помилка запису лідерборду:', error);
        return false;
    }
}

// API ендпоінти

// Отримати лідерборд
app.get('/api/leaderboard', (req, res) => {
    try {
        const leaderboard = readLeaderboard();
        // Сортуємо за кількістю вбивств (найбільше спочатку)
        leaderboard.sort((a, b) => b.kills - a.kills);
        // Повертаємо топ 50
        res.json(leaderboard.slice(0, 50));
    } catch (error) {
        console.error('Помилка отримання лідерборду:', error);
        res.status(500).json({ error: 'Помилка сервера' });
    }
});

// Додати новий результат
app.post('/api/leaderboard', (req, res) => {
    try {
        const { playerWallet, chainId, kills } = req.body;
        
        // Валідація даних
        if (!playerWallet || kills === undefined || kills < 0) {
            return res.status(400).json({ error: 'Некоректні дані' });
        }

        const leaderboard = readLeaderboard();
        const killsNum = parseInt(kills);
        
        // Шукаємо існуючий запис для цього ланцюга
        const existingEntryIndex = leaderboard.findIndex(entry => 
            entry.playerWallet === playerWallet && entry.chainId === chainId
        );
        
        let isNewRecord = false;
        let resultEntry;
        
        if (existingEntryIndex !== -1) {
            // Запис існує - перевіряємо, чи це новий рекорд
            const existingEntry = leaderboard[existingEntryIndex];
            if (killsNum > existingEntry.kills) {
                // Новий рекорд! Оновлюємо запис
                const previousKills = existingEntry.kills;
                existingEntry.kills = killsNum;
                existingEntry.timestamp = new Date().toISOString();
                existingEntry.previousRecord = previousKills;
                isNewRecord = true;
                resultEntry = existingEntry;
                console.log(`Новий рекорд для ${playerWallet}: ${killsNum} (попередній: ${previousKills})`);
            } else {
                // Не рекорд, не оновлюємо
                return res.json({ 
                    message: 'Результат не є рекордом',
                    currentRecord: existingEntry.kills,
                    yourScore: killsNum,
                    isNewRecord: false
                });
            }
        } else {
            // Новий гравець - додаємо запис
            resultEntry = {
                id: Date.now().toString(),
                playerWallet: playerWallet,
                chainId: chainId || 'unknown',
                kills: killsNum,
                timestamp: new Date().toISOString()
            };
            leaderboard.push(resultEntry);
            isNewRecord = true;
            console.log(`Новий гравець ${playerWallet} з результатом: ${killsNum}`);
        }
        
        // Зберігаємо оновлений лідерборд
        if (writeLeaderboard(leaderboard)) {
            res.status(201).json({ 
                message: isNewRecord ? 'Новий рекорд встановлено!' : 'Результат оновлено',
                entry: resultEntry,
                isNewRecord: isNewRecord,
                previousRecord: resultEntry.previousRecord || null
            });
        } else {
            res.status(500).json({ error: 'Помилка збереження' });
        }
        
    } catch (error) {
        console.error('Помилка додавання результату:', error);
        res.status(500).json({ error: 'Помилка сервера' });
    }
});

// Очистити лідерборд (адмін функція)
app.delete('/api/leaderboard', (req, res) => {
    try {
        const { adminKey } = req.body;
        
        // Простий захист адмін функції
        if (adminKey !== 'reset_leaderboard_2024') {
            return res.status(403).json({ error: 'Доступ заборонено' });
        }
        
        if (writeLeaderboard([])) {
            res.json({ message: 'Лідерборд очищено' });
        } else {
            res.status(500).json({ error: 'Помилка очищення' });
        }
    } catch (error) {
        console.error('Помилка очищення лідерборду:', error);
        res.status(500).json({ error: 'Помилка сервера' });
    }
});

// Ініціалізація
initLeaderboard();

// Запуск сервера
app.listen(port, () => {
    console.log(`🚀 Сервер запущено на http://localhost:${port}`);
    console.log('📊 API лідерборду доступне на /api/leaderboard');
    console.log('📱 Linera інтеграція готова до тестування!');
}); 
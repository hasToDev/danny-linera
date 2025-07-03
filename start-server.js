const express = require('express');
const path = require('path');

const app = express();
const port = 3000;

// Cross-origin isolation headers for WASM
app.use((req, res, next) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    next();
});

// Serve static files from frontend directory
app.use(express.static(path.join(__dirname, 'frontend')));

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

app.listen(port, () => {
    console.log(`🚀 Danny VS CatGirls server running at http://localhost:${port}`);
    console.log('📁 Serving files from frontend/ directory');
}); 
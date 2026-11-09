const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors({
    origin: 'https://pichu-hosting-empire.pages.dev'
}));

app.use(express.json());

app.get('/', (req, res) => {
    res.json({
        company: 'PICHU HOSTING EMPIRE',
        status: 'online',
        message: 'Backend is running successfully'
    });
});

app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        uptime: process.uptime()
    });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`PICHU HOSTING EMPIRE running on port ${PORT}`);
});

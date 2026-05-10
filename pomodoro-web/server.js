const express = require('express');
const path = require('path');
const { init } = require('./db/database');
const authRoutes = require('./routes/auth');
const recordsRoutes = require('./routes/records');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname)));

app.use('/api/auth', authRoutes);
app.use('/api/records', recordsRoutes);

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

async function start() {
  await init();
  app.listen(PORT, () => {
    console.log(`Pomodoro server running at http://localhost:${PORT}`);
  });
}

start();

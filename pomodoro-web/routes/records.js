const { Router } = require('express');
const { all, run } = require('../db/database');
const { authRequired } = require('../middleware/auth');

const router = Router();

router.use(authRequired);

router.get('/', (req, res) => {
  const records = all(
    'SELECT id, duration, round, total_rounds, created_at FROM records WHERE user_id = ? ORDER BY created_at DESC',
    [req.userId]
  );
  res.json({ records });
});

router.post('/', (req, res) => {
  const { duration, round, totalRounds } = req.body;
  if (duration == null || round == null || totalRounds == null) {
    return res.status(400).json({ error: 'duration, round, and totalRounds are required' });
  }

  const result = run(
    'INSERT INTO records (user_id, duration, round, total_rounds) VALUES (?, ?, ?, ?)',
    [req.userId, duration, round, totalRounds]
  );

  const record = all('SELECT * FROM records WHERE id = ?', [result.lastInsertRowid])[0];
  res.status(201).json({ record });
});

router.delete('/', (req, res) => {
  run('DELETE FROM records WHERE user_id = ?', [req.userId]);
  res.json({ ok: true });
});

module.exports = router;

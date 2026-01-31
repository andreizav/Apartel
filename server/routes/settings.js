import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import store from '../store.js';

const router = Router();
router.use(authMiddleware);

router.get('/', (req, res) => {
  const data = store.getTenantData(req.tenantId);
  res.json(data.appSettings);
});

router.put('/', (req, res) => {
  const settings = req.body;
  if (typeof settings !== 'object') return res.status(400).json({ error: 'appSettings must be an object' });
  const data = store.getTenantData(req.tenantId);
  data.appSettings = { ...data.appSettings, ...settings };
  store.save();
  res.json(data.appSettings);
});


import { sendMessage } from '../services/telegram.js';

router.post('/telegram/test', async (req, res) => {
  const { token, chatId } = req.body;

  if (!token || !chatId) {
    return res.status(400).json({ success: false, error: 'Missing token or chat ID' });
  }

  try {
    const text = '🔔 *ApartEl Test Notification*\n\nYour bot is successfully connected! You will receive system alerts here.';
    const result = await sendMessage(token, chatId, text);
    res.json({ success: true, result });
  } catch (error) {
    // Error handling logic preserved from previous implementation or simplified
    if (error.cause && (error.cause.code === 'ECONNRESET' || error.cause.code === 'ETIMEDOUT')) {
      return res.status(503).json({ success: false, error: 'Network Error: Cannot reach Telegram servers. Check your internet connection or VPN.' });
    }
    res.status(500).json({ success: false, error: error.message || 'Internal server error while contacting Telegram' });
  }
});


import { syncUpdates } from '../services/telegram.js';

router.post('/telegram/sync', async (req, res) => {
  const data = store.getTenantData(req.tenantId);
  const token = data.appSettings.tgBotToken;

  if (!token) {
    return res.status(400).json({ success: false, error: 'Bot token not configured.' });
  }

  try {
    const result = await syncUpdates(token, req.tenantId);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;

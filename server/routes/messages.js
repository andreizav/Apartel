import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import store from '../store.js';
import { sendMessage, sendFile } from '../services/telegram.js';
import multer from 'multer';

// Configure Multer (Memory Storage)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB Limit
});

const router = Router();
router.use(authMiddleware);

router.post('/send', async (req, res) => {
    const { recipientId, text, platform } = req.body;
    const tenantId = req.tenantId;
    const data = store.getTenantData(tenantId);

    // Basic Validation
    if (!recipientId || !text) {
        return res.status(400).json({ success: false, error: 'Recipient and text are required' });
    }

    // Determine Platform
    // For now, if platform is 'telegram' or we have a telegram-style ID, use Telegram.
    // We can also lookup the client/staff to confirm.

    if (platform === 'telegram') {
        const token = data.appSettings.tgBotToken;
        if (!token) {
            return res.status(400).json({ success: false, error: 'Telegram bot not configured' });
        }

        // 1. Find Client/Recipient
        let client = data.clients.find(c => c.platformId === recipientId || c.phoneNumber === recipientId || `tg-${c.platformId}` === recipientId);

        if (!client) {
            // Try searching just by phone number if the ID looks like a number
            client = data.clients.find(c => c.phoneNumber === recipientId);
        }

        // Create Message Object
        const msgId = `msg-agent-${Date.now()}`;
        const newMessage = {
            id: msgId,
            text: text,
            sender: 'agent',
            timestamp: new Date().toISOString(),
            platform: 'telegram',
            status: 'sending'
        };

        // Add to history (if client found)
        if (client) {
            client.messages.push(newMessage);
            client.lastActive = newMessage.timestamp;
        }

        // Save 'sending' state
        store.save();

        try {
            await sendMessage(token, recipientId, text);

            // Update to 'sent'
            if (client) {
                const msg = client.messages.find(m => m.id === msgId);
                if (msg) msg.status = 'sent';
            }
            store.save();
            return res.json({ success: true });

        } catch (err) {
            console.error('Message Send Failed:', err.message);

            // Update to 'failed'
            if (client) {
                const msg = client.messages.find(m => m.id === msgId);
                if (msg) msg.status = 'failed';
            }
            store.save();

            // Return 502 Bad Gateway if it's upstream issue, but 200 with error? 
            // Better to return error code so UI shows red.
            return res.status(502).json({ success: false, error: err.message, saved: true });
        }

    }

    // Fallback / Other platforms (not implemented)
    return res.status(400).json({ success: false, error: 'Unsupported platform or missing configuration' });
});

router.post('/send/attachment', upload.single('file'), async (req, res) => {
    const { recipientId, platform, caption } = req.body;
    const file = req.file; // Multer file object
    const tenantId = req.tenantId;
    const data = store.getTenantData(tenantId);

    if (!recipientId || !file) {
        return res.status(400).json({ success: false, error: 'Recipient and file are required' });
    }

    if (platform === 'telegram') {
        const token = data.appSettings.tgBotToken;
        if (!token) {
            return res.status(400).json({ success: false, error: 'Telegram bot not configured' });
        }

        // 1. Log to History
        let client = data.clients.find(c => c.platformId === recipientId || c.phoneNumber === recipientId || `tg-${c.platformId}` === recipientId);
        if (!client) {
            client = data.clients.find(c => c.phoneNumber === recipientId);
        }

        const msgId = `msg-agent-${Date.now()}`;
        const newMessage = {
            id: msgId,
            text: `[File] ${file.originalname}`,
            sender: 'agent',
            timestamp: new Date().toISOString(),
            platform: 'telegram',
            status: 'sending',
            attachment: {
                name: file.originalname,
                type: file.mimetype,
                size: file.size
            }
        };

        if (client) {
            client.messages.push(newMessage);
            client.lastActive = newMessage.timestamp;
            store.save();
        }

        try {
            await sendFile(token, recipientId, file.buffer, file.originalname, file.mimetype, caption);

            if (client) {
                const msg = client.messages.find(m => m.id === msgId);
                if (msg) msg.status = 'sent';
            }
            store.save();
            return res.json({ success: true });

        } catch (err) {
            console.error('File Send Failed:', err.message);
            if (client) {
                const msg = client.messages.find(m => m.id === msgId);
                if (msg) msg.status = 'failed';
            }
            store.save();
            return res.status(502).json({ success: false, error: err.message, saved: true });
        }
    }

    return res.status(400).json({ success: false, error: 'Unsupported platform' });
});

export default router;

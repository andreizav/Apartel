
import store from '../store.js';

/**
 * Fetch updates from Telegram Bot API and sync to local store
 * @param {string} token - Bot Token
 * @param {string} tenantId - Tenant ID for data context
 * @returns {Promise<{count: number, messages: any[]}>}
 */
export async function syncUpdates(token, tenantId) {
    if (!token) return { count: 0, messages: [] };

    const data = store.getTenantData(tenantId);
    const settings = data.appSettings;
    const lastId = settings.tgLastUpdateId || 0;

    const url = `https://api.telegram.org/bot${token}/getUpdates?offset=${lastId + 1}`;

    try {
        const response = await fetch(url);

        if (!response.ok) {
            if (response.status === 401 || response.status === 404) {
                console.warn(`[Telegram] Invalid token or bot not found for tenant ${tenantId}`);
                return { count: 0, messages: [] };
            }
            throw new Error(`Telegram API Error: ${response.status} ${response.statusText}`);
        }

        const json = await response.json();

        if (!json.ok) {
            console.error('Telegram Update Error:', json);
            throw new Error(json.description || 'Failed to fetch updates');
        }

        const updates = json.result;
        if (!updates || updates.length === 0) return { count: 0, messages: [] };

        let processedCount = 0;
        const processedMessages = [];
        const mainAdminGroupId = settings.tgAdminGroupId;

        updates.forEach(update => {
            if (update.update_id > settings.tgLastUpdateId) {
                settings.tgLastUpdateId = update.update_id;
            }

            const msg = update.message;
            if (!msg || !msg.text) return;

            const chatId = msg.chat.id.toString();
            const text = msg.text;
            const senderName = msg.from.first_name + (msg.from.last_name ? ' ' + msg.from.last_name : '');

            if (chatId !== mainAdminGroupId) {
                let client = data.clients.find(c => c.platform === 'telegram' && c.platformId === chatId);

                if (!client) {
                    const newClient = {
                        phoneNumber: `tg-${chatId}`,
                        name: senderName || `User ${chatId}`,
                        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(senderName || 'U')}&background=0088cc&color=fff`,
                        email: '',
                        address: '',
                        country: '',
                        platform: 'telegram',
                        platformId: chatId,
                        status: 'New',
                        unreadCount: 1,
                        online: true,
                        lastActive: new Date().toISOString(),
                        createdAt: new Date().toISOString(),
                        previousBookings: 0,
                        messages: []
                    };
                    data.clients.unshift(newClient);
                    client = newClient;
                }

                const newMessage = {
                    id: `msg-${msg.message_id}`,
                    text: text,
                    sender: 'client',
                    timestamp: new Date(msg.date * 1000).toISOString(),
                    platform: 'telegram',
                    status: 'read'
                };

                if (!client.messages.find(m => m.id === newMessage.id)) {
                    client.messages.push(newMessage);
                    client.lastActive = newMessage.timestamp;
                    client.unreadCount += 1;
                    processedCount++;
                    processedMessages.push(newMessage);
                }
            }
        });

        store.save();
        return { count: processedCount, messages: processedMessages };

    } catch (error) {
        if (error.cause && (error.cause.code === 'ECONNRESET' || error.cause.code === 'ETIMEDOUT')) {
            return { count: 0, messages: [] };
        }
        console.error(`[Telegram] Sync Failed (Tenant: ${tenantId}):`, error.message);
        return { count: 0, messages: [] };
    }
}


/**
 * Send a text message via Telegram Bot API
 * @param {string} token - Bot Token
 * @param {string} chatId - Recipient Chat ID
 * @param {string} text - Message Text
 * @returns {Promise<any>}
 */
export async function sendMessage(token, chatId, text) {
    if (!token || !chatId || !text) {
        throw new Error('Missing token, chatId, or text');
    }

    const url = `https://api.telegram.org/bot${token}/sendMessage`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: text,
                parse_mode: 'Markdown'
            })
        });

        const result = await response.json();

        if (!result.ok) {
            console.error('Telegram Send Error:', result);
            throw new Error(result.description || 'Failed to send message');
        }

        return result;
    } catch (error) {
        if (error.cause && (error.cause.code === 'ECONNRESET' || error.cause.code === 'ETIMEDOUT')) {
            console.error('Telegram Connection Lost:', error.message);
            throw new Error('Telegram Unreachable: Connection reset or timed out');
        }
        console.error('Telegram Network Error:', error);
        throw error;
    }
}

/**
 * Send a file (Photo or Document) via Telegram Bot API
 * @param {string} token - Bot Token
 * @param {string} chatId - Recipient Chat ID
 * @param {Buffer} fileBuffer - File Buffer
 * @param {string} fileName - Original Filename
 * @param {string} mimeType - File Mime Type
 * @param {string} [caption] - Optional Caption
 * @returns {Promise<any>}
 */
export async function sendFile(token, chatId, fileBuffer, fileName, mimeType, caption = '') {
    if (!token || !chatId || !fileBuffer) {
        throw new Error('Missing token, chatId, or file');
    }

    const isImage = mimeType.startsWith('image/');
    const method = isImage ? 'sendPhoto' : 'sendDocument';
    const url = `https://api.telegram.org/bot${token}/${method}`;

    const formData = new FormData();
    formData.append('chat_id', chatId);
    if (caption) formData.append('caption', caption);

    // Create a Blob from the buffer. 
    const fileBlob = new Blob([fileBuffer], { type: mimeType });

    // Key name: 'photo' for sendPhoto, 'document' for sendDocument
    const fieldName = isImage ? 'photo' : 'document';
    formData.append(fieldName, fileBlob, fileName);

    try {
        const response = await fetch(url, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (!result.ok) {
            console.error(`Telegram ${method} Error:`, result);
            throw new Error(result.description || `Failed to send ${fieldName}`);
        }

        return result;
    } catch (error) {
        if (error.cause && (error.cause.code === 'ECONNRESET' || error.cause.code === 'ETIMEDOUT')) {
            console.error('Telegram Connection Lost:', error.message);
            throw new Error('Telegram Unreachable: Connection reset or timed out');
        }
        console.error('Telegram Network Error:', error);
        throw error;
    }
}

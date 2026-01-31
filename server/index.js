import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

import express from 'express';
import cors from 'cors';
import store from './store.js';
import authRoutes from './routes/auth.js';
import tenantsRoutes from './routes/tenants.js';
import portfolioRoutes from './routes/portfolio.js';
import bookingsRoutes from './routes/bookings.js';
import clientsRoutes from './routes/clients.js';
import staffRoutes from './routes/staff.js';
import transactionsRoutes from './routes/transactions.js';
import inventoryRoutes from './routes/inventory.js';
import channelsRoutes from './routes/channels.js';
import settingsRoutes from './routes/settings.js';
import bootstrapRoutes from './routes/bootstrap.js';
import messagesRoutes from './routes/messages.js';

const PORT = Number(process.env.PORT) || 4000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';

store.load();

const app = express();
app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/tenants', tenantsRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use('/api/clients', clientsRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/transactions', transactionsRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/channels', channelsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/bootstrap', bootstrapRoutes);
app.use('/api/messages', messagesRoutes);

app.get('/api/health', (req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Apartel API running at http://localhost:${PORT}`);
});

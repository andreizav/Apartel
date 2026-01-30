import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import store from '../store.js';

const router = Router();
router.use(authMiddleware);

router.get('/', (req, res) => {
  const data = store.getTenantData(req.tenantId);
  res.json(data.bookings);
});

router.post('/', (req, res) => {
  const body = req.body || {};


  const start = body.startDate ? new Date(body.startDate) : null;
  const end = body.endDate ? new Date(body.endDate) : null;

  if (!start || isNaN(start.getTime())) {
    return res.status(400).json({ success: false, error: 'Invalid start date format.' });
  }
  if (!end || isNaN(end.getTime())) {
    return res.status(400).json({ success: false, error: 'Invalid end date format.' });
  }
  if (start >= end) {
    return res.status(400).json({ success: false, error: 'End date must be after check-in date.' });
  }

  const data = store.getTenantData(req.tenantId);
  const overlaps = data.bookings.some((b) => {
    if (b.unitId !== body.unitId || b.status === 'cancelled') return false;
    const bStart = new Date(b.startDate);
    const bEnd = new Date(b.endDate);
    // Overlap logic: (StartA < EndB) and (EndA > StartB)
    return start < bEnd && end > bStart;
  });

  if (overlaps) {
    return res.status(400).json({ success: false, error: 'Selected dates are unavailable for this unit.' });
  }
  const booking = {
    id: body.id || `b-${Date.now()}`,
    unitId: body.unitId,
    guestName: body.guestName || '',
    guestPhone: body.guestPhone || '',
    startDate: body.startDate,
    endDate: body.endDate,
    source: body.source || 'direct',
    status: body.status || 'confirmed',
    price: body.price,
    createdAt: body.createdAt || new Date().toISOString(),
    assignedCleanerId: body.assignedCleanerId,
  };
  data.bookings.push(booking);
  store.save();
  res.json({ success: true, booking });
});

export default router;

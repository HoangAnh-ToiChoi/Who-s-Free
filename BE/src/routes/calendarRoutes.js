import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import * as calendarController from '../controllers/calendarController.js';

const router = Router();

router.use(requireAuth);

// Calendar Routes
router.post('/groups/:groupId/calendars', calendarController.createCalendar);
router.get('/groups/:groupId/calendars', calendarController.getCalendarsByGroup);

// Availability Routes
router.post('/calendars/:calendarId/availability', calendarController.createAvailability);
router.get('/calendars/:calendarId/availability/me', calendarController.getMyAvailability);
router.patch('/availability/:availabilityId', calendarController.updateAvailability);
router.delete('/availability/:availabilityId', calendarController.deleteAvailability);

export default router;
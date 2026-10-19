import { Router } from "express";

const router = Router();

// Flat /api/availabilities/* routes removed.
// Availability is now accessed via /api/sessions/:id/my-availability
// and /api/sessions/:id/availabilities (see session.routes.js).

export default router;

import { Router } from "express";
import availabilityController from "../controllers/availability.controller.js";

const router = Router();

router.get("/", availabilityController.getAvailabilities);
router.get("/:id", availabilityController.getAvailabilityById);
router.post("/", availabilityController.createAvailability);
router.patch("/:id", availabilityController.updateAvailability);

export default router;

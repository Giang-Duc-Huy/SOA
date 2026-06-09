import { Router } from "express";
import { prescriptionService } from "../services/prescription.service.js";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const prescriptions = await prescriptionService.list();
    res.json(prescriptions);
  } catch (err) {
    console.error("[pharmacy] list prescriptions error:", err);
    res.status(500).json({ error: "Failed to list prescriptions" });
  }
});

/** POST /api/pharmacy/prescriptions/:id/dispense — dispense prescription */
router.post("/:id/dispense", async (req, res) => {
  try {
    const result = await prescriptionService.dispense(req.params.id);
    if (!result) {
      res.status(404).json({ error: "Prescription not found" });
      return;
    }
    res.json(result);
  } catch (err) {
    if (err instanceof Error) {
      if (err.message.includes("Insufficient stock") || err.message.includes("cancelled") || err.message.includes("already dispensed")) {
        res.status(400).json({ error: err.message });
        return;
      }
    }
    console.error("[pharmacy] dispense error:", err);
    res.status(500).json({ error: "Failed to dispense prescription" });
  }
});

export default router;

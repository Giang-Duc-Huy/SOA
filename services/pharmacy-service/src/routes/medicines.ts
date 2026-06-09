import { Router } from "express";
import { ZodError } from "zod";
import { CreateMedicineSchema, UpdateStockSchema } from "../schemas/medicine.js";
import { medicineService } from "../services/medicine.service.js";

const router = Router();

router.post("/", async (req, res) => {
  try {
    const body = CreateMedicineSchema.parse(req.body);
    const medicine = await medicineService.create(body);
    res.status(201).json(medicine);
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ error: "Validation failed", details: err.errors });
      return;
    }
    console.error("[pharmacy] create medicine error:", err);
    res.status(500).json({ error: "Failed to create medicine" });
  }
});

router.get("/", async (_req, res) => {
  try {
    const medicines = await medicineService.list();
    res.json(medicines);
  } catch (err) {
    console.error("[pharmacy] list medicines error:", err);
    res.status(500).json({ error: "Failed to list medicines" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const medicine = await medicineService.getById(req.params.id);
    if (!medicine) {
      res.status(404).json({ error: "Medicine not found" });
      return;
    }
    res.json(medicine);
  } catch (err) {
    console.error("[pharmacy] get medicine error:", err);
    res.status(500).json({ error: "Failed to get medicine" });
  }
});

router.put("/:id/stock", async (req, res) => {
  try {
    const body = UpdateStockSchema.parse(req.body);
    const medicine = await medicineService.updateStock(req.params.id, body.stockQuantity);
    res.json(medicine);
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ error: "Validation failed", details: err.errors });
      return;
    }
    console.error("[pharmacy] update stock error:", err);
    res.status(500).json({ error: "Failed to update stock" });
  }
});

export default router;

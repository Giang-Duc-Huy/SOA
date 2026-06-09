import { Router } from "express";
import { ZodError } from "zod";
import { CreateLabOrderSchema, UpdateLabResultSchema } from "../schemas/lab-order.js";
import { labOrderService } from "../services/lab-order.service.js";

const router = Router();

router.post("/", async (req, res) => {
  try {
    const body = CreateLabOrderSchema.parse(req.body);
    const order = await labOrderService.create(body);
    res.status(201).json(order);
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ error: "Validation failed", details: err.errors });
      return;
    }
    console.error("[lab] create order error:", err);
    res.status(500).json({ error: "Failed to create lab order" });
  }
});

router.get("/", async (_req, res) => {
  try {
    const orders = await labOrderService.list();
    res.json(orders);
  } catch (err) {
    console.error("[lab] list orders error:", err);
    res.status(500).json({ error: "Failed to list lab orders" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const order = await labOrderService.getById(req.params.id);
    if (!order) {
      res.status(404).json({ error: "Lab order not found" });
      return;
    }
    res.json(order);
  } catch (err) {
    console.error("[lab] get order error:", err);
    res.status(500).json({ error: "Failed to get lab order" });
  }
});

router.put("/:id/result", async (req, res) => {
  try {
    const body = UpdateLabResultSchema.parse(req.body);
    const result = await labOrderService.updateResult(
      req.params.id,
      body.resultText,
      body.fileUrl
    );
    if (!result) {
      res.status(404).json({ error: "Lab order not found" });
      return;
    }
    res.json(result);
  } catch (err) {
    if (err instanceof Error && err.message.includes("cancelled")) {
      res.status(400).json({ error: err.message });
      return;
    }
    if (err instanceof ZodError) {
      res.status(400).json({ error: "Validation failed", details: err.errors });
      return;
    }
    console.error("[lab] update result error:", err);
    res.status(500).json({ error: "Failed to update result" });
  }
});

export default router;

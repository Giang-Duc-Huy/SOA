import { Router } from "express";
import { ZodError } from "zod";
import { CreateInvoiceSchema, PayInvoiceSchema } from "../schemas/invoice.js";
import { invoiceService } from "../services/invoice.service.js";

const router = Router();

/** POST /api/v1/invoices — create invoice manually */
router.post("/", async (req, res) => {
  try {
    const body = CreateInvoiceSchema.parse(req.body);
    const invoice = await invoiceService.createManual(body);
    res.status(201).json(invoice);
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ error: "Validation failed", details: err.errors });
      return;
    }
    console.error("[billing] create invoice error:", err);
    res.status(500).json({ error: "Failed to create invoice" });
  }
});

/** GET /api/v1/invoices — list invoices */
router.get("/", async (_req, res) => {
  try {
    const invoices = await invoiceService.list();
    res.json(invoices);
  } catch (err) {
    console.error("[billing] list invoices error:", err);
    res.status(500).json({ error: "Failed to list invoices" });
  }
});

/** GET /api/v1/invoices/:id — invoice detail */
router.get("/:id", async (req, res) => {
  try {
    const invoice = await invoiceService.getById(req.params.id);
    if (!invoice) {
      res.status(404).json({ error: "Invoice not found" });
      return;
    }
    res.json(invoice);
  } catch (err) {
    console.error("[billing] get invoice error:", err);
    res.status(500).json({ error: "Failed to get invoice" });
  }
});

/** POST /api/v1/invoices/:id/pay — process payment */
router.post("/:id/pay", async (req, res) => {
  try {
    const body = PayInvoiceSchema.parse(req.body);
    const result = await invoiceService.pay(req.params.id, body.method, body.amount);
    if (!result) {
      res.status(404).json({ error: "Invoice not found" });
      return;
    }
    res.json(result);
  } catch (err) {
    if (err instanceof Error && err.message === "Invoice already paid") {
      res.status(409).json({ error: err.message });
      return;
    }
    if (err instanceof Error && err.message === "Cannot pay cancelled invoice") {
      res.status(400).json({ error: err.message });
      return;
    }
    if (err instanceof ZodError) {
      res.status(400).json({ error: "Validation failed", details: err.errors });
      return;
    }
    console.error("[billing] pay invoice error:", err);
    res.status(500).json({ error: "Failed to process payment" });
  }
});

export default router;

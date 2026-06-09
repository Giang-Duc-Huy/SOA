import { Router } from "express";
import { analyticsService } from "../services/analytics.service.js";

const router = Router();

router.get("/revenue", async (_req, res) => {
  try {
    const data = await analyticsService.getRevenue();
    res.json(data);
  } catch (err) {
    console.error("[analytics] revenue error:", err);
    res.status(500).json({ error: "Failed to get revenue analytics" });
  }
});

router.get("/appointments", async (_req, res) => {
  try {
    const data = await analyticsService.getAppointments();
    res.json(data);
  } catch (err) {
    console.error("[analytics] appointments error:", err);
    res.status(500).json({ error: "Failed to get appointment analytics" });
  }
});

router.get("/pharmacy-stock", async (_req, res) => {
  try {
    const data = await analyticsService.getPharmacyStock();
    res.json(data);
  } catch (err) {
    console.error("[analytics] pharmacy stock error:", err);
    res.status(500).json({ error: "Failed to get pharmacy stock analytics" });
  }
});

router.get("/lab-results", async (_req, res) => {
  try {
    const data = await analyticsService.getLabResults();
    res.json(data);
  } catch (err) {
    console.error("[analytics] lab results error:", err);
    res.status(500).json({ error: "Failed to get lab result analytics" });
  }
});

router.get("/summary", async (_req, res) => {
  try {
    const data = await analyticsService.getSummary();
    res.json(data);
  } catch (err) {
    console.error("[analytics] summary error:", err);
    res.status(500).json({ error: "Failed to get analytics summary" });
  }
});

router.get("/dashboard", async (_req, res) => {
  try {
    const data = await analyticsService.getDashboard();
    res.json(data);
  } catch (err) {
    console.error("[analytics] dashboard error:", err);
    res.status(500).json({ error: "Failed to get dashboard stats" });
  }
});

export default router;

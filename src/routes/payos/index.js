import express from "express";
import {
  createPaymentLink,
  getPaymentLink,
  handlePaymentWebhook,
} from "../../controllers/general/payos.controller.js";

const router = express.Router();

router.post("/create-payment-link", createPaymentLink);
router.get("/get-payment-link/:orderCode", getPaymentLink);
router.post("/webhook", handlePaymentWebhook);

export default router;

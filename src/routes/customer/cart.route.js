import express from "express";

import {
  getUserCart,
  getCartProducts,
  putUserCart,
} from "../../controllers/guest/cart.controller.js";

const router = express.Router();

router.post("/:userId", getUserCart);
router.post("/", getCartProducts);
router.put("/", putUserCart);

export default router;

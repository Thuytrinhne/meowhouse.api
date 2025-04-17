import express from "express";

import { getUsers, getUserById } from "../../controllers/admin/user.controller.js";

const router = express.Router();

router.get("/", getUsers);
router.get("/:id", getUserById);

export default router;

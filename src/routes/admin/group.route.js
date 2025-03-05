import express from "express";

import {
  getGroups,
  getGroup,
  putGroup,
  postGroup,
  deleteGroup,
} from "../../controllers/admin/group.controller.js";

const router = express.Router();

router.get("/", getGroups);
router.get("/:id", getGroup);
router.post("/", postGroup);
router.put("/:id", putGroup);
router.delete("/", deleteGroup);

export default router;

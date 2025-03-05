import express from "express";
import {
  register,
  verifyEmail,
  checkEmail,
  login,
  googleAuth,
  googleAuthCallback,
  facebookAuth,
  facebookAuthCallback,
  refreshToken,
  getMe,
  changePassword,
  forgotPassword,
  verifyOTP,
  resetPassword,
} from "../../controllers/auth/auth.controller.js";
import { verifyToken } from "../../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/register", register);
router.get("/verify-email", verifyEmail);
router.get("/check-email", checkEmail);
router.post("/login", login);
router.post("/refresh-token", refreshToken);
router.get("/me", verifyToken, getMe);

// OAuth routes
router.get("/google", googleAuth);
router.get("/google/callback", googleAuthCallback);
router.get("/facebook", facebookAuth);
router.get("/facebook/callback", facebookAuthCallback);

//  route change password, forgot password
router.put("/change-password", verifyToken, changePassword);
router.post("/forgot-password", forgotPassword);
router.post("/verify-otp", verifyOTP);
router.post("/reset-password", resetPassword);

export default router;

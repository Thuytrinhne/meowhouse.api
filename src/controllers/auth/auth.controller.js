import jwt from "jsonwebtoken";
import argon2 from "argon2";

import { ok, error, badRequest, unauthorize } from "../../handlers/respone.handler.js";
import { USER_ROLES } from "../../utils/constants/index.js";
import User from "../../models/user.model.js";
import { sendVerificationEmail } from "../../utils/functions/emailService.js";
import passport from "../../passport.js";
import OTP from "../../models/otp.model.js";
import { sendOTPEmail } from "../../utils/functions/emailService.js";

// [POST] /api/auth/register
export const register = async (req, res, next) => {
  try {
    const { email, password, user_name } = req.body;
    // console.log("{ email, password, user_name }", { email, password, user_name });

    // Check if user already exists
    const existingUser = await User.findOne({ user_email: email });
    if (existingUser) {
      return badRequest(res, "Đăng ký thất bại. Email người dùng đã tồn tại!");
    }

    // Hash the password using argon2
    const hashedPassword = await argon2.hash(password);

    // Create a new user
    const newUser = new User({
      user_email: email,
      user_password: hashedPassword,
      user_role: USER_ROLES.USER,
      user_name: user_name,
      is_email_verified: false,
    });

    // Save the user to the database
    await newUser.save();

    // Create a verification token
    const token = jwt.sign({ userId: newUser._id }, process.env.JWT_SECRET, {
      expiresIn: "10m",
    });

    // Create a verification link
    const verificationLink = `${process.env.BASE_URL}/api/auth/verify-email?token=${token}`;

    // Tạo OTP 6 số
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Lưu OTP vào database
    await OTP.create({
      email,
      otp,
    });

    // Send verification email
    await sendVerificationEmail(email, verificationLink, otp);

    return ok(res, { token: token, message: "Đăng ký thành công. Vui lòng xác thực Email!" });
  } catch (err) {
    console.log("Err: " + err);
    return error(res, { message: "Đăng ký thất bại. Vui lòng thử lại sau!" }, 500);
  }
};

// [GET] /api/auth/verify-email
export const verifyEmail = async (req, res) => {
  try {
    const { token, mobile } = req.query;

    if (!token) {
      return badRequest(res, "Token is required");
    }

    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    // Find the user
    const user = await User.findById(userId);

    if (!user) {
      return error(res, "User not found", 404);
    }
    if (user.is_email_verified == true) {
      return badRequest(res, "Account has already verified");
    }

    // Update email verification status
    user.is_email_verified = true;
    await user.save();
    // return res.redirect("/login?message=Email verified successfully. Please log in.");
    if (mobile) return ok(res, { message: "User Verified" });
    return res.redirect(process.env.FE_URL + "/login");
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return res.redirect("/error?message=Verification link has expired&action=resend");
    }
    if (err instanceof jwt.JsonWebTokenError) {
      return badRequest(res, "Invalid token");
    }
    console.log("Err: " + err);
    return error(res, "Internal server error");
  }
};
// [GET] /api/auth/check-email
export const checkEmail = async (req, res) => {
  try {
    let { email } = req.query;

    if (!email) {
      return badRequest(res, "Email is required");
    }
    email = email.trim();

    const existingUser = await User.findOne({ user_email: email });

    if (existingUser) {
      return ok(res, { exists: true, message: "Email is already registered" });
    } else {
      return ok(res, { exists: false, message: "Email is available" });
    }
  } catch (err) {
    console.log("Err: " + err);
    return error(res, { message: "Internal server error" }, 500);
  }
};

// [POST] /api/auth/login
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ user_email: email });

    // user not found hoặc là tài khoản gg or fb
    if (!user || user.user_password == "google-auth" || user.user_password == "facebook-auth") {
      return badRequest(res, "Invalid email or password");
    }

    // Kiểm tra password
    const isValidPassword = await argon2.verify(user.user_password, password);
    if (!isValidPassword) {
      return badRequest(res, "Invalid email or password");
    }

    // Kiểm tra xác thực tài khoản
    if (!user.is_email_verified) {
      return badRequest(res, "Please verify your email before logging in");
    }

    // Tạo JWT token với thêm user_avt
    const token = jwt.sign(
      {
        user_id: user._id,
        name: user.user_name,
        user_roles: user.user_role,
        user_avt: user.user_avt || null,
        user_phone_number: user.user_phone_number || null,
        user_gender: user.user_gender || null,
        user_birth_day: user.user_birth_day || null,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Tạo refresh token
    const refreshToken = jwt.sign({ user_id: user._id }, process.env.REFRESH_TOKEN_SECRET, {
      expiresIn: "7d",
    });

    // Lưu refresh token vào database ( để quản lý và thu hồi)
    user.refresh_token = refreshToken;
    await user.save();

    return ok(res, {
      token,
      user: {
        id: user._id,
        name: user.user_name,
        email: user.user_email,
        role: user.user_role,
        user_avt: user.user_avt || null,
        user_phone_number: user.user_phone_number || null,
        user_gender: user.user_gender || null,
        user_birth_day: user.user_birth_day || null,
      },
      expiresIn: 3600, // 1 giờ
      refreshToken,
    });
  } catch (err) {
    console.log(err);
    return error(res, { message: "Internal server error" }, 500);
  }
};

// login with gg, fb

export const googleAuth = passport.authenticate("google", { scope: ["profile", "email"] });

export const googleAuthCallback = (req, res, next) => {
  passport.authenticate("google", { session: false }, (err, data) => {
    if (err) {
      return next(err);
    }
    if (!data) {
      return badRequest(res, "Google authentication failed");
    }

    // Đảm bảo token được tạo có chứa user_avt
    const { token, user } = data;

    // Redirect với token đã bao gồm user_avt
    res.redirect(`${process.env.FE_URL}/?token=${token}`);
  })(req, res, next);
};
export const facebookAuth = passport.authenticate("facebook", { scope: ["email"] });

export const facebookAuthCallback = (req, res, next) => {
  passport.authenticate("facebook", { session: false }, (err, data) => {
    if (err) {
      return next(err);
    }
    if (!data) {
      res.redirect(`${process.env.FE_URL}/login`);
    }

    // Đảm bảo token được tạo có chứa user_avt
    const { token, user } = data;

    // Redirect với token đã bao gồm user_avt
    res.redirect(`${process.env.FE_URL}/?token=${token}`);
  })(req, res, next);
};

// [POST] /api/auth/refresh-token
export const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return badRequest(res, "Refresh token is required");
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);

    // Tìm user với refresh token này
    const user = await User.findOne({
      _id: decoded.user_id,
      refresh_token: refreshToken,
    });

    if (!user) {
      return unauthorize(res, "Invalid refresh token");
    }

    // Tạo access token mới với user_avt
    const newAccessToken = jwt.sign(
      {
        user_id: user._id,
        name: user.user_name,
        user_roles: user.user_role,
        user_avt: user.user_avt || null, // Thêm user_avt vào token mới
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Tạo refresh token mới (optional)
    const newRefreshToken = jwt.sign({ user_id: user._id }, process.env.REFRESH_TOKEN_SECRET, {
      expiresIn: "7d",
    });

    // Cập nhật refresh token mới trong database
    user.refresh_token = newRefreshToken;
    await user.save();

    return ok(res, {
      token: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: 3600, // 1 giờ
    });
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return unauthorize(res, "Refresh token has expired");
    }
    if (err instanceof jwt.JsonWebTokenError) {
      return unauthorize(res, "Invalid refresh token");
    }
    console.log("Err: ", err);
    return error(res, { message: "Internal server error" }, 500);
  }
};

// [GET] /api/auth/me
export const getMe = async (req, res) => {
  try {
    // req.user đã được decode từ middleware verifyToken
    const user = await User.findById(req.user.user_id);

    if (!user) {
      return error(res, "User not found", 404);
    }

    return ok(res, {
      user: {
        id: user._id,
        name: user.user_name,
        email: user.user_email,
        role: user.user_role,
        user_avt: user.user_avt || null, // Thêm user_avt vào response
        user_phone_number: user.user_phone_number || null,
        user_gender: user.user_gender || null,
        user_birth_day: user.user_birth_day || null,
      },
      expiresIn: 3600, // 1 giờ
      refreshToken: user.refresh_token, // Thêm refresh token vào response
    });
  } catch (err) {
    console.log("Err: ", err);
    return error(res, { message: "Internal server error" }, 500);
  }
};

// [PUT] /api/auth/change-password
export const changePassword = async (req, res) => {
  try {
    const userId = req.user.user_id; // Lấy từ token đã decode
    const { current_password, new_password } = req.body;

    // Validate input
    if (!current_password || !new_password) {
      return badRequest(res, "Current password and new password are required");
    }

    // Tìm user
    const user = await User.findById(userId);
    if (!user) {
      return notFound(res, "User not found");
    }

    // Kiểm tra nếu tài khoản đăng nhập bằng Google/Facebook
    if (user.user_password === "google-auth" || user.user_password === "facebook-auth") {
      return badRequest(res, "Cannot change password for social login accounts");
    }

    // Verify mật khẩu hiện tại
    const isValidPassword = await argon2.verify(user.user_password, current_password);
    if (!isValidPassword) {
      return badRequest(res, "Current password is incorrect");
    }

    // Validate mật khẩu mới
    if (new_password.length < 6) {
      return badRequest(res, "New password must be at least 6 characters long");
    }

    // Hash mật khẩu mới
    const hashedNewPassword = await argon2.hash(new_password);

    // Cập nhật mật khẩu
    user.user_password = hashedNewPassword;
    await user.save();

    return ok(res, {
      message: "Password changed successfully",
    });
  } catch (err) {
    console.log("Error:", err);
    return error(res, "Internal server error");
  }
};

// [POST] /api/auth/forgot-password
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return badRequest(res, "Email is required");
    }

    // Kiểm tra user có tồn tại
    const user = await User.findOne({ user_email: email });
    if (!user) {
      return notFound(res, "User not found");
    }

    // Kiểm tra nếu là tài khoản social
    if (user.user_password === "google-auth" || user.user_password === "facebook-auth") {
      return badRequest(res, "Cannot reset password for social login accounts");
    }

    // Tạo OTP 6 số
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Lưu OTP vào database
    await OTP.create({
      email,
      otp,
    });

    // Gửi email chứa OTP
    await sendOTPEmail(email, otp);

    return ok(res, {
      message: "OTP has been sent to your email",
    });
  } catch (err) {
    console.log("Error:", err);
    return error(res, "Internal server error");
  }
};

// [POST] /api/auth/verify-otp
export const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return badRequest(res, "Email and OTP are required");
    }

    // Tìm OTP trong database
    const otpRecord = await OTP.findOne({
      email,
      otp,
      createdAt: { $gt: new Date(Date.now() - 300000) }, // OTP còn hiệu lực (5 phút)
    });

    if (!otpRecord) {
      return badRequest(res, "Invalid or expired OTP");
    }

    // Tạo token tạm thời để xác thực cho bước reset password
    const resetToken = jwt.sign(
      { email, otpId: otpRecord._id },
      process.env.JWT_SECRET,
      { expiresIn: "5m" } // Token có hiệu lực 5 phút
    );

    return ok(res, {
      message: "OTP verified successfully",
      resetToken,
    });
  } catch (err) {
    console.log("Error:", err);
    return error(res, "Internal server error");
  }
};

// [POST] /api/auth/reset-password
export const resetPassword = async (req, res) => {
  try {
    const { resetToken, new_password } = req.body;

    if (!resetToken || !new_password) {
      return badRequest(res, "Reset token and new password are required");
    }

    // Validate mật khẩu mới
    if (new_password.length < 6) {
      return badRequest(res, "New password must be at least 6 characters long");
    }

    // Verify reset token
    const decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
    const { email, otpId } = decoded;

    // Tìm user
    const user = await User.findOne({ user_email: email });
    if (!user) {
      return notFound(res, "User not found");
    }

    // Hash và cập nhật mật khẩu mới
    const hashedPassword = await argon2.hash(new_password);
    user.user_password = hashedPassword;
    await user.save();

    // Xóa OTP đã sử dụng
    await OTP.deleteOne({ _id: otpId });

    return ok(res, {
      message: "Password has been reset successfully",
    });
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return badRequest(res, "Reset token has expired");
    }
    if (err instanceof jwt.JsonWebTokenError) {
      return badRequest(res, "Invalid reset token");
    }
    console.log("Error:", err);
    return error(res, "Internal server error");
  }
};

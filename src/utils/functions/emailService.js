import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

export const sendVerificationEmail = async (to, verificationLink, otp) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: to,
    subject: "Verify your email",
    html: `
      <h1>Welcome to CatCorner!</h1>
      <p>Please verify your email by clicking the button below:</p>
      <a href="${verificationLink}" style="display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">Verify Email By Our Website</a>
      <p>Or by using the OTP below:</p>
      <h2>${otp}</h2>
      <p>If the button doesn't work, you can also copy and paste the following link into your browser:</p>
      <p>Website: ${verificationLink}</p>
      <p>This link will expire in 1 hour for security reasons.</p>
      <p>If you didn't request this verification, please ignore this email.</p>
      <p>Best regards,<br>The CatCorner Team</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("Verification email sent successfully");
  } catch (error) {
    console.error("Error sending verification email:", error);
    throw new Error("Failed to send verification email");
  }
};

export const sendOTPEmail = async (email, otp) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "CatCorner Shop - Password Reset OTP",
    html: `
      <h1>Password Reset Request</h1>
      <p>Your OTP for password reset is: <strong>${otp}</strong></p>
      <p>This OTP will expire in 5 minutes.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `,
  };

  await transporter.sendMail(mailOptions);
};

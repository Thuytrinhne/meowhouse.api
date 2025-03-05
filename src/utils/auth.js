import jwt from 'jsonwebtoken';

export const generateToken = (user) => {
  return jwt.sign(
    {
      user_id: user._id,
      name: user.user_name,
      user_roles: user.user_role,
    },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );
};
export const generateRefreshToken = (user) => {
  return jwt.sign(
    { user_id: user._id },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: "7d" }
  );
};
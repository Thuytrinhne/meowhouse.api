import jwt from 'jsonwebtoken';
import { unauthorize, forbidden } from '../handlers/respone.handler.js';

// Yêu cầu: Client gửi token trong header Authorization với format Bearer <token> khi gọi các API được bảo vệ.

//Chỉ xác thực token.
export const verifyToken = (req, res, next) => {
  const authHeader = req.header('Authorization');
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return unauthorize(res, 'Access denied. No token provided.');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return unauthorize(res, 'Invalid token.');
  }
};
// Xác thực token và đảm bảo rằng người dùng có quyền truy cập vào tài nguyên của họ hoặc là admin.
export const verifyTokenAndAuthorization = (req, res, next) => {
  verifyToken(req, res, () => {
    if (req.user.user_id === req.params.id || req.user.user_roles === 'Admin') {
      next();
    } else {
      return forbidden(res, 'You are not allowed to do that!');
    }
  });
};
// Xác thực token và đảm bảo rằng người dùng có quyền Admin.
export const verifyTokenAndAdmin = (req, res, next) => {
  verifyToken(req, res, () => {
    if (req.user.user_roles === 'Admin') {
      next();
    } else {
      return forbidden(res, 'You are not allowed to do that!');
    }
  });
};

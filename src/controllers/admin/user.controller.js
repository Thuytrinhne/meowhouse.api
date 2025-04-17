import User from "../../models/user.model.js";
import { notFound, ok, error, badRequest, created } from "../../handlers/respone.handler.js";

// [GET] /api/admin/users
export const getUsers = async (req, res, next) => {
  try {
    const users = await User.aggregate([
      {
        $project: {
          _id: 1,
          user_avt: 1,
          user_name: 1,
          createdAt: 1,
        },
      },
      { $sort: { createdAt: -1 } },
    ]);

    // console.log("users: ", users);

    if (!users.length) return notFound(res, {});

    return ok(res, { users: users });
  } catch (err) {
    console.log("Err: " + err);
    return error(res, err.message);
  }
};

// [GET] /api/admin/users/:id
export const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validate ID format (nếu dùng MongoDB ObjectId)
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return badRequest(res, "Invalid user ID format");
    }

    const user = await User.findById(id);

    if (!user) {
      return notFound(res, "User not found");
    }

    return ok(res, { user });
  } catch (err) {
    console.log("Err: " + err);
    return error(res, err.message);
  }
};

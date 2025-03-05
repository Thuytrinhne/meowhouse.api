import mongoose from "mongoose";

import User from "../../models/user.model.js";
import { notFound, ok, error, badRequest, created } from "../../handlers/respone.handler.js";
import { createSlug } from "../../utils/functions/format.js";

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

import mongoose from "mongoose";

import Group from "../../models/group.model.js";
import { notFound, ok, error, badRequest, created } from "../../handlers/respone.handler.js";

// [GET] /api/admin/groups
export const getGroups = async (req, res, next) => {
  try {
    const groups = await Group.aggregate([
      {
        $match: {},
      },
      { $sort: { createdAt: -1 } },
    ]);

    // console.log("groups: ", groups);

    if (!groups.length) return notFound(res, {});

    return ok(res, { groups: groups });
  } catch (err) {
    console.log("Err: " + err);
    return error(res, err.message);
  }
};

// [GET] /api/admin/groups/{id}
export const getGroup = async (req, res, next) => {
  try {
    const id = req.params.id;
    const objectId = new mongoose.Types.ObjectId(id);
    const groups = await Group.aggregate([
      {
        $match: { _id: objectId },
      },
    ]);

    // console.log("groups: ", groups);

    if (!groups.length) return notFound(res, {});

    return ok(res, { group: groups[0] });
  } catch (err) {
    console.log("Err: " + err);
    return error(res, err.message);
  }
};

// [POST] /api/admin/groups
export const postGroup = async (req, res, next) => {
  try {
    const group = req.body;

    const addGroup = {
      ...group,
    };

    // console.log("aaaaaaaaaaaa", addGroup);

    const newGroup = new Group(addGroup);

    const savedGroup = newGroup.save();

    if (!savedGroup) return badRequest(res, {});
    return created(res, { id: savedGroup._id }, {});
  } catch (err) {
    console.log("Err: " + err);
    return error(res);
  }
};

// [PUT] /api/admin/groups/{id}
export const putGroup = async (req, res, next) => {
  try {
    const id = req.params.id;
    const objectId = new mongoose.Types.ObjectId(id);
    const group = req.body;

    const updateGroup = {
      ...group,
    };

    const putGroup = await Group.findOneAndUpdate({ _id: objectId }, updateGroup);

    if (!putGroup) return notFound(res, {});
    return ok(res, {});
  } catch (err) {
    console.log("Err: " + err);
    return error(res);
  }
};

// [DELETE] /api/admin/groups
export const deleteGroup = async (req, res, next) => {
  try {
    const ids = req.body.ids;
    if (!ids.length) return badRequest(res, {});

    const deleteResult = await Group.deleteMany({ _id: { $in: ids } });

    // Nếu không có tài liệu nào bị xóa, trả về notFound
    if (!deleteResult.deletedCount) return notFound(res, {});

    // Nếu có tài liệu bị xóa, trả về ok
    return ok(res, {});
  } catch (err) {
    console.log("Err: " + err);
    return error(res);
  }
};

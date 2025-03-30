import Notification from "../../models/notification.model.js";
import { notFound, ok, error, badRequest, created } from "../../handlers/respone.handler.js";

// [GET] /api/admin/notifications - Lấy danh sách thông báo
export const getNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find().sort({ createdAt: -1 });

    if (!notifications.length) return notFound(res, {});

    return ok(res, { notifications });
  } catch (err) {
    console.log("Err:", err);
    return error(res, err.message);
  }
};

// [GET] /api/admin/notifications/:id - Lấy thông báo theo ID
export const getNotification = async (req, res, next) => {
  try {
    const id = req.params.id;
    const notification = await Notification.findById(id);

    if (!notification) return notFound(res, {});

    return ok(res, { notification });
  } catch (err) {
    console.log("Err:", err);
    return error(res, err.message);
  }
};

// [POST] /api/admin/notifications - Tạo thông báo mới
export const createNotification = async (req, res, next) => {
  try {
    const notification = new Notification(req.body);
    const savedNotification = await notification.save();

    if (!savedNotification) return badRequest(res, {});

    return created(res, { id: savedNotification._id });
  } catch (err) {
    console.log("Err:", err);
    return error(res, err.message);
  }
};

// [PUT] /api/admin/notifications/:id - Cập nhật thông báo
export const updateNotification = async (req, res, next) => {
  try {
    const id = req.params.id;
    const updatedNotification = await Notification.findByIdAndUpdate(id, req.body, { new: true });

    if (!updatedNotification) return notFound(res, {});

    return ok(res, { notification: updatedNotification });
  } catch (err) {
    console.log("Err:", err);
    return error(res, err.message);
  }
};

// [DELETE] /api/admin/notifications - Xóa nhiều thông báo
export const deleteNotifications = async (req, res, next) => {
  try {
    const ids = req.body.ids;
    if (!ids || !ids.length) return badRequest(res, {});

    const deleteResult = await Notification.deleteMany({ _id: { $in: ids } });

    if (!deleteResult.deletedCount) return notFound(res, {});

    return ok(res, {});
  } catch (err) {
    console.log("Err:", err);
    return error(res, err.message);
  }
};

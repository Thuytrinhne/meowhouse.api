import Address from "../../models/address.model.js";
import User from "../../models/user.model.js";

export const getAddressesByUserId = async (req, res) => {
  const { user_id } = req.params;

  // req.user đã được decode từ middleware verifyToken
  const user = await User.findById(req.user.user_id);

  if (!user || user_id != user.id) {
    return error(res, "User not found", 404);
  }

  try {
    const addresses = await Address.find({ user_id }).sort({ is_default: -1, created_at: -1 });

    if (addresses.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No addresses found for the given user_id",
      });
    }

    res.status(200).json({
      success: true,
      data: addresses,
    });
  } catch (error) {
    console.error("Error fetching addresses by user_id:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const getAddressesById = async (req, res) => {
  const { id } = req.params;

  // req.user đã được decode từ middleware verifyToken
  const user = await User.findById(req.user.user_id);

  if (!user) {
    return error(res, "User not found", 404);
  }

  try {
    const addresses = await Address.find({ _id: id }).sort({ is_default: -1, created_at: -1 });

    if (addresses.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No addresses found for the given _id",
      });
    }

    res.status(200).json({
      success: true,
      data: addresses,
    });
  } catch (error) {
    console.error("Error fetching addresses by user_id:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Thêm địa chỉ
export const addAddress = async (req, res) => {
  const { user_id } = req.params;

  // req.user đã được decode từ middleware verifyToken
  const user = await User.findById(req.user.user_id);

  if (!user || user_id != user.id) {
    return error(res, "User not found", 404);
  }

  const { full_name, phone, province, district, ward, detail_address, is_default } = req.body;

  try {
    const addressCount = await Address.countDocuments();

    // Nếu là địa chỉ đầu tiên, đặt mặc định
    const defaultStatus = addressCount === 0 || is_default;

    if (defaultStatus) {
      // Cập nhật tất cả các địa chỉ khác không phải mặc định
      await Address.updateMany({ is_default: true }, { is_default: false });
    }

    const newAddress = new Address({
      user_id,
      full_name,
      phone,
      province,
      district,
      ward,
      detail_address,
      is_default: defaultStatus,
    });

    await newAddress.save();

    res.status(201).json({
      success: true,
      message: "Address added successfully",
      data: newAddress,
    });
  } catch (error) {
    console.error("Error adding address:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Xóa địa chỉ
export const deleteAddress = async (req, res) => {
  const { id } = req.params;

  try {
    const address = await Address.findByIdAndDelete(id);

    if (!address) {
      return res.status(404).json({
        success: false,
        message: "Address not found",
      });
    }

    // Nếu xóa địa chỉ mặc định, đặt địa chỉ khác làm mặc định
    if (address.is_default) {
      const nextAddress = await Address.findOne().sort({ created_at: 1 });
      if (nextAddress) {
        nextAddress.is_default = true;
        await nextAddress.save();
      }
    }

    res.status(200).json({
      success: true,
      message: "Address deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting address:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Sửa địa chỉ
export const updateAddress = async (req, res) => {
  const { id } = req.params;
  const { full_name, phone, province, district, ward, detail_address, is_default } = req.body;

  try {
    const address = await Address.findById(id);

    if (!address) {
      return res.status(404).json({
        success: false,
        message: "Address not found",
      });
    }

    // Nếu sửa thành mặc định, cập nhật các địa chỉ khác
    if (is_default) {
      await Address.updateMany(
        { is_default: true, _id: { $ne: id } }, // Exclude the current address
        { is_default: false }
      );
    }

    // Cập nhật địa chỉ
    address.full_name = full_name || address.full_name;
    address.phone = phone || address.phone;
    address.province = province || address.province;
    address.district = district || address.district;
    address.ward = ward || address.ward;
    address.detail_address = detail_address || address.detail_address;
    address.is_default = is_default ?? address.is_default;

    await address.save();

    res.status(200).json({
      success: true,
      message: "Address updated successfully",
      data: address,
    });
  } catch (error) {
    console.error("Error updating address:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

import fetch from "node-fetch";
import Province from "../../models/province.model.js";
import District from "../../models/district.model.js";
import Ward from "../../models/ward.model.js";

const PROVINCE_URL = "https://api.vnappmob.com/api/v2/province/";
const DISTRICT_URL = "https://api.vnappmob.com/api/v2/province/district/";
const WARD_URL = "https://api.vnappmob.com/api/v2/province/ward/";

// Hàm lấy tất cả các tỉnh, sau đó lấy huyện và xã/phường cho từng tỉnh
export const fetchAndSaveAllLocations = async () => {
  try {
    // Lấy tất cả các tỉnh
    const response = await fetch(PROVINCE_URL);
    const data = await response.json();
    const provinces = data.results;

    // Lưu các tỉnh vào DB
    for (const province of provinces) {
      const { province_id, province_name } = province;

      // Lưu tỉnh vào DB
      await fetchAndSaveProvinces(province_id, province_name); // Pass province_id and province_name to save

      // Lấy và lưu danh sách huyện cho tỉnh này
      await fetchAndSaveDistricts(province_id);

      // Lấy và lưu danh sách xã/phường cho các huyện trong tỉnh này
      const districts = await District.find({ province_id });
      for (const district of districts) {
        await fetchAndSaveWards(district.district_id);
      }
    }

    console.log("All location data (provinces, districts, wards) updated!");
  } catch (error) {
    console.error("Error fetching all location data:", error);
  }
};

// Hàm để lấy và lưu dữ liệu vào DB cho provinces
const fetchAndSaveProvinces = async (province_id, province_name) => {
  try {
    const existingProvince = await Province.findOne({ province_id });
    if (existingProvince) {
      // Cập nhật tỉnh đã tồn tại
      existingProvince.province_name = province_name;
      existingProvince.last_updated_at = new Date();
      await existingProvince.save();
      console.log(`Province ${province_name} updated`);
    } else {
      // Thêm mới tỉnh
      const newProvince = new Province({
        province_id,
        province_name,
        last_updated_at: new Date(),
      });
      await newProvince.save();
      console.log(`Province ${province_name} added`);
    }
  } catch (error) {
    console.error("Error fetching provinces:", error);
  }
};

// Hàm để lấy và lưu dữ liệu vào DB cho districts
const fetchAndSaveDistricts = async (province_id) => {
  try {
    const response = await fetch(`${DISTRICT_URL}${province_id}`);
    const data = await response.json();
    const districts = data.results;

    for (const district of districts) {
      const { district_id, district_name } = district;

      const existingDistrict = await District.findOne({ district_id });
      if (existingDistrict) {
        // Cập nhật quận/huyện đã tồn tại
        existingDistrict.district_name = district_name;
        existingDistrict.province_id = province_id;
        existingDistrict.last_updated_at = new Date();
        await existingDistrict.save();
        console.log(`District ${district_name} updated`);
      } else {
        // Thêm mới quận/huyện
        const newDistrict = new District({
          district_id,
          district_name,
          province_id,
          last_updated_at: new Date(),
        });
        await newDistrict.save();
        console.log(`District ${district_name} added`);
      }
    }
  } catch (error) {
    console.error("Error fetching districts:", error);
  }
};

// Hàm để lấy và lưu dữ liệu vào DB cho wards
const fetchAndSaveWards = async (district_id) => {
  try {
    const response = await fetch(`${WARD_URL}${district_id}`);
    const data = await response.json();
    const wards = data.results;

    for (const ward of wards) {
      const { ward_id, ward_name } = ward;

      const existingWard = await Ward.findOne({ ward_id });
      if (existingWard) {
        // Cập nhật phường/xã đã tồn tại
        existingWard.ward_name = ward_name;
        existingWard.district_id = district_id;
        existingWard.last_updated_at = new Date();
        await existingWard.save();
        console.log(`Ward ${ward_name} updated`);
      } else {
        // Thêm mới phường/xã
        const newWard = new Ward({
          ward_id,
          ward_name,
          district_id,
          last_updated_at: new Date(),
        });
        await newWard.save();
        console.log(`Ward ${ward_name} added`);
      }
    }
  } catch (error) {
    console.error("Error fetching wards:", error);
  }
};

// Controller: Lấy danh sách tất cả các tỉnh
export const getProvinces = async (req, res) => {
  try {
    const provinces = await Province.find({});
    res.status(200).json({
      success: true,
      results: provinces,
    });
  } catch (error) {
    console.error("Error fetching provinces:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Controller: Lấy danh sách các huyện theo province_id
export const getDistrictsByProvinceId = async (req, res) => {
  const { province_id } = req.params;
  try {
    const districts = await District.find({ province_id });
    res.status(200).json({
      success: true,
      results: districts,
    });
  } catch (error) {
    console.error(`Error fetching districts for province_id ${province_id}:`, error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Controller: Lấy danh sách các xã/phường theo district_id
export const getWardsByDistrictId = async (req, res) => {
  const { district_id } = req.params;
  try {
    const wards = await Ward.find({ district_id });
    res.status(200).json({
      success: true,
      results: wards,
    });
  } catch (error) {
    console.error(`Error fetching wards for district_id ${district_id}:`, error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

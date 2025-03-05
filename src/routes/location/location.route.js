import express from "express";
import {
  fetchAndSaveAllLocations,
  getProvinces,
  getDistrictsByProvinceId,
  getWardsByDistrictId,
} from "../../controllers/location/location.controller.js";

const router = express.Router();

// Route: pull data từ api: https://api.vnappmob.com/api/v2
router.get("/fetchLocations", fetchAndSaveAllLocations);
// Route: Lấy danh sách tất cả các tỉnh
router.get("/provinces", getProvinces);

// Route: Lấy danh sách các huyện theo province_id
router.get("/districts/:province_id", getDistrictsByProvinceId);

// Route: Lấy danh sách các xã/phường theo district_id
router.get("/wards/:district_id", getWardsByDistrictId);

export default router;

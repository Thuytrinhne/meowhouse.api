import mongoose from "mongoose";

const districtSchema = new mongoose.Schema({
  district_id: { type: Number, required: true, unique: true },
  district_name: { type: String, required: true },
  province_id: { type: Number, required: true },
  last_updated_at: { type: Date, default: Date.now },
});

const District = mongoose.model("District", districtSchema);
export default District;

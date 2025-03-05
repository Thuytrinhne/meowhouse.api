import mongoose from "mongoose";

const provinceSchema = new mongoose.Schema({
  province_id: { type: Number, required: true, unique: true },
  province_name: { type: String, required: true },
  last_updated_at: { type: Date, default: Date.now },
});

const Province = mongoose.model("Province", provinceSchema);
export default Province;

// import libs
import fs from "fs";
import path from "path";

// read json file
const rawCategories = JSON.parse(
  fs.readFileSync(
    path.join(import.meta.dirname, "..", "raw-data", "FORCATSHOP.categories.json"),
    "utf8"
  )
);

// preprocess
const preprocessedCategories = rawCategories.map((category) => ({
  _id: category._id["$oid"],
  category_name: category.category_name,
  category_img: category.category_img,
}));
// console.log("preprocessedCategories: ", preprocessedCategories);

// save to json file
fs.writeFile(
  path.join(import.meta.dirname, "..", "preprocessed-data", "categories.preprocessed.json"),
  JSON.stringify(preprocessedCategories),
  (error) => {
    if (error) console.error("Lỗi khi lưu tệp JSON:", error);
    else console.log("Kết quả đã được lưu vào tệp categories.preprocessed.json");
  }
);

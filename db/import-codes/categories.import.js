// import libs
import fs from "fs";
import path from "path";
import connect from "../connect.js";
import Category from "../../src/models/category.model.js";

// read json file
const categories = JSON.parse(
  fs.readFileSync(
    path.join(import.meta.dirname, "..", "preprocessed-data", "categories.preprocessed.json"),
    "utf8"
  )
);

// connect mongodb
connect();

// insert data
try {
  Category.insertMany(categories).then(() => console.log("Insert successfully"));
} catch (err) {
  console.log("Errrrrrrrrr: ", err);
}

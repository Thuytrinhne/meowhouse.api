// import libs
import fs from "fs";
import path from "path";
import connect from "../connect.js";
import Product from "../../src/models/product.model.js";

// read json file
const products = JSON.parse(
  fs.readFileSync(
    path.join(import.meta.dirname, "..", "preprocessed-data", "products.preprocessed.json"),
    "utf8"
  )
);

// connect mongodb
connect();

// insert data
try {
  Product.insertMany(products).then(() => console.log("Insert successfully"));
} catch (err) {
  console.log("Errrrrrrrrr: ", err);
}

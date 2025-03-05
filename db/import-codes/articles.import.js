// import libs
import fs from "fs";
import path from "path";
import connect from "../connect.js";
import Article from "../../src/models/article.model.js";

// read json file
const articles = JSON.parse(
  fs.readFileSync(
    path.join(import.meta.dirname, "..", "preprocessed-data", "articles.preprocessed.json"),
    "utf8"
  )
);

// connect mongodb
connect();

// insert data
try {
  Article.insertMany(articles).then(() => console.log("Insert successfully"));
} catch (err) {
  console.log("Errrrrrrrrr: ", err);
}

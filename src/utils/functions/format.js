import { JSDOM } from "jsdom";

// format functions are used for format value. Ex: 1000 -> 1.000 vnd
export const createSlug = (string) => {
  if (typeof string != "string") return "";

  const a = "àáäâãåăæąçćčđďèéěėëêęğǵḧìíïîįłḿǹńňñòóöôœøṕŕřßşśšșťțùúüûǘůűūųẃẍÿýźžż·/_,:;";
  const b = "aaaaaaaaacccddeeeeeeegghiiiiilmnnnnooooooprrsssssttuuuuuuuuuwxyyzzz------";
  const p = new RegExp(a.split("").join("|"), "g");
  return string
    .toString()
    .toLowerCase()
    .replace(/á|à|ả|ạ|ã|ă|ắ|ằ|ẳ|ẵ|ặ|â|ấ|ầ|ẩ|ẫ|ậ/gi, "a")
    .replace(/é|è|ẻ|ẽ|ẹ|ê|ế|ề|ể|ễ|ệ/gi, "e")
    .replace(/i|í|ì|ỉ|ĩ|ị/gi, "i")
    .replace(/ó|ò|ỏ|õ|ọ|ô|ố|ồ|ổ|ỗ|ộ|ơ|ớ|ờ|ở|ỡ|ợ/gi, "o")
    .replace(/ú|ù|ủ|ũ|ụ|ư|ứ|ừ|ử|ữ|ự/gi, "u")
    .replace(/ý|ỳ|ỷ|ỹ|ỵ/gi, "y")
    .replace(/đ/gi, "d")
    .replace(/\s+/g, "-")
    .replace(p, (c) => b.charAt(a.indexOf(c)))
    .replace(/&/g, "-and-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
};

export const getCldPublicIdFromUrl = (url) => {
  try {
    if (url.startsWith("SEO_Images")) {
      const splitedArr = url.split("/");
      const publicId = splitedArr[splitedArr.length - 1];
      return publicId;
    } else if (url.startsWith("https://res.cloudinary.com")) {
      const startIndex = url.indexOf("upload/") + "upload/".length;
      const str = url.slice(startIndex).split("/").slice(1).join("/");
      const endIndex = str.lastIndexOf(".");
      const publicId = str.substring(0, endIndex);
      return publicId;
    }
  } catch (error) {
    console.error(">> Error in getCldPublicIdFromUrl:", error.message);
    return undefined;
  }
};

export const extractImageLinksFromHTML = (htmlString) => {
  const dom = new JSDOM(htmlString);
  const document = dom.window.document;
  return Array.from(document.querySelectorAll("img")).map((img) => img.src);
};

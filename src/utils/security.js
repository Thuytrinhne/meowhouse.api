import nacl from "tweetnacl";
import dotenv from "dotenv";

// Nạp các biến môi trường từ file .env
dotenv.config();

// Kiểm tra và đọc khóa từ biến môi trường
if (!process.env.TWEETNACL_PUBLIC_KEY_BASE64 || !process.env.TWEETNACL_SECRET_KEY_BASE64) {
  throw new Error(
    "Missing TWEETNACL_PUBLIC_KEY_BASE64 or TWEETNACL_SECRET_KEY_BASE64 in environment variables."
  );
}

// Chuyển đổi khóa từ base64 sang Buffer
const publicKey = Buffer.from(process.env.TWEETNACL_PUBLIC_KEY_BASE64, "base64");
const secretKey = Buffer.from(process.env.TWEETNACL_SECRET_KEY_BASE64, "base64");

// Hàm mã hóa dữ liệu
const encryptData = (data) => {
  if (!data || typeof data !== "string") {
    throw new TypeError("Invalid data: must be a non-empty string");
  }

  // Tạo nonce ngẫu nhiên
  const nonce = nacl.randomBytes(nacl.box.nonceLength);

  // Mã hóa dữ liệu
  const encodedData = Buffer.from(data, "utf-8");
  const encryptedData = nacl.box(encodedData, nonce, publicKey, secretKey);

  if (!encryptedData) {
    throw new Error("Encryption failed");
  }

  // Ghép nonce và dữ liệu mã hóa, sau đó chuyển đổi thành chuỗi base64
  const combinedData = Buffer.from([...nonce, ...encryptedData]).toString("base64");

  // Encode URI và thay thế các ký tự đặc biệt
  const encryptedString = encodeURIComponent(combinedData)
    .replaceAll("%21", "!")
    .replaceAll("%27", "'")
    .replaceAll("%28", "(")
    .replaceAll("%29", ")")
    .replaceAll("%2A", "*");

  return encryptedString;
};

// Hàm giải mã dữ liệu
const decryptData = (encryptedData) => {
  if (!encryptedData || typeof encryptedData !== "string") {
    throw new TypeError("Invalid encrypted data: must be a non-empty string");
  }

  // Giải mã chuỗi base64 và tách nonce khỏi dữ liệu mã hóa
  // const decodedData = Buffer.from(encryptedData, "base64");
  const decodedData = Buffer.from(decodeURIComponent(encryptedData), "base64");
  const nonce = decodedData.slice(0, nacl.box.nonceLength); // Nonce được lưu ở phần đầu
  const cipherText = decodedData.slice(nacl.box.nonceLength); // Dữ liệu mã hóa thực tế

  // Giải mã dữ liệu
  const decryptedData = nacl.box.open(cipherText, nonce, publicKey, secretKey);

  if (!decryptedData) {
    throw new Error("Decryption failed");
  }

  // Chuyển dữ liệu giải mã thành chuỗi UTF-8
  return Buffer.from(decryptedData).toString("utf-8");
};

export { encryptData, decryptData };

import express from "express";
import multer from "multer";
import cors from "cors";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";
import sharp from "sharp";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

/* ---------- REQUIRED: ensure uploads directory exists ---------- */
const uploadDir = "uploads";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

/* ---------- Multer setup ---------- */
const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) =>
    cb(null, Date.now() + "-" + file.originalname),
});
const upload = multer({ storage });

/* ---------- Gemini setup ---------- */
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
});

const OCR_PROMPT = `
Extract all the text visible in this image.
Return only the extracted text.
Preserve line breaks and formatting.
Do NOT add explanations or commentary.
`;

/* ---------- REQUIRED: Railway health route ---------- */
app.get("/", (req, res) => {
  res.status(200).send("OCR server is running");
});

/* ---------- OCR endpoint ---------- */
app.post("/ocr", upload.single("image"), async (req, res) => {
  try {
    const imagePath = req.file.path;

    const imageBuffer = await sharp(imagePath)
      .grayscale()
      .toBuffer();

    const result = await model.generateContent([
      OCR_PROMPT,
      {
        inlineData: {
          data: imageBuffer.toString("base64"),
          mimeType: req.file.mimetype,
        },
      },
    ]);

    fs.unlinkSync(imagePath);

    res.json({
      success: true,
      text: result.response.text(),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: "OCR processing failed",
    });
  }
});

/* ---------- REQUIRED: bind to 0.0.0.0 for Railway ---------- */
const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

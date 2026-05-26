import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3002;

// Increase body limit to handle files up to 50MB
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Lazy init of GoogleGenAI client (good pattern described in constraints)
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY chưa được cấu hình. Vui lòng thêm khóa trong Settings > Secrets trên AI Studio."
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Translate PDF API endpoint
app.post("/api/translate-pdf", async (req, res) => {
  try {
    const { pdfBase64, customInstructions } = req.body;

    if (!pdfBase64) {
      return res.status(400).json({ error: "Yêu cầu tệp PDF ở định dạng Base64." });
    }

    let ai;
    try {
      ai = getGeminiClient();
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }

    // Build user prompt
    let promptString = "Hãy dịch toàn bộ nội dung của tệp PDF này sang Tiếng Việt. Giữ nguyên tối đa cấu trúc, vị trí các đề mục, danh sách, bảng biểu và cách ngắt dòng của file cũ.";
    if (customInstructions) {
      promptString += `\nYêu cầu dịch bổ sung: "${customInstructions}"`;
    }

    const pdfPart = {
      inlineData: {
        mimeType: "application/pdf",
        data: pdfBase64,
      },
    };

    const systemInstruction = 
      "Bạn là một chuyên gia dịch thuật chuyên nghiệp. " +
      "Tài liệu PDF được đính kèm chứa văn bản và hình ảnh cần dịch sang Tiếng Việt.\n" +
      "Nhiệm vụ của bạn là:\n" +
      "1. Nhận diện chính xác tất cả các ngôn ngữ xuất hiện trong tệp PDF này.\n" +
      "2. Dịch toàn bộ nội dung một cách tự nhiên, chuẩn xác nhất sang tiếng Việt.\n" +
      "3. Tạo tóm tắt và tiêu đề tổng quan cho tài liệu bằng tiếng Việt (Chú ý giữ phần tóm tắt cực kỳ ngắn gọn trong 1-2 câu để tăng tốc độ phản hồi).\n" +
      "4. Tạo ra mã HTML sạch đại diện cho toàn bộ văn bản dịch trong thuộc tính `translatedHtml` sao cho bảo lưu tối đa 100% định dạng, cấu trúc, tiêu đề h1/h2/h3, danh sách ul/li, bảng biểu table, in đậm strong, vị trí ngắt dòng... giống hệt tệp gốc cũ. Hãy giữ mã HTML đơn giản, gọn gàng, không lạm dụng class CSS cồng kềnh để tránh lãng phí token và tăng tốc hiệu năng dịch tệp.\n" +
      "5. Khi phát hiện thấy biểu trưng (logo), ảnh minh họa, đồ thị hay sơ đồ gốc trong PDF, bạn bắt buộc phải giữ nguyên vị trí của chúng trong mã HTML dịch bằng cách chèn thẻ: `<div class=\"document-image-placeholder\" data-index=\"X\">[Hình ảnh: Mô tả nội dung hình ảnh/logo tại đây]</div>`. Hãy thay thế X bằng chỉ số tăng dần từ 0, 1, 2, 3... tương ứng với từng hình ảnh bạn phát hiện theo thứ tự xuất hiện từ trên xuống dưới trong tệp PDF mẫu.";

    // Call the recommended model for basic/complex tasks ('gemini-3.5-flash')
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [pdfPart, { text: promptString }],
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: {
              type: Type.STRING,
              description: "Tiêu đề của tài liệu bằng Tiếng Việt (hoặc tự đặt ngắn gọn dựa trên nội dung nếu không có tiêu đề rõ ràng).",
            },
            detectedLanguages: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Danh sách tất cả các ngôn ngữ được nhận diện trong tài liệu (Ví dụ: ['English', 'French (Tiếng Pháp)', 'Japanese (Tiếng Nhật)']).",
            },
            summary: {
              type: Type.STRING,
              description: "Tóm tắt tổng quan nội dung chính của tài liệu bằng Tiếng Việt cực kỳ vắn tắt (tối đa 2 câu chắt lọc).",
            },
            translatedHtml: {
              type: Type.STRING,
              description: "Toàn bộ nội dung bản dịch dịch chuẩn dạng mã HTML phẳng, sạch, tối giản nhất có thể để đảm bảo tốc độ tối ưu.",
            },
          },
          required: ["title", "detectedLanguages", "summary", "translatedHtml"],
        },
      },
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("Mô hình không trả về kết quả.");
    }

    try {
      const parsedData = JSON.parse(resultText.trim());
      res.json(parsedData);
    } catch (parseError) {
      console.error("JSON parse error:", resultText);
      res.status(500).json({
        error: "Mô hình trả về dữ liệu không đúng định dạng JSON yêu cầu.",
        rawOutput: resultText,
      });
    }
  } catch (error: any) {
    console.error("PDF Translation error:", error);
    res.status(500).json({ error: error.message || "Đã xảy ra lỗi trong quá trình xử lý dịch thuật." });
  }
});

// Configure client environment for Express
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

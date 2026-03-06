export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { items, occasion } = req.body;

  if (!items || items.length === 0) {
    return res.status(400).json({ error: "Không có đồ nào sẵn sàng!" });
  }

  const itemDescriptions = items.map((item, i) =>
    `${i + 1}. ${item.name} (${item.type})${item.notes ? " - " + item.notes : ""}`
  ).join("\n");

  const prompt = `Bạn là chuyên gia thời trang. Dưới đây là danh sách quần áo đang sẵn sàng trong tủ đồ:

${itemDescriptions}

Dịp mặc: ${occasion || "hàng ngày"}

Hãy gợi ý 2-3 bộ outfit phù hợp từ các món đồ trên. Với mỗi bộ:
- Liệt kê các món kết hợp (đúng tên trong danh sách)
- Giải thích ngắn tại sao hợp
- Gợi ý thêm phụ kiện nếu cần

Trả lời bằng tiếng Việt, ngắn gọn, thân thiện.`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 1000, temperature: 0.8 },
        }),
      }
    );

    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "Không có gợi ý";
    res.status(200).json({ suggestion: text });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

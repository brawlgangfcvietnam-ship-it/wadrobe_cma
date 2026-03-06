export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { items, occasion } = req.body;

  if (!items || items.length === 0) {
    return res.status(400).json({ error: "Không có đồ nào sẵn sàng!" });
  }

  const itemDescriptions = items.map((item, i) => {
    const hasImage = item.image && item.image.startsWith("data:image");
    return `${i + 1}. ${item.name} (${item.type})${item.notes ? " - " + item.notes : ""}${hasImage ? " [có ảnh]" : ""}`;
  }).join("\n");

  const prompt = `Bạn là chuyên gia thời trang. Dưới đây là danh sách quần áo đang sẵn sàng trong tủ đồ:

${itemDescriptions}

Dịp mặc: ${occasion || "hàng ngày"}

Hãy gợi ý 2-3 bộ outfit phù hợp từ các món đồ trên. Với mỗi bộ:
- Liệt kê các món kết hợp (đúng tên trong danh sách)
- Giải thích ngắn tại sao hợp
- Gợi ý thêm phụ kiện nếu cần

Trả lời bằng tiếng Việt, ngắn gọn, thân thiện.`;

  // Build messages - include images if available (max 3 items with images to avoid token limit)
  const itemsWithImages = items.filter(i => i.image && i.image.startsWith("data:image")).slice(0, 3);

  const messageContent = [];

  if (itemsWithImages.length > 0) {
    for (const item of itemsWithImages) {
      const base64 = item.image.split(",")[1];
      const mediaType = item.image.split(";")[0].split(":")[1];
      messageContent.push({
        type: "image",
        source: { type: "base64", media_type: mediaType, data: base64 }
      });
      messageContent.push({ type: "text", text: `Ảnh trên là: ${item.name} (${item.type})` });
    }
  }

  messageContent.push({ type: "text", text: prompt });

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-opus-4-5",
        max_tokens: 1000,
        messages: [{ role: "user", content: messageContent }],
      }),
    });

    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });

    const text = data.content?.[0]?.text || "Không có gợi ý";
    res.status(200).json({ suggestion: text });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

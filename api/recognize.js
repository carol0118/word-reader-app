import {
  dedupeWords,
  extractOutputText,
  normalizeText,
  normalizeWord,
  readJsonBody,
  requireApiKey,
  safeParseJson,
  sendJson,
  visionModel
} from "../lib/openai-helpers.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  try {
    const apiKey = requireApiKey();
    const body = await readJsonBody(req);
    const imageDataUrl = typeof body.imageDataUrl === "string" ? body.imageDataUrl : "";

    if (!imageDataUrl.startsWith("data:image/")) {
      sendJson(res, 400, { error: "Invalid imageDataUrl" });
      return;
    }

    const prompt = [
      "You are extracting English words from a learning worksheet for a third-grade child.",
      "Return JSON only.",
      'Use this shape: {"title":"","words":[{"text":"","meaning":"","phonetic_hint":""}]}',
      "Rules:",
      "1. Extract English words in reading order.",
      "2. Keep one word per item.",
      "3. Remove punctuation and duplicates caused by OCR noise.",
      "4. meaning should be short, simple Chinese.",
      "5. phonetic_hint should be a simple Chinese pronunciation hint for children.",
      "6. If a word is unclear, skip it.",
      "7. title should briefly describe the page."
    ].join("\n");

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: visionModel,
        input: [
          {
            role: "user",
            content: [
              { type: "input_text", text: prompt },
              { type: "input_image", image_url: imageDataUrl, detail: "high" }
            ]
          }
        ]
      })
    });

    const payload = await response.json();
    if (!response.ok) {
      sendJson(res, response.status, {
        error: payload?.error?.message || "Recognition request failed"
      });
      return;
    }

    const rawText = extractOutputText(payload);
    const parsed = safeParseJson(rawText);
    if (!parsed || !Array.isArray(parsed.words)) {
      sendJson(res, 502, {
        error: "Model output could not be parsed as word JSON",
        rawText
      });
      return;
    }

    const cleanedWords = parsed.words
      .map((item) => ({
        text: normalizeWord(item?.text),
        meaning: normalizeText(item?.meaning),
        phonetic_hint: normalizeText(item?.phonetic_hint)
      }))
      .filter((item) => /^[A-Za-z][A-Za-z'-]*$/.test(item.text));

    sendJson(res, 200, {
      title: normalizeText(parsed.title) || "识别结果",
      words: dedupeWords(cleanedWords)
    });
  } catch (error) {
    sendJson(res, error.statusCode || 500, {
      error: error instanceof Error ? error.message : "Server error"
    });
  }
}

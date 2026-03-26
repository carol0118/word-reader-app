export const visionModel = process.env.OPENAI_VISION_MODEL || "gpt-4.1-mini";
export const ttsModel = process.env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts";
export const ttsVoice = process.env.OPENAI_TTS_VOICE || "alloy";

export function requireApiKey() {
  const apiKey = process.env.OPENAI_API_KEY || "";
  if (!apiKey) {
    const error = new Error("Missing OPENAI_API_KEY");
    error.statusCode = 500;
    throw error;
  }
  return apiKey;
}

export async function readJsonBody(req) {
  if (req.body && typeof req.body === "object") {
    return req.body;
  }

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const text = Buffer.concat(chunks).toString("utf8");
  return text ? JSON.parse(text) : {};
}

export function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(payload));
}

export function extractOutputText(payload) {
  if (typeof payload?.output_text === "string" && payload.output_text) {
    return payload.output_text;
  }

  const output = Array.isArray(payload?.output) ? payload.output : [];
  const parts = [];
  for (const item of output) {
    const contents = Array.isArray(item?.content) ? item.content : [];
    for (const content of contents) {
      if (content?.type === "output_text" && typeof content.text === "string") {
        parts.push(content.text);
      }
    }
  }
  return parts.join("\n").trim();
}

export function safeParseJson(text) {
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      return null;
    }

    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

export function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeWord(value) {
  return normalizeText(value).replace(/[^A-Za-z'-]/g, "");
}

export function dedupeWords(words) {
  const seen = new Set();
  const result = [];

  for (const word of words) {
    const key = word.text.toLowerCase();
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(word);
  }

  return result;
}

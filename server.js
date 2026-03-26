import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, "public");

loadEnv(path.join(__dirname, ".env"));

const port = Number(process.env.PORT || 3000);
const apiKey = process.env.OPENAI_API_KEY || "";
const visionModel = process.env.OPENAI_VISION_MODEL || "gpt-4.1-mini";
const ttsModel = process.env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts";
const ttsVoice = process.env.OPENAI_TTS_VOICE || "alloy";

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host}`);

    if (req.method === "GET") {
      await handleStatic(url.pathname, res);
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/recognize") {
      await handleRecognize(req, res);
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/pronounce") {
      await handlePronounce(req, res);
      return;
    }

    sendJson(res, 404, { error: "Not found" });
  } catch (error) {
    sendJson(res, 500, { error: error instanceof Error ? error.message : "Server error" });
  }
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Word Reader App is running at http://localhost:${port}`);
  for (const address of getLanAddresses()) {
    console.log(`Mobile access: http://${address}:${port}`);
  }
});

async function handleStatic(pathname, res) {
  const safePath = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.join(publicDir, safePath);

  if (!filePath.startsWith(publicDir)) {
    sendJson(res, 403, { error: "Forbidden" });
    return;
  }

  try {
    const stat = await fs.promises.stat(filePath);
    if (stat.isDirectory()) {
      sendJson(res, 403, { error: "Forbidden" });
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = getContentType(ext);
    const data = await fs.promises.readFile(filePath);
    res.writeHead(200, { "Content-Type": contentType });
    res.end(data);
  } catch {
    sendJson(res, 404, { error: "File not found" });
  }
}

async function handleRecognize(req, res) {
  if (!apiKey) {
    sendJson(res, 500, { error: "Missing OPENAI_API_KEY in .env" });
    return;
  }

  const body = await readJson(req);
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
      "Authorization": `Bearer ${apiKey}`,
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
}

async function handlePronounce(req, res) {
  if (!apiKey) {
    sendJson(res, 500, { error: "Missing OPENAI_API_KEY in .env" });
    return;
  }

  const body = await readJson(req);
  const word = normalizeWord(body.word);

  if (!word) {
    sendJson(res, 400, { error: "Missing word" });
    return;
  }

  const speechResponse = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: ttsModel,
      voice: ttsVoice,
      input: word,
      response_format: "mp3"
    })
  });

  if (!speechResponse.ok) {
    const errorPayload = await speechResponse.json().catch(() => null);
    sendJson(res, speechResponse.status, {
      error: errorPayload?.error?.message || "Pronunciation request failed"
    });
    return;
  }

  const audioBuffer = Buffer.from(await speechResponse.arrayBuffer());
  res.writeHead(200, {
    "Content-Type": "audio/mpeg",
    "Content-Length": audioBuffer.length,
    "Cache-Control": "no-store"
  });
  res.end(audioBuffer);
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const text = Buffer.concat(chunks).toString("utf8");
  return text ? JSON.parse(text) : {};
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(payload));
}

function getContentType(ext) {
  const map = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml"
  };
  return map[ext] || "application/octet-stream";
}

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const divider = line.indexOf("=");
    if (divider === -1) {
      continue;
    }

    const key = line.slice(0, divider).trim();
    const value = line.slice(divider + 1).trim();
    if (key && !process.env[key]) {
      process.env[key] = value;
    }
  }
}

function extractOutputText(payload) {
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

function safeParseJson(text) {
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

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeWord(value) {
  return normalizeText(value).replace(/[^A-Za-z'-]/g, "");
}

function dedupeWords(words) {
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

function getLanAddresses() {
  const interfaces = os.networkInterfaces();
  const results = [];

  for (const values of Object.values(interfaces)) {
    for (const item of values || []) {
      if (item.family === "IPv4" && !item.internal) {
        results.push(item.address);
      }
    }
  }

  return results;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "POST" && url.pathname === "/api/recognize") {
      return handleRecognize(request, env);
    }

    if (request.method === "POST" && url.pathname === "/api/pronounce") {
      return handlePronounce(request, env);
    }

    return env.ASSETS.fetch(request);
  }
};

async function handleRecognize(request, env) {
  try {
    const apiKey = requireApiKey(env);
    const body = await request.json();
    const imageDataUrl = typeof body.imageDataUrl === "string" ? body.imageDataUrl : "";

    if (!imageDataUrl.startsWith("data:image/")) {
      return jsonResponse({ error: "Invalid imageDataUrl" }, 400);
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
        model: env.OPENAI_VISION_MODEL || "gpt-4.1-mini",
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
      return jsonResponse(
        { error: payload?.error?.message || "Recognition request failed" },
        response.status
      );
    }

    const rawText = extractOutputText(payload);
    const parsed = safeParseJson(rawText);
    if (!parsed || !Array.isArray(parsed.words)) {
      return jsonResponse(
        {
          error: "Model output could not be parsed as word JSON",
          rawText
        },
        502
      );
    }

    const cleanedWords = parsed.words
      .map((item) => ({
        text: normalizeWord(item?.text),
        meaning: normalizeText(item?.meaning),
        phonetic_hint: normalizeText(item?.phonetic_hint)
      }))
      .filter((item) => /^[A-Za-z][A-Za-z'-]*$/.test(item.text));

    return jsonResponse({
      title: normalizeText(parsed.title) || "识别结果",
      words: dedupeWords(cleanedWords)
    });
  } catch (error) {
    return jsonResponse({ error: error.message || "Server error" }, error.statusCode || 500);
  }
}

async function handlePronounce(request, env) {
  try {
    const apiKey = requireApiKey(env);
    const body = await request.json();
    const word = normalizeWord(body.word);

    if (!word) {
      return jsonResponse({ error: "Missing word" }, 400);
    }

    const speechResponse = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts",
        voice: env.OPENAI_TTS_VOICE || "alloy",
        input: word,
        response_format: "mp3"
      })
    });

    if (!speechResponse.ok) {
      const errorPayload = await speechResponse.json().catch(() => null);
      return jsonResponse(
        { error: errorPayload?.error?.message || "Pronunciation request failed" },
        speechResponse.status
      );
    }

    return new Response(speechResponse.body, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    return jsonResponse({ error: error.message || "Server error" }, error.statusCode || 500);
  }
}

function requireApiKey(env) {
  const apiKey = env.OPENAI_API_KEY || "";
  if (!apiKey) {
    const error = new Error("Missing OPENAI_API_KEY");
    error.statusCode = 500;
    throw error;
  }
  return apiKey;
}

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
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

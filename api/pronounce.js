import {
  normalizeWord,
  readJsonBody,
  requireApiKey,
  sendJson,
  ttsModel,
  ttsVoice
} from "../lib/openai-helpers.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  try {
    const apiKey = requireApiKey();
    const body = await readJsonBody(req);
    const word = normalizeWord(body.word);

    if (!word) {
      sendJson(res, 400, { error: "Missing word" });
      return;
    }

    const speechResponse = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
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
    res.statusCode = 200;
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Length", audioBuffer.length);
    res.setHeader("Cache-Control", "no-store");
    res.end(audioBuffer);
  } catch (error) {
    sendJson(res, error.statusCode || 500, {
      error: error instanceof Error ? error.message : "Server error"
    });
  }
}

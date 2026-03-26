const imageInput = document.querySelector("#imageInput");
const recognizeBtn = document.querySelector("#recognizeBtn");
const statusText = document.querySelector("#statusText");
const previewImage = document.querySelector("#previewImage");
const previewPlaceholder = document.querySelector("#previewPlaceholder");
const wordGrid = document.querySelector("#wordGrid");
const resultTitle = document.querySelector("#resultTitle");
const installBtn = document.querySelector("#installBtn");

let selectedImageDataUrl = "";
let installPromptEvent = null;
let speechVoices = [];

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  installPromptEvent = event;
  installBtn.hidden = false;
});

installBtn.addEventListener("click", async () => {
  if (!installPromptEvent) {
    setStatus("请在浏览器菜单里选择“添加到主屏幕”");
    return;
  }

  installPromptEvent.prompt();
  await installPromptEvent.userChoice;
  installPromptEvent = null;
  installBtn.hidden = true;
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      setStatus("离线缓存注册失败，不影响正常使用", true);
    });
  });
}

if ("speechSynthesis" in window) {
  speechVoices = window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () => {
    speechVoices = window.speechSynthesis.getVoices();
  };
}

imageInput.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }

  selectedImageDataUrl = await fileToDataUrl(file);
  previewImage.src = selectedImageDataUrl;
  previewImage.hidden = false;
  previewPlaceholder.hidden = true;
  setStatus("图片已选择，可以开始识别");
});

recognizeBtn.addEventListener("click", async () => {
  if (!selectedImageDataUrl) {
    setStatus("请先上传一张图片", true);
    return;
  }

  if (!window.Tesseract) {
    setStatus("OCR 组件加载失败，请检查网络", true);
    return;
  }

  recognizeBtn.disabled = true;
  renderEmpty("正在识别，请稍等。");
  setStatus("正在识别图片里的英文单词...");

  try {
    const result = await window.Tesseract.recognize(selectedImageDataUrl, "eng", {
      logger: ({ status, progress }) => {
        if (status === "recognizing text") {
          setStatus(`正在识别图片里的英文单词... ${Math.round(progress * 100)}%`);
        }
      }
    });

    const words = extractWords(result?.data?.text || "");
    resultTitle.textContent = "识别结果";
    renderWords(words);
    setStatus(`识别完成，共找到 ${words.length} 个单词`);
  } catch (error) {
    renderEmpty("识别失败，请换一张更清晰的图片再试。");
    setStatus(error.message || "识别失败", true);
  } finally {
    recognizeBtn.disabled = false;
  }
});

function extractWords(text) {
  const rawWords = text
    .replace(/[\r\n]+/g, " ")
    .split(/\s+/)
    .map((item) => item.replace(/[^A-Za-z'-]/g, ""))
    .map((item) => item.trim())
    .filter((item) => /^[A-Za-z][A-Za-z'-]*$/.test(item))
    .filter((item) => item.length > 1);

  const uniqueWords = [];
  const seen = new Set();

  for (const word of rawWords) {
    const key = word.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    uniqueWords.push({
      text: word,
      meaning: "点击后可播放发音",
      phonetic_hint: getPhoneticHint(word)
    });
  }

  return uniqueWords;
}

function renderWords(words) {
  if (!words.length) {
    renderEmpty("没有识别到清晰的英文单词。");
    return;
  }

  wordGrid.innerHTML = "";
  for (const word of words) {
    const button = document.createElement("button");
    button.className = "word-card";
    button.type = "button";
    button.innerHTML = `
      <div class="word-text">${escapeHtml(word.text)}</div>
      <div class="word-meta">${escapeHtml(word.meaning)}</div>
      <div class="word-tip">发音提示：${escapeHtml(word.phonetic_hint)}</div>
    `;
    button.addEventListener("click", () => playWord(word.text, button));
    wordGrid.appendChild(button);
  }
}

function playWord(word, card) {
  if (!("speechSynthesis" in window)) {
    setStatus("当前浏览器不支持语音播放", true);
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(word);
  utterance.lang = "en-US";
  utterance.rate = 0.82;
  utterance.pitch = 1.08;
  utterance.volume = 1;

  const preferredVoice = speechVoices.find((voice) => voice.lang?.toLowerCase().startsWith("en"));
  if (preferredVoice) {
    utterance.voice = preferredVoice;
  }

  card.classList.add("playing");
  setStatus(`正在播放：${word}`);

  utterance.onend = () => {
    card.classList.remove("playing");
    setStatus(`播放完成：${word}`);
  };

  utterance.onerror = () => {
    card.classList.remove("playing");
    setStatus("发音失败", true);
  };

  window.speechSynthesis.speak(utterance);
}

function getPhoneticHint(word) {
  return word
    .toLowerCase()
    .replaceAll("th", "斯")
    .replaceAll("sh", "时")
    .replaceAll("ch", "吃")
    .replaceAll("ph", "夫")
    .replaceAll("a", "啊")
    .replaceAll("e", "诶")
    .replaceAll("i", "衣")
    .replaceAll("o", "哦")
    .replaceAll("u", "呜");
}

function renderEmpty(text) {
  wordGrid.innerHTML = `<div class="empty-state">${escapeHtml(text)}</div>`;
}

function setStatus(text, isError = false) {
  statusText.textContent = text;
  statusText.style.background = isError ? "#fde8e8" : "#eef8f5";
  statusText.style.color = isError ? "#b42318" : "#2a6c58";
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

import { CONTENT_COLLECTIONS } from "./content.js";

const collections = CONTENT_COLLECTIONS.map((collection) => ({
  ...collection,
  entries: collection.entries.map((entry) => ({
    ...entry,
    words: entry.words.map(([text, meaning]) => ({
      text,
      meaning,
      segments: splitWord(text)
    }))
  }))
}));

const collectionTabs = document.querySelector("#collectionTabs");
const collectionEyebrow = document.querySelector("#collectionEyebrow");
const heroTitle = document.querySelector("#heroTitle");
const heroSubtitle = document.querySelector("#heroSubtitle");
const unitTabs = document.querySelector("#unitTabs");
const wordGrid = document.querySelector("#wordGrid");
const resultTitle = document.querySelector("#resultTitle");
const resultDescription = document.querySelector("#resultDescription");
const detailPanel = document.querySelector("#detailPanel");
const detailTitle = document.querySelector("#detailTitle");
const detailSubtitle = document.querySelector("#detailSubtitle");
const searchInput = document.querySelector("#searchInput");
const statusText = document.querySelector("#statusText");
const installBtn = document.querySelector("#installBtn");
const readingSection = document.querySelector("#readingSection");
const readingTitle = document.querySelector("#readingTitle");
const readingMeta = document.querySelector("#readingMeta");
const readingBody = document.querySelector("#readingBody");
const playReadingBtn = document.querySelector("#playReadingBtn");

let speechVoices = [];
let currentCollectionId = collections[0].id;
let currentEntryId = collections[0].entries[0].id;
let selectedWordKey = "";
let installPromptEvent = null;

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  installPromptEvent = event;
  installBtn.hidden = false;
});

installBtn.addEventListener("click", async () => {
  if (!installPromptEvent) {
    setStatus("请在浏览器菜单里选择“添加到主屏幕”。");
    return;
  }

  installPromptEvent.prompt();
  await installPromptEvent.userChoice;
  installPromptEvent = null;
  installBtn.hidden = true;
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => registration.unregister());
    });
  });
}

if ("speechSynthesis" in window) {
  speechVoices = window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () => {
    speechVoices = window.speechSynthesis.getVoices();
  };
}

searchInput.addEventListener("input", () => {
  renderCurrentList();
});

playReadingBtn.addEventListener("click", () => {
  const entry = getCurrentEntry();
  if (!entry?.reading) {
    return;
  }

  playText(entry.reading.paragraphs.join(" "), entry.reading.title, 0.9);
});

selectDefaultWord(getCurrentEntry(), true);
renderApp();

function renderApp() {
  renderHero();
  renderCollections();
  renderTabs();
  renderCurrentList();
  renderReading();
}

function renderHero() {
  const collection = getCurrentCollection();
  collectionEyebrow.textContent = collection.eyebrow;
  heroTitle.textContent = collection.heroTitle;
  heroSubtitle.textContent = collection.heroSubtitle;
  searchInput.placeholder = collection.searchPlaceholder;
}

function renderCollections() {
  collectionTabs.innerHTML = "";

  for (const collection of collections) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `collection-tab ${collection.id === currentCollectionId ? "active" : ""}`;
    button.innerHTML = `
      <span class="collection-tab-label">${escapeHtml(collection.label)}</span>
      <span class="collection-tab-note">${escapeHtml(collection.tabNote)}</span>
    `;
    button.addEventListener("click", () => {
      currentCollectionId = collection.id;
      currentEntryId = collection.entries[0].id;
      searchInput.value = "";
      selectDefaultWord(getCurrentEntry(), true);
      renderApp();
      setStatus(`已切换到 ${collection.label}`);
    });
    collectionTabs.appendChild(button);
  }
}

function renderTabs() {
  const collection = getCurrentCollection();

  unitTabs.innerHTML = "";
  for (const entry of collection.entries) {
    const button = document.createElement("button");
    const note = collection.id === "level-a" ? entry.title : entry.meta;

    button.type = "button";
    button.className = `unit-tab ${entry.id === currentEntryId ? "active" : ""}`;
    button.innerHTML = `
      <span class="unit-tab-label">${escapeHtml(entry.label)}</span>
      <span class="unit-tab-note">${escapeHtml(note)}</span>
    `;
    button.addEventListener("click", () => {
      currentEntryId = entry.id;
      searchInput.value = "";
      selectDefaultWord(getCurrentEntry(), true);
      renderTabs();
      renderCurrentList();
      renderReading();
      setStatus(`已切换到 ${entry.label}`);
    });
    unitTabs.appendChild(button);
  }
}

function renderCurrentList() {
  const entry = getCurrentEntry();
  const keyword = searchInput.value.trim().toLowerCase();
  const list = keyword
    ? entry.words.filter(
        (word) =>
          word.text.toLowerCase().includes(keyword) ||
          word.meaning.toLowerCase().includes(keyword)
      )
    : entry.words;

  resultTitle.textContent = entry.title;
  resultDescription.textContent = keyword
    ? `搜索到 ${list.length} 个匹配词`
    : `${entry.meta} · 共 ${entry.words.length} 个词`;

  if (!list.length) {
    wordGrid.innerHTML = '<div class="empty-state">当前内容里没有匹配的单词。</div>';
    return;
  }

  wordGrid.innerHTML = "";
  for (const word of list) {
    const key = getWordKey(entry, word);
    const button = document.createElement("button");
    button.type = "button";
    button.className = `word-card ${selectedWordKey === key ? "playing" : ""}`;
    button.innerHTML = `
      <div class="word-text">${escapeHtml(word.text)}</div>
      <div class="word-meta">${escapeHtml(word.meaning)}</div>
      <div class="word-tip">${escapeHtml(word.segments.join(" "))}</div>
    `;
    button.addEventListener("click", () => {
      selectedWordKey = key;
      showWordDetail(word);
      playWord(word.text);
      renderCurrentList();
    });
    wordGrid.appendChild(button);
  }
}

function renderReading() {
  const entry = getCurrentEntry();
  const reading = entry.reading;

  if (!reading) {
    readingSection.hidden = true;
    return;
  }

  readingSection.hidden = false;
  readingTitle.textContent = reading.title;
  readingMeta.textContent = reading.meta;
  readingBody.innerHTML = reading.paragraphs
    .map(
      (paragraph, index) => `
        <article class="reading-paragraph">
          <div class="reading-paragraph-head">
            <span class="reading-index">P${index + 1}</span>
            <button class="reading-action" type="button" data-index="${index}">朗读这段</button>
          </div>
          <p>${escapeHtml(paragraph)}</p>
        </article>
      `
    )
    .join("");

  readingBody.querySelectorAll(".reading-action").forEach((button) => {
    button.addEventListener("click", () => {
      const paragraphIndex = Number(button.dataset.index);
      const paragraph = reading.paragraphs[paragraphIndex];
      playText(paragraph, `${reading.title} 第 ${paragraphIndex + 1} 段`, 0.9);
    });
  });
}

function showWordDetail(word, silent = false) {
  detailTitle.textContent = word.text;
  detailSubtitle.textContent = `中文：${word.meaning} · 再次点击单词卡片可重复朗读`;
  detailPanel.className = "detail-panel";
  detailPanel.innerHTML = `
    <div class="detail-word">${escapeHtml(word.text)}</div>
    <div class="detail-meaning">中文：${escapeHtml(word.meaning)}</div>
    <div class="detail-read">拆读：${escapeHtml(word.segments.join(" "))}</div>
    <div class="segment-row">
      ${word.segments
        .map((segment) => `<span class="segment-pill">${escapeHtml(segment)}</span>`)
        .join("")}
    </div>
  `;

  if (!silent) {
    setStatus(`当前单词：${word.text}`);
  }
}

function selectDefaultWord(entry, silent = false) {
  const firstWord = entry?.words?.[0];
  if (!firstWord) {
    return;
  }

  selectedWordKey = getWordKey(entry, firstWord);
  showWordDetail(firstWord, silent);
}

function playWord(word) {
  playText(word, word, 0.82);
}

function playText(text, label, rate = 0.88) {
  if (!("speechSynthesis" in window)) {
    setStatus("当前浏览器不支持语音朗读。", true);
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = rate;
  utterance.pitch = 1.02;

  const preferredVoice = speechVoices.find((voice) =>
    voice.lang?.toLowerCase().startsWith("en")
  );
  if (preferredVoice) {
    utterance.voice = preferredVoice;
  }

  setStatus(`正在朗读：${label}`);
  utterance.onend = () => setStatus(`朗读完成：${label}`);
  utterance.onerror = () => setStatus("语音播放失败。", true);
  window.speechSynthesis.speak(utterance);
}

function getCurrentCollection() {
  return collections.find((collection) => collection.id === currentCollectionId) || collections[0];
}

function getCurrentEntry() {
  const collection = getCurrentCollection();
  return collection.entries.find((entry) => entry.id === currentEntryId) || collection.entries[0];
}

function getWordKey(entry, word) {
  return `${entry.id}-${word.text}`.toLowerCase();
}

function splitWord(word) {
  const phrase = word.toLowerCase().trim();
  const phraseManual = {
    "alarm clock": ["alarm", "clock"],
    "jump rope": ["jump", "rope"],
    "tug of war": ["tug", "of", "war"],
    "look at": ["look", "at"],
    "cut down": ["cut", "down"],
    "weather report": ["weath", "er", "re", "port"],
    "turn into": ["turn", "in", "to"],
    "power plant": ["pow", "er", "plant"],
    "solar panel": ["so", "lar", "pan", "el"]
  };

  if (phraseManual[phrase]) {
    return phraseManual[phrase];
  }

  return phrase
    .split(/\s+/)
    .flatMap((part) => splitWordPart(part))
    .filter(Boolean);
}

function splitWordPart(word) {
  const clean = word.toLowerCase().replace(/[^a-z']/g, "");
  if (!clean) {
    return [word];
  }

  const manual = {
    ten: ["t", "en"],
    dress: ["dr", "ess"],
    brush: ["br", "ush"],
    tooth: ["t", "oo", "th"],
    wash: ["w", "ash"],
    breakfast: ["break", "fast"],
    "o'clock": ["o", "clock"],
    thirty: ["thir", "ty"],
    twenty: ["twen", "ty"],
    forty: ["for", "ty"],
    fifty: ["fif", "ty"],
    mother: ["moth", "er"],
    father: ["fa", "ther"],
    together: ["to", "geth", "er"],
    exercise: ["ex", "er", "cise"],
    carry: ["car", "ry"],
    blackboard: ["black", "board"],
    tomato: ["to", "ma", "to"],
    excuse: ["ex", "cuse"],
    toilet: ["toi", "let"],
    window: ["win", "dow"],
    piano: ["pi", "a", "no"],
    computer: ["com", "pu", "ter"],
    classroom: ["class", "room"],
    library: ["li", "bra", "ry"],
    before: ["be", "fore"],
    anyone: ["an", "yone"],
    vegetable: ["veg", "e", "ta", "ble"],
    perfume: ["per", "fume"],
    toothpaste: ["tooth", "paste"],
    lemonade: ["lem", "on", "ade"],
    helpful: ["help", "ful"],
    lonely: ["lone", "ly"],
    toddler: ["tod", "dler"],
    circle: ["cir", "cle"],
    outside: ["out", "side"],
    prepare: ["pre", "pare"],
    lightning: ["light", "ning"],
    umbrella: ["um", "brel", "la"],
    everywhere: ["ev", "ery", "where"],
    important: ["im", "por", "tant"],
    builder: ["build", "er"],
    sturdy: ["stur", "dy"],
    shadow: ["shad", "ow"],
    turbine: ["tur", "bine"],
    outlet: ["out", "let"],
    electricity: ["e", "lec", "tric", "i", "ty"]
  };

  if (manual[clean]) {
    return manual[clean];
  }

  const parts = clean.split("'");
  const segments = [];
  for (const part of parts) {
    segments.push(...splitSimplePart(part));
  }
  return segments.filter(Boolean);
}

function splitSimplePart(part) {
  if (part.length <= 3) {
    return splitTinyWord(part);
  }

  const vowelMatches = [...part.matchAll(/[aeiouy]+/g)];
  if (!vowelMatches.length) {
    return [part];
  }

  const segments = [];
  let cursor = 0;

  if (vowelMatches[0].index > 0) {
    segments.push(part.slice(0, vowelMatches[0].index));
    cursor = vowelMatches[0].index;
  }

  for (let index = 0; index < vowelMatches.length; index += 1) {
    const current = vowelMatches[index];
    const next = vowelMatches[index + 1];
    const currentStart = current.index;
    const afterCurrent = currentStart + current[0].length;
    const nextStart = next ? next.index : part.length;
    const middle = part.slice(afterCurrent, nextStart);

    if (!next) {
      segments.push(part.slice(cursor));
      break;
    }

    const take = Math.max(0, middle.length - 1);
    const nextCursor = afterCurrent + take;
    segments.push(part.slice(cursor, nextCursor));
    cursor = nextCursor;
  }

  return segments.filter(Boolean);
}

function splitTinyWord(word) {
  if (word.length <= 2) {
    return [word];
  }

  const firstVowel = word.search(/[aeiouy]/);
  if (firstVowel <= 0) {
    return [word];
  }

  return [word.slice(0, firstVowel), word.slice(firstVowel)];
}

function setStatus(text, isError = false) {
  statusText.textContent = text;
  statusText.style.background = isError ? "#fde8e8" : "#eef8f5";
  statusText.style.color = isError ? "#b42318" : "#2a6c58";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

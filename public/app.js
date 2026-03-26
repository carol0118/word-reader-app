const WORD_UNITS = [
  {
    id: "unit-1",
    label: "Unit 1",
    words: [
      ["dress", "穿衣；连衣裙"],
      ["brush", "刷"],
      ["tooth", "牙齿"],
      ["wash", "洗"],
      ["breakfast", "早餐"],
      ["after", "在……之后"],
      ["forget", "忘记"],
      ["table", "桌子"],
      ["late", "迟到"],
      ["quick", "快的"],
      ["go", "去"],
      ["Saturday", "星期六"],
      ["today", "今天"]
    ]
  },
  {
    id: "unit-2",
    label: "Unit 2",
    words: [
      ["o'clock", "点钟"],
      ["half", "一半"],
      ["past", "过了；过去的"],
      ["thirty", "三十"],
      ["home", "家"],
      ["school", "学校"],
      ["bed", "床"],
      ["time", "时间"],
      ["activity", "活动"],
      ["no", "不；没有"],
      ["next", "紧接着"],
      ["eight", "八"],
      ["hurry", "赶快"],
      ["dream", "梦"],
      ["eleven", "十一"],
      ["twelve", "十二"],
      ["ten", "十"]
    ]
  },
  {
    id: "unit-3",
    label: "Unit 3",
    words: [
      ["plan", "计划"],
      ["twenty", "二十"],
      ["forty", "四十"],
      ["fifty", "五十"],
      ["dinner", "晚餐"],
      ["book", "书"],
      ["sport", "运动"],
      ["TV", "电视"],
      ["club", "社团"],
      ["at", "在"],
      ["maybe", "也许"],
      ["think", "想；认为"],
      ["about", "关于"],
      ["pack", "收拾"],
      ["schoolbag", "书包"],
      ["hour", "小时"],
      ["every", "每个"],
      ["day", "一天"],
      ["sleep", "睡觉"],
      ["find", "找到"],
      ["Sunday", "星期日"],
      ["child", "孩子"],
      ["mother", "母亲"],
      ["father", "父亲"],
      ["new", "新的"],
      ["year", "年"]
    ]
  },
  {
    id: "unit-4",
    label: "Unit 4",
    words: [
      ["join", "加入"],
      ["sure", "当然"],
      ["love", "喜爱"],
      ["football", "足球"],
      ["just", "只是；正好"],
      ["thing", "东西；事物"],
      ["fun", "乐趣；有趣的"],
      ["ask", "邀请；询问"],
      ["her", "她；她的"],
      ["idea", "主意"],
      ["eat", "吃"],
      ["together", "一起"]
    ]
  },
  {
    id: "unit-5",
    label: "Unit 5",
    words: [
      ["run", "跑"],
      ["best", "最好；最好的"],
      ["rule", "规则"],
      ["take", "携带；拿走"],
      ["turn", "机会；转动"],
      ["speak", "说话"],
      ["give", "给"],
      ["away", "离开"],
      ["must", "必须"],
      ["need", "需要"],
      ["top", "顶部；最高"],
      ["talk", "谈话"],
      ["exercise", "锻炼；练习"],
      ["clean", "干净的；打扫"],
      ["arrive", "到达"]
    ]
  },
  {
    id: "unit-6",
    label: "Unit 6",
    words: [
      ["stand", "站立"],
      ["line", "排；行"],
      ["lead", "带领"],
      ["way", "路线；方法"],
      ["carry", "搬运"],
      ["food", "食物"],
      ["out", "出"],
      ["paper", "试卷；纸"],
      ["lunch", "午餐"],
      ["light", "灯；轻的"],
      ["blackboard", "黑板"],
      ["door", "门"],
      ["plant", "植物"],
      ["Monday", "星期一"],
      ["April", "四月"],
      ["he", "他"],
      ["such", "非常；这样的"],
      ["should", "应该"],
      ["some", "一些"],
      ["tomato", "西红柿"],
      ["work", "工作"],
      ["so", "很；所以"],
      ["other", "他人；其他的"],
      ["PE", "体育"],
      ["maths", "数学"]
    ]
  },
  {
    id: "unit-7",
    label: "Unit 7",
    words: [
      ["hold", "使保持；拿着"],
      ["excuse", "原谅"],
      ["voice", "声音"],
      ["down", "减弱；向下"],
      ["or", "或者"],
      ["drink", "喝"],
      ["we", "我们"],
      ["polite", "礼貌的"],
      ["there", "那里"],
      ["sorry", "对不起"],
      ["toilet", "厕所"],
      ["knock", "敲"],
      ["off", "关闭"],
      ["water", "水"],
      ["block", "挡住"]
    ]
  },
  {
    id: "unit-8",
    label: "Unit 8",
    words: [
      ["window", "窗户"],
      ["fan", "风扇；爱好者"],
      ["close", "关闭"],
      ["piano", "钢琴"],
      ["desk", "书桌"],
      ["computer", "电脑"],
      ["use", "使用"],
      ["care", "小心；照料"],
      ["chair", "椅子"],
      ["classroom", "教室"],
      ["library", "图书馆"],
      ["anyone", "任何人"],
      ["before", "在……之前"],
      ["place", "地点"]
    ]
  },
  {
    id: "review",
    label: "Review",
    words: [
      ["litter", "乱扔；垃圾"],
      ["road", "道路"],
      ["sign", "标志"],
      ["maybe", "也许"]
    ]
  }
].map((unit) => ({
  ...unit,
  words: unit.words.map(([text, meaning]) => ({
    text,
    meaning,
    segments: splitWord(text)
  }))
}));

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

let speechVoices = [];
let currentUnitId = WORD_UNITS[0].id;
let selectedWordKey = "";
let installPromptEvent = null;

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
    navigator.serviceWorker.register("./sw.js");
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

renderTabs();
renderCurrentList();
showWordDetail(WORD_UNITS[0].words[0], true);

function renderTabs() {
  unitTabs.innerHTML = "";

  for (const unit of WORD_UNITS) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `unit-tab ${unit.id === currentUnitId ? "active" : ""}`;
    button.textContent = unit.label;
    button.addEventListener("click", () => {
      currentUnitId = unit.id;
      searchInput.value = "";
      renderTabs();
      renderCurrentList();
      setStatus(`已切换到 ${unit.label}`);
    });
    unitTabs.appendChild(button);
  }
}

function renderCurrentList() {
  const keyword = searchInput.value.trim().toLowerCase();
  const currentUnit = WORD_UNITS.find((unit) => unit.id === currentUnitId) || WORD_UNITS[0];
  const list = keyword
    ? currentUnit.words.filter(
        (word) =>
          word.text.toLowerCase().includes(keyword) ||
          word.meaning.toLowerCase().includes(keyword)
      )
    : currentUnit.words;

  resultTitle.textContent = currentUnit.label;
  resultDescription.textContent = keyword
    ? `搜索到 ${list.length} 个结果`
    : `共 ${currentUnit.words.length} 个单词`;

  if (!list.length) {
    wordGrid.innerHTML = `<div class="empty-state">这个单元里没有匹配的单词。</div>`;
    return;
  }

  wordGrid.innerHTML = "";
  for (const word of list) {
    const key = `${currentUnit.id}-${word.text}`.toLowerCase();
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

function showWordDetail(word, silent = false) {
  detailTitle.textContent = word.text;
  detailSubtitle.textContent = `${word.meaning} · 点击单词卡片可重复播放`;
  detailPanel.className = "detail-panel";
  detailPanel.innerHTML = `
    <div class="detail-word">${escapeHtml(word.text)}</div>
    <div class="detail-meaning">中文：${escapeHtml(word.meaning)}</div>
    <div class="detail-read">拆读：${escapeHtml(word.segments.join(" "))}</div>
    <div class="segment-row">
      ${word.segments.map((segment) => `<span class="segment-pill">${escapeHtml(segment)}</span>`).join("")}
    </div>
  `;

  if (!silent) {
    setStatus(`当前单词：${word.text}`);
  }
}

function playWord(word) {
  if (!("speechSynthesis" in window)) {
    setStatus("当前浏览器不支持语音播放", true);
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(word);
  utterance.lang = "en-US";
  utterance.rate = 0.82;
  utterance.pitch = 1.03;

  const preferredVoice = speechVoices.find((voice) => voice.lang?.toLowerCase().startsWith("en"));
  if (preferredVoice) {
    utterance.voice = preferredVoice;
  }

  setStatus(`正在播放：${word}`);
  utterance.onend = () => setStatus(`播放完成：${word}`);
  utterance.onerror = () => setStatus("发音失败", true);
  window.speechSynthesis.speak(utterance);
}

function splitWord(word) {
  const clean = word.toLowerCase().replace(/[^a-z']/g, "");
  if (!clean) {
    return [word];
  }

  const manual = {
    "ten": ["t", "en"],
    "dress": ["dr", "ess"],
    "brush": ["br", "ush"],
    "tooth": ["t", "oo", "th"],
    "wash": ["w", "ash"],
    "breakfast": ["break", "fast"],
    "o'clock": ["o", "clock"],
    "thirty": ["thir", "ty"],
    "twenty": ["twen", "ty"],
    "forty": ["for", "ty"],
    "fifty": ["fif", "ty"],
    "mother": ["moth", "er"],
    "father": ["fa", "ther"],
    "together": ["to", "geth", "er"],
    "exercise": ["ex", "er", "cise"],
    "carry": ["car", "ry"],
    "blackboard": ["black", "board"],
    "tomato": ["to", "ma", "to"],
    "excuse": ["ex", "cuse"],
    "toilet": ["toi", "let"],
    "window": ["win", "dow"],
    "piano": ["pi", "a", "no"],
    "computer": ["com", "pu", "ter"],
    "classroom": ["class", "room"],
    "library": ["li", "bra", "ry"],
    "before": ["be", "fore"],
    "anyone": ["an", "yone"],
    "breakfast": ["break", "fast"]
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

  for (let i = 0; i < vowelMatches.length; i += 1) {
    const current = vowelMatches[i];
    const next = vowelMatches[i + 1];
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

// ===============================================
//  食事記録アプリ  ステージ0
//  「食べたもの」を記録して、日付ごとに一覧表示する。
//  データはブラウザの中（localStorage）に保存する。
// ===============================================

// localStorage に保存するときの「引き出しの名前」。
// この名前でデータを出し入れする。
const STORAGE_KEY = "diet-app-entries";

// 画面の部品を先に取っておく（毎回 getElementById を書かなくて済む）
const form = document.getElementById("add-form");
const dateInput = document.getElementById("date-input");
const foodInput = document.getElementById("food-input");
const logList = document.getElementById("log-list");


// -----------------------------------------------
//  データの読み書き
// -----------------------------------------------

// 保存されている記録をすべて読み出して、配列で返す。
// まだ何もなければ空の配列を返す。
function loadEntries() {
  const json = localStorage.getItem(STORAGE_KEY);
  if (!json) {
    return [];
  }
  try {
    return JSON.parse(json); // 文字列 → 配列 に戻す
  } catch (e) {
    // 万一データが壊れていたら、空から始める
    console.error("保存データが読めませんでした", e);
    return [];
  }
}

// 記録の配列を localStorage に保存する。
function saveEntries(entries) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries)); // 配列 → 文字列
}


// -----------------------------------------------
//  記録の追加・削除
// -----------------------------------------------

// 1件追加する。
function addEntry(date, food) {
  const entries = loadEntries();
  entries.push({
    id: Date.now(),   // 重複しない目印として「今の時刻の数値」を使う
    date: date,       // "2026-08-29" のような文字列
    food: food,       // 食べたもの
  });
  saveEntries(entries);
  render(); // 画面を作り直す
}

// id を指定して1件削除する。
function deleteEntry(id) {
  let entries = loadEntries();
  entries = entries.filter((entry) => entry.id !== id); // その id 以外を残す
  saveEntries(entries);
  render();
}


// -----------------------------------------------
//  画面を作る
// -----------------------------------------------

function render() {
  const entries = loadEntries();

  // いったん中身を空にする
  logList.innerHTML = "";

  if (entries.length === 0) {
    logList.innerHTML = '<p class="empty">まだ記録がありません。上のフォームから追加してみましょう。</p>';
    return;
  }

  // 日付ごとにまとめる： { "2026-08-29": [entry, entry], ... }
  const byDate = {};
  for (const entry of entries) {
    if (!byDate[entry.date]) {
      byDate[entry.date] = [];
    }
    byDate[entry.date].push(entry);
  }

  // 日付を新しい順に並べる
  const dates = Object.keys(byDate).sort().reverse();

  for (const date of dates) {
    // 日付の見出し
    const dayBox = document.createElement("div");
    dayBox.className = "day";

    const heading = document.createElement("h2");
    heading.textContent = formatDate(date);
    dayBox.appendChild(heading);

    // その日の記録を1件ずつ
    for (const entry of byDate[date]) {
      const row = document.createElement("div");
      row.className = "entry";

      const name = document.createElement("span");
      name.textContent = entry.food;

      const delBtn = document.createElement("button");
      delBtn.className = "delete";
      delBtn.textContent = "削除";
      delBtn.addEventListener("click", () => deleteEntry(entry.id));

      row.appendChild(name);
      row.appendChild(delBtn);
      dayBox.appendChild(row);
    }

    logList.appendChild(dayBox);
  }
}

// "2026-08-29" → "2026年8月29日（金）" のように読みやすくする
function formatDate(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  const week = ["日", "月", "火", "水", "木", "金", "土"][d.getDay()];
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${week}）`;
}


// -----------------------------------------------
//  フォームが送信されたときの処理
// -----------------------------------------------

form.addEventListener("submit", (event) => {
  event.preventDefault(); // ページの再読み込みを止める（フォームの既定の動き）

  const date = dateInput.value;
  const food = foodInput.value.trim();

  if (!date || !food) {
    return; // どちらか空なら何もしない
  }

  addEntry(date, food);

  // 次の入力に備えて、食べたものの欄だけ空にする
  foodInput.value = "";
  foodInput.focus();
});


// -----------------------------------------------
//  起動時の処理
// -----------------------------------------------

// 日付欄の初期値を「今日」にする
dateInput.value = new Date().toISOString().slice(0, 10);

// 最初の一覧を表示する
render();

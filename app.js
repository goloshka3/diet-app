// ===============================================
//  食事記録アプリ  ステージ1
//  「食べたもの」＋栄養（カロリー・たんぱく質など7種類）を記録し、
//  日付ごとに一覧表示する。データはブラウザの中（localStorage）に保存する。
// ===============================================

// localStorage に保存するときの「引き出しの名前」。
// この名前でデータを出し入れする。
const STORAGE_KEY = "diet-app-entries";

// 画面の部品を先に取っておく（毎回 getElementById を書かなくて済む）
const form = document.getElementById("add-form");
const dateInput = document.getElementById("date-input");
const foodSelect = document.getElementById("food-select");
const foodInput = document.getElementById("food-input");
const logList = document.getElementById("log-list");

// 栄養の入力欄（7つ）
const kcalInput = document.getElementById("kcal-input");
const proteinInput = document.getElementById("protein-input");
const fatInput = document.getElementById("fat-input");
const carbInput = document.getElementById("carb-input");
const fiberInput = document.getElementById("fiber-input");
const ironInput = document.getElementById("iron-input");
const calciumInput = document.getElementById("calcium-input");

// 栄養の項目一覧。キー（保存名）とラベル・単位をまとめておくと、
// 表示や合計のときに同じ書き方を繰り返さずに済む。
const NUTRIENTS = [
  { key: "kcal", label: "カロリー", unit: "kcal" },
  { key: "protein", label: "たんぱく質", unit: "g" },
  { key: "fat", label: "脂質", unit: "g" },
  { key: "carb", label: "炭水化物", unit: "g" },
  { key: "fiber", label: "食物繊維", unit: "g" },
  { key: "iron", label: "鉄", unit: "mg" },
  { key: "calcium", label: "カルシウム", unit: "mg" },
];

// このうち「目標と比べて不足を判定する」項目（脂質・炭水化物以外）
const JUDGED = ["kcal", "protein", "fiber", "iron", "calcium"];


// 入力文字を数値にする。空欄や数字でないものは 0 として扱う。
function toNumber(value) {
  const n = parseFloat(value);
  return isNaN(n) ? 0 : n;
}

// 小数の足し算で出る細かい誤差（例: 0.1+0.2=0.30000000004）を、
// 小数第1位までに丸める。
function roundNutrient(value) {
  return Math.round(value * 10) / 10;
}

// 記録の配列を受け取り、栄養ごとの合計を { kcal, protein, ... } で返す。
function sumNutrition(entries) {
  const total = {};
  for (const n of NUTRIENTS) {
    total[n.key] = 0; // まず全項目を 0 で用意
  }
  for (const entry of entries) {
    for (const n of NUTRIENTS) {
      total[n.key] += toNumber(entry[n.key]); // 各記録の値を足していく
    }
  }
  return total;
}


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

// 1件追加する。entry は { date, food, kcal, protein, ... } の形。
function addEntry(entry) {
  const entries = loadEntries();
  entry.id = Date.now(); // 重複しない目印として「今の時刻の数値」を使う
  entries.push(entry);
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

  // 何を基準に判定しているかの説明を先頭に出す
  const note = document.createElement("p");
  note.className = "profile-note";
  note.textContent = "目標の基準： " + profileText(PROFILE);
  logList.appendChild(note);

  // その日の目標値（毎日同じなのでループの外で1回だけ取得）
  const targets = getTargets(PROFILE);

  for (const date of dates) {
    // 日付の見出し
    const dayBox = document.createElement("div");
    dayBox.className = "day";

    const heading = document.createElement("h2");
    heading.textContent = formatDate(date);
    dayBox.appendChild(heading);

    // その日の合計
    const total = sumNutrition(byDate[date]);

    const totalLine = document.createElement("p");
    totalLine.className = "day-total";
    totalLine.textContent = "合計： " + formatNutrition(total);
    dayBox.appendChild(totalLine);

    // その日の合計 vs 目標 の判定
    dayBox.appendChild(buildJudgement(total, targets));

    // その日の記録を1件ずつ
    for (const entry of byDate[date]) {
      const row = document.createElement("div");
      row.className = "entry";

      // 左側：食べたもの＋栄養を縦に積む入れ物
      const main = document.createElement("div");
      main.className = "entry-main";

      const name = document.createElement("span");
      name.textContent = entry.food;
      main.appendChild(name);

      const nutrition = document.createElement("span");
      nutrition.className = "nutrition";
      nutrition.textContent = formatNutrition(entry);
      main.appendChild(nutrition);

      const delBtn = document.createElement("button");
      delBtn.className = "delete";
      delBtn.textContent = "削除";
      delBtn.addEventListener("click", () => deleteEntry(entry.id));

      row.appendChild(main);
      row.appendChild(delBtn);
      dayBox.appendChild(row);
    }

    logList.appendChild(dayBox);
  }
}

// 記録1件の栄養を「520 kcal ・ たんぱく質 18g ・ …」という短い文字列にする。
// 古い記録（栄養の項目がない）は 0 として扱う。
function formatNutrition(entry) {
  return NUTRIENTS
    .map((n) => `${n.label} ${roundNutrient(toNumber(entry[n.key]))}${n.unit}`)
    .join(" ・ ");
}

// その日の合計(total)と目標(targets)を比べて、判定の表示部品を作る。
function buildJudgement(total, targets) {
  const box = document.createElement("div");
  box.className = "judge";

  for (const key of JUDGED) {
    const info = NUTRIENTS.find((n) => n.key === key); // ラベルと単位を取り出す
    const got = roundNutrient(toNumber(total[key]));
    const goal = targets[key];
    const percent = goal > 0 ? Math.round((got / goal) * 100) : 0;
    const status = judgeStatus(key, percent);

    const row = document.createElement("div");
    row.className = "judge-row";

    const label = document.createElement("span");
    label.className = "judge-label";
    label.textContent = info.label;

    const value = document.createElement("span");
    value.className = "judge-value";
    value.textContent = `${got} / ${goal}${info.unit}（${percent}%）`;

    const mark = document.createElement("span");
    mark.className = "judge-mark " + status.className;
    mark.textContent = status.text;

    row.appendChild(label);
    row.appendChild(value);
    row.appendChild(mark);
    box.appendChild(row);
  }

  return box;
}

// 達成率(%)から「不足」「もう少し」「達成」などの判定を返す。
function judgeStatus(key, percent) {
  // カロリーは「不足」ではなく多い/少ないで見る（ダイエット中は少なめが目的のこともある）
  if (key === "kcal") {
    if (percent > 110) return { text: "多め", className: "over" };
    if (percent < 90) return { text: "少なめ", className: "soft" };
    return { text: "適正", className: "ok" };
  }
  if (percent >= 100) return { text: "達成", className: "ok" };
  if (percent >= 70) return { text: "もう少し", className: "soft" };
  return { text: "不足", className: "under" };
}

// "2026-08-29" → "2026年8月29日（金）" のように読みやすくする
function formatDate(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  const week = ["日", "月", "火", "水", "木", "金", "土"][d.getDay()];
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${week}）`;
}


// -----------------------------------------------
//  食品一覧（ドロップダウン）
// -----------------------------------------------

// foods.js の FOODS から <option> を作って select に入れる。
function buildFoodOptions() {
  FOODS.forEach((food, index) => {
    const option = document.createElement("option");
    option.value = index;          // 何番目の食品かを値にする
    option.textContent = food.name;
    foodSelect.appendChild(option);
  });
}

// 食品が選ばれたら、名前と栄養7項目を入力欄に写す。
foodSelect.addEventListener("change", () => {
  const index = foodSelect.value;
  if (index === "") {
    return; // 「— 一覧から選ぶ —」に戻したときは何もしない
  }

  const food = FOODS[index];
  foodInput.value = food.name;
  kcalInput.value = food.kcal;
  proteinInput.value = food.protein;
  fatInput.value = food.fat;
  carbInput.value = food.carb;
  fiberInput.value = food.fiber;
  ironInput.value = food.iron;
  calciumInput.value = food.calcium;
});


// -----------------------------------------------
//  フォームが送信されたときの処理
// -----------------------------------------------

form.addEventListener("submit", (event) => {
  event.preventDefault(); // ページの再読み込みを止める（フォームの既定の動き）

  const date = dateInput.value;
  const food = foodInput.value.trim();

  if (!date || !food) {
    return; // 日付か食べたものが空なら何もしない
  }

  addEntry({
    date: date,
    food: food,
    kcal: toNumber(kcalInput.value),
    protein: toNumber(proteinInput.value),
    fat: toNumber(fatInput.value),
    carb: toNumber(carbInput.value),
    fiber: toNumber(fiberInput.value),
    iron: toNumber(ironInput.value),
    calcium: toNumber(calciumInput.value),
  });

  // 次の入力に備えて、日付以外の欄を空にする
  foodSelect.value = "";
  foodInput.value = "";
  kcalInput.value = "";
  proteinInput.value = "";
  fatInput.value = "";
  carbInput.value = "";
  fiberInput.value = "";
  ironInput.value = "";
  calciumInput.value = "";
  foodInput.focus();
});


// -----------------------------------------------
//  起動時の処理
// -----------------------------------------------

// 日付欄の初期値を「今日」にする
dateInput.value = new Date().toISOString().slice(0, 10);

// 食品一覧のドロップダウンを組み立てる
buildFoodOptions();

// 最初の一覧を表示する
render();

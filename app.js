// ===============================================
//  食事記録アプリ
//  食べたもの＋栄養7種類を記録 → 日付ごとに一覧・その日の合計 →
//  食事摂取基準と比べて不足を判定 → 補う食材を提案。
//  食品は「一覧から選ぶ / バーコード・商品名で検索 / 手入力」。
//  データはブラウザの中（localStorage）に保存する。
// ===============================================

// localStorage に保存するときの「引き出しの名前」。
// この名前でデータを出し入れする。
const STORAGE_KEY = "diet-app-entries";
const API_KEY_STORAGE = "diet-app-api-key"; // Claude API キーの保存名

// 画面の部品を先に取っておく（毎回 getElementById を書かなくて済む）
const form = document.getElementById("add-form");
const dateInput = document.getElementById("date-input");
const barcodeInput = document.getElementById("barcode-input");
const barcodeSearchBtn = document.getElementById("barcode-search");
const barcodeStatus = document.getElementById("barcode-status");
const searchResults = document.getElementById("search-results");
const apiKeyInput = document.getElementById("api-key-input");
const apiKeyToggleBtn = document.getElementById("api-key-toggle");
const apiKeySaveBtn = document.getElementById("api-key-save");
const apiKeyStatus = document.getElementById("api-key-status");
const pfSex = document.getElementById("pf-sex");
const pfAge = document.getElementById("pf-age");
const pfActivity = document.getElementById("pf-activity");
const pfKcal = document.getElementById("pf-kcal");
const pfProtein = document.getElementById("pf-protein");
const pfSaveBtn = document.getElementById("pf-save");
const pfStatus = document.getElementById("pf-status");
const exportBtn = document.getElementById("export-btn");
const importBtn = document.getElementById("import-btn");
const importFile = document.getElementById("import-file");
const backupStatus = document.getElementById("backup-status");
const scanOpenBtn = document.getElementById("scan-open");
const scanCloseBtn = document.getElementById("scan-close");
const scannerOverlay = document.getElementById("scanner-overlay");
const aiReadBtn = document.getElementById("ai-read");
const aiPhotoInput = document.getElementById("ai-photo");
const foodSelect = document.getElementById("food-select");
const foodInput = document.getElementById("food-input");
const amountInput = document.getElementById("amount-input");
const saveFoodBtn = document.getElementById("save-food-btn");
const saveFoodStatus = document.getElementById("save-food-status");
const myFoodsList = document.getElementById("my-foods-list");
const logList = document.getElementById("log-list");

// 栄養の項目一覧。key=保存名、basic:true は常に表示、それ以外は「詳細」を開くと表示。
// 入力欄はこの一覧から app.js が自動で作る（HTMLに1つずつ書かない）。
const NUTRIENTS = [
  { key: "kcal", label: "エネルギー", unit: "kcal", step: "1", basic: true },
  { key: "protein", label: "たんぱく質", unit: "g", step: "0.1", basic: true },
  { key: "fat", label: "脂質", unit: "g", step: "0.1", basic: true },
  { key: "carb", label: "炭水化物", unit: "g", step: "0.1", basic: true },
  { key: "fiber", label: "食物繊維", unit: "g", step: "0.1", basic: true },
  { key: "salt", label: "食塩相当量", unit: "g", step: "0.1", basic: true },
  { key: "calcium", label: "カルシウム", unit: "mg", step: "1", basic: true },
  { key: "iron", label: "鉄", unit: "mg", step: "0.1", basic: true },
  { key: "satfat", label: "飽和脂肪酸", unit: "g", step: "0.1" },
  { key: "sugar", label: "糖質", unit: "g", step: "0.1" },
  { key: "potassium", label: "カリウム", unit: "mg", step: "1" },
  { key: "magnesium", label: "マグネシウム", unit: "mg", step: "1" },
  { key: "zinc", label: "亜鉛", unit: "mg", step: "0.1" },
  { key: "vitA", label: "ビタミンA", unit: "μg", step: "1" },
  { key: "vitD", label: "ビタミンD", unit: "μg", step: "0.1" },
  { key: "vitB1", label: "ビタミンB1", unit: "mg", step: "0.01" },
  { key: "vitB2", label: "ビタミンB2", unit: "mg", step: "0.01" },
  { key: "vitB6", label: "ビタミンB6", unit: "mg", step: "0.01" },
  { key: "vitB12", label: "ビタミンB12", unit: "μg", step: "0.1" },
  { key: "folate", label: "葉酸", unit: "μg", step: "1" },
  { key: "vitC", label: "ビタミンC", unit: "mg", step: "1" },
];

const NUTRIENT_KEYS = NUTRIENTS.map((n) => n.key);

// key → 入力欄(<input>) の対応。buildNutrientFields() で埋める。
const inputByKey = {};

// 目標と比べて判定する項目（脂質・炭水化物・糖質はエネルギー比の話なので判定しない）
const JUDGED = [
  "kcal", "protein", "satfat", "fiber", "salt", "potassium", "calcium",
  "magnesium", "iron", "zinc", "vitA", "vitD", "vitB1", "vitB2", "vitB6",
  "vitB12", "folate", "vitC",
];

// 「多いほど良くない」栄養（不足ではなく取り過ぎを見る）
const OVER_BAD = new Set(["satfat", "salt"]);

// NUTRIENTS から入力欄を作って、基本欄／詳細欄に振り分ける。
function buildNutrientFields() {
  const basicBox = document.getElementById("nutrients-basic");
  const detailBox = document.getElementById("nutrients-detail");

  for (const n of NUTRIENTS) {
    const field = document.createElement("div");
    field.className = "field";

    const label = document.createElement("label");
    label.setAttribute("for", n.key + "-input");
    label.textContent = n.label + " (" + n.unit + ")";

    const input = document.createElement("input");
    input.type = "number";
    input.id = n.key + "-input";
    input.min = "0";
    input.step = n.step || "0.1";
    input.inputMode = "decimal";
    input.placeholder = "0";

    field.appendChild(label);
    field.appendChild(input);
    (n.basic ? basicBox : detailBox).appendChild(field);
    inputByKey[n.key] = input;
  }
}


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

let summaryPeriod = 7;   // まとめの対象期間（日）。0 = 全期間
let summaryOpen = false;  // まとめを開いているか（再描画しても維持）

// 期間内の記録から「1日あたり平均」を計算する。
function summaryData(entries, periodDays) {
  let inRange = entries;
  if (periodDays > 0) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - (periodDays - 1));
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    inRange = entries.filter((e) => e.date >= cutoffStr);
  }

  const dayCount = new Set(inRange.map((e) => e.date)).size;
  const total = sumNutrition(inRange);
  const avg = {};
  for (const key of NUTRIENT_KEYS) {
    avg[key] = dayCount > 0 ? total[key] / dayCount : 0;
  }
  return { avg: avg, dayCount: dayCount };
}

// 「📊 期間のまとめ」の折りたたみ部品を作る。
function buildSummaryBox(entries, targets) {
  const box = document.createElement("details");
  box.className = "summary-box";
  box.open = summaryOpen;
  box.addEventListener("toggle", () => { summaryOpen = box.open; });

  const sum = document.createElement("summary");
  sum.textContent = "📊 期間のまとめ（1日あたり平均）";
  box.appendChild(sum);

  const select = document.createElement("select");
  select.className = "summary-period";
  [["7", "直近7日"], ["14", "直近14日"], ["30", "直近30日"], ["0", "全期間"]]
    .forEach(([value, label]) => {
      const o = document.createElement("option");
      o.value = value;
      o.textContent = label;
      if (Number(value) === summaryPeriod) {
        o.selected = true;
      }
      select.appendChild(o);
    });
  select.addEventListener("change", () => {
    summaryPeriod = Number(select.value);
    render();
  });
  box.appendChild(select);

  const data = summaryData(entries, summaryPeriod);
  const note = document.createElement("p");
  note.className = "summary-note";
  note.textContent = data.dayCount > 0
    ? "記録がある " + data.dayCount + " 日の1日あたり平均"
    : "この期間に記録がありません";
  box.appendChild(note);

  if (data.dayCount > 0) {
    box.appendChild(buildJudgement(data.avg, targets));
  }
  return box;
}

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

  // 何を基準に判定しているかの説明を先頭に出す（設定で変えられる）
  const profile = loadProfile();
  const note = document.createElement("p");
  note.className = "profile-note";
  note.textContent = "目標の基準： " + profileText(profile);
  logList.appendChild(note);

  // その日の目標値（毎日同じなのでループの外で1回だけ取得）
  const targets = getTargets(profile);

  // 期間のまとめ（1日あたり平均）
  logList.appendChild(buildSummaryBox(entries, targets));

  const todayStr = new Date().toISOString().slice(0, 10);

  for (const date of dates) {
    // 各日は折りたたみ。今日だけ開いた状態にする。
    const dayBox = document.createElement("details");
    dayBox.className = "day";
    dayBox.open = date === todayStr;

    // その日の合計
    const total = sumNutrition(byDate[date]);

    // 見出し（閉じているときはここだけ見える）
    const heading = document.createElement("summary");
    heading.className = "day-summary";
    const kcal = roundNutrient(toNumber(total.kcal));
    heading.textContent = formatDate(date) +
      "　" + kcal + "kcal・" + byDate[date].length + "品";
    dayBox.appendChild(heading);

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

// 記録1件（または合計）の栄養を「エネルギー 520kcal ・ たんぱく質 18g ・ …」にする。
// 値が入っている項目だけ表示する（0 や未記録は省く）。
function formatNutrition(entry) {
  const parts = NUTRIENTS
    .filter((n) => toNumber(entry[n.key]) > 0)
    .map((n) => `${n.label} ${roundNutrient(toNumber(entry[n.key]))}${n.unit}`);
  return parts.length ? parts.join(" ・ ") : "栄養の記録なし";
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

    // 1行目：ラベル・数値・判定ラベル
    const head = document.createElement("div");
    head.className = "judge-head";

    const label = document.createElement("span");
    label.className = "judge-label";
    label.textContent = info.label;

    const value = document.createElement("span");
    value.className = "judge-value";
    value.textContent = `${got} / ${goal}${info.unit}（${percent}%）`;

    const mark = document.createElement("span");
    mark.className = "judge-mark " + status.className;
    mark.textContent = status.text;

    head.appendChild(label);
    head.appendChild(value);
    head.appendChild(mark);

    // 2行目：棒グラフ（バーの幅 = 達成率。ただし見た目は100%で頭打ち）
    const bar = document.createElement("div");
    bar.className = "judge-bar";

    const fill = document.createElement("div");
    fill.className = "judge-bar-fill " + status.className;
    fill.style.width = Math.min(percent, 100) + "%";

    bar.appendChild(fill);

    row.appendChild(head);
    row.appendChild(bar);

    // 「不足」のときは、補う食材の候補を出す（ステージ3）
    if (status.className === "under" && RICH_FOODS[key]) {
      const suggest = document.createElement("div");
      suggest.className = "judge-suggest";
      const foods = RICH_FOODS[key].slice(0, 4).join(" ・ "); // 先頭4つ
      suggest.textContent = "補う食材: " + foods;
      row.appendChild(suggest);
    }

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
  // 食塩・飽和脂肪酸は「多すぎ」を見る
  if (OVER_BAD.has(key)) {
    if (percent > 120) return { text: "とりすぎ", className: "under" };
    if (percent > 100) return { text: "やや多い", className: "soft" };
    return { text: "OK", className: "ok" };
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

const MY_FOODS_STORAGE = "diet-app-my-foods"; // 自分で登録した食品

// 登録した食品を読む。
function loadMyFoods() {
  try {
    const arr = JSON.parse(localStorage.getItem(MY_FOODS_STORAGE) || "[]");
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    return [];
  }
}

function saveMyFoods(arr) {
  localStorage.setItem(MY_FOODS_STORAGE, JSON.stringify(arr));
}

// 内蔵 FOODS ＋ 登録食品 を1つの配列にまとめたもの（選択の値＝この配列の添字）
let combinedFoods = [];

// ドロップダウンを組み立て直す。
function buildFoodOptions() {
  foodSelect.innerHTML = '<option value="">— 一覧から選ぶ —</option>';
  combinedFoods = [];

  FOODS.forEach((food) => {
    combinedFoods.push(food);
    foodSelect.appendChild(makeFoodOption(food, combinedFoods.length - 1));
  });

  const myFoods = loadMyFoods();
  if (myFoods.length > 0) {
    const group = document.createElement("optgroup");
    group.label = "登録した食品";
    myFoods.forEach((food) => {
      combinedFoods.push(food);
      group.appendChild(makeFoodOption(food, combinedFoods.length - 1));
    });
    foodSelect.appendChild(group);
  }
}

function makeFoodOption(food, index) {
  const option = document.createElement("option");
  option.value = index;
  option.textContent = food.name;
  return option;
}

// 食品が選ばれたら、名前と栄養を入力欄に写す。
foodSelect.addEventListener("change", () => {
  const index = foodSelect.value;
  if (index === "") {
    return; // 「— 一覧から選ぶ —」に戻したときは何もしない
  }

  const food = combinedFoods[index];
  foodInput.value = food.name;
  applyNutrition(food); // food は kcal/protein/... を持つ
});

// いま入力欄にある内容（1つ分の栄養）を食品リストに登録する。
saveFoodBtn.addEventListener("click", () => {
  const name = foodInput.value.replace(/\s*×[\d.]+\s*$/, "").trim();
  if (!name) {
    saveFoodStatus.textContent = "「食べたもの」に名前を入れてください。";
    return;
  }

  const food = { name: name };
  for (const key of NUTRIENT_KEYS) {
    food[key] = roundNutrient(baseNutrition[key]); // 量の倍率を除いた1つ分の値
  }

  const myFoods = loadMyFoods();
  const i = myFoods.findIndex((f) => f.name === name);
  if (i >= 0) {
    myFoods[i] = food; // 同じ名前があれば上書き
    saveFoodStatus.textContent = "「" + name + "」を更新しました。";
  } else {
    myFoods.push(food);
    saveFoodStatus.textContent = "「" + name + "」を食品リストに登録しました。";
  }
  saveMyFoods(myFoods);
  buildFoodOptions();
  renderMyFoodsList();
});

// ⚙️設定 の「登録した食品」一覧（削除ボタンつき）を作る。
function renderMyFoodsList() {
  const myFoods = loadMyFoods();
  myFoodsList.innerHTML = "";

  if (myFoods.length === 0) {
    myFoodsList.innerHTML = '<p class="hint">まだありません。入力欄を埋めて「食品リストに登録」で追加できます。</p>';
    return;
  }

  myFoods.forEach((food, index) => {
    const row = document.createElement("div");
    row.className = "myfood-row";

    const name = document.createElement("span");
    name.textContent = food.name;

    const del = document.createElement("button");
    del.type = "button";
    del.className = "delete";
    del.textContent = "削除";
    del.addEventListener("click", () => {
      const arr = loadMyFoods();
      arr.splice(index, 1);
      saveMyFoods(arr);
      buildFoodOptions();
      renderMyFoodsList();
    });

    row.appendChild(name);
    row.appendChild(del);
    myFoodsList.appendChild(row);
  });
}


// -----------------------------------------------
//  食べた量（倍率）
// -----------------------------------------------
//  「1つ分」の栄養（baseNutrition）を覚えておき、量が変わるたびに
//  「baseNutrition × 量」で計算し直す。比率を掛け続けないので誤差が溜まらない。

// 1つ分の栄養（量＝1のときの値）
const baseNutrition = {};
for (const key of NUTRIENT_KEYS) {
  baseNutrition[key] = 0;
}

// 食品選択・バーコード・AI読み取りから呼ぶ。1つ分の値をセットし、欄に反映し、量を1に戻す。
function applyNutrition(values) {
  for (const key of NUTRIENT_KEYS) {
    baseNutrition[key] = toNumber(values[key]);
    inputByKey[key].value = roundNutrient(baseNutrition[key]);
  }
  amountInput.value = "1";
}

// 追加後などに、量と記憶値をまっさらに戻す。
function resetAmount() {
  amountInput.value = "1";
  for (const key of NUTRIENT_KEYS) {
    baseNutrition[key] = 0;
  }
}

// 量が変わったら、各栄養欄を「1つ分 × 量」に更新し、商品名に「×N」を付ける。
amountInput.addEventListener("input", () => {
  const amount = toNumber(amountInput.value);
  if (amount <= 0) {
    return; // 入力途中（空など）は何もしない
  }

  for (const key of NUTRIENT_KEYS) {
    inputByKey[key].value = roundNutrient(baseNutrition[key] * amount);
  }

  const baseName = foodInput.value.replace(/\s*×[\d.]+\s*$/, "");
  foodInput.value = amount === 1 ? baseName : baseName + " ×" + amount;
});

// 栄養欄を手で直したら、その項目の「1つ分」も更新しておく（量と整合させる）。
// buildNutrientFields() の後に呼ぶ必要があるので関数にしておく。
function attachNutrientInputListeners() {
  for (const key of NUTRIENT_KEYS) {
    inputByKey[key].addEventListener("input", () => {
      const amount = toNumber(amountInput.value) || 1;
      baseNutrition[key] = toNumber(inputByKey[key].value) / (amount > 0 ? amount : 1);
    });
  }
}


// -----------------------------------------------
//  設定：Claude API キー
// -----------------------------------------------
//  キーはこのブラウザの localStorage だけに保存する。
//  （サーバーを持たないので、この方式。キーは各自で管理・無効化できる前提）

function loadApiKey() {
  return localStorage.getItem(API_KEY_STORAGE) || "";
}

apiKeySaveBtn.addEventListener("click", () => {
  const key = apiKeyInput.value.trim();
  localStorage.setItem(API_KEY_STORAGE, key);
  apiKeyStatus.textContent = key ? "保存しました。" : "キーを空にしました。";
});

// 「表示」/「隠す」でキーの見え方を切り替える
apiKeyToggleBtn.addEventListener("click", () => {
  const nowHidden = apiKeyInput.type === "password";
  apiKeyInput.type = nowHidden ? "text" : "password";
  apiKeyToggleBtn.textContent = nowHidden ? "隠す" : "表示";
});

// 起動時：保存済みのキーを欄に戻す
apiKeyInput.value = loadApiKey();


// -----------------------------------------------
//  設定：あなたの条件（プロフィール）
// -----------------------------------------------

// 保存済みの条件を設定フォームに反映する。
function fillProfileForm() {
  const p = loadProfile();
  pfSex.value = p.sex;
  pfAge.value = p.ageBand;
  pfActivity.value = p.activity;
  pfKcal.value = p.kcalTarget > 0 ? p.kcalTarget : "";
  pfProtein.value = p.proteinTarget > 0 ? p.proteinTarget : "";
  updateAutoPlaceholders();
}

// 目標欄が空のときに表示する「自動だとこの値」をプレースホルダーに出す。
function updateAutoPlaceholders() {
  const auto = getTargets({
    sex: pfSex.value,
    ageBand: pfAge.value,
    activity: pfActivity.value,
    kcalTarget: 0,
    proteinTarget: 0,
  });
  pfKcal.placeholder = "自動: " + auto.kcal;
  pfProtein.placeholder = "自動: " + auto.protein;
}

// 性別・年齢・活動レベルを変えたら、自動値の表示を更新
[pfSex, pfAge, pfActivity].forEach((el) => {
  el.addEventListener("change", updateAutoPlaceholders);
});

pfSaveBtn.addEventListener("click", () => {
  saveProfile({
    sex: pfSex.value,
    ageBand: pfAge.value,
    activity: pfActivity.value,
    kcalTarget: toNumber(pfKcal.value) || 0,
    proteinTarget: toNumber(pfProtein.value) || 0,
  });
  pfStatus.textContent = "保存しました。判定を更新します。";
  render(); // 目標値が変わったので一覧を作り直す
});

fillProfileForm();


// -----------------------------------------------
//  データのバックアップ（エクスポート／インポート）
// -----------------------------------------------

// 記録＋設定を JSON ファイルとして書き出す。
exportBtn.addEventListener("click", () => {
  const data = {
    app: "diet-app",
    version: 1,
    exportedAt: new Date().toISOString(),
    entries: loadEntries(),
    profile: loadProfile(),
    myFoods: loadMyFoods(),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "diet-app-backup-" + new Date().toISOString().slice(0, 10) + ".json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);

  backupStatus.textContent = loadEntries().length + "件の記録を書き出しました。";
});

// ファイルを選んで記録を読み込む（今の記録は置き換え）。
importBtn.addEventListener("click", () => importFile.click());

importFile.addEventListener("change", () => {
  const file = importFile.files[0];
  importFile.value = ""; // 同じファイルを選び直せるように
  if (!file) {
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      // 新形式 {entries:[...]} でも、古い配列だけでも受け付ける
      const entries = Array.isArray(data) ? data : data.entries;
      if (!Array.isArray(entries)) {
        throw new Error("記録のデータが見つかりません");
      }

      const ok = confirm(
        "今の記録（" + loadEntries().length + "件）を、読み込んだ " +
        entries.length + "件で置き換えます。よろしいですか？"
      );
      if (!ok) {
        backupStatus.textContent = "読み込みを中止しました。";
        return;
      }

      saveEntries(entries);
      if (data && data.profile) {
        saveProfile(Object.assign({}, DEFAULT_PROFILE, data.profile));
        fillProfileForm();
      }
      if (data && Array.isArray(data.myFoods)) {
        saveMyFoods(data.myFoods);
        buildFoodOptions();
        renderMyFoodsList();
      }
      render();
      backupStatus.textContent = entries.length + "件を読み込みました。";
    } catch (e) {
      console.error(e);
      backupStatus.textContent = "読み込めませんでした: " + e.message;
    }
  };
  reader.readAsText(file);
});


// -----------------------------------------------
//  商品の検索（Open Food Facts）
// -----------------------------------------------
//  Open Food Facts = 世界中の食品データベース（有志運営・無料・APIキー不要）。
//  ・入力が数字だけ → バーコード番号として1件だけ取得
//  ・文字を含む     → 商品名として検索し、候補を一覧表示（選ぶと入力）
//  日本の商品は登録が少ないことがある。見つからなければ手入力に戻る。

barcodeSearchBtn.addEventListener("click", searchProduct);

// 入力内容を見て、番号検索か名前検索かを振り分ける。
async function searchProduct() {
  const query = barcodeInput.value.trim();
  if (!query) {
    return;
  }

  barcodeSearchBtn.disabled = true;
  searchResults.innerHTML = "";
  barcodeStatus.textContent = "検索中…";

  try {
    if (/^\d+$/.test(query)) {
      await lookupBarcode(query); // 数字だけ → 番号検索
    } else {
      await searchByName(query);  // それ以外 → 名前検索
    }
  } catch (e) {
    console.error(e);
    barcodeStatus.textContent = "通信エラーで取得できませんでした。電波の良い所で再度お試しください。";
  } finally {
    barcodeSearchBtn.disabled = false;
  }
}

// バーコード番号で1件だけ取得する。
async function lookupBarcode(code) {
  const url = "https://world.openfoodfacts.org/api/v2/product/" +
    encodeURIComponent(code) + ".json";
  const res = await fetch(url);
  const data = await res.json();

  if (data.status !== 1 || !data.product) {
    barcodeStatus.textContent = "この番号の商品は見つかりませんでした。栄養は手入力してください。";
    return;
  }

  fillFromOpenFoodFacts(data.product);
  barcodeStatus.textContent = "取得しました（値は100gあたり。実際に食べた量に合わせて直してください）";
}

// 商品名で検索し、候補を一覧表示する。
async function searchByName(query) {
  const url = "https://world.openfoodfacts.org/cgi/search.pl" +
    "?search_terms=" + encodeURIComponent(query) +
    "&search_simple=1&action=process&json=1&page_size=10" +
    "&fields=code,product_name,product_name_ja,brands,nutriments";
  const res = await fetch(url);
  const data = await res.json();

  // 栄養データが入っている候補だけに絞る
  const products = (data.products || []).filter((p) => {
    const n = p.nutriments || {};
    return n["energy-kcal_100g"] != null || n.proteins_100g != null;
  });

  if (products.length === 0) {
    barcodeStatus.textContent = "栄養データ付きの商品が見つかりませんでした。手入力してください。";
    return;
  }

  barcodeStatus.textContent = products.length + "件見つかりました。1つ選んでください。";
  for (const product of products) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "search-result";
    const brand = product.brands ? product.brands + " / " : "";
    btn.textContent = brand + (product.product_name_ja || product.product_name || "（名称不明）");
    btn.addEventListener("click", () => {
      fillFromOpenFoodFacts(product);
      searchResults.innerHTML = "";
      barcodeStatus.textContent = "取得しました（100gあたり。食べた量に合わせて直してください）";
    });
    searchResults.appendChild(btn);
  }
}

// Open Food Facts の商品データを、入力欄に写す。
function fillFromOpenFoodFacts(product) {
  const n = product.nutriments || {};
  const name = product.product_name_ja || product.product_name || "商品";

  // 食塩相当量：salt が無ければ sodium(g) から換算（Na g × 2.54）
  const salt = n.salt_100g != null
    ? toNumber(n.salt_100g)
    : toNumber(n.sodium_100g) * 2.54;

  foodInput.value = name + "（100gあたり）";
  applyNutrition({
    kcal: toNumber(n["energy-kcal_100g"]),
    protein: toNumber(n.proteins_100g),
    fat: toNumber(n.fat_100g),
    satfat: toNumber(n["saturated-fat_100g"]),
    carb: toNumber(n.carbohydrates_100g),
    sugar: toNumber(n.sugars_100g),
    fiber: toNumber(n.fiber_100g),
    salt: salt,
    // ミネラルは g 単位で返るので 1000倍して mg にする
    potassium: toNumber(n.potassium_100g) * 1000,
    calcium: toNumber(n.calcium_100g) * 1000,
    magnesium: toNumber(n.magnesium_100g) * 1000,
    iron: toNumber(n.iron_100g) * 1000,
    zinc: toNumber(n.zinc_100g) * 1000,
    vitC: toNumber(n["vitamin-c_100g"]) * 1000, // g→mg
  });

  foodSelect.value = ""; // 一覧の選択はクリア
}


// -----------------------------------------------
//  カメラでバーコードを読み取る（html5-qrcode）
// -----------------------------------------------

let scanner = null; // 起動中のカメラ。閉じるときに止めるため覚えておく

scanOpenBtn.addEventListener("click", openScanner);
scanCloseBtn.addEventListener("click", closeScanner);

async function openScanner() {
  scannerOverlay.hidden = false;
  scanner = new Html5Qrcode("scanner-view");

  try {
    await scanner.start(
      { facingMode: "environment" }, // 背面カメラを使う
      { fps: 10, qrbox: { width: 260, height: 160 } }, // 読み取り枠（横長）
      (decodedText) => {
        // 読み取り成功：番号を入力欄に入れて、カメラを閉じて検索
        barcodeInput.value = decodedText;
        closeScanner();
        searchProduct();
      },
      () => {} // 1フレームごとの「まだ読めない」通知は無視
    );
  } catch (e) {
    console.error(e);
    barcodeStatus.textContent = "カメラを起動できませんでした。ブラウザのカメラ許可を確認してください。";
    closeScanner();
  }
}

async function closeScanner() {
  if (scanner) {
    try {
      await scanner.stop(); // カメラを止める
      scanner.clear();
    } catch (e) {
      // すでに止まっている場合など。無視してよい
    }
    scanner = null;
  }
  scannerOverlay.hidden = true;
}


// -----------------------------------------------
//  成分表を撮って AI（Claude）で読み取る
// -----------------------------------------------
//  写真 → 縮小 → Claude API に送信 → 栄養のJSONを受け取る → 入力欄に反映。
//  サーバーを持たないので、ブラウザから直接 api.anthropic.com を呼ぶ。
//  そのために "anthropic-dangerous-direct-browser-access" ヘッダを付ける。

// 成分表の画像読み取り用。精度優先で sonnet（1回 約1円）。
const AI_MODEL = "claude-sonnet-5";

aiReadBtn.addEventListener("click", () => {
  if (!loadApiKey()) {
    barcodeStatus.textContent = "先に「⚙️ 設定」で Claude API キーを保存してください。";
    return;
  }
  aiPhotoInput.click(); // 隠してあるファイル選択（＝カメラ）を開く
});

aiPhotoInput.addEventListener("change", async () => {
  const file = aiPhotoInput.files[0];
  aiPhotoInput.value = ""; // 同じ写真をもう一度選べるようにする
  if (!file) {
    return;
  }

  aiReadBtn.disabled = true;
  try {
    barcodeStatus.textContent = "画像を準備中…";
    const image = await resizeImageToBase64(file, 1568);

    barcodeStatus.textContent = "Claude が読み取り中…（数秒〜15秒）";
    const raw = await readLabelWithClaude(image.base64, image.mediaType);

    fillFromAi(raw);
    barcodeStatus.textContent =
      "読み取りました。表の「" + (raw.serving || "分量") +
      "」の値です。食べた量が違うときは数値を直してください。";
  } catch (e) {
    console.error(e);
    barcodeStatus.textContent = "読み取りに失敗しました: " + e.message;
  } finally {
    aiReadBtn.disabled = false;
  }
});

// 画像ファイルを、長辺 maxSize px 以内に縮小して base64 文字列にする。
//  （スマホ写真はそのままだと大きすぎて、料金も時間もかかるため）
function resizeImageToBase64(file, maxSize) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let width = img.width;
      let height = img.height;
      const scale = Math.min(1, maxSize / Math.max(width, height));
      width = Math.round(width * scale);
      height = Math.round(height * scale);

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d").drawImage(img, 0, 0, width, height);

      // "data:image/jpeg;base64,XXXX" の XXXX 部分だけ取り出す
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      resolve({ base64: dataUrl.split(",")[1], mediaType: "image/jpeg" });
    };
    img.onerror = () => reject(new Error("画像を読み込めませんでした"));
    img.src = URL.createObjectURL(file);
  });
}

// 画像を Claude に送り、「表に印刷されたままの」数値を受け取る。
//  換算はさせない（モデルは暗算が不正確なため）。
async function readLabelWithClaude(base64, mediaType) {
  // 読み取る栄養の一覧を NUTRIENTS から作る（項目を増やしてもここは自動で追従）
  const fieldList = NUTRIENTS
    .map((x) => "- " + x.key + ": " + x.label + "（" + x.unit + "）")
    .join("\n");

  const emptyJson = JSON.stringify(
    NUTRIENTS.reduce((o, x) => { o[x.key] = null; return o; }, {})
  );

  const prompt =
    "この画像は食品の栄養成分表示です。表に印刷されている数値をそのまま読み取ってください。\n" +
    "・推測や補完はしない。表に無い項目は null。\n" +
    "・単位は指定のもので。表が違う単位なら数値だけ合わせる（例: ナトリウムしか無ければ 食塩相当量 = ナトリウムmg × 2.54 ÷ 1000）。\n\n" +
    "読み取る栄養（キー: 名称(単位)）:\n" + fieldList + "\n\n" +
    "さらに:\n" +
    "- name: 商品名（画像内にあれば。無ければ空文字）\n" +
    "- serving: 表が何あたりの値か、書かれている通りの文字列（例「100g当たり」「1袋(60g)当たり」）\n\n" +
    "説明文なしで、次の形の JSON のみを返す:\n" +
    '{"name":"","serving":"","nutrients":' + emptyJson + "}";

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": loadApiKey(),
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: AI_MODEL,
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
            { type: "text", text: prompt },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error("APIエラー " + res.status + "（" + body.slice(0, 150) + "）");
  }

  const data = await res.json();
  const text = (data.content || []).map((block) => block.text || "").join("");
  return parseNutritionJson(text);
}

// Claude の返答テキストから { ... } を取り出して JSON として読む。
function parseNutritionJson(text) {
  const match = text.match(/\{[\s\S]*\}/); // 最初の { から最後の } まで
  if (!match) {
    throw new Error("結果を読み取れませんでした（" + text.slice(0, 100) + "）");
  }
  return JSON.parse(match[0]);
}

// Claude が読んだ栄養（表の値そのまま）を入力欄に反映する。
//  換算はしない。null/空 は 0 にする。
function fillFromAi(result) {
  // "1,050" などの区切りを除いて数値化。数値でなければ 0。
  const num = (v) => {
    if (v === null || v === undefined || v === "") {
      return 0;
    }
    const x = Number(String(v).replace(/,/g, ""));
    return isNaN(x) ? 0 : roundNutrient(x);
  };

  const label = [result.name, result.serving ? "（" + result.serving + "）" : ""].join("").trim();
  if (label) {
    foodInput.value = label;
  }

  // 新しい形 {nutrients:{...}}。古い形（直下にキー）にも一応対応。
  const src = result.nutrients || result;
  const values = {};
  for (const key of NUTRIENT_KEYS) {
    values[key] = num(src[key]);
  }
  applyNutrition(values);
  foodSelect.value = "";
}


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

  // 栄養欄には「量」を反映済みの値が入っている（下の量ハンドラで更新）ので、そのまま保存する。
  const entry = { date: date, food: food };
  for (const key of NUTRIENT_KEYS) {
    entry[key] = toNumber(inputByKey[key].value);
  }
  addEntry(entry);

  // 次の入力に備えて、日付以外の欄を空にする
  barcodeInput.value = "";
  barcodeStatus.textContent = "";
  searchResults.innerHTML = "";
  foodSelect.value = "";
  foodInput.value = "";
  resetAmount(); // 量を 1 に戻す
  for (const key of NUTRIENT_KEYS) {
    inputByKey[key].value = "";
  }
  foodInput.focus();
});


// -----------------------------------------------
//  起動時の処理
// -----------------------------------------------

// 栄養の入力欄を作る（基本欄／詳細欄）
buildNutrientFields();
attachNutrientInputListeners();

// 日付欄の初期値を「今日」にする
dateInput.value = new Date().toISOString().slice(0, 10);

// 食品一覧のドロップダウンと、登録食品リストを組み立てる
buildFoodOptions();
renderMyFoodsList();

// 最初の一覧を表示する
render();

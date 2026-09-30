// ===============================================
//  食事記録アプリ
//  食べたもの＋栄養7種類を記録 → 日付ごとに一覧・その日の合計 →
//  食事摂取基準と比べて不足を判定 → 補う食材を提案。
//  食品は「写真で記録（AI） / いつもの食べ物から選ぶ / 手入力」。
//  データはブラウザの中（localStorage）に保存する。
// ===============================================

// localStorage に保存するときの「引き出しの名前」。
// この名前でデータを出し入れする。
const STORAGE_KEY = "diet-app-entries";
const API_KEY_STORAGE = "diet-app-api-key"; // Claude API キーの保存名

// 画面の部品を先に取っておく（毎回 getElementById を書かなくて済む）
const form = document.getElementById("add-form");
const dateInput = document.getElementById("date-input");
const aiStatus = document.getElementById("ai-status");
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
const aiReadBtn = document.getElementById("ai-read");
const aiPhotoInput = document.getElementById("ai-photo");
const quickSearch = document.getElementById("quick-search");
const quickList = document.getElementById("quick-list");
const quickStatus = document.getElementById("quick-status");
const manualBox = document.getElementById("manual-box");
const foodInput = document.getElementById("food-input");
const amountInput = document.getElementById("amount-input");
const saveFoodBtn = document.getElementById("save-food-btn");
const saveFoodStatus = document.getElementById("save-food-status");
const myFoodsList = document.getElementById("my-foods-list");
const logList = document.getElementById("log-list");
const backupNag = document.getElementById("backup-nag");
const backupNagText = document.getElementById("backup-nag-text");
const backupNagBtn = document.getElementById("backup-nag-btn");

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
    field.className = "field nut-field";

    const label = document.createElement("label");
    label.setAttribute("for", n.key + "-input");
    label.textContent = n.label;

    const input = document.createElement("input");
    input.type = "number";
    input.id = n.key + "-input";
    input.min = "0";
    input.step = "any"; // どんな小数でも受け付ける（検索結果の 418.5 等で弾かれないように）
    input.inputMode = "decimal";
    input.placeholder = "0";

    const unit = document.createElement("span");
    unit.className = "nut-unit";
    unit.textContent = n.unit;

    field.appendChild(label);
    field.appendChild(input);
    field.appendChild(unit);
    (n.basic ? basicBox : detailBox).appendChild(field);
    inputByKey[n.key] = input;
  }
}


// 日付を "2026-08-29" の形にする（日本時間のまま）。
//  toISOString() は世界標準時(UTC)になるので、日本では朝9時前だと前日になってしまう。
function localDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return y + "-" + m + "-" + day;
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
let olderOpen = false;    // 「それ以前の記録」を開いているか

// 期間内の記録から「1日あたり平均」を計算する。
function summaryData(entries, periodDays) {
  let inRange = entries;
  if (periodDays > 0) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - (periodDays - 1));
    const cutoffStr = localDateStr(cutoff);
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
  renderQuickList(); // 記録が変わると「いつもの食べ物」の並びも変わる
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

  // その日の目標値（設定で変えられる。毎日同じなのでループの外で1回だけ取得）
  const targets = getTargets(loadProfile());

  const todayStr = localDateStr(new Date());
  // 直近1週間の境目（今日を含めて7日）
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 6);
  const weekAgoStr = localDateStr(weekAgo);

  // 直近1週間ぶんはそのまま、それより前は折りたたみの中へ
  const olderBox = document.createElement("details");
  olderBox.className = "older-days";
  olderBox.open = olderOpen;
  olderBox.addEventListener("toggle", () => { olderOpen = olderBox.open; });
  const olderSummary = document.createElement("summary");
  olderBox.appendChild(olderSummary);
  let olderCount = 0;

  for (const date of dates) {
    const dayBox = buildDayBox(date, byDate[date], targets, todayStr);
    if (date >= weekAgoStr) {
      logList.appendChild(dayBox);
    } else {
      olderBox.appendChild(dayBox);
      olderCount++;
    }
  }

  if (olderCount > 0) {
    olderSummary.textContent = "それ以前の記録（" + olderCount + "日分）";
    logList.appendChild(olderBox);
  }

  // 期間のまとめ（1日あたり平均）は一番下に
  logList.appendChild(buildSummaryBox(entries, targets));
}

// 1日ぶんの折りたたみ部品を作る。
function buildDayBox(date, dayEntries, targets, todayStr) {
  const dayBox = document.createElement("details");
  dayBox.className = "day";
  dayBox.open = date === todayStr; // 今日だけ開いた状態

  const total = sumNutrition(dayEntries);

  const heading = document.createElement("summary");
  heading.className = "day-summary";
  const kcal = roundNutrient(toNumber(total.kcal));
  const remain = Math.round(targets.kcal - kcal);

  const main = document.createElement("span");
  main.textContent = formatDate(date) + "　" + kcal + "kcal ";

  const remainSpan = document.createElement("span");
  remainSpan.className = remain >= 0 ? "day-remain" : "day-remain over";
  remainSpan.textContent = remain >= 0
    ? "（あと" + remain + "kcal）"
    : "（" + (-remain) + "kcal超過）";

  const count = document.createElement("span");
  count.className = "day-count";
  count.textContent = " ・" + dayEntries.length + "品";

  heading.appendChild(main);
  heading.appendChild(remainSpan);
  heading.appendChild(count);
  dayBox.appendChild(heading);

  dayBox.appendChild(buildJudgement(total, targets));

  // 棒グラフに出ない栄養（脂質・炭水化物・糖質）だけ小さく添える
  const macros = document.createElement("p");
  macros.className = "day-macros";
  macros.textContent = "脂質 " + roundNutrient(toNumber(total.fat)) + "g ・ 炭水化物 " +
    roundNutrient(toNumber(total.carb)) + "g ・ 糖質 " + roundNutrient(toNumber(total.sugar)) + "g";
  dayBox.appendChild(macros);

  for (const entry of dayEntries) {
    const row = document.createElement("div");
    row.className = "entry";

    const main = document.createElement("div");
    main.className = "entry-main";

    // 1行目：食べたもの＋カロリー（常時表示）
    const line1 = document.createElement("div");
    line1.className = "entry-line1";

    const name = document.createElement("span");
    name.className = "entry-name";
    name.textContent = entry.food;

    const kcalChip = document.createElement("span");
    kcalChip.className = "entry-kcal";
    kcalChip.textContent = roundNutrient(toNumber(entry.kcal)) + "kcal";

    line1.appendChild(name);
    line1.appendChild(kcalChip);
    main.appendChild(line1);

    // 2行目：栄養の内訳（タップで開閉）
    const nutrition = document.createElement("span");
    nutrition.className = "nutrition";
    nutrition.textContent = formatNutrition(entry);
    nutrition.hidden = true;
    main.appendChild(nutrition);

    main.addEventListener("click", () => {
      nutrition.hidden = !nutrition.hidden;
    });

    const delBtn = document.createElement("button");
    delBtn.className = "delete";
    delBtn.textContent = "削除";
    delBtn.addEventListener("click", () => deleteEntry(entry.id));

    row.appendChild(main);
    row.appendChild(delBtn);
    dayBox.appendChild(row);
  }

  return dayBox;
}

// 記録1件（または合計）の栄養を「エネルギー 520kcal ・ たんぱく質 18g ・ …」にする。
// 値が入っている項目だけ表示する（0 や未記録は省く）。
//  AI が推定した項目には「≈」を付ける。
function formatNutrition(entry) {
  const est = new Set(entry.estimated || []);
  const parts = NUTRIENTS
    .filter((n) => toNumber(entry[n.key]) > 0)
    .map((n) => `${n.label} ${est.has(n.key) ? "≈" : ""}${roundNutrient(toNumber(entry[n.key]))}${n.unit}`);
  if (!parts.length) {
    return "栄養の記録なし";
  }
  return parts.join(" ・ ") + (est.size > 0 ? "（≈ は AI の推定）" : "");
}

// その日の合計(total)と目標(targets)を比べて、判定の表示部品を作る。
//  全項目を棒グラフで出す（達成した項目も数字を隠さない）。
//  並びは「目標を外している項目（重い順）」→「達成した項目」。
function buildJudgement(total, targets) {
  const box = document.createElement("div");
  box.className = "judge";

  const items = [];
  for (const key of JUDGED) {
    const info = NUTRIENTS.find((n) => n.key === key);
    const got = roundNutrient(toNumber(total[key]));
    const goal = targets[key];
    const percent = goal > 0 ? Math.round((got / goal) * 100) : 0;
    const status = judgeStatus(key, percent);
    items.push({ key, info, got, goal, percent, status });
  }

  // 重い順に並べる（不足・とりすぎ → もう少し → 達成）。同じ重さなら元の並び順のまま。
  const severity = { under: 0, over: 0, soft: 1, ok: 2 };
  items.sort((a, b) => severity[a.status.className] - severity[b.status.className]);

  for (const item of items) {
    box.appendChild(buildJudgeRow(item));
  }
  return box;
}

// 判定1項目（棒グラフつき）の部品。
function buildJudgeRow(item) {
  const row = document.createElement("div");
  row.className = "judge-row";

  const head = document.createElement("div");
  head.className = "judge-head";

  const label = document.createElement("span");
  label.className = "judge-label";
  label.textContent = item.info.label;

  const detail = document.createElement("span");
  detail.className = "judge-detail";
  detail.textContent = item.got + " / " + item.goal + " " + item.info.unit;

  const pct = document.createElement("span");
  pct.className = "judge-pct " + item.status.className;
  pct.textContent = item.percent + "%";

  const mark = document.createElement("span");
  mark.className = "judge-mark " + item.status.className;
  mark.textContent = item.status.text;

  head.appendChild(label);
  head.appendChild(detail);
  head.appendChild(pct);
  head.appendChild(mark);

  const bar = document.createElement("div");
  bar.className = "judge-bar";
  const fill = document.createElement("div");
  fill.className = "judge-bar-fill " + item.status.className;
  fill.style.width = Math.min(item.percent, 100) + "%";
  bar.appendChild(fill);

  row.appendChild(head);
  row.appendChild(bar);

  if (item.status.className === "under" && RICH_FOODS[item.key]) {
    const suggest = document.createElement("div");
    suggest.className = "judge-suggest";
    suggest.textContent = "補う食材: " + RICH_FOODS[item.key].slice(0, 4).join(" ・ ");
    row.appendChild(suggest);
  }

  return row;
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
//  登録した食品
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

// -----------------------------------------------
//  いつもの食べ物（タップ1回で記録）
// -----------------------------------------------
//  候補 = 過去に記録した食べ物 ＋ 登録した食品 ＋ 内蔵の食品。
//  よく食べる順（同じなら最近食べた順）に並べ、上から15件を出す。
//  名前で絞り込むと、内蔵の食品も含めて一致するものを出す。

// "納豆 ×2" → { base: "納豆", amount: 2 }。×が無ければ amount は 1。
function splitAmount(name) {
  const m = name.match(/\s*×([\d.]+)\s*$/);
  if (!m) {
    return { base: name.trim(), amount: 1 };
  }
  const amount = toNumber(m[1]) || 1;
  return { base: name.slice(0, m.index).trim(), amount: amount };
}

// 候補の一覧を作る。[{ food, count, last }]（food は1つ分の栄養を持つ）
function quickCandidates() {
  const map = new Map(); // 名前 → 候補

  // 過去の記録（古い順に見て、同じ名前は新しい値で上書き）
  const entries = loadEntries().slice().sort((a, b) => a.id - b.id);
  for (const e of entries) {
    const { base, amount } = splitAmount(e.food || "");
    if (!base) {
      continue;
    }
    const food = { name: base };
    for (const key of NUTRIENT_KEYS) {
      food[key] = roundNutrient(toNumber(e[key]) / amount); // 1つ分に戻す
    }
    if (e.estimated) {
      food.estimated = e.estimated;
    }
    const prev = map.get(base);
    map.set(base, { food: food, count: (prev ? prev.count : 0) + 1, last: e.id });
  }

  // 登録した食品（自分で登録した値を優先する）
  for (const f of loadMyFoods()) {
    const prev = map.get(f.name);
    map.set(f.name, { food: f, count: prev ? prev.count : 0, last: prev ? prev.last : 0 });
  }

  // 内蔵の食品（まだ無いものだけ）
  for (const f of FOODS) {
    if (!map.has(f.name)) {
      map.set(f.name, { food: f, count: 0, last: 0 });
    }
  }

  return Array.from(map.values())
    .sort((a, b) => (b.count - a.count) || (b.last - a.last));
}

// 候補のボタンを並べ直す。
function renderQuickList() {
  const query = quickSearch.value.trim().toLowerCase();
  let list = quickCandidates();
  list = query
    ? list.filter((c) => c.food.name.toLowerCase().includes(query)).slice(0, 30)
    : list.slice(0, 15);

  quickList.innerHTML = "";
  if (list.length === 0) {
    quickList.innerHTML = '<p class="hint">見つかりません。写真で記録するか、下に手で入力してください。</p>';
    return;
  }

  for (const c of list) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "quick-chip";

    const name = document.createElement("span");
    name.textContent = c.food.name;
    const kcal = document.createElement("span");
    kcal.className = "quick-kcal";
    kcal.textContent = Math.round(toNumber(c.food.kcal)) + "kcal";

    btn.appendChild(name);
    btn.appendChild(kcal);
    btn.addEventListener("click", () => quickRecord(c.food));
    quickList.appendChild(btn);
  }
}

quickSearch.addEventListener("input", renderQuickList);

// タップした食べ物を、そのまま（1つ分で）記録する。
function quickRecord(food) {
  const entry = { date: dateInput.value, food: food.name };
  for (const key of NUTRIENT_KEYS) {
    entry[key] = toNumber(food[key]);
  }
  if (food.estimated && food.estimated.length) {
    entry.estimated = food.estimated.slice();
  }
  addEntry(entry); // ここで entry.id が付く

  quickStatus.innerHTML = "";
  const msg = document.createElement("span");
  msg.textContent = "「" + food.name + "」を記録しました。 ";

  // 取り消す：いま記録した1件を消す
  const undo = document.createElement("button");
  undo.type = "button";
  undo.className = "link-btn";
  undo.textContent = "取り消す";
  undo.addEventListener("click", () => {
    deleteEntry(entry.id);
    quickStatus.textContent = "取り消しました。";
  });

  // 量を変える：いま記録した1件を消して、入力欄に入れ直す
  const edit = document.createElement("button");
  edit.type = "button";
  edit.className = "link-btn";
  edit.textContent = "量を変える";
  edit.addEventListener("click", () => {
    deleteEntry(entry.id);
    quickStatus.textContent = "入力欄に入れました。「食べた量」を直して「追加する」を押してください。";
    foodInput.value = food.name;
    applyNutrition(food, food.estimated);
    manualBox.open = true;
    amountInput.focus();
    amountInput.select();
  });

  quickStatus.appendChild(msg);
  quickStatus.appendChild(undo);
  quickStatus.appendChild(edit);
}

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
  if (estimatedKeys.size > 0) {
    food.estimated = Array.from(estimatedKeys);
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
  renderQuickList();
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
      renderQuickList();
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

// AI が推定した栄養のキー。入力欄をオレンジにして、表から読んだ値と区別する。
const estimatedKeys = new Set();

function setEstimated(keys) {
  estimatedKeys.clear();
  for (const key of keys || []) {
    if (inputByKey[key]) {
      estimatedKeys.add(key);
    }
  }
  for (const key of NUTRIENT_KEYS) {
    inputByKey[key].classList.toggle("est", estimatedKeys.has(key));
  }
}

// 食品選択・AI読み取りから呼ぶ。1つ分の値をセットし、欄に反映し、量を1に戻す。
//  estimated = 推定値の栄養のキーの配列（無ければ全部「読んだ値」扱い）
function applyNutrition(values, estimated) {
  for (const key of NUTRIENT_KEYS) {
    baseNutrition[key] = toNumber(values[key]);
    inputByKey[key].value = roundNutrient(baseNutrition[key]);
  }
  setEstimated(estimated);
  amountInput.value = "1";
}

// 追加後などに、量と記憶値をまっさらに戻す。
function resetAmount() {
  amountInput.value = "1";
  for (const key of NUTRIENT_KEYS) {
    baseNutrition[key] = 0;
  }
  setEstimated([]);
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
      // 手で直した値は「推定」ではなくなる
      estimatedKeys.delete(key);
      inputByKey[key].classList.remove("est");
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

const LAST_BACKUP_STORAGE = "diet-app-last-backup"; // 最後に書き出した日時
const BACKUP_NAG_DAYS = 7; // この日数書き出していなければ声をかける

// 記録＋設定を JSON ファイルとして書き出す。
//  iPhone では共有シートを出す（「ファイルに保存」で iCloud Drive に置ける）。
//  共有シートが使えない PC などでは、普通のダウンロードにする。
async function exportBackup() {
  const data = {
    app: "diet-app",
    version: 1,
    exportedAt: new Date().toISOString(),
    entries: loadEntries(),
    profile: loadProfile(),
    myFoods: loadMyFoods(),
  };
  const fileName = "diet-app-backup-" + localDateStr(new Date()) + ".json";
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const file = new File([blob], fileName, { type: "application/json" });

  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: fileName });
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }
  } catch (e) {
    // 共有シートを閉じた（キャンセル）ときはここに来る。保存済みにはしない
    backupStatus.textContent = "書き出しを中止しました。";
    return;
  }

  localStorage.setItem(LAST_BACKUP_STORAGE, new Date().toISOString());
  backupStatus.textContent = data.entries.length + "件の記録を書き出しました。";
  updateBackupNag();
}

exportBtn.addEventListener("click", exportBackup);
backupNagBtn.addEventListener("click", exportBackup);

// しばらく書き出していなければ、画面のいちばん上に声かけを出す。
function updateBackupNag() {
  const count = loadEntries().length;
  const last = localStorage.getItem(LAST_BACKUP_STORAGE);
  const days = last ? Math.floor((Date.now() - new Date(last).getTime()) / 86400000) : null;

  if (count === 0 || (days !== null && days < BACKUP_NAG_DAYS)) {
    backupNag.hidden = true;
    return;
  }
  backupNagText.textContent = days === null
    ? "記録がまだ一度も保存されていません。"
    : "最後の保存から " + days + " 日たちました。";
  backupNag.hidden = false;
}

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
        renderQuickList();
        renderMyFoodsList();
      }
      render();
      backupStatus.textContent = entries.length + "件を読み込みました。";
      // 読み込んだファイル自体がバックアップなので、その日時を「最後の保存」にする
      localStorage.setItem(LAST_BACKUP_STORAGE, (data && data.exportedAt) || new Date().toISOString());
      updateBackupNag();
    } catch (e) {
      console.error(e);
      backupStatus.textContent = "読み込めませんでした: " + e.message;
    }
  };
  reader.readAsText(file);
});


// -----------------------------------------------
//  写真を撮って AI（Claude）で栄養を埋める
// -----------------------------------------------
//  写真 → 縮小 → Claude API に送信 → 栄養のJSONを受け取る → 入力欄に反映。
//  ・成分表示の写真: 表の数値はそのまま読む。表に無い栄養は、商品名・原材料から推測する。
//  ・料理の写真:     料理名と量を推測し、全部の栄養を推測する。
//  推測した栄養は「推定」の印を付けて、表から読んだ値と区別する（入力欄がオレンジになる）。
//  サーバーを持たないので、ブラウザから直接 api.anthropic.com を呼ぶ。
//  そのために "anthropic-dangerous-direct-browser-access" ヘッダを付ける。

// 写真の読み取り用。精度優先で sonnet（1回 約1〜2円）。
const AI_MODEL = "claude-sonnet-5";

aiReadBtn.addEventListener("click", () => {
  if (!loadApiKey()) {
    aiStatus.textContent = "先に「⚙️ 設定」で Claude API キーを保存してください。";
    return;
  }
  aiPhotoInput.click(); // 隠してあるファイル選択（カメラ／写真ライブラリ）を開く
});

aiPhotoInput.addEventListener("change", async () => {
  const file = aiPhotoInput.files[0];
  aiPhotoInput.value = ""; // 同じ写真をもう一度選べるようにする
  if (!file) {
    return;
  }

  aiReadBtn.disabled = true;
  try {
    aiStatus.textContent = "画像を準備中…";
    const image = await resizeImageToBase64(file, 1568);

    aiStatus.textContent = "Claude が読み取り中…（10〜30秒）";
    const raw = await readPhotoWithClaude(image.base64, image.mediaType);

    fillFromAi(raw);
    const basis = raw.serving ? "「" + raw.serving + "」の値です。" : "";
    aiStatus.textContent =
      (raw.kind === "dish" ? "料理から推測しました。" : "成分表示を読みました。") + basis +
      "オレンジの欄は推定です。量が違えば「食べた量」を直して、「追加する」を押してください。";
  } catch (e) {
    console.error(e);
    aiStatus.textContent = "読み取りに失敗しました: " + e.message;
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

// 画像を Claude に送り、全部の栄養（表から読んだ値＋推定した値）を受け取る。
async function readPhotoWithClaude(base64, mediaType) {
  // 栄養の一覧を NUTRIENTS から作る（項目を増やしてもここは自動で追従）
  const fieldList = NUTRIENTS
    .map((x) => "- " + x.key + ": " + x.label + "（" + x.unit + "）")
    .join("\n");

  const zeroJson = JSON.stringify(
    NUTRIENTS.reduce((o, x) => { o[x.key] = 0; return o; }, {})
  );

  const prompt = [
    "食事記録アプリ用に、この写真の食べ物の栄養を、下の全項目について数値で答えてください。",
    "写真は次のどちらかです。",
    "",
    "【A】食品の栄養成分表示（パッケージの表）が写っている → kind は \"label\"",
    "・表に印刷されている項目は、表の数値をそのまま使う（換算しない）。",
    "  ナトリウムしか無ければ 食塩相当量 = ナトリウムmg × 2.54 ÷ 1000。",
    "・表に無い項目は、商品名・原材料名（写っていれば）・食品の種類から、表と同じ分量あたりで推測する。",
    "・serving は表が何あたりの値か、書かれている通り（例「100g当たり」「1袋(60g)当たり」）。",
    "",
    "【B】料理・食べ物そのものが写っている（成分表示なし） → kind は \"dish\"",
    "・料理名と、写っている量（例「1人前 約350g」）を推測し、その量の栄養を全項目推測する。",
    "・serving に推測した量を書く。",
    "",
    "推測のしかた:",
    "・日本食品標準成分表（八訂）の値を基準に、材料の構成から見積もる。",
    "・null や空欄は使わない。本当に含まれないもの（例: 植物性食品のビタミンB12）は 0。",
    "・推測した項目のキーは、すべて estimated の配列に入れる（【A】で表から読んだ項目は入れない）。",
    "",
    "栄養の項目（キー: 名称(単位)）:",
    fieldList,
    "",
    "name は商品名または料理名（短く）。",
    "説明文なしで、次の形の JSON のみを返す:",
    '{"kind":"label","name":"","serving":"","nutrients":' + zeroJson + ',"estimated":[]}',
  ].join("\n");

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
      max_tokens: 3000,
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

// Claude の結果を入力欄に反映する。null/空 は 0 にする。
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

  const src = result.nutrients || result;
  const values = {};
  for (const key of NUTRIENT_KEYS) {
    values[key] = num(src[key]);
  }
  applyNutrition(values, Array.isArray(result.estimated) ? result.estimated : []);
  manualBox.open = true; // 中身を確かめられるように開く
}


// -----------------------------------------------
//  フォームが送信されたときの処理
// -----------------------------------------------

form.addEventListener("submit", (event) => {
  event.preventDefault(); // ページの再読み込みを止める（フォームの既定の動き）

  const date = dateInput.value;
  const food = foodInput.value.trim();

  if (!date || !food) {
    // 日付か食べたものが空なら記録しない。入力欄を開いて知らせる
    manualBox.open = true;
    foodInput.focus();
    foodInput.placeholder = "食べたものの名前を入れてください";
    return;
  }

  // 栄養欄には「量」を反映済みの値が入っている（下の量ハンドラで更新）ので、そのまま保存する。
  const entry = { date: date, food: food };
  for (const key of NUTRIENT_KEYS) {
    entry[key] = toNumber(inputByKey[key].value);
  }
  if (estimatedKeys.size > 0) {
    entry.estimated = Array.from(estimatedKeys); // どの栄養が AI の推定値か
  }
  addEntry(entry);

  // 次の入力に備えて、日付以外の欄を空にする
  aiStatus.textContent = "";
  foodInput.value = "";
  resetAmount(); // 量を 1 に戻す
  for (const key of NUTRIENT_KEYS) {
    inputByKey[key].value = "";
  }
  foodInput.placeholder = "例: 納豆ごはん、みそ汁";
  manualBox.open = false;
});


// -----------------------------------------------
//  起動時の処理
// -----------------------------------------------

// 栄養の入力欄を作る（基本欄／詳細欄）
buildNutrientFields();
attachNutrientInputListeners();

// 日付欄の初期値を「今日」にする
dateInput.value = localDateStr(new Date());

// 登録食品リストを組み立てる（いつもの食べ物は render() の中で作る）
renderMyFoodsList();

// 最初の一覧を表示する
render();

// しばらく保存していなければ声をかける
updateBackupNag();

// ホーム画面のアプリとして動かすための準備
//  ・サービスワーカー: 電波が無くても開けるようにする（https のときだけ動く）
//  ・storage.persist(): 「この記録は大事なので勝手に消さないで」とブラウザに頼む
if ("serviceWorker" in navigator && location.protocol === "https:") {
  navigator.serviceWorker.register("sw.js").catch((e) => console.error(e));
}
if (navigator.storage && navigator.storage.persist) {
  navigator.storage.persist().catch(() => {});
}

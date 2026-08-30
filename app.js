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
const scanOpenBtn = document.getElementById("scan-open");
const scanCloseBtn = document.getElementById("scan-close");
const scannerOverlay = document.getElementById("scanner-overlay");
const aiReadBtn = document.getElementById("ai-read");
const aiPhotoInput = document.getElementById("ai-photo");
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

  foodInput.value = name + "（100gあたり）";
  kcalInput.value = roundNutrient(toNumber(n["energy-kcal_100g"]));
  proteinInput.value = roundNutrient(toNumber(n.proteins_100g));
  fatInput.value = roundNutrient(toNumber(n.fat_100g));
  carbInput.value = roundNutrient(toNumber(n.carbohydrates_100g));
  fiberInput.value = roundNutrient(toNumber(n.fiber_100g));
  // 鉄・カルシウムは g 単位で返るので 1000倍して mg にする
  ironInput.value = roundNutrient(toNumber(n.iron_100g) * 1000);
  calciumInput.value = roundNutrient(toNumber(n.calcium_100g) * 1000);

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

// 使うモデル。成分表の読み取り精度を優先して sonnet を使う（1回 約1円）。
//  もっと安く・速くしたいときは "claude-haiku-4-5"（精度は落ちる）に変える。
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
  const prompt =
    "この画像は食品の栄養成分表示です。表に印刷されている数値をそのまま読み取ってください。" +
    "換算・推測・補完はしないこと。表に無い項目は null。\n\n" +
    "読み取る項目:\n" +
    "- name: 商品名（画像内にあれば。無ければ空文字）\n" +
    "- serving: 表が何あたりの値か、書かれている通りの文字列（例「100g当たり」「1袋(60g)当たり」「コップ1杯(200ml)当たり」）\n" +
    "- kcal: エネルギー(kcal の数値)\n" +
    "- protein: たんぱく質(g)\n" +
    "- fat: 脂質(g)\n" +
    "- carb: 炭水化物(無ければ糖質)(g)\n" +
    "- fiber: 食物繊維(g)\n" +
    "- iron: 鉄(mg)\n" +
    "- calcium: カルシウム(mg)\n\n" +
    "説明文なしで、次の形の JSON のみを返す:\n" +
    '{"name":"","serving":"","kcal":null,"protein":null,"fat":null,"carb":null,"fiber":null,"iron":null,"calcium":null}';

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
      max_tokens: 1024,
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
function fillFromAi(n) {
  // "1,050" などの区切りを除いて数値化。数値でなければ 0。
  const num = (v) => {
    if (v === null || v === undefined || v === "") {
      return 0;
    }
    const x = Number(String(v).replace(/,/g, ""));
    return isNaN(x) ? 0 : roundNutrient(x);
  };

  const label = [n.name, n.serving ? "（" + n.serving + "）" : ""].join("").trim();
  if (label) {
    foodInput.value = label;
  }
  kcalInput.value = num(n.kcal);
  proteinInput.value = num(n.protein);
  fatInput.value = num(n.fat);
  carbInput.value = num(n.carb);
  fiberInput.value = num(n.fiber);
  ironInput.value = num(n.iron);
  calciumInput.value = num(n.calcium);
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
  barcodeInput.value = "";
  barcodeStatus.textContent = "";
  searchResults.innerHTML = "";
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

// ===============================================
//  日本人の食事摂取基準（2025年版）— 主要な値
// ===============================================
//  出典: 厚生労働省「日本人の食事摂取基準（2025年版）」
//        https://www.mhlw.go.jp/stf/newpage_48567.html
//  ※ここの数値はおおよそ。正確には上記の資料で確認して差し替えること。
//
//  このアプリで目標と比べる栄養:
//    カロリー / たんぱく質 / 食物繊維 / 鉄 / カルシウム
//  （脂質・炭水化物は「エネルギーに占める割合」で見るものなので、ここでは扱わない）


// --- あなたの区分（設定）。ここを書き換えると目標値が変わる ---
const PROFILE = {
  sex: "male",       // "male" | "female_yes"（月経あり） | "female_no"（月経なし）
  ageBand: "30-49",  // "18-29" | "30-49" | "50-64" | "65+"
  activity: "low",   // "low"（低い） | "mid"（ふつう） | "high"（高い）
};


// --- 推定エネルギー必要量（kcal/日）  性別 × 年齢層 × 活動レベル ---
const ENERGY = {
  male: {
    "18-29": { low: 2300, mid: 2650, high: 3050 },
    "30-49": { low: 2300, mid: 2700, high: 3050 },
    "50-64": { low: 2200, mid: 2600, high: 2950 },
    "65+":   { low: 2050, mid: 2400, high: 2750 },
  },
  female: {
    "18-29": { low: 1700, mid: 2000, high: 2300 },
    "30-49": { low: 1750, mid: 2050, high: 2350 },
    "50-64": { low: 1650, mid: 1950, high: 2250 },
    "65+":   { low: 1550, mid: 1850, high: 2100 },
  },
};


// --- 栄養の推奨量・目標量（1日あたり） ---
//  protein / iron / calcium = 推奨量、fiber = 目標量（これ以上とりたい量）
const NUTRIENT_STANDARDS = {
  male: {
    "18-29": { protein: 65, fiber: 21, iron: 7.5, calcium: 800 },
    "30-49": { protein: 65, fiber: 21, iron: 7.5, calcium: 750 },
    "50-64": { protein: 65, fiber: 21, iron: 7.5, calcium: 750 },
    "65+":   { protein: 65, fiber: 20, iron: 7.5, calcium: 750 },
  },
  female_yes: { // 月経あり
    "18-29": { protein: 50, fiber: 18, iron: 10.5, calcium: 650 },
    "30-49": { protein: 50, fiber: 18, iron: 10.5, calcium: 650 },
    "50-64": { protein: 50, fiber: 18, iron: 11.0, calcium: 650 },
    "65+":   { protein: 50, fiber: 17, iron: 11.0, calcium: 650 },
  },
  female_no: { // 月経なし
    "18-29": { protein: 50, fiber: 18, iron: 6.5, calcium: 650 },
    "30-49": { protein: 50, fiber: 18, iron: 6.5, calcium: 650 },
    "50-64": { protein: 50, fiber: 18, iron: 6.5, calcium: 650 },
    "65+":   { protein: 50, fiber: 17, iron: 6.0, calcium: 650 },
  },
};


// 設定（profile）から、その日の目標値を1つのオブジェクトにまとめて返す。
function getTargets(profile) {
  // エネルギー表は male / female の2つだけなので、女性はどちらも "female" を見る
  const energySex = profile.sex === "male" ? "male" : "female";
  const kcal = ENERGY[energySex][profile.ageBand][profile.activity];

  const n = NUTRIENT_STANDARDS[profile.sex][profile.ageBand];
  return {
    kcal: kcal,
    protein: n.protein,
    fiber: n.fiber,
    iron: n.iron,
    calcium: n.calcium,
  };
}

// 設定を「男性・30-49歳・活動量 低い」のような文にする（画面の説明用）。
function profileText(profile) {
  const sex = {
    male: "男性",
    female_yes: "女性（月経あり）",
    female_no: "女性（月経なし）",
  }[profile.sex];
  const act = { low: "低い", mid: "ふつう", high: "高い" }[profile.activity];
  return `${sex}・${profile.ageBand}歳・活動量 ${act}`;
}

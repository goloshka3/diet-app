// ===============================================
//  日本人の食事摂取基準（2025年版）— 主要な値
// ===============================================
//  出典: 厚生労働省「日本人の食事摂取基準（2025年版）」
//        https://www.mhlw.go.jp/stf/newpage_48567.html
//  ※ここの数値はおおよそ。正確には上記の資料で確認して差し替えること。
//
//  このアプリで目標と比べる栄養:
//    エネルギー / たんぱく質 / 飽和脂肪酸 / 食物繊維 / 食塩相当量 /
//    カリウム / カルシウム / マグネシウム / 鉄 / 亜鉛 /
//    ビタミン A・D・B1・B2・B6・B12・葉酸・C
//  （脂質・炭水化物・糖質は「エネルギーに占める割合」の話なので判定しない）


// --- あなたの区分（初期値）。実際の値は「⚙️ 設定」で変更でき、localStorage に保存される ---
const DEFAULT_PROFILE = {
  sex: "male",       // "male" | "female_yes"（月経あり） | "female_no"（月経なし）
  ageBand: "30-49",  // "18-29" | "30-49" | "50-64" | "65+"
  activity: "low",   // "low"（低い） | "mid"（ふつう） | "high"（高い）
  kcalTarget: 0,     // カロリー目標を手動指定（0 なら自動計算）
  proteinTarget: 0,  // たんぱく質目標を手動指定（0 なら自動）
};
const PROFILE_STORAGE = "diet-app-profile";

// 保存された設定を読む。無ければ初期値。壊れていても初期値。
function loadProfile() {
  try {
    const saved = JSON.parse(localStorage.getItem(PROFILE_STORAGE) || "{}");
    return Object.assign({}, DEFAULT_PROFILE, saved);
  } catch (e) {
    return Object.assign({}, DEFAULT_PROFILE);
  }
}

// 設定を保存する。
function saveProfile(profile) {
  localStorage.setItem(PROFILE_STORAGE, JSON.stringify(profile));
}


// --- 推定エネルギー必要量（kcal/日）  性別 × 年齢層 × 活動レベル ---
//  ※男性30-49の low=2350 は2025年版で確認。他セルは2020年版ベース（要確認）。
const ENERGY = {
  male: {
    "18-29": { low: 2300, mid: 2650, high: 3050 },
    "30-49": { low: 2350, mid: 2700, high: 3050 },
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
//  男性 fiber は2025年版で 22g に（30-49で確認）。
const NUTRIENT_STANDARDS = {
  male: {
    "18-29": { protein: 65, fiber: 22, iron: 7.5, calcium: 800 },
    "30-49": { protein: 65, fiber: 22, iron: 7.5, calcium: 750 },
    "50-64": { protein: 65, fiber: 22, iron: 7.5, calcium: 750 },
    "65+":   { protein: 65, fiber: 21, iron: 7.5, calcium: 750 },
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


// --- その他のミネラル・ビタミンの目安量（1日あたり・性別のみで区別） ---
//  日本人の食事摂取基準（2025年版）の成人（30-49歳想定）の値。
//  salt/potassium = 目標量、vitD/vitB12 = 目安量、他 = 推奨量。
//  2025年版で変更: 男性 magnesium 380 / zinc 9.5 / vitD 9.0 /
//    vitB1 1.2 / vitB2 1.7 / vitB6 1.5 / vitB12 4.0（目安量に変更）。
//  potassium・vitA・folate・satfat比率・salt は2020年版から変更なし。
//  女性の値は概算（要確認）。
const MICRO_TARGETS = {
  male: {
    salt: 7.5, potassium: 3000, magnesium: 380, zinc: 9.5,
    vitA: 900, vitD: 9.0, vitB1: 1.2, vitB2: 1.7, vitB6: 1.5,
    vitB12: 4.0, folate: 240, vitC: 100,
  },
  female: {
    salt: 6.5, potassium: 2600, magnesium: 300, zinc: 8,
    vitA: 700, vitD: 9.0, vitB1: 0.9, vitB2: 1.2, vitB6: 1.1,
    vitB12: 4.0, folate: 240, vitC: 100,
  },
};


// 設定（profile）から、その日の目標値を1つのオブジェクトにまとめて返す。
function getTargets(profile) {
  // エネルギー表・ミネラル表は male / female の2つだけ（女性はどちらも "female"）
  const energySex = profile.sex === "male" ? "male" : "female";
  const autoKcal = ENERGY[energySex][profile.ageBand][profile.activity];

  const n = NUTRIENT_STANDARDS[profile.sex][profile.ageBand];
  const m = MICRO_TARGETS[energySex];

  // 手動指定（0 でなければ）を優先する
  const kcal = profile.kcalTarget > 0 ? profile.kcalTarget : autoKcal;
  const protein = profile.proteinTarget > 0 ? profile.proteinTarget : n.protein;

  return {
    kcal: kcal,
    protein: protein,
    fiber: n.fiber,
    iron: n.iron,
    calcium: n.calcium,
    // 飽和脂肪酸は「エネルギーの7%以下」→ グラムに換算（脂質1g=9kcal）
    satfat: Math.round((kcal * 0.07) / 9),
    salt: m.salt,
    potassium: m.potassium,
    magnesium: m.magnesium,
    zinc: m.zinc,
    vitA: m.vitA,
    vitD: m.vitD,
    vitB1: m.vitB1,
    vitB2: m.vitB2,
    vitB6: m.vitB6,
    vitB12: m.vitB12,
    folate: m.folate,
    vitC: m.vitC,
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
  let text = `${sex}・${profile.ageBand}歳・活動量 ${act}`;
  if (profile.kcalTarget > 0) {
    text += `・カロリー目標 ${profile.kcalTarget}`;
  }
  if (profile.proteinTarget > 0) {
    text += `・たんぱく質目標 ${profile.proteinTarget}g`;
  }
  return text;
}

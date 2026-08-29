// ===============================================
//  食品の栄養データ（1食のめやす量あたり）
// ===============================================
//  出典: 「日本食品標準成分表（八訂）増補2023年」をもとにした概算値。
//  ※数値はおおよそ。正確にしたいときは、この表を公式データで置き換える。
//  ※量は「だいたいこれくらい食べる」という目安。実際と違うときは
//    追加後に一覧の数値を…（次のステップ 1-C-2 で微調整できるようにする）
//
//  1件の形： { name: 表示名, kcal, protein, fat, carb, fiber, iron, calcium }
//    kcal=カロリー  protein=たんぱく質(g)  fat=脂質(g)  carb=炭水化物(g)
//    fiber=食物繊維(g)  iron=鉄(mg)  calcium=カルシウム(mg)

const FOODS = [
  // --- 主食 ---
  { name: "ごはん（茶わん1杯 150g）", kcal: 234, protein: 3.8, fat: 0.5, carb: 55.7, fiber: 2.3, iron: 0.2, calcium: 5 },
  { name: "食パン（6枚切り1枚 60g）", kcal: 149, protein: 4.9, fat: 2.5, carb: 27.8, fiber: 2.5, iron: 0.3, calcium: 13 },
  { name: "うどん（ゆで1玉 230g）", kcal: 242, protein: 6.0, fat: 0.9, carb: 50.0, fiber: 2.1, iron: 0.7, calcium: 14 },
  { name: "そば（ゆで1玉 180g）", kcal: 238, protein: 8.6, fat: 1.8, carb: 47.3, fiber: 5.2, iron: 1.4, calcium: 16 },
  { name: "パスタ（乾めん 80g）", kcal: 278, protein: 9.6, fat: 1.4, carb: 55.6, fiber: 3.0, iron: 1.1, calcium: 14 },
  { name: "オートミール（40g）", kcal: 152, protein: 5.5, fat: 2.3, carb: 27.6, fiber: 3.8, iron: 1.6, calcium: 19 },

  // --- 肉・魚 ---
  { name: "鶏むね肉 皮なし（100g）", kcal: 105, protein: 23.3, fat: 1.9, carb: 0.1, fiber: 0, iron: 0.3, calcium: 4 },
  { name: "鶏もも肉 皮なし（100g）", kcal: 113, protein: 19.0, fat: 5.0, carb: 0, fiber: 0, iron: 0.6, calcium: 5 },
  { name: "豚もも肉（100g）", kcal: 171, protein: 20.5, fat: 10.2, carb: 0.2, fiber: 0, iron: 0.7, calcium: 4 },
  { name: "牛もも肉（100g）", kcal: 196, protein: 19.5, fat: 13.3, carb: 0.4, fiber: 0, iron: 1.4, calcium: 4 },
  { name: "鮭（1切れ 80g）", kcal: 106, protein: 17.8, fat: 3.3, carb: 0.1, fiber: 0, iron: 0.4, calcium: 11 },
  { name: "さば（1切れ 80g）", kcal: 169, protein: 16.5, fat: 13.4, carb: 0.2, fiber: 0, iron: 1.0, calcium: 5 },
  { name: "ツナ缶 水煮（1缶 70g）", kcal: 50, protein: 11.2, fat: 0.5, carb: 0.2, fiber: 0, iron: 0.6, calcium: 4 },
  { name: "あさり むき身（40g）", kcal: 12, protein: 2.4, fat: 0.1, carb: 0.2, fiber: 0, iron: 1.5, calcium: 27 },

  // --- 卵・大豆・乳 ---
  { name: "卵（1個 50g）", kcal: 71, protein: 6.1, fat: 5.1, carb: 0.2, fiber: 0, iron: 0.8, calcium: 23 },
  { name: "木綿豆腐（1/2丁 150g）", kcal: 110, protein: 10.5, fat: 7.4, carb: 1.8, fiber: 1.7, iron: 2.3, calcium: 140 },
  { name: "納豆（1パック 45g）", kcal: 90, protein: 7.4, fat: 4.5, carb: 5.4, fiber: 3.0, iron: 1.5, calcium: 41 },
  { name: "厚揚げ（1/2枚 100g）", kcal: 143, protein: 10.7, fat: 11.3, carb: 0.9, fiber: 0.7, iron: 2.6, calcium: 240 },
  { name: "牛乳（コップ1杯 200g）", kcal: 122, protein: 6.6, fat: 7.6, carb: 9.6, fiber: 0, iron: 0, calcium: 220 },
  { name: "ヨーグルト 無糖（100g）", kcal: 56, protein: 3.6, fat: 3.0, carb: 4.9, fiber: 0, iron: 0, calcium: 120 },
  { name: "プロセスチーズ（1個 18g）", kcal: 57, protein: 4.1, fat: 4.7, carb: 0.2, fiber: 0, iron: 0.1, calcium: 113 },

  // --- 野菜・果物 ---
  { name: "ブロッコリー ゆで（70g）", kcal: 26, protein: 2.7, fat: 0.3, carb: 3.6, fiber: 3.0, iron: 0.7, calcium: 29 },
  { name: "ほうれん草 ゆで（70g）", kcal: 16, protein: 1.8, fat: 0.3, carb: 1.7, fiber: 2.5, iron: 0.6, calcium: 48 },
  { name: "小松菜 ゆで（70g）", kcal: 10, protein: 1.1, fat: 0.1, carb: 1.1, fiber: 1.7, iron: 1.5, calcium: 105 },
  { name: "にんじん（中1/2本 80g）", kcal: 26, protein: 0.6, fat: 0.2, carb: 6.9, fiber: 2.2, iron: 0.2, calcium: 22 },
  { name: "キャベツ（2枚 100g）", kcal: 21, protein: 1.3, fat: 0.2, carb: 5.2, fiber: 1.8, iron: 0.3, calcium: 43 },
  { name: "トマト（中1個 150g）", kcal: 30, protein: 1.1, fat: 0.2, carb: 7.0, fiber: 1.5, iron: 0.3, calcium: 11 },
  { name: "バナナ（1本 90g）", kcal: 84, protein: 1.0, fat: 0.2, carb: 20.3, fiber: 1.0, iron: 0.3, calcium: 5 },
];

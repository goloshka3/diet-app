// ===============================================
//  食品の栄養データ（1食のめやす量あたり）
// ===============================================
//  出典: 「日本食品標準成分表（八訂）増補2023年」をもとにした概算値。
//  ※数値はおおよそ。正確にしたいときは、公式データで置き換える。
//  ※量は「だいたいこれくらい食べる」という目安。実際と違うときは
//    追加前に「食べた量」の欄で倍率を変えると全項目が計算し直される。
//
//  1件の形（キー = app.js の NUTRIENTS と同じ）:
//    kcal(kcal) protein/fat/satfat/carb/sugar/fiber/salt (g)
//    potassium/calcium/magnesium/iron/zinc/vitB1/vitB2/vitB6/vitC (mg)
//    vitA/vitD/vitB12/folate (μg)

const FOODS = [
  // --- 主食 ---
  { name: "ごはん（茶わん1杯 150g）", kcal: 234, protein: 3.8, fat: 0.5, satfat: 0.2, carb: 55.7, sugar: 53.4, fiber: 2.3, salt: 0, potassium: 44, calcium: 5, magnesium: 11, iron: 0.2, zinc: 0.9, vitA: 0, vitD: 0, vitB1: 0.03, vitB2: 0.02, vitB6: 0.03, vitB12: 0, folate: 5, vitC: 0 },
  { name: "食パン（6枚切り1枚 60g）", kcal: 149, protein: 5.3, fat: 2.5, satfat: 0.9, carb: 27.8, sugar: 26.5, fiber: 2.5, salt: 0.7, potassium: 52, calcium: 13, magnesium: 11, iron: 0.3, zinc: 0.3, vitA: 0, vitD: 0, vitB1: 0.04, vitB2: 0.03, vitB6: 0.02, vitB12: 0, folate: 18, vitC: 0 },
  { name: "うどん（ゆで1玉 230g）", kcal: 219, protein: 6.0, fat: 0.9, satfat: 0.2, carb: 49.7, sugar: 46.7, fiber: 3.0, salt: 0.7, potassium: 21, calcium: 14, magnesium: 14, iron: 0.5, zinc: 0.2, vitA: 0, vitD: 0, vitB1: 0.05, vitB2: 0.02, vitB6: 0.02, vitB12: 0, folate: 5, vitC: 0 },
  { name: "そば（ゆで1玉 180g）", kcal: 234, protein: 8.6, fat: 1.8, satfat: 0.4, carb: 46.8, sugar: 41.6, fiber: 5.2, salt: 0, potassium: 61, calcium: 16, magnesium: 49, iron: 1.4, zinc: 0.7, vitA: 0, vitD: 0, vitB1: 0.09, vitB2: 0.04, vitB6: 0.07, vitB12: 0, folate: 14, vitC: 0 },
  { name: "パスタ（乾めん 80g）", kcal: 278, protein: 10.3, fat: 1.4, satfat: 0.3, carb: 58.5, sugar: 54.2, fiber: 4.3, salt: 0, potassium: 160, calcium: 14, magnesium: 44, iron: 1.1, zinc: 1.2, vitA: 0, vitD: 0, vitB1: 0.15, vitB2: 0.05, vitB6: 0.09, vitB12: 0, folate: 10, vitC: 0 },
  { name: "オートミール（40g）", kcal: 140, protein: 5.5, fat: 2.3, satfat: 0.5, carb: 27.6, sugar: 23.9, fiber: 3.8, salt: 0, potassium: 104, calcium: 19, magnesium: 40, iron: 1.6, zinc: 0.8, vitA: 0, vitD: 0, vitB1: 0.08, vitB2: 0.03, vitB6: 0.04, vitB12: 0, folate: 12, vitC: 0 },

  // --- 肉・魚 ---
  { name: "鶏むね肉 皮なし（100g）", kcal: 105, protein: 23.3, fat: 1.9, satfat: 0.5, carb: 0.1, sugar: 0, fiber: 0, salt: 0.1, potassium: 370, calcium: 4, magnesium: 29, iron: 0.3, zinc: 0.6, vitA: 9, vitD: 0.1, vitB1: 0.09, vitB2: 0.10, vitB6: 0.57, vitB12: 0.2, folate: 13, vitC: 3 },
  { name: "鶏もも肉 皮なし（100g）", kcal: 113, protein: 19.0, fat: 5.0, satfat: 1.4, carb: 0, sugar: 0, fiber: 0, salt: 0.2, potassium: 320, calcium: 5, magnesium: 24, iron: 0.6, zinc: 1.9, vitA: 16, vitD: 0.2, vitB1: 0.10, vitB2: 0.15, vitB6: 0.25, vitB12: 0.3, folate: 10, vitC: 3 },
  { name: "豚もも肉（100g）", kcal: 171, protein: 20.5, fat: 10.2, satfat: 3.6, carb: 0.2, sugar: 0.2, fiber: 0, salt: 0.1, potassium: 350, calcium: 4, magnesium: 24, iron: 0.7, zinc: 2.0, vitA: 4, vitD: 0.1, vitB1: 0.90, vitB2: 0.21, vitB6: 0.31, vitB12: 0.3, folate: 2, vitC: 1 },
  { name: "牛もも肉（100g）", kcal: 196, protein: 19.5, fat: 13.3, satfat: 5.3, carb: 0.4, sugar: 0.4, fiber: 0, salt: 0.1, potassium: 320, calcium: 4, magnesium: 22, iron: 1.4, zinc: 4.0, vitA: 3, vitD: 0, vitB1: 0.09, vitB2: 0.20, vitB6: 0.32, vitB12: 1.5, folate: 8, vitC: 1 },
  { name: "鮭（1切れ 80g）", kcal: 106, protein: 17.8, fat: 3.3, satfat: 0.6, carb: 0.1, sugar: 0.1, fiber: 0, salt: 0.2, potassium: 280, calcium: 11, magnesium: 22, iron: 0.4, zinc: 0.4, vitA: 9, vitD: 25, vitB1: 0.12, vitB2: 0.17, vitB6: 0.51, vitB12: 4.6, folate: 16, vitC: 1 },
  { name: "さば（1切れ 80g）", kcal: 169, protein: 16.5, fat: 13.4, satfat: 3.7, carb: 0.2, sugar: 0.2, fiber: 0, salt: 0.2, potassium: 264, calcium: 5, magnesium: 24, iron: 1.0, zinc: 0.9, vitA: 30, vitD: 4.1, vitB1: 0.16, vitB2: 0.24, vitB6: 0.48, vitB12: 10, folate: 9, vitC: 1 },
  { name: "ツナ缶 水煮（1缶 70g）", kcal: 50, protein: 11.2, fat: 0.5, satfat: 0.2, carb: 0.2, sugar: 0.2, fiber: 0, salt: 0.6, potassium: 175, calcium: 4, magnesium: 15, iron: 0.6, zinc: 0.5, vitA: 3, vitD: 2.1, vitB1: 0.01, vitB2: 0.03, vitB6: 0.10, vitB12: 1.8, folate: 4, vitC: 0 },
  { name: "あさり むき身（40g）", kcal: 12, protein: 2.4, fat: 0.1, satfat: 0, carb: 0.2, sugar: 0.2, fiber: 0, salt: 0.9, potassium: 56, calcium: 27, magnesium: 40, iron: 1.5, zinc: 0.5, vitA: 1, vitD: 0, vitB1: 0.01, vitB2: 0.06, vitB6: 0.02, vitB12: 21, folate: 4, vitC: 1 },

  // --- 卵・大豆・乳 ---
  { name: "卵（1個 50g）", kcal: 71, protein: 6.1, fat: 5.1, satfat: 1.6, carb: 0.2, sugar: 0.2, fiber: 0, salt: 0.2, potassium: 65, calcium: 23, magnesium: 5, iron: 0.8, zinc: 0.6, vitA: 105, vitD: 1.9, vitB1: 0.03, vitB2: 0.19, vitB6: 0.04, vitB12: 0.5, folate: 24, vitC: 0 },
  { name: "木綿豆腐（1/2丁 150g）", kcal: 110, protein: 10.5, fat: 7.4, satfat: 0.8, carb: 1.8, sugar: 0.6, fiber: 1.7, salt: 0, potassium: 165, calcium: 140, magnesium: 86, iron: 2.3, zinc: 0.9, vitA: 0, vitD: 0, vitB1: 0.13, vitB2: 0.06, vitB6: 0.08, vitB12: 0, folate: 18, vitC: 0 },
  { name: "納豆（1パック 45g）", kcal: 90, protein: 7.4, fat: 4.5, satfat: 0.7, carb: 5.4, sugar: 2.3, fiber: 3.0, salt: 0, potassium: 300, calcium: 41, magnesium: 45, iron: 1.5, zinc: 0.8, vitA: 0, vitD: 0, vitB1: 0.03, vitB2: 0.25, vitB6: 0.10, vitB12: 0, folate: 54, vitC: 1 },
  { name: "厚揚げ（1/2枚 100g）", kcal: 143, protein: 10.7, fat: 11.3, satfat: 1.7, carb: 0.9, sugar: 0.2, fiber: 0.7, salt: 0, potassium: 120, calcium: 240, magnesium: 55, iron: 2.6, zinc: 1.1, vitA: 0, vitD: 0, vitB1: 0.07, vitB2: 0.03, vitB6: 0.08, vitB12: 0, folate: 23, vitC: 0 },
  { name: "牛乳（コップ1杯 200g）", kcal: 122, protein: 6.6, fat: 7.6, satfat: 4.6, carb: 9.6, sugar: 9.6, fiber: 0, salt: 0.2, potassium: 300, calcium: 220, magnesium: 20, iron: 0, zinc: 0.8, vitA: 76, vitD: 0.6, vitB1: 0.08, vitB2: 0.30, vitB6: 0.06, vitB12: 0.6, folate: 10, vitC: 2 },
  { name: "ヨーグルト 無糖（100g）", kcal: 56, protein: 3.6, fat: 3.0, satfat: 1.8, carb: 4.9, sugar: 4.9, fiber: 0, salt: 0.1, potassium: 170, calcium: 120, magnesium: 12, iron: 0, zinc: 0.4, vitA: 33, vitD: 0, vitB1: 0.04, vitB2: 0.14, vitB6: 0.04, vitB12: 0.1, folate: 11, vitC: 1 },
  { name: "プロセスチーズ（1個 18g）", kcal: 57, protein: 4.1, fat: 4.7, satfat: 3.0, carb: 0.2, sugar: 0.2, fiber: 0, salt: 0.5, potassium: 11, calcium: 113, magnesium: 3, iron: 0.1, zinc: 0.6, vitA: 47, vitD: 0, vitB1: 0.01, vitB2: 0.07, vitB6: 0.01, vitB12: 0.6, folate: 5, vitC: 0 },

  // --- 野菜・果物 ---
  { name: "ブロッコリー ゆで（70g）", kcal: 26, protein: 2.7, fat: 0.3, satfat: 0, carb: 3.6, sugar: 1.5, fiber: 3.0, salt: 0, potassium: 154, calcium: 29, magnesium: 12, iron: 0.7, zinc: 0.5, vitA: 47, vitD: 0, vitB1: 0.04, vitB2: 0.06, vitB6: 0.10, vitB12: 0, folate: 84, vitC: 38 },
  { name: "ほうれん草 ゆで（70g）", kcal: 16, protein: 1.8, fat: 0.3, satfat: 0, carb: 1.7, sugar: 0.4, fiber: 2.5, salt: 0, potassium: 343, calcium: 48, magnesium: 28, iron: 0.6, zinc: 0.5, vitA: 315, vitD: 0, vitB1: 0.03, vitB2: 0.08, vitB6: 0.06, vitB12: 0, folate: 77, vitC: 13 },
  { name: "小松菜 ゆで（70g）", kcal: 10, protein: 1.1, fat: 0.1, satfat: 0, carb: 1.1, sugar: 0.3, fiber: 1.7, salt: 0, potassium: 98, calcium: 105, magnesium: 9, iron: 1.5, zinc: 0.2, vitA: 182, vitD: 0, vitB1: 0.03, vitB2: 0.04, vitB6: 0.03, vitB12: 0, folate: 60, vitC: 15 },
  { name: "にんじん（中1/2本 80g）", kcal: 26, protein: 0.6, fat: 0.2, satfat: 0, carb: 6.9, sugar: 5.9, fiber: 2.2, salt: 0.1, potassium: 240, calcium: 22, magnesium: 8, iron: 0.2, zinc: 0.2, vitA: 576, vitD: 0, vitB1: 0.05, vitB2: 0.05, vitB6: 0.08, vitB12: 0, folate: 17, vitC: 5 },
  { name: "キャベツ（2枚 100g）", kcal: 21, protein: 1.3, fat: 0.2, satfat: 0, carb: 5.2, sugar: 3.9, fiber: 1.8, salt: 0, potassium: 200, calcium: 43, magnesium: 14, iron: 0.3, zinc: 0.2, vitA: 4, vitD: 0, vitB1: 0.04, vitB2: 0.03, vitB6: 0.11, vitB12: 0, folate: 78, vitC: 41 },
  { name: "トマト（中1個 150g）", kcal: 30, protein: 1.1, fat: 0.2, satfat: 0, carb: 7.0, sugar: 5.6, fiber: 1.5, salt: 0, potassium: 315, calcium: 11, magnesium: 14, iron: 0.3, zinc: 0.2, vitA: 68, vitD: 0, vitB1: 0.08, vitB2: 0.03, vitB6: 0.12, vitB12: 0, folate: 33, vitC: 23 },
  { name: "バナナ（1本 90g）", kcal: 84, protein: 1.0, fat: 0.2, satfat: 0.1, carb: 20.3, sugar: 19.0, fiber: 1.0, salt: 0, potassium: 324, calcium: 5, magnesium: 29, iron: 0.3, zinc: 0.2, vitA: 5, vitD: 0, vitB1: 0.04, vitB2: 0.04, vitB6: 0.34, vitB12: 0, folate: 23, vitC: 14 },
];

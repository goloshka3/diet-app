// ===============================================
//  サービスワーカー（オフラインでも開けるようにする係）
// ===============================================
//  ブラウザの裏で動き、アプリのファイルを取りに行く通信を仲介する。
//  方針は「ネット優先」: つながるときは毎回最新を取り、控えを更新する。
//  つながらないときだけ控え（キャッシュ）から出す。
//  → 更新したらすぐ反映され、電波が無くても開ける。
//  Claude API など外部への通信には手を出さない。

const CACHE = "diet-app-v1";

// 最初に控えておくファイル
const FILES = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./foods.js",
  "./standards.js",
  "./suggestions.js",
  "./manifest.json",
  "./icons/icon-180.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FILES)));
  self.skipWaiting(); // 新しい版をすぐ使い始める
});

self.addEventListener("activate", (event) => {
  // 古い版の控えを消す
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  // 自分のサイトのファイルを読むときだけ仲介する
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) {
    return;
  }
  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((cache) => cache.put(req, copy));
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }))
  );
});

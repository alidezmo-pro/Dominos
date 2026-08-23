const CACHE_NAME = 'domino-pro-v1';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './main.css',
    './domino.css',
    './modals.css',
    './responsive.css',
    './ui-components.css',
    './main.js',
    './state.js',
    './logic.js',
    './render.js',
    './ui.js',
    './firebase.js',
    './audio.js',
    './sfx.js',
    './manifest.json'
];

// تثبيت ملفات اللعبة في الكاش
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

// تشغيل اللعبة من الكاش لو مفيش إنترنت
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});

// تنظيف الكاش القديم لو حدثنا اللعبة
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
});
      

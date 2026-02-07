/**
 * Nova AI Service Worker
 * Provides offline support and caching for PWA functionality
 */

const CACHE_NAME = 'nova-ai-v1';
const OFFLINE_URL = '/offline';

// Assets to cache immediately on install
const PRECACHE_ASSETS = [
  '/',
  '/offline',
  '/manifest.json',
  '/favicon.svg',
  '/favicon.png',
  '/apple-touch-icon.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// Install event - precache critical assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Precaching critical assets');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => {
        console.log('[SW] Service worker installed');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Precache failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('[SW] Service worker activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip API requests and auth endpoints - always go to network
  if (url.pathname.startsWith('/api/') || 
      url.pathname.startsWith('/auth/') ||
      url.pathname.includes('_next/webpack-hmr')) {
    return;
  }

  // For navigation requests (HTML pages)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful navigation responses
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Return offline page if navigation fails
          return caches.match(OFFLINE_URL)
            .then((cachedResponse) => {
              if (cachedResponse) {
                return cachedResponse;
              }
              // Fallback to cached homepage or generic offline response
              return caches.match('/') || new Response('Offline', {
                status: 503,
                statusText: 'Service Unavailable',
                headers: { 'Content-Type': 'text/plain' }
              });
            });
        })
    );
    return;
  }

  // For static assets - cache-first strategy
  if (url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2)$/)) {
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            // Return cached version, but update in background
            fetch(request)
              .then((response) => {
                if (response.ok) {
                  caches.open(CACHE_NAME).then((cache) => {
                    cache.put(request, response);
                  });
                }
              })
              .catch(() => {}); // Ignore network errors for background update
            return cachedResponse;
          }
          
          // Not in cache - fetch and cache
          return fetch(request)
            .then((response) => {
              if (response.ok) {
                const responseClone = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(request, responseClone);
                });
              }
              return response;
            });
        })
    );
    return;
  }

  // For other requests - network-first with cache fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});

// Handle messages from the app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.delete(CACHE_NAME).then(() => {
      console.log('[SW] Cache cleared');
    });
  }
});

// ── Background Sync ──────────────────────────────────────
// Syncs offline-queued messages when connectivity is restored.
// Messages are stored in IndexedDB by the client (see chat page).

const OFFLINE_STORE = 'nova-offline-messages';

async function getOfflineMessages() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('nova-sync', 1);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(OFFLINE_STORE)) {
        db.createObjectStore(OFFLINE_STORE, { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = (event) => {
      const db = event.target.result;
      const tx = db.transaction(OFFLINE_STORE, 'readonly');
      const store = tx.objectStore(OFFLINE_STORE);
      const getAll = store.getAll();
      getAll.onsuccess = () => resolve(getAll.result);
      getAll.onerror = () => reject(getAll.error);
    };
    request.onerror = () => reject(request.error);
  });
}

async function clearOfflineMessages() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('nova-sync', 1);
    request.onsuccess = (event) => {
      const db = event.target.result;
      const tx = db.transaction(OFFLINE_STORE, 'readwrite');
      const store = tx.objectStore(OFFLINE_STORE);
      store.clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    };
    request.onerror = () => reject(request.error);
  });
}

async function removeOfflineMessage(id) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('nova-sync', 1);
    request.onsuccess = (event) => {
      const db = event.target.result;
      const tx = db.transaction(OFFLINE_STORE, 'readwrite');
      const store = tx.objectStore(OFFLINE_STORE);
      store.delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    };
    request.onerror = () => reject(request.error);
  });
}

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-messages') {
    console.log('[SW] Background sync triggered — replaying offline messages');
    event.waitUntil(syncOfflineMessages());
  }
});

async function syncOfflineMessages() {
  try {
    const messages = await getOfflineMessages();
    if (!messages || messages.length === 0) {
      console.log('[SW] No offline messages to sync');
      return;
    }

    console.log(`[SW] Syncing ${messages.length} offline message(s)…`);

    for (const msg of messages) {
      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: msg.messages,
            conversationId: msg.conversationId || undefined,
          }),
        });

        if (response.ok) {
          await removeOfflineMessage(msg.id);
          console.log(`[SW] Synced message ${msg.id}`);

          // Notify the client that a message was synced
          const allClients = await clients.matchAll({ type: 'window' });
          for (const client of allClients) {
            client.postMessage({
              type: 'SYNC_MESSAGE_SENT',
              messageId: msg.id,
              conversationId: msg.conversationId,
            });
          }
        } else if (response.status === 429) {
          // Rate limited — stop syncing, will retry next sync event
          console.log('[SW] Rate limited during sync, will retry later');
          break;
        } else {
          console.error(`[SW] Failed to sync message ${msg.id}: ${response.status}`);
        }
      } catch (err) {
        console.error(`[SW] Network error syncing message ${msg.id}:`, err);
        break; // Still offline — stop trying
      }
    }
  } catch (err) {
    console.error('[SW] Background sync error:', err);
  }
}

// ── Push Notifications ────────────────────────────────────

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: 'Nova AI', body: event.data.text() };
  }

  const options = {
    body: data.body || '',
    icon: data.icon || '/icons/icon-192.png',
    badge: data.badge || '/icons/icon-72.png',
    vibrate: [100, 50, 100],
    tag: data.tag || 'nova-notification',
    renotify: true,
    actions: data.actions || [
      { action: 'open', title: 'Open Nova' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
    data: {
      url: data.url || '/chat',
      timestamp: Date.now(),
    },
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Nova AI', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data?.url || '/chat';

  // Handle action buttons
  if (event.action === 'dismiss') return;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Focus an existing window if one is open on the same origin
        for (const client of clientList) {
          if (new URL(client.url).origin === self.location.origin && 'focus' in client) {
            client.focus();
            client.postMessage({ type: 'NAVIGATE', url });
            return;
          }
        }
        // No existing window — open a new one
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});

self.addEventListener('notificationclose', (event) => {
  // Analytics: user dismissed without clicking
  console.log('[SW] Notification dismissed:', event.notification.tag);
});

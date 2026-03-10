# PWA Enhancements Research: Next.js + FastAPI Stone Slab Configurator

**Domain:** Progressive Web Application (PWA) Implementation  
**Researched:** March 10, 2026  
**Overall Confidence:** HIGH  
**Project Context:** Next.js 16 + FastAPI + Supabase Auth

## Executive Summary

This research provides a comprehensive implementation guide for adding Progressive Web App capabilities to an existing Next.js 16 stone slab configurator. The application currently supports guest sessions, Supabase authentication, and real-time features via a FastAPI backend. The PWA enhancements will enable offline functionality, push notifications for configuration updates and pricing alerts, background synchronization of saved designs, and installable app behavior on mobile and desktop devices.

The recommended architecture leverages Next.js 16's built-in service worker support combined with a custom service worker for advanced caching strategies and push notification handling. The FastAPI backend will handle push subscription management using the Web Push Protocol with VAPID authentication. This implementation targets Lighthouse PWA scores of 95+ while maintaining backward compatibility with the existing authentication system.

Key implementation decisions include using Workbox for service worker generation, implementing a cache-first strategy for static assets with stale-while-revalidate for API responses, utilizing the Background Sync API for configuration persistence, and integrating with existing Supabase auth for push notification authorization.

## Recommended PWA Architecture

### System Overview

The PWA architecture for this stone slab configurator consists of four primary layers working in concert to provide seamless offline and push notification capabilities. The first layer comprises the client-side service worker and caching logic, which intercepts network requests and determines whether to serve cached content, network content, or a hybrid approach based on the resource type and network availability. The second layer includes the Next.js application shell with its built-in service worker registration, which handles initial load caching and enables the application to function without network connectivity. The third layer consists of the FastAPI backend endpoints for managing push notification subscriptions, storing subscription data in the existing database, and triggering push messages to subscribed clients. The fourth and final layer encompasses the browser push notification infrastructure, including the service worker push event handlers that receive and display notifications even when the application is not active.

The architecture implements a separation between static asset caching, dynamic API response caching, and user-generated content synchronization. Static assets such as JavaScript bundles, CSS files, and application images use a cache-first strategy with versioned cache names to ensure instant loading on repeat visits. Dynamic content from the FastAPI backend uses a stale-while-revalidate strategy that serves cached data immediately while updating in the background, ensuring the UI remains responsive even on slow networks. User-generated configurations are handled through the Background Sync API, which queues save operations when offline and automatically retries them when connectivity is restored.

### Component Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Next.js 16 Frontend                         │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────┐ │
│  │   PWA       │  │  Offline   │  │   Push      │  │  Install  │ │
│  │  Manifest   │  │  Detection │  │  Permission │  │  Prompt   │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └───────────┘ │
├─────────────────────────────────────────────────────────────────────┤
│                    Service Worker (sw.js)                          │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────┐ │
│  │  Cache      │  │   Push      │  │ Background  │  │  Offline  │ │
│  │  Handlers   │  │  Events     │  │   Sync     │  │   Fallback│ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └───────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     FastAPI Backend                                │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────┐ │
│  │  Push       │  │  VAPID      │  │ Subscription│  │   Web     │ │
│  │  Trigger    │  │  Keys       │  │  Storage    │  │  Push Lib │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └───────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Push Service (FCM/APNs)                         │
└─────────────────────────────────────────────────────────────────────┘
```

## Technology Stack

### Required Dependencies

The PWA implementation requires additions both the to frontend and backend dependencies. On the frontend, the primary addition is the Workbox library for service worker generation, along with TypeScript types for service worker development. The backend requires the web-push library for handling push notification encryption and delivery. The following table details the specific packages and their purposes.

| Layer    | Package              | Version | Purpose                       |
| -------- | -------------------- | ------- | ----------------------------- |
| Frontend | workbox-window       | ^7.3.0  | Client-side PWA utilities     |
| Frontend | @types/serviceworker | latest  | TypeScript definitions        |
| Frontend | vite-plugin-pwa      | ^0.21.0 | PWA asset generation          |
| Backend  | web-push             | ^3.70.0 | Push notification handling    |
| Backend  | py-vapid             | ^1.8.0  | VAPID key generation (Python) |

### Installation Commands

```bash
# Frontend dependencies
npm install workbox-window @types/serviceworker --save

# Backend dependencies
pip install web-push
```

## PWA Configuration

### Web App Manifest

The web app manifest defines how the application appears when installed on a device. For the stone slab configurator, this includes custom icons for various contexts, the application name and short name for home screen display, the display mode (standalone for app-like behavior), theme colors matching the application branding, and the start URL pointing to the main configurator page. The manifest should be placed in the public directory as manifest.json and referenced in the HTML head.

```json
{
  "name": "Stone Slab Configurator",
  "short_name": "StoneConfig",
  "description": "Design and configure custom stone slabs with real-time pricing",
  "start_url": "/dashboard",
  "display": "standalone",
  "background_color": "#1a1a2e",
  "theme_color": "#e94560",
  "orientation": "portrait-primary",
  "scope": "/",
  "icons": [
    {
      "src": "/icons/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-96x96.png",
      "sizes": "96x96",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-128x128.png",
      "sizes": "128x128",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-144x144.png",
      "sizes": "144x144",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-152x152.png",
      "sizes": "152x152",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-384x384.png",
      "sizes": "384x384",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable any"
    }
  ],
  "categories": ["business", "productivity", "shopping"],
  "shortcuts": [
    {
      "name": "New Configuration",
      "short_name": "New",
      "description": "Start a new stone slab configuration",
      "url": "/dashboard?action=new",
      "icons": [{ "src": "/icons/new-config.png", "sizes": "96x96" }]
    },
    {
      "name": "My Designs",
      "short_name": "Designs",
      "description": "View saved configurations",
      "url": "/dashboard?view=saved",
      "icons": [{ "src": "/icons/my-designs.png", "sizes": "96x96" }]
    }
  ]
}
```

### Manifest Integration in Next.js

Add the manifest link to the root layout in layout.tsx:

```tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Stone Lab Configurator',
  description: 'Generated by Stone Studio',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'StoneConfig',
  },
  icons: {
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180' }],
  },
};
```

## Service Worker Implementation

### Service Worker Structure

The service worker handles caching strategies, push event listening, and background synchronization. For Next.js 16, the service worker should be placed in the public directory to ensure it's served correctly. The implementation uses a modular approach with separate handlers for different resource types.

```typescript
// public/sw.ts
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import {
  StaleWhileRevalidate,
  CacheFirst,
  NetworkFirst,
} from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

// Declare self as ServiceWorkerGlobalScope
declare const self: ServiceWorkerGlobalScope;

// Precache all build assets generated by Next.js
precacheAndRoute(self.__WB_MANIFEST);

// Clean up old caches
cleanupOutdatedCaches();

// Cache strategy configurations
const CACHE_NAMES = {
  static: 'static-v1',
  dynamic: 'dynamic-v1',
  images: 'images-v1',
  api: 'api-v1',
};

// ============================================
// STATIC ASSETS: Cache-First Strategy
// ============================================
// Fonts, CSS, JavaScript bundles - use cache-first
// because these rarely change and should load instantly
registerRoute(
  ({ request, url }) =>
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'font',
  new CacheFirst({
    cacheName: CACHE_NAMES.static,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 60,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
      }),
    ],
  })
);

// ============================================
// IMAGES: Cache-First with Size Limits
// ============================================
// Stone slab textures and product images
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: CACHE_NAMES.images,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 60 * 24 * 60 * 60, // 60 days
      }),
    ],
  })
);

// ============================================
// API REQUESTS: Stale-While-Revalidate
// ============================================
// Configuration data, pricing, material lists
// Serve cached immediately, update in background
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new StaleWhileRevalidate({
    cacheName: CACHE_NAMES.api,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 5 * 60, // 5 minutes for API data
      }),
    ],
  })
);

// ============================================
// NAVIGATION REQUESTS: Network-First
// ============================================
// HTML pages - try network first, fall back to cache
// This ensures users get fresh pages while enabling offline access
registerRoute(
  ({ request }) => request.mode === 'navigate',
  new NetworkFirst({
    cacheName: CACHE_NAMES.static,
    networkTimeoutSeconds: 3,
    plugins: [new CacheableResponsePlugin({ statuses: [0, 200] })],
  })
);

// ============================================
// PUSH NOTIFICATION EVENTS
// ============================================
self.addEventListener('push', (event: PushEvent) => {
  const data = event.data?.json() ?? {};

  const title = data.title || 'Stone Configurator';
  const options: NotificationOptions = {
    body: data.body || 'You have a new notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/dashboard',
      timestamp: Date.now(),
      configurationId: data.configurationId,
    },
    actions: data.actions || [
      { action: 'open', title: 'Open App' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
    tag: data.tag || 'default',
    renotify: data.renotify || false,
    requireInteraction: data.requireInteraction || false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const urlToOpen = event.notification.data?.url || '/dashboard';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // If a window is already open, focus it
        for (const client of clientList) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        // Otherwise, open a new window
        if (self.clients.openWindow) {
          return self.clients.openWindow(urlToOpen);
        }
      })
  );
});

// ============================================
// BACKGROUND SYNC FOR OFFLINE SAVES
// ============================================
self.addEventListener('sync', (event: SyncEvent) => {
  if (event.tag === 'sync-configuration') {
    event.waitUntil(syncConfiguration());
  }
});

async function syncConfiguration(): Promise<void> {
  // Get pending configurations from IndexedDB
  const db = await openDatabase();
  const pendingConfigs = await getAllPendingConfigurations(db);

  for (const config of pendingConfigs) {
    try {
      // Attempt to sync each configuration
      const response = await fetch('/api/data/configurations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.authToken}`,
        },
        body: JSON.stringify(config.data),
      });

      if (response.ok) {
        // Remove from pending queue
        await removePendingConfiguration(db, config.id);

        // Notify the user
        await self.registration.showNotification('Configuration Saved', {
          body: 'Your design has been saved to the cloud.',
          icon: '/icons/icon-192x192.png',
          tag: 'sync-complete',
        });
      }
    } catch (error) {
      console.error('Failed to sync configuration:', error);
      // Will retry on next sync event
    }
  }
}

// IndexedDB helpers for offline queue
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('stone-config-offline', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('pending-configurations')) {
        db.createObjectStore('pending-configurations', { keyPath: 'id' });
      }
    };
  });
}

function getAllPendingConfigurations(db: IDBDatabase): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('pending-configurations', 'readonly');
    const store = transaction.objectStore('pending-configurations');
    const request = store.getAll();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

function removePendingConfiguration(
  db: IDBDatabase,
  id: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('pending-configurations', 'readwrite');
    const store = transaction.objectStore('pending-configurations');
    const request = store.delete(id);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// ============================================
// MESSAGE HANDLING FOR CLIENT COMMUNICATION
// ============================================
self.addEventListener('message', (event: ExtendableMessageEvent) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: '1.0.0' });
  }
});
```

### Service Worker Registration

Create a client-side registration utility that handles service worker lifecycle:

```typescript
// src/utils/serviceWorkerRegistration.ts
interface ServiceWorkerRegistrationOptions {
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
  onError?: (error: Error) => void;
}

export function registerServiceWorker(
  options: ServiceWorkerRegistrationOptions = {}
): void {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      const swUrl = '/sw.js';

      navigator.serviceWorker
        .register(swUrl)
        .then((registration) => {
          console.log('Service Worker registered:', registration.scope);

          // Check for updates periodically
          setInterval(
            () => {
              registration.update();
            },
            60 * 60 * 1000
          ); // Every hour

          // Handle successful registration
          if (options.onSuccess) {
            options.onSuccess(registration);
          }

          // Handle updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (
                  newWorker.state === 'installed' &&
                  navigator.serviceWorker.controller
                ) {
                  // New version available
                  if (options.onUpdate) {
                    options.onUpdate(registration);
                  }
                }
              });
            }
          });
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error);
          if (options.onError) {
            options.onError(error);
          }
        });
    });
  }
}

export function unregisterServiceWorker(): Promise<boolean> {
  if ('serviceWorker' in navigator) {
    return navigator.serviceWorker.getRegistration().then((registration) => {
      if (registration) {
        return registration.unregister();
      }
      return false;
    });
  }
  return Promise.resolve(false);
}

export function sendMessageToSW(message: any): Promise<any> {
  return new Promise((resolve, reject) => {
    if (!navigator.serviceWorker.controller) {
      reject(new Error('No service worker controller'));
      return;
    }

    const messageChannel = new MessageChannel();
    messageChannel.port1.onmessage = (event) => {
      if (event.data && event.data.error) {
        reject(event.data.error);
      } else {
        resolve(event.data);
      }
    };

    navigator.serviceWorker.controller.postMessage(message, [
      messageChannel.port2,
    ]);
  });
}
```

### Service Worker Update Handler Component

Create a React component to handle service worker updates:

```tsx
// src/components/ServiceWorkerUpdate.tsx
'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface ServiceWorkerUpdateProps {
  children?: React.ReactNode;
}

export function ServiceWorkerUpdateHandler({
  children,
}: ServiceWorkerUpdateProps) {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(
    null
  );
  const { toast } = useToast();

  useEffect(() => {
    // Import dynamically to avoid SSR issues
    import('@/utils/serviceWorkerRegistration').then(
      ({ registerServiceWorker }) => {
        registerServiceWorker({
          onUpdate: (registration) => {
            const waiting = registration.waiting;
            if (waiting) {
              setWaitingWorker(waiting);

              toast({
                title: 'Update Available',
                description: 'A new version is available. Refresh to update.',
                action: (
                  <Button
                    onClick={() => {
                      waiting.postMessage({ type: 'SKIP_WAITING' });
                      window.location.reload();
                    }}
                  >
                    Refresh
                  </Button>
                ),
              });
            }
          },
          onError: (error) => {
            console.error('Service Worker Error:', error);
          },
        });
      }
    );
  }, [toast]);

  return <>{children}</>;
}
```

## Push Notification Implementation

### VAPID Key Generation

VAPID (Voluntary Application Server Identification) keys are required for push notification authentication. Generate these keys on the server side and store them securely. The public key is shared with the client, while the private key remains server-side for signing push messages.

```python
# Generate VAPID keys (run once, then store securely)
from py_vapid import Vapid
from py_vapid import b64urlencode, b64decode
import base64

vapid = Vapid()
vapid.generate_keys()

# Save these securely - public key goes to client, private key stays on server
public_key = vapid.public_key
private_key = vapid.private_key

# For Flask/FastAPI, expose the public key as a base64 URL-safe string
def get_vapid_public_key():
    """Return the VAPID public key for client registration."""
    # The key needs to be converted to base64url format for client use
    public_key_bytes = vapid.public_key.public_bytes(
        encoding=serialization.Encoding.DER,
        format=serialization.PublicFormat.SubjectPublicKeyInfo
    )
    return base64.urlsafe_b64encode(public_key_bytes).decode('ascii')
```

### FastAPI Push Subscription Endpoints

```python
# backend/app/api/push.py
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
import webpush
from datetime import datetime, timedelta
import os
import json
import asyncio
from functools import lru_cache

router = APIRouter(prefix="/api/push", tags=["Push Notifications"])

# VAPID keys - in production, load from secure storage/environment
VAPID_PUBLIC_KEY = os.getenv("VAPID_PUBLIC_KEY", "")
VAPID_PRIVATE_KEY = os.getenv("VAPID_PRIVATE_KEY", "")
VAPID_SUBJECT = os.getenv("VAPID_SUBJECT", "mailto:admin@stonestudio.com")

# Initialize web-push
webpush.set_vapid_details(
    subject=VAPID_SUBJECT,
    public_key=VAPID_PUBLIC_KEY,
    private_key=VAPID_PRIVATE_KEY,
)


class PushSubscription(BaseModel):
    """Push subscription data from the client."""
    endpoint: str
    expirationTime: Optional[int] = None
    keys: dict


class PushSubscriptionCreate(BaseModel):
    """Request model for creating a subscription."""
    subscription: PushSubscription
    user_id: Optional[str] = None  # For authenticated users
    guest_id: Optional[str] = None  # For guest users


class PushNotificationRequest(BaseModel):
    """Request model for sending a notification."""
    title: str
    body: str
    icon: Optional[str] = None
    badge: Optional[str] = None
    tag: Optional[str] = "default"
    data: Optional[dict] = None
    actions: Optional[List[dict]] = None
    urgency: Optional[str] = "normal"


# In-memory storage for demo - replace with database in production
push_subscriptions: dict[str, PushSubscription] = {}


@router.post("/subscribe")
async def subscribe_to_push_notifications(
    request: PushSubscriptionCreate
):
    """
    Store a push subscription for a user or guest session.

    The client sends their push subscription object, which contains
    an endpoint URL and encryption keys. We store this mapping so we
    can send notifications to this client later.
    """
    try:
        # Create a unique key based on user/guest ID
        subscriber_id = request.user_id or request.guest_id

        if not subscriber_id:
            # For anonymous subscriptions, use endpoint as key
            subscriber_id = request.subscription.endpoint

        # Store the subscription
        push_subscriptions[subscriber_id] = request.subscription

        return {
            "success": True,
            "message": "Push subscription saved",
            "subscriber_id": subscriber_id
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save subscription: {str(e)}"
        )


@router.delete("/unsubscribe")
async def unsubscribe_from_push_notifications(
    subscriber_id: str
):
    """
    Remove a push subscription.

    Called when a user explicitly opts out of notifications
    or when their subscription becomes invalid.
    """
    if subscriber_id in push_subscriptions:
        del push_subscriptions[subscriber_id]
        return {"success": True, "message": "Unsubscribed successfully"}

    return {"success": False, "message": "Subscription not found"}


@router.post("/send")
async def send_push_notification(
    notification: PushNotificationRequest,
    subscriber_id: Optional[str] = None
):
    """
    Send a push notification to a specific subscriber.

    This endpoint can be called by other parts of the system
    (e.g., pricing service, configuration save) to notify users.
    """
    if subscriber_id and subscriber_id not in push_subscriptions:
        raise HTTPException(status_code=404, detail="Subscriber not found")

    # Determine which subscriptions to notify
    subscriptions_to_notify = []

    if subscriber_id:
        subscriptions_to_notify = [push_subscriptions[subscriber_id]]
    else:
        # Broadcast to all subscribers
        subscriptions_to_notify = list(push_subscriptions.values())

    if not subscriptions_to_notify:
        return {"success": False, "message": "No subscribers to notify"}

    # Prepare notification payload
    notification_payload = {
        "title": notification.title,
        "body": notification.body,
        "icon": notification.icon or "/icons/icon-192x192.png",
        "badge": notification.badge or "/icons/badge-72x72.png",
        "tag": notification.tag,
        "data": notification.data or {},
    }

    if notification.actions:
        notification_payload["actions"] = notification.actions

    # Send to all target subscriptions
    results = []
    for subscription in subscriptions_to_notify:
        try:
            webpush(
                subscription.dict(),
                json.dumps(notification_payload),
                vapid_crypto=/webpush.Vapid.from_string(
                    private_key=VAPID_PRIVATE_KEY
                )
            )
            results.append({"endpoint": subscription.endpoint, "status": "sent"})
        except webpush.WebPushException as e:
            results.append({
                "endpoint": subscription.endpoint,
                "status": "failed",
                "error": str(e)
            })

            # If subscription is expired (410), remove it
            if e.response and e.response.status_code == 410:
                # Find and remove this subscription
                for sid, sub in push_subscriptions.items():
                    if sub.endpoint == subscription.endpoint:
                        del push_subscriptions[sid]
                        break

    return {
        "success": True,
        "results": results,
        "sent_count": len([r for r in results if r.get("status") == "sent"])
    }


@router.get("/vapid-public-key")
async def get_vapid_public_key():
    """
    Return the VAPID public key for client-side subscription.

    The client needs this key to generate valid push subscriptions.
    """
    return {
        "publicKey": VAPID_PUBLIC_KEY
    }
```

### Client-Side Push Subscription Hook

Create a React hook to manage push notification subscriptions:

```typescript
// src/hooks/usePushNotifications.ts
import { useState, useEffect, useCallback } from 'react';

interface PushSubscriptionState {
  isSupported: boolean;
  isSubscribed: boolean;
  subscription: PushSubscription | null;
  permission: NotificationPermission;
}

interface UsePushNotificationsOptions {
  onSubscriptionChange?: (subscription: PushSubscription | null) => void;
}

export function usePushNotifications(
  options: UsePushNotificationsOptions = {}
) {
  const [state, setState] = useState<PushSubscriptionState>({
    isSupported: false,
    isSubscribed: false,
    subscription: null,
    permission: 'default',
  });

  // Check support on mount
  useEffect(() => {
    const supported = 'serviceWorker' in navigator && 'PushManager' in window;
    const permission = supported ? Notification.permission : 'denied';

    setState((prev) => ({
      ...prev,
      isSupported: supported,
      permission,
    }));

    if (supported) {
      // Check existing subscription
      navigator.serviceWorker.ready.then((registration) => {
        registration.pushManager.getSubscription().then((subscription) => {
          setState((prev) => ({
            ...prev,
            isSubscribed: !!subscription,
            subscription,
          }));
        });
      });
    }
  }, []);

  const subscribe = useCallback(
    async (userId?: string, guestId?: string) => {
      if (!state.isSupported) {
        console.warn('Push notifications not supported');
        return null;
      }

      try {
        // Request permission
        const permission = await Notification.requestPermission();
        setState((prev) => ({ ...prev, permission }));

        if (permission !== 'granted') {
          console.warn('Notification permission denied');
          return null;
        }

        // Get VAPID public key from server
        const response = await fetch('/api/push/vapid-public-key');
        const { publicKey } = await response.json();

        // Convert base64 to Uint8Array
        function urlBase64ToUint8Array(base64String: string): Uint8Array {
          const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
          const base64 = (base64String + padding)
            .replace(/-/g, '+')
            .replace(/_/g, '/');
          const rawData = window.atob(base64);
          const outputArray = new Uint8Array(rawData.length);
          for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
          }
          return outputArray;
        }

        // Subscribe to push
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });

        // Save subscription to backend
        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subscription,
            user_id: userId,
            guest_id: guestId,
          }),
        });

        setState((prev) => ({
          ...prev,
          isSubscribed: true,
          subscription,
        }));

        if (options.onSubscriptionChange) {
          options.onSubscriptionChange(subscription);
        }

        return subscription;
      } catch (error) {
        console.error('Failed to subscribe to push:', error);
        return null;
      }
    },
    [state.isSupported, options]
  );

  const unsubscribe = useCallback(async () => {
    if (!state.subscription) {
      return;
    }

    try {
      await state.subscription.unsubscribe();

      // Notify backend
      const subscriberId = state.subscription.endpoint;
      await fetch(
        `/api/push/unsubscribe?subscriber_id=${encodeURIComponent(subscriberId)}`,
        {
          method: 'DELETE',
        }
      );

      setState((prev) => ({
        ...prev,
        isSubscribed: false,
        subscription: null,
      }));

      if (options.onSubscriptionChange) {
        options.onSubscriptionChange(null);
      }
    } catch (error) {
      console.error('Failed to unsubscribe:', error);
    }
  }, [state.subscription, options]);

  return {
    ...state,
    subscribe,
    unsubscribe,
  };
}
```

## Background Sync for Saved Configurations

### Offline Configuration Storage

Implement IndexedDB storage for offline configuration saving with Background Sync integration:

```typescript
// src/utils/offlineConfiguration.ts
import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface StoneConfiguration {
  id: string;
  name: string;
  slabs: SlabConfiguration[];
  materials: MaterialSelection[];
  dimensions: Dimensions;
  edgeStyle: string;
  finish: string;
  createdAt: number;
  updatedAt: number;
  synced: boolean;
  pendingSync: boolean;
}

interface SlabConfiguration {
  slabId: string;
  width: number;
  height: number;
  thickness: number;
  cutouts: Cutout[];
}

interface Cutout {
  type: 'sink' | 'cooktop' | 'outlet' | 'custom';
  x: number;
  y: number;
  width: number;
  height: number;
}

interface MaterialSelection {
  materialId: string;
  pattern: string;
  finish: string;
  sqft: number;
}

interface Dimensions {
  totalWidth: number;
  totalHeight: number;
  layout: 'single' | 'double' | 'L-shape' | 'U-shape';
}

interface ConfiguratorDB extends DBSchema {
  configurations: {
    key: string;
    value: StoneConfiguration;
    indexes: { 'by-synced': boolean };
  };
  materials: {
    key: string;
    value: {
      id: string;
      name: string;
      images: string[];
      pricePerSqft: number;
      cachedAt: number;
    };
  };
}

let db: IDBPDatabase<ConfiguratorDB> | null = null;

export async function initOfflineDatabase(): Promise<
  IDBPDatabase<ConfiguratorDB>
> {
  if (db) return db;

  db = await openDB<ConfiguratorDB>('stone-configurator', 1, {
    upgrade(database) {
      // Configurations store
      const configStore = database.createObjectStore('configurations', {
        keyPath: 'id',
      });
      configStore.createIndex('by-synced', 'synced');

      // Materials cache for offline material browsing
      database.createObjectStore('materials', { keyPath: 'id' });
    },
  });

  return db;
}

export async function saveConfigurationLocally(
  config: StoneConfiguration
): Promise<void> {
  const database = await initOfflineDatabase();

  const configToSave = {
    ...config,
    updatedAt: Date.now(),
    synced: false,
    pendingSync: true,
  };

  await database.put('configurations', configToSave);

  // Register for background sync if available
  if (
    'serviceWorker' in navigator &&
    'sync' in window.ServiceWorkerRegistration.prototype
  ) {
    const registration = await navigator.serviceWorker.ready;
    await registration.sync.register('sync-configuration');
  } else {
    // Fallback: try immediate sync
    await syncConfigurations();
  }
}

export async function getLocalConfigurations(): Promise<StoneConfiguration[]> {
  const database = await initOfflineDatabase();
  const all = await database.getAll('configurations');
  return all.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getConfigurationById(
  id: string
): Promise<StoneConfiguration | undefined> {
  const database = await initOfflineDatabase();
  return database.get('configurations', id);
}

export async function deleteLocalConfiguration(id: string): Promise<void> {
  const database = await initOfflineDatabase();
  await database.delete('configurations', id);
}

// Trigger manual sync
export async function syncConfigurations(): Promise<{
  success: boolean;
  synced: number;
  failed: number;
}> {
  const database = await initOfflineDatabase();
  const pending = await database.getAllFromIndex(
    'configurations',
    'by-synced',
    false
  );

  let synced = 0;
  let failed = 0;

  for (const config of pending) {
    try {
      const response = await fetch('/api/data/configurations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Include auth token if available
          ...(config.authToken && {
            Authorization: `Bearer ${config.authToken}`,
          }),
        },
        body: JSON.stringify(config),
      });

      if (response.ok) {
        await database.put('configurations', {
          ...config,
          synced: true,
          pendingSync: false,
        });
        synced++;
      } else {
        failed++;
      }
    } catch (error) {
      console.error('Sync failed for config:', config.id, error);
      failed++;
    }
  }

  return { success: failed === 0, synced, failed };
}

// Cache materials for offline browsing
export async function cacheMaterials(materials: any[]): Promise<void> {
  const database = await initOfflineDatabase();
  const tx = database.transaction('materials', 'readwrite');

  for (const material of materials) {
    await tx.store.put({
      ...material,
      cachedAt: Date.now(),
    });
  }

  await tx.done;
}

export async function getCachedMaterials(): Promise<any[]> {
  const database = await initOfflineDatabase();
  return database.getAll('materials');
}
```

## Offline Detection and UI

### Network Status Hook

Create a hook to detect online/offline status:

```typescript
// src/hooks/useOnlineStatus.ts
import { useState, useEffect, useCallback } from 'react';

type OnlineStatus = 'online' | 'offline' | 'slow';

interface UseOnlineStatusReturn {
  isOnline: boolean;
  status: OnlineStatus;
  wasOffline: boolean;
  checkConnection: () => Promise<void>;
}

export function useOnlineStatus(): UseOnlineStatusReturn {
  const [isOnline, setIsOnline] = useState(true);
  const [status, setStatus] = useState<OnlineStatus>('online');
  const [wasOffline, setWasOffline] = useState(false);

  const updateStatus = useCallback(async () => {
    const online = navigator.onLine;
    setIsOnline(online);

    if (online) {
      // Check connection speed
      const connection = (navigator as any).connection;
      if (connection) {
        const effectiveType = connection.effectiveType;
        if (effectiveType === 'slow-2g' || effectiveType === '2g') {
          setStatus('slow');
        } else {
          setStatus('online');
        }
      } else {
        setStatus('online');
      }

      if (!online) {
        setWasOffline(true);
      }
    } else {
      setStatus('offline');
      setWasOffline(true);
    }
  }, []);

  useEffect(() => {
    // Initial check
    updateStatus();

    // Listen for online/offline events
    const handleOnline = () => {
      setIsOnline(true);
      setStatus('online');
    };

    const handleOffline = () => {
      setIsOnline(false);
      setStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check connection type changes if available
    const connection = (navigator as any).connection;
    if (connection) {
      const handleChange = () => updateStatus();
      connection.addEventListener('change', handleChange);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        connection.removeEventListener('change', handleChange);
      };
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [updateStatus]);

  const checkConnection = useCallback(async () => {
    try {
      // Try to fetch a small resource
      const response = await fetch('/api/data/health', {
        method: 'HEAD',
        cache: 'no-store',
      });
      if (response.ok) {
        setIsOnline(true);
        setStatus('online');
      }
    } catch {
      setIsOnline(false);
      setStatus('offline');
    }
  }, []);

  return {
    isOnline,
    status,
    wasOffline,
    checkConnection,
  };
}
```

### Offline Banner Component

Create an informative offline status banner:

```tsx
// src/components/OfflineBanner.tsx
'use client';

import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { WifiOff, AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function OfflineBanner() {
  const { isOnline, status, wasOffline, checkConnection } = useOnlineStatus();

  if (isOnline && !wasOffline) {
    return null;
  }

  const isSlow = status === 'slow';

  return (
    <div
      className={`
        fixed bottom-4 left-4 right-4 z-50
        md:left-auto md:right-4 md:max-w-md
        rounded-lg shadow-lg overflow-hidden
        ${isSlow
          ? 'bg-amber-50 border border-amber-200 text-amber-900'
          : 'bg-slate-900 text-white'
        }
      `}
    >
      <div className="p-4 flex items-start gap-3">
        {isSlow ? (
          <AlertTriangle className="w-5 h-5 mt-0.5 text-amber-600 flex-shrink-0" />
        ) : (
          <WifiOff className="w-5 h-5 mt-0.5 flex-shrink-0" />
        )}

        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">
            {isSlow ? 'Slow Connection' : 'You are offline'}
          </p>
          <p className="text-sm opacity-90 mt-1">
            {isSlow
              ? 'Some features may be slower than usual. Your work is saved locally.'
              : 'Changes will sync when you reconnect. You can continue working.'
            />}
          </p>
        </div>

        {!isOnline && (
          <Button
            variant="ghost"
            size="sm"
            onClick={checkConnection}
            className={isSlow ? 'text-amber-700 hover:bg-amber-100' : 'text-white hover:bg-white/10'}
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
```

### Offline-Aware Configuration Editor

Wrap the configurator with offline awareness:

```tsx
// src/components/ConfigurationEditor/ConfigurationEditor.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import {
  saveConfigurationLocally,
  syncConfigurations,
} from '@/utils/offlineConfiguration';
import { Button } from '@/components/ui/button';
import { Save, Cloud, CloudOff, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ConfigurationEditorProps {
  initialConfig?: any;
  authToken?: string;
}

export function ConfigurationEditor({
  initialConfig,
  authToken,
}: ConfigurationEditorProps) {
  const { isOnline, status } = useOnlineStatus();
  const { toast } = useToast();
  const [config, setConfig] = useState(initialConfig);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [pendingChanges, setPendingChanges] = useState(false);

  // Auto-save to local storage when offline
  const handleConfigChange = useCallback(
    (newConfig: any) => {
      setConfig(newConfig);
      setPendingChanges(true);

      // Debounced local save
      const timeoutId = setTimeout(async () => {
        await saveConfigurationLocally({
          ...newConfig,
          authToken,
        });
        setPendingChanges(false);
      }, 1000);
    },
    [authToken]
  );

  // Sync when coming back online
  useEffect(() => {
    if (isOnline && wasOffline && pendingChanges) {
      syncConfigurations().then((result) => {
        if (result.synced > 0) {
          toast({
            title: 'Changes synced',
            description: `${result.synced} configuration(s) saved to the cloud.`,
          });
        }
      });
    }
  }, [isOnline, toast]);

  const handleSave = async () => {
    setIsSaving(true);

    try {
      if (isOnline) {
        // Save to server
        const response = await fetch('/api/data/configurations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(authToken && { Authorization: `Bearer ${authToken}` }),
          },
          body: JSON.stringify(config),
        });

        if (!response.ok) {
          throw new Error('Failed to save to server');
        }

        // Also save locally as backup
        await saveConfigurationLocally({ ...config, authToken });
      } else {
        // Save locally only
        await saveConfigurationLocally({ ...config, authToken });

        toast({
          title: 'Saved locally',
          description: 'Your configuration will sync when you reconnect.',
        });
      }

      setLastSaved(new Date());
      setPendingChanges(false);
    } catch (error) {
      // Fallback to local save
      await saveConfigurationLocally({ ...config, authToken });

      toast({
        title: 'Saved offline',
        description: 'Saved locally. Will sync when connection is available.',
        variant: 'default',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="relative">
      {/* Save status indicator */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
        {isOnline ? (
          <Cloud className="w-4 h-4 text-green-500" />
        ) : (
          <CloudOff className="w-4 h-4 text-amber-500" />
        )}

        {lastSaved && (
          <span className="text-xs text-muted-foreground">
            Saved {lastSaved.toLocaleTimeString()}
          </span>
        )}

        {pendingChanges && (
          <span className="text-xs text-amber-500">Unsaved changes</span>
        )}
      </div>

      {/* Editor content */}
      <div className="editor-content">{/* Configuration UI */}</div>

      {/* Save button */}
      <div className="fixed bottom-6 right-6">
        <Button onClick={handleSave} disabled={isSaving || !pendingChanges}>
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Configuration
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
```

## Install Prompt Implementation

### Custom Install Prompt Component

Create a component that detects installability and prompts the user:

```tsx
// src/components/InstallPrompt.tsx
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Install, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Listen for beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    // Listen for appinstalled
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setIsInstallable(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Check if previously dismissed (stored in localStorage)
    const wasDismissed = localStorage.getItem('pwa-install-dismissed');
    if (wasDismissed) {
      const dismissedTime = parseInt(wasDismissed, 10);
      const oneWeek = 7 * 24 * 60 * 60 * 1000;
      if (Date.now() - dismissedTime < oneWeek) {
        setDismissed(true);
      }
    }

    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt
      );
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    // Show the prompt
    await deferredPrompt.prompt();

    // Wait for user choice
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setIsInstalled(true);
    }

    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  // Don't show if installed, not installable, or dismissed
  if (isInstalled || !isInstallable || dismissed) {
    return null;
  }

  return (
    <Card className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-50 shadow-lg">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Install App</CardTitle>
          <Button variant="ghost" size="icon" onClick={handleDismiss}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Add Stone Configurator to your home screen for quick access and
          offline use.
        </p>
        <Button onClick={handleInstall} className="w-full">
          <Install className="w-4 h-4 mr-2" />
          Install
        </Button>
      </CardContent>
    </Card>
  );
}
```

### Display Mode Detection

Create a hook to detect how the app was launched:

```typescript
// src/hooks/useDisplayMode.ts
type DisplayMode =
  | 'browser'
  | 'standalone'
  | 'minimal-ui'
  | 'fullscreen'
  | 'window-controls-overlay'
  | 'unknown';

export function useDisplayMode(): DisplayMode {
  const [displayMode, setDisplayMode] = useState<DisplayMode>('unknown');

  useEffect(() => {
    const checkDisplayMode = () => {
      if (window.matchMedia('(display-mode: standalone)').matches) {
        return 'standalone';
      }
      if (window.matchMedia('(display-mode: minimal-ui)').matches) {
        return 'minimal-ui';
      }
      if (window.matchMedia('(display-mode: fullscreen)').matches) {
        return 'fullscreen';
      }
      if (
        window.matchMedia('(display-mode: window-controls-overlay)').matches
      ) {
        return 'window-controls-overlay';
      }
      if (navigator.standalone === true) {
        return 'standalone';
      }
      return 'browser';
    };

    setDisplayMode(checkDisplayMode());

    // Listen for changes
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleChange = () => setDisplayMode(checkDisplayMode());

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return displayMode;
}

export function useIsInstalled(): boolean {
  const displayMode = useDisplayMode();
  return displayMode !== 'browser' && displayMode !== 'unknown';
}
```

## Cache Strategies Implementation

### Detailed Caching Configuration

The following table outlines the recommended caching strategies for different resource types in the stone slab configurator:

| Resource Type   | Strategy               | Cache Name | Max Entries | Max Age   | Rationale                                                  |
| --------------- | ---------------------- | ---------- | ----------- | --------- | ---------------------------------------------------------- |
| JS/CSS Bundles  | Cache First            | static-v1  | 50          | 30 days   | Bundle hashes change on deploy, safe to cache aggressively |
| Images/Textures | Cache First            | images-v1  | 100         | 60 days   | Stone textures are large, rarely change                    |
| API Responses   | Stale While Revalidate | api-v1     | 50          | 5 minutes | Fresh data important but instant load critical             |
| Navigation      | Network First          | static-v1  | 20          | N/A       | Prefer fresh HTML, fallback to cache                       |
| Fonts           | Cache First            | static-v1  | 10          | 90 days   | Fonts rarely change, large files                           |
| User Data       | Network First          | N/A        | N/A         | N/A       | Always prefer server data                                  |

### Workbox Route Configuration

Advanced Workbox configuration for the Next.js application:

```typescript
// public/workbox-config.ts
import { registerRoute } from 'workbox-routing';
import {
  StaleWhileRevalidate,
  CacheFirst,
  NetworkFirst,
  NetworkOnly,
} from 'workbox-strategies';
import { ExpirationPlugin, CacheableResponsePlugin } from 'workbox-expiration';
import { RangeRequestsPlugin } from 'workbox-range-requests';

// Cache name constants
export const CACHE_NAMES = {
  precache: 'precache-v1',
  static: 'static-v1',
  dynamic: 'dynamic-v1',
  images: 'images-v1',
  api: 'api-v1',
  fonts: 'fonts-v1',
} as const;

// ============================================
// GOOGLE FONTS: Cache First with Font-Specific Handling
// ============================================
registerRoute(
  ({ url }) =>
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com',
  new CacheFirst({
    cacheName: CACHE_NAMES.fonts,
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 10,
        maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
      }),
      new RangeRequestsPlugin(),
    ],
  })
);

// ============================================
// CDN IMAGES: Cache First for Stone Material Images
// ============================================
registerRoute(
  ({ url, request }) => {
    return (
      request.destination === 'image' &&
      (url.hostname.includes('cdn.stonestudio.com') ||
        url.hostname.includes('supabase.co') ||
        url.hostname.includes('placehold.co'))
    );
  },
  new CacheFirst({
    cacheName: CACHE_NAMES.images,
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 200,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
      }),
    ],
  })
);

// ============================================
// API CALLS: Conditional Strategy Based on Type
// ============================================

// Read-heavy APIs (materials list, pricing): StaleWhileRevalidate
registerRoute(
  ({ url }) =>
    url.pathname.startsWith('/api/data/materials') ||
    url.pathname.startsWith('/api/pricing'),
  new StaleWhileRevalidate({
    cacheName: CACHE_NAMES.api,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 30,
        maxAgeSeconds: 10 * 60, // 10 minutes
      }),
    ],
  })
);

// Write operations: Network Only (don't cache POST/PUT/DELETE)
registerRoute(({ request }) => request.method !== 'GET', new NetworkOnly());

// ============================================
// OFFLINE FALLBACK: Handle Failed Requests
// ============================================
import { setCacheHeaderValues } from 'workbox-core';

// Custom handler for offline fallback
async function offlineFallback({
  request,
}: {
  request: Request;
}): Promise<Response> {
  if (request.mode === 'navigate') {
    return caches.match('/offline.html');
  }
  return new Response('Offline', { status: 503 });
}
```

## Lighthouse PWA Score Optimization

### Audit Checklist

To achieve a Lighthouse PWA score of 95+, implement the following optimizations:

**Installable (30 points)**
Ensure the manifest meets all requirements: icon sizes from 72x72 to 512x512 are present in PNG format with maskable purpose defined. The start_url must be accessible and load correctly. The manifest must include name, short_name, icons, and display mode. Service worker must have a fetch event handler. The site must be served over HTTPS (handled by deployment platform).

**PWA Optimized (30 points)**
Configure meta theme_color to match the application theme. Set apple-touch-icon for iOS. Include appropriate viewport meta tag. Ensure touch-friendly tap targets with minimum 48x48 CSS pixels. Define a splash screen for iOS. Use the web app link tag for iOS with app arguments.

**Performance (20 points)**
Optimize First Contentful Paint under 2 seconds. Minimize Main Thread Work under 4 seconds. Ensure Speed Index under 4 seconds. Use efficient caching strategies as outlined above. Preload critical resources.

**Best Practices (20 points)**
No console errors on load. All images have explicit width and height. No use of deprecated APIs. Use HTTPS for all resources.

### Lighthouse Configuration for CI

```javascript
// lighthouse.config.js
module.exports = {
  extends: 'lighthouse:default',
  settings: {
    onlyCategories: ['pwa', 'performance', 'best-practices'],
    emulatedFormFactor: 'mobile',
    throttlingMethod: 'simulate',
    throttling: {
      rttMs: 40,
      throughputKbps: 10240,
      cpuSlowdownMultiplier: 1,
      requestLatencyMs: 0,
      downloadThroughputKbps: 0,
      uploadThroughputKbps: 0,
    },
    auditMode: 'all',
    clearCaches: true,
    // PWA specific
    pwa: {
      passBoolean: true,
    },
  },
  audits: [
    'is-on-https',
    'service-worker',
    'works-offline',
    'installable-manifest',
    'apple-touch-icon',
    'splash-screen',
    'themed-omnibox',
    'content-width',
    'viewport',
    'without-javascript',
  ],
  passes: [
    {
      passName: 'defaultPass',
      recordTrace: true,
      useThrottling: true,
      networkQuietThresholdMs: 5000,
    },
  ],
};
```

## API Endpoints Summary

The following table provides a summary of the API endpoints required for the PWA implementation:

| Endpoint                     | Method | Description                      | Auth Required |
| ---------------------------- | ------ | -------------------------------- | ------------- |
| /api/push/vapid-public-key   | GET    | Get VAPID key for subscription   | No            |
| /api/push/subscribe          | POST   | Save push subscription           | Optional      |
| /api/push/unsubscribe        | DELETE | Remove subscription              | Optional      |
| /api/push/send               | POST   | Send notification to subscribers | Internal      |
| /api/data/configurations     | GET    | Fetch saved configurations       | Required      |
| /api/data/configurations     | POST   | Save new configuration           | Required      |
| /api/data/configurations/:id | PUT    | Update configuration             | Required      |
| /api/data/configurations/:id | DELETE | Delete configuration             | Required      |
| /api/data/materials          | GET    | Fetch available materials        | Optional      |
| /api/data/health             | HEAD   | Connection health check          | No            |

## Implementation Phases

### Phase 1: Core PWA Setup (Week 1)

The first phase focuses on foundational PWA capabilities including the web app manifest with all required icons and metadata, basic service worker with precaching and static asset caching, offline detection UI with banner components, and install prompt detection and basic prompting.

### Phase 2: Offline Functionality (Week 2)

The second phase adds sophisticated offline capabilities including IndexedDB storage for configurations with the offlineConfiguration utility, Background Sync API registration for automatic retry, stale-while-revalidate caching for API responses, and offline-first configuration editing workflow.

### Phase 3: Push Notifications (Week 3)

The third phase implements push notification infrastructure including VAPID key generation and storage on the backend, FastAPI push subscription endpoints, client-side subscription management hook, and service worker push event handling.

### Phase 4: Optimization (Week 4)

The final phase focuses on polish and performance including advanced caching strategies for all resource types, Lighthouse PWA score optimization, display mode-specific UI adjustments, and testing across devices and browsers.

## Confidence Assessment

| Area               | Confidence | Notes                                                                            |
| ------------------ | ---------- | -------------------------------------------------------------------------------- |
| Service Worker     | HIGH       | Workbox provides well-documented, stable APIs for Next.js                        |
| Push Notifications | HIGH       | Web Push Protocol is standardized, web-push library is mature                    |
| Background Sync    | MEDIUM     | Limited browser support (Chrome/Edge only), fallback required for Safari/Firefox |
| Offline Storage    | HIGH       | IndexedDB with idb library is widely supported                                   |
| Install Prompts    | HIGH       | beforeinstallprompt API well-supported in Chromium browsers                      |

## Gaps to Address

- Safari push notification support requires APNs configuration and additional research
- Background Sync fallback implementation for browsers without support
- Testing matrix across iOS Safari, Android Chrome, Desktop Chrome/Edge/Firefox
- Service worker update flow for users with open tabs
- Push notification permission rate optimization to avoid user opt-out

## Sources

- [Web.dev Progressive Web Apps Documentation](https://web.dev/explore/progressive-web-apps) - HIGH confidence
- [Google Chrome PWA Developer Documentation](https://developer.chrome.com/docs/web/progressive-web-apps) - HIGH confidence
- [Workbox Documentation](https://developer.chrome.com/docs/workbox) - HIGH confidence
- [Web Push Protocol (IETF)](https://datatracker.ietf.org/doc/html/draft-ietf-webpush-protocol) - HIGH confidence
- [MDN Web Docs: Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API) - HIGH confidence

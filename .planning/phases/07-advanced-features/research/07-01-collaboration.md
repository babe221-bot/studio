# Real-Time Collaboration for Stone Slab 3D Configurator

**Domain:** Real-time collaboration infrastructure  
**Researched:** 2026-03-10  
**Overall Confidence:** HIGH

## Executive Summary

Real-time collaboration for a Next.js + FastAPI 3D configurator can be efficiently implemented using **Supabase Realtime** as the primary synchronization layer, leveraging its existing infrastructure (already integrated with Supabase Auth). For conflict resolution, a lightweight **operational transformation approach** or **CRDT** (Conflict-free Replicated Data Type) will handle concurrent edits to configuration state. The recommended architecture uses **Supabase Realtime Broadcast** for low-latency state updates, **Presence** for user awareness, and **Postgres Changes** for persistent configuration storage.

Given that Supabase is already in the tech stack, this approach minimizes infrastructure overhead while providing enterprise-grade WebSocket capabilities with automatic scaling, reconnection handling, and RLS-based authorization. For 3D scene synchronization specifically, delta updates with throttling will prevent network saturation while maintaining visual coherence.

---

## 1. WebSocket Options for Next.js

### 1.1 Option Comparison Matrix

| Criterion               | Supabase Realtime | Socket.io          | Native WebSocket | Pusher   | Ably     |
| ----------------------- | ----------------- | ------------------ | ---------------- | -------- | -------- |
| **Integration Effort**  | Low (existing)    | Medium             | High             | Low      | Low      |
| **Server-Side Scaling** | Managed           | Manual             | Manual           | Managed  | Managed  |
| **Authentication**      | Supabase Auth     | Custom             | Custom           | Custom   | Custom   |
| **Presence**            | Built-in          | Plugin             | Custom           | Built-in | Built-in |
| **Message Persistence** | 3 days            | No                 | No               | Optional | Optional |
| **Latency**             | ~50ms global      | ~20ms local        | ~20ms local      | ~50ms    | ~50ms    |
| **Cost**                | Free tier + Pro   | Free (self-hosted) | Free             | $25/mo+  | $25/mo+  |
| **3D Scene Sync**       | Good              | Excellent          | Excellent        | Good     | Good     |

### 1.2 Recommendation: Supabase Realtime

**Why Supabase Realtime:**

- Already integrated with Supabase Auth (existing guest sessions)
- Broadcast channel for real-time state sync
- Presence for online user indicators
- Postgres Changes for persistent state
- RLS policies apply to real-time subscriptions
- Global edge network for low latency

**When to Consider Alternatives:**

- If Supabase Realtime message limits are insufficient (free tier: 2M messages/month)
- If sub-20ms latency is critical for 3D cursor sync
- If custom WebSocket server logic is needed beyond Supabase capabilities

---

## 2. FastAPI WebSocket Integration Patterns

### 2.1 Native FastAPI WebSocket (Reference Implementation)

FastAPI provides native WebSocket support through Starlette. Basic pattern:

```python
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from typing import List

app = FastAPI()

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            await connection.send_json(message)

manager = ConnectionManager()

@app.websocket("/ws/config/{config_id}")
async def websocket_endpoint(websocket: WebSocket, config_id: str):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_json()
            # Process configuration update
            await manager.broadcast({"type": "update", "data": data})
    except WebSocketDisconnect:
        manager.disconnect(websocket)
```

### 2.2 Recommended Architecture: Hybrid Supabase + FastAPI

Rather than managing WebSockets directly in FastAPI, use Supabase as the WebSocket infrastructure:

1. **Frontend** connects to Supabase Realtime channels
2. **FastAPI** publishes updates via Supabase REST API or database triggers
3. **Postgres** stores persistent state with RLS protection

This reduces FastAPI complexity while leveraging Supabase's managed WebSocket infrastructure.

---

## 3. Real-Time State Synchronization Strategies

### 3.1 State Model for Stone Slab Configurator

Based on existing `useLabStore.ts`:

```typescript
interface ConfigurationState {
  // Identifiers
  configId: string;
  ownerId: string | null;

  // Dimensions
  length: number;
  width: number;
  height: number;

  // Selection
  selectedElement: string;
  selectedMaterialId: string | null;
  selectedFinishId: string | null;
  selectedProfileId: string | null;

  // Processing
  processedEdges: Record<string, boolean>;
  okapnikEdges: Record<string, boolean>;
  bunjaEdgeStyle: 'oštre' | 'lomljene';

  // Grain
  grainOffset: { x: number; y: number };
  grainRotation: number;
  mirrorGrain: boolean;

  // Display
  showBookmatchPreview: boolean;
  quantity: number;
}
```

### 3.2 Synchronization Patterns

**Pattern 1: Full State Broadcast (Simpler)**

- Send entire configuration on every change
- Pros: Easy to implement, no state reconciliation needed
- Cons: Higher bandwidth, potential for overwrites
- Best for: Small configurations, infrequent updates

**Pattern 2: Delta Updates (Recommended)**

- Send only changed fields with timestamps
- Client applies deltas in arrival order
- Pros: Efficient bandwidth, fine-grained control
- Cons: Requires ordering logic

```typescript
interface DeltaUpdate {
  configId: string;
  timestamp: number;
  clientId: string;
  changes: Partial<ConfigurationState>;
}

// Client applies delta
function applyDelta(
  current: ConfigurationState,
  delta: DeltaUpdate
): ConfigurationState {
  return {
    ...current,
    ...delta.changes,
    // Keep latest timestamp for conflict resolution
    _lastModified: delta.timestamp,
  };
}
```

**Pattern 3: CRDT-Based (Most Robust)**

- Use Yjs or Automerge for automatic conflict resolution
- Pros: Offline support, automatic merge
- Cons: Higher complexity, larger payloads
- Best for: True collaborative editing

### 3.3 Implementation with Supabase Broadcast

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Channel per configuration
function subscribeToConfig(
  configId: string,
  onUpdate: (delta: DeltaUpdate) => void
) {
  const channel = supabase.channel(`config:${configId}`, {
    config: {
      broadcast: { self: false, ack: true },
    },
  });

  channel
    .on('broadcast', { event: 'config_delta' }, ({ payload }) => {
      onUpdate(payload as DeltaUpdate);
    })
    .subscribe();

  return channel;
}

// Send delta update
async function sendDelta(
  configId: string,
  changes: Partial<ConfigurationState>
) {
  const channel = supabase.channel(`config:${configId}`);

  await channel.send({
    type: 'broadcast',
    event: 'config_delta',
    payload: {
      configId,
      timestamp: Date.now(),
      clientId: getClientId(), // Unique client identifier
      changes,
    },
  });
}
```

---

## 4. Conflict Resolution for Concurrent Edits

### 4.1 Conflict Types in 3D Configuration

| Conflict Type       | Example                                         | Resolution Strategy               |
| ------------------- | ----------------------------------------------- | --------------------------------- |
| **Last-Write-Wins** | Two users change material                       | Timestamp-based, newest wins      |
| **Independent**     | User A changes length, User B changes width     | Auto-merge, no conflict           |
| **Dependent**       | User A increases length, User B decreases width | Last-write-wins on affected field |
| **Constraint**      | User A sets invalid dimensions                  | Reject with error message         |

### 4.2 Recommended Strategy: Timestamp-Based LWW with Field-Level Locking

For a configurator with mostly independent field changes, timestamp-based Last-Write-Wins with optimistic updates works well:

```typescript
interface ConflictResolver {
  resolve(local: DeltaUpdate, remote: DeltaUpdate): DeltaUpdate;
}

function resolveConflict(local: DeltaUpdate, remote: DeltaUpdate): DeltaUpdate {
  // If timestamps differ by < 100ms, use clientId for deterministic ordering
  if (Math.abs(local.timestamp - remote.timestamp) < 100) {
    return local.clientId < remote.clientId ? local : remote;
  }

  // Otherwise, latest timestamp wins
  return local.timestamp > remote.timestamp ? local : remote;
}
```

### 4.3 Field-Level Locking for Critical Operations

For operations that require atomicity (e.g., CAD export, checkout):

```typescript
interface LockManager {
  acquireLock(
    configId: string,
    field: string,
    clientId: string
  ): Promise<boolean>;
  releaseLock(configId: string, field: string, clientId: string): Promise<void>;
}

// Implementation via Supabase
async function acquireLock(
  configId: string,
  field: string,
  clientId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('config_locks')
    .upsert(
      {
        config_id: configId,
        field,
        client_id: clientId,
        acquired_at: new Date().toISOString(),
      },
      { onConflict: 'config_id,field' }
    )
    .select()
    .single();

  return !error && data.client_id === clientId;
}
```

### 4.4 CRDT Alternative (Yjs)

If true offline support and complex merge scenarios are needed:

```typescript
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

class CollaborativeConfig {
  private ydoc: Y.Doc;
  private ymap: Y.Map<any>;

  constructor(configId: string) {
    this.ydoc = new Y.Doc();
    this.ymap = this.ydoc.getMap(`config:${configId}`);
  }

  // Set value with automatic CRDT merge
  set(key: string, value: any) {
    this.ymap.set(key, { value, timestamp: Date.now() });
  }

  // Observe changes from other clients
  onUpdate(callback: (event: Y.YMapEvent<any>) => void) {
    this.ymap.observe(callback);
  }
}
```

---

## 5. Presence Indicators (Who's Online)

### 5.1 Supabase Presence Implementation

```typescript
interface UserPresence {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  cursorPosition?: { x: number; y: number };
  selectedField?: string;
  lastActive: number;
}

function usePresence(configId: string) {
  const [onlineUsers, setOnlineUsers] = useState<UserPresence[]>([]);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  useEffect(() => {
    const newChannel = supabase.channel(`presence:${configId}`, {
      config: {
        presence: { key: getClientId() },
      },
    });

    // Listen for sync (full state)
    newChannel.on('presence', { event: 'sync' }, () => {
      const state = newChannel.presenceState();
      const users: UserPresence[] = Object.values(
        state
      ).flat() as UserPresence[];
      setOnlineUsers(users);
    });

    // Listen for joins
    newChannel.on('presence', { event: 'join' }, ({ key, newPresences }) => {
      console.log('User joined:', key, newPresences);
    });

    // Listen for leaves
    newChannel.on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
      console.log('User left:', key, leftPresences);
    });

    newChannel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await newChannel.track({
          userId: getUserId(),
          displayName: getUserName(),
          avatarUrl: getAvatarUrl(),
          lastActive: Date.now(),
        } as UserPresence);
      }
    });

    setChannel(newChannel);

    return () => {
      newChannel.unsubscribe();
    };
  }, [configId]);

  // Update presence (cursor, selection)
  const updatePresence = async (updates: Partial<UserPresence>) => {
    if (channel) {
      await channel.track({
        ...getCurrentPresence(),
        ...updates,
        lastActive: Date.now(),
      });
    }
  };

  return { onlineUsers, updatePresence };
}
```

### 5.2 UI Display Components

```tsx
function PresenceAvatars({ users }: { users: UserPresence[] }) {
  return (
    <div className="flex -space-x-2">
      {users.map((user) => (
        <div key={user.userId} className="relative">
          <Avatar src={user.avatarUrl} alt={user.displayName} />
          <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
        </div>
      ))}
    </div>
  );
}

function ActiveSelectionIndicator({
  user,
  field,
}: {
  user: UserPresence;
  field: string;
}) {
  return (
    <div
      className="absolute bg-blue-500/20 border-2 border-blue-500 rounded pointer-events-none"
      style={
        {
          // Position based on selected field in 3D viewport
        }
      }
    >
      <span className="text-xs text-blue-500 bg-white px-1 rounded">
        {user.displayName} is editing {field}
      </span>
    </div>
  );
}
```

---

## 6. Performance Considerations for 3D Scene Syncing

### 6.1带宽 Optimization Strategies

| Strategy          | Description                               | Impact                     |
| ----------------- | ----------------------------------------- | -------------------------- |
| **Delta Updates** | Send only changed fields                  | 80-90% bandwidth reduction |
| **Throttling**    | Batch updates (100-300ms)                 | 50-70% message reduction   |
| **Compression**   | Gzip/payload compression                  | 30-50% size reduction      |
| **LOD Sync**      | Reduce sync frequency for distant objects | Variable                   |
| **Binary Format** | Use binary encoding (MessagePack)         | 20-40% size reduction      |

### 6.2 Throttling Implementation

```typescript
function createThrottledSender(
  sendFn: (delta: DeltaUpdate) => Promise<void>,
  throttleMs: number = 150
) {
  let pendingDelta: DeltaUpdate | null = null;
  let timeoutId: NodeJS.Timeout | null = null;

  return {
    send: (delta: DeltaUpdate) => {
      // Merge with pending delta
      pendingDelta = pendingDelta
        ? {
            ...pendingDelta,
            changes: { ...pendingDelta.changes, ...delta.changes },
          }
        : delta;

      // Clear existing timeout
      if (timeoutId) clearTimeout(timeoutId);

      // Schedule send
      timeoutId = setTimeout(async () => {
        if (pendingDelta) {
          await sendFn(pendingDelta);
          pendingDelta = null;
        }
      }, throttleMs);
    },

    flush: async () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (pendingDelta) {
        await sendFn(pendingDelta);
        pendingDelta = null;
      }
    },
  };
}
```

### 6.3 3D Viewport-Specific Optimizations

**Camera Sync (Low Priority):**

- Only sync on major view changes
- Use lower update frequency (1-2 fps)

**Object Selection Sync (Medium Priority):**

- Sync immediately but throttle
- Include selection timestamp for conflict resolution

**Transform Updates (High Priority):**

- For drag operations, use requestAnimationFrame throttling
- Consider predictive interpolation on receiving client

```typescript
// Example: Sync transform with interpolation
function onTransformUpdate(position: Vector3) {
  throttledSender.send({
    type: 'transform',
    position: { x: position.x, y: position.y, z: position.z },
    timestamp: Date.now(),
  });
}

// Receiving client interpolates for smooth display
function interpolateTransform(from: Vector3, to: Vector3, progress: number) {
  return {
    x: from.x + (to.x - from.x) * progress,
    y: from.y + (to.y - from.y) * progress,
    z: from.z + (to.z - from.z) * progress,
  };
}
```

### 6.4 Message Size Limits

Supabase Realtime message limits:

- Maximum message size: 1MB (recommended: < 10KB for optimal performance)
- For 3D configurations, keep payloads under 5KB by sending only essential delta data

---

## 7. Security Concerns

### 7.1 Authentication Integration

**Supabase Auth (Existing):**

- Guest sessions already supported via Supabase Auth
- Anonymous users get temporary UUID
- Authenticated users get persistent user ID

```typescript
function getClientId(): string {
  const {
    data: { user },
  } = supabase.auth.getUser();
  return user?.id || `guest:${localStorage.getItem('guestId')}`;
}
```

### 7.2 Authorization with RLS

**Channel Access Control:**

```sql
-- RLS policy for configuration channels
CREATE POLICY "Users can join their config channels"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  -- Allow access if user owns the config or is invited
  EXISTS (
    SELECT 1 FROM configs
    WHERE id = (payload->>'configId')::uuid
    AND (owner_id = auth.uid() OR is_invited(auth.uid()))
  )
);
```

**Field-Level Authorization:**

```typescript
// Server-side validation in FastAPI when receiving updates
async def validate_config_update(config_id: str, changes: dict, user_id: str):
    # Check ownership
    config = await get_config(config_id)

    if config.owner_id != user_id and not config.is_collaborator(user_id):
        raise PermissionError("Not authorized to edit this configuration")

    # Validate changes don't exceed permissions
    if changes.get('is_locked') and not config.is_owner(user_id):
        raise PermissionError("Only owner can lock configuration")
```

### 7.3 Rate Limiting

**Client-Side:**

```typescript
// Prevent message flooding
function createRateLimiter(maxMessages: number, windowMs: number) {
  const messages: number[] = [];

  return {
    canSend: () => {
      const now = Date.now();
      messages.push(now);
      // Clean old messages
      while (messages.length > 0 && messages[0] < now - windowMs) {
        messages.shift();
      }
      return messages.length <= maxMessages;
    },
  };
}
```

**Server-Side (FastAPI):**

```python
from fastapi import WebSocket
from slowapi import Limiter

limiter = Limiter(key_func=get_remote_address)

@app.websocket("/ws/config/{config_id}")
@limiter.limit("100/minute")
async def websocket_endpoint(websocket: WebSocket, config_id: str):
    # Rate limiting applied per IP/client
    await websocket.accept()
    # ... rest of handler
```

### 7.4 Input Validation

```typescript
// Validate incoming configuration deltas
function validateDelta(delta: Partial<ConfigurationState>): ValidationResult {
  const errors: string[] = [];

  if (delta.length !== undefined) {
    if (delta.length < 100 || delta.length > 5000) {
      errors.push('Length must be between 100-5000mm');
    }
  }

  if (delta.width !== undefined) {
    if (delta.width < 100 || delta.width > 3000) {
      errors.push('Width must be between 100-3000mm');
    }
  }

  // ... additional validations

  return { valid: errors.length === 0, errors };
}
```

---

## 8. Recommended Technology Stack

### 8.1 Package Versions

| Package                 | Version | Purpose                                          |
| ----------------------- | ------- | ------------------------------------------------ |
| `@supabase/supabase-js` | ^2.39.0 | Supabase client with Realtime                    |
| `@supabase/realtime-js` | ^2.15.0 | Core Realtime (included in supabase-js)          |
| `yjs`                   | ^13.6.0 | CRDT (optional, for complex conflict resolution) |
| `y-websocket`           | ^1.5.0  | Yjs WebSocket provider (optional)                |
| `zustand`               | ^4.5.0  | Existing state management                        |

### 8.2 Backend Dependencies

| Package             | Version | Purpose                            |
| ------------------- | ------- | ---------------------------------- |
| `websockets`        | ^12.0   | FastAPI WebSocket support          |
| `uvicorn[standard]` | ^0.27.0 | ASGI server with WebSocket support |
| `pydantic`          | ^2.5.0  | Data validation                    |

---

## 9. Architecture Diagram Description

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            CLIENT (Next.js)                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        React Three Fiber                             │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                   │   │
│  │  │   Slab 3D   │  │   Camera   │  │   Lights   │                   │   │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘                   │   │
│  └─────────┼────────────────┼───────────────┼───────────────────────────┘   │
│            │                │               │                               │
│  ┌─────────▼────────────────▼───────────────▼───────────────────────────┐   │
│  │                    Zustand Store                                     │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                   │   │
│  │  │ Config State│  │Presence State│ │  UI State   │                   │   │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘                   │   │
│  └─────────┼────────────────┼───────────────┼───────────────────────────┘   │
│            │                │               │                               │
│  ┌─────────▼────────────────▼───────────────▼───────────────────────────┐   │
│  │               Collaboration Layer                                    │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐       │   │
│  │  │ Broadcast Delta │  │   Presence     │  │  Conflict      │       │   │
│  │  │    Handler      │  │   Manager      │  │  Resolver      │       │   │
│  │  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘       │   │
│  └───────────┼────────────────────┼───────────────────┼─────────────────┘   │
│              │                    │                   │                       │
└──────────────┼────────────────────┼───────────────────┼───────────────────────┘
               │                    │                   │
    ┌──────────▼──────────┐ ┌──────▼────────┐  ┌────────▼────────┐
    │   Supabase          │ │   Supabase   │  │   Postgres DB   │
    │   Realtime          │ │   Auth        │  │   (Configs)     │
    │   (WebSocket)       │ │               │  │                 │
    └─────────────────────┘ └───────────────┘  └─────────────────┘
               │
    ┌──────────▼──────────┐
    │   FastAPI Backend   │
    │  ┌─────────────┐   │
    │  │ CAD Service │   │
    │  │ (Blender)   │   │
    │  └─────────────┘   │
    └────────────────────┘
```

---

## 10. API Endpoint Design

### 10.1 WebSocket Channels

| Channel                | Event             | Direction     | Payload        |
| ---------------------- | ----------------- | ------------- | -------------- |
| `config:{id}:delta`    | `config_delta`    | Bidirectional | DeltaUpdate    |
| `config:{id}:presence` | `sync/join/leave` | Bidirectional | UserPresence   |
| `config:{id}:lock`     | `lock/unlock`     | Bidirectional | LockInfo       |
| `config:{id}:cursor`   | `cursor_move`     | Bidirectional | CursorPosition |

### 10.2 REST Endpoints

| Method | Endpoint                   | Purpose                  |
| ------ | -------------------------- | ------------------------ |
| POST   | `/api/configs`             | Create new configuration |
| GET    | `/api/configs/{id}`        | Get configuration        |
| PUT    | `/api/configs/{id}`        | Update configuration     |
| DELETE | `/api/configs/{id}`        | Delete configuration     |
| POST   | `/api/configs/{id}/invite` | Invite collaborator      |
| POST   | `/api/configs/{id}/export` | Trigger CAD export       |

### 10.3 Database Schema

```sql
-- Configurations table
CREATE TABLE configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id),
  state JSONB NOT NULL DEFAULT '{}',
  is_locked BOOLEAN DEFAULT FALSE,
  locked_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Collaborators
CREATE TABLE config_collaborators (
  config_id UUID REFERENCES configs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  permission TEXT CHECK (permission IN ('view', 'edit', 'admin')),
  PRIMARY KEY (config_id, user_id)
);

-- Config locks for atomic operations
CREATE TABLE config_locks (
  config_id UUID,
  field TEXT,
  client_id TEXT,
  acquired_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (config_id, field)
);

-- Enable RLS
ALTER TABLE configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE config_collaborators ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Owners can do everything" ON configs
  FOR ALL USING (auth.uid() = owner_id);

CREATE POLICY "Collaborators can view" ON configs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM config_collaborators WHERE config_id = configs.id AND user_id = auth.uid())
  );

CREATE POLICY "Collaborators can edit" ON configs
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM config_collaborators WHERE config_id = configs.id AND user_id = auth.uid() AND permission IN ('edit', 'admin'))
  );
```

---

## 11. Implementation Challenges and Solutions

### 11.1 Challenge: Stale State After Reconnection

**Problem:** After network interruption, client state may diverge from server state.

**Solution:**

```typescript
// On reconnection, request full state
channel.on('system', { event: 'reconnect' }, async () => {
  const { data } = await supabase
    .from('configs')
    .select('state')
    .eq('id', configId)
    .single();

  store.setState(data.state);
});
```

### 11.2 Challenge: Race Conditions in Last-Write-Wins

**Problem:** Two clients send updates simultaneously, both with recent timestamps.

**Solution:** Add client ID as tiebreaker:

```typescript
function resolveConflict(local: DeltaUpdate, remote: DeltaUpdate): DeltaUpdate {
  if (local.timestamp === remote.timestamp) {
    // Deterministic tiebreaker
    return local.clientId < remote.clientId ? local : remote;
  }
  return local.timestamp > remote.timestamp ? local : remote;
}
```

### 11.3 Challenge: 3D Scene Performance Under Load

**Problem:** High-frequency updates cause frame drops in 3D rendering.

**Solution:** Separate render loop from sync loop:

```typescript
// Use separate buffers for sync and render
const syncBuffer: DeltaUpdate[] = [];
let renderFrame = 0;

// Sync updates go to buffer
function onRemoteUpdate(delta: DeltaUpdate) {
  syncBuffer.push(delta);
}

// Render loop applies buffered updates at fixed rate
useFrame(() => {
  if (syncBuffer.length > 0) {
    // Apply all pending deltas
    const merged = mergeDeltas(syncBuffer);
    applyConfig(merged);
    syncBuffer.length = 0;
  }

  // Maintain 60fps render regardless of sync
  renderFrame++;
});
```

### 11.4 Challenge: Guest Session Identity

**Problem:** Guest users need consistent identity across page reloads but can't have permanent credentials.

**Solution:**

```typescript
function getGuestId(): string {
  const STORAGE_KEY = 'studio_guest_id';

  let guestId = localStorage.getItem(STORAGE_KEY);
  if (!guestId) {
    guestId = `guest_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(STORAGE_KEY, guestId);
  }
  return guestId;
}
```

---

## 12. Code Examples for Key Components

### 12.1 Zustand Store with Real-Time Sync

```typescript
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

interface CollaborativeStore extends ConfigurationState {
  // Connection state
  isConnected: boolean;
  onlineUsers: UserPresence[];

  // Actions
  setConnected: (connected: boolean) => void;
  applyRemoteDelta: (delta: DeltaUpdate) => void;
  updatePresence: (updates: Partial<UserPresence>) => void;
  setOnlineUsers: (users: UserPresence[]) => void;

  // Wrapped local actions that sync
  setDimensions: (dims: Partial<ConfigurationState>) => void;
  setMaterialId: (id: string) => void;
}

export const useCollabStore = create<CollaborativeStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state from useLabStore defaults
    configId: '',
    ownerId: null,
    selectedElement: 'element-1',
    length: 1000,
    width: 500,
    height: 20,
    // ... other defaults

    isConnected: false,
    onlineUsers: [],

    setConnected: (connected) => set({ isConnected: connected }),

    applyRemoteDelta: (delta) => {
      set((state) => ({
        ...state,
        ...delta.changes,
        _lastModified: delta.timestamp,
      }));
    },

    updatePresence: (updates) => {
      // Send presence update via Supabase
      // Implementation depends on channel reference
    },

    setOnlineUsers: (users) => set({ online
    // Wrapped actions that broadcast changes
    setDimensions: (dims) => {
      setUsers: users }),
((state) => ({ ...state, ...dims }));
      // TODO: Send delta via Supabase
    },

    setMaterialId: (id) => {
      set({ selectedMaterialId: id });
      // TODO: Send delta via Supabase
    },
  }))
);
```

### 12.2 React Hook for Collaboration

```typescript
import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useCollabStore } from '@/store/useCollabStore';

export function useCollaboration(configId: string) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const { applyRemoteDelta, setOnlineUsers, setConnected } = useCollabStore();

  useEffect(() => {
    if (!configId) return;

    const channel = supabase.channel(`collab:${configId}`, {
      config: {
        broadcast: { self: false, ack: true },
        presence: { key: getClientId() },
      },
    });

    // Handle config deltas
    channel.on('broadcast', { event: 'config_delta' }, ({ payload }) => {
      applyRemoteDelta(payload as DeltaUpdate);
    });

    // Handle presence sync
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const users: UserPresence[] = Object.values(
        state
      ).flat() as UserPresence[];
      setOnlineUsers(users);
    });

    // Handle presence join
    channel.on('presence', { event: 'join' }, ({ key, newPresences }) => {
      console.log('User joined:', key);
    });

    // Handle presence leave
    channel.on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
      console.log('User left:', key);
    });

    // Subscribe
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        setConnected(true);

        // Track presence
        await channel.track({
          userId: getUserId(),
          displayName: getUserName(),
          avatarUrl: getAvatarUrl(),
          lastActive: Date.now(),
        });
      } else if (status === 'CHANNEL_ERROR') {
        setConnected(false);
      }
    });

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      setConnected(false);
    };
  }, [configId, applyRemoteDelta, setOnlineUsers, setConnected]);

  // Send delta function
  const sendDelta = useCallback(
    async (changes: Partial<ConfigurationState>) => {
      if (!channelRef.current) return;

      await channelRef.current.send({
        type: 'broadcast',
        event: 'config_delta',
        payload: {
          configId,
          timestamp: Date.now(),
          clientId: getClientId(),
          changes,
        },
      });
    },
    [configId]
  );

  // Update presence function
  const updatePresence = useCallback(async (updates: Partial<UserPresence>) => {
    if (!channelRef.current) return;

    await channelRef.current.track({
      ...getCurrentPresence(),
      ...updates,
      lastActive: Date.now(),
    });
  }, []);

  return { sendDelta, updatePresence };
}
```

### 12.3 FastAPI WebSocket for Configuration (Alternative to Supabase)

```python
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends
from fastapi.security import HTTPBearer
from typing import List, Dict
import json
import asyncio
from datetime import datetime

app = FastAPI()
security = HTTPBearer()

# In-memory storage (use Redis for production)
active_connections: Dict[str, List[WebSocket]] = {}
config_states: Dict[str, dict] = {}

class ConfigManager:
    @staticmethod
    async def connect(config_id: str, websocket: WebSocket):
        await websocket.accept()
        if config_id not in active_connections:
            active_connections[config_id] = []
        active_connections[config_id].append(websocket)

        # Send current state to new client
        if config_id in config_states:
            await websocket.send_json({
                "type": "full_state",
                "data": config_states[config_id]
            })

    @staticmethod
    def disconnect(config_id: str, websocket: WebSocket):
        if config_id in active_connections:
            active_connections[config_id].remove(websocket)

    @staticmethod
    async def broadcast(config_id: str, message: dict):
        if config_id in active_connections:
            # Send to all except sender
            for connection in active_connections[config_id]:
                try:
                    await connection.send_json(message)
                except:
                    pass

@app.websocket("/ws/config/{config_id}")
async def websocket_config(websocket: WebSocket, config_id: str):
    await ConfigManager.connect(config_id, websocket)
    try:
        while True:
            data = await websocket.receive_json()

            # Handle delta update
            if data.get("type") == "delta":
                # Update stored state
                if config_id not in config_states:
                    config_states[config_id] = {}

                config_states[config_id].update(data.get("changes", {}))

                # Broadcast to other clients
                await ConfigManager.broadcast(config_id, {
                    "type": "delta",
                    "timestamp": datetime.utcnow().isoformat(),
                    "changes": data.get("changes", {})
                })

                # Acknowledge to sender
                await websocket.send_json({"type": "ack"})

            elif data.get("type") == "request_state":
                # Send full state
                await websocket.send_json({
                    "type": "full_state",
                    "data": config_states.get(config_id, {})
                })

    except WebSocketDisconnect:
        ConfigManager.disconnect(config_id, websocket)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

---

## 13. Confidence Assessment

| Area                  | Level  | Notes                                                           |
| --------------------- | ------ | --------------------------------------------------------------- |
| WebSocket Options     | HIGH   | Supabase Realtime well-documented, existing integration         |
| FastAPI Integration   | HIGH   | Native WebSocket support in FastAPI is mature                   |
| State Synchronization | HIGH   | Delta update pattern well-established                           |
| Conflict Resolution   | MEDIUM | LWW sufficient for configurator; CRDT if offline support needed |
| Presence              | HIGH   | Supabase Presence feature is production-ready                   |
| 3D Performance        | MEDIUM | Best practices identified; actual performance testing needed    |
| Security              | HIGH   | RLS and auth integration well-documented                        |

---

## 14. Gaps to Address

- **Phase-Specific Performance Testing:** Actual 3D sync performance should be validated with prototype
- **CRDT Complexity:** Determine if Yjs integration is needed based on offline requirements
- **CAD Export Locking:** May need more sophisticated locking for long-running operations
- **Mobile Support:** WebSocket behavior on mobile networks needs testing

---

## Sources

- [FastAPI WebSockets Documentation](https://fastapi.tiangolo.com/advanced/websockets/) - HIGH
- [Supabase Realtime Overview](https://supabase.com/docs/guides/realtime) - HIGH
- [Supabase Broadcast](https://supabase.com/docs/guides/realtime/broadcast) - HIGH
- [Supabase Presence](https://supabase.com/docs/guides/realtime/presence) - HIGH
- [Yjs Documentation](https://docs.yjs.dev/) - HIGH
- [y-websocket Provider](https://docs.yjs.dev/ecosystem/connection-provider/y-websocket) - HIGH
- [Supabase Realtime JS SDK](https://github.com/supabase/supabase-js/tree/master/packages/core/realtime-js) - HIGH
- [Supabase Realtime with Next.js](https://supabase.com/docs/guides/realtime/realtime-with-nextjs) - HIGH

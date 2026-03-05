# AI Frontend Guide

This document outlines the conventions and patterns for developing the Next.js frontend in this project.

## Core Framework: Next.js App Router
- The project exclusively uses the **App Router** (`src/app/`).
- **Server Components vs. Client Components:** Prefer Server Components by default. Add `'use client'` at the top of a file only when utilizing React hooks (e.g., `useState`, `useEffect`), event listeners (`onClick`), or browser-only APIs.
- **Server Actions:** Used for server-side mutations. Example found in `src/app/actions.ts` (e.g., `joinAsGuestAction` using `cookies()` from `next/headers`).

## Styling & UI Components
- **Tailwind CSS:** The primary styling solution. Use utility classes.
- **Shadcn UI & Radix UI:** Existing UI components are located in `src/components/ui/`. Before building a new generic component (button, dialog, select, etc.), check if it exists here. These are accessible and highly customizable.
- **Class Merging:** Use the `cn()` utility (typically found in `src/lib/utils.ts` and relying on `clsx` and `tailwind-merge`) to cleanly combine Tailwind classes conditionally.

## 3D Visualization (Three.js)
- 3D features are built with **React Three Fiber** (`@react-three/fiber`) and **Drei** (`@react-three/drei`).
- 3D components should be isolated, generally within `src/components/three/`.
- Ensure heavy 3D calculations do not block the main thread.
- Standard Next.js pages hosting 3D canvases must often be Client Components (`'use client'`).

## Forms & Validation
- **React Hook Form** (`react-hook-form`) is used for managing complex form states.
- **Zod** (`zod`) is used for defining schemas and validating form data before submission. Use `@hookform/resolvers/zod`.

## Authentication & State
- **Supabase SSR:** Used for authentication. Utilize `@supabase/ssr` to manage sessions across server components, client components, and server actions.
- **Guest Sessions:** There is a custom implementation for guest users (refer to `src/lib/guest-session.ts` and `src/app/actions.ts`).

## AI Integration
- The **Vercel AI SDK** is available for LLM integrations. Use `useChat` or `useCompletion` from `@ai-sdk/react` for frontend streams, and `ai`/`@ai-sdk/openai` on the server.
# 📋 Studio Migration — Productivity To-Do List

> **Last Updated:** 2026-02-25  
> **Purpose:** Track all pending tasks for the Google → Supabase + Python Backend migration

---

## 🎯 Daily Goals

*Set 3-5 achievable goals each day. Review and reset every morning.*

| # | Goal | Status | Notes |
|---|------|--------|-------|
| 1 | ~~Finish `migrate_seed.sql` & run on Supabase~~ | [x] | Done ✅ |
| 2 | ~~Wire `warehouseService.ts` to Supabase client~~ | [x] | Done ✅ |
| 3 | ~~Enable Supabase Storage upload in `imageGenerationFlow.ts`~~ | [x] | Done ✅ |
| 4 | ~~Write `warehouseService.test.ts` with mocked Supabase~~ | [x] | 8/8 tests pass ✅ |
| 5 | ~~Fix stale Google Cloud JSDoc in `types/index.ts`~~ | [x] | Already clean ✅ |

**Daily Reflection:**
- What went well today?
- What could be improved?
- Priority for tomorrow:

---

## 🔥 Urgent & Important (Do First)

*Tasks that require immediate attention and have significant consequences if delayed.*

### Critical — Sprint 2: Data & Storage Migration

- [x] **Task:** ~~Finish `scripts/migrate_seed.sql` — all DB tables + seed data~~ ✅
  - **Priority:** 🔴 Critical → DONE
  - **Actual Time:** ~1 hour

- [x] **Task:** ~~Create `scripts/create_storage_bucket.sql` — `drawings` bucket~~ ✅
  - **Priority:** 🔴 Critical → DONE
  - **Actual Time:** ~20 minutes

- [x] **Task:** ~~Replace BigQuery client in `src/services/warehouseService.ts` with Supabase~~ ✅
  - **Priority:** 🔴 Critical → DONE
  - **Notes:** `getMaterials()`, `getSurfaceFinishes()`, `getEdgeProfiles()` — all typed, service-role key

- [x] **Task:** ~~Enable `uploadToSupabase()` in `src/ai/flows/imageGenerationFlow.ts`~~ ✅
  - **Priority:** 🔴 Critical → DONE
  - **Notes:** Uploads SVG to `drawings` bucket, returns public URL

---

## ⚡ Important & Not Urgent (Schedule)

*High-value tasks that contribute to long-term goals.*

### This Week

- [ ] **Task:** Replace Firebase Auth with Supabase Auth in `src/lib/firebase.ts`
  - **Priority:** 🟠 High
  - **Urgency:** This week
  - **Estimated Time:** 3–4 hours
  - **Scheduled Date:** ____________
  - **Notes:** Update all auth hooks, session handling, and middleware

- [ ] **Task:** Rewrite AI flows with Vercel AI SDK (replace Genkit/Gemini → OpenAI)
  - **Priority:** 🟠 High
  - **Urgency:** This week
  - **Estimated Time:** 4–6 hours
  - **Scheduled Date:** ____________
  - **Notes:** Use `ai` + `@ai-sdk/openai`; integrate Python backend for CAD-specific AI

- [x] **Task:** ~~Write `src/tests/warehouseService.test.ts` with mocked Supabase client~~ ✅
  - **Priority:** 🟠 High → DONE
  - **Result:** 8/8 tests pass — success + error paths for all 3 functions + deprecated alias
  - **Notes:** `npm test` runs jest; jest.config.js updated with ts-jest + @/ alias

- [x] **Task:** ~~Fix stale JSDoc comment in `types/index.ts`~~ ✅
  - **Priority:** 🟠 High → Already clean (says "Supabase Storage" correctly)

### This Month

- [ ] **Task:** Deploy Python backend to Railway or Render
  - **Priority:** 🟡 Medium-High
  - **Urgency:** After local validation
  - **Estimated Time:** 2–3 hours
  - **Target Date:** End of month
  - **Notes:** Set `DATABASE_URL`, `PYTHON_API_URL` env vars in Vercel dashboard

- [ ] **Task:** Deploy frontend to Vercel + configure all env vars
  - **Priority:** 🟡 Medium-High
  - **Urgency:** After backend is deployed
  - **Estimated Time:** 1–2 hours
  - **Target Date:** End of month
  - **Notes:** `NEXT_PUBLIC_SUPABASE_URL`, `OPENAI_API_KEY`, `NEXT_PUBLIC_PYTHON_API_URL`

- [ ] **Task:** Export remaining BigQuery data → CSV/JSON → import to Supabase PostgreSQL
  - **Priority:** 🟡 Medium-High
  - **Urgency:** This month
  - **Estimated Time:** 2–4 hours
  - **Target Date:** ____________
  - **Notes:** Migrate historic analytics / warehouse data

- [ ] **Task:** Migrate Cloud Storage images from `radninalog` bucket → Supabase Storage
  - **Priority:** 🟡 Medium-High
  - **Urgency:** This month
  - **Estimated Time:** 1–3 hours
  - **Target Date:** ____________
  - **Notes:** Write a migration script; update public URL generation in code

---

## 📌 Urgent & Not Important (Delegate)

*Tasks that need quick action but don't require deep expertise.*

### Quick Wins (< 15 minutes each)

- [ ] **Task:** Fix stale "Google Cloud Storage" JSDoc in `types/index.ts`
  - **Priority:** 🟢 Low-Medium
  - **Urgency:** Quick turnaround
  - **Estimated Time:** 5 minutes
  - **Can Delegate To:** Anyone with editor access

- [ ] **Task:** Remove `googleapis` from `package.json` after confirming no remaining imports
  - **Priority:** 🟢 Low-Medium
  - **Urgency:** Cleanup
  - **Estimated Time:** 10 minutes
  - **Can Delegate To:** ____________

- [ ] **Task:** Update `README.md` to reflect new stack (Supabase + Python + Vercel)
  - **Priority:** 🟢 Low-Medium
  - **Urgency:** Anytime this week
  - **Estimated Time:** 30 minutes
  - **Can Delegate To:** ____________

### Delegation Queue

| Task | Assigned To | Due Date | Status |
|------|-------------|----------|--------|
| Update `README.md` with new stack | | This week | [ ] |
| Remove leftover Google imports audit | | This week | [ ] |
| Add Vercel project + GitHub integration | | End of month | [ ] |

---

## 📚 Not Urgent & Not Important (Eliminate/Minimize)

*Low-priority tasks — revisit later.*

### Someday/Maybe

- [ ] **Task:** Add Prisma or Drizzle ORM on top of Supabase for type safety
  - **Priority:** ⚪ Low
  - **Estimated Time:** 4–8 hours
  - **Revisit Date:** After core migration is complete
  - **Decision:** Keep / Eliminate / Delegate

- [ ] **Task:** Explore Supabase Edge Functions as replacement for some Next.js API routes
  - **Priority:** ⚪ Low
  - **Estimated Time:** 2–4 hours
  - **Revisit Date:** Q2 2026
  - **Decision:** Keep / Eliminate / Delegate

- [ ] **Task:** Add PyTorch/ML models to Python backend for AI CAD suggestions
  - **Priority:** ⚪ Low
  - **Estimated Time:** 8+ hours
  - **Revisit Date:** After deployment stabilizes
  - **Decision:** Keep / Eliminate / Delegate

---

## 📊 Time Allocation Summary

| Category | Allocated Time | Actual Time | Tasks Completed |
|----------|----------------|-------------|-----------------|
| Critical/Urgent (Sprint 2 data) | 6 hrs | ___ hrs | ___/4 |
| Important/Scheduled (Auth + AI) | 10 hrs | ___ hrs | ___/4 |
| Quick Wins | 1 hr | ___ hrs | ___/3 |
| Low Priority | — | — | — |

---

## 📅 Weekly Planning Overview

### Monday
| Time Block | Task | Priority | Status |
|------------|------|----------|--------|
| Morning | Finish `migrate_seed.sql` + run on Supabase | 🔴 Critical | [ ] |
| Afternoon | Rewrite `warehouseService.ts` → Supabase | 🔴 Critical | [ ] |
| Evening | Create storage bucket script | 🔴 Critical | [ ] |

### Tuesday
| Time Block | Task | Priority | Status |
|------------|------|----------|--------|
| Morning | Enable Supabase upload in `imageGenerationFlow.ts` | 🔴 Critical | [ ] |
| Afternoon | Write `warehouseService.test.ts` | 🟠 High | [ ] |
| Evening | Fix JSDoc in `types/index.ts` | 🟠 High | [ ] |

### Wednesday
| Time Block | Task | Priority | Status |
|------------|------|----------|--------|
| Morning | Replace Firebase Auth with Supabase Auth | 🟠 High | [ ] |
| Afternoon | Continue Auth migration (hooks, middleware) | 🟠 High | [ ] |
| Evening | Review & test auth flows end-to-end | 🟠 High | [ ] |

### Thursday
| Time Block | Task | Priority | Status |
|------------|------|----------|--------|
| Morning | Rewrite AI flows with Vercel AI SDK | 🟠 High | [ ] |
| Afternoon | Connect AI to Python backend CAD processing | 🟠 High | [ ] |
| Evening | Test image generation pipeline | 🟠 High | [ ] |

### Friday
| Time Block | Task | Priority | Status |
|------------|------|----------|--------|
| Morning | BigQuery data export → Supabase import | 🟡 Medium-High | [ ] |
| Afternoon | Migrate `radninalog` images → Supabase Storage | 🟡 Medium-High | [ ] |
| Evening | Weekly review + plan next sprint | 🟠 High | [ ] |

---

## 🏆 Progress Tracker

### Completed (Sprint 1 & Early Sprint 2)

- [x] Remove `apphosting.yaml` and `serviceAccountKey.json`
- [x] Uninstall `googleapis` and `genkit-cli` dependencies
- [x] Update frontend metadata in `src/app/layout.tsx`
- [x] Create Python FastAPI backend structure (`backend/`)
- [x] Wire `backend/` to real `stone_slab_cad/` scripts (`slab2d.generate_2d_drawings()`)
- [x] Fix ezdxf v1.4 API break in `slab2d.py` (`.set_pos()` → `dxfattribs`)
- [x] Fix Supabase-compatible DB URL rewrite (`postgresql://` → `postgresql+asyncpg://`)
- [x] Pass pytest suite (3/3 tests — SVG generation, bad config, materials list)
- [x] Add `backend/.env.example` with all required environment variables
- [x] Verify build passes (pre-existing type errors unrelated to migration)

### Metrics

| Metric | Target | Actual |
|--------|--------|--------|
| Sprint 1 Tasks Completed | 7 | 7 ✅ |
| Sprint 2 Critical Tasks | 4 | 0 🔄 |
| Sprint 2 Important Tasks | 4 | 0 🔄 |
| Google dependencies removed | 100% | ~60% |

---

## 📝 Notes & Reminders

### Recurring Tasks

| Task | Frequency | Day(s) | Time |
|------|-----------|--------|------|
| Run `pytest backend/` | Daily | Mon–Fri | Morning |
| Check Supabase dashboard for errors | Weekly | Monday | Morning |
| Review pending PRs / commit changes | Daily | Mon–Fri | Evening |

### Upcoming Deadlines

| Date | Task | Priority | Status |
|------|------|----------|--------|
| This week | All Sprint 2 data migration tasks | 🔴 Critical | [ ] |
| This month | Deploy Python backend (Railway/Render) | 🟡 Medium-High | [ ] |
| This month | Deploy frontend to Vercel | 🟡 Medium-High | [ ] |

### Blocked Tasks

| Task | Blocked By | Expected Resolution | Notes |
|------|------------|---------------------|-------|
| `imageGenerationFlow.ts` Supabase upload | Storage bucket not yet created | After `create_storage_bucket.sql` runs | Need service-role key in env |
| Deploy Python backend | Local validation not complete | After Sprint 2 migration | Need to confirm DB connection works |

---

## 🔑 Environment Variables Checklist

> All these must be set before deployment works end-to-end.

| Variable | Where | Status |
|----------|-------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | `.env.local` + Vercel | [ ] Set |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `.env.local` + Vercel | [ ] Set |
| `SUPABASE_SERVICE_ROLE_KEY` | `.env.local` + Vercel | [ ] Set |
| `OPENAI_API_KEY` | `.env.local` + Vercel | [ ] Set |
| `NEXT_PUBLIC_PYTHON_API_URL` | `.env.local` + Vercel | [ ] Set |
| `DATABASE_URL` | `backend/.env` | [ ] Set |

---

## 💡 Productivity Tips

1. **Start with the hardest task** — Tackle `warehouseService.ts` when energy is highest
2. **Use time blocking** — Don't mix migration coding with auth work in the same block
3. **Batch similar tasks** — Do all SQL scripts in one session; all TypeScript in another
4. **Test as you go** — Each replaced service should have a smoke test before moving on
5. **Review weekly** — Check which Google deps are still in `package.json` weekly
6. **Limit daily goals** — 3–5 tasks max; migration quality > quantity
7. **Eliminate before adding** — Remove old Google code before wiring in new Supabase code

---

## 📋 Quick Reference: Migration Sprint Status

```
Sprint 1: Foundation & Python Backend   ████████████████████  100% ✅
Sprint 2: Data & Storage Migration      ████████████████████  100% ✅
Sprint 3: Auth & AI                     ░░░░░░░░░░░░░░░░░░░░    0% ⏳
Sprint 4: Deploy & Test                 ░░░░░░░░░░░░░░░░░░░░    0% ⏳
```

---

*Last Updated: 2026-02-25 | Studio Google → Supabase Migration*

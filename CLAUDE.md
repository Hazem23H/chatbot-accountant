@AGENTS.md

# Mahasib (محاسب) — project state & continuation notes

Saudi accounting AI assistant. Next.js 16 (Turbopack) / React 19 / TypeScript /
Tailwind v4 / Gemini 2.5 Flash Lite / Supabase (auth + Postgres + Storage).
Deployed on Vercel: https://chatbot-accountant.vercel.app — GitHub: Hazem23H/chatbot-accountant (origin main).

## Working conventions
- After every code change: commit AND push to origin main (user preference).
- Commit messages: write the message to `.git/COMMIT_EDITMSG_TMP` then
  `git commit -F` it (PowerShell mangles multi-line `-m` here-strings — avoid them).
  End commits with the Co-Authored-By trailer.
- Next 16 specifics: root `proxy.ts` (NOT middleware), `cookies()` is async,
  `useSearchParams` needs Suspense. Read `node_modules/next/dist/docs/` before
  assuming Next APIs (see AGENTS.md — this Next has breaking changes vs training).
- Tests: `npx vitest run` (currently 52 passing, files `lib/**/*.test.ts`).
  Always run `npx tsc --noEmit` + `npx next build` before committing.

## Pending USER actions (not code)
- Run Supabase SQL migrations in order if not yet applied:
  `0002_clients.sql` (multi-client workspaces) and
  `0003_invoice_files.sql` (file_path column + private `invoices` storage bucket
  with per-user RLS — required for saved-invoice document preview to persist).
- OPEN ISSUE to confirm: `/api/validate-invoice` was returning 500/504 in prod
  after the structured-output deploy. Fixed in 384d57c by making extraction
  self-healing (structured output behind a 15s timeout → automatic plain-prompt
  fallback). User should re-test after redeploy AND check Vercel function logs
  for `[validate-invoice] structured extraction failed`. If it's logged every
  time, drop the structured attempt entirely (it wastes a call); if absent,
  structured output works — keep it.

## Invoice validator — architecture (the product's core value)
3-stage pipeline in `app/api/validate-invoice/route.ts`:
1. Gemini vision extraction → `ExtractedInvoice` (structured output w/ fallback).
2. Deterministic engine: `runZatcaRules` (`lib/zatca-rules.ts`) +
   `runQrCrossChecks` (`lib/zatca-qr.ts`). These are PURE — also re-run
   client-side on edit.
3. Gemini semantic pass — hard-capped to `info` severity in code.
Severity model (enforced): deterministic rules own error/warning; AI pass = info only.
`ValidationFlag.source` = 'rule' | 'ai'; `isAiFlag()` (source or SEMANTIC_ prefix).

Key UI: `components/invoice-validator.tsx` (split view: preview ‖ report;
editable extracted fields with instant local re-validation; discount field),
`components/validator/ValidatorWorkspace.tsx`, `BatchValidator.tsx`.

QR: scanned client-side from the file via `lib/qr-scan.ts` (jsQR for images,
pdfjs-dist on-demand for PDFs), payload sent to API as `qrPayload` and treated
as ground truth so cross-checks run against the real TLV. QR cell shows
Verified/Mismatch/Present/Not detected.

## Recently completed (newest first)
- 384d57c self-healing extraction (fixes prod 500/504).
- a7fdd4a PDF QR scanning + structured Gemini output.
- 4bbfd54 validator false-positive fixes (VALIDATOR_FIXES brief, all §1–§8):
  discount-aware VAT/total math, deterministic invoice-type derivation
  (B2B only if buyer VAT present), UUID gated to Phase 2, ISO date-time handling,
  AI severity cap, Arabic-preservation prompt, regression fixtures.
- 0713674 real client-side QR decode + cross-check.
- 846bf60 editable fields + instant re-validation + rule/AI flag distinction.
- 375d9e3 persist original invoice file (Supabase Storage) for saved preview.

## Candidate next steps (improvement backlog, ranked earlier)
- Cheap deterministic rules: cross-foot Σ line totals vs subtotal; reject
  future invoice dates; flag non-SAR currency; handle zero-rated/exempt lines.
- Per-flag fix guidance + link to the curated citation library (`lib/citations.ts`).
- ZATCA XML/UBL ingestion (validate the real Phase-2 signed invoice + BR-KSA rules).
- Deferred earlier: Zakat & VAT calculators (dashboard "Soon" placeholders),
  per-user rate limiting.

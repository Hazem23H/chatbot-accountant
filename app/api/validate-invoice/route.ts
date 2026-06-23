import { SchemaType } from '@google/generative-ai'
import { genAI } from '@/lib/gemini'
import { buildAnalysisParts } from '@/lib/file-processor'
import { buildSystemPrompt } from '@/lib/system-prompt'
import { runZatcaRules, ExtractedInvoice, ValidationFlag } from '@/lib/zatca-rules'
import { runQrCrossChecks } from '@/lib/zatca-qr'

export const runtime = 'nodejs'
export const maxDuration = 60

const EXTRACTION_PROMPT = `Extract all invoice fields from this document and return ONLY a JSON object with this exact shape (omit fields that are not present — do not guess):
{
  "sellerName": "string",
  "sellerVat": "string",
  "buyerName": "string",
  "buyerVat": "string",
  "invoiceNumber": "string",
  "uuid": "string",
  "invoiceDate": "string (date only, YYYY-MM-DD, if possible)",
  "invoiceType": "B2B or B2C",
  "subtotal": number,
  "discountAmount": number,
  "vatAmount": number,
  "vatRate": number (as percent e.g. 15),
  "total": number,
  "hasQrCode": boolean,
  "qrCode": "string if readable",
  "lines": [
    {
      "description": "string",
      "quantity": number,
      "unitPrice": number,
      "discount": number,
      "lineTotal": number,
      "vatAmount": number,
      "vatRate": number
    }
  ]
}

IMPORTANT extraction rules:
- "subtotal" is the sum of line amounts BEFORE any discount (excl. VAT).
- "discountAmount" is the document-level discount/allowance total. Look hard for a discount row — labels include "Discount", "Total Discount", "Allowance", "خصم", "الخصم", "قيمة الخصم". If the invoice shows a discount, you MUST capture it; never silently fold it into other numbers.
- Per line, "discount" is that line's discount and "lineTotal" is the amount AFTER its discount.
- Preserve Arabic text exactly as written — do not transliterate, translate, or reorder characters. Copy field values verbatim.
- Do NOT guess "invoiceType"; only report what the document states.

Return ONLY the JSON — no markdown, no explanation.`

// Response schema for structured output — forces valid, parseable JSON so we no
// longer depend on regex-scraping a {...} block out of free text.
const EXTRACTION_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    sellerName: { type: SchemaType.STRING },
    sellerVat: { type: SchemaType.STRING },
    buyerName: { type: SchemaType.STRING },
    buyerVat: { type: SchemaType.STRING },
    invoiceNumber: { type: SchemaType.STRING },
    uuid: { type: SchemaType.STRING },
    invoiceDate: { type: SchemaType.STRING },
    invoiceType: { type: SchemaType.STRING },
    subtotal: { type: SchemaType.NUMBER },
    discountAmount: { type: SchemaType.NUMBER },
    vatAmount: { type: SchemaType.NUMBER },
    vatRate: { type: SchemaType.NUMBER },
    total: { type: SchemaType.NUMBER },
    hasQrCode: { type: SchemaType.BOOLEAN },
    qrCode: { type: SchemaType.STRING },
    lines: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          description: { type: SchemaType.STRING },
          quantity: { type: SchemaType.NUMBER },
          unitPrice: { type: SchemaType.NUMBER },
          discount: { type: SchemaType.NUMBER },
          lineTotal: { type: SchemaType.NUMBER },
          vatAmount: { type: SchemaType.NUMBER },
          vatRate: { type: SchemaType.NUMBER },
        },
      },
    },
  },
} as const

/** Structured output can still return empty strings for absent fields — treat
 *  those as missing so the rules engine doesn't see "" as a real value. */
function pruneEmpty(invoice: ExtractedInvoice): ExtractedInvoice {
  const out = { ...invoice }
  for (const [k, v] of Object.entries(out)) {
    if (typeof v === 'string' && v.trim() === '') delete (out as Record<string, unknown>)[k]
  }
  return out
}

/** Parse an extraction response into an invoice, or null if unusable. */
function parseExtraction(text: string): ExtractedInvoice | null {
  const tryParse = (s: string): ExtractedInvoice | null => {
    try {
      return JSON.parse(s) as ExtractedInvoice
    } catch {
      return null
    }
  }
  return tryParse(text) ?? tryParse(text.match(/\{[\s\S]*\}/)?.[0] ?? '')
}

/** Reject a promise if it doesn't settle within `ms` — used to bail out of a
 *  stalled model call so the fallback can run inside the function time budget. */
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('model call timed out')), ms)),
  ])
}

type GenModel = ReturnType<typeof genAI.getGenerativeModel>
type FileParts = Awaited<ReturnType<typeof buildAnalysisParts>>

/**
 * Extract invoice fields. Tries structured output (responseSchema) first; if the
 * model rejects the schema, returns no usable text, or stalls, falls back to the
 * plain-prompt path. A structured-output incompatibility can never take the
 * endpoint down — at worst it costs one wasted, fast-failing call.
 */
async function extractInvoice(model: GenModel, fileParts: FileParts): Promise<ExtractedInvoice | null> {
  const contents = [{ role: 'user' as const, parts: [...fileParts, { text: EXTRACTION_PROMPT }] }]

  try {
    const structured = await withTimeout(
      model.generateContent({
        contents,
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: EXTRACTION_SCHEMA,
        },
      }),
      15000
    )
    const parsed = parseExtraction(structured.response.text())
    if (parsed) return parsed
  } catch (err) {
    console.error('[validate-invoice] structured extraction failed; using plain fallback:', err)
  }

  // Fallback — plain prompt, scrape the JSON out of the response text.
  try {
    const plain = await model.generateContent({ contents })
    return parseExtraction(plain.response.text())
  } catch (err) {
    console.error('[validate-invoice] plain extraction failed:', err)
    return null
  }
}

const SEMANTIC_PROMPT_AR = `بناءً على الفاتورة المستخرجة والأعلام التي اكتشفها محرك القواعد، قدّم ملاحظات إرشادية (معلوماتية فقط) قد تساعد المستخدم. اقتصر على حقائق امتثال يمكن التحقق منها فقط، مثل:
- وجود معاملة خاصة معلنة (صفر الضريبة، معفى) وما يترتب عليها
- حقل إلزامي يبدو ناقصًا ولم يلتقطه محرك القواعد

قواعد صارمة:
- لا تُصدر أي ملاحظة بمستوى "error" أو "warning" إطلاقًا — المعلومات فقط.
- لا تُخمّن ولا تخترع. لا تعلّق على ما إذا كانت الفاتورة "تجريبية" أو "عيّنة".
- لا تربط اسم البائع برقم التسجيل الضريبي (لا توجد علاقة بينهما).
- وجود نص عربي وإنجليزي معًا أمر طبيعي ومطلوب — لا تعتبره مشكلة.
- لا تُعد أي ملاحظة وجدها محرك القواعد بالفعل.

أعد إجابتك كمصفوفة JSON بالشكل التالي (مصفوفة فارغة إن لم توجد ملاحظات):
[{ "code": "SEMANTIC_XXX", "severity": "info", "message": "...", "messageAr": "..." }]`

const SEMANTIC_PROMPT_EN = `Given the extracted invoice and the flags already produced by the rules engine, provide guidance notes (informational only) that may help the user. Restrict yourself to verifiable compliance facts, e.g.:
- A declared special treatment (zero-rated, exempt) and its implication
- A mandatory field that appears absent and was not already flagged by the rules engine

Strict rules:
- Never emit a finding at "error" or "warning" severity — info only.
- Do not guess or fabricate. Do NOT comment on whether the invoice is a "test" or "sample".
- Do NOT relate the seller name to the VAT registration number (they are unrelated).
- Mixed Arabic + English content is normal and required — never treat it as an issue.
- Do not repeat any finding the rules engine already produced.

Return a JSON array in this format (empty array if no notes):
[{ "code": "SEMANTIC_XXX", "severity": "info", "message": "...", "messageAr": "..." }]`

function buildSummary(flags: ValidationFlag[]) {
  const errors = flags.filter((f) => f.severity === 'error').length
  const warnings = flags.filter((f) => f.severity === 'warning').length
  const infos = flags.filter((f) => f.severity === 'info').length
  return {
    total: flags.length,
    errors,
    warnings,
    infos,
    passed: errors === 0,
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const language = (formData.get('language') as string) ?? 'ar'
    // QR decoded client-side off the image (the model can't read barcodes).
    const qrPayload = (formData.get('qrPayload') as string | null)?.trim() || null

    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400 })
    }

    if (file.size > 10 * 1024 * 1024) {
      return Response.json({ error: 'File exceeds 10 MB limit' }, { status: 400 })
    }

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash-lite',
      systemInstruction: buildSystemPrompt(language),
    })

    // Step 1 — Extract invoice fields via AI vision pass (structured output with
    // an automatic plain-prompt fallback).
    const fileParts = await buildAnalysisParts(file)
    const rawExtracted = await extractInvoice(model, fileParts)
    if (!rawExtracted) {
      return Response.json({ error: 'Could not extract invoice data from document' }, { status: 422 })
    }
    const extracted = pruneEmpty(rawExtracted)

    // A client-scanned QR is ground truth — trust it over the model's guess so
    // the cross-checks below run against the real payload.
    if (qrPayload) {
      extracted.qrCode = qrPayload
      extracted.hasQrCode = true
    }

    // Step 2 — Run deterministic rules engine + QR cross-checks.
    // QR runs first so we can detect Phase 2 (cryptographic stamp present) and
    // gate Phase-2-only rules (e.g. UUID) accordingly.
    const qrFlags = runQrCrossChecks(extracted, extracted.qrCode)
    const isPhase2 = qrFlags.some((f) => f.code === 'QR_PHASE2_DETECTED')
    const ruleFlags = runZatcaRules(extracted, { isPhase2 })
    const deterministicFlags: ValidationFlag[] = [...ruleFlags, ...qrFlags].map((f) => ({
      ...f,
      source: 'rule',
    }))

    // Step 3 — Second AI pass for semantic issues not caught by rules
    const existingCodes = deterministicFlags.map((f) => f.code).join(', ')
    const semanticPrompt = language === 'ar' ? SEMANTIC_PROMPT_AR : SEMANTIC_PROMPT_EN
    const semanticContext = `Extracted invoice:\n${JSON.stringify(extracted, null, 2)}\n\nFlags already found by rules engine (codes: ${existingCodes || 'none'}):\n${JSON.stringify(deterministicFlags, null, 2)}\n\n${semanticPrompt}`

    let semanticFlags: ValidationFlag[] = []
    try {
      const semanticResult = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: semanticContext }] }],
      })
      const semanticText = semanticResult.response.text()
      const arrayMatch = semanticText.match(/\[[\s\S]*\]/)
      if (arrayMatch) {
        const parsed = JSON.parse(arrayMatch[0]) as ValidationFlag[]
        const existing = new Set(deterministicFlags.map((f) => f.code))
        semanticFlags = parsed
          // Drop anything restating a deterministic finding.
          .filter((f) => !existing.has(f.code))
          // Hard cap: the LLM pass may only ever emit info. Deterministic rules
          // own error/warning — this is what keeps the trustworthy layer trustworthy.
          .map((f) => ({ ...f, severity: 'info' as const, source: 'ai' as const }))
      }
    } catch {
      // Semantic pass is best-effort — don't fail the whole request
    }

    const allFlags = [...deterministicFlags, ...semanticFlags]
    const summary = buildSummary(allFlags)

    return Response.json({ extracted, flags: allFlags, summary, language })
  } catch (error) {
    console.error('Validate-invoice API error:', error)
    return Response.json({ error: 'Failed to validate invoice' }, { status: 500 })
  }
}

import { genAI } from '@/lib/gemini'
import { buildAnalysisParts } from '@/lib/file-processor'
import { buildSystemPrompt } from '@/lib/system-prompt'
import { runZatcaRules, ExtractedInvoice, ValidationFlag } from '@/lib/zatca-rules'

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
  "invoiceDate": "string (ISO 8601 if possible)",
  "invoiceType": "B2B or B2C",
  "subtotal": number,
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
      "lineTotal": number,
      "vatAmount": number,
      "vatRate": number
    }
  ]
}
Return ONLY the JSON — no markdown, no explanation.`

const SEMANTIC_PROMPT_AR = `بناءً على الفاتورة المستخرجة والأعلام التي اكتشفها محرك القواعد، هل هناك مشكلات امتثال إضافية لا تغطيها الفحوصات الرياضية؟ على سبيل المثال:
- عدم تطابق اسم البائع مع رقم التسجيل الضريبي
- تفاصيل غير معقولة في الوصف
- مؤشرات على فاتورة اختبار أو عينة
- تحقق من أن نوع الفاتورة (B2B/B2C) يتطابق مع وجود رقم ضريبة المشتري
- وصف أي أحكام خاصة (صفر الضريبة، المعفى) إن وجدت

أعد إجابتك كمصفوفة JSON من الأعلام بالشكل التالي (مصفوفة فارغة إن لم توجد مشكلات):
[{ "code": "SEMANTIC_XXX", "severity": "warning|info", "message": "...", "messageAr": "..." }]
لا تُعيد الأعلام التي وجدها محرك القواعد بالفعل.`

const SEMANTIC_PROMPT_EN = `Given the extracted invoice and flags already caught by the rules engine, are there additional compliance issues not covered by math checks? For example:
- Seller name inconsistent with VAT registration number format
- Unreasonable description details
- Signs this is a test or sample invoice
- Verify the invoice type (B2B/B2C) matches presence/absence of buyer VAT
- Note any special treatment (zero-rated, exempt) if applicable

Return your answer as a JSON array of flags in this format (empty array if no issues):
[{ "code": "SEMANTIC_XXX", "severity": "warning|info", "message": "...", "messageAr": "..." }]
Do not repeat flags already produced by the rules engine.`

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

    // Step 1 — Extract invoice fields via AI vision pass
    const fileParts = await buildAnalysisParts(file)
    const extractionResult = await model.generateContent({
      contents: [{ role: 'user', parts: [...fileParts, { text: EXTRACTION_PROMPT }] }],
    })

    const extractionText = extractionResult.response.text()
    const jsonMatch = extractionText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return Response.json({ error: 'Could not extract invoice data from document' }, { status: 422 })
    }

    let extracted: ExtractedInvoice
    try {
      extracted = JSON.parse(jsonMatch[0]) as ExtractedInvoice
    } catch {
      return Response.json({ error: 'Extraction response was not valid JSON' }, { status: 422 })
    }

    // Step 2 — Run deterministic rules engine
    const ruleFlags = runZatcaRules(extracted)

    // Step 3 — Second AI pass for semantic issues not caught by rules
    const existingCodes = ruleFlags.map((f) => f.code).join(', ')
    const semanticPrompt = language === 'ar' ? SEMANTIC_PROMPT_AR : SEMANTIC_PROMPT_EN
    const semanticContext = `Extracted invoice:\n${JSON.stringify(extracted, null, 2)}\n\nFlags already found by rules engine (codes: ${existingCodes || 'none'}):\n${JSON.stringify(ruleFlags, null, 2)}\n\n${semanticPrompt}`

    let semanticFlags: ValidationFlag[] = []
    try {
      const semanticResult = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: semanticContext }] }],
      })
      const semanticText = semanticResult.response.text()
      const arrayMatch = semanticText.match(/\[[\s\S]*\]/)
      if (arrayMatch) {
        semanticFlags = JSON.parse(arrayMatch[0]) as ValidationFlag[]
      }
    } catch {
      // Semantic pass is best-effort — don't fail the whole request
    }

    const allFlags = [...ruleFlags, ...semanticFlags]
    const summary = buildSummary(allFlags)

    return Response.json({ extracted, flags: allFlags, summary, language })
  } catch (error) {
    console.error('Validate-invoice API error:', error)
    return Response.json({ error: 'Failed to validate invoice' }, { status: 500 })
  }
}

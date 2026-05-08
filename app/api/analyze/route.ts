import { genAI } from '@/lib/gemini'
import { buildAnalysisParts } from '@/lib/file-processor'
import { buildSystemPrompt } from '@/lib/system-prompt'

export const runtime = 'nodejs'
export const maxDuration = 60

const ANALYSIS_PROMPT: Record<string, string> = {
  ar: `حلل هذه الوثيقة المالية وأعد الرد بصيغة JSON فقط (بدون أي نص قبله أو بعده) بالشكل التالي:
{
  "documentType": "نوع الوثيقة (مثل: فاتورة ضريبية، ميزان مراجعة، كشف رواتب، بيانات CSV، ...)",
  "summary": "وصف موجز في جملتين أو ثلاث",
  "keyFigures": [
    { "label": "اسم الرقم", "value": "القيمة" }
  ],
  "flags": [
    { "severity": "error", "message": "رسالة الخطأ" }
  ],
  "recommendations": ["توصية 1", "توصية 2"]
}

تحقق من الامتثال لمتطلبات هيئة الزكاة والضريبة والجمارك (زاتكا):
- اسم البائع ورقم التسجيل الضريبي
- نسبة الضريبة المضافة (يجب أن تكون 15%، وليس 5% أو أي نسبة أخرى)
- الحقول المطلوبة في الفاتورة الإلكترونية: UUID، رقم تسلسلي، رمز QR، الختم المشفر
- صحة الحسابات: مبلغ الضريبة = القاعدة × 15%
- اسم المشتري في فواتير B2B
- تنسيق التاريخ (يفضّل ISO 8601)
- للبيانات الجدولية (CSV): صحة المجاميع والأرقام السالبة غير المتوقعة`,

  en: `Analyze this financial document and respond with JSON only (no text before or after) in this exact format:
{
  "documentType": "VAT Invoice | Trial Balance | Payroll | CSV Data | ...",
  "summary": "2-3 sentence description",
  "keyFigures": [
    { "label": "figure name", "value": "value" }
  ],
  "flags": [
    { "severity": "error|warning|info", "message": "message" }
  ],
  "recommendations": ["recommendation 1", "recommendation 2"]
}

Check for ZATCA compliance:
- Seller name and VAT registration number present
- VAT rate must be 15% (flag 5% or other incorrect rates as error)
- Required e-invoice fields: UUID, sequential number, QR code, cryptographic stamp
- Math accuracy: VAT amount must equal base × 15%
- Buyer name on B2B invoices
- Date format (ISO 8601 preferred)
- For CSV/tabular data: column totals, unexpected negative values`,
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

    const fileParts = await buildAnalysisParts(file)
    const promptText = ANALYSIS_PROMPT[language] ?? ANALYSIS_PROMPT.ar

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [...fileParts, { text: promptText }] }],
    })

    const responseText = result.response.text()
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return Response.json({ error: 'Could not parse analysis response' }, { status: 500 })
    }

    const analysis = JSON.parse(jsonMatch[0])
    return Response.json({ ...analysis, language })
  } catch (error) {
    console.error('Analyze API error:', error)
    return Response.json({ error: 'Failed to analyze document' }, { status: 500 })
  }
}

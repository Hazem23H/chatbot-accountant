const ROUNDING_TOLERANCE = 0.05
const SAUDI_VAT_REGEX = /^3\d{13}3$/
// UUID v4 pattern
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export type FlagSource = 'rule' | 'ai'

export interface ValidationFlag {
  code: string
  severity: 'error' | 'warning' | 'info'
  message: string
  messageAr: string
  /** 'rule' = deterministic checks (recomputed locally on edit); 'ai' = semantic pass. */
  source?: FlagSource
}

/** True for flags produced by the AI semantic pass (vs. the deterministic engine). */
export function isAiFlag(flag: ValidationFlag): boolean {
  return flag.source === 'ai' || flag.code.startsWith('SEMANTIC')
}

export interface InvoiceLine {
  description?: string
  quantity?: number
  unitPrice?: number
  lineTotal?: number
  vatAmount?: number
  vatRate?: number
}

export interface ExtractedInvoice {
  // Seller
  sellerName?: string
  sellerVat?: string
  // Buyer
  buyerName?: string
  buyerVat?: string
  // Invoice meta
  invoiceNumber?: string
  uuid?: string
  invoiceDate?: string      // expected ISO 8601: YYYY-MM-DD
  invoiceType?: 'B2B' | 'B2C' | string
  // Amounts
  subtotal?: number         // total excl. VAT
  vatAmount?: number
  vatRate?: number          // as percentage e.g. 15
  total?: number            // total incl. VAT
  // E-invoice fields
  qrCode?: string           // base64 or TLV string
  hasQrCode?: boolean
  // Line items
  lines?: InvoiceLine[]
}

function near(a: number, b: number): boolean {
  return Math.abs(a - b) <= ROUNDING_TOLERANCE
}

export function runZatcaRules(invoice: ExtractedInvoice): ValidationFlag[] {
  const flags: ValidationFlag[] = []

  // SELLER_NAME_MISSING
  if (!invoice.sellerName?.trim()) {
    flags.push({
      code: 'SELLER_NAME_MISSING',
      severity: 'error',
      message: 'Seller name is missing (required by ZATCA)',
      messageAr: 'اسم البائع مفقود (مطلوب من زاتكا)',
    })
  }

  // SELLER_VAT_MISSING
  if (!invoice.sellerVat?.trim()) {
    flags.push({
      code: 'SELLER_VAT_MISSING',
      severity: 'error',
      message: 'Seller VAT registration number is missing',
      messageAr: 'رقم تسجيل ضريبة القيمة المضافة للبائع مفقود',
    })
  } else if (!SAUDI_VAT_REGEX.test(invoice.sellerVat.trim())) {
    // SELLER_VAT_INVALID
    flags.push({
      code: 'SELLER_VAT_INVALID',
      severity: 'error',
      message: `Seller VAT number "${invoice.sellerVat}" is invalid — must be 15 digits starting and ending with 3`,
      messageAr: `رقم ضريبة البائع "${invoice.sellerVat}" غير صالح — يجب أن يتكوّن من 15 رقمًا يبدأ وينتهي بالرقم 3`,
    })
  }

  // BUYER_NAME_MISSING (error only for B2B)
  const isB2B =
    invoice.invoiceType === 'B2B' ||
    (invoice.buyerVat && invoice.buyerVat.trim().length > 0)
  if (!invoice.buyerName?.trim() && isB2B) {
    flags.push({
      code: 'BUYER_NAME_MISSING',
      severity: 'error',
      message: 'Buyer name is required on B2B invoices (ZATCA)',
      messageAr: 'اسم المشتري مطلوب في فواتير B2B (زاتكا)',
    })
  }

  // BUYER_VAT_INVALID
  if (invoice.buyerVat?.trim() && !SAUDI_VAT_REGEX.test(invoice.buyerVat.trim())) {
    flags.push({
      code: 'BUYER_VAT_INVALID',
      severity: 'warning',
      message: `Buyer VAT number "${invoice.buyerVat}" does not match Saudi format (15 digits, starts and ends with 3)`,
      messageAr: `رقم ضريبة المشتري "${invoice.buyerVat}" لا يتطابق مع النسق السعودي (15 رقمًا يبدأ وينتهي بالرقم 3)`,
    })
  }

  // INVOICE_NUMBER_MISSING
  if (!invoice.invoiceNumber?.trim()) {
    flags.push({
      code: 'INVOICE_NUMBER_MISSING',
      severity: 'error',
      message: 'Sequential invoice number is missing (ZATCA mandatory field)',
      messageAr: 'رقم الفاتورة التسلسلي مفقود (حقل إلزامي من زاتكا)',
    })
  }

  // UUID_MISSING
  if (!invoice.uuid?.trim()) {
    flags.push({
      code: 'UUID_MISSING',
      severity: 'error',
      message: 'UUID is missing — required for Phase 2 e-invoicing (ZATCA)',
      messageAr: 'المعرف الفريد UUID مفقود — مطلوب للمرحلة الثانية من الفوترة الإلكترونية',
    })
  } else if (!UUID_REGEX.test(invoice.uuid.trim())) {
    // UUID_INVALID
    flags.push({
      code: 'UUID_INVALID',
      severity: 'warning',
      message: `UUID "${invoice.uuid}" does not match UUID v4 format`,
      messageAr: `المعرف الفريد "${invoice.uuid}" لا يتطابق مع نسق UUID v4`,
    })
  }

  // DATE_MISSING
  if (!invoice.invoiceDate?.trim()) {
    flags.push({
      code: 'DATE_MISSING',
      severity: 'error',
      message: 'Invoice date is missing',
      messageAr: 'تاريخ الفاتورة مفقود',
    })
  } else {
    // DATE_FORMAT_INVALID — warn if not ISO 8601 (YYYY-MM-DD)
    const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!isoDateRegex.test(invoice.invoiceDate.trim())) {
      flags.push({
        code: 'DATE_FORMAT_INVALID',
        severity: 'warning',
        message: `Invoice date "${invoice.invoiceDate}" is not in ISO 8601 format (YYYY-MM-DD) — ZATCA prefers ISO 8601`,
        messageAr: `تاريخ الفاتورة "${invoice.invoiceDate}" ليس بتنسيق ISO 8601 (YYYY-MM-DD) — تفضّل زاتكا هذا التنسيق`,
      })
    }
  }

  // VAT_RATE_INCORRECT
  if (invoice.vatRate !== undefined && invoice.vatRate !== null) {
    if (!near(invoice.vatRate, 15)) {
      flags.push({
        code: 'VAT_RATE_INCORRECT',
        severity: 'error',
        message: `VAT rate is ${invoice.vatRate}% — Saudi standard rate is 15% (effective July 2020)`,
        messageAr: `نسبة ضريبة القيمة المضافة هي ${invoice.vatRate}% — النسبة السعودية الصحيحة هي 15% (سارية منذ يوليو 2020)`,
      })
    }
  }

  // VAT_MATH_ERROR — vatAmount should equal subtotal × 15%
  if (
    invoice.subtotal !== undefined &&
    invoice.vatAmount !== undefined &&
    invoice.subtotal !== null &&
    invoice.vatAmount !== null
  ) {
    const expectedVat = invoice.subtotal * 0.15
    if (!near(invoice.vatAmount, expectedVat)) {
      flags.push({
        code: 'VAT_MATH_ERROR',
        severity: 'error',
        message: `VAT amount (${invoice.vatAmount.toFixed(2)}) does not equal subtotal × 15% (expected ${expectedVat.toFixed(2)})`,
        messageAr: `مبلغ الضريبة (${invoice.vatAmount.toFixed(2)}) لا يساوي الوعاء الضريبي × 15% (المتوقع ${expectedVat.toFixed(2)})`,
      })
    }
  }

  // TOTAL_MATH_ERROR — total should equal subtotal + vatAmount
  if (
    invoice.subtotal !== undefined &&
    invoice.vatAmount !== undefined &&
    invoice.total !== undefined &&
    invoice.subtotal !== null &&
    invoice.vatAmount !== null &&
    invoice.total !== null
  ) {
    const expectedTotal = invoice.subtotal + invoice.vatAmount
    if (!near(invoice.total, expectedTotal)) {
      flags.push({
        code: 'TOTAL_MATH_ERROR',
        severity: 'error',
        message: `Total (${invoice.total.toFixed(2)}) does not equal subtotal + VAT (expected ${expectedTotal.toFixed(2)})`,
        messageAr: `الإجمالي (${invoice.total.toFixed(2)}) لا يساوي الوعاء الضريبي + الضريبة (المتوقع ${expectedTotal.toFixed(2)})`,
      })
    }
  }

  // AMOUNTS_INCOMPLETE — flag if some but not all amounts are present
  const amountFields = [invoice.subtotal, invoice.vatAmount, invoice.total]
  const presentCount = amountFields.filter((v) => v !== undefined && v !== null).length
  if (presentCount > 0 && presentCount < 3) {
    flags.push({
      code: 'AMOUNTS_INCOMPLETE',
      severity: 'warning',
      message: 'Invoice amounts are incomplete — subtotal, VAT amount, and total are all required',
      messageAr: 'مبالغ الفاتورة غير مكتملة — الوعاء الضريبي ومبلغ الضريبة والإجمالي جميعها مطلوبة',
    })
  }

  // QR_CODE_MISSING — error for Phase 2 (B2B clearance) / warning for B2C reporting
  const hasQr = invoice.hasQrCode === true || (invoice.qrCode && invoice.qrCode.trim().length > 0)
  if (!hasQr) {
    if (isB2B) {
      flags.push({
        code: 'QR_CODE_MISSING',
        severity: 'error',
        message: 'QR code is missing — required on all ZATCA e-invoices (Phase 1+)',
        messageAr: 'رمز QR مفقود — مطلوب في جميع الفواتير الإلكترونية لزاتكا (المرحلة الأولى وما بعدها)',
      })
    } else {
      // QR_CODE_RECOMMENDED for B2C simplified invoices
      flags.push({
        code: 'QR_CODE_RECOMMENDED',
        severity: 'warning',
        message: 'QR code not detected — mandatory on simplified (B2C) invoices per ZATCA Phase 1',
        messageAr: 'لم يُكتشف رمز QR — إلزامي في الفواتير المبسطة (B2C) بموجب المرحلة الأولى من زاتكا',
      })
    }
  }

  // LINE-LEVEL checks
  if (invoice.lines && invoice.lines.length > 0) {
    invoice.lines.forEach((line, idx) => {
      const lineNum = idx + 1

      // LINE_TOTAL_MISMATCH
      if (
        line.quantity !== undefined &&
        line.unitPrice !== undefined &&
        line.lineTotal !== undefined
      ) {
        const expected = line.quantity * line.unitPrice
        if (!near(line.lineTotal, expected)) {
          flags.push({
            code: 'LINE_TOTAL_MISMATCH',
            severity: 'error',
            message: `Line ${lineNum}: total (${line.lineTotal.toFixed(2)}) ≠ qty × unit price (${expected.toFixed(2)})`,
            messageAr: `السطر ${lineNum}: الإجمالي (${line.lineTotal.toFixed(2)}) ≠ الكمية × سعر الوحدة (${expected.toFixed(2)})`,
          })
        }
      }

      // LINE_VAT_MISMATCH
      if (line.lineTotal !== undefined && line.vatAmount !== undefined) {
        const rate = line.vatRate ?? 15
        const expectedVat = line.lineTotal * (rate / 100)
        if (!near(line.vatAmount, expectedVat)) {
          flags.push({
            code: 'LINE_VAT_MISMATCH',
            severity: 'error',
            message: `Line ${lineNum}: VAT amount (${line.vatAmount.toFixed(2)}) ≠ line total × ${rate}% (${expectedVat.toFixed(2)})`,
            messageAr: `السطر ${lineNum}: مبلغ الضريبة (${line.vatAmount.toFixed(2)}) ≠ إجمالي السطر × ${rate}% (${expectedVat.toFixed(2)})`,
          })
        }
      }
    })
  }

  return flags
}

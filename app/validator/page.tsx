import { InvoiceValidator } from '@/components/invoice-validator'
import { AlertCircle } from 'lucide-react'

export default function ValidatorPage() {
  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Title */}
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-[#0D4F8C]">
            التحقق من الفاتورة الإلكترونية
          </h1>
          <p className="text-gray-500 text-sm">
            ZATCA E-Invoice Validator
          </p>
          <p className="text-gray-400 text-xs mt-1">
            فحص الامتثال لمتطلبات هيئة الزكاة والضريبة والجمارك
            &nbsp;·&nbsp;
            Compliance check for Saudi e-invoicing requirements
          </p>
        </div>

        {/* Validator component — defaults to Arabic */}
        <InvoiceValidator language="ar" />

        {/* Disclaimer */}
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
          <AlertCircle size={15} className="shrink-0 mt-0.5 text-amber-500" />
          <p>
            هذه الأداة للإرشاد العام فقط ولا تُغني عن مراجعة مستشار ضريبي معتمد.
            تحقق دائمًا من المتطلبات الحالية على بوابة{' '}
            <span className="font-semibold">zatca.gov.sa</span>.
            {' · '}
            This tool provides general guidance only and does not substitute for a licensed tax advisor.
          </p>
        </div>
      </div>
    </main>
  )
}

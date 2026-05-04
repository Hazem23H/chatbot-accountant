import { TopicId, QuickPrompt } from '@/types/chat'

export const QUICK_PROMPTS: Record<TopicId, QuickPrompt[]> = {
  general: [
    { ar: 'ما هي متطلبات التأهل للحصول على رخصة محاسب قانوني في المملكة؟', en: 'What are the requirements to become a licensed CPA in Saudi Arabia?' },
    { ar: 'ما هو الفرق بين مراجع الحسابات الداخلي والخارجي؟', en: 'What is the difference between internal and external auditors?' },
    { ar: 'كيف يتم احتساب مكافأة نهاية الخدمة وفق نظام العمل السعودي؟', en: 'How is end-of-service indemnity calculated under Saudi Labor Law?' },
  ],
  zakat: [
    { ar: 'كيف يتم احتساب وعاء الزكاة للشركات المساهمة؟', en: 'How is the Zakat base calculated for joint stock companies?' },
    { ar: 'ما الفرق بين الزكاة وضريبة الدخل للشركات ذات الملكية المختلطة؟', en: 'What is the difference between Zakat and income tax for mixed-ownership companies?' },
    { ar: 'ما هي مواعيد تقديم إقرار الزكاة وسداد المستحق؟', en: 'What are the deadlines for Zakat filing and payment to ZATCA?' },
    { ar: 'هل يمكن خصم الخسائر المرحلة من وعاء الزكاة؟', en: 'Can carried-forward losses be deducted from the Zakat base?' },
  ],
  vat: [
    { ar: 'ما هو حد التسجيل الإلزامي في ضريبة القيمة المضافة؟', en: 'What is the mandatory VAT registration threshold in Saudi Arabia?' },
    { ar: 'كيف تُعالج معاملات العقارات في ظل نظام ضريبة القيمة المضافة؟', en: 'How are real estate transactions treated under Saudi VAT rules?' },
    { ar: 'ما الفرق بين التوريدات المعفاة والخاضعة للضريبة بنسبة صفر؟', en: 'What is the difference between exempt and zero-rated supplies?' },
    { ar: 'ما هي عقوبات التأخر في تقديم الإقرار الضريبي لضريبة القيمة المضافة؟', en: 'What are the penalties for late VAT return filing in Saudi Arabia?' },
  ],
  ifrs: [
    { ar: 'ما هي الشركات الملزمة بتطبيق معايير IFRS الكاملة في المملكة؟', en: 'Which companies are required to apply full IFRS in Saudi Arabia?' },
    { ar: 'كيف يتم المحاسبة عن مكافأة نهاية الخدمة وفق معيار IAS 19؟', en: 'How is end-of-service indemnity accounted for under IAS 19?' },
    { ar: 'ما هو تأثير معيار IFRS 16 على شركات التجزئة السعودية؟', en: 'What is the impact of IFRS 16 on Saudi retail companies?' },
    { ar: 'كيف يتم الإفصاح عن الزكاة في القوائم المالية وفق IFRS؟', en: 'How should Zakat be disclosed in IFRS financial statements?' },
  ],
  auditing: [
    { ar: 'ما هي متطلبات التعليم المهني المستمر للمحاسبين في المملكة؟', en: 'What are the CPE requirements for Saudi CPAs?' },
    { ar: 'ما هي معايير الاستقلالية المطلوبة من مراجع الحسابات وفق SOCPA؟', en: 'What independence requirements apply to Saudi auditors under SOCPA?' },
    { ar: 'ما هي أبرز مخاطر الغش الواجب مراعاتها عند مراجعة الشركات العائلية؟', en: 'What fraud risks should auditors consider when auditing family-owned businesses?' },
    { ar: 'ما هي متطلبات تقرير المراجع للشركات المدرجة في السوق المالية؟', en: 'What are the audit report requirements for Saudi listed companies?' },
  ],
  'corporate-law': [
    { ar: 'ما هو الحد الأدنى لرأس المال لتأسيس شركة مساهمة مقفلة؟', en: 'What is the minimum capital for a private joint stock company in Saudi Arabia?' },
    { ar: 'ما هي متطلبات لجنة المراجعة في الشركات المساهمة وفق نظام الشركات 2022؟', en: 'What are the audit committee requirements under the 2022 Saudi Companies Law?' },
    { ar: 'ما هي قواعد توزيع الأرباح والاحتياطي النظامي للشركات المساهمة؟', en: 'What are the dividend distribution rules and legal reserve requirements for JSCs?' },
    { ar: 'كم تبلغ المدة القصوى لتعيين مراجع الحسابات للشركات المدرجة؟', en: 'What is the maximum auditor tenure for listed companies under Saudi law?' },
  ],
  'e-invoicing': [
    { ar: 'ما الفرق بين الفاتورة الضريبية والفاتورة المبسطة في نظام الفوترة الإلكترونية؟', en: 'What is the difference between a standard tax invoice and simplified invoice in Fatoorah?' },
    { ar: 'ما هي متطلبات المرحلة الثانية من الفوترة الإلكترونية (الربط والتكامل)؟', en: 'What are the Phase 2 e-invoicing integration requirements with ZATCA?' },
    { ar: 'ما هي العقوبات المترتبة على عدم الامتثال لمتطلبات الفوترة الإلكترونية؟', en: 'What are the penalties for non-compliance with e-invoicing requirements?' },
  ],
  'capital-markets': [
    { ar: 'ما هي مواعيد الإفصاح عن القوائم المالية للشركات المدرجة في تداول؟', en: 'What are the financial reporting deadlines for Tadawul-listed companies?' },
    { ar: 'ما هي متطلبات القوائم المالية لطرح أسهم شركة للاكتتاب العام (IPO)؟', en: 'What financial statement requirements apply to Saudi IPOs?' },
    { ar: 'كيف يتم الإفصاح عن معاملات الأطراف ذات الصلة في شركات تداول؟', en: 'How should related party transactions be disclosed by Tadawul-listed companies?' },
  ],
  banking: [
    { ar: 'كيف يُطبَّق معيار IFRS 9 لاحتساب خسائر الائتمان المتوقعة في البنوك السعودية؟', en: 'How is IFRS 9 expected credit loss (ECL) applied in Saudi banks?' },
    { ar: 'كيف تُحاسَب عمليات المرابحة والإجارة وفق المعايير المحاسبية؟', en: 'How are Murabaha and Ijara transactions accounted for under AAOIFI and IFRS?' },
    { ar: 'ما هي متطلبات IFRS 17 للشركات التأمين السعودية؟', en: 'What are the IFRS 17 requirements for Saudi insurance companies?' },
  ],
  vision2030: [
    { ar: 'ما هي التحديات المحاسبية الرئيسية في مشاريع الخصخصة ضمن رؤية 2030؟', en: 'What are the main accounting challenges in Vision 2030 privatization projects?' },
    { ar: 'كيف تُعالج عقود البنية التحتية لمشروعات NEOM والبحر الأحمر محاسبياً؟', en: 'How are NEOM and Red Sea Project infrastructure contracts accounted for under IFRS 15?' },
    { ar: 'ما هي اعتبارات المحاسبة عند التعامل مع الأطراف ذات الصلة بصندوق الاستثمارات العامة؟', en: 'What are the related-party accounting considerations for PIF-related entities?' },
  ],
  government: [
    { ar: 'ما هو نظام المحاسبة المطبق في الجهات الحكومية السعودية؟', en: 'What accounting framework applies to Saudi government entities?' },
    { ar: 'كيف تُحاسَب عقود الشراكة بين القطاعين العام والخاص (PPP) وفق IFRIC 12؟', en: 'How are PPP contracts accounted for under IFRIC 12 in Saudi Arabia?' },
    { ar: 'ما هو أثر التحول إلى محاسبة الاستحقاق على الجهات الحكومية السعودية؟', en: 'What is the impact of accrual accounting adoption on Saudi government entities?' },
  ],
}

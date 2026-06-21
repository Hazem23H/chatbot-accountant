'use client'

import { useState } from 'react'
import { Check, ChevronDown, Plus, Loader2 } from 'lucide-react'
import { createClientWorkspace, type Client, type WorkspaceId } from '@/lib/clients'
import type { Language } from '@/types/chat'

interface WorkspaceSwitcherProps {
  language: Language
  clientId: WorkspaceId
  clients: Client[]
  onSelect: (id: WorkspaceId) => void
  onCreated: () => void
}

export function WorkspaceSwitcher({
  language,
  clientId,
  clients,
  onSelect,
  onCreated,
}: WorkspaceSwitcherProps) {
  const isRtl = language === 'ar'
  const [open, setOpen] = useState(false)
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)

  const t = {
    workspace: isRtl ? 'مساحة العمل' : 'WORKSPACE',
    clientsLabel: isRtl ? 'العملاء' : 'CLIENTS',
    general: isRtl ? 'عام' : 'General',
    generalSub: isRtl ? 'بدون عميل · توجيه عام' : 'No client · general guidance',
    newClient: isRtl ? 'عميل جديد' : 'New client',
    newClientSub: isRtl ? 'يحفظ ملفاته وسجلّه على حدة' : 'Saves its files & history separately',
    placeholder: isRtl ? 'اسم العميل' : 'Client name',
    add: isRtl ? 'إضافة' : 'Add',
  }

  const current = clientId ? clients.find((c) => c.id === clientId)?.name ?? t.general : t.general

  const submitNew = async () => {
    if (!name.trim() || busy) return
    setBusy(true)
    const created = await createClientWorkspace(name.trim())
    setBusy(false)
    if (created) {
      setName('')
      setAdding(false)
      setOpen(false)
      onCreated()
      onSelect(created.id)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2.5 border border-border rounded-[10px] px-3.5 py-2 text-[13px] font-medium bg-card hover:border-primary transition-colors"
      >
        <span className="w-[7px] h-[7px] rounded-full bg-primary" />
        <span>{current}</span>
        <ChevronDown size={13} className="text-muted-foreground" />
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} className="fixed inset-0 z-40" />
          <div
            className={`absolute ${isRtl ? 'start-0' : 'end-0'} top-[calc(100%+8px)] z-50 w-[288px] bg-popover border border-border rounded-[13px] shadow-xl p-2 text-start`}
          >
            <div className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground px-2.5 pt-2 pb-1.5">
              {t.workspace}
            </div>

            <button
              onClick={() => {
                onSelect(null)
                setOpen(false)
              }}
              className="w-full flex items-center gap-3 p-2.5 rounded-[9px] hover:bg-muted transition-colors"
            >
              <span className="w-8 h-8 rounded-lg bg-accent text-accent-foreground flex items-center justify-center text-[15px] font-bold">
                ∗
              </span>
              <span className="flex-1 min-w-0 text-start">
                <span className="block text-sm font-semibold">{t.general}</span>
                <span className="block text-xs text-muted-foreground">{t.generalSub}</span>
              </span>
              {!clientId && <Check size={15} className="text-primary" />}
            </button>

            {clients.length > 0 && (
              <>
                <div className="h-px bg-border mx-1 my-1.5" />
                <div className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground px-2.5 pb-1.5">
                  {t.clientsLabel}
                </div>
                {clients.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      onSelect(c.id)
                      setOpen(false)
                    }}
                    className="w-full flex items-center gap-3 p-2.5 rounded-[9px] hover:bg-muted transition-colors"
                  >
                    <span className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-[13px] font-semibold uppercase">
                      {c.name.slice(0, 2)}
                    </span>
                    <span className="flex-1 min-w-0 text-start">
                      <span className="block text-sm font-semibold truncate">{c.name}</span>
                      {c.fiscalYear && (
                        <span className="block text-xs text-muted-foreground">{c.fiscalYear}</span>
                      )}
                    </span>
                    {clientId === c.id && <Check size={15} className="text-primary" />}
                  </button>
                ))}
              </>
            )}

            <div className="h-px bg-border mx-1 my-1.5" />

            {adding ? (
              <div className="flex items-center gap-2 p-1.5">
                <input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && submitNew()}
                  placeholder={t.placeholder}
                  className="flex-1 h-9 rounded-[9px] border border-border bg-card px-3 text-sm focus:outline-none focus:border-primary"
                />
                <button
                  onClick={submitNew}
                  disabled={busy || !name.trim()}
                  className="h-9 px-3 rounded-[9px] bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50 flex items-center gap-1"
                >
                  {busy ? <Loader2 size={14} className="animate-spin" /> : t.add}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setAdding(true)}
                className="w-full flex items-center gap-3 p-2.5 rounded-[9px] hover:bg-muted transition-colors"
              >
                <span className="w-8 h-8 rounded-lg border border-dashed border-border text-primary flex items-center justify-center">
                  <Plus size={16} />
                </span>
                <span className="flex-1 min-w-0 text-start">
                  <span className="block text-sm font-semibold text-primary">{t.newClient}</span>
                  <span className="block text-xs text-muted-foreground">{t.newClientSub}</span>
                </span>
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}

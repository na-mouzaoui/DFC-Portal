"use client"

import { useState, useCallback, useMemo, useEffect } from "react"
import { LayoutWrapper } from "@/components/layout-wrapper"
import { useAuth } from "@/hooks/use-auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { Building2, CalendarDays, Plus, Trash2, Save, Check, ChevronsUpDown, Calculator, FileText } from "lucide-react"
import { getCurrentFiscalPeriod, getFiscalPeriodLockMessage, isFiscalPeriodLocked } from "@/lib/fiscal-period-deadline"
import { cn } from "@/lib/utils"
import { API_BASE } from "@/lib/config"

const PRIMARY_COLOR = "#2db34b"

const fmt = (v: number | string) => {
  if (v === "" || isNaN(Number(v))) return ""
  const num = Number(v)
  const [intPart, decPart] = num.toFixed(2).split(".")
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, " ")
  return `${formattedInt},${decPart}`
}

const normalizeAmountInput = (value: string, allowNegative = false) => {
  const raw = value.replace(/\u00A0/g, " ").trim()
  if (!raw) return ""
  const standardized = raw.replace(/\s/g, "").replace(/,/g, ".")
  const hasLeadingMinus = allowNegative && standardized.startsWith("-")
  const unsigned = standardized.replace(/-/g, "")
  const hasTrailingSeparator = /\.$/.test(unsigned)
  const cleaned = unsigned.replace(/[^0-9.]/g, "")
  if (!cleaned) {
    if (hasLeadingMinus && (standardized === "-" || standardized === "-.")) {
      return standardized
    }
    return ""
  }
  const parts = cleaned.split(".")
  const integerPart = (parts[0] || "0").replace(/^0+(?=\d)/, "")
  const decimalPart = parts.slice(1).join("").slice(0, 2)
  const signedIntegerPart = hasLeadingMinus ? `-${integerPart}` : integerPart
  if (hasTrailingSeparator && decimalPart.length === 0) {
    return `${signedIntegerPart}.`
  }
  return decimalPart ? `${signedIntegerPart}.${decimalPart}` : signedIntegerPart
}

const formatAmountInput = (value: string, allowNegative = false) => {
  const normalized = normalizeAmountInput(value, allowNegative)
  if (!normalized) return ""
  if (normalized === "-") return "-"
  if (normalized === "-.") return "-,"
  const isNegative = normalized.startsWith("-")
  const normalizedAbsolute = isNegative ? normalized.slice(1) : normalized
  const hasTrailingDot = normalizedAbsolute.endsWith(".")
  const [integerPart, decimalPart = ""] = normalizedAbsolute.split(".")
  const groupedIntegerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, " ")
  const signedGroupedIntegerPart = isNegative ? `-${groupedIntegerPart}` : groupedIntegerPart
  if (hasTrailingDot) {
    return `${signedGroupedIntegerPart},`
  }
  return decimalPart ? `${signedGroupedIntegerPart},${decimalPart}` : signedGroupedIntegerPart
}

const num = (v: string, allowNegative = true) => {
  const normalized = normalizeAmountInput(v, allowNegative)
  if (!normalized || normalized === "-" || normalized === "-.") return 0
  const parseReady = normalized.endsWith(".") ? normalized.slice(0, -1) : normalized
  return parseFloat(parseReady) || 0
}

type AmountInputProps = Omit<React.ComponentProps<typeof Input>, "type" | "value" | "onChange"> & {
  value: string
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void
  allowNegative?: boolean
}

function AmountInput({ value, onChange, allowNegative = false, ...props }: AmountInputProps) {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!onChange) return
    const normalizedValue = normalizeAmountInput(event.target.value, allowNegative)
    onChange({
      ...event,
      target: { ...event.target, value: normalizedValue },
      currentTarget: { ...event.currentTarget, value: normalizedValue },
    } as React.ChangeEvent<HTMLInputElement>)
  }
  return (
    <Input
      {...props}
      type="text"
      inputMode="decimal"
      value={formatAmountInput(value, allowNegative)}
      onChange={handleChange}
    />
  )
}

const safeString = (value: unknown) => {
  if (typeof value === "string") return value
  if (value === null || value === undefined) return ""
  return String(value)
}

type FiscalFournisseurOption = {
  id: number
  raisonSociale: string
  adresse: string
  nif: string
  authNif: string
  rc: string
  authRc: string
}

const normalizeFiscalFournisseurOption = (value: unknown): FiscalFournisseurOption | null => {
  if (!value || typeof value !== "object") return null
  const raw = value as Record<string, unknown>
  const id = Number(raw.id)
  if (!Number.isFinite(id)) return null
  return {
    id,
    raisonSociale: safeString(raw.raisonSociale),
    adresse: safeString(raw.adresse),
    nif: safeString(raw.nif),
    authNif: safeString(raw.authNif),
    rc: safeString(raw.rc),
    authRc: safeString(raw.authRc),
  }
}

type SupplierSearchSelectProps = {
  value: string
  onChange: (nextValue: string) => void
  fournisseurs: FiscalFournisseurOption[]
  placeholder?: string
  triggerClassName?: string
}

function SupplierSearchSelect({
  value,
  onChange,
  fournisseurs,
  placeholder = "Selectionner un fournisseur",
  triggerClassName,
}: SupplierSearchSelectProps) {
  const [open, setOpen] = useState(false)
  const selected = fournisseurs.find((f) => String(f.id) === value)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("justify-between", triggerClassName)}
        >
          <span className="truncate text-left">{selected?.raisonSociale?.trim() || placeholder}</span>
          <ChevronsUpDown className="ml-2 size-3.5 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-0">
        <Command>
          <CommandInput placeholder="Rechercher un fournisseur..." />
          <CommandList>
            <CommandEmpty>Aucun fournisseur trouve.</CommandEmpty>
            <CommandGroup>
              {fournisseurs.map((fournisseur) => {
                const fournisseurId = String(fournisseur.id)
                return (
                  <CommandItem
                    key={fournisseur.id}
                    value={`${fournisseur.raisonSociale} ${fournisseur.nif} ${fournisseur.rc} ${fournisseurId}`}
                    onSelect={() => {
                      onChange(fournisseurId)
                      setOpen(false)
                    }}
                  >
                    <Check className={cn("size-4", value === fournisseurId ? "opacity-100" : "opacity-0")} />
                    <span className="truncate">{fournisseur.raisonSociale || "-"}</span>
                  </CommandItem>
                )
              })}
            </CommandGroup>
            {value && (
              <CommandGroup>
                <CommandItem
                  value="__clear_supplier__"
                  onSelect={() => {
                    onChange("")
                    setOpen(false)
                  }}
                >
                  Effacer la selection
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

// 
// TAB 1 - IBS SUR FOURNISSEURS ETRANGERS
// 
type Ibs14Row = { numFacture: string; montantBrutDevise: string; tauxChange: string; montantBrutDinars: string; montantNetDevise: string; montantIBS: string; montantNetDinars: string }
const EMPTY_IBS14: Ibs14Row = { numFacture: "", montantBrutDevise: "", tauxChange: "", montantBrutDinars: "", montantNetDevise: "", montantIBS: "", montantNetDinars: "" }
interface Tab14Props { rows: Ibs14Row[]; setRows: React.Dispatch<React.SetStateAction<Ibs14Row[]>>; onSave: () => void; isSubmitting: boolean }
function TabIBS({ rows, setRows, onSave, isSubmitting }: Tab14Props) {
  const addRow    = () => setRows((p) => [...p, { ...EMPTY_IBS14 }])
  const removeRow = (i: number) => setRows((p) => p.filter((_, idx) => idx !== i))
  const upd = (i: number, f: keyof Ibs14Row, v: string) =>
    setRows((prev) => prev.map((r, idx) => idx === i ? { ...r, [f]: v } : r))
  const s = (f: keyof Ibs14Row) => rows.reduce((acc, r) => acc + num(r[f] as string), 0)
  const iw = { minWidth: 120 }
  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-2 py-2 text-center text-xs font-semibold text-gray-400 border-b w-8">#</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">No de Facture</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">Montant Brut en Devise</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">Taux de Change Date du Contrat</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">Montant Brut en Dinars</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">Montant Net Transferable en Devise</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">Montant de l'IBS (Taux...%)</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">Montant Net Transferable en Dinars</th>
              <th className="px-2 py-2 border-b w-8" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                <td className="px-2 py-1 text-center text-xs text-gray-400 border-b">{i + 1}</td>
                <td className="px-1 py-1 border-b"><Input value={row.numFacture} onChange={(e) => upd(i,"numFacture",e.target.value)} className="h-7 px-2 text-xs" placeholder="N° Facture" style={iw} /></td>
                <td className="px-1 py-1 border-b"><AmountInput min={0} step="0.01" value={row.montantBrutDevise} onChange={(e) => upd(i,"montantBrutDevise",e.target.value)} className="h-7 px-2 text-xs" placeholder="0.00" style={iw} /></td>
                <td className="px-1 py-1 border-b"><AmountInput min={0} step="0.01" value={row.tauxChange} onChange={(e) => upd(i,"tauxChange",e.target.value)} className="h-7 px-2 text-xs" placeholder="0.00" style={iw} /></td>
                <td className="px-1 py-1 border-b"><AmountInput min={0} step="0.01" value={row.montantBrutDinars} onChange={(e) => upd(i,"montantBrutDinars",e.target.value)} className="h-7 px-2 text-xs" placeholder="0.00" style={iw} /></td>
                <td className="px-1 py-1 border-b"><AmountInput min={0} step="0.01" value={row.montantNetDevise} onChange={(e) => upd(i,"montantNetDevise",e.target.value)} className="h-7 px-2 text-xs" placeholder="0.00" style={iw} /></td>
                <td className="px-1 py-1 border-b"><AmountInput min={0} step="0.01" value={row.montantIBS} onChange={(e) => upd(i,"montantIBS",e.target.value)} className="h-7 px-2 text-xs" placeholder="0.00" style={iw} /></td>
                <td className="px-1 py-1 border-b"><AmountInput min={0} step="0.01" value={row.montantNetDinars} onChange={(e) => upd(i,"montantNetDinars",e.target.value)} className="h-7 px-2 text-xs" placeholder="0.00" style={iw} /></td>
                <td className="px-2 py-1 text-center border-b">
                  <button type="button" onClick={() => removeRow(i)} disabled={rows.length === 1}
                    className="text-emerald-400 hover:text-emerald-600 disabled:opacity-30"><Trash2 size={13} /></button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-green-100 font-semibold">
              <td colSpan={2} className="px-3 py-2 text-xs text-right border-t">TOTAL</td>
              <td className="px-3 py-2 text-xs border-t text-right">{fmt(s("montantBrutDevise"))}</td>
              <td className="px-3 py-2 text-xs border-t text-right">{fmt(s("tauxChange"))}</td>
              <td className="px-3 py-2 text-xs border-t text-right">{fmt(s("montantBrutDinars"))}</td>
              <td className="px-3 py-2 text-xs border-t text-right">{fmt(s("montantNetDevise"))}</td>
              <td className="px-3 py-2 text-xs border-t text-right">{fmt(s("montantIBS"))}</td>
              <td className="px-3 py-2 text-xs border-t text-right">{fmt(s("montantNetDinars"))}</td>
              <td className="border-t" />
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="flex justify-between items-center">
        <Button type="button" variant="outline" size="sm" onClick={addRow}
          className="gap-1.5 text-xs border-green-500 text-green-600 hover:bg-green-50">
          <Plus size={13} /> Ajouter une ligne
        </Button>
        <Button size="sm" onClick={onSave} disabled={isSubmitting}
          className="gap-1.5" style={{ backgroundColor: PRIMARY_COLOR, color: "white" }}>
          <Save size={13} /> {isSubmitting ? "Enregistrement" : "Enregistrer"}
        </Button>
      </div>
    </div>
  )
}

// 
// TAB 2 - TAXE DOMICILIATION BANCAIRE SUR FOURNISSEURS ETRANGERS
// 
type Taxe15Row = { numFacture: string; dateFacture: string; raisonSociale: string; montantNetDevise: string; monnaie: string; tauxChange: string; montantDinars: string; tauxTaxe: string; montantAPayer: string }
const EMPTY_TAXE15: Taxe15Row = { numFacture: "", dateFacture: "", raisonSociale: "", montantNetDevise: "", monnaie: "", tauxChange: "", montantDinars: "", tauxTaxe: "", montantAPayer: "" }
interface Tab15Props { rows: Taxe15Row[]; setRows: React.Dispatch<React.SetStateAction<Taxe15Row[]>>; onSave: () => void; isSubmitting: boolean; fournisseurs: FiscalFournisseurOption[] }
function TabTaxeDomicil({ rows, setRows, onSave, isSubmitting, fournisseurs }: Tab15Props) {
  const addRow    = () => setRows((p) => [...p, { ...EMPTY_TAXE15 }])
  const removeRow = (i: number) => setRows((p) => p.filter((_, idx) => idx !== i))
  const upd = (i: number, f: keyof Taxe15Row, v: string) =>
    setRows((prev) => prev.map((r, idx) => idx === i ? { ...r, [f]: v } : r))
  const iw = { minWidth: 110 }
  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-2 py-2 text-center text-xs font-semibold text-gray-400 border-b w-8">#</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">No de Facture</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">Date de la Facture</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">Raison Sociale</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">Montant Net en Devise</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">Monnaie / Devises</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">Taux de Change Date de la Facture</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">Montant Facture en Dinars</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">Taux Taxe...%</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">Montant a Payer en Dinars</th>
              <th className="px-2 py-2 border-b w-8" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                <td className="px-2 py-1 text-center text-xs text-gray-400 border-b">{i + 1}</td>
                <td className="px-1 py-1 border-b"><Input value={row.numFacture} onChange={(e) => upd(i,"numFacture",e.target.value)} className="h-7 px-2 text-xs" placeholder="N° Facture" style={iw} /></td>
                <td className="px-1 py-1 border-b"><Input type="date" value={row.dateFacture} onChange={(e) => upd(i,"dateFacture",e.target.value)} className="h-7 px-2 text-xs" style={iw} /></td>
                <td className="px-1 py-1 border-b">
                  <SupplierSearchSelect
                    value={String(fournisseurs.find((f) => safeString(f.raisonSociale).trim() === safeString(row.raisonSociale).trim())?.id ?? "")}
                    onChange={(supplierId) => {
                      const selected = fournisseurs.find((f) => String(f.id) === supplierId)
                      upd(i, "raisonSociale", selected?.raisonSociale ?? "")
                    }}
                    fournisseurs={fournisseurs}
                    placeholder={row.raisonSociale?.trim() || "Raison Sociale"}
                    triggerClassName="h-7 min-w-[150px] px-2 text-xs"
                  />
                </td>
                <td className="px-1 py-1 border-b"><AmountInput min={0} step="0.01" value={row.montantNetDevise} onChange={(e) => upd(i,"montantNetDevise",e.target.value)} className="h-7 px-2 text-xs" placeholder="0.00" style={iw} /></td>
                <td className="px-1 py-1 border-b"><Input value={row.monnaie} onChange={(e) => upd(i,"monnaie",e.target.value)} className="h-7 px-2 text-xs" placeholder="EUR / USD" style={{ minWidth: 80 }} /></td>
                <td className="px-1 py-1 border-b"><AmountInput min={0} step="0.01" value={row.tauxChange} onChange={(e) => upd(i,"tauxChange",e.target.value)} className="h-7 px-2 text-xs" placeholder="0.00" style={iw} /></td>
                <td className="px-1 py-1 border-b"><AmountInput min={0} step="0.01" value={row.montantDinars} onChange={(e) => upd(i,"montantDinars",e.target.value)} className="h-7 px-2 text-xs" placeholder="0.00" style={iw} /></td>
                <td className="px-1 py-1 border-b"><Input value={row.tauxTaxe} onChange={(e) => upd(i,"tauxTaxe",e.target.value)} className="h-7 px-2 text-xs" placeholder="Taux %" style={{ minWidth: 80 }} /></td>
                <td className="px-1 py-1 border-b"><AmountInput min={0} step="0.01" value={row.montantAPayer} onChange={(e) => upd(i,"montantAPayer",e.target.value)} className="h-7 px-2 text-xs" placeholder="0.00" style={iw} /></td>
                <td className="px-2 py-1 text-center border-b">
                  <button type="button" onClick={() => removeRow(i)} disabled={rows.length === 1}
                    className="text-emerald-400 hover:text-emerald-600 disabled:opacity-30"><Trash2 size={13} /></button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-green-100 font-semibold">
              <td colSpan={4} className="px-3 py-2 text-xs text-right border-t">TOTAL</td>
              <td className="px-3 py-2 text-xs border-t text-right">{fmt(rows.reduce((s,r)=>s+num(r.montantNetDevise),0))}</td>
              <td className="border-t" />
              <td className="px-3 py-2 text-xs border-t text-right">{fmt(rows.reduce((s,r)=>s+num(r.tauxChange),0))}</td>
              <td className="px-3 py-2 text-xs border-t text-right">{fmt(rows.reduce((s,r)=>s+num(r.montantDinars),0))}</td>
              <td className="border-t" />
              <td className="px-3 py-2 text-xs border-t text-right">{fmt(rows.reduce((s,r)=>s+num(r.montantAPayer),0))}</td>
              <td className="border-t" />
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="flex justify-between items-center">
        <Button type="button" variant="outline" size="sm" onClick={addRow}
          className="gap-1.5 text-xs border-green-500 text-green-600 hover:bg-green-50">
          <Plus size={13} /> Ajouter une ligne
        </Button>
        <Button size="sm" onClick={onSave} disabled={isSubmitting}
          className="gap-1.5" style={{ backgroundColor: PRIMARY_COLOR, color: "white" }}>
          <Save size={13} /> {isSubmitting ? "Enregistrement" : "Enregistrer"}
        </Button>
      </div>
    </div>
  )
}

// 
// TAB 3 - TVA AUTO LIQUIDATION SUR FOURNISSEURS ETRANGERS
// 
type Tva16Row = { numFacture: string; montantBrutDevise: string; tauxChange: string; montantBrutDinars: string; tva19: string }
const EMPTY_TVA16: Tva16Row = { numFacture: "", montantBrutDevise: "", tauxChange: "", montantBrutDinars: "", tva19: "" }
interface Tab16Props { rows: Tva16Row[]; setRows: React.Dispatch<React.SetStateAction<Tva16Row[]>>; onSave: () => void; isSubmitting: boolean }
function TabTvaAutoLiq({ rows, setRows, onSave, isSubmitting }: Tab16Props) {
  const addRow    = () => setRows((p) => [...p, { ...EMPTY_TVA16 }])
  const removeRow = (i: number) => setRows((p) => p.filter((_, idx) => idx !== i))
  const upd = (i: number, f: keyof Tva16Row, v: string) =>
    setRows((prev) => prev.map((r, idx) => idx === i ? { ...r, [f]: v } : r))
  const iw = { minWidth: 130 }
  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-2 py-2 text-center text-xs font-semibold text-gray-400 border-b w-8">#</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">No de Facture</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">Montant Brut en Devises</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">Taux de Change Date de la Facture</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">Montant Brut en Dinars</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">TVA 19%</th>
              <th className="px-2 py-2 border-b w-8" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                <td className="px-2 py-1 text-center text-xs text-gray-400 border-b">{i + 1}</td>
                <td className="px-1 py-1 border-b"><Input value={row.numFacture} onChange={(e) => upd(i,"numFacture",e.target.value)} className="h-7 px-2 text-xs" placeholder="N° Facture" style={iw} /></td>
                <td className="px-1 py-1 border-b"><AmountInput min={0} step="0.01" value={row.montantBrutDevise} onChange={(e) => upd(i,"montantBrutDevise",e.target.value)} className="h-7 px-2 text-xs" placeholder="0.00" style={iw} /></td>
                <td className="px-1 py-1 border-b"><AmountInput min={0} step="0.01" value={row.tauxChange} onChange={(e) => upd(i,"tauxChange",e.target.value)} className="h-7 px-2 text-xs" placeholder="0.00" style={iw} /></td>
                <td className="px-1 py-1 border-b"><AmountInput min={0} step="0.01" value={row.montantBrutDinars} onChange={(e) => upd(i,"montantBrutDinars",e.target.value)} className="h-7 px-2 text-xs" placeholder="0.00" style={iw} /></td>
                <td className="px-1 py-1 border-b"><AmountInput min={0} step="0.01" value={row.tva19} onChange={(e) => upd(i,"tva19",e.target.value)} className="h-7 px-2 text-xs" placeholder="0.00" style={iw} /></td>
                <td className="px-2 py-1 text-center border-b">
                  <button type="button" onClick={() => removeRow(i)} disabled={rows.length === 1}
                    className="text-emerald-400 hover:text-emerald-600 disabled:opacity-30"><Trash2 size={13} /></button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-green-100 font-semibold">
              <td colSpan={2} className="px-3 py-2 text-xs text-right border-t">TOTAL</td>
              <td className="px-3 py-2 text-xs border-t text-right">{fmt(rows.reduce((s,r)=>s+num(r.montantBrutDevise),0))}</td>
              <td className="px-3 py-2 text-xs border-t text-right">{fmt(rows.reduce((s,r)=>s+num(r.tauxChange),0))}</td>
              <td className="px-3 py-2 text-xs border-t text-right">{fmt(rows.reduce((s,r)=>s+num(r.montantBrutDinars),0))}</td>
              <td className="px-3 py-2 text-xs border-t text-right">{fmt(rows.reduce((s,r)=>s+num(r.tva19),0))}</td>
              <td className="border-t" />
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="flex justify-between items-center">
        <Button type="button" variant="outline" size="sm" onClick={addRow}
          className="gap-1.5 text-xs border-green-500 text-green-600 hover:bg-green-50">
          <Plus size={13} /> Ajouter une ligne
        </Button>
        <Button size="sm" onClick={onSave} disabled={isSubmitting}
          className="gap-1.5" style={{ backgroundColor: PRIMARY_COLOR, color: "white" }}>
          <Save size={13} /> {isSubmitting ? "Enregistrement" : "Enregistrer"}
        </Button>
      </div>
    </div>
  )
}

const normalizeIbsRows = (rows?: Ibs14Row[]) => {
  const normalized = (rows ?? []).map((row) => {
    const source = row as Partial<Ibs14Row>
    return {
      ...EMPTY_IBS14,
      numFacture: safeString(source.numFacture),
      montantBrutDevise: safeString(source.montantBrutDevise),
      tauxChange: safeString(source.tauxChange),
      montantBrutDinars: safeString(source.montantBrutDinars),
      montantNetDevise: safeString(source.montantNetDevise),
      montantIBS: safeString(source.montantIBS),
      montantNetDinars: safeString(source.montantNetDinars),
    }
  })
  return normalized.length > 0 ? normalized : [{ ...EMPTY_IBS14 }]
}

const normalizeTaxe15Rows = (rows?: Taxe15Row[]) => {
  const normalized = (rows ?? []).map((row) => {
    const source = row as Partial<Taxe15Row>
    return {
      ...EMPTY_TAXE15,
      numFacture: safeString(source.numFacture),
      dateFacture: safeString(source.dateFacture),
      raisonSociale: safeString(source.raisonSociale),
      montantNetDevise: safeString(source.montantNetDevise),
      monnaie: safeString(source.monnaie),
      tauxChange: safeString(source.tauxChange),
      montantDinars: safeString(source.montantDinars),
      tauxTaxe: safeString(source.tauxTaxe),
      montantAPayer: safeString(source.montantAPayer),
    }
  })
  return normalized.length > 0 ? normalized : [{ ...EMPTY_TAXE15 }]
}

const normalizeTva16Rows = (rows?: Tva16Row[]) => {
  const normalized = (rows ?? []).map((row) => {
    const source = row as Partial<Tva16Row>
    return {
      ...EMPTY_TVA16,
      numFacture: safeString(source.numFacture),
      montantBrutDevise: safeString(source.montantBrutDevise),
      tauxChange: safeString(source.tauxChange),
      montantBrutDinars: safeString(source.montantBrutDinars),
      tva19: safeString(source.tva19),
    }
  })
  return normalized.length > 0 ? normalized : [{ ...EMPTY_TVA16 }]
}

const TABS = [
  { key: "ibs", label: "IBS Fournisseurs Etrangers", title: "IBS SUR FOURNISSEURS ETRANGERS" },
  { key: "taxe_domicil", label: "Taxe Domiciliation", title: "TAXE DOMICILIATION BANCAIRE SUR FOURNISSEURS ETRANGERS" },
  { key: "tva_autoliq", label: "TVA Auto Liquidation", title: "TVA AUTO LIQUIDATION SUR FOURNISSEURS ETRANGERS" },
]

const MONTHS = [
  { value: "01", label: "Janvier" },
  { value: "02", label: "Fevrier" },
  { value: "03", label: "Mars" },
  { value: "04", label: "Avril" },
  { value: "05", label: "Mai" },
  { value: "06", label: "Juin" },
  { value: "07", label: "Juillet" },
  { value: "08", label: "Aout" },
  { value: "09", label: "Septembre" },
  { value: "10", label: "Octobre" },
  { value: "11", label: "Novembre" },
  { value: "12", label: "Decembre" },
]

const YEARS = Array.from({ length: 10 }, (_, i) => String(new Date().getFullYear() - 2 + i))

type ApiFiscalDeclaration = {
  id: number
  tabKey: string
  mois: string
  annee: string
  direction: string
  dataJson?: string
  isApproved?: boolean
  statut?: string
}

const parseFiscalDataPayload = (dataJson?: string): Record<string, unknown> => {
  try {
    const parsed = JSON.parse(dataJson ?? "{}")
    if (parsed && typeof parsed === "object") {
      return parsed as Record<string, unknown>
    }
  } catch {
    return {}
  }
  return {}
}

export default function DeclarationFournisseurPage() {
  const { user, isLoading, status } = useAuth({ requireAuth: true, redirectTo: "/login" })
  const { toast } = useToast()
  const router = useRouter()

  const currentPeriod = getCurrentFiscalPeriod()
  const [activeTab, setActiveTab] = useState("ibs")
  const [mois, setMois] = useState(currentPeriod.mois)
  const [annee, setAnnee] = useState(currentPeriod.annee)
  const [direction, setDirection] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingDeclarationId, setEditingDeclarationId] = useState<string | null>(null)
  const [editingCreatedAt, setEditingCreatedAt] = useState<string | null>(null)

  const [ibs14Rows, setIbs14Rows] = useState<Ibs14Row[]>([{ ...EMPTY_IBS14 }])
  const [ibsFournisseurId, setIbsFournisseurId] = useState("")
  const [taxe15Rows, setTaxe15Rows] = useState<Taxe15Row[]>([{ ...EMPTY_TAXE15 }])
  const [tva16Rows, setTva16Rows] = useState<Tva16Row[]>([{ ...EMPTY_TVA16 }])
  const [tva16FournisseurId, setTva16FournisseurId] = useState("")

  const [fiscalFournisseurs, setFiscalFournisseurs] = useState<FiscalFournisseurOption[]>([])
  const [regions, setRegions] = useState<{ id: number; name: string }[]>([])
  const [fiscalDeclarations, setFiscalDeclarations] = useState<ApiFiscalDeclaration[]>([])

  useEffect(() => {
    const token = typeof localStorage !== "undefined" ? localStorage.getItem("jwt") : null
    fetch(`${API_BASE}/api/regions`, {
      credentials: "include",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((data: { id: number; name: string }[]) => setRegions(data))
      .catch(() => {})
  }, [])

  useEffect(() => {
    const token = typeof localStorage !== "undefined" ? localStorage.getItem("jwt") : null
    fetch(`${API_BASE}/api/fiscal-fournisseurs`, {
      credentials: "include",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((data: unknown) => {
        const list: FiscalFournisseurOption[] = Array.isArray(data)
          ? data.map(normalizeFiscalFournisseurOption).filter((x): x is FiscalFournisseurOption => x !== null)
          : []
        setFiscalFournisseurs(list)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!user || status !== "authenticated") {
      setFiscalDeclarations([])
      return
    }
    let cancelled = false
    const loadDeclarations = async () => {
      try {
        const token = typeof localStorage !== "undefined" ? localStorage.getItem("jwt") : null
        const response = await fetch(`${API_BASE}/api/fiscal`, {
          method: "GET",
          credentials: "include",
          cache: "no-store",
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        })
        if (!response.ok) {
          if (!cancelled) setFiscalDeclarations([])
          return
        }
        const payload = await response.json().catch(() => null)
        const declarations = Array.isArray(payload)
          ? payload.map((item) => {
              const status = String((item as { statut?: unknown }).statut ?? "").trim().toUpperCase()
              const isApprovedFromStatus = status ? status === "APPROVED" : null
              return {
                id: Number((item as { id?: unknown }).id ?? 0),
                tabKey: String((item as { tabKey?: unknown }).tabKey ?? "").trim().toLowerCase(),
                mois: String((item as { mois?: unknown }).mois ?? "").trim(),
                annee: String((item as { annee?: unknown }).annee ?? "").trim(),
                direction: String((item as { direction?: unknown }).direction ?? "").trim(),
                dataJson: String((item as { dataJson?: unknown }).dataJson ?? "{}"),
                isApproved: isApprovedFromStatus ?? ((item as { isApproved?: unknown }).isApproved === false ? false : true),
              }
            })
          : []
        if (!cancelled) {
          setFiscalDeclarations(declarations)
        }
      } catch {
        if (!cancelled) setFiscalDeclarations([])
      }
    }
    loadDeclarations()
    return () => { cancelled = true }
  }, [status, user])

  const existingDeclarationMatch = useMemo(() => {
    if (!activeTab || !mois || !annee || !direction) return null
    const expectedDirection = direction.trim().toLowerCase()
    const selectedIbsId = safeString(ibsFournisseurId).trim()
    const selectedTva16Id = safeString(tva16FournisseurId).trim()
    return fiscalDeclarations.find((declaration) => {
      if (editingDeclarationId && String(declaration.id) === safeString(editingDeclarationId)) return false
      if (declaration.tabKey !== activeTab) return false
      if (declaration.mois !== mois) return false
      if (declaration.annee !== annee) return false
      if (declaration.direction.trim().toLowerCase() !== expectedDirection) return false
      if (activeTab === "ibs") {
        const payload = parseFiscalDataPayload(declaration.dataJson ?? "{}")
        return safeString(payload.ibsFournisseurId).trim() === selectedIbsId
      }
      if (activeTab === "tva_autoliq") {
        const payload = parseFiscalDataPayload(declaration.dataJson ?? "{}")
        return safeString(payload.tva16FournisseurId).trim() === selectedTva16Id
      }
      return true
    }) ?? null
  }, [activeTab, annee, direction, editingDeclarationId, fiscalDeclarations, ibsFournisseurId, mois, tva16FournisseurId])

  const handleSave = async () => {
    const saveDirection = direction
    if (!saveDirection) {
      toast({ title: "Direction requise", description: "Veuillez saisir la direction avant d'enregistrer.", variant: "destructive" })
      return
    }
    if (!mois) {
      toast({ title: "Mois requis", description: "Veuillez selectionner le mois avant d'enregistrer.", variant: "destructive" })
      return
    }
    if (!annee) {
      toast({ title: "Annee requise", description: "Veuillez selectionner l'annee avant d'enregistrer.", variant: "destructive" })
      return
    }
    if (isFiscalPeriodLocked(mois, annee, user?.role ?? "")) {
      toast({
        title: "Periode cloturee",
        description: `${getFiscalPeriodLockMessage(mois, annee, user?.role ?? "")} Aucune creation ou modification n'est autorisee.`,
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    await new Promise((r) => setTimeout(r, 400))

    const declarationId = editingDeclarationId ?? Date.now().toString()
    const declarationCreatedAt = editingCreatedAt || new Date().toISOString()

    const baseDecl = {
      id: declarationId,
      createdAt: declarationCreatedAt,
      direction: saveDirection,
      mois,
      annee,
      ibs14Rows: [] as Ibs14Row[],
      ibsFournisseurId: "",
      taxe15Rows: [] as Taxe15Row[],
      tva16Rows: [] as Tva16Row[],
      tva16FournisseurId: "",
    }

    switch (activeTab) {
      case "ibs":
        baseDecl.ibs14Rows = ibs14Rows
        baseDecl.ibsFournisseurId = ibsFournisseurId
        break
      case "taxe_domicil":
        baseDecl.taxe15Rows = taxe15Rows
        break
      case "tva_autoliq":
        baseDecl.tva16Rows = tva16Rows
        baseDecl.tva16FournisseurId = tva16FournisseurId
        break
    }

    try {
      let existingDeclarations: Record<string, unknown>[] = []
      try {
        const parsed = JSON.parse(localStorage.getItem("fiscal_declarations") ?? "[]")
        existingDeclarations = Array.isArray(parsed) ? parsed : []
      } catch { /* */ }
      const originalDeclaration = editingDeclarationId
        ? existingDeclarations.find((item) => safeString(item.id) === editingDeclarationId) ?? null
        : null

      if (editingDeclarationId) {
        const hasTarget = existingDeclarations.some((item) => safeString(item.id) === editingDeclarationId)
        const updated = hasTarget
          ? existingDeclarations.map((item) => (safeString(item.id) === editingDeclarationId ? baseDecl : item))
          : [baseDecl, ...existingDeclarations]
        localStorage.setItem("fiscal_declarations", JSON.stringify(updated))
      } else {
        localStorage.setItem("fiscal_declarations", JSON.stringify([baseDecl, ...existingDeclarations]))
      }
    } catch { /* */ }

    try {
      const apiBase = API_BASE
      const token = typeof localStorage !== "undefined" ? localStorage.getItem("jwt") : null
      let tabData: unknown = {}
      switch (activeTab) {
        case "ibs":            tabData = { ibs14Rows, ibsFournisseurId }; break
        case "taxe_domicil":   tabData = { taxe15Rows }; break
        case "tva_autoliq":    tabData = { tva16Rows, tva16FournisseurId }; break
      }
      const requestPayload = {
        tabKey: activeTab,
        mois,
        annee,
        direction: saveDirection,
        dataJson: JSON.stringify(tabData),
      }

      if (editingDeclarationId) {
        const deleteResponse = await fetch(`${apiBase}/api/fiscal/${encodeURIComponent(editingDeclarationId)}`, {
          method: "DELETE",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        })
        if (!deleteResponse.ok && deleteResponse.status !== 404) {
          setIsSubmitting(false)
          toast({ title: "Erreur de modification", description: "Impossible de mettre a jour la declaration.", variant: "destructive" })
          return
        }
      }

      const createResponse = await fetch(`${apiBase}/api/fiscal`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(requestPayload),
      })

      if (!createResponse.ok) {
        setIsSubmitting(false)
        toast({ title: "Erreur d'enregistrement", description: "Impossible d'enregistrer la declaration.", variant: "destructive" })
        return
      }

      const createdPayload = await createResponse.json().catch(() => null)
      const savedDeclarationId = Number(
        (createdPayload && typeof createdPayload === "object" && "Id" in createdPayload
          ? (createdPayload as { Id?: unknown }).Id
          : undefined) ?? editingDeclarationId ?? declarationId,
      )

      setFiscalDeclarations((prev) => {
        const savedDeclaration: ApiFiscalDeclaration = {
          id: Number.isFinite(savedDeclarationId) ? savedDeclarationId : Number(declarationId),
          tabKey: activeTab,
          mois,
          annee,
          direction: saveDirection,
          dataJson: requestPayload.dataJson,
          isApproved: false,
          statut: "PENDING",
        }
        return [savedDeclaration, ...prev.filter((item) => Number(item.id) !== savedDeclaration.id)]
      })

      const tabLabel = TABS.find((t) => t.key === activeTab)?.label ?? activeTab
      toast({
        title: editingDeclarationId ? "Declaration modifiee" : "Declaration enregistree",
        description: `La declaration "${tabLabel}" a ete sauvegardee avec succes.`,
      })
      setIsSubmitting(false)
      router.push("/fisca_dashbord")
    } catch (error) {
      setIsSubmitting(false)
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de contacter le serveur",
        variant: "destructive",
      })
    }
  }

  if (isLoading || !user || status !== "authenticated") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Chargement...</p>
      </div>
    )
  }

  const userRole = user?.role ?? ""
  const selectableYears = YEARS.filter((year) => MONTHS.some((month) => !isFiscalPeriodLocked(month.value, year, userRole)))

  return (
    <LayoutWrapper user={user}>
      <div className="space-y-5 w-full">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Declaration Fournisseurs Etrangers</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Gerez les declarations IBS, Taxe de Domiciliation et TVA Auto Liquidation.
            </p>
          </div>
        </div>

        <Card className="border border-gray-200">
          <CardContent className="pt-4 pb-3">
            <div className="flex flex-wrap items-end gap-6">
              <div className="space-y-1 flex-1 min-w-[220px]">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Direction</label>
                <Select value={direction} onValueChange={setDirection}>
                  <SelectTrigger className="h-10 text-sm">
                    <SelectValue placeholder="- Selectionner une direction -" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Siege">Siege</SelectItem>
                    {regions.map((r) => <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Mois</label>
                <Select value={mois} onValueChange={setMois}>
                  <SelectTrigger className="h-10 text-sm w-[150px]">
                    <SelectValue placeholder="Mois" />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Annee</label>
                <input
                  type="number"
                  min="2000"
                  max="2100"
                  value={annee}
                  onChange={(e) => setAnnee(e.target.value)}
                  placeholder="Ex: 2026"
                  className="h-10 w-[120px] rounded border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
                />
              </div>
              <div className="space-y-1 flex-1 min-w-[220px]">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Tableau</label>
                <Select value={activeTab} onValueChange={setActiveTab}>
                  <SelectTrigger className="h-10 text-sm">
                    <SelectValue placeholder="Selectionner un tableau" />
                  </SelectTrigger>
                  <SelectContent>
                    {TABS.map((t) => (
                      <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {existingDeclarationMatch && (
              <div className="mt-3 rounded border border-amber-300 bg-amber-50 px-3 py-3 text-xs text-amber-900">
                <p className="font-semibold">Declaration existante detectee pour ces criteres.</p>
                <p className="mt-1">
                  Tableau {TABS.find((tab) => tab.key === existingDeclarationMatch.tabKey)?.label ?? existingDeclarationMatch.tabKey}
                  , periode {MONTHS.find((month) => month.value === existingDeclarationMatch.mois)?.label ?? existingDeclarationMatch.mois} {existingDeclarationMatch.annee}
                  , direction {existingDeclarationMatch.direction || "-"}.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {activeTab === "ibs" && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-sm font-semibold" style={{ color: PRIMARY_COLOR }}>IBS sur Fournisseurs Etrangers</CardTitle>
                <SupplierSearchSelect
                  value={ibsFournisseurId}
                  onChange={setIbsFournisseurId}
                  fournisseurs={fiscalFournisseurs}
                  placeholder="Selectionner un fournisseur"
                  triggerClassName="h-8 min-w-[260px] px-2 text-xs"
                />
              </div>
            </CardHeader>
            <CardContent>
              <TabIBS rows={ibs14Rows} setRows={setIbs14Rows} onSave={handleSave} isSubmitting={isSubmitting} />
            </CardContent>
          </Card>
        )}

        {activeTab === "taxe_domicil" && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold" style={{ color: PRIMARY_COLOR }}>Taxe Domiciliation Bancaire</CardTitle>
            </CardHeader>
            <CardContent>
              <TabTaxeDomicil rows={taxe15Rows} setRows={setTaxe15Rows} onSave={handleSave} isSubmitting={isSubmitting} fournisseurs={fiscalFournisseurs} />
            </CardContent>
          </Card>
        )}

        {activeTab === "tva_autoliq" && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-sm font-semibold" style={{ color: PRIMARY_COLOR }}>TVA Auto Liquidation</CardTitle>
                <SupplierSearchSelect
                  value={tva16FournisseurId}
                  onChange={setTva16FournisseurId}
                  fournisseurs={fiscalFournisseurs}
                  placeholder="Selectionner un fournisseur"
                  triggerClassName="h-8 min-w-[260px] px-2 text-xs"
                />
              </div>
            </CardHeader>
            <CardContent>
              <TabTvaAutoLiq rows={tva16Rows} setRows={setTva16Rows} onSave={handleSave} isSubmitting={isSubmitting} />
            </CardContent>
          </Card>
        )}
      </div>
    </LayoutWrapper>
  )
}

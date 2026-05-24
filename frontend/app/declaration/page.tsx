"use client"

import { useState, useCallback, useMemo, useRef, useEffect } from "react"
import { LayoutWrapper } from "@/components/layout-wrapper"
import { useAuth } from "@/hooks/use-auth"
import { useWilayasCommunes } from "@/hooks/use-wilayas-communes"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { Building2, CalendarDays, Plus, Trash2, Save, Check, ChevronsUpDown } from "lucide-react"
import { AccessDeniedDialog } from "@/components/access-denied-dialog"
import { getCurrentFiscalPeriod, getFiscalPeriodLockMessage, isFiscalPeriodLocked } from "@/lib/fiscal-period-deadline"
import { getManageableFiscalTabKeysForDirection, isAdminFiscalRole, isFinanceFiscalRole, isRegionalFiscalRole, isFiscalTabDisabledByPolicy } from "@/lib/fiscal-tab-access"
import { syncFiscalPolicy } from "@/lib/fiscal-policy"
import { API_BASE } from "@/lib/config"
import { cn } from "@/lib/utils"

// primary colour used by all tables/buttons
const PRIMARY_COLOR = "#2db34b"

// 
// HELPERS
// 
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

  // Preserve in-progress negative typing states so users can start with "-".
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

// 
// TAB 1 - ENCAISSEMENT  (controlled)
// Encaissement: HT, TVA, TTC
// 
type EncRow = { designation: string; ht: string; ttc?: string }

const FIXED_ENCAISSEMENT_DESIGNATIONS = [
  "POST/PRE PAID VI/VD 19%",
  "CHIFFRE D'AFFAIRES EXONERE",
] as const

const FIXED_ENCAISSEMENT_ROWS: EncRow[] = FIXED_ENCAISSEMENT_DESIGNATIONS.map((designation) => ({
  designation,
  ht: "",
}))

interface Tab1Props { rows: EncRow[]; setRows: React.Dispatch<React.SetStateAction<EncRow[]>>
  onSave: () => void;
  isSubmitting: boolean;
}


function TabEncaissement({ rows, setRows, onSave, isSubmitting }: Tab1Props) {
  const update = (i: number, field: keyof EncRow, val: string) =>
    setRows((p) => p.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)))

  const updatePostPrepaidFromTTC = (i: number, ttcValue: string) => {
    if (i !== 0) return
    const ttc = num(ttcValue)
    const ht = ttc / 1.19
    setRows((p) =>
      p.map((r, idx) =>
        idx === i ? { ...r, ht: ht.toFixed(2), ttc: ttcValue } : r
      )
    )
  }

  const updateExonereFromHT = (i: number, htValue: string) => {
    if (i !== 1) return
    setRows((p) =>
      p.map((r, idx) =>
        idx === i ? { ...r, ht: htValue } : r
      )
    )
  }

  const updateFromTTC = (i: number, ttcValue: string) => {
    if (i < 2) return
    const ttc = num(ttcValue)
    const ht = ttc / 1.19
    setRows((p) =>
      p.map((r, idx) =>
        idx === i ? { ...r, ht: ht.toFixed(2), ttc: ttcValue } : r
      )
    )
  }

  const totals = useMemo(() => {
    const ht = rows.reduce((s, r) => s + num(r.ht), 0)
    const tva = rows.reduce((s, r, idx) => {
      if (idx === 1) return s + 0
      return s + (num(r.ht) * 0.19)
    }, 0)
    return { ht, tva, ttc: ht + tva }
  }, [rows])

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-2 py-2 text-center text-xs font-semibold text-gray-400 border-b w-8">#</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">DESIGNATIONS</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">ENCAISSEMENTS HT</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">TVA</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">ENCAISSEMENTS TTC</th>
              <th className="px-2 py-2 border-b w-8" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const isExonere = i === 1
              const ht = num(row.ht)
              const tva = isExonere ? 0 : ht * 0.19
              const ttc = isExonere ? ht : ht + tva

              return (
                <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className="px-2 py-1 text-center text-xs text-gray-400 border-b">{i + 1}</td>
                  <td className="px-1 py-1 border-b">
                    <Input
                      value={row.designation}
                      readOnly
                      className="h-7 px-2 text-xs bg-gray-50"
                      placeholder="Designation"
                      style={{ minWidth: 200 }}
                    />
                  </td>

                  {/* Colonne HT */}
                  <td className="px-1 py-1 border-b">
                    {isExonere ? (
                      // EXONERE : saisie directe en HT avec AmountInput
                      <AmountInput
                        min={0}
                        step="0.01"
                        value={row.ht}
                        onChange={(e) => updateExonereFromHT(i, e.target.value)}
                        className="h-7 px-2 text-xs"
                        placeholder="0,00"
                        style={{ minWidth: 130 }}
                      />
                    ) : (
                      // Autres lignes : HT calculé, lecture seule
                      <Input
                        value={ht === 0 ? "" : fmt(ht)}
                        readOnly
                        className="h-7 px-2 text-xs bg-gray-100"
                        placeholder="0,00"
                        style={{ minWidth: 130 }}
                      />
                    )}
                  </td>

                  {/* Colonne TVA */}
                  <td className="px-1 py-1 border-b">
                    <Input
                      value={tva === 0 ? "" : fmt(tva)}
                      readOnly
                      className="h-7 px-2 text-xs bg-gray-100"
                      placeholder="0,00"
                      style={{ minWidth: 130 }}
                    />
                  </td>

                  {/* Colonne TTC */}
                  <td className="px-1 py-1 border-b">
                    {isExonere ? (
                      // EXONERE : TTC = HT, lecture seule
                      <Input
                        value={ttc === 0 ? "" : fmt(ttc)}
                        readOnly
                        className="h-7 px-2 text-xs bg-gray-100"
                        placeholder="0,00"
                        style={{ minWidth: 130 }}
                      />
                    ) : i === 0 ? (
                      // POST/PRE PAID : saisie TTC avec AmountInput
                      <AmountInput
                        min={0}
                        step="0.01"
                        value={row.ttc ?? (ht === 0 ? "" : fmt(ttc))}
                        onChange={(e) => updatePostPrepaidFromTTC(i, e.target.value)}
                        className="h-7 px-2 text-xs"
                        placeholder="0,00"
                        style={{ minWidth: 130 }}
                      />
                    ) : (
                      // Autres lignes : saisie TTC avec AmountInput
                      <AmountInput
                        min={0}
                        step="0.01"
                        value={row.ttc ?? (ht === 0 ? "" : fmt(ttc))}
                        onChange={(e) => updateFromTTC(i, e.target.value)}
                        className="h-7 px-2 text-xs"
                        placeholder="0,00"
                        style={{ minWidth: 130 }}
                      />
                    )}
                  </td>

                  <td className="px-2 py-1 text-center border-b text-gray-300">-</td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="bg-green-100 font-semibold">
              <td colSpan={2} className="px-3 py-2 text-xs text-right border-t">TOTAL</td>
              <td className="px-3 py-2 text-xs border-t text-right">{totals.ht === 0 ? "" : fmt(totals.ht)}</td>
              <td className="px-3 py-2 text-xs text-gray-700 border-t text-right">{totals.tva === 0 ? "" : fmt(totals.tva)}</td>
              <td className="px-3 py-2 text-xs text-gray-700 border-t text-right">{totals.ttc === 0 ? "" : fmt(totals.ttc)}</td>
              <td className="border-t" />
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="flex justify-between items-center">
        <Button size="sm" onClick={onSave} disabled={isSubmitting}
          className="gap-1.5" style={{ backgroundColor: PRIMARY_COLOR, color: "white" }}>
          <Save size={13} /> {isSubmitting ? "Enregistrement" : "Enregistrer"}
        </Button>
      </div>
    </div>
  )
}

// 
// TAB 2 & 3 - TVA/IMMO  and  TVA/BIENS & SERV (controlled, same structure)
// 
type FiscalFournisseurOption = {
  id: number
  raisonSociale: string
  adresse: string
  nif: string
  authNif: string
  rc: string
  authRc: string
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

type TvaRow = {
  fournisseurId?: string
  nomRaisonSociale: string; adresse: string; nif: string; authNif: string
  numRC: string; authRC: string; numFacture: string; dateFacture: string
  montantHT: string; tva: string; tauxTVA?: TvaRate | ""
}
const EMPTY_TVA: TvaRow = {
  fournisseurId: "",
  nomRaisonSociale: "", adresse: "", nif: "", authNif: "",
  numRC: "", authRC: "", numFacture: "", dateFacture: "",
  montantHT: "", tva: "", tauxTVA: "",
}

const TVA_RATE_OPTIONS = [
  { value: "19", label: "19%" },
  { value: "9", label: "9%" },
] as const

type TvaRate = (typeof TVA_RATE_OPTIONS)[number]["value"]

const normalizeTvaRate = (value?: string): TvaRate | "" => {
  if (value === "19" || value === "9") return value
  return ""
}

const calculateTvaFromRate = (montantHT: string, tauxTVA?: string) => {
  const rate = normalizeTvaRate(tauxTVA)
  return rate ? num(montantHT) * (Number(rate) / 100) : 0
}

const getTvaAmount = (row: TvaRow, useRateSelection: boolean) => {
  const rate = normalizeTvaRate(row.tauxTVA)
  if (useRateSelection && rate) {
    return calculateTvaFromRate(row.montantHT, rate)
  }
  return num(row.tva)
}

const getTvaRateLabel = (tauxTVA?: string) => {
  const rate = normalizeTvaRate(tauxTVA)
  return rate ? `${rate}%` : "-"
}

const printNullableText = (value: unknown) => {
  const normalized = safeString(value).trim()
  return normalized === "0" ? "" : normalized
}

const safeString = (value: unknown) => {
  if (typeof value === "string") return value
  if (value === null || value === undefined) return ""
  return String(value)
}

const asArrayPayload = (value: unknown): unknown[] => {
  if (Array.isArray(value)) return value
  if (!value || typeof value !== "object") return []

  const raw = value as Record<string, unknown>
  if (Array.isArray(raw.$values)) return raw.$values
  if (Array.isArray(raw.items)) return raw.items
  if (Array.isArray(raw.data)) return raw.data
  return []
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

interface Tab23Props { rows: TvaRow[]; setRows: React.Dispatch<React.SetStateAction<TvaRow[]>>;
  onSave: () => void;
  isSubmitting: boolean;
  fournisseurs: FiscalFournisseurOption[];
  withSelectableRate?: boolean;
  mois: string;
  annee: string;
}

function TabTVAEtat({ rows, setRows, onSave, isSubmitting, fournisseurs, withSelectableRate = false, mois, annee }: Tab23Props) {
  const addRow    = () => setRows((p) => [...p, { ...EMPTY_TVA }])
  const removeRow = (i: number) => setRows((p) => p.filter((_, idx) => idx !== i))
  const toSupplierValue = (value: string | undefined | null) => {
    const normalized = safeString(value).trim()
    return normalized ? normalized : "0"
  }
  const update    = (i: number, field: keyof TvaRow, val: string) =>
    setRows((p) =>
      p.map((r, idx) => {
        if (idx !== i) return r
        const next = { ...r, [field]: val } as TvaRow
        if (withSelectableRate && (field === "montantHT" || field === "tauxTVA")) {
          const rate = normalizeTvaRate(next.tauxTVA)
          next.tva = next.montantHT && rate ? calculateTvaFromRate(next.montantHT, rate).toFixed(2) : ""
        }
        return next
      }),
    )

  const isInvoiceDateTooOld = (value: string, periodMonth: string, periodYear: string) => {
    const trimmedValue = value.trim()
    if (!trimmedValue) return false

    const [yearText, monthText] = trimmedValue.split("-")
    const invoiceYear = Number(yearText)
    const invoiceMonth = Number(monthText)
    const periodYearNumber = Number(periodYear)
    const periodMonthNumber = Number(periodMonth)

    if (!Number.isFinite(invoiceYear) || !Number.isFinite(invoiceMonth)) return false
    if (!Number.isFinite(periodYearNumber) || !Number.isFinite(periodMonthNumber)) return false
    if (invoiceMonth < 1 || invoiceMonth > 12 || periodMonthNumber < 1 || periodMonthNumber > 12) return false

    const invoiceTotalMonths = invoiceYear * 12 + invoiceMonth
    const periodTotalMonths = periodYearNumber * 12 + periodMonthNumber
    return periodTotalMonths - invoiceTotalMonths > 13
  }

  const handleDateChange = (i: number, value: string) => {
    update(i, "dateFacture", value)
  }

  const selectFournisseur = (i: number, fournisseurId: string) =>
    setRows((p) =>
      p.map((r, idx) => {
        if (idx !== i) return r
        const selected = fournisseurs.find((f) => String(f.id) === fournisseurId)
        if (!selected) {
          return {
            ...r,
            fournisseurId: "",
            nomRaisonSociale: "",
            adresse: "",
            nif: "",
            authNif: "",
            numRC: "",
            authRC: "",
          }
        }
        return {
          ...r,
          fournisseurId,
          nomRaisonSociale: toSupplierValue(selected.raisonSociale),
          adresse: toSupplierValue(selected.adresse),
          nif: toSupplierValue(selected.nif),
          authNif: toSupplierValue(selected.authNif),
          numRC: toSupplierValue(selected.rc),
          authRC: toSupplierValue(selected.authRc),
        }
      }),
    )

  const totalHT  = rows.reduce((s, r) => s + num(r.montantHT), 0)
  const totalTVA = rows.reduce((s, r) => s + getTvaAmount(r, withSelectableRate), 0)
  const totalTTC = totalHT + totalTVA

  const headers = [
    "Nom Prenom / Raison Sociale", "Adresse", "NIF", "Auth. NIF",
    "N° RC", "Auth. N° RC", "N° Facture", "Date",
    "Montant HT", ...(withSelectableRate ? ["Taux TVA"] : []), "TVA", "Montant TTC",
  ]

  const hasOldInvoice = rows.some((row) => isInvoiceDateTooOld(safeString(row.dateFacture), mois, annee))

  const handleSave = () => {
    if (hasOldInvoice) return
    onSave()
  }

  return (
    <div className="space-y-3">
      {hasOldInvoice && (
        <div className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          La taxe dont la déduction a été omise peut être portée sur les déclarations ultérieures jusqu'au 20 décembre de l'année qui suit celle de l'omission. (Art. 30 du CTCA)
        </div>
      )}
      <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-2 py-2 text-center text-xs font-semibold text-gray-400 border-b w-8">#</th>
              {headers.map((h) => (
                <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b whitespace-nowrap">{h}</th>
              ))}
              <th className="px-2 py-2 border-b w-8" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const currentRow: TvaRow = { ...EMPTY_TVA, ...row, fournisseurId: row.fournisseurId ?? "" }
              const rowTva = getTvaAmount(currentRow, withSelectableRate)
              const ttc = num(currentRow.montantHT) + rowTva
              const supplierPlaceholder = currentRow.nomRaisonSociale?.trim() || "Selectionner"
              return (
                <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className="px-2 py-1 text-center text-xs text-gray-400 border-b">{i + 1}</td>
                  <td className="px-1 py-1 border-b">
                    <SupplierSearchSelect
                      value={currentRow.fournisseurId ?? ""}
                      onChange={(supplierId) => selectFournisseur(i, supplierId)}
                      fournisseurs={fournisseurs}
                      placeholder={supplierPlaceholder}
                      triggerClassName="h-7 min-w-[220px] px-2 text-xs"
                    />
                  </td>
                  <td className="px-1 py-1 border-b"><Input value={currentRow.adresse ?? ""} readOnly className="h-7 px-2 text-xs bg-gray-50" style={{ minWidth: 150 }} placeholder="Auto" /></td>
                  <td className="px-1 py-1 border-b"><Input value={currentRow.nif ?? ""} readOnly className="h-7 px-2 text-xs bg-gray-50" style={{ minWidth: 110 }} placeholder="Auto" /></td>
                  <td className="px-1 py-1 border-b"><Input value={currentRow.authNif ?? ""} readOnly className="h-7 px-2 text-xs bg-gray-50" style={{ minWidth: 110 }} placeholder="Auto" /></td>
                  <td className="px-1 py-1 border-b"><Input value={currentRow.numRC ?? ""} readOnly className="h-7 px-2 text-xs bg-gray-50" style={{ minWidth: 110 }} placeholder="Auto" /></td>
                  <td className="px-1 py-1 border-b"><Input value={currentRow.authRC ?? ""} readOnly className="h-7 px-2 text-xs bg-gray-50" style={{ minWidth: 110 }} placeholder="Auto" /></td>
                  <td className="px-1 py-1 border-b"><Input value={currentRow.numFacture ?? ""} onChange={(e) => update(i, "numFacture", e.target.value)} className="h-7 px-2 text-xs" style={{ minWidth: 110 }} placeholder="N° Facture" /></td>
                  <td className="px-1 py-1 border-b"><Input type="date" value={currentRow.dateFacture ?? ""} onChange={(e) => handleDateChange(i, e.target.value)} className="h-7 px-2 text-xs" style={{ minWidth: 130 }} /></td>
                  <td className="px-1 py-1 border-b"><AmountInput allowNegative step="0.01" value={currentRow.montantHT ?? ""} onChange={(e) => update(i, "montantHT", e.target.value)} className="h-7 px-2 text-xs" style={{ minWidth: 110 }} placeholder="0.00" /></td>
                  {withSelectableRate && (
                    <td className="px-1 py-1 border-b">
                      <select
                        value={normalizeTvaRate(currentRow.tauxTVA)}
                        onChange={(e) => update(i, "tauxTVA", e.target.value)}
                        className="h-7 rounded border border-gray-200 bg-white px-2 text-xs focus:outline-none focus:ring-2 focus:ring-green-300"
                        style={{ minWidth: 110 }}
                      >
                        <option value="">Taux</option>
                        {TVA_RATE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </td>
                  )}
                  {withSelectableRate ? (
                    <td className="px-3 py-1 border-b text-xs text-right text-gray-700 font-semibold bg-gray-50/50" style={{ minWidth: 110 }}>
                      {currentRow.montantHT && normalizeTvaRate(currentRow.tauxTVA) ? fmt(rowTva) : "-"}
                    </td>
                  ) : (
                    <td className="px-1 py-1 border-b"><AmountInput allowNegative step="0.01" value={currentRow.tva ?? ""} onChange={(e) => update(i, "tva", e.target.value)} className="h-7 px-2 text-xs" style={{ minWidth: 110 }} placeholder="0.00" /></td>
                  )}
                  <td className="px-1 py-1 border-b text-xs text-right pr-3 text-gray-600" style={{ minWidth: 110 }}>{currentRow.montantHT || currentRow.tva ? fmt(ttc) : "-"}</td>
                  <td className="px-2 py-1 text-center border-b">
                    <button type="button" onClick={() => removeRow(i)} disabled={rows.length === 1}
                      className="text-emerald-400 hover:text-emerald-600 disabled:opacity-30"><Trash2 size={13} /></button>
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="bg-green-100 font-semibold">
              <td colSpan={9} className="px-3 py-2 text-xs text-right border-t">TOTAL</td>
              <td className="px-3 py-2 text-xs border-t text-right">{fmt(totalHT)}</td>
              {withSelectableRate && <td className="px-3 py-2 text-xs text-center border-t text-gray-500"></td>}
              <td className="px-3 py-2 text-xs border-t text-right">{fmt(totalTVA)}</td>
              <td className="px-3 py-2 text-xs border-t text-right">{fmt(totalTTC)}</td>
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
        <Button size="sm" onClick={handleSave} disabled={isSubmitting || hasOldInvoice}
          className="gap-1.5" style={{ backgroundColor: PRIMARY_COLOR, color: "white" }}>
          <Save size={13} /> {isSubmitting ? "Enregistrement" : "Enregistrer"}
        </Button>
      </div>
    </div>
  )
}

// 
// TAB 4 - ETAT DROITS TIMBRE (controlled)
// 
type TimbreRow = { designation: string; caTTCEsp: string; droitTimbre: string }

const FIXED_TIMBRE_ROW: TimbreRow = {
  designation: "VENTES DIRECTES / INDIRECTES",
  caTTCEsp: "",
  droitTimbre: "",
}

interface Tab4Props { rows: TimbreRow[]; setRows: React.Dispatch<React.SetStateAction<TimbreRow[]>>;
  onSave: () => void;
  isSubmitting: boolean;
}

function TabDroitsTimbre({ rows, setRows, onSave, isSubmitting }: Tab4Props) {
  const update    = (i: number, field: keyof TimbreRow, val: string) =>
    setRows((p) => p.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)))

  const totalCA    = rows.reduce((s, r) => s + num(r.caTTCEsp), 0)
  const totalDroit = rows.reduce((s, r) => s + num(r.droitTimbre), 0)

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-2 py-2 text-center text-xs font-semibold text-gray-400 border-b w-8">#</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">DESIGNATIONS</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">CHIFFRE D'AFFAIRES TTC ENCAISSE EN ESPECE</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">DROITS DE TIMBRE</th>
              <th className="px-2 py-2 border-b w-8" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                <td className="px-2 py-1 text-center text-xs text-gray-400 border-b">{i + 1}</td>
                <td className="px-1 py-1 border-b"><Input value={row.designation} readOnly className="h-7 px-2 text-xs bg-gray-50" style={{ minWidth: 220 }} placeholder="Designation" /></td>
                <td className="px-1 py-1 border-b"><AmountInput min={0} step="0.01" value={row.caTTCEsp} onChange={(e) => update(i, "caTTCEsp", e.target.value)} className="h-7 px-2 text-xs" style={{ minWidth: 150 }} placeholder="0.00" /></td>
                <td className="px-1 py-1 border-b"><AmountInput min={0} step="0.01" value={row.droitTimbre} onChange={(e) => update(i, "droitTimbre", e.target.value)} className="h-7 px-2 text-xs" style={{ minWidth: 140 }} placeholder="0.00" /></td>
                <td className="px-2 py-1 text-center border-b text-gray-300">-</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-green-100 font-semibold">
              <td colSpan={2} className="px-3 py-2 text-xs text-right border-t">TOTAL</td>
              <td className="px-3 py-2 text-xs border-t text-right">{fmt(totalCA)}</td>
              <td className="px-3 py-2 text-xs border-t text-right">{fmt(totalDroit)}</td>
              <td className="border-t" />
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="flex justify-between items-center">
        <p className="text-xs text-muted-foreground">Ligne fixe: VENTES DIRECTES / INDIRECTES.</p>
        <Button size="sm" onClick={onSave} disabled={isSubmitting}
          className="gap-1.5" style={{ backgroundColor: PRIMARY_COLOR, color: "white" }}>
          <Save size={13} /> {isSubmitting ? "Enregistrement" : "Enregistrer"}
        </Button>
      </div>
    </div>
  )
}

// 
// TAB 5 - CA 7% & CA GLOB 1% (controlled)
// B12 = CA HT soumis a 7% (saisie)    C12 = B12  7%
// B13 = CA HT global soumis a 1%      C13 = B13  1%
// 
interface Tab5Props { b12: string; setB12: (v: string) => void; b13: string; setB13: (v: string) => void;
  onSave: () => void;
  isSubmitting: boolean;
}

function TabCA({ b12, setB12, b13, setB13, onSave, isSubmitting }: Tab5Props) {
  const c12 = num(b12) * 0.07
  const c13 = num(b13) * 0.01

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">DESIGNATIONS</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">
                MONTANT DU CHIFFRE D'AFFAIRES HT SOUMIS
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">
                MONTANT DE LA TAXE A VERSER
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="bg-white">
              <td className="px-3 py-2 border-b text-xs font-medium text-gray-800">CHIFFRE D'AFFAIRES RECHARGEMENT SOUMIS A 7%</td>
              <td className="px-1 py-1 border-b">
                <AmountInput min={0} step="0.01" value={b12} onChange={(e) => setB12(e.target.value)}
                  className="h-7 px-2 text-xs" placeholder="Saisir le montant" style={{ minWidth: 200 }} />
              </td>
              <td className="px-3 py-1 border-b text-xs text-gray-700 font-semibold bg-gray-50/50">
                {b12 ? fmt(c12) : "-"}
              </td>
            </tr>
            <tr className="bg-gray-50">
              <td className="px-3 py-2 border-b text-xs font-medium text-gray-800">CHIFFRE D'AFFAIRES GLOBAL SOUMIS A 1% (*)</td>
              <td className="px-1 py-1 border-b">
                <AmountInput min={0} step="0.01" value={b13} onChange={(e) => setB13(e.target.value)}
                  className="h-7 px-2 text-xs" placeholder="Saisir le montant" style={{ minWidth: 200 }} />
              </td>
              <td className="px-3 py-1 border-b text-xs text-gray-700 font-semibold bg-gray-50/50">
                {b13 ? fmt(c13) : "-"}
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr className="bg-green-100 font-semibold">
              <td className="px-3 py-2 text-xs text-right border-t">TOTAL</td>
              <td className="px-3 py-2 text-xs border-t text-right">{fmt(num(b12) + num(b13))}</td>
              <td className="px-3 py-2 text-xs text-gray-700 border-t text-right">{fmt(c12 + c13)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="text-xs text-gray-700">
        NB: (*) LE CHIFFRE D'AFFAIRES GLOBAL SOUMIS A 1% DOIT CORRESPONDRE AU CHIFFRE D'AFFAIRES COMPTABILISE
      </p>
      <div className="flex justify-end">
        <Button size="sm" onClick={onSave} disabled={isSubmitting}
          className="gap-1.5" style={{ backgroundColor: PRIMARY_COLOR, color: "white" }}>
          <Save size={13} /> {isSubmitting ? "Enregistrement" : "Enregistrer"}
        </Button>
      </div>
    </div>
  )
}

// 
// TAB 6 - ETAT TAP (controlled)
// Periode : mois + annee (page-level)
// Tableau : Code (auto), Wilaya (dropdown), Commune (dropdown), Montant imposable (saisie), TAP 1,5% (auto)
// MONTANT TAP = Total(TAP 1,5%)
// 
type TAPRow = { wilayaCode: string; commune: string; tap2: string }
type SiegeEncRow = { ttc: string; ht: string }
type WilayaCommuneData = { code: string; wilaya: string; communes: { id: string; nom: string }[] }

const SIEGE_G1_LABELS = ["Encaissement", "Encaissement Exon\u00e9r\u00e9e"]
const SIEGE_G2_LABELS = [
  "Encaissement MOBIPOST", "Encaissement POST PAID", "Encaissement RACIMO",
  "Encaissement DME", "Encaissement SOFIA", "Encaissement CCP RECOUVREMENT A",
  "Encaissement CCP RECOUVREMENT B", "Encaissement CCP TPE",
  "Encaissement BNA TPE", "Encaissement MASTER ALGERIE POSTE",
]

const MONTHS = [
  { value: "01", label: "Janvier" },   { value: "02", label: "Fevrier" },
  { value: "03", label: "Mars" },      { value: "04", label: "Avril" },
  { value: "05", label: "Mai" },       { value: "06", label: "Juin" },
  { value: "07", label: "Juillet" },   { value: "08", label: "Aout" },
  { value: "09", label: "Septembre" }, { value: "10", label: "Octobre" },
  { value: "11", label: "Novembre" },  { value: "12", label: "Decembre" },
]
const ACOMPTE_ALLOWED_MONTHS = ["02", "05", "10"] as const
const FORMATION_ALLOWED_MONTHS = ["06", "12"] as const
const ACOMPTE_MONTHS = [
  { value: "02", label: "Fev" },
  { value: "05", label: "Mai" },
  { value: "10", label: "Oct" },
] as const
const CURRENT_YEAR = new Date().getFullYear()
const INITIAL_FISCAL_PERIOD = getCurrentFiscalPeriod()
const YEARS = Array.from({ length: 101 }, (_, i) => (2000 + i).toString())
interface Tab6Props {
  rows: TAPRow[]; setRows: React.Dispatch<React.SetStateAction<TAPRow[]>>
  mois: string; setMois: (v: string) => void
  annee: string; setAnnee: (v: string) => void
  onSave: () => void;
  isSubmitting: boolean;
  wilayas: WilayaCommuneData[];
}

function TabTAP({ rows, setRows, mois, setMois, annee, setAnnee, onSave, isSubmitting, wilayas }: Tab6Props) {
  const addRow    = () => setRows((p) => [...p, { wilayaCode: "", commune: "", tap2: "" }])
  const removeRow = (i: number) => setRows((p) => p.filter((_, idx) => idx !== i))
  const updateRow = useCallback((i: number, field: keyof TAPRow, val: string) =>
    setRows((p) => p.map((r, idx) => (idx === i ? { ...r, [field]: val } : r))), [setRows])

  const totalImposable = rows.reduce((s, r) => s + num(r.tap2), 0)
  const totalTAP = totalImposable * 0.015
  const getWilaya = (code: string) => wilayas.find((w) => w.code === code)

  return (
    <div className="space-y-5">
      {/* Tableau */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-2 py-2 text-center text-xs font-semibold text-gray-400 border-b w-8">#</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">Code Wilaya</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">Wilaya</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">Commune</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">Montant Imposable</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">TAP 1,5%</th>
              <th className="px-2 py-2 border-b w-8" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const wilaya = getWilaya(row.wilayaCode)
              return (
                <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className="px-2 py-1 text-center text-xs text-gray-400 border-b">{i + 1}</td>

                  {/* Code - automatique depuis wilaya */}
                  <td className="px-3 py-1 border-b">
                    <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded">
                      {row.wilayaCode || "-"}
                    </span>
                  </td>

                  {/* Wilaya dropdown */}
                  <td className="px-1 py-1 border-b">
                    <select value={row.wilayaCode}
                      onChange={(e) => { updateRow(i, "wilayaCode", e.target.value); updateRow(i, "commune", "") }}
                      className="h-7 rounded border border-gray-200 px-2 text-xs focus:outline-none focus:ring-1 focus:ring-green-300"
                      style={{ minWidth: 190 }}>
                      <option value="">- Wilaya -</option>
                      {wilayas.map((w) => (
                        <option key={w.code} value={w.code}>{w.code} - {w.wilaya}</option>
                      ))}
                    </select>
                  </td>

                  {/* Commune dropdown - depend de la wilaya selectionnee */}
                  <td className="px-1 py-1 border-b">
                    <select value={row.commune} onChange={(e) => updateRow(i, "commune", e.target.value)}
                      disabled={!row.wilayaCode}
                      className="h-7 rounded border border-gray-200 px-2 text-xs focus:outline-none focus:ring-1 focus:ring-green-300 disabled:opacity-40"
                      style={{ minWidth: 165 }}>
                      <option value="">- Commune -</option>
                      {(getWilaya(row.wilayaCode)?.communes ?? []).map((c) => (
                        <option key={c.id} value={String(c.id)}>{c.id}</option>
                      ))}
                    </select>
                  </td>

                  {/* Montant imposable */}
                  <td className="px-1 py-1 border-b">
                    <AmountInput min={0} step="0.01" value={row.tap2}
                      onChange={(e) => updateRow(i, "tap2", e.target.value)}
                      className="h-7 px-2 text-xs" placeholder="0.00" style={{ minWidth: 130 }} />
                  </td>

                  {/* TAP 1,5% (calcule) */}
                  <td className="px-3 py-1 border-b text-xs text-gray-700 font-semibold bg-gray-50/50 text-right">
                    {row.tap2 ? fmt(num(row.tap2) * 0.015) : "-"}
                  </td>

                  <td className="px-2 py-1 text-center border-b">
                    <button type="button" onClick={() => removeRow(i)} disabled={rows.length === 1}
                      className="text-emerald-400 hover:text-emerald-600 disabled:opacity-30"><Trash2 size={13} /></button>
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="bg-green-100 font-semibold">
              <td colSpan={3} className="px-3 py-2 text-xs text-right border-t">TOTAL</td>
              <td className="px-3 py-2 text-sm font-bold text-green-700 border-t text-right">{fmt(totalImposable)} DZD</td>
              <td className="px-3 py-2 text-sm font-bold text-green-700 border-t text-right">{fmt(totalTAP)} DZD</td>
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
// TAB 7 - CHIFFRE D'AFFAIRE ENCAISSE SIEGE
// 
interface Tab7Props { rows: SiegeEncRow[]; setRows: React.Dispatch<React.SetStateAction<SiegeEncRow[]>>; onSave: () => void; isSubmitting: boolean }
function TabCaSiege({ rows, setRows, onSave, isSubmitting }: Tab7Props) {

  const upd = (i: number, field: "ttc" | "ht", v: string) =>
    setRows((prev) =>
      prev.map((r, idx) => {
        if (idx !== i) return r

        // Ligne 1 "Encaissement Exonérée" : TTC verrouillé, HT éditable
        if (i === 1) {
          if (field === "ht") return { ...r, ht: v }
          return r // ignorer toute modif TTC
        }

        // Ligne 0 "Encaissement" : HT = (TTC_encaissement - HT_exonérée) / 1.19
        if (i === 0) {
          const ttcNumeric = num(v)
          const exonereeHT = num(prev[1].ht)
          const htValue = v.trim() === "" ? "" : ((ttcNumeric - exonereeHT) / 1.19).toFixed(2)
          return { ...r, ttc: v, ht: htValue }
        }

        // Autres lignes : comportement normal TTC → HT
        const ttcNumeric = num(v)
        const htValue = v.trim() === "" ? "" : (ttcNumeric / 1.19).toFixed(2)
        return { ...r, ttc: v, ht: htValue }
      }),
    )

  // Recalculer HT ligne 0 si HT exonérée change (pour garder la cohérence)
  const recalcLigne0AfterExo = (newExoHT: string) =>
    setRows((prev) =>
      prev.map((r, idx) => {
        if (idx !== 0) return r
        const ttcNumeric = num(r.ttc)
        const exoHT = num(newExoHT)
        const htValue = (r.ttc ?? "").trim() === "" ? "" : ((ttcNumeric - exoHT) / 1.19).toFixed(2)
        return { ...r, ht: htValue }
      }),
    )

  const updExo = (v: string) => {
    setRows((prev) =>
      prev.map((r, idx) => {
        if (idx === 1) return { ...r, ht: v }
        if (idx === 0) {
          const ttcNumeric = num(r.ttc)
          const exoHT = num(v)
          const htValue = (r.ttc ?? "").trim() === "" ? "" : ((ttcNumeric - exoHT) / 1.19).toFixed(2)
          return { ...r, ht: htValue }
        }
        return r
      }),
    )
  }

  const g1 = rows.slice(0, 2)
  const g2 = rows.slice(2, 12)
  const t1ttc = g1.reduce((s, r) => s + num(r.ttc), 0)
  const t1ht  = rows[0] && rows[1]
    ? num(rows[0].ht) + num(rows[1].ht)
    : 0
  const t2ttc = g2.reduce((s, r) => s + num(r.ttc), 0)
  const t2ht  = g2.reduce((s, r) => s + (num(r.ttc) / 1.19), 0)
  const totalRow: React.CSSProperties = { background: "#f3f4f6", fontWeight: 700 }
  const grandRow: React.CSSProperties = { background: "#dcfce7", fontWeight: 700 }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
        <table className="min-w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 border-b" style={{ width: "55%" }}>Designation</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700 border-b" style={{ width: "22.5%" }}>TTC</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700 border-b" style={{ width: "22.5%" }}>HT</th>
            </tr>
          </thead>
          <tbody>
            {SIEGE_G1_LABELS.map((lbl, i) => (
              <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                <td className="px-4 py-1 text-xs border-b">{lbl}</td>

                {/* Colonne TTC */}
                <td className="px-1 py-1 border-b">
                  {i === 1 ? (
                    // Exonérée : TTC verrouillé, toujours vide
                    <AmountInput min={0} step="0.01"
                      className="h-7 px-2 text-xs text-right bg-gray-100 cursor-not-allowed"
                      value="" readOnly placeholder="—"
                      style={{ minWidth: 130 }} />
                  ) : (
                    <AmountInput min={0} step="0.01"
                      className="h-7 px-2 text-xs text-right"
                      value={rows[i].ttc}
                      onChange={(e) => upd(i, "ttc", e.target.value)}
                      placeholder="0.00" style={{ minWidth: 130 }} />
                  )}
                </td>

                {/* Colonne HT */}
                <td className="px-1 py-1 border-b">
                  {i === 1 ? (
                    // Exonérée : HT éditable, et met à jour HT de la ligne 0
                    <AmountInput min={0} step="0.01"
                      className="h-7 px-2 text-xs text-right"
                      value={rows[1].ht ?? ""}
                      onChange={(e) => updExo(e.target.value)}
                      placeholder="0.00" style={{ minWidth: 130 }} />
                  ) : (
                    // Ligne 0 : HT calculé automatiquement
                    <AmountInput min={0} step="0.01"
                      className="h-7 px-2 text-xs text-right bg-gray-100"
                      value={rows[i].ht ?? ""}
                      readOnly placeholder="0.00"
                      style={{ minWidth: 130 }} />
                  )}
                </td>
              </tr>
            ))}

            <tr style={totalRow}>
              <td className="px-4 py-2 text-xs border-b font-bold">TOTAL 1</td>
              <td className="px-3 py-2 text-xs border-b text-right font-bold">{fmt(t1ttc)}</td>
              <td className="px-3 py-2 text-xs border-b text-right font-bold">{fmt(t1ht)}</td>
            </tr>

            {SIEGE_G2_LABELS.map((lbl, i) => (
              <tr key={i + 2} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                <td className="px-4 py-1 text-xs border-b">{lbl}</td>
                <td className="px-1 py-1 border-b">
                  <AmountInput min={0} step="0.01" className="h-7 px-2 text-xs text-right"
                    value={rows[i + 2].ttc}
                    onChange={(e) => upd(i + 2, "ttc", e.target.value)}
                    placeholder="0.00" style={{ minWidth: 130 }} />
                </td>
                <td className="px-1 py-1 border-b">
                  <AmountInput min={0} step="0.01" className="h-7 px-2 text-xs text-right bg-gray-100"
                    value={(rows[i + 2].ttc ?? "").trim() === "" ? "" : (num(rows[i + 2].ttc) / 1.19).toFixed(2)}
                    readOnly placeholder="0.00" style={{ minWidth: 130 }} />
                </td>
              </tr>
            ))}

            <tr style={totalRow}>
              <td className="px-4 py-2 text-xs border-b font-bold">TOTAL 2</td>
              <td className="px-3 py-2 text-xs border-b text-right font-bold">{fmt(t2ttc)}</td>
              <td className="px-3 py-2 text-xs border-b text-right font-bold">{fmt(t2ht)}</td>
            </tr>
            <tr style={grandRow}>
              <td className="px-4 py-2 text-xs font-bold text-green-800">TOTAL GENERAL</td>
              <td className="px-3 py-2 text-xs text-right font-bold text-green-800">{fmt(t1ttc + t2ttc)}</td>
              <td className="px-3 py-2 text-xs text-right font-bold text-green-800">{fmt(t1ht + t2ht)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="flex justify-end">
        <Button size="sm" onClick={onSave} disabled={isSubmitting}
          className="gap-1.5" style={{ backgroundColor: PRIMARY_COLOR, color: "white" }}>
          <Save size={13} /> {isSubmitting ? "Enregistrement" : "Enregistrer"}
        </Button>
      </div>
    </div>
  )
}
// 
// TAB 8 - SITUATION IRG
// 
type IrgRow = { assietteImposable: string; montant: string }
const IRG_LABELS = [
  "IRG sur Salaire Bareme",
  "Autre IRG 10%",
  "Autre IRG 15 % (consultants, athletes, ...)",
  "Jetons de presence 10%",
  "Tantieme 10%",
  "IRG Challenge 10%",
]
const IRG_AUTO_RATES: Array<number | null> = [null, 0.10, 0.15, 0.10, 0.10, 0.10]
interface Tab8Props { rows: IrgRow[]; setRows: React.Dispatch<React.SetStateAction<IrgRow[]>>; onSave: () => void; isSubmitting: boolean }
function TabIRG({ rows, setRows, onSave, isSubmitting }: Tab8Props) {
  const upd = (i: number, f: keyof IrgRow, v: string) =>
    setRows((prev) => prev.map((r, idx) => {
      if (idx !== i) return r

      const rate = IRG_AUTO_RATES[i]
      if (f === "assietteImposable" && rate !== null) {
        const assiette = safeString(v)
        const autoMontant = assiette ? (num(assiette, false) * rate).toFixed(2) : ""
        return { ...r, assietteImposable: assiette, montant: autoMontant }
      }

      if (f === "montant" && rate !== null) {
        return r
      }

      return { ...r, [f]: v }
    }))
  const total = rows.reduce((s, r) => s + num(r.montant), 0)
  const totalAssiet = rows.reduce((s, r) => s + num(r.assietteImposable), 0)
  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">Designation</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">Assiette Imposable</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">Montant</th>
            </tr>
          </thead>
          <tbody>
            {IRG_LABELS.map((lbl, i) => (
              <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                <td className="px-3 py-1 text-xs border-b font-medium text-gray-800" style={{ minWidth: 220 }}>{lbl}</td>
                <td className="px-1 py-1 border-b"><AmountInput min={0} step="0.01" className="h-7 px-2 text-xs" value={rows[i].assietteImposable} onChange={(e) => upd(i, "assietteImposable", e.target.value)} placeholder="0.00" style={{ minWidth: 150 }} /></td>
                <td className="px-1 py-1 border-b"><AmountInput min={0} step="0.01" className={`h-7 px-2 text-xs ${IRG_AUTO_RATES[i] !== null ? "bg-gray-100" : ""}`} value={rows[i].montant} onChange={(e) => upd(i, "montant", e.target.value)} readOnly={IRG_AUTO_RATES[i] !== null} placeholder="0.00" style={{ minWidth: 150 }} /></td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-green-100 font-semibold">
              <td className="px-3 py-2 text-xs text-right border-t">TOTAL</td>
              <td className="px-3 py-2 text-xs border-t text-right">{fmt(totalAssiet)}</td>
              <td className="px-3 py-2 text-xs border-t text-right">{fmt(total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="flex justify-end">
        <Button size="sm" onClick={onSave} disabled={isSubmitting}
          className="gap-1.5" style={{ backgroundColor: PRIMARY_COLOR, color: "white" }}>
          <Save size={13} /> {isSubmitting ? "Enregistrement" : "Enregistrer"}
        </Button>
      </div>
    </div>
  )
}

// 
// TAB 9 - SITUATION TAXE 2%
// 
type Taxe2Row = { base: string; montant: string }
const TAXE2_LABELS = ["Taxe sur l'importation des biens et services"]
interface Tab9Props { rows: Taxe2Row[]; setRows: React.Dispatch<React.SetStateAction<Taxe2Row[]>>; onSave: () => void; isSubmitting: boolean }
function TabTaxe2({ rows, setRows, onSave, isSubmitting }: Tab9Props) {
  const upd = (i: number, f: keyof Taxe2Row, v: string) =>
    setRows((prev) => prev.map((r, idx) => {
      if (idx !== i) return r
      if (f === "base") {
        const base = safeString(v)
        const montant = base ? (num(base, false) * 0.02).toFixed(2) : ""
        return { ...r, base, montant }
      }
      return { ...r, [f]: v }
    }))
  const totalBase = rows.reduce((s, r) => s + num(r.base), 0)
  const totalMont = rows.reduce((s, r) => s + num(r.montant), 0)
  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">Designation</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">Montant de la base</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">Montant de la Taxe 2%</th>
            </tr>
          </thead>
          <tbody>
            {TAXE2_LABELS.map((lbl, i) => (
              <tr key={i} className="bg-white">
                <td className="px-3 py-1 text-xs border-b font-medium text-gray-800" style={{ minWidth: 320 }}>{lbl}</td>
                <td className="px-1 py-1 border-b"><AmountInput min={0} step="0.01" className="h-7 px-2 text-xs" value={rows[i].base} onChange={(e) => upd(i, "base", e.target.value)} placeholder="0.00" style={{ minWidth: 150 }} /></td>
                <td className="px-1 py-1 border-b">
                  <AmountInput
                    min={0}
                    step="0.01"
                    className="h-7 px-2 text-xs bg-gray-100"
                    value={rows[i].montant}
                    readOnly
                    placeholder="0.00"
                    style={{ minWidth: 150 }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-green-100 font-semibold">
              <td className="px-3 py-2 text-xs text-right border-t">TOTAL</td>
              <td className="px-3 py-2 text-xs border-t text-right">{fmt(totalBase)}</td>
              <td className="px-3 py-2 text-xs border-t text-right">{fmt(totalMont)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="flex justify-end">
        <Button size="sm" onClick={onSave} disabled={isSubmitting}
          className="gap-1.5" style={{ backgroundColor: PRIMARY_COLOR, color: "white" }}>
          <Save size={13} /> {isSubmitting ? "Enregistrement" : "Enregistrer"}
        </Button>
      </div>
    </div>
  )
}
// 
// TAB 10 - ETAT DE LA TAXE 1,5% DES MASTERS
// 
type MasterRow = { date: string; nomMaster: string; numFacture: string; dateFacture: string; montantHT: string; taxe15: string; mois: string; observation: string }
const EMPTY_MASTER: MasterRow = { date: "", nomMaster: "", numFacture: "", dateFacture: "", montantHT: "", taxe15: "", mois: "", observation: "" }
interface Tab10Props {
  rows: MasterRow[]
  setRows: React.Dispatch<React.SetStateAction<MasterRow[]>>
  mois: string
  annee: string
  onSave: () => void
  isSubmitting: boolean
}
function TabMasters({ rows, setRows, mois, annee, onSave, isSubmitting }: Tab10Props) {
  const monthLabel = useMemo(() => MONTHS.find((m) => m.value === mois)?.label ?? "", [mois])
  const periodEndDate = useMemo(() => {
    const monthValue = Number(mois)
    const yearValue = Number(annee)
    if (!Number.isFinite(monthValue) || !Number.isFinite(yearValue)) return ""
    if (monthValue < 1 || monthValue > 12 || yearValue < 1) return ""
    const lastDay = new Date(yearValue, monthValue, 0).getDate()
    return `${yearValue}-${String(monthValue).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`
  }, [annee, mois])

  useEffect(() => {
    if (!periodEndDate && !monthLabel) return
    setRows((prev) => prev.map((row) => {
      const nextDate = periodEndDate || row.date
      const nextMois = monthLabel || row.mois
      if (row.date === nextDate && row.mois === nextMois) return row
      return { ...row, date: nextDate, mois: nextMois }
    }))
  }, [monthLabel, periodEndDate, setRows])

  const addRow    = () => setRows((p) => [...p, { ...EMPTY_MASTER, date: periodEndDate, mois: monthLabel }])
  const removeRow = (i: number) => setRows((p) => p.filter((_, idx) => idx !== i))
  const upd = (i: number, f: keyof MasterRow, v: string) => {
    setRows((prev) => prev.map((r, idx) => {
      if (idx !== i) return r
      const updated = { ...r, [f]: v }
      if (f === "montantHT") {
        const calculatedTaxe = num(v) * 0.015
        updated.taxe15 = calculatedTaxe > 0 ? calculatedTaxe.toFixed(2) : ""
      }
      return updated
    }))
  }
  const totalHT   = rows.reduce((s, r) => s + num(r.montantHT), 0)
  const totalTaxe = rows.reduce((s, r) => s + (num(r.montantHT) * 0.015), 0)
  const iw = { minWidth: 110 }
  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-2 py-2 text-center text-xs font-semibold text-gray-400 border-b w-8">#</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">Date</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">Nom du Master</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">No de Facture</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">Date de la Facture</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">Montant de la Facture HT</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">Taxe 1,5%</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">Mois</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">Observation</th>
              <th className="px-2 py-2 border-b w-8" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                <td className="px-2 py-1 text-center text-xs text-gray-400 border-b">{i + 1}</td>
                <td className="px-1 py-1 border-b">
                  <Input
                    type="date"
                    value={periodEndDate || row.date}
                    readOnly
                    className="h-7 px-2 text-xs bg-gray-100"
                    style={iw}
                  />
                </td>
                <td className="px-1 py-1 border-b"><Input value={row.nomMaster} onChange={(e) => upd(i, "nomMaster", e.target.value)} className="h-7 px-2 text-xs" placeholder="Nom du Master" style={{ minWidth: 160 }} /></td>
                <td className="px-1 py-1 border-b"><Input value={row.numFacture} onChange={(e) => upd(i, "numFacture", e.target.value)} className="h-7 px-2 text-xs" placeholder="N° Facture" style={iw} /></td>
                <td className="px-1 py-1 border-b"><Input type="date" value={row.dateFacture} onChange={(e) => upd(i, "dateFacture", e.target.value)} className="h-7 px-2 text-xs" style={iw} /></td>
                <td className="px-1 py-1 border-b"><AmountInput min={0} step="0.01" value={row.montantHT} onChange={(e) => upd(i, "montantHT", e.target.value)} className="h-7 px-2 text-xs" placeholder="0.00" style={iw} /></td>
                <td className="px-3 py-1 border-b text-xs text-gray-700 font-semibold bg-gray-50/50">{row.montantHT ? fmt(num(row.montantHT) * 0.015) : "-"}</td>
                <td className="px-1 py-1 border-b">
                  <Input
                    value={monthLabel || row.mois}
                    readOnly
                    className="h-7 px-2 text-xs bg-gray-100"
                    style={{ minWidth: 110 }}
                  />
                </td>
                <td className="px-1 py-1 border-b"><Input value={row.observation} onChange={(e) => upd(i, "observation", e.target.value)} className="h-7 px-2 text-xs" placeholder="Observation" style={{ minWidth: 140 }} /></td>
                <td className="px-2 py-1 text-center border-b">
                  <button type="button" onClick={() => removeRow(i)} disabled={rows.length === 1}
                    className="text-emerald-400 hover:text-emerald-600 disabled:opacity-30"><Trash2 size={13} /></button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-green-100 font-semibold">
              <td colSpan={5} className="px-3 py-2 text-xs text-right border-t">TOTAL</td>
              <td className="px-3 py-2 text-xs border-t text-right">{fmt(totalHT)}</td>
              <td className="px-3 py-2 text-xs border-t text-right">{fmt(totalTaxe)}</td>
              <td colSpan={3} className="border-t" />
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
// TAB 11 - TAXE DE VEHICULE
// 
interface Tab11Props { montant: string; setMontant: (v: string) => void; onSave: () => void; isSubmitting: boolean }
function TabTaxeVehicule({ montant, setMontant, onSave, isSubmitting }: Tab11Props) {
  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">Designation</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">Montant</th>
            </tr>
          </thead>
          <tbody>
            <tr className="bg-white">
              <td className="px-3 py-1 text-xs border-b font-medium text-gray-800" style={{ minWidth: 280 }}>Taxe de vehicule</td>
              <td className="px-1 py-1 border-b"><AmountInput min={0} step="0.01" value={montant} onChange={(e) => setMontant(e.target.value)} className="h-7 px-2 text-xs" placeholder="0.00" style={{ minWidth: 180 }} /></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="flex justify-end">
        <Button size="sm" onClick={onSave} disabled={isSubmitting}
          className="gap-1.5" style={{ backgroundColor: PRIMARY_COLOR, color: "white" }}>
          <Save size={13} /> {isSubmitting ? "Enregistrement" : "Enregistrer"}
        </Button>
      </div>
    </div>
  )
}

// 
// TAB 12 - TAXE DE FORMATION
// 
type Taxe12Row = { montant: string }
type Tnfdal1Row = { designation: string; caHt: string; taxe: string }
type Tacp7Row = { designation: string; base: string; taxe: string }
const TAXE12_LABELS = ["Taxe de Formation Professionnelle 1%", "Taxe d'Apprentissage 1%"]
const TNFDAL1_DECLARATION_ROWS = ["Direction Generale"]
const TACP7_DECLARATION_ROWS = ["Masters", "Mobiposte", "Racimo", "Algerie Poste"]
interface Tab12Props { rows: Taxe12Row[]; setRows: React.Dispatch<React.SetStateAction<Taxe12Row[]>>; onSave: () => void; isSubmitting: boolean }
function TabTaxeFormation({ rows, setRows, onSave, isSubmitting }: Tab12Props) {
  const upd = (i: number, v: string) =>
    setRows((prev) => prev.map((r, idx) => idx === i ? { montant: v } : r))
  const total = rows.reduce((s, r) => s + num(r.montant), 0)
  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">Designation</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">Montant</th>
            </tr>
          </thead>
          <tbody>
            {TAXE12_LABELS.map((lbl, i) => (
              <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                <td className="px-3 py-1 text-xs border-b font-medium text-gray-800" style={{ minWidth: 280 }}>{lbl}</td>
                <td className="px-1 py-1 border-b"><AmountInput min={0} step="0.01" value={rows[i].montant} onChange={(e) => upd(i, e.target.value)} className="h-7 px-2 text-xs" placeholder="0.00" style={{ minWidth: 180 }} /></td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-green-100 font-semibold">
              <td className="px-3 py-2 text-xs text-right border-t">TOTAL</td>
              <td className="px-3 py-2 text-xs border-t text-right">{fmt(total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="flex justify-end">
        <Button size="sm" onClick={onSave} disabled={isSubmitting}
          className="gap-1.5" style={{ backgroundColor: PRIMARY_COLOR, color: "white" }}>
          <Save size={13} /> {isSubmitting ? "Enregistrement" : "Enregistrer"}
        </Button>
      </div>
    </div>
  )
}

// 
// TAB 13 - SITUATION DE L'ACOMPTE PROVISIONNEL (year only, 12 months)
// 
  const MONTH_LABELS_SHORT = ["Janv","Fev","Mars","Avr","Mai","Juin","Juil","Aout","Sept","Oct","Nov","Dec"]
interface Tab13Props { months: string[]; setMonths: React.Dispatch<React.SetStateAction<string[]>>; annee: string; onSave: () => void; isSubmitting: boolean }
function TabAcompte({ months, setMonths, annee, onSave, isSubmitting }: Tab13Props) {
  const upd = (i: number, v: string) =>
    setMonths((prev) => prev.map((m, idx) => idx === i ? v : m))
  const yy = annee.slice(-2)
  const total = months.reduce((s, v) => s + num(v), 0)
  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b" style={{ minWidth: 100 }}>Designation</th>
              {ACOMPTE_MONTHS.map((m) => (
                <th key={m.value} className="px-2 py-2 text-center text-xs font-semibold text-gray-700 border-b" style={{ minWidth: 90 }}>{m.label} {yy}</th>
              ))}
              <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700 border-b" style={{ minWidth: 110 }}>TOTAL</th>
            </tr>
          </thead>
          <tbody>
            <tr className="bg-white">
              <td className="px-3 py-1 text-xs border-b font-medium text-gray-800">Montant</td>
              {months.map((v, i) => (
                <td key={i} className="px-1 py-1 border-b">
                  <AmountInput min={0} step="0.01" value={v} onChange={(e) => upd(i, e.target.value)} className="h-7 px-2 text-xs" placeholder="0.00" style={{ minWidth: 80 }} />
                </td>
              ))}
              <td className="px-3 py-1 text-xs border-b font-semibold text-green-700 bg-green-50 text-right">{fmt(total)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="flex justify-end">
        <Button size="sm" onClick={onSave} disabled={isSubmitting}
          className="gap-1.5" style={{ backgroundColor: PRIMARY_COLOR, color: "white" }}>
          <Save size={13} /> {isSubmitting ? "Enregistrement" : "Enregistrer"}
        </Button>
      </div>
    </div>
  )
}



// 
// TAB CONFIG
// 
const TABS = [
  { key: "encaissement",   label: "1 - Encaissement",              color: "#2db34b", title: "ENCAISSEMENT" },
  { key: "tva_immo",       label: "2 - TVA / IMMO",                color: "#2db34b", title: "ETAT TVA / IMMOBILISATIONS" },
  { key: "tva_biens",      label: "3 - TVA / Biens & Serv",        color: "#2db34b", title: "ETAT TVA / BIENS & SERVICES" },
  { key: "droits_timbre",  label: "4 - Droits Timbre",             color: "#2db34b", title: "ETAT DROITS DE TIMBRE" },
  { key: "ca_tap",         label: "5 - CA 7% & CA Glob 1%",        color: "#2db34b", title: "CA 7% & CA GLOBAL 1%" },
  { key: "etat_tap",       label: "6 - ETAT TAP",                  color: "#2db34b", title: "ETAT TAP" },
  { key: "ca_siege",       label: "7 - CA Siege",                  color: "#2db34b", title: "CHIFFRE D'AFFAIRE ENCAISSE SIEGE" },
  { key: "irg",            label: "8 - Situation IRG",             color: "#2db34b", title: "SITUATION IRG" },
  { key: "taxe2",          label: "9 - Taxe 2%",                   color: "#2db34b", title: "SITUATION DE LA TAXE 2%" },
  { key: "taxe_masters",   label: "10 - Taxe des Master 1,5%",       color: "#2db34b", title: "ETAT DE LA TAXE 1,5% DES MASTERS" },
  { key: "taxe_vehicule",  label: "11 - Taxe Vehicule",            color: "#2db34b", title: "TAXE DE VEHICULE" },
  { key: "taxe_formation", label: "12 - Taxe Formation",           color: "#2db34b", title: "TAXE DE FORMATION" },
  { key: "acompte",        label: "13 - Acompte Provisionnel",     color: "#2db34b", title: "SITUATION DE L'ACOMPTE PROVISIONNEL DE L'ANNEE EN COURS" },

  { key: "tnfdal1",        label: "17 - TNFDAL 1%",             color: "#2db34b", title: "TNFDAL 1%" },
  { key: "tacp7",          label: "18 - TACP 7%",               color: "#2db34b", title: "TACP 7%" },
]

type FiscalTabKey =
  | "encaissement"
  | "tva_immo"
  | "tva_biens"
  | "droits_timbre"
  | "ca_tap"
  | "etat_tap"
  | "ca_siege"
  | "irg"
  | "taxe2"
  | "taxe_masters"
  | "taxe_vehicule"
  | "taxe_formation"
  | "acompte"
  | "ibs"
  | "taxe_domicil"
  | "tva_autoliq"
  | "tnfdal1"
  | "tacp7"

interface SavedDeclaration {
  id: string
  createdAt: string
  direction: string
  mois: string
  annee: string
  encRows?: EncRow[]
  tvaImmoRows?: TvaRow[]
  tvaBiensRows?: TvaRow[]
  timbreRows?: TimbreRow[]
  b12?: string
  b13?: string
  tapRows?: TAPRow[]
  caSiegeRows?: SiegeEncRow[]
  irgRows?: IrgRow[]
  taxe2Rows?: Taxe2Row[]
  masterRows?: MasterRow[]
  taxe11Montant?: string
  taxe12Rows?: Taxe12Row[]
  acompteMonths?: string[]

  tnfdal1Rows?: Tnfdal1Row[]
  tacp7Rows?: Tacp7Row[]
}

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

type ApiFiscalRecap = {
  id?: number
  key?: string
  mois?: string
  annee?: string
  direction?: string
  rowsJson?: string
}

type MonthlyG50RecapRowsByKey = {
  tap15: Record<string, string>[]
  tacp7: Record<string, string>[]
  tnfdal1: Record<string, string>[]
  masters15: Record<string, string>[]
  g50: Record<string, string>[]
}

type RecapEncaissementSource = { direction: string; totalHt: number; totalTtc: number }
type RecapAmountSource = { direction: string; amount: number }
type RecapCaTapSource = { direction: string; b12: number; b13: number }
type RecapTapSource = { direction: string; base: number; taxe: number }
type RecapDroitsTimbreSource = { direction: string; totalCa: number; totalMontant: number }

type RecapSourcesResponse = {
  encaissementByDirection: RecapEncaissementSource[]
  tvaImmoByDirection: RecapAmountSource[]
  tvaBiensByDirection: RecapAmountSource[]
  caTapByDirection: RecapCaTapSource[]
  tapByDirection: RecapTapSource[]
  droitsTimbreByDirection: RecapDroitsTimbreSource[]
}

type ExistingDeclarationPreview = {
  id: string
  tabKey: string
  direction: string
  mois: string
  annee: string
  data: Record<string, unknown>
}

type RecapMode = "declaration" | "etats_sortie"

type RecapKey = "tva_collectee" | "tva_a_payer" | "tva_situation" | "droits_timbre" | "tacp7" | "tnfdal1" | "tap15" | "masters15" | "irg_recap" | "g50" | "g50_annuel"

type RecapColumn = {
  key: string
  label: string
  right?: boolean
}

type RecapDefinition = {
  key: RecapKey
  title: string
  columns: RecapColumn[]
}

const RECAP_TABS: RecapDefinition[] = [
  {
    key: "tva_collectee",
    title: "TVA Collectée",
    columns: [
      { key: "designation", label: "Désignation" },
      { key: "ttc", label: "Montant des Encaissements TTC", right: true },
      { key: "exonere", label: "Montant Exonéré", right: true },
      { key: "ht", label: "Montant des Encaissements HT", right: true },
      { key: "tva", label: "Montant de la TVA", right: true },
    ],
  },
  {
    key: "tva_a_payer",
    title: "TVA à Payer",
    columns: [
      { key: "designation", label: "Désignation" },
      { key: "collectee", label: "TVA Collectée", right: true },
      { key: "immo", label: "TVA Déductible sur Immobilisation", right: true },
      { key: "biens", label: "TVA Déductible sur Biens et Services", right: true },
      { key: "totalDed", label: "Total de la TVA Déductible", right: true },
      { key: "payer", label: "TVA à Payer", right: true },
    ],
  },
  {
    key: "tva_situation",
    title: "TVA Déductible",
    columns: [
      { key: "designation", label: "Désignation" },
      { key: "immo", label: "TVA Déductible sur Immobilisation", right: true },
      { key: "biens", label: "TVA Déductible sur Biens et Services", right: true },
      { key: "totalDed", label: "Total de la TVA Déductible", right: true },
    ],
  },
  {
    key: "masters15",
    title: "Taxe Master 1.5%",
    columns: [
      { key: "designation", label: "Master" },
      { key: "base", label: "Montant de la Base", right: true },
      { key: "taxe", label: "Montant de la Taxe 1.5%", right: true },
    ],
  },
  {
    key: "tap15",
    title: "TAP 1.5%",
    columns: [
      { key: "designation", label: "Désignation" },
      { key: "caHt", label: "Montant des Encaissements HT", right: true },
      { key: "taxe", label: "Montant de la TAP", right: true },
    ],
  },
  {
    key: "tnfdal1",
    title: "TNFDAL 1%",
    columns: [
      { key: "designation", label: "Désignation" },
      { key: "caHt", label: "Chiffres d'Affaires HT", right: true },
      { key: "taxe", label: "Montant du TNFDAL 1%", right: true },
    ],
  },
  {
    key: "tacp7",
    title: "TACP 7%",
    columns: [
      { key: "designation", label: "Désignation" },
      { key: "base", label: "Montant des Recharges HT", right: true },
      { key: "taxe", label: "Montant du TACP 7%", right: true },
    ],
  },
  {
    key: "irg_recap",
    title: "IRG Recap",
    columns: [
      { key: "designation", label: "Désignation" },
      { key: "assiette", label: "Assiette Imposable", right: true },
      { key: "montant", label: "Montant", right: true },
    ],
  },
  {
    key: "droits_timbre",
    title: "Droit de Timbre",
    columns: [
      { key: "designation", label: "Désignation" },
      { key: "caHt", label: "Chiffres d'Affaires Encaissé HT", right: true },
      { key: "montant", label: "Montant du Droits de Timbre", right: true },
    ],
  },
  {
    key: "g50",
    title: "RECAP DECLARATION G50",
    columns: [
      { key: "designation", label: "Designation" },
      { key: "montant", label: "Montant", right: true },
    ],
  },
  {
    key: "g50_annuel",
    title: "RECAP ANNUEL G50",
    columns: [
      { key: "designation", label: "Designation" },
      { key: "montant", label: "Montant", right: true },
    ],
  },
]

const TVA_SITUATION_RECAP_ROWS = [
  "Direction Generale",
  "Direction AutoLiquidation",
  "DR Alger",
  "DR Setif",
  "DR Constantine",
  "DR Annaba",
  "DR Chlef",
  "DR Oran",
  "DR Bechar",
  "DR Ouargla",
  "Total",
]

const TVA_A_PAYER_RECAP_ROWS = [
  "Precompte",
  "Reversement",
  "Direction Generale",
  "TVA AutoLiquidation",
  "DR Alger",
  "DR Setif",
  "DR Constantine",
  "DR Annaba",
  "DR Chlef",
  "DR Oran",
  "DR Bechar",
  "DR Ouargla",
  "Total",
]

const TVA_COLLECTEE_RECAP_ROWS = [
  "BNA EXPLOITATION (Siege)",
  "CCP POST PAID (Siege)",
  "CCP MOBIPOSTE (Siege)",
  "CCP RACIMO (Siege)",
  "SOFIA CCP",
  "CCP DME",
  "ALGERIE POSTE",
  "VENTE TERMINAUX",
  "CCP RECOUVREMENT A",
  "CCP RECOUVREMENT B",
  "ENCAISSEMENT TPE CCP",
  "ENCAISSEMENT TPE BNA",
  "Total (1)",
  "DR Alger",
  "DR Setif",
  "DR Constantine",
  "DR Annaba",
  "DR Chlef",
  "DR Oran",
  "DR Bechar",
  "DR Ouargla",
  "Total (2)",
  "Total (1)+(2)",
]

const TVA_COLLECTEE_RECAP_DR_ROWS = [
  "DR Alger",
  "DR Setif",
  "DR Constantine",
  "DR Annaba",
  "DR Chlef",
  "DR Oran",
  "DR Bechar",
  "DR Ouargla",
] as const

const DROITS_TIMBRE_RECAP_ROWS = [
  "DR Alger",
  "DR Setif",
  "DR Constantine",
  "DR Annaba",
  "DR Chlef",
  "DR Oran",
  "DR Bechar",
  "DR Ouargla",
  "Total",
] as const

const TAP15_RECAP_ROWS = [
  "Direction Generale",
  "DR Alger",
  "DR Setif",
  "DR Constantine",
  "DR Annaba",
  "DR Chlef",
  "DR Oran",
  "DR Bechar",
  "DR Ouargla",
  "Total",
] as const

const TACP7_RECAP_ROWS = [
  "Masters",
  "Mobiposte",
  "Racimo",
  "Algerie Poste",
  "DR Alger",
  "DR Setif",
  "DR Constantine",
  "DR Annaba",
  "DR Chlef",
  "DR Oran",
  "DR Bechar",
  "DR Ouargla",
  "Total",
] as const

const TNFDAL1_RECAP_ROWS = [
  "Direction Generale",
  "DR Alger",
  "DR Setif",
  "DR Constantine",
  "DR Annaba",
  "DR Chlef",
  "DR Oran",
  "DR Bechar",
  "DR Ouargla",
  "Régulation CA",
  "Total",
] as const

const IRG_RECAP_ROWS = [...IRG_LABELS, "Total"] as const

const MASTERS15_RECAP_ROWS = [
  "Masters",
  "ASSILOU COM",
  "GTS PHONE",
  "ALGERIE POSTE",
  "Total",
] as const

const G50_RECAP_ROWS = [
  "ACOMPTE PROVISIONEL",
  "TVA COLLECTEE",
  "TVA DEDUCTIBLE",
  "Total TVA a Payer ",
  "DROIT DE TIMBRE",
  "TACP 7%",
  "TNFPDAL 1%",
  "IRG SALAIRE",
  "AUTRE IRG",
  "TAXE DE FORMATION",
  "TAXE VEHICULE",
  "LA TAP",
  "TAXE 2%",
  "Total Declaration G 50 ",
  "TAXE 1,5% SUR MASTERS ",
  "Total",
] as const

const parseRecapAmount = (value: unknown): number => {
  const raw = String(value ?? "").replace(/\u00A0/g, " ").trim()
  if (!raw) return 0
  const standardized = raw.replace(/\s/g, "").replace(/,/g, ".")
  const normalizedDots = standardized.replace(/\.(?=.*\.)/g, "")
  const parsed = Number.parseFloat(normalizedDots)
  return Number.isFinite(parsed) ? parsed : 0
}

const formatRecapAmount = (value: number): string => {
  const safe = Number.isFinite(value) ? value : 0
  const [intPart, decPart] = safe.toFixed(2).split(".")
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, " ")
  return `${formattedInt},${decPart}`
}

const normalizeRecapDesignation = (value: string): string => {
  return (value ?? "")
    .trim()
    .replace(/\s*\([^)]*\)\s*/g, " ") // Remove text in parentheses
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

const isTvaCollecteeRecapDrRow = (designation: string): boolean => {
  return (TVA_COLLECTEE_RECAP_DR_ROWS as readonly string[]).includes(designation)
}

const isTvaCollecteeRecapManualRow = (designation: string): boolean => {
  return TVA_COLLECTEE_RECAP_ROWS.slice(0, 12).includes(designation)
}

const isTvaCollecteeRecapTotalRow = (designation: string): boolean => {
  return designation === "Total (1)" || designation === "Total (2)" || designation === "Total (1)+(2)"
}

const resolveRegionalRecapRowByDirection = (direction: string): string | null => {
  const normalized = normalizeRecapDesignation(direction)
  if (!normalized) return null

  if (
    normalized === "siege"
    || normalized === "siège"
    || normalized.includes("siege")
    || normalized.includes("siège")
    || normalized.includes("direction generale")
    || normalized.includes("direction générale")
    || normalized.includes("autoliquidation")
    || normalized.includes("auto liquidation")
  ) {
    return null
  }

  if (normalized.includes("alger")) return "DR Alger"
  if (normalized.includes("setif")) return "DR Setif"
  if (normalized.includes("constantine")) return "DR Constantine"
  if (normalized.includes("annaba")) return "DR Annaba"
  if (normalized.includes("chlef")) return "DR Chlef"
  if (normalized.includes("oran") || normalized.includes("oron") || normalized.includes("ouest")) return "DR Oran"
  if (normalized.includes("bechar")) return "DR Bechar"
  if (normalized.includes("ouargla")) return "DR Ouargla"

  return null
}

const resolveTvaSituationRecapRowByDirection = (direction: string): string | null => {
  const normalized = normalizeRecapDesignation(direction)
  if (!normalized) return null

  if (
    normalized === "siege"
    || normalized === "siège"
    || normalized.includes("siege")
    || normalized.includes("siège")
    || normalized.includes("direction generale")
    || normalized.includes("direction générale")
  ) {
    return "Direction Generale"
  }

  if (normalized.includes("autoliquidation") || normalized.includes("auto liquidation")) {
    return "Direction AutoLiquidation"
  }

  return resolveRegionalRecapRowByDirection(direction)
}

const resolveTapRecapRowByDirection = (direction: string): string | null => {
  const normalized = normalizeRecapDesignation(direction)
  if (!normalized) return null

  if (
    normalized === "siege"
    || normalized === "siège"
    || normalized.includes("siege")
    || normalized.includes("siège")
    || normalized.includes("direction generale")
    || normalized.includes("direction générale")
  ) {
    return "Direction Generale"
  }

  if (normalized.includes("autoliquidation") || normalized.includes("auto liquidation")) {
    return null
  }

  return resolveRegionalRecapRowByDirection(direction)
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

const parseRecapRowsJson = (rowsJson?: string): Record<string, string>[] => {
  try {
    const parsed = JSON.parse(rowsJson ?? "[]")
    return Array.isArray(parsed) ? (parsed as Record<string, string>[]) : []
  } catch {
    return []
  }
}

const isRegionalDrRecapRow = (designation: string): boolean => {
  return normalizeRecapDesignation(designation).startsWith("dr ")
}

const RECAP_MISSING_META_KEY = "__missingCells"

type RecapMissingReason = "missing_declaration" | "not_approved"

const RECAP_MISSING_REASON_LABEL: Record<RecapMissingReason, string> = {
  missing_declaration: "Déclaration non saisie",
  not_approved: "Déclaration non approuvée",
}

const parseRecapMissingMap = (row: Record<string, string>): Record<string, RecapMissingReason> => {
  const raw = safeString(row[RECAP_MISSING_META_KEY]).trim()
  if (!raw) return {}

  try {
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== "object") return {}

    const entries = Object.entries(parsed as Record<string, unknown>)
      .filter(([, value]) => value === "missing_declaration" || value === "not_approved")
      .map(([key, value]) => [key, value as RecapMissingReason])

    return Object.fromEntries(entries)
  } catch {
    return {}
  }
}

const setRecapMissingCell = (
  row: Record<string, string>,
  columnKey: string,
  reason: RecapMissingReason,
): Record<string, string> => {
  const next = { ...row }
  const map = parseRecapMissingMap(next)
  map[columnKey] = reason
  next[RECAP_MISSING_META_KEY] = JSON.stringify(map)
  return next
}

const getRecapMissingReason = (row: Record<string, string>, columnKey: string): RecapMissingReason | null => {
  const map = parseRecapMissingMap(row)
  return map[columnKey] ?? null
}

const clearRecapMissingMeta = (rows: Record<string, string>[]): Record<string, string>[] =>
  rows.map((row) => {
    const next = { ...row }
    delete next[RECAP_MISSING_META_KEY]
    return next
  })

const chooseAggregateMissingReason = (reasons: RecapMissingReason[]): RecapMissingReason =>
  reasons.includes("not_approved") ? "not_approved" : "missing_declaration"

const isDirectionMatchingRecapDesignation = (declarationDirection: string, designation: string): boolean => {
  const normalizedDirection = normalizeRecapDesignation(declarationDirection)
  const normalizedDesignation = normalizeRecapDesignation(designation)

  if (!normalizedDirection || !normalizedDesignation) return false

  if (normalizedDesignation === "direction generale") {
    return (
      normalizedDirection === "siege"
      || normalizedDirection.includes("siege")
      || normalizedDirection.includes("direction generale")
    )
  }

  if (normalizedDesignation === "direction autoliquidation") {
    return normalizedDirection.includes("autoliquidation") || normalizedDirection.includes("auto liquidation")
  }

  if (normalizedDesignation.startsWith("dr ")) {
    const token = normalizedDesignation.replace(/^dr\s+/, "").trim()
    return normalizedDirection.includes(token)
  }

  return normalizedDirection.includes(normalizedDesignation) || normalizedDesignation.includes(normalizedDirection)
}

const resolveDeclarationStatus = (
  declarations: ApiFiscalDeclaration[],
  tabKey: string,
  mois: string,
  annee: string,
  designation?: string,
): "ok" | RecapMissingReason => {
  const scoped = declarations.filter((declaration) => {
    if (declaration.tabKey !== tabKey) return false
    if (declaration.mois !== mois || declaration.annee !== annee) return false
    if (!designation) return true
    return isDirectionMatchingRecapDesignation(declaration.direction, designation)
  })

  if (scoped.length === 0) return "missing_declaration"
  return "ok"
}

const annotateTvaCollecteeMissing = (
  rows: Record<string, string>[],
  declarations: ApiFiscalDeclaration[],
  mois: string,
  annee: string,
): Record<string, string>[] => {
  return clearRecapMissingMeta(rows).map((row) => {
    const designation = safeString(row.designation)
    if (!isTvaCollecteeRecapDrRow(designation)) return row

    const status = resolveDeclarationStatus(declarations, "encaissement", mois, annee, designation)
    if (status === "ok") return row

    let next = setRecapMissingCell(row, "ttc", status)
    next = setRecapMissingCell(next, "ht", status)
    next = setRecapMissingCell(next, "tva", status)
    return next
  })
}

const annotateTvaSituationMissing = (
  rows: Record<string, string>[],
  declarations: ApiFiscalDeclaration[],
  mois: string,
  annee: string,
): Record<string, string>[] => {
  return clearRecapMissingMeta(rows).map((row) => {
    const designation = safeString(row.designation)
    if (designation === "Total" || designation === "Direction Generale" || designation === "Direction AutoLiquidation") {
      return row
    }

    const immoStatus = resolveDeclarationStatus(declarations, "tva_immo", mois, annee, designation)
    const biensStatus = resolveDeclarationStatus(declarations, "tva_biens", mois, annee, designation)

    let next = row
    if (immoStatus !== "ok") {
      next = setRecapMissingCell(next, "immo", immoStatus)
    }
    if (biensStatus !== "ok") {
      next = setRecapMissingCell(next, "biens", biensStatus)
    }
    if (immoStatus !== "ok" || biensStatus !== "ok") {
      const reason = chooseAggregateMissingReason(
        [immoStatus, biensStatus].filter((item) => item !== "ok") as RecapMissingReason[],
      )
      next = setRecapMissingCell(next, "totalDed", reason)
    }

    return next
  })
}

const annotateDroitsTimbreMissing = (
  rows: Record<string, string>[],
  declarations: ApiFiscalDeclaration[],
  mois: string,
  annee: string,
): Record<string, string>[] => {
  return clearRecapMissingMeta(rows).map((row) => {
    const designation = safeString(row.designation)
    if (designation === "Total") return row

    const status = resolveDeclarationStatus(declarations, "droits_timbre", mois, annee, designation)
    if (status === "ok") return row

    let next = setRecapMissingCell(row, "caHt", status)
    next = setRecapMissingCell(next, "montant", status)
    return next
  })
}

const annotateTapLikeMissing = (
  rows: Record<string, string>[],
  declarations: ApiFiscalDeclaration[],
  mois: string,
  annee: string,
  sourceTabKey: FiscalTabKey,
  firstValueColumnKey: "caHt" | "base",
): Record<string, string>[] => {
  return clearRecapMissingMeta(rows).map((row) => {
    const designation = safeString(row.designation)
    if (designation === "Total" || !isRegionalDrRecapRow(designation)) {
      return row
    }

    const status = resolveDeclarationStatus(declarations, sourceTabKey, mois, annee, designation)
    if (status === "ok") return row

    let next = setRecapMissingCell(row, firstValueColumnKey, status)
    next = setRecapMissingCell(next, "taxe", status)
    return next
  })
}

const normalizePayerSourceKey = (designation: string): string => {
  const normalized = normalizeRecapDesignation(designation)
  if (normalized === "tva autoliquidation") return normalizeRecapDesignation("Direction AutoLiquidation")
  return normalized
}

const annotateTvaAPayerMissing = (
  rows: Record<string, string>[],
  tvaCollecteeRows: Record<string, string>[],
  tvaSituationRows: Record<string, string>[],
): Record<string, string>[] => {
  const collecteeByRow = new Map<string, Record<string, RecapMissingReason>>()
  for (const row of tvaCollecteeRows) {
    collecteeByRow.set(normalizeRecapDesignation(safeString(row.designation)), parseRecapMissingMap(row))
  }

  const situationByRow = new Map<string, Record<string, RecapMissingReason>>()
  for (const row of tvaSituationRows) {
    situationByRow.set(normalizeRecapDesignation(safeString(row.designation)), parseRecapMissingMap(row))
  }

  const nextRows = clearRecapMissingMeta(rows).map((row) => {
    const designation = safeString(row.designation)
    const normalized = normalizeRecapDesignation(designation)
    if (normalized === "precompte" || normalized === "reversement" || normalized === "total") return row

    const collecteeMeta = collecteeByRow.get(normalized) ?? {}
    const situationMeta = situationByRow.get(normalizePayerSourceKey(designation)) ?? {}

    let next = row
    const collecteeReason = collecteeMeta.tva ?? collecteeMeta.ht ?? collecteeMeta.ttc
    if (collecteeReason) {
      next = setRecapMissingCell(next, "collectee", collecteeReason)
      next = setRecapMissingCell(next, "payer", collecteeReason)
    }

    const immoReason = situationMeta.immo
    const biensReason = situationMeta.biens
    const aggregateReason = chooseAggregateMissingReason(
      [immoReason, biensReason].filter(Boolean) as RecapMissingReason[],
    )

    if (immoReason) next = setRecapMissingCell(next, "immo", immoReason)
    if (biensReason) next = setRecapMissingCell(next, "biens", biensReason)
    if (immoReason || biensReason) {
      next = setRecapMissingCell(next, "totalDed", aggregateReason)
      next = setRecapMissingCell(next, "payer", aggregateReason)
    }

    return next
  })

  const nonTotalReasons = nextRows
    .filter((row) => normalizeRecapDesignation(safeString(row.designation)) !== "total")
    .flatMap((row) => Object.values(parseRecapMissingMap(row)))

  if (nonTotalReasons.length === 0) return nextRows

  const totalReason = chooseAggregateMissingReason(nonTotalReasons)
  return nextRows.map((row) => {
    if (normalizeRecapDesignation(safeString(row.designation)) !== "total") return row

    let next = setRecapMissingCell(row, "collectee", totalReason)
    next = setRecapMissingCell(next, "immo", totalReason)
    next = setRecapMissingCell(next, "biens", totalReason)
    next = setRecapMissingCell(next, "totalDed", totalReason)
    next = setRecapMissingCell(next, "payer", totalReason)
    return next
  })
}

const annotateG50Missing = (
  rows: Record<string, string>[],
  declarations: ApiFiscalDeclaration[],
  mois: string,
  annee: string,
  tvaAPayerRows: Record<string, string>[],
  tvaSituationRows: Record<string, string>[],
  droitsTimbreRows: Record<string, string>[],
  monthlyRecapRowsByKey: MonthlyG50RecapRowsByKey,
): Record<string, string>[] => {
  const tvaAPayerTotal = tvaAPayerRows.find((row) => normalizeRecapDesignation(safeString(row.designation)) === "total")
  const tvaSituationTotal = tvaSituationRows.find((row) => normalizeRecapDesignation(safeString(row.designation)) === "total")
  const droitsTimbreTotal = droitsTimbreRows.find((row) => normalizeRecapDesignation(safeString(row.designation)) === "total")
  const tap15Total = monthlyRecapRowsByKey.tap15.find((row) => normalizeRecapDesignation(safeString(row.designation)) === "total")
  const tacp7Total = monthlyRecapRowsByKey.tacp7.find((row) => normalizeRecapDesignation(safeString(row.designation)) === "total")
  const tnfdal1Total = monthlyRecapRowsByKey.tnfdal1.find((row) => normalizeRecapDesignation(safeString(row.designation)) === "total")
  const masters15Total = monthlyRecapRowsByKey.masters15.find((row) => normalizeRecapDesignation(safeString(row.designation)) === "total")

  return clearRecapMissingMeta(rows).map((row) => {
    const normalized = normalizeRecapDesignation(safeString(row.designation))

    let reason: RecapMissingReason | "ok" | null = null

    if (normalized === "acompte provisionel") {
      reason = resolveDeclarationStatus(declarations, "acompte", mois, annee)
    } else if (normalized === "tva collectee") {
      reason = tvaAPayerTotal ? (getRecapMissingReason(tvaAPayerTotal, "collectee") ?? "ok") : "missing_declaration"
    } else if (normalized === "tva deductible") {
      reason = tvaSituationTotal ? (getRecapMissingReason(tvaSituationTotal, "totalDed") ?? "ok") : "missing_declaration"
    } else if (normalized === "total tva a payer ") {
      reason = tvaAPayerTotal ? (getRecapMissingReason(tvaAPayerTotal, "payer") ?? "ok") : "missing_declaration"
    } else if (normalized === "droit de timbre") {
      reason = droitsTimbreTotal ? (getRecapMissingReason(droitsTimbreTotal, "montant") ?? "ok") : "missing_declaration"
    } else if (normalized === "tacp 7%" || normalized === "tnfpdal 1%") {
      reason = resolveDeclarationStatus(declarations, "ca_tap", mois, annee)
    } else if (normalized === "irg salaire" || normalized === "autre irg") {
      reason = resolveDeclarationStatus(declarations, "irg", mois, annee)
    } else if (normalized === "taxe de formation") {
      reason = resolveDeclarationStatus(declarations, "taxe_formation", mois, annee)
    } else if (normalized === "taxe vehicule") {
      reason = resolveDeclarationStatus(declarations, "taxe_vehicule", mois, annee)
    } else if (normalized === "la tap") {
      reason = tap15Total ? (getRecapMissingReason(tap15Total, "taxe") ?? "ok") : "missing_declaration"
    } else if (normalized === "tacp 7%") {
      reason = tacp7Total ? (getRecapMissingReason(tacp7Total, "taxe") ?? "ok") : "missing_declaration"
    } else if (normalized === "tnfpdal 1%") {
      reason = tnfdal1Total ? (getRecapMissingReason(tnfdal1Total, "taxe") ?? "ok") : "missing_declaration"
    } else if (normalized === "taxe 2%") {
      reason = resolveDeclarationStatus(declarations, "taxe2", mois, annee)
    } else if (normalized === "taxe 1,5% sur masters ") {
      reason = masters15Total ? (getRecapMissingReason(masters15Total, "taxe") ?? "ok") : "missing_declaration"
    } else if (normalized === "total declaration g 50 " || normalized === "total") {
      const componentReasons = [
        resolveDeclarationStatus(declarations, "acompte", mois, annee),
        resolveDeclarationStatus(declarations, "encaissement", mois, annee),
        resolveDeclarationStatus(declarations, "tva_immo", mois, annee),
        resolveDeclarationStatus(declarations, "tva_biens", mois, annee),
        resolveDeclarationStatus(declarations, "droits_timbre", mois, annee),
        tap15Total ? "ok" : "missing_declaration",
        tacp7Total ? "ok" : "missing_declaration",
        tnfdal1Total ? "ok" : "missing_declaration",
        masters15Total ? "ok" : "missing_declaration",
        resolveDeclarationStatus(declarations, "irg", mois, annee),
        resolveDeclarationStatus(declarations, "taxe_formation", mois, annee),
        resolveDeclarationStatus(declarations, "taxe_vehicule", mois, annee),
        resolveDeclarationStatus(declarations, "taxe2", mois, annee),
      ].filter((status) => status !== "ok") as RecapMissingReason[]

      if (componentReasons.length > 0) {
        reason = chooseAggregateMissingReason(componentReasons)
      } else {
        reason = "ok"
      }
    } else {
      reason = "ok"
    }

    if (!reason || reason === "ok") return row
    return setRecapMissingCell(row, "montant", reason)
  })
}

const getRecapMissingLegendItems = (rows: Record<string, string>[]): string[] => {
  const reasons = new Set<RecapMissingReason>()
  for (const row of rows) {
    for (const reason of Object.values(parseRecapMissingMap(row))) {
      reasons.add(reason)
    }
  }

  return Array.from(reasons).map((reason) => RECAP_MISSING_REASON_LABEL[reason])
}

const getTvaAmountForRecap = (row: TvaRow): number => {
  const explicitTva = parseRecapAmount(row.tva)
  if (explicitTva > 0) return explicitTva

  const ht = parseRecapAmount(row.montantHT)
  const rate = row.tauxTVA === "9" ? 0.09 : 0.19
  return ht * rate
}

const recalcTvaCollecteeRecapRows = (rows: Record<string, string>[]): Record<string, string>[] => {
  const nextRows = rows.map((row) => ({ ...row }))

  let total1Ttc = 0
  let total1Exonere = 0
  let total1Ht = 0
  let total2Ttc = 0
  let total2Exonere = 0
  let total2Ht = 0

  for (const row of nextRows) {
    const designation = String(row.designation ?? "")
    if (isTvaCollecteeRecapTotalRow(designation)) continue

    const ttc = parseRecapAmount(row.ttc)
    const exonere = parseRecapAmount(row.exonere)
    const ht = parseRecapAmount(row.ht)
    row.tva = formatRecapAmount((ht - exonere) * 0.19)

    if (isTvaCollecteeRecapManualRow(designation)) {
      total1Ttc += ttc
      total1Exonere += exonere
      total1Ht += ht
    } else if (isTvaCollecteeRecapDrRow(designation)) {
      total2Ttc += ttc
      total2Exonere += exonere
      total2Ht += ht
    }
  }

  const total1 = nextRows.find((row) => String(row.designation ?? "") === "Total (1)")
  if (total1) {
    total1.ttc = formatRecapAmount(total1Ttc)
    total1.exonere = formatRecapAmount(total1Exonere)
    total1.ht = formatRecapAmount(total1Ht)
    total1.tva = formatRecapAmount((total1Ht - total1Exonere) * 0.19)
  }

  const total2 = nextRows.find((row) => String(row.designation ?? "") === "Total (2)")
  if (total2) {
    total2.ttc = formatRecapAmount(total2Ttc)
    total2.exonere = formatRecapAmount(total2Exonere)
    total2.ht = formatRecapAmount(total2Ht)
    total2.tva = formatRecapAmount((total2Ht - total2Exonere) * 0.19)
  }

  const total12 = nextRows.find((row) => String(row.designation ?? "") === "Total (1)+(2)")
  if (total12) {
    const ttc = total1Ttc + total2Ttc
    const exonere = total1Exonere + total2Exonere
    const ht = total1Ht + total2Ht
    total12.ttc = formatRecapAmount(ttc)
    total12.exonere = formatRecapAmount(exonere)
    total12.ht = formatRecapAmount(ht)
    total12.tva = formatRecapAmount((ht - exonere) * 0.19)
  }

  return nextRows
}

const recalcTvaSituationRecapRows = (rows: Record<string, string>[]): Record<string, string>[] => {
  const nextRows = rows.map((row) => ({ ...row }))

  let totalImmo = 0
  let totalBiens = 0

  for (const row of nextRows) {
    const designation = String(row.designation ?? "")
    if (designation === "Total") continue

    const immo = parseRecapAmount(row.immo)
    const biens = parseRecapAmount(row.biens)

    row.totalDed = formatRecapAmount(immo + biens)
    totalImmo += immo
    totalBiens += biens
  }

  const totalRow = nextRows.find((row) => String(row.designation ?? "") === "Total")
  if (totalRow) {
    totalRow.immo = formatRecapAmount(totalImmo)
    totalRow.biens = formatRecapAmount(totalBiens)
    totalRow.totalDed = formatRecapAmount(totalImmo + totalBiens)
  }

  return nextRows
}

const recalcTvaAPayerRecapRows = (rows: Record<string, string>[]): Record<string, string>[] => {
  const nextRows = rows.map((row) => ({ ...row }))

  let totalCollectee = 0
  let totalImmo = 0
  let totalBiens = 0

  for (const row of nextRows) {
    const designation = normalizeRecapDesignation(String(row.designation ?? ""))
    if (designation === "total") continue

    const collectee = parseRecapAmount(row.collectee)
    const immo = parseRecapAmount(row.immo)
    const biens = parseRecapAmount(row.biens)
    const totalDed = immo + biens

    row.totalDed = formatRecapAmount(totalDed)
    row.payer = formatRecapAmount(collectee - totalDed)

    totalCollectee += collectee
    totalImmo += immo
    totalBiens += biens
  }

  const totalRow = nextRows.find((row) => normalizeRecapDesignation(String(row.designation ?? "")) === "total")
  if (totalRow) {
    const totalDed = totalImmo + totalBiens
    totalRow.collectee = formatRecapAmount(totalCollectee)
    totalRow.immo = formatRecapAmount(totalImmo)
    totalRow.biens = formatRecapAmount(totalBiens)
    totalRow.totalDed = formatRecapAmount(totalDed)
    totalRow.payer = formatRecapAmount(totalCollectee - totalDed)
  }

  return nextRows
}

const buildTvaCollecteeRecapRows = (sources: RecapSourcesResponse): Record<string, string>[] => {
  const drTtcByRow = new Map<string, number>()
  const drHtByRow = new Map<string, number>()

  for (const source of sources.encaissementByDirection) {
    const rowLabel = resolveRegionalRecapRowByDirection(safeString(source.direction))
    if (!rowLabel) continue

    drTtcByRow.set(rowLabel, (drTtcByRow.get(rowLabel) ?? 0) + parseRecapAmount(source.totalTtc))
    drHtByRow.set(rowLabel, (drHtByRow.get(rowLabel) ?? 0) + parseRecapAmount(source.totalHt))
  }

  const rows = TVA_COLLECTEE_RECAP_ROWS.map((designation) => {
    if (isTvaCollecteeRecapDrRow(designation)) {
      return {
        designation,
        ttc: formatRecapAmount(drTtcByRow.get(designation) ?? 0),
        exonere: "0,00",
        ht: formatRecapAmount(drHtByRow.get(designation) ?? 0),
        tva: "0,00",
      }
    }

    return {
      designation,
      ttc: "0,00",
      exonere: "0,00",
      ht: "0,00",
      tva: "0,00",
    }
  })

  return recalcTvaCollecteeRecapRows(rows)
}

const buildTvaSituationRecapRows = (sources: RecapSourcesResponse): Record<string, string>[] => {
  const immoByRow = new Map<string, number>()
  const biensByRow = new Map<string, number>()

  for (const source of sources.tvaImmoByDirection) {
    const rowLabel = resolveTvaSituationRecapRowByDirection(safeString(source.direction))
    if (!rowLabel) continue
    immoByRow.set(rowLabel, (immoByRow.get(rowLabel) ?? 0) + parseRecapAmount(source.amount))
  }

  for (const source of sources.tvaBiensByDirection) {
    const rowLabel = resolveTvaSituationRecapRowByDirection(safeString(source.direction))
    if (!rowLabel) continue
    biensByRow.set(rowLabel, (biensByRow.get(rowLabel) ?? 0) + parseRecapAmount(source.amount))
  }

  let totalImmo = 0
  let totalBiens = 0

  return TVA_SITUATION_RECAP_ROWS.map((designation) => {
    if (designation === "Direction Generale" || designation === "Direction AutoLiquidation") {
      return {
        designation,
        immo: "0,00",
        biens: "0,00",
        totalDed: "0,00",
      }
    }

    if (designation === "Total") {
      const totalDed = totalImmo + totalBiens
      return {
        designation,
        immo: formatRecapAmount(totalImmo),
        biens: formatRecapAmount(totalBiens),
        totalDed: formatRecapAmount(totalDed),
      }
    }

    const immo = immoByRow.get(designation) ?? 0
    const biens = biensByRow.get(designation) ?? 0
    const totalDed = immo + biens

    totalImmo += immo
    totalBiens += biens

    return {
      designation,
      immo: formatRecapAmount(immo),
      biens: formatRecapAmount(biens),
      totalDed: formatRecapAmount(totalDed),
    }
  })
}

const buildTvaAPayerRecapRows = (
  tvaCollecteeRows: Record<string, string>[],
  tvaSituationRows: Record<string, string>[],
): Record<string, string>[] => {
  const collecteeByDesignation = new Map<string, number>()
  for (const row of tvaCollecteeRows) {
    collecteeByDesignation.set(normalizeRecapDesignation(String(row.designation ?? "")), parseRecapAmount(row.tva))
  }

  const deductibleImmoByDesignation = new Map<string, number>()
  const deductibleBiensByDesignation = new Map<string, number>()
  for (const row of tvaSituationRows) {
    const key = normalizeRecapDesignation(String(row.designation ?? ""))
    deductibleImmoByDesignation.set(key, parseRecapAmount(row.immo))
    deductibleBiensByDesignation.set(key, parseRecapAmount(row.biens))
  }

  const rows = TVA_A_PAYER_RECAP_ROWS.map((designation) => {
    const normalized = normalizeRecapDesignation(designation)

    let collectee = 0
    if (normalized === "direction generale") {
      collectee = collecteeByDesignation.get(normalizeRecapDesignation("Total (1)")) ?? 0
    } else if (normalized.startsWith("dr ")) {
      collectee = collecteeByDesignation.get(normalized) ?? 0
    }

    let immo = 0
    let biens = 0
    if (normalized === "direction generale") {
      immo = deductibleImmoByDesignation.get(normalizeRecapDesignation("Direction Generale")) ?? 0
      biens = deductibleBiensByDesignation.get(normalizeRecapDesignation("Direction Generale")) ?? 0
    } else if (normalized === "tva autoliquidation") {
      immo = deductibleImmoByDesignation.get(normalizeRecapDesignation("Direction AutoLiquidation")) ?? 0
      biens = deductibleBiensByDesignation.get(normalizeRecapDesignation("Direction AutoLiquidation")) ?? 0
    } else if (normalized.startsWith("dr ")) {
      immo = deductibleImmoByDesignation.get(normalized) ?? 0
      biens = deductibleBiensByDesignation.get(normalized) ?? 0
    }

    const totalDed = immo + biens
    return {
      designation,
      collectee: formatRecapAmount(collectee),
      immo: formatRecapAmount(immo),
      biens: formatRecapAmount(biens),
      totalDed: formatRecapAmount(totalDed),
      payer: formatRecapAmount(collectee - totalDed),
    }
  })

  return recalcTvaAPayerRecapRows(rows)
}

const buildDroitsTimbreRecapRows = (
  sources: RecapSourcesResponse,
): Record<string, string>[] => {
  const caByRow = new Map<string, number>()
  const montantByRow = new Map<string, number>()

  for (const source of sources.droitsTimbreByDirection) {
    const rowLabel = resolveRegionalRecapRowByDirection(safeString(source.direction))
    if (!rowLabel) continue

    caByRow.set(rowLabel, (caByRow.get(rowLabel) ?? 0) + parseRecapAmount(source.totalCa))
    montantByRow.set(rowLabel, (montantByRow.get(rowLabel) ?? 0) + parseRecapAmount(source.totalMontant))
  }

  let totalCa = 0
  let totalMontant = 0

  return DROITS_TIMBRE_RECAP_ROWS.map((designation) => {
    if (designation === "Total") {
      return {
        designation,
        caHt: formatRecapAmount(totalCa),
        montant: formatRecapAmount(totalMontant),
      }
    }

    const ca = caByRow.get(designation) ?? 0
    const montant = montantByRow.get(designation) ?? 0
    totalCa += ca
    totalMontant += montant

    return {
      designation,
      caHt: formatRecapAmount(ca),
      montant: formatRecapAmount(montant),
    }
  })
}

const buildTap15RecapRows = (
  sources: RecapSourcesResponse,
): Record<string, string>[] => {
  const baseByRow = new Map<string, number>()

  for (const source of sources.tapByDirection) {
    const rowLabel = resolveTapRecapRowByDirection(safeString(source.direction))
    if (!rowLabel) continue

    baseByRow.set(rowLabel, (baseByRow.get(rowLabel) ?? 0) + parseRecapAmount(source.base))
  }

  let totalBase = 0
  let totalTaxe = 0

  return TAP15_RECAP_ROWS.map((designation) => {
    if (designation === "Total") {
      return {
        designation,
        caHt: formatRecapAmount(totalBase),
        taxe: formatRecapAmount(totalTaxe),
      }
    }

    const base = baseByRow.get(designation) ?? 0
    const taxe = base * 0.015
    totalBase += base
    totalTaxe += taxe

    return {
      designation,
      caHt: formatRecapAmount(base),
      taxe: formatRecapAmount(taxe),
    }
  })
}

const buildTnfdal1RecapRows = (
  _sources: RecapSourcesResponse,
): Record<string, string>[] => {
  return TNFDAL1_RECAP_ROWS.map((designation) => ({
    designation,
    caHt: "0,00",
    taxe: "0,00",
  }))
}

const buildTacp7RecapRows = (
  _sources: RecapSourcesResponse,
): Record<string, string>[] => {
  return TACP7_RECAP_ROWS.map((designation) => ({
    designation,
    base: "0,00",
    taxe: "0,00",
  }))
}

const recalcTnfdal1RecapRows = (rows: Record<string, string>[]): Record<string, string>[] => {
  const nextRows = rows.map((row) => ({ ...row }))
  let totalBase = 0
  let totalTaxe = 0

  for (const row of nextRows) {
    const designation = String(row.designation ?? "")
    if (designation === "Total") continue
    totalBase += parseRecapAmount(row.caHt)
    totalTaxe += parseRecapAmount(row.taxe)
  }

  const totalRow = nextRows.find((row) => String(row.designation ?? "") === "Total")
  if (totalRow) {
    totalRow.caHt = formatRecapAmount(totalBase)
    totalRow.taxe = formatRecapAmount(totalTaxe)
  }

  return nextRows
}

const buildMasters15RecapRows = (): Record<string, string>[] => {
  return MASTERS15_RECAP_ROWS.map((designation) => ({
    designation,
    base: "0",
    taxe: "0",
  }))
}

const buildIrgRecapRows = (
  declarations: ApiFiscalDeclaration[],
  mois: string,
  annee: string,
  directionFilter: string,
): Record<string, string>[] => {
  const normalizedFilter = normalizeRecapDesignation(directionFilter)
  const isAll = !normalizedFilter || ["all", "tout", "tous"].includes(normalizedFilter)
  const baseRows = IRG_RECAP_ROWS.slice(0, -1)
  const totals = baseRows.map(() => ({ assiette: 0, montant: 0 }))

  for (const declaration of declarations) {
    if (declaration.tabKey !== "irg") continue
    if (declaration.mois !== mois || declaration.annee !== annee) continue

    const normalizedDeclDirection = normalizeRecapDesignation(declaration.direction)
    if (!isAll) {
      if (!normalizedDeclDirection) continue
      const matches = normalizedDeclDirection === normalizedFilter
        || normalizedDeclDirection.includes(normalizedFilter)
        || normalizedFilter.includes(normalizedDeclDirection)
      if (!matches) continue
    }

    const payload = parseFiscalDataPayload(safeString(declaration.dataJson))
    const rows = Array.isArray(payload.irgRows) ? (payload.irgRows as IrgRow[]) : []

    rows.forEach((row, index) => {
      if (!totals[index]) return
      totals[index].assiette += parseRecapAmount(row.assietteImposable)
      totals[index].montant += parseRecapAmount(row.montant)
    })
  }

  const rows = baseRows.map((designation, index) => ({
    designation,
    assiette: formatRecapAmount(totals[index]?.assiette ?? 0),
    montant: formatRecapAmount(totals[index]?.montant ?? 0),
  }))

  const totalAssiette = totals.reduce((sum, item) => sum + item.assiette, 0)
  const totalMontant = totals.reduce((sum, item) => sum + item.montant, 0)

  rows.push({
    designation: IRG_RECAP_ROWS[IRG_RECAP_ROWS.length - 1],
    assiette: formatRecapAmount(totalAssiette),
    montant: formatRecapAmount(totalMontant),
  })

  return rows
}

const recalcTacp7RecapRows = (rows: Record<string, string>[]): Record<string, string>[] => {
  const nextRows = rows.map((row) => ({ ...row }))
  let totalBase = 0
  let totalTaxe = 0

  for (const row of nextRows) {
    const designation = String(row.designation ?? "")
    if (designation === "Total") continue
    totalBase += parseRecapAmount(row.base)
    totalTaxe += parseRecapAmount(row.taxe)
  }

  const totalRow = nextRows.find((row) => String(row.designation ?? "") === "Total")
  if (totalRow) {
    totalRow.base = formatRecapAmount(totalBase)
    totalRow.taxe = formatRecapAmount(totalTaxe)
  }

  return nextRows
}

const recalcMasters15RecapRows = (rows: Record<string, string>[]): Record<string, string>[] => {
  const nextRows = rows.map((row) => ({ ...row }))
  let totalBase = 0
  let totalTaxe = 0

  for (const row of nextRows) {
    const designation = String(row.designation ?? "")
    if (designation === "Total") continue

    const base = parseRecapAmount(row.base)
    const resolvedTaxe = base * 0.015

    row.taxe = formatRecapAmount(resolvedTaxe)
    totalBase += base
    totalTaxe += resolvedTaxe
  }

  const totalRow = nextRows.find((row) => String(row.designation ?? "") === "Total")
  if (totalRow) {
    totalRow.base = formatRecapAmount(totalBase)
    totalRow.taxe = formatRecapAmount(totalTaxe)
  }

  return nextRows
}

const buildG50AnnualRecapRows = (
  annee: string,
  g50Recaps: Array<{ mois: string; annee: string; rows: Record<string, string>[] }>,
): { rows: Record<string, string>[]; missingMonths: string[] } => {
  const amountsByDesignation = new Map<string, number>()
  const monthsPresent = new Set<string>()

  for (const recap of g50Recaps) {
    if (safeString(recap.annee) !== safeString(annee)) continue
    const recapMonth = safeString(recap.mois)
    if (recapMonth) monthsPresent.add(recapMonth)

    for (const row of recap.rows ?? []) {
      const designation = normalizeRecapDesignation(safeString(row.designation))
      if (!designation) continue
      const amount = parseRecapAmount(row.montant)
      amountsByDesignation.set(designation, (amountsByDesignation.get(designation) ?? 0) + amount)
    }
  }

  // FIX: Recalculate the 3 problematic lines from details instead of using saved 0 values
  const tvaCollectee = amountsByDesignation.get("tva collectee") ?? 0
  const tvaDeductible = amountsByDesignation.get("tva deductible") ?? 0
  const tvaAPayer = tvaCollectee - tvaDeductible
  
  const acompte = amountsByDesignation.get("acompte provisionel") ?? 0
  const droitsTimbre = amountsByDesignation.get("droit de timbre") ?? 0
  const tacp7 = amountsByDesignation.get("tacp 7") ?? 0
  const tnfpdal1 = amountsByDesignation.get("tnfpdal 1") ?? 0
  const irgSalaire = amountsByDesignation.get("irg salaire") ?? 0
  const autreIrg = amountsByDesignation.get("autre irg") ?? 0
  const taxeFormation = amountsByDesignation.get("taxe de formation") ?? 0
  const taxeVehicule = amountsByDesignation.get("taxe vehicule") ?? 0
  const tap = amountsByDesignation.get("la tap") ?? 0
  const taxe2 = amountsByDesignation.get("taxe 2") ?? 0
  
  const totalDeclarationG50 = acompte + tvaCollectee + tvaDeductible + tvaAPayer + droitsTimbre + tacp7 + tnfpdal1 + irgSalaire + autreIrg + taxeFormation + taxeVehicule + tap + taxe2
  
  // FIX: Recalculate masters15 from the total (not from saved 0 value)
  const totalGeneral = amountsByDesignation.get("total") ?? 0
  const masters15 = totalGeneral - totalDeclarationG50

  // Update the map with recalculated values
  amountsByDesignation.set("total tva a payer", tvaAPayer)
  amountsByDesignation.set("total declaration g 50", totalDeclarationG50)
  amountsByDesignation.set("taxe 1 5 sur masters", masters15)
  amountsByDesignation.set("total", totalGeneral)

  const rows = G50_RECAP_ROWS.map((designation) => ({
    designation,
    montant: formatRecapAmount(amountsByDesignation.get(normalizeRecapDesignation(designation)) ?? 0),
  }))

  const missingMonths = MONTHS
    .filter((month) => !monthsPresent.has(month.value))
    .map((month) => `${month.label} ${annee}`)

  return { rows, missingMonths }
}

const getRecapRowAmount = (rows: Record<string, string>[], designation: string, key: string): number => {
  const normalized = normalizeRecapDesignation(designation)
  const row = rows.find((item) => normalizeRecapDesignation(String(item.designation ?? "")) === normalized)
  return parseRecapAmount(row?.[key])
}

const buildG50RecapRows = (
  mois: string,
  annee: string,
  declarations: ApiFiscalDeclaration[],
  sources: RecapSourcesResponse,
  monthlyRecapRowsByKey: MonthlyG50RecapRowsByKey,
): Record<string, string>[] => {
  const tvaAPayerRows = buildTvaAPayerRecapRows(
    buildTvaCollecteeRecapRows(sources),
    buildTvaSituationRecapRows(sources),
  )
  const tvaSituationRows = buildTvaSituationRecapRows(sources)
  const droitsTimbreRows = buildDroitsTimbreRecapRows(sources)

  const tacp7Total = getRecapRowAmount(monthlyRecapRowsByKey.tacp7, "Total", "taxe")
  const tnfpdal1Total = getRecapRowAmount(monthlyRecapRowsByKey.tnfdal1, "Total", "taxe")
  const tapTotal = getRecapRowAmount(monthlyRecapRowsByKey.tap15, "Total", "taxe")

  const values = {
    acompte: 0,
    tvaCollectee: getRecapRowAmount(tvaAPayerRows, "Total", "collectee"),
    tvaDeductible: getRecapRowAmount(tvaSituationRows, "Total", "totalDed"),
    tvaAPayer: getRecapRowAmount(tvaAPayerRows, "Total", "payer"),
    droitsTimbre: getRecapRowAmount(droitsTimbreRows, "Total", "montant"),
    tacp7: tacp7Total,
    tnfpdal1: tnfpdal1Total,
    irgSalaire: 0,
    autreIrg: 0,
    taxeFormation: 0,
    taxeVehicule: 0,
    tap: tapTotal,
    taxe2: 0,
    masters15: 0,
  }

  let taxe2DeclarationCount = 0
  let mastersDeclarationCount = 0

  for (const declaration of declarations) {
    if (declaration.mois !== mois || declaration.annee !== annee) continue

    const payload = parseFiscalDataPayload(safeString(declaration.dataJson))

    if (declaration.tabKey === "acompte") {
      const months = Array.isArray(payload.acompteMonths) ? (payload.acompteMonths as string[]) : []
      values.acompte += months.reduce((sum, value) => sum + parseRecapAmount(value), 0)
      continue
    }

    if (declaration.tabKey === "irg") {
      const rows = Array.isArray(payload.irgRows) ? (payload.irgRows as IrgRow[]) : []
      values.irgSalaire += parseRecapAmount(rows[0]?.montant)
      values.autreIrg += rows.slice(1).reduce((sum, row) => sum + parseRecapAmount(row.montant), 0)
      continue
    }

    if (declaration.tabKey === "taxe_formation") {
      const rows = Array.isArray(payload.taxe12Rows) ? (payload.taxe12Rows as Taxe12Row[]) : []
      values.taxeFormation += rows.reduce((sum, row) => sum + parseRecapAmount(row.montant), 0)
      continue
    }

    if (declaration.tabKey === "taxe_vehicule") {
      values.taxeVehicule += parseRecapAmount(payload.taxe11Montant)
      continue
    }

    if (declaration.tabKey === "taxe2") {
      taxe2DeclarationCount++
      const rows = Array.isArray(payload.taxe2Rows) ? (payload.taxe2Rows as Taxe2Row[]) : []
      values.taxe2 += rows.reduce((sum, row) => sum + parseRecapAmount(row.montant), 0)
      continue
    }

    if (declaration.tabKey === "taxe_masters") {
      mastersDeclarationCount++
      const rows = Array.isArray(payload.masterRows) ? (payload.masterRows as MasterRow[]) : []
      values.masters15 += rows.reduce((sum, row) => sum + parseRecapAmount(row.montantHT) * 0.015, 0)
      continue
    }

  }

  const totalDeclarationG50 = values.acompte
    + values.tvaCollectee
    + values.tvaDeductible
    + values.tvaAPayer
    + values.droitsTimbre
    + values.tacp7
    + values.tnfpdal1
    + values.irgSalaire
    + values.autreIrg
    + values.taxeFormation
    + values.taxeVehicule
    + values.tap
    + values.taxe2

  const totalGeneral = totalDeclarationG50 + values.masters15

  const amountByDesignation = new Map<string, number>([
    ["acompte provisionel", values.acompte],
    ["tva collectee", values.tvaCollectee],
    ["tva deductible", values.tvaDeductible],
    ["total tva a payer", values.tvaAPayer],
    ["droit de timbre", values.droitsTimbre],
    ["tacp 7", values.tacp7],
    ["tnfpdal 1", values.tnfpdal1],
    ["irg salaire", values.irgSalaire],
    ["autre irg", values.autreIrg],
    ["taxe de formation", values.taxeFormation],
    ["taxe vehicule", values.taxeVehicule],
    ["la tap", values.tap],
    ["taxe 2", values.taxe2],
    ["total declaration g 50", totalDeclarationG50],
    ["taxe 1 5 sur masters", values.masters15],
    ["total", totalGeneral],
  ])

  return G50_RECAP_ROWS.map((designation) => ({
    designation,
    montant: formatRecapAmount(amountByDesignation.get(normalizeRecapDesignation(designation)) ?? 0),
  }))
}

const isRecapCellEditable = (recapKey: RecapKey, designation: string, columnKey: string): boolean => {
  if (columnKey === "designation") return false
  if (designation === "Total") return false
  /*
  if (recapKey === "tva_collectee") {
    if (isTvaCollecteeRecapTotalRow(designation)) return false
    if (columnKey === "tva") return false
    if (isTvaCollecteeRecapDrRow(designation) && (columnKey === "ttc" || columnKey === "ht")) return false
    return true
  }

  if (recapKey === "tva_situation") {
    if (designation === "Total") return false
    if (columnKey === "totalDed") return false
    if (designation === "Direction Generale" || designation === "Direction AutoLiquidation") {
      return columnKey === "immo" || columnKey === "biens"
    }
    return false
  }

  if (recapKey === "masters15") {
    return designation !== "Total" && columnKey === "base"
  }

  if (recapKey === "tacp7") {
    return designation !== "Total" && (columnKey === "base" || columnKey === "taxe")
  }

  if (recapKey === "tnfdal1") {
    return designation === "Direction Generale" && (columnKey === "caHt" || columnKey === "taxe")
  }

  if (recapKey === "irg_recap") {
    return false
  }

  if (recapKey === "tap15" || recapKey === "droits_timbre" || recapKey === "tva_a_payer" || recapKey === "g50" || recapKey === "g50_annuel") return false

  return false*/
  return true
}

const isRecapCellMandatory = (recapKey: RecapKey, designation: string, columnKey: string): boolean => {
  if (!isRecapCellEditable(recapKey, designation, columnKey)) return false

  if (recapKey === "tva_collectee") {
    return columnKey === "ttc" || columnKey === "exonere" || columnKey === "ht"
  }

  if (recapKey === "tva_situation") {
    return columnKey === "immo" || columnKey === "biens"
  }

  return false
}

const blankZeroManualRecapCells = (recapKey: RecapKey, rows: Record<string, string>[]): Record<string, string>[] => {
  const definition = RECAP_TABS.find((item) => item.key === recapKey)
  if (!definition) return rows

  return rows.map((row) => {
    const designation = String(row.designation ?? "")
    const nextRow: Record<string, string> = { ...row }

    for (const column of definition.columns) {
      if (column.key === "designation") continue
      if (!isRecapCellEditable(recapKey, designation, column.key)) continue

      const rawValue = safeString(nextRow[column.key]).trim()
      if (!rawValue) continue

      if (parseRecapAmount(rawValue) === 0) {
        nextRow[column.key] = ""
      }
    }

    return nextRow
  })
}

const getRecapCellFormula = (recapKey: RecapKey, designation: string, columnKey: string): string => {
  const row = normalizeRecapDesignation(designation)

  if (columnKey === "designation") return "Saisie manuelle"

  if (recapKey === "g50_annuel" && columnKey === "montant") {
    return "Somme annuelle (janvier a decembre) des montants du recap G50"
  }

  if (recapKey === "g50" && columnKey === "montant") {
    if (row === "tva collectee") return "TVA collectee = TVA_a_payer.Total(colonne TVA collectee)"
    if (row === "tva deductible") return "TVA deductible = TVA_situation.Total = (TVA immo + TVA biens)"
    if (row === "total tva a payer ") return "TVA a payer = TVA_a_payer.Total(colonne TVA a payer) = (TVA collectee - TVA deductible)"
    if (row === "droit de timbre") return "Droit de timbre = Droits_timbre.Total"
    if (row === "tacp 7%") return "TACP 7% = SUM(CA_TAP.B12) * (7 / 100)"
    if (row === "tnfpdal 1%") return "TNFPDAL 1% = SUM(CA_TAP.B13) * (1 / 100)"
    if (row === "irg salaire") return "IRG salaire = SUM(IRG.ligne1)"
    if (row === "autre irg") return "Autre IRG = SUM(IRG.lignes2..n)"
    if (row === "taxe de formation") return "Taxe formation = (Taxe formation pro) + (Taxe d'apprentissage)"
    if (row === "taxe vehicule") return "Taxe vehicule = SUM(Tableau taxe vehicule)"
    if (row === "la tap") return "LA TAP = TAP_1.5%.Total"
    if (row === "taxe 2%") return "Taxe 2% = SUM(Tableau taxe 2%.montant)"
    if (row === "total declaration g 50 ") return "Total declaration G50 = (Acompte + TVA collectee + TVA deductible + TVA a payer + Droit de timbre + TACP 7% + TNFPDAL 1% + IRG salaire + Autre IRG + Taxe formation + Taxe vehicule + LA TAP + Taxe 2%)"
    if (row === "taxe 1,5% sur masters ") return "Taxe masters = SUM( IF(taxe15 > 0, taxe15, montantHT * (1.5 / 100)) )"
    if (row === "total") return "Total general = (Total declaration G50) + (Taxe 1.5% sur masters)"
    return "Saisie manuelle"
  }

  if (recapKey === "tva_a_payer") {
    if (row === "precompte" || row === "reversement") return "Saisie automatique"
    if (row === "total") {
      if (columnKey === "collectee") return "Somme colonne TVA Collectee"
      if (columnKey === "immo") return "Somme colonne TVA Deductible sur Immobilisation"
      if (columnKey === "biens") return "Somme colonne TVA Deductible sur Biens et Services"
      if (columnKey === "totalDed") return "Somme colonne Total de la TVA Deductible"
      if (columnKey === "payer") return "Somme colonne TVA a Payer"
    }

    if (columnKey === "collectee") return "Extrait depuis le tableau TVA collectee"
    if (columnKey === "immo") return "Extrait depuis le tableau TVA deductible"
    if (columnKey === "biens") return "Extrait depuis le tableau TVA deductible"
    if (columnKey === "totalDed") return "Total TVA deductible = (TVA immo + TVA biens)"
    if (columnKey === "payer") return "TVA a payer = (TVA collectee - Total TVA deductible)"
  }

  if (recapKey === "tva_situation") {
    if (row === "total") {
      if (columnKey === "immo") return "Somme colonne TVA Deductible sur Immobilisation"
      if (columnKey === "biens") return "Somme colonne TVA Deductible sur Biens et Services"
    }

    if (designation === "Direction Generale" || designation === "Direction AutoLiquidation") {
      if (columnKey === "immo") return "Saisie manuelle"
      if (columnKey === "biens") return "Saisie manuelle"
    } else {
      if (columnKey === "immo") return "Extrait depuis les declarations TVA / IMMO"
      if (columnKey === "biens") return "Extrait depuis les declarations TVA / Biens & Services"
    }

    if (columnKey === "totalDed") return "Total TVA deductible = (TVA immo + TVA biens)"
  }

  if (recapKey === "tva_collectee") {
    if (isTvaCollecteeRecapTotalRow(designation)) {
      if (columnKey === "ttc") return "Somme automatique"
      if (columnKey === "exonere") return "Somme automatique"
      if (columnKey === "ht") return "Somme automatique"
      if (columnKey === "tva") return "TVA = (HT - Exonere) * 19%"
    }

    if (isTvaCollecteeRecapDrRow(designation)) {
      if (columnKey === "ttc") return "Extrait depuis le tableau 1 (Encaissement TTC)"
      if (columnKey === "ht") return "Extrait depuis le tableau 1 (Encaissement HT)"
      if (columnKey === "exonere") return "Saisie manuelle"
      if (columnKey === "tva") return "TVA = (HT - Exonere) * 19%"
    }

    if (isTvaCollecteeRecapManualRow(designation)) {
      if (columnKey === "ttc") return "Saisie manuelle"
      if (columnKey === "exonere") return "Saisie manuelle"
      if (columnKey === "ht") return "Saisie manuelle"
      if (columnKey === "tva") return "TVA = (HT - Exonere) * 19%"
    }
  }

  if (recapKey === "droits_timbre") {
    if (columnKey === "caHt") return "Base CA = SUM(Droits de timbre.CA TTC especes)"
    if (columnKey === "montant") return "Montant = SUM(Droits de timbre.droit timbre)"
  }

  if (recapKey === "tap15") {
    if (columnKey === "caHt") return "Base = SUM(ETAT_TAP.montant imposable)"
    if (columnKey === "taxe") return "Taxe = Base * (1.5 / 100)"
  }

  if (recapKey === "tnfdal1") {
    if (columnKey === "caHt") return "Saisie manuelle"
    if (columnKey === "taxe") return "Saisie manuelle"
  }

  if (recapKey === "irg_recap") {
    if (columnKey === "assiette" || columnKey === "montant") {
      return "Extrait depuis la declaration N8 - Situation IRG"
    }
  }

  if (recapKey === "masters15" && columnKey === "taxe") {
    return "Taxe proposee = Base * (1.5 / 100)"
  }

  return "Saisie manuelle"
}

const isFiscalTabKey = (value: string): value is FiscalTabKey => {
  return [
    "encaissement",
    "tva_immo",
    "tva_biens",
    "droits_timbre",
    "ca_tap",
    "etat_tap",
    "ca_siege",
    "irg",
    "taxe2",
    "taxe_masters",
    "taxe_vehicule",
    "taxe_formation",
    "acompte",
    "ibs",
    "taxe_domicil",
    "tva_autoliq",
  ].includes(value)
}

const isRecapKey = (value: string): value is RecapKey => {
  return ["tva_collectee", "tva_a_payer", "tva_situation", "droits_timbre", "tacp7", "tnfdal1", "tap15", "masters15", "irg_recap", "g50", "g50_annuel"].includes(value)
}

const normalizeMonthValue = (value: string) => {
  return MONTHS.some((month) => month.value === value)
    ? value
    : String(new Date().getMonth() + 1).padStart(2, "0")
}

const normalizeYearValue = (value: string) => {
  return YEARS.includes(value) ? value : String(CURRENT_YEAR)
}

const fillRows = <T,>(rows: T[], size: number, makeDefault: () => T) => {
  const next = rows.slice(0, size)
  while (next.length < size) {
    next.push(makeDefault())
  }
  return next
}

const normalizeEncRows = (rows?: EncRow[]) => {
  const sourceRows = rows ?? []
  return FIXED_ENCAISSEMENT_DESIGNATIONS.map((designation, index) => {
    const row = sourceRows[index] as (Partial<EncRow> & { ttc?: string }) | undefined
    const source = row ?? {}
    const existingHt = safeString(source.ht)
    const legacyTtc = safeString(source.ttc)
    const migratedHt = legacyTtc.trim() ? (num(legacyTtc, true) / 1.19).toFixed(2) : ""

    return {
      designation,
      ht: existingHt || migratedHt,
    }
  })
}

const normalizeTvaRows = (rows?: TvaRow[]) => {
  const normalized = (rows ?? []).map((row) => {
    const source = row as Partial<TvaRow>
    return {
      ...EMPTY_TVA,
      fournisseurId: safeString(source.fournisseurId),
      nomRaisonSociale: safeString(source.nomRaisonSociale),
      adresse: safeString(source.adresse),
      nif: safeString(source.nif),
      authNif: safeString(source.authNif),
      numRC: safeString(source.numRC),
      authRC: safeString(source.authRC),
      numFacture: safeString(source.numFacture),
      dateFacture: safeString(source.dateFacture),
      montantHT: safeString(source.montantHT),
      tva: safeString(source.tva),
      tauxTVA: normalizeTvaRate(source.tauxTVA),
    }
  })
  return normalized.length > 0 ? normalized : [{ ...EMPTY_TVA }]
}

const normalizeTimbreRows = (rows?: TimbreRow[]) => {
  const first = (rows ?? [])[0] as Partial<TimbreRow> | undefined
  return [{
    designation: FIXED_TIMBRE_ROW.designation,
    caTTCEsp: safeString(first?.caTTCEsp),
    droitTimbre: safeString(first?.droitTimbre),
  }]
}

const normalizeTapRows = (rows?: TAPRow[]) => {
  const normalized = (rows ?? []).map((row) => ({
    wilayaCode: safeString((row as Partial<TAPRow>).wilayaCode),
    commune: safeString((row as Partial<TAPRow>).commune),
    tap2: safeString((row as Partial<TAPRow>).tap2),
  }))
  return normalized.length > 0 ? normalized : [{ wilayaCode: "", commune: "", tap2: "" }]
}

const normalizeSiegeRows = (rows?: SiegeEncRow[]) => {
  const normalized = (rows ?? []).map((row) => ({
    ttc: safeString((row as Partial<SiegeEncRow>).ttc),
    ht: safeString((row as Partial<SiegeEncRow>).ht),
  }))
  return fillRows(normalized, 12, () => ({ ttc: "", ht: "" }))
}

const normalizeIrgRows = (rows?: IrgRow[]) => {
  const normalized = (rows ?? []).map((row, index) => {
    const assietteImposable = safeString((row as Partial<IrgRow>).assietteImposable)
    const sourceMontant = safeString((row as Partial<IrgRow>).montant)
    const autoRate = IRG_AUTO_RATES[index]
    const montant = autoRate !== null && assietteImposable
      ? (num(assietteImposable, false) * autoRate).toFixed(2)
      : sourceMontant
    return { assietteImposable, montant }
  })
  return fillRows(normalized, IRG_LABELS.length, () => ({ assietteImposable: "", montant: "" }))
}

const normalizeTaxe2Rows = (rows?: Taxe2Row[]) => {
  const normalized = (rows ?? []).map((row) => ({
    base: safeString((row as Partial<Taxe2Row>).base),
    montant: safeString((row as Partial<Taxe2Row>).montant),
  }))
  return fillRows(normalized, 1, () => ({ base: "", montant: "" }))
}

const normalizeMasterRows = (rows?: MasterRow[]) => {
  const normalized = (rows ?? []).map((row) => {
    const source = row as Partial<MasterRow>
    const montantHT = safeString(source.montantHT)
    return {
      ...EMPTY_MASTER,
      date: safeString(source.date),
      nomMaster: safeString(source.nomMaster),
      numFacture: safeString(source.numFacture),
      dateFacture: safeString(source.dateFacture),
      montantHT,
      taxe15: montantHT ? formatRecapAmount(parseRecapAmount(montantHT) * 0.015) : "",
      mois: safeString(source.mois),
      observation: safeString(source.observation),
    }
  })
  return normalized.length > 0 ? normalized : [{ ...EMPTY_MASTER }]
}

const normalizeTaxe12Rows = (rows?: Taxe12Row[]) => {
  const normalized = (rows ?? []).map((row) => ({
    montant: safeString((row as Partial<Taxe12Row>).montant),
  }))
  return fillRows(normalized, 2, () => ({ montant: "" }))
}

const normalizeTnfdal1Rows = (rows?: Tnfdal1Row[]) => {
  const sourceRows = rows ?? []
  const normalized = TNFDAL1_DECLARATION_ROWS.map((designation, index) => {
    const row = sourceRows[index] as Partial<Tnfdal1Row> | undefined
    return {
      designation,
      caHt: safeString(row?.caHt),
      taxe: safeString(row?.taxe),
    }
  })
  return fillRows(normalized, TNFDAL1_DECLARATION_ROWS.length, () => ({ designation: "", caHt: "", taxe: "" }))
}

const normalizeTacp7Rows = (rows?: Tacp7Row[]) => {
  const sourceRows = rows ?? []
  const normalized = TACP7_DECLARATION_ROWS.map((designation, index) => {
    const row = sourceRows[index] as Partial<Tacp7Row> | undefined
    return {
      designation,
      base: safeString(row?.base),
      taxe: safeString(row?.taxe),
    }
  })
  return fillRows(normalized, TACP7_DECLARATION_ROWS.length, () => ({ designation: "", base: "", taxe: "" }))
}

const normalizeAcompteMonths = (months?: string[]) => {
  // Support legacy 12-month arrays (Jan..Dec) by picking Feb, May, Oct (indices 1,4,9)
  if (!months) return Array(3).fill("")
  if (months.length === 12) {
    return [safeString(months[1]), safeString(months[4]), safeString(months[9])]
  }
  // If already 3-length, return normalized copy
  if (months.length === 3) return months.map((m) => safeString(m))
  // Otherwise, fill/trim to length 3
  const copy = months.slice(0, 3).map((m) => safeString(m))
  while (copy.length < 3) copy.push("")
  return copy
}

const resolveDeclarationTabKey = (decl: SavedDeclaration): FiscalTabKey => {
  if ((decl.encRows?.length ?? 0) > 0) return "encaissement"
  if ((decl.tvaImmoRows?.length ?? 0) > 0) return "tva_immo"
  if ((decl.tvaBiensRows?.length ?? 0) > 0) return "tva_biens"
  if ((decl.timbreRows?.length ?? 0) > 0) return "droits_timbre"
  if (safeString(decl.b12).trim() || safeString(decl.b13).trim()) return "ca_tap"
  if ((decl.tapRows?.length ?? 0) > 0) return "etat_tap"
  if ((decl.caSiegeRows?.length ?? 0) > 0) return "ca_siege"
  if ((decl.irgRows?.length ?? 0) > 0) return "irg"
  if ((decl.taxe2Rows?.length ?? 0) > 0) return "taxe2"
  if ((decl.masterRows?.length ?? 0) > 0) return "taxe_masters"
  if (safeString(decl.taxe11Montant).trim()) return "taxe_vehicule"
  if ((decl.taxe12Rows?.length ?? 0) > 0) return "taxe_formation"
  if ((decl.acompteMonths?.length ?? 0) > 0) return "acompte"

  if ((decl.tnfdal1Rows ?? []).some((row) => safeString(row.caHt).trim() || safeString(row.taxe).trim())) return "tnfdal1"
  if ((decl.tacp7Rows ?? []).some((row) => safeString(row.base).trim() || safeString(row.taxe).trim())) return "tacp7"
  return "encaissement"
}

type TvaInvoiceDuplicateInfo = {
  fournisseur: string
  reference: string
  date: string
}

const normalizeInvoicePart = (value: unknown) => safeString(value).trim().toUpperCase()

const normalizeInvoiceDate = (value: unknown) => {
  const raw = safeString(value).trim()
  if (!raw) return ""
  if (raw.includes("T")) return raw.slice(0, 10)
  return raw
}

const getInvoiceSupplierKey = (row: TvaRow) => {
  const supplierId = normalizeInvoicePart(row.fournisseurId)
  if (supplierId) return `ID:${supplierId}`
  const supplierName = normalizeInvoicePart(row.nomRaisonSociale)
  if (supplierName) return `NAME:${supplierName}`
  return ""
}

const getInvoiceDisplayInfo = (row: TvaRow): TvaInvoiceDuplicateInfo => ({
  fournisseur: safeString(row.nomRaisonSociale).trim() || safeString(row.fournisseurId).trim() || "-",
  reference: safeString(row.numFacture).trim(),
  date: normalizeInvoiceDate(row.dateFacture),
})

const getInvoiceCompositeKey = (row: TvaRow) => {
  const supplierKey = getInvoiceSupplierKey(row)
  const reference = normalizeInvoicePart(row.numFacture)
  const date = normalizeInvoiceDate(row.dateFacture)
  if (!supplierKey || !reference || !date) return ""
  return `${supplierKey}|${reference}|${date}`
}

const findDuplicateInTvaRows = (rows: TvaRow[]): TvaInvoiceDuplicateInfo | null => {
  const seen = new Set<string>()
  for (const row of rows) {
    const key = getInvoiceCompositeKey(row)
    if (!key) continue
    if (seen.has(key)) {
      return getInvoiceDisplayInfo(row)
    }
    seen.add(key)
  }
  return null
}

const findDuplicateAcrossSavedDeclarations = (
  rows: TvaRow[],
  declarations: SavedDeclaration[],
  editingDeclarationId: string | null,
): TvaInvoiceDuplicateInfo | null => {
  const existingKeys = new Set<string>()

  for (const declaration of declarations) {
    if (editingDeclarationId && safeString(declaration.id) === editingDeclarationId) {
      continue
    }

    const historicalRows = [
      ...(declaration.tvaImmoRows ?? []),
      ...(declaration.tvaBiensRows ?? []),
    ]

    for (const historicalRow of historicalRows) {
      const key = getInvoiceCompositeKey(historicalRow)
      if (key) {
        existingKeys.add(key)
      }
    }
  }

  for (const row of rows) {
    const key = getInvoiceCompositeKey(row)
    if (!key) continue
    if (existingKeys.has(key)) {
      return getInvoiceDisplayInfo(row)
    }
  }

  return null
}

// 
// PRINT ZONE - hidden on screen, visible only when printing
// Renders a static read-only A4 landscape version of the active tab's data
// 
interface PrintZoneProps {
  activeTab: string
  direction: string
  mois: string
  annee: string
  wilayas: { code: string; wilaya: string; communes: { id: string; nom: string }[] }[]
  encRows: EncRow[]
  tvaImmoRows: TvaRow[]
  tvaBiensRows: TvaRow[]
  timbreRows: TimbreRow[]
  b12: string; b13: string
  tapRows: TAPRow[]
  caSiegeRows: SiegeEncRow[]
  irgRows: IrgRow[]
  taxe2Rows: Taxe2Row[]
  masterRows: MasterRow[]
  taxe11Montant: string
  taxe12Rows: Taxe12Row[]
  acompteMonths: string[]

  tnfdal1Rows: Tnfdal1Row[]
  tacp7Rows: Tacp7Row[]
}

function PrintZone({ activeTab, direction, mois, annee, wilayas, encRows, tvaImmoRows, tvaBiensRows, timbreRows, b12, b13, tapRows, caSiegeRows, irgRows, taxe2Rows, masterRows, taxe11Montant, taxe12Rows, acompteMonths, tnfdal1Rows, tacp7Rows }: PrintZoneProps) {
  const tab  = TABS.find((t) => t.key === activeTab)!
  const mon  = MONTHS.find((m) => m.value === mois)?.label ?? mois
  const c12  = num(b12) * 0.07
  const c13  = num(b13) * 0.01
  const thStyle: React.CSSProperties = {
    border: "1px solid #000", padding: "4px 6px", backgroundColor: "#fff", color: "#000",
    fontSize: 11, fontWeight: 700, textAlign: "left", whiteSpace: "nowrap", verticalAlign: "middle",
  }
  const tdStyle: React.CSSProperties = {
    border: "1px solid #000", padding: "3px 6px", fontSize: 9, backgroundColor: "#fff", color: "#000", verticalAlign: "middle",
  }

  return (
    <div id="print-zone" style={{ display: "none" }}>
      <style>{`
        #print-zone table th,
        #print-zone table td {
          color: #000 !important;
          text-align: center !important;
          vertical-align: middle !important;
          direction: ltr !important;
        }
        #print-zone table tbody td {
          background-color: #fff !important;
        }
        #print-zone table thead th,
        #print-zone table tfoot td,
        #print-zone table tbody tr[style*="font-weight:700"] td,
        #print-zone table tbody tr[style*="font-weight: 700"] td,
        #print-zone table tbody tr[style*="font-weight:bold"] td,
        #print-zone table tbody tr[style*="font-weight: bold"] td {
          background-color: #2db34b !important;
          color: #000 !important;
          font-weight: 800 !important;
        }
      `}</style>
      {/*  PDF header  */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", paddingBottom: 12, borderBottom: "2px solid #000", marginBottom: 20 }}>
        {/* LEFT - logo + stacked info boxes */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Logo" style={{ height: 52, objectFit: "contain" }} />
          <div style={{ width: 260, border: "3px solid #000", backgroundColor: "#fff" }}>
            <div
              style={{
                minHeight: 32,
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-start",
                textAlign: "left",
                direction: "ltr",
                padding: "0 10px",
                borderBottom: "3px solid #000",
                fontSize: 13,
                fontWeight: 700,
                color: "#000",
                textTransform: "uppercase",
              }}
            >
              ATM MOBILIS
            </div>
            <div
              style={{
                minHeight: 32,
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-start",
                textAlign: "left",
                direction: "ltr",
                padding: "0 10px",
                fontSize: 13,
                fontWeight: 700,
                color: "#000",
              }}
            >
              DR : {direction || "-"}
            </div>
          </div>
        </div>
        {/* RIGHT - stacked month/year boxes */}
        <div
          style={{
            width: 260,
            border: "3px solid #000",
            backgroundColor: "#fff",
          }}
        >
          <div
            style={{
              minHeight: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-start",
              textAlign: "left",
              direction: "ltr",
              padding: "0 10px",
              borderBottom: "3px solid #000",
              fontSize: 13,
              fontWeight: 700,
              color: "#000",
            }}
          >
            Declaration Mois : {mon}
          </div>
          <div
            style={{
              minHeight: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-start",
              textAlign: "left",
              direction: "ltr",
              padding: "0 10px",
              fontSize: 13,
              fontWeight: 700,
              color: "#000",
            }}
          >
            Annee : {annee}
          </div>
        </div>
      </div>
      {/*  Centered title  */}
      <div style={{ textAlign: "center", fontSize: 15, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.5, color: "#000", marginBottom: 20 }}>
        {tab.title}
      </div>

      {/*  Table content per tab  */}
      {activeTab === "encaissement" && (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>
            <th style={thStyle}>#</th>
            <th style={thStyle}>Designation</th>
            <th style={thStyle}>Encaissement HT</th>
            <th style={thStyle}>TVA</th>
            <th style={thStyle}>Encaissement TTC</th>
          </tr></thead>
          <tbody>
            {encRows.map((r, i) => {
              const ht = num(r.ht)
              const tva = ht * 0.19
              const ttc = ht + tva
              return <tr key={i} style={{ background: "#fff", color: "#000" }}>
                <td style={{ ...tdStyle, textAlign: "center", backgroundColor: "#fff", color: "#000" }}>{i + 1}</td>
                <td style={{ ...tdStyle, backgroundColor: "#fff", color: "#000" }}>{r.designation}</td>
                <td style={{ ...tdStyle, textAlign: "right", backgroundColor: "#fff", color: "#000" }}>{r.ht ? fmt(ht) : ""}</td>
                <td style={{ ...tdStyle, textAlign: "right", backgroundColor: "#fff", color: "#000" }}>{r.ht ? fmt(tva) : ""}</td>
                <td style={{ ...tdStyle, textAlign: "right", backgroundColor: "#fff", color: "#000" }}>{r.ht ? fmt(ttc) : ""}</td>
              </tr>
            })}
          </tbody>
          <tfoot><tr style={{ background: "#ddd", fontWeight: 700, color: "#000" }}>
            <td colSpan={2} style={{ ...tdStyle, textAlign: "right", backgroundColor: "#ddd", color: "#000" }}>TOTAL</td>
            <td style={{ ...tdStyle, textAlign: "right", backgroundColor: "#ddd", color: "#000" }}>{fmt(encRows.reduce((s, r) => s + num(r.ht), 0))}</td>
            <td style={{ ...tdStyle, textAlign: "right", backgroundColor: "#ddd", color: "#000" }}>{fmt(encRows.reduce((s, r) => s + num(r.ht) * 0.19, 0))}</td>
            <td style={{ ...tdStyle, textAlign: "right", backgroundColor: "#ddd", color: "#000" }}>{fmt(encRows.reduce((s, r) => s + num(r.ht) * 1.19, 0))}</td>
          </tr></tfoot>
        </table>
      )}

      {(activeTab === "tva_immo" || activeTab === "tva_biens") && (() => {
        const rows = activeTab === "tva_immo" ? tvaImmoRows : tvaBiensRows;
        const tHT  = rows.reduce((s, r) => s + num(r.montantHT), 0);
        const tTVA = rows.reduce((s, r) => s + getTvaAmount(r, true), 0);
        const tTTC = tHT + tTVA;
        const totalLabel = activeTab === "tva_immo"
          ? "TOTAL TVA SUR IMMOBILISATION 445620"
          : "TOTAL TVA SUR BIENS ET SERVICES";
        return (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              {["Nom et prénoms /Raison sociale","Adresse","NIF","Authentification du NIF","RC n°","Authentification du n°RC","Facture n°","Date","Montant HT", "TVA", "Montant TTC"].map((h) => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {rows.map((r, i) => {
                const rowTva = getTvaAmount(r, true)
                const rowTTC = num(r.montantHT) + rowTva
                return <tr key={i} style={{ background: "#fff", color: "#000" }}>
                  <td style={{ ...tdStyle, backgroundColor: "#fff", color: "#000" }}>{printNullableText(r.nomRaisonSociale)}</td>
                  <td style={{ ...tdStyle, backgroundColor: "#fff", color: "#000" }}>{printNullableText(r.adresse)}</td>
                  <td style={{ ...tdStyle, backgroundColor: "#fff", color: "#000" }}>{printNullableText(r.nif)}</td>
                  <td style={{ ...tdStyle, backgroundColor: "#fff", color: "#000" }}>{printNullableText(r.authNif)}</td>
                  <td style={{ ...tdStyle, backgroundColor: "#fff", color: "#000" }}>{printNullableText(r.numRC)}</td>
                  <td style={{ ...tdStyle, backgroundColor: "#fff", color: "#000" }}>{printNullableText(r.authRC)}</td>
                  <td style={{ ...tdStyle, backgroundColor: "#fff", color: "#000" }}>{r.numFacture}</td>
                  <td style={{ ...tdStyle, backgroundColor: "#fff", color: "#000" }}>{r.dateFacture}</td>
                  <td style={{ ...tdStyle, textAlign: "right", backgroundColor: "#fff", color: "#000" }}>{r.montantHT ? fmt(num(r.montantHT)) : ""}</td>
                  <td style={{ ...tdStyle, textAlign: "right", backgroundColor: "#fff", color: "#000" }}>{fmt(rowTva)}</td>
                  <td style={{ ...tdStyle, textAlign: "right", backgroundColor: "#fff", color: "#000" }}>{r.montantHT || rowTva ? fmt(rowTTC) : ""}</td>
                </tr>
              })}
            </tbody>
            <tfoot><tr style={{ background: "#ddd", fontWeight: 700, color: "#000" }}>
              <td colSpan={8} style={{ ...tdStyle, textAlign: "right", backgroundColor: "#ddd", color: "#000" }}>{totalLabel}</td>
              <td style={{ ...tdStyle, textAlign: "right", backgroundColor: "#ddd", color: "#000" }}>{fmt(tHT)}</td>
              <td style={{ ...tdStyle, textAlign: "right", backgroundColor: "#ddd", color: "#000" }}>{fmt(tTVA)}</td>
              <td style={{ ...tdStyle, textAlign: "right", backgroundColor: "#ddd", color: "#000" }}>{fmt(tTTC)}</td>
            </tr></tfoot>
          </table>
        )
      })()}

      {activeTab === "droits_timbre" && (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>
            {["#","Designation","CA TTC Esp.","Droit de Timbre"].map((h) => <th key={h} style={thStyle}>{h}</th>)}
          </tr></thead>
          <tbody>
            {timbreRows.map((r, i) => (
              <tr key={i} style={{ background: "#fff", color: "#000" }}>
                <td style={{ ...tdStyle, textAlign: "center", backgroundColor: "#fff", color: "#000" }}>{i+1}</td>
                <td style={{ ...tdStyle, backgroundColor: "#fff", color: "#000" }}>{r.designation}</td>
                <td style={{ ...tdStyle, textAlign: "right", backgroundColor: "#fff", color: "#000" }}>{r.caTTCEsp ? fmt(num(r.caTTCEsp)) : ""}</td>
                <td style={{ ...tdStyle, textAlign: "right", backgroundColor: "#fff", color: "#000" }}>{r.droitTimbre ? fmt(num(r.droitTimbre)) : ""}</td>
              </tr>
            ))}
          </tbody>
          <tfoot><tr style={{ background: "#ddd", fontWeight: 700, color: "#000" }}>
            <td colSpan={2} style={{ ...tdStyle, textAlign: "right", backgroundColor: "#ddd", color: "#000" }}>TOTAL</td>
            <td style={{ ...tdStyle, textAlign: "right", backgroundColor: "#ddd", color: "#000" }}>{fmt(timbreRows.reduce((s,r) => s+num(r.caTTCEsp),0))}</td>
            <td style={{ ...tdStyle, textAlign: "right", backgroundColor: "#ddd", color: "#000" }}>{fmt(timbreRows.reduce((s,r) => s+num(r.droitTimbre),0))}</td>
          </tr></tfoot>
        </table>
      )}

      {activeTab === "ca_tap" && (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>
            {["Designation","Chiffre d'affaires HT","Montant Taxe a verser"].map((h) => <th key={h} style={thStyle}>{h}</th>)}
          </tr></thead>
          <tbody>
            <tr style={{ background: "#fff", color: "#000" }}>
              <td style={{ ...tdStyle, backgroundColor: "#fff", color: "#000" }}>Chiffre d'affaires soumis a 7%</td>
              <td style={{ ...tdStyle, textAlign: "right", backgroundColor: "#fff", color: "#000" }}>{b12 ? fmt(num(b12)) : ""}</td>
              <td style={{ ...tdStyle, textAlign: "right", backgroundColor: "#fff", color: "#000" }}>{b12 ? fmt(c12) : ""}</td>
            </tr>
            <tr style={{ background: "#eee", color: "#000" }}>
              <td style={{ ...tdStyle, backgroundColor: "#eee", color: "#000" }}>Chiffre d'affaires global soumis a 1%</td>
              <td style={{ ...tdStyle, textAlign: "right", backgroundColor: "#eee", color: "#000" }}>{b13 ? fmt(num(b13)) : ""}</td>
              <td style={{ ...tdStyle, textAlign: "right", backgroundColor: "#eee", color: "#000" }}>{b13 ? fmt(c13) : ""}</td>
            </tr>
          </tbody>
          <tfoot><tr style={{ background: "#ddd", fontWeight: 700, color: "#000" }}>
            <td style={{ ...tdStyle, textAlign: "right", backgroundColor: "#ddd", color: "#000" }}>TOTAL</td>
            <td style={{ ...tdStyle, textAlign: "right", backgroundColor: "#ddd", color: "#000" }}>{fmt(num(b12)+num(b13))}</td>
            <td style={{ ...tdStyle, textAlign: "right", backgroundColor: "#ddd", color: "#000" }}>{fmt(c12+c13)}</td>
          </tr></tfoot>
        </table>
      )}

      {activeTab === "etat_tap" && (
        <>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              {["#","Code Wilaya","Wilaya","Commune","TAP 2%"].map((h) => <th key={h} style={thStyle}>{h}</th>)}
            </tr></thead>
            <tbody>
              {tapRows.map((r, i) => {
                const w = wilayas.find((w) => w.code === r.wilayaCode)
                return <tr key={i} style={{ background: "#fff", color: "#000" }}>
                  <td style={{ ...tdStyle, textAlign: "center", backgroundColor: "#fff", color: "#000" }}>{i+1}</td>
                  <td style={{ ...tdStyle, textAlign: "center", fontWeight: 700, backgroundColor: "#fff", color: "#000" }}>{r.wilayaCode}</td>
                  <td style={{ ...tdStyle, backgroundColor: "#fff", color: "#000" }}>{w?.wilaya ?? ""}</td>
                  <td style={{ ...tdStyle, backgroundColor: "#fff", color: "#000" }}>{r.commune}</td>
                  <td style={{ ...tdStyle, textAlign: "right", backgroundColor: "#fff", color: "#000" }}>{r.tap2 ? fmt(num(r.tap2)) : ""}</td>
                </tr>
              })}
            </tbody>
            <tfoot><tr style={{ background: "#ddd", fontWeight: 700, color: "#000" }}>
              <td colSpan={4} style={{ ...tdStyle, textAlign: "right", backgroundColor: "#ddd", color: "#000" }}>MONTANT TAP</td>
              <td style={{ ...tdStyle, textAlign: "right", fontSize: 11, backgroundColor: "#ddd", color: "#000" }}>{fmt(tapRows.reduce((s,r) => s+num(r.tap2),0))} DZD</td>
            </tr></tfoot>
          </table>
        </>
      )}

      {activeTab === "ca_siege" && (() => {
        const g1 = caSiegeRows.slice(0, 2)
        const g2 = caSiegeRows.slice(2, 12)
        const t1ttc = g1.reduce((s, r) => s + num(r.ttc), 0)
        const t1ht  = g1.reduce((s, r) => s + num(r.ht), 0)
        const t2ttc = g2.reduce((s, r) => s + num(r.ttc), 0)
        const t2ht  = g2.reduce((s, r) => s + num(r.ht), 0)
        return (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              {["D\u00e9signation", "TTC", "HT"].map(h => <th key={h} style={thStyle}>{h}</th>)}
            </tr></thead>
            <tbody>
              {SIEGE_G1_LABELS.map((lbl, i) => (
                <tr key={i}><td style={tdStyle}>{lbl}</td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>{caSiegeRows[i]?.ttc ? fmt(num(caSiegeRows[i].ttc)) : ""}</td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>{caSiegeRows[i]?.ht ? fmt(num(caSiegeRows[i].ht)) : ""}</td>
                </tr>
              ))}
              <tr style={{ fontWeight: 700 }}><td style={tdStyle}>TOTAL 1</td>
                <td style={{ ...tdStyle, textAlign: "right" }}>{fmt(t1ttc)}</td>
                <td style={{ ...tdStyle, textAlign: "right" }}>{fmt(t1ht)}</td>
              </tr>
              {SIEGE_G2_LABELS.map((lbl, i) => (
                <tr key={i}><td style={tdStyle}>{lbl}</td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>{caSiegeRows[i + 2]?.ttc ? fmt(num(caSiegeRows[i + 2].ttc)) : ""}</td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>{caSiegeRows[i + 2]?.ht ? fmt(num(caSiegeRows[i + 2].ht)) : ""}</td>
                </tr>
              ))}
              <tr style={{ fontWeight: 700 }}><td style={tdStyle}>TOTAL 2</td>
                <td style={{ ...tdStyle, textAlign: "right" }}>{fmt(t2ttc)}</td>
                <td style={{ ...tdStyle, textAlign: "right" }}>{fmt(t2ht)}</td>
              </tr>
              <tr style={{ fontWeight: 700 }}><td style={tdStyle}>TOTAL G\u00c9N\u00c9RAL</td>
                <td style={{ ...tdStyle, textAlign: "right" }}>{fmt(t1ttc + t2ttc)}</td>
                <td style={{ ...tdStyle, textAlign: "right" }}>{fmt(t1ht + t2ht)}</td>
              </tr>
            </tbody>
          </table>
        )
      })()}

      {activeTab === "irg" && (() => {
        const totalAssiette = irgRows.reduce((s,r)=>s+num(r.assietteImposable),0)
        const totalMontant  = irgRows.reduce((s,r)=>s+num(r.montant),0)
        return (
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead><tr>
              {["Designation","Assiette Imposable","Montant"].map(h=><th key={h} style={thStyle}>{h}</th>)}
            </tr></thead>
            <tbody>
              {IRG_LABELS.map((lbl,i)=>(
                <tr key={i}>
                  <td style={tdStyle}>{lbl}</td>
                  <td style={{...tdStyle,textAlign:"right"}}>{irgRows[i]?.assietteImposable?fmt(num(irgRows[i].assietteImposable)):""}</td>
                  <td style={{...tdStyle,textAlign:"right"}}>{irgRows[i]?.montant?fmt(num(irgRows[i].montant)):""}</td>
                </tr>
              ))}
              <tr style={{fontWeight:700}}>
                <td style={tdStyle}>TOTAL</td>
                <td style={{...tdStyle,textAlign:"right"}}>{fmt(totalAssiette)}</td>
                <td style={{...tdStyle,textAlign:"right"}}>{fmt(totalMontant)}</td>
              </tr>
            </tbody>
          </table>
        )
      })()}

      {activeTab === "taxe2" && (() => {
        const totalBase = taxe2Rows.reduce((s,r)=>s+num(r.base),0)
        const totalMont = taxe2Rows.reduce((s,r)=>s+num(r.montant),0)
        return (
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead><tr>
              {["Designation","Montant de la base","Montant de la Taxe 2%"].map(h=><th key={h} style={thStyle}>{h}</th>)}
            </tr></thead>
            <tbody>
              {TAXE2_LABELS.map((lbl,i)=>(
                <tr key={i}>
                  <td style={tdStyle}>{lbl}</td>
                  <td style={{...tdStyle,textAlign:"right"}}>{taxe2Rows[i]?.base?fmt(num(taxe2Rows[i].base)):""}</td>
                  <td style={{...tdStyle,textAlign:"right"}}>{taxe2Rows[i]?.montant?fmt(num(taxe2Rows[i].montant)):""}</td>
                </tr>
              ))}
              <tr style={{fontWeight:700}}><td style={tdStyle}>TOTAL</td>
                <td style={{...tdStyle,textAlign:"right"}}>{fmt(totalBase)}</td>
                <td style={{...tdStyle,textAlign:"right"}}>{fmt(totalMont)}</td>
              </tr>
            </tbody>
          </table>
        )
      })()}

      {activeTab === "taxe_masters" && (() => {
        const totalHT   = masterRows.reduce((s,r)=>s+num(r.montantHT),0)
        const totalTaxe = masterRows.reduce((s,r)=>s+num(r.montantHT)*0.015,0)
        return (
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead><tr>
              {["#","Date","Nom du Master","N° Facture","Date Facture","Montant de la Facture HT","Taxe 1,5%","Mois","Observation"].map(h=><th key={h} style={thStyle}>{h}</th>)}
            </tr></thead>
            <tbody>
              {masterRows.map((r,i)=>(
                <tr key={i}>
                  <td style={{...tdStyle,textAlign:"center"}}>{i+1}</td>
                  <td style={tdStyle}>{r.date}</td>
                  <td style={tdStyle}>{r.nomMaster}</td>
                  <td style={tdStyle}>{r.numFacture}</td>
                  <td style={tdStyle}>{r.dateFacture}</td>
                  <td style={{...tdStyle,textAlign:"right"}}>{r.montantHT?fmt(num(r.montantHT)):""}</td>
                  <td style={{...tdStyle,textAlign:"right"}}>{r.montantHT?fmt(num(r.montantHT)*0.015):""}</td>
                  <td style={tdStyle}>{r.mois}</td>
                  <td style={tdStyle}>{r.observation}</td>
                </tr>
              ))}
              <tr style={{fontWeight:700}}>
                <td style={tdStyle} colSpan={5}>TOTAL</td>
                <td style={{...tdStyle,textAlign:"right"}}>{fmt(totalHT)}</td>
                <td style={{...tdStyle,textAlign:"right"}}>{fmt(totalTaxe)}</td>
                <td colSpan={2} style={tdStyle}/>
              </tr>
            </tbody>
          </table>
        )
      })()}

      {activeTab === "taxe_vehicule" && (
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead><tr>{["Designation","Montant"].map(h=><th key={h} style={thStyle}>{h}</th>)}</tr></thead>
          <tbody>
            <tr><td style={tdStyle}>Taxe de vehicule</td><td style={{...tdStyle,textAlign:"right"}}>{taxe11Montant?fmt(num(taxe11Montant)):""}</td></tr>
          </tbody>
        </table>
      )}

      {activeTab === "taxe_formation" && (() => {
        const total = taxe12Rows.reduce((s,r)=>s+num(r.montant),0)
        return (
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead><tr>{["Designation","Montant"].map(h=><th key={h} style={thStyle}>{h}</th>)}</tr></thead>
            <tbody>
              {TAXE12_LABELS.map((lbl,i)=>(
                <tr key={i}><td style={tdStyle}>{lbl}</td><td style={{...tdStyle,textAlign:"right"}}>{taxe12Rows[i]?.montant?fmt(num(taxe12Rows[i].montant)):""}</td></tr>
              ))}
              <tr style={{fontWeight:700}}><td style={tdStyle}>TOTAL</td><td style={{...tdStyle,textAlign:"right"}}>{fmt(total)}</td></tr>
            </tbody>
          </table>
        )
      })()}

      {activeTab === "acompte" && (() => {
        const yy = annee.slice(-2)
        return (
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead><tr>
              <th style={thStyle}>Designation</th>
              {ACOMPTE_MONTHS.map((m)=><th key={m.value} style={thStyle}>{m.label} {yy}</th>)}
            </tr></thead>
            <tbody>
              <tr>
                <td style={tdStyle}>Montant</td>
                {acompteMonths.map((v,i)=>(<td key={i} style={{...tdStyle,textAlign:"right"}}>{v?fmt(num(v)):""}</td>))}
              </tr>
            </tbody>
          </table>
        )
      })()}



      {activeTab === "tnfdal1" && (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>
            {"Designation|Chiffres d'Affaires HT|Montant du TNFDAL 1%".split("|").map((h) => (
              <th key={h} style={thStyle}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {TNFDAL1_DECLARATION_ROWS.map((label, i) => (
              <tr key={label} style={{ background: "#fff", color: "#000" }}>
                <td style={{ ...tdStyle, backgroundColor: "#fff", color: "#000" }}>{label}</td>
                <td style={{ ...tdStyle, textAlign: "right", backgroundColor: "#fff", color: "#000" }}>{tnfdal1Rows[i]?.caHt ? fmt(num(tnfdal1Rows[i].caHt)) : ""}</td>
                <td style={{ ...tdStyle, textAlign: "right", backgroundColor: "#fff", color: "#000" }}>{tnfdal1Rows[i]?.taxe ? fmt(num(tnfdal1Rows[i].taxe)) : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {activeTab === "tacp7" && (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>
            {"Designation|Montant des Recharges HT|Montant du TACP 7%".split("|").map((h) => (
              <th key={h} style={thStyle}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {TACP7_DECLARATION_ROWS.map((label, i) => (
              <tr key={label} style={{ background: i % 2 === 0 ? "#fff" : "#eee", color: "#000" }}>
                <td style={{ ...tdStyle, backgroundColor: "inherit", color: "#000" }}>{label}</td>
                <td style={{ ...tdStyle, textAlign: "right", backgroundColor: "inherit", color: "#000" }}>{tacp7Rows[i]?.base ? fmt(num(tacp7Rows[i].base)) : ""}</td>
                <td style={{ ...tdStyle, textAlign: "right", backgroundColor: "inherit", color: "#000" }}>{tacp7Rows[i]?.taxe ? fmt(num(tacp7Rows[i].taxe)) : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

const popupText = (value: unknown) => {
  const normalized = String(value ?? "").replace(/\u00A0/g, " ").replace(/\s+/g, " ").trim()
  return normalized || "-"
}

function ExistingDeclarationTableView({ tabKey, decl }: { tabKey: string; decl: SavedDeclaration }) {
  if (tabKey === "tva_immo" || tabKey === "tva_biens") {
    const rows = tabKey === "tva_immo" ? (decl.tvaImmoRows ?? []) : (decl.tvaBiensRows ?? [])
    const totalLabel = tabKey === "tva_immo" ? "TOTAL TVA SUR IMMOBILISATION 445620" : "TOTAL TVA SUR BIENS ET SERVICES"
    const tHT = rows.reduce((s, r) => s + num(r.montantHT), 0)
    const tTVA = rows.reduce((s, r) => s + getTvaAmount(r, true), 0)
    const tTTC = tHT + tTVA

    return (
      <Table>
        <TableHeader>
          <TableRow>
            {["Nom et prénoms /Raison sociale", "Adresse", "NIF", "Authentification du NIF", "RC n°", "Authentification du n°RC", "Facture n°", "Date", "Montant HT", "TVA", "Montant TTC"].map((h) => (
              <TableHead key={h} className={["Montant HT", "TVA", "Montant TTC"].includes(h) ? "text-right" : undefined}>{h}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r, i) => {
            const rowTva = getTvaAmount(r, true)
            return (
              <TableRow key={i}>
                <TableCell className="text-xs">{popupText(r.nomRaisonSociale)}</TableCell>
                <TableCell className="text-xs">{popupText(r.adresse)}</TableCell>
                <TableCell className="text-xs">{popupText(r.nif)}</TableCell>
                <TableCell className="text-xs">{popupText(r.authNif)}</TableCell>
                <TableCell className="text-xs">{popupText(r.numRC)}</TableCell>
                <TableCell className="text-xs">{popupText(r.authRC)}</TableCell>
                <TableCell className="text-xs">{popupText(r.numFacture)}</TableCell>
                <TableCell className="text-xs">{popupText(r.dateFacture)}</TableCell>
                <TableCell className="text-right text-xs font-semibold">{fmt(r.montantHT)}</TableCell>
                <TableCell className="text-right text-xs font-semibold">{fmt(rowTva)}</TableCell>
                <TableCell className="text-right text-xs font-semibold">{fmt(num(r.montantHT) + rowTva)}</TableCell>
              </TableRow>
            )
          })}
          <TableRow className="font-bold bg-muted">
            <TableCell colSpan={8}>{totalLabel}</TableCell>
            <TableCell className="text-right font-bold">{fmt(tHT)}</TableCell>
            <TableCell className="text-right font-bold">{fmt(tTVA)}</TableCell>
            <TableCell className="text-right font-bold">{fmt(tTTC)}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    )
  }

  if (tabKey === "encaissement") {
    const rows = decl.encRows ?? []
    const computed = rows.map((row) => {
      const ht = num(row.ht)
      const tva = ht * 0.19
      return { designation: row.designation, ht, tva, ttc: ht + tva }
    })
    const totals = computed.reduce((acc, row) => ({ ht: acc.ht + row.ht, tva: acc.tva + row.tva, ttc: acc.ttc + row.ttc }), { ht: 0, tva: 0, ttc: 0 })

    return (
      <Table>
        <TableHeader>
          <TableRow>
            {["DESIGNATIONS", "ENCAISSEMENTS HT", "TVA", "ENCAISSEMENTS TTC"].map((h) => (
              <TableHead key={h} className={h !== "DESIGNATIONS" ? "text-right" : undefined}>{h}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {computed.map((r, i) => (
            <TableRow key={i}>
              <TableCell>{popupText(r.designation)}</TableCell>
              <TableCell className="text-right font-semibold">{fmt(r.ht)}</TableCell>
              <TableCell className="text-right font-semibold">{fmt(r.tva)}</TableCell>
              <TableCell className="text-right font-semibold">{fmt(r.ttc)}</TableCell>
            </TableRow>
          ))}
          <TableRow className="font-bold bg-muted">
            <TableCell>TOTAL</TableCell>
            <TableCell className="text-right font-bold">{fmt(totals.ht)}</TableCell>
            <TableCell className="text-right font-bold">{fmt(totals.tva)}</TableCell>
            <TableCell className="text-right font-bold">{fmt(totals.ttc)}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    )
  }

  const rowsByKey: Record<string, unknown[]> = {
    droits_timbre: decl.timbreRows ?? [],
    etat_tap: decl.tapRows ?? [],
    ca_siege: decl.caSiegeRows ?? [],
    irg: decl.irgRows ?? [],
    taxe2: decl.taxe2Rows ?? [],
    taxe_masters: decl.masterRows ?? [],
    taxe_formation: decl.taxe12Rows ?? [],

  }

  const selectedRows = rowsByKey[tabKey] ?? []
  if (tabKey === "ca_tap") {
    const b12 = decl.b12 ?? ""
    const b13 = decl.b13 ?? ""
    const totalBase = num(b12) + num(b13)
    const totalTaxe = num(b12) * 0.07 + num(b13) * 0.01

    return (
      <Table>
        <TableHeader>
          <TableRow>
            {["DESIGNATIONS", "CA HT SOUMIS", "TAXE A VERSER"].map((h) => (
              <TableHead key={h} className={h !== "DESIGNATIONS" ? "text-right" : undefined}>{h}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>CA RECHARGEMENT SOUMIS A 7%</TableCell>
            <TableCell className="text-right font-semibold">{fmt(b12)}</TableCell>
            <TableCell className="text-right font-semibold">{fmt(num(b12) * 0.07)}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>CA GLOBAL SOUMIS A 1%</TableCell>
            <TableCell className="text-right font-semibold">{fmt(b13)}</TableCell>
            <TableCell className="text-right font-semibold">{fmt(num(b13) * 0.01)}</TableCell>
          </TableRow>
          <TableRow className="font-bold bg-muted">
            <TableCell>TOTAL</TableCell>
            <TableCell className="text-right font-bold">{fmt(totalBase)}</TableCell>
            <TableCell className="text-right font-bold">{fmt(totalTaxe)}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    )
  }

  if (tabKey === "ca_siege") {
    const rows = decl.caSiegeRows ?? []
    const g1 = rows.slice(0, 2)
    const g2 = rows.slice(2, 12)
    const t1ttc = g1.reduce((s, r) => s + num(r.ttc), 0)
    const t1ht = g1.reduce((s, r) => s + num(r.ht), 0)
    const t2ttc = g2.reduce((s, r) => s + num(r.ttc), 0)
    const t2ht = g2.reduce((s, r) => s + num(r.ht), 0)

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Désignation</TableHead>
            <TableHead className="text-right">TTC</TableHead>
            <TableHead className="text-right">HT</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {SIEGE_G1_LABELS.map((label, i) => (
            <TableRow key={`g1-${i}`}>
              <TableCell className="text-xs">{label}</TableCell>
              <TableCell className="text-right text-xs font-semibold">{fmt(rows[i]?.ttc ?? "")}</TableCell>
              <TableCell className="text-right text-xs font-semibold">{fmt(rows[i]?.ht ?? "")}</TableCell>
            </TableRow>
          ))}
          <TableRow className="font-bold bg-muted">
            <TableCell>TOTAL 1</TableCell>
            <TableCell className="text-right font-bold">{fmt(t1ttc)}</TableCell>
            <TableCell className="text-right font-bold">{fmt(t1ht)}</TableCell>
          </TableRow>
          {SIEGE_G2_LABELS.map((label, i) => (
            <TableRow key={`g2-${i}`}>
              <TableCell className="text-xs">{label}</TableCell>
              <TableCell className="text-right text-xs font-semibold">{fmt(rows[i + 2]?.ttc ?? "")}</TableCell>
              <TableCell className="text-right text-xs font-semibold">{fmt(rows[i + 2]?.ht ?? "")}</TableCell>
            </TableRow>
          ))}
          <TableRow className="font-bold bg-muted">
            <TableCell>TOTAL 2</TableCell>
            <TableCell className="text-right font-bold">{fmt(t2ttc)}</TableCell>
            <TableCell className="text-right font-bold">{fmt(t2ht)}</TableCell>
          </TableRow>
          <TableRow className="font-bold bg-muted">
            <TableCell>TOTAL GÉNÉRAL</TableCell>
            <TableCell className="text-right font-bold">{fmt(t1ttc + t2ttc)}</TableCell>
            <TableCell className="text-right font-bold">{fmt(t1ht + t2ht)}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    )
  }

  if (tabKey === "irg") {
    const rows = decl.irgRows ?? []
    const totalAssiette = rows.reduce((s, r) => s + num(r.assietteImposable), 0)
    const totalMontant = rows.reduce((s, r) => s + num(r.montant), 0)

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Désignation</TableHead>
            <TableHead className="text-right">Assiette imposable</TableHead>
            <TableHead className="text-right">Montant</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {IRG_LABELS.map((label, i) => (
            <TableRow key={label}>
              <TableCell className="text-xs">{label}</TableCell>
              <TableCell className="text-right text-xs font-semibold">{fmt(rows[i]?.assietteImposable ?? "")}</TableCell>
              <TableCell className="text-right text-xs font-semibold">{fmt(rows[i]?.montant ?? "")}</TableCell>
            </TableRow>
          ))}
          <TableRow className="font-bold bg-muted">
            <TableCell>TOTAL</TableCell>
            <TableCell className="text-right font-bold">{fmt(totalAssiette)}</TableCell>
            <TableCell className="text-right font-bold">{fmt(totalMontant)}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    )
  }

  if (tabKey === "taxe2") {
    const rows = decl.taxe2Rows ?? []
    const totalBase = rows.reduce((s, r) => s + num(r.base), 0)
    const totalMontant = rows.reduce((s, r) => s + num(r.montant), 0)

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Désignation</TableHead>
            <TableHead className="text-right">Montant de la base</TableHead>
            <TableHead className="text-right">Montant de la taxe 2%</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {TAXE2_LABELS.map((label, i) => (
            <TableRow key={label}>
              <TableCell className="text-xs">{label}</TableCell>
              <TableCell className="text-right text-xs font-semibold">{fmt(rows[i]?.base ?? "")}</TableCell>
              <TableCell className="text-right text-xs font-semibold">{fmt(rows[i]?.montant ?? "")}</TableCell>
            </TableRow>
          ))}
          <TableRow className="font-bold bg-muted">
            <TableCell>TOTAL</TableCell>
            <TableCell className="text-right font-bold">{fmt(totalBase)}</TableCell>
            <TableCell className="text-right font-bold">{fmt(totalMontant)}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    )
  }

  if (tabKey === "taxe_masters") {
    const rows = decl.masterRows ?? []
    const totalHT = rows.reduce((s, r) => s + num(r.montantHT), 0)
    const totalTaxe = rows.reduce((s, r) => s + (num(r.montantHT) * 0.015), 0)

    return (
      <Table>
        <TableHeader>
          <TableRow>
            {[
              "#",
              "Date",
              "Nom du Master",
              "N° Facture",
              "Date de la Facture",
              "Montant HT",
              "Taxe 1,5%",
              "Mois",
              "Observation",
            ].map((header) => (
              <TableHead key={header} className={["Montant HT", "Taxe 1,5%"].includes(header) ? "text-right" : undefined}>{header}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, i) => (
            <TableRow key={i}>
              <TableCell className="text-center text-xs">{i + 1}</TableCell>
              <TableCell className="text-xs">{popupText(row.date)}</TableCell>
              <TableCell className="text-xs">{popupText(row.nomMaster)}</TableCell>
              <TableCell className="text-xs">{popupText(row.numFacture)}</TableCell>
              <TableCell className="text-xs">{popupText(row.dateFacture)}</TableCell>
              <TableCell className="text-right text-xs font-semibold">{fmt(row.montantHT)}</TableCell>
              <TableCell className="text-right text-xs font-semibold">{row.montantHT ? fmt(num(row.montantHT) * 0.015) : ""}</TableCell>
              <TableCell className="text-xs">{popupText(row.mois)}</TableCell>
              <TableCell className="text-xs">{popupText(row.observation)}</TableCell>
            </TableRow>
          ))}
          <TableRow className="font-bold bg-muted">
            <TableCell colSpan={5}>TOTAL</TableCell>
            <TableCell className="text-right font-bold">{fmt(totalHT)}</TableCell>
            <TableCell className="text-right font-bold">{fmt(totalTaxe)}</TableCell>
            <TableCell colSpan={2} />
          </TableRow>
        </TableBody>
      </Table>
    )
  }

  if (tabKey === "taxe_vehicule") {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Désignation</TableHead>
            <TableHead className="text-right">Montant</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell className="text-xs">Taxe de véhicule</TableCell>
            <TableCell className="text-right text-xs font-semibold">{fmt(decl.taxe11Montant ?? "")}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    )
  }

  if (tabKey === "taxe_formation") {
    const rows = decl.taxe12Rows ?? []
    const total = rows.reduce((s, r) => s + num(r.montant), 0)

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Désignation</TableHead>
            <TableHead className="text-right">Montant</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {TAXE12_LABELS.map((label, i) => (
            <TableRow key={label}>
              <TableCell className="text-xs">{label}</TableCell>
              <TableCell className="text-right text-xs font-semibold">{fmt(rows[i]?.montant ?? "")}</TableCell>
            </TableRow>
          ))}
          <TableRow className="font-bold bg-muted">
            <TableCell>TOTAL</TableCell>
            <TableCell className="text-right font-bold">{fmt(total)}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    )
  }

  if (tabKey === "tnfdal1") {
    const rows = decl.tnfdal1Rows ?? []

    return (
      <Table>
        <TableHeader>
          <TableRow>
            {"Désignation|Chiffres d'Affaires HT|Montant du TNFDAL 1%".split("|").map((h) => (
              <TableHead key={h} className={h !== "Désignation" ? "text-right" : undefined}>{h}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {TNFDAL1_DECLARATION_ROWS.map((label, i) => (
            <TableRow key={label}>
              <TableCell className="text-xs">{label}</TableCell>
              <TableCell className="text-right text-xs font-semibold">{fmt(rows[i]?.caHt ?? "")}</TableCell>
              <TableCell className="text-right text-xs font-semibold">{fmt(rows[i]?.taxe ?? "")}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )
  }

  if (tabKey === "tacp7") {
    const rows = decl.tacp7Rows ?? []

    return (
      <Table>
        <TableHeader>
          <TableRow>
            {"Désignation|Montant des Recharges HT|Montant du TACP 7%".split("|").map((h) => (
              <TableHead key={h} className={h !== "Désignation" ? "text-right" : undefined}>{h}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {TACP7_DECLARATION_ROWS.map((label, i) => (
            <TableRow key={label}>
              <TableCell className="text-xs">{label}</TableCell>
              <TableCell className="text-right text-xs font-semibold">{fmt(rows[i]?.base ?? "")}</TableCell>
              <TableCell className="text-right text-xs font-semibold">{fmt(rows[i]?.taxe ?? "")}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )
  }

  if (tabKey === "acompte") {
    const months = normalizeAcompteMonths(decl.acompteMonths ?? [])
    const yy = String(decl.annee ?? "").slice(-2)
    const total = months.reduce((s, value) => s + num(value), 0)

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Désignation</TableHead>
            {ACOMPTE_MONTHS.map((m) => (
              <TableHead key={m.value} className="text-right">{m.label} {yy}</TableHead>
            ))}
            <TableHead className="text-right">TOTAL</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell className="text-xs">Montant</TableCell>
            {months.map((value, i) => (
              <TableCell key={i} className="text-right text-xs font-semibold">{fmt(value)}</TableCell>
            ))}
            <TableCell className="text-right text-xs font-bold">{fmt(total)}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    )
  }



  if (!Array.isArray(selectedRows) || selectedRows.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucune donnée pour ce tableau.</p>
  }

  const firstRow = selectedRows[0] as Record<string, unknown>
  const headers = Object.keys(firstRow)

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {headers.map((header) => (
            <TableHead key={header}>{header}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {selectedRows.map((row, rowIndex) => {
          const typedRow = row as Record<string, unknown>
          return (
            <TableRow key={rowIndex}>
              {headers.map((header) => (
                <TableCell key={header} className="text-xs">{popupText(typedRow[header])}</TableCell>
              ))}
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}

// 
// PAGE
// 
export default function NouvelleDeclarationPage() {
  const { user, isLoading, status } = useAuth({ requireAuth: true, redirectTo: "/login" })
  const { toast } = useToast()
  const router    = useRouter()
  const printRef  = useRef<HTMLDivElement>(null)
  const [editQuery, setEditQuery] = useState<{ editId: string; tab: string }>({ editId: "", tab: "" })

  //  Wilayas & Communes (fetched from API) 
  const { wilayas } = useWilayasCommunes()

  //  Regions (fetched from API) 
  const [regions, setRegions] = useState<{ id: number; name: string }[]>([])
  const [fiscalFournisseurs, setFiscalFournisseurs] = useState<FiscalFournisseurOption[]>([])
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
      .then(async (r) => {
        if (!r.ok) {
          throw new Error(`HTTP ${r.status}`)
        }
        return r.json()
      })
      .then((data: unknown) => {
        const normalized = asArrayPayload(data)
          .map((item) => normalizeFiscalFournisseurOption(item))
          .filter((item): item is FiscalFournisseurOption => item !== null)
        setFiscalFournisseurs(normalized)
      })
      .catch((err) => {
        console.error("Erreur chargement fournisseurs fiscaux:", err)
        setFiscalFournisseurs([])
      })
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    const params = new URLSearchParams(window.location.search)

    const requestedMode = safeString(params.get("entryMode")).trim()
    if (requestedMode === "etats_sortie") {
      setEntryMode("etats_sortie")
    }

    const requestedRecapTab = safeString(params.get("recapTab")).trim()
    if (isRecapKey(requestedRecapTab)) {
      setActiveRecapTab(requestedRecapTab)
    }

    const requestedMois = safeString(params.get("mois")).trim()
    if (requestedMois) {
      setMois(normalizeMonthValue(requestedMois))
    }

    const requestedAnnee = safeString(params.get("annee")).trim()
    if (requestedAnnee) {
      setAnnee(normalizeYearValue(requestedAnnee))
    }

    setEditQuery({
      editId: safeString(params.get("editId")).trim(),
      tab: safeString(params.get("tab")).trim(),
    })
  }, [])

  //  Global meta 
  const [activeTab,  setActiveTab]  = useState("encaissement")
  const [entryMode, setEntryMode] = useState<RecapMode>("declaration")
  const [activeRecapTab, setActiveRecapTab] = useState<RecapKey>("tva_collectee")
  const [direction,  setDirection]  = useState("")
  const [mois,       setMois]       = useState(INITIAL_FISCAL_PERIOD.mois)
  const [annee,      setAnnee]      = useState(INITIAL_FISCAL_PERIOD.annee)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingDeclarationId, setEditingDeclarationId] = useState<string | null>(null)
  const [editingCreatedAt, setEditingCreatedAt] = useState("")
  const [editingSourceMois, setEditingSourceMois] = useState("")
  const [editingSourceAnnee, setEditingSourceAnnee] = useState("")
  const [fiscalPolicyRevision, setFiscalPolicyRevision] = useState(0)

  //  Tab data (lifted) 
  const [encRows,       setEncRows]       = useState<EncRow[]>(FIXED_ENCAISSEMENT_ROWS)
  const [tvaImmoRows,   setTvaImmoRows]   = useState<TvaRow[]>([{ ...EMPTY_TVA }])
  const [tvaBiensRows,  setTvaBiensRows]  = useState<TvaRow[]>([{ ...EMPTY_TVA }])
  const [timbreRows,    setTimbreRows]    = useState<TimbreRow[]>([{ ...FIXED_TIMBRE_ROW }])
  const [b12,           setB12]           = useState("")
  const [b13,           setB13]           = useState("")
  const [tapRows,       setTapRows]       = useState<TAPRow[]>([{ wilayaCode: "", commune: "", tap2: "" }])
  const [siegeEncRows,  setSiegeEncRows]  = useState<SiegeEncRow[]>(Array(12).fill(null).map(() => ({ ttc: "", ht: "" })))
  const [irgRows,        setIrgRows]        = useState<IrgRow[]>(Array(IRG_LABELS.length).fill(null).map(() => ({ assietteImposable: "", montant: "" })))
  const [taxe2Rows,      setTaxe2Rows]      = useState<Taxe2Row[]>([{ base: "", montant: "" }])
  const [masterRows,     setMasterRows]     = useState<MasterRow[]>([{ ...EMPTY_MASTER }])
  const [taxe11Montant,  setTaxe11Montant]  = useState("")
  const [taxe12Rows,     setTaxe12Rows]     = useState<Taxe12Row[]>([{ montant: "" }, { montant: "" }])
  const [acompteMonths,  setAcompteMonths]  = useState<string[]>(Array(3).fill(""))

  const [tnfdal1Rows,    setTnfdal1Rows]    = useState<Tnfdal1Row[]>(() => normalizeTnfdal1Rows())
  const [tacp7Rows,      setTacp7Rows]      = useState<Tacp7Row[]>(() => normalizeTacp7Rows())
  const [fiscalDeclarations, setFiscalDeclarations] = useState<ApiFiscalDeclaration[]>([])
  const [recapSources, setRecapSources] = useState<RecapSourcesResponse>({
    encaissementByDirection: [],
    tvaImmoByDirection: [],
    tvaBiensByDirection: [],
    caTapByDirection: [],
    tapByDirection: [],
    droitsTimbreByDirection: [],
  })
  const [monthlyG50RecapRowsByKey, setMonthlyG50RecapRowsByKey] = useState<MonthlyG50RecapRowsByKey>({
    tap15: [],
    tacp7: [],
    tnfdal1: [],
    masters15: [],
    g50: [],
  })
  const [annualRecapSourcesByMonth, setAnnualRecapSourcesByMonth] = useState<Record<string, RecapSourcesResponse>>({})
  const [g50AnnualRecaps, setG50AnnualRecaps] = useState<Array<{ mois: string; annee: string; rows: Record<string, string>[]; direction?: string }>>([])
  const [g50AnnualMissingPeriods, setG50AnnualMissingPeriods] = useState<string[]>([])
  const [showExistingDeclarationDialog, setShowExistingDeclarationDialog] = useState(false)
  const [recapRowsByKey, setRecapRowsByKey] = useState<Record<RecapKey, Record<string, string>[]>>({
    tva_collectee: [],
    tva_situation: [],
    tva_a_payer: [],
    masters15: [],
    tap15: [],
    tnfdal1: [],
    tacp7: [],
    droits_timbre: [],
    g50: [],
    g50_annuel: [],
    irg_recap: [],
  })

  const userRole = user?.role ?? ""
  const isAdminRole = isAdminFiscalRole(userRole)
  const isRegionalRole = isRegionalFiscalRole(userRole)
  const isFinanceRole = isFinanceFiscalRole(userRole)
  const adminSelectedDirection = safeString(direction).trim()
  const manageableTabKeys = useMemo(
    () => new Set(getManageableFiscalTabKeysForDirection(userRole, isAdminRole ? adminSelectedDirection : undefined)),
    [adminSelectedDirection, fiscalPolicyRevision, isAdminRole, userRole],
  )
  const availableTabs = useMemo(() => TABS.filter((tab) => manageableTabKeys.has(tab.key)), [manageableTabKeys])
  const disabledTabKeys = useMemo(
    () => new Set(availableTabs.filter((tab) => isFiscalTabDisabledByPolicy(tab.key)).map((tab) => tab.key)),
    [availableTabs, fiscalPolicyRevision],
  )
  const selectableTabs = useMemo(
    () => availableTabs
      .filter((tab) => {
        // Hide tabs that are not available for the selected month.
        if (tab.key === "acompte") {
          return ACOMPTE_ALLOWED_MONTHS.includes(mois as (typeof ACOMPTE_ALLOWED_MONTHS)[number])
        }
        if (tab.key === "taxe_formation") {
          return FORMATION_ALLOWED_MONTHS.includes(mois as (typeof FORMATION_ALLOWED_MONTHS)[number])
        }
        return true
      })
      .map((tab) => ({ ...tab, isDisabled: disabledTabKeys.has(tab.key) })),
    [availableTabs, disabledTabKeys, mois],
  )
  const selectableYears = useMemo(
    () => YEARS.filter((year) => MONTHS.some((month) => !isFiscalPeriodLocked(month.value, year, userRole))),
    [fiscalPolicyRevision, userRole],
  )
  const selectableMonths = useMemo(
    () => MONTHS.filter((month) => {
      if (isFiscalPeriodLocked(month.value, annee, userRole)) return false
      if (activeTab === "acompte" && !ACOMPTE_ALLOWED_MONTHS.includes(month.value as (typeof ACOMPTE_ALLOWED_MONTHS)[number])) {
        return false
      }
      if (activeTab === "taxe_formation" && !FORMATION_ALLOWED_MONTHS.includes(month.value as (typeof FORMATION_ALLOWED_MONTHS)[number])) {
        return false
      }
      return true
    }),
    [activeTab, annee, fiscalPolicyRevision, userRole],
  )
  const hasFiscalTabAccess = availableTabs.length > 0
  const isActiveTabDisabled = entryMode === "declaration" ? disabledTabKeys.has(activeTab) : false
  const activeRecapDefinition = useMemo(
    () => RECAP_TABS.find((item) => item.key === activeRecapTab) ?? RECAP_TABS[0],
    [activeRecapTab],
  )
  const activeRecapRows = recapRowsByKey[activeRecapTab] ?? []
  const activeRecapMissingLegendItems = useMemo(
    () => getRecapMissingLegendItems(activeRecapRows),
    [activeRecapRows],
  )

  const resolveDirectionForRole = useCallback(
    (fallbackDirection = "") => {
      const normalizedFallback = safeString(fallbackDirection).trim()

      if (isRegionalRole) {
        const regionalDirection = safeString(user?.region ?? user?.direction ?? "").trim()
        return regionalDirection || normalizedFallback
      }

      if (isFinanceRole) {
        return "Siege"
      }

      return normalizedFallback
    },
    [isRegionalRole, isFinanceRole, user],
  )

  const isDirectionLocked = isRegionalRole || isFinanceRole
  const effectiveDirection = isAdminRole ? safeString(direction).trim() : resolveDirectionForRole(direction)

  const normalizeDirectionKey = useCallback((value: string) => {
    return safeString(value)
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
  }, [])

  const existingDeclarationMatch = useMemo(() => {
    if (entryMode !== "declaration") return null
    if (!activeTab || !mois || !annee || !effectiveDirection) return null

    const expectedDirection = normalizeDirectionKey(effectiveDirection)
    return fiscalDeclarations.find((declaration) => {
      if (editingDeclarationId && String(declaration.id) === safeString(editingDeclarationId)) return false
      return declaration.tabKey === activeTab
        && declaration.mois === mois
        && declaration.annee === annee
        && normalizeDirectionKey(declaration.direction) === expectedDirection
    }) ?? null
  }, [activeTab, annee, editingDeclarationId, effectiveDirection, entryMode, fiscalDeclarations, mois, normalizeDirectionKey])

  const existingDeclarationPreview = useMemo<ExistingDeclarationPreview | null>(() => {
    if (!existingDeclarationMatch) return null
    return {
      id: String(existingDeclarationMatch.id),
      tabKey: existingDeclarationMatch.tabKey,
      direction: existingDeclarationMatch.direction,
      mois: existingDeclarationMatch.mois,
      annee: existingDeclarationMatch.annee,
      data: parseFiscalDataPayload(safeString(existingDeclarationMatch.dataJson)),
    }
  }, [existingDeclarationMatch])

  useEffect(() => {
    if (!userRole) return

    let cancelled = false
    const requestedDirection = isAdminRole ? adminSelectedDirection : undefined

    const syncPolicy = async () => {
      await syncFiscalPolicy(requestedDirection)
      if (!cancelled) {
        setFiscalPolicyRevision((prev) => prev + 1)
      }
    }

    syncPolicy()

    return () => {
      cancelled = true
    }
  }, [adminSelectedDirection, isAdminRole, userRole])

  const canManageTabForDirection = useCallback(
    (tabKey: string, directionValue: string) => {
      return getManageableFiscalTabKeysForDirection(userRole, isAdminRole ? directionValue : undefined).includes(tabKey)
    },
    [fiscalPolicyRevision, isAdminRole, userRole],
  )

  useEffect(() => {
    if (availableTabs.length === 0) return
    const firstEnabledTab = selectableTabs.find((tab) => !tab.isDisabled)?.key ?? availableTabs[0].key
    if (!availableTabs.some((tab) => tab.key === activeTab) || disabledTabKeys.has(activeTab)) {
      setActiveTab(firstEnabledTab)
    }
  }, [activeTab, availableTabs, disabledTabKeys, selectableTabs])

  useEffect(() => {
    if (!selectableYears.includes(annee)) {
      const fallbackYear = selectableYears[0]
      if (fallbackYear) {
        setAnnee(fallbackYear)
        return
      }
    }

    if (!selectableMonths.some((month) => month.value === mois)) {
      const fallbackMonth = selectableMonths[0]?.value
      if (fallbackMonth) {
        setMois(fallbackMonth)
      }
    }
  }, [annee, mois, selectableMonths, selectableYears])

  //  Auto-set direction based on user role 
  useEffect(() => {
    if (!user || isAdminRole) return
    setDirection((prev) => resolveDirectionForRole(prev))
  }, [user, isAdminRole, resolveDirectionForRole])

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

    return () => {
      cancelled = true
    }
  }, [status, user])

  useEffect(() => {
    if (status !== "authenticated") return

    let cancelled = false
    const token = typeof localStorage !== "undefined" ? localStorage.getItem("jwt") : null
    const normalizedExpectedDirection = normalizeRecapDesignation(safeString(effectiveDirection))
    const expectedDirection = ["all", "tout", "tous"].includes(normalizedExpectedDirection)
      ? ""
      : normalizedExpectedDirection

    const loadMonthlyG50Recaps = async () => {
      try {
        const recapKeyByStateKey: Array<[keyof MonthlyG50RecapRowsByKey, string]> = [
          ["tap15", "tap15"],
          ["tacp7", "tacp7"],
          ["tnfdal1", "tnfdal1"],
          ["masters15", "masters15"],
          ["g50", "g50"],
        ]

        const entries = await Promise.all(
          recapKeyByStateKey.map(async ([stateKey, recapKey]) => {
            const response = await fetch(
              `${API_BASE}/api/fiscal-recaps?key=${encodeURIComponent(recapKey)}&mois=${encodeURIComponent(mois)}&annee=${encodeURIComponent(annee)}`,
              {
                credentials: "include",
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
              },
            )

            if (!response.ok) return [stateKey, [] as Record<string, string>[]] as const

            const payload = await response.json().catch(() => [])
            const recaps = Array.isArray(payload) ? (payload as ApiFiscalRecap[]) : []
            const selected = recaps
              .map((item) => ({
                ...item,
                rows: parseRecapRowsJson(item.rowsJson),
              }))
              .find((item) => {
                if (!expectedDirection) return true
                const normalizedDirection = normalizeRecapDesignation(safeString(item.direction))
                return !normalizedDirection
                  || normalizedDirection === expectedDirection
                  || normalizedDirection.includes(expectedDirection)
                  || expectedDirection.includes(normalizedDirection)
              })

            return [stateKey, selected?.rows ?? []] as const
          }),
        )

        if (cancelled) return

        const nextRows: MonthlyG50RecapRowsByKey = {
          tap15: [],
          tacp7: [],
          tnfdal1: [],
          masters15: [],
          g50: [],
        }

        for (const [stateKey, rows] of entries) {
          nextRows[stateKey] = rows
        }

        setMonthlyG50RecapRowsByKey(nextRows)
      } catch {
        if (!cancelled) {
          setMonthlyG50RecapRowsByKey({ tap15: [], tacp7: [], tnfdal1: [], masters15: [], g50: [] })
        }
      }
    }

    const loadRecapSources = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/fiscal/recap-sources?mois=${encodeURIComponent(mois)}&annee=${encodeURIComponent(annee)}`, {
          credentials: "include",
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        })

        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const payload = await response.json()
        if (cancelled) return

        setRecapSources({
          encaissementByDirection: Array.isArray(payload?.encaissementByDirection) ? payload.encaissementByDirection : [],
          tvaImmoByDirection: Array.isArray(payload?.tvaImmoByDirection) ? payload.tvaImmoByDirection : [],
          tvaBiensByDirection: Array.isArray(payload?.tvaBiensByDirection) ? payload.tvaBiensByDirection : [],
          caTapByDirection: Array.isArray(payload?.caTapByDirection) ? payload.caTapByDirection : [],
          tapByDirection: Array.isArray(payload?.tapByDirection) ? payload.tapByDirection : [],
          droitsTimbreByDirection: Array.isArray(payload?.droitsTimbreByDirection) ? payload.droitsTimbreByDirection : [],
        })
      } catch {
        if (!cancelled) {
          setRecapSources({
            encaissementByDirection: [],
            tvaImmoByDirection: [],
            tvaBiensByDirection: [],
            caTapByDirection: [],
            tapByDirection: [],
            droitsTimbreByDirection: [],
          })
        }
      }
    }

    loadMonthlyG50Recaps()
    loadRecapSources()
    return () => {
      cancelled = true
    }
  }, [annee, effectiveDirection, mois, status])

  useEffect(() => {
    if (status !== "authenticated") return

    let cancelled = false
    const token = typeof localStorage !== "undefined" ? localStorage.getItem("jwt") : null

    const loadAnnualSources = async () => {
      try {
        const responses = await Promise.all(
          MONTHS.map(async (month) => {
            const response = await fetch(
              `${API_BASE}/api/fiscal/recap-sources?mois=${encodeURIComponent(month.value)}&annee=${encodeURIComponent(annee)}`,
              {
                credentials: "include",
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
              },
            )

            if (!response.ok) throw new Error(`HTTP ${response.status}`)
            const payload = await response.json()
            return {
              month: month.value,
              sources: {
                encaissementByDirection: Array.isArray(payload?.encaissementByDirection) ? payload.encaissementByDirection : [],
                tvaImmoByDirection: Array.isArray(payload?.tvaImmoByDirection) ? payload.tvaImmoByDirection : [],
                tvaBiensByDirection: Array.isArray(payload?.tvaBiensByDirection) ? payload.tvaBiensByDirection : [],
                caTapByDirection: Array.isArray(payload?.caTapByDirection) ? payload.caTapByDirection : [],
                tapByDirection: Array.isArray(payload?.tapByDirection) ? payload.tapByDirection : [],
                droitsTimbreByDirection: Array.isArray(payload?.droitsTimbreByDirection) ? payload.droitsTimbreByDirection : [],
              },
            }
          }),
        )

        if (cancelled) return

        const nextMap: Record<string, RecapSourcesResponse> = {}
        for (const item of responses) {
          nextMap[item.month] = item.sources
        }
        setAnnualRecapSourcesByMonth(nextMap)
      } catch {
        if (!cancelled) setAnnualRecapSourcesByMonth({})
      }
    }

    loadAnnualSources()
    return () => {
      cancelled = true
    }
  }, [annee, status])

  useEffect(() => {
    if (status !== "authenticated") return

    let cancelled = false
    const token = typeof localStorage !== "undefined" ? localStorage.getItem("jwt") : null

    const loadG50Recaps = async () => {
      try {
        const response = await fetch(
          `${API_BASE}/api/fiscal-recaps?key=g50&annee=${encodeURIComponent(annee)}`,
          {
            credentials: "include",
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          },
        )

        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const payload = await response.json().catch(() => null)
        if (cancelled) return

        const normalizedExpectedDirection = normalizeRecapDesignation(safeString(effectiveDirection))
        const expectedDirection = ["all", "tout", "tous"].includes(normalizedExpectedDirection)
          ? ""
          : normalizedExpectedDirection

        const recaps = Array.isArray(payload)
          ? (payload as ApiFiscalRecap[])
              .map((item) => {
                let rows: Record<string, string>[] = []
                try {
                  const parsedRows = JSON.parse(String(item.rowsJson ?? "[]"))
                  rows = Array.isArray(parsedRows) ? (parsedRows as Record<string, string>[]) : []
                } catch {
                  rows = []
                }

                return {
                  mois: safeString(item.mois),
                  annee: safeString(item.annee),
                  direction: safeString(item.direction),
                  rows,
                }
              })
              .filter((item) => {
                if (!expectedDirection) return true
                if (!item.direction) return true
                const normalized = normalizeRecapDesignation(item.direction)
                return normalized === expectedDirection
                  || normalized.includes(expectedDirection)
                  || expectedDirection.includes(normalized)
              })
          : []

        if (!cancelled) setG50AnnualRecaps(recaps)
      } catch {
        if (!cancelled) setG50AnnualRecaps([])
      }
    }

    loadG50Recaps()
    return () => {
      cancelled = true
    }
  }, [annee, effectiveDirection, status])

  useEffect(() => {
    const collecteeRows = annotateTvaCollecteeMissing(
      buildTvaCollecteeRecapRows(recapSources),
      fiscalDeclarations,
      mois,
      annee,
    )
    const situationRows = annotateTvaSituationMissing(
      buildTvaSituationRecapRows(recapSources),
      fiscalDeclarations,
      mois,
      annee,
    )
    const recapRows = annotateTvaAPayerMissing(buildTvaAPayerRecapRows(collecteeRows, situationRows), collecteeRows, situationRows)
    const masters15Rows = recalcMasters15RecapRows(buildMasters15RecapRows())
    const tap15Rows = annotateTapLikeMissing(
      buildTap15RecapRows(recapSources),
      fiscalDeclarations,
      mois,
      annee,
      "etat_tap",
      "caHt",
    )
    const tnfdal1Rows = annotateTapLikeMissing(
      recalcTnfdal1RecapRows(buildTnfdal1RecapRows(recapSources)),
      fiscalDeclarations,
      mois,
      annee,
      "ca_tap",
      "caHt",
    )
    const tacp7Rows = annotateTapLikeMissing(
      recalcTacp7RecapRows(buildTacp7RecapRows(recapSources)),
      fiscalDeclarations,
      mois,
      annee,
      "ca_tap",
      "base",
    )
    const droitsTimbreRows = annotateDroitsTimbreMissing(
      buildDroitsTimbreRecapRows(recapSources),
      fiscalDeclarations,
      mois,
      annee,
    )
    const g50Rows = annotateG50Missing(
      buildG50RecapRows(mois, annee, fiscalDeclarations, recapSources, monthlyG50RecapRowsByKey),
      fiscalDeclarations,
      mois,
      annee,
      recapRows,
      situationRows,
      droitsTimbreRows,
      monthlyG50RecapRowsByKey,
    )
    const g50Annual = buildG50AnnualRecapRows(annee, g50AnnualRecaps)
    const irgRecapRows = buildIrgRecapRows(fiscalDeclarations, mois, annee, effectiveDirection)

    setRecapRowsByKey({
      tva_collectee: blankZeroManualRecapCells("tva_collectee", collecteeRows),
      tva_situation: blankZeroManualRecapCells("tva_situation", situationRows),
      tva_a_payer: recapRows,
      masters15: blankZeroManualRecapCells("masters15", masters15Rows),
      tap15: tap15Rows,
      tnfdal1: blankZeroManualRecapCells("tnfdal1", tnfdal1Rows),
      tacp7: blankZeroManualRecapCells("tacp7", tacp7Rows),
      droits_timbre: droitsTimbreRows,
      g50: g50Rows,
      g50_annuel: g50Annual.rows,
      irg_recap: irgRecapRows,
    })
    setG50AnnualMissingPeriods(g50Annual.missingMonths)
  }, [annee, annualRecapSourcesByMonth, effectiveDirection, fiscalDeclarations, g50AnnualRecaps, mois, monthlyG50RecapRowsByKey, recapSources])

  useEffect(() => {
    if (isLoading || status !== "authenticated" || !user) {
      return
    }

    if (!editQuery.editId) {
      setEditingDeclarationId(null)
      setEditingCreatedAt("")
      setEditingSourceMois("")
      setEditingSourceAnnee("")
      return
    }

    try {
      const parsed = JSON.parse(localStorage.getItem("fiscal_declarations") ?? "[]")
      const declarations = Array.isArray(parsed) ? (parsed as SavedDeclaration[]) : []
      const declaration = declarations.find((item) => safeString(item.id) === editQuery.editId)

      if (!declaration) {
        toast({
          title: "Declaration introuvable",
          description: "La declaration demandee n'existe pas ou a deja ete supprimee.",
          variant: "destructive",
        })
        return
      }

      const requestedTab = isFiscalTabKey(editQuery.tab) ? editQuery.tab : resolveDeclarationTabKey(declaration)
      const loadedDirection = safeString(declaration.direction).trim()
      const scopedDirection = isAdminRole ? loadedDirection : resolveDirectionForRole(loadedDirection)

      if (!isAdminRole && !canManageTabForDirection(requestedTab, scopedDirection)) {
        toast({
          title: "Acces refuse",
          description: "Votre profil n'est pas autorise a modifier ce tableau fiscal.",
          variant: "destructive",
        })
        router.push("/fisca_dashbord")
        return
      }

      setEditingDeclarationId(safeString(declaration.id) || editQuery.editId)
      setEditingCreatedAt(safeString(declaration.createdAt) || new Date().toISOString())
      setActiveTab(requestedTab)
      setDirection(scopedDirection)
      const loadedMois = normalizeMonthValue(safeString(declaration.mois))
      const loadedAnnee = normalizeYearValue(safeString(declaration.annee))
      setMois(loadedMois)
      setAnnee(loadedAnnee)
      setEditingSourceMois(loadedMois)
      setEditingSourceAnnee(loadedAnnee)

      setEncRows(normalizeEncRows(declaration.encRows))
      setTvaImmoRows(normalizeTvaRows(declaration.tvaImmoRows))
      setTvaBiensRows(normalizeTvaRows(declaration.tvaBiensRows))
      setTimbreRows(normalizeTimbreRows(declaration.timbreRows))
      setB12(safeString(declaration.b12))
      setB13(safeString(declaration.b13))
      setTapRows(normalizeTapRows(declaration.tapRows))
      setSiegeEncRows(normalizeSiegeRows(declaration.caSiegeRows))
      setIrgRows(normalizeIrgRows(declaration.irgRows))
      setTaxe2Rows(normalizeTaxe2Rows(declaration.taxe2Rows))
      setMasterRows(normalizeMasterRows(declaration.masterRows))
      setTaxe11Montant(safeString(declaration.taxe11Montant))
      setTaxe12Rows(normalizeTaxe12Rows(declaration.taxe12Rows))
      setAcompteMonths(normalizeAcompteMonths(declaration.acompteMonths))

      setTnfdal1Rows(normalizeTnfdal1Rows(declaration.tnfdal1Rows))
      setTacp7Rows(normalizeTacp7Rows(declaration.tacp7Rows))
    } catch {
      toast({
        title: "Erreur de chargement",
        description: "Impossible de charger la declaration a modifier.",
        variant: "destructive",
      })
    }
  }, [
    canManageTabForDirection,
    editQuery.editId,
    editQuery.tab,
    isAdminRole,
    isLoading,
    resolveDirectionForRole,
    router,
    status,
    user,
  ])

  const handleRecapCellChange = useCallback((rowIndex: number, columnKey: string, value: string) => {
    setRecapRowsByKey((prev) => {
      const sourceRows = prev[activeRecapTab] ?? []
      const updatedRows = sourceRows.map((row, index) => {
        if (index !== rowIndex) return row

        const designation = String(row.designation ?? "")
        if (!isRecapCellEditable(activeRecapTab, designation, columnKey)) {
          return row
        }

        const normalizedValue = normalizeAmountInput(value)
        return {
          ...row,
          [columnKey]: normalizedValue,
        }
      })

      // Recalculate computed recap tables, then keep manual zero values visually empty.
      if (activeRecapTab === "tva_collectee" || activeRecapTab === "tva_situation" || activeRecapTab === "tva_a_payer") {
        const nextRows =
          activeRecapTab === "tva_collectee"
            ? recalcTvaCollecteeRecapRows(updatedRows)
            : activeRecapTab === "tva_situation"
              ? recalcTvaSituationRecapRows(updatedRows)
              : recalcTvaAPayerRecapRows(updatedRows)

        const nextCollectee = activeRecapTab === "tva_collectee"
          ? blankZeroManualRecapCells("tva_collectee", nextRows)
          : prev.tva_collectee
        const nextSituation = activeRecapTab === "tva_situation"
          ? blankZeroManualRecapCells("tva_situation", nextRows)
          : prev.tva_situation

        return {
          ...prev,
          tva_collectee: nextCollectee,
          tva_situation: nextSituation,
          tva_a_payer: annotateTvaAPayerMissing(buildTvaAPayerRecapRows(nextCollectee, nextSituation), nextCollectee, nextSituation),
        }
      }

      if (activeRecapTab === "tacp7") {
        return {
          ...prev,
          tacp7: blankZeroManualRecapCells("tacp7", recalcTacp7RecapRows(updatedRows)),
        }
      }

      if (activeRecapTab === "tnfdal1") {
        return {
          ...prev,
          tnfdal1: blankZeroManualRecapCells("tnfdal1", recalcTnfdal1RecapRows(updatedRows)),
        }
      }

      if (activeRecapTab === "masters15") {
        return {
          ...prev,
          masters15: blankZeroManualRecapCells("masters15", recalcMasters15RecapRows(updatedRows)),
        }
      }

      // For other tables, just update the rows without recalculation
      return {
        ...prev,
        [activeRecapTab]: updatedRows,
      }
    })
  }, [activeRecapTab])

  const handleSaveEtatsSortie = useCallback(async () => {
    const currentRows = recapRowsByKey[activeRecapTab] ?? []
    const rowsToSave = activeRecapTab === "masters15"
      ? blankZeroManualRecapCells("masters15", recalcMasters15RecapRows(currentRows))
      : currentRows
    const missingRequired = currentRows.some((row) => {
      const designation = String(row.designation ?? "")
      return activeRecapDefinition.columns.some((column) => {
        if (!isRecapCellMandatory(activeRecapTab, designation, column.key)) return false
        const rawValue = safeString(row[column.key]).trim()
        return rawValue === ""
      })
    })

    if (missingRequired) {
      toast({
        title: "Champs obligatoires",
        description: "Veuillez renseigner tous les champs obligatoires avant d'enregistrer le recap.",
        variant: "destructive",
      })
      return
    }

    if (!mois || !annee) {
      toast({
        title: "Periode requise",
        description: "Le mois et l'annee sont obligatoires.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const token = typeof localStorage !== "undefined" ? localStorage.getItem("jwt") : null
      const response = await fetch(`${API_BASE}/api/fiscal-recaps/save`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          key: activeRecapTab,
          title: activeRecapDefinition.title,
          mois,
          annee,
          direction: effectiveDirection,
          rows: rowsToSave,
          formulas: {},
          isGenerated: false,
        }),
      })

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}))
        const errorMessage = errorPayload && typeof errorPayload === "object" && "message" in errorPayload
          ? String((errorPayload as { message?: unknown }).message ?? "Erreur lors de l'enregistrement")
          : "Erreur lors de l'enregistrement"

        toast({
          title: "Erreur d'enregistrement",
          description: errorMessage,
          variant: "destructive",
        })
        setIsSubmitting(false)
        return
      }

      toast({
        title: "Recap enregistre",
        description: `Le tableau ${activeRecapDefinition.title} a ete enregistre avec succes.`,
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
  }, [activeRecapDefinition.columns, activeRecapDefinition.title, activeRecapTab, annee, effectiveDirection, mois, recapRowsByKey, router, toast])

  const handleSave = async () => {
    if (entryMode === "etats_sortie") {
      await handleSaveEtatsSortie()
      return
    }

    if (existingDeclarationMatch && (!editingDeclarationId || String(existingDeclarationMatch.id) !== safeString(editingDeclarationId))) {
      toast({
        title: "Déclaration déjà existante",
        description: "Une déclaration existe déjà pour ce tableau, cette période et cette direction. Utilisez Consulter, Supprimer ou Modifier.",
        variant: "destructive",
      })
      return
    }

    const saveDirection = effectiveDirection

    const isAdminEditing = isAdminRole && !!editingDeclarationId
    if (!isAdminEditing && !canManageTabForDirection(activeTab, saveDirection)) {
      toast({
        title: "Acces refuse",
        description: "Votre profil n'est pas autorise a creer ou modifier ce tableau fiscal.",
        variant: "destructive",
      })
      return
    }

    if (isActiveTabDisabled) {
      toast({
        title: "Tableau desactive",
        description: "Le tableau selectionne est desactive par l'administration.",
        variant: "destructive",
      })
      return
    }

    if (!selectableYears.includes(annee) || !selectableMonths.some((month) => month.value === mois)) {
      toast({
        title: "Periode cloturee",
        description: "Le mois ou l'annee selectionne(e) est hors delai.",
        variant: "destructive",
      })
      return
    }

    if (activeTab === "acompte" && !ACOMPTE_ALLOWED_MONTHS.includes(mois as (typeof ACOMPTE_ALLOWED_MONTHS)[number])) {
      toast({
        title: "Periode invalide",
        description: "Le tableau 13 n'est autorise qu'en mars, mai et octobre.",
        variant: "destructive",
      })
      return
    }

    // Validation : direction, mois, annee obligatoires
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

    const isSourcePeriodLocked =
      !!editingDeclarationId &&
      !!editingSourceMois &&
      !!editingSourceAnnee &&
      isFiscalPeriodLocked(editingSourceMois, editingSourceAnnee, userRole)

    if (isSourcePeriodLocked) {
      toast({
        title: "Periode cloturee",
        description: `${getFiscalPeriodLockMessage(editingSourceMois, editingSourceAnnee, userRole)} Aucune modification n'est autorisee.`,
        variant: "destructive",
      })
      return
    }

    if (isFiscalPeriodLocked(mois, annee, userRole)) {
      toast({
        title: "Periode cloturee",
        description: `${getFiscalPeriodLockMessage(mois, annee, userRole)} Aucune creation ou modification n'est autorisee.`,
        variant: "destructive",
      })
      return
    }

    // Validation : aucune case du tableau actif ne doit etre vide
    let validationError = false
    switch (activeTab) {
      case "encaissement":
        if (encRows.some(r => !r.designation.trim() || !r.ht)) {
          toast({ title: "Champs incomplets", description: "Tous les champs du tableau doivent etre remplis.", variant: "destructive" })
          validationError = true
        }
        break
      case "tva_immo":
        if (tvaImmoRows.some(r => !r.fournisseurId || !r.nomRaisonSociale.trim() || !r.nif.trim() || !r.adresse.trim() || !r.numRC.trim() || !r.dateFacture || !r.numFacture.trim() || !r.montantHT || !normalizeTvaRate(r.tauxTVA))) {
          toast({ title: "Champs incomplets", description: "Tous les champs du tableau doivent etre remplis.", variant: "destructive" })
          validationError = true
        }
        break
      case "tva_biens":
        if (tvaBiensRows.some(r => !r.fournisseurId || !r.nomRaisonSociale.trim() || !r.nif.trim() || !r.adresse.trim() || !r.numRC.trim() || !r.dateFacture || !r.numFacture.trim() || !r.montantHT || !normalizeTvaRate(r.tauxTVA))) {
          toast({ title: "Champs incomplets", description: "Tous les champs du tableau doivent etre remplis.", variant: "destructive" })
          validationError = true
        }
        break
      case "droits_timbre":
        if (timbreRows.some(r => !r.designation.trim() || !r.caTTCEsp || !r.droitTimbre)) {
          toast({ title: "Champs incomplets", description: "Tous les champs du tableau doivent etre remplis.", variant: "destructive" })
          validationError = true
        }
        break
      case "ca_tap":
        if (!b12 || !b13) {
          toast({ title: "Champs incomplets", description: "Tous les champs doivent etre remplis.", variant: "destructive" })
          validationError = true
        }
        break
      case "etat_tap":
        if (tapRows.some(r => !r.wilayaCode || !r.commune.trim() || !r.tap2)) {
          toast({ title: "Champs incomplets", description: "Tous les champs du tableau doivent etre remplis.", variant: "destructive" })
          validationError = true
        }
        break
      case "ca_siege":
        if (siegeEncRows.every(r => !r.ttc && !r.ht)) {
          toast({ title: "Champs incomplets", description: "Veuillez renseigner au moins une ligne du tableau Siege.", variant: "destructive" })
          validationError = true
        }
        break
      case "irg":
        if (irgRows.every(r => !r.assietteImposable && !r.montant)) {
          toast({ title: "Champs incomplets", description: "Veuillez renseigner au moins une ligne IRG.", variant: "destructive" })
          validationError = true
          break
        }
        const invalidIrgRow = irgRows.find((row) => {
          if (!row.assietteImposable && !row.montant) return false
          const assiette = num(row.assietteImposable, false)
          const montant = num(row.montant, false)
          return assiette <= montant
        })

        if (invalidIrgRow) {
          toast({
            title: "Montants invalides",
            description: "Pour chaque ligne IRG renseignee, l'assiette imposable doit etre strictement superieure au montant.",
            variant: "destructive",
          })
          validationError = true
        }
        break
      case "taxe2":
        if (!taxe2Rows[0].base && !taxe2Rows[0].montant) {
          toast({ title: "Champs incomplets", description: "Veuillez renseigner la ligne Taxe 2%.", variant: "destructive" })
          validationError = true
        }
        break
      case "tnfdal1":
        if (tnfdal1Rows.some((row) => !safeString(row.caHt).trim() || !safeString(row.taxe).trim())) {
          toast({ title: "Champs incomplets", description: "Tous les champs du tableau doivent etre remplis.", variant: "destructive" })
          validationError = true
        }
        break
      case "tacp7":
        if (tacp7Rows.some((row) => !safeString(row.base).trim() || !safeString(row.taxe).trim())) {
          toast({ title: "Champs incomplets", description: "Tous les champs du tableau doivent etre remplis.", variant: "destructive" })
          validationError = true
        }
        break
    }

    if (validationError) return

    let existingDeclarations: SavedDeclaration[] = []
    try {
      const parsed = JSON.parse(localStorage.getItem("fiscal_declarations") ?? "[]")
      existingDeclarations = Array.isArray(parsed) ? (parsed as SavedDeclaration[]) : []
    } catch {
      existingDeclarations = []
    }

    const originalDeclaration = editingDeclarationId
      ? existingDeclarations.find((item) => safeString(item.id) === editingDeclarationId) ?? null
      : null

    if (activeTab === "tva_immo" || activeTab === "tva_biens") {
      const currentRows = activeTab === "tva_immo" ? tvaImmoRows : tvaBiensRows

      const duplicateInCurrentTable = findDuplicateInTvaRows(currentRows)
      if (duplicateInCurrentTable) {
        toast({
          title: "Facture en doublon",
          description: `Doublon detecte dans le tableau: Fournisseur "${duplicateInCurrentTable.fournisseur}", Reference "${duplicateInCurrentTable.reference}", Date "${duplicateInCurrentTable.date}".`,
          variant: "destructive",
        })
        return
      }

      const duplicateInHistory = findDuplicateAcrossSavedDeclarations(currentRows, existingDeclarations, editingDeclarationId)
      if (duplicateInHistory) {
        toast({
          title: "Facture deja enregistree",
          description: `Cette facture existe deja (tableau 2/3, toutes periodes): Fournisseur "${duplicateInHistory.fournisseur}", Reference "${duplicateInHistory.reference}", Date "${duplicateInHistory.date}".`,
          variant: "destructive",
        })
        return
      }
    }

    setIsSubmitting(true)
    await new Promise((r) => setTimeout(r, 400))

    const declarationId = editingDeclarationId ?? Date.now().toString()
    const declarationCreatedAt = editingCreatedAt || new Date().toISOString()
    
    // Enregistrer seulement le tableau actif
    const baseDecl: SavedDeclaration = {
      id: declarationId,
      createdAt: declarationCreatedAt,
      direction: saveDirection,
      mois,
      annee,
      encRows: [] as EncRow[],
      tvaImmoRows: [] as TvaRow[],
      tvaBiensRows: [] as TvaRow[],
      timbreRows: [] as TimbreRow[],
      b12: "",
      b13: "",
      tapRows: [] as TAPRow[],
      caSiegeRows: [] as SiegeEncRow[],
      irgRows: [] as IrgRow[],
      taxe2Rows: [] as Taxe2Row[],
      masterRows: [] as MasterRow[],
      taxe11Montant: "",
      taxe12Rows: [] as Taxe12Row[],
      acompteMonths: [] as string[],

      tnfdal1Rows: [] as Tnfdal1Row[],
      tacp7Rows: [] as Tacp7Row[],
    }
    
    // Remplir uniquement les donnees du tableau actif
    switch (activeTab) {
      case "encaissement":
        baseDecl.encRows = encRows
        break
      case "tva_immo":
        baseDecl.tvaImmoRows = tvaImmoRows
        break
      case "tva_biens":
        baseDecl.tvaBiensRows = tvaBiensRows
        break
      case "droits_timbre":
        baseDecl.timbreRows = timbreRows
        break
      case "ca_tap":
        baseDecl.b12 = b12
        baseDecl.b13 = b13
        break
      case "etat_tap":
        baseDecl.tapRows = tapRows
        break
      case "ca_siege":
        baseDecl.caSiegeRows = siegeEncRows
        break
      case "irg":
        baseDecl.irgRows = irgRows
        break
      case "taxe2":
        baseDecl.taxe2Rows = taxe2Rows
        break
      case "taxe_masters":
        baseDecl.masterRows = masterRows
        break
      case "taxe_vehicule":
        baseDecl.taxe11Montant = taxe11Montant
        break
      case "taxe_formation":
        baseDecl.taxe12Rows = taxe12Rows
        break
      case "acompte":
        baseDecl.acompteMonths = acompteMonths
        break

      case "tnfdal1":
        baseDecl.tnfdal1Rows = tnfdal1Rows
        break
      case "tacp7":
        baseDecl.tacp7Rows = tacp7Rows
        break
    }
    
    try {
      if (editingDeclarationId) {
        const hasTarget = existingDeclarations.some((item) => safeString(item.id) === editingDeclarationId)
        const updated = hasTarget
          ? existingDeclarations.map((item) => (safeString(item.id) === editingDeclarationId ? baseDecl : item))
          : [baseDecl, ...existingDeclarations]
        localStorage.setItem("fiscal_declarations", JSON.stringify(updated))
      } else {
        localStorage.setItem("fiscal_declarations", JSON.stringify([baseDecl, ...existingDeclarations]))
      }
    } catch { /* quota or SSR */ }

    // Persist to database
    try {
      const apiBase = API_BASE
      const token = typeof localStorage !== "undefined" ? localStorage.getItem("jwt") : null
      let tabData: unknown = {}
      switch (activeTab) {
        case "encaissement":   tabData = { encRows }; break
        case "tva_immo":       tabData = { tvaImmoRows }; break
        case "tva_biens":      tabData = { tvaBiensRows }; break
        case "droits_timbre":  tabData = { timbreRows }; break
        case "ca_tap":         tabData = { b12, b13 }; break
        case "etat_tap":       tabData = { tapRows }; break
        case "ca_siege":       tabData = { caSiegeRows: siegeEncRows }; break
        case "irg":            tabData = { irgRows }; break
        case "taxe2":          tabData = { taxe2Rows }; break
        case "taxe_masters":   tabData = { masterRows }; break
        case "taxe_vehicule":  tabData = { taxe11Montant }; break
        case "taxe_formation": tabData = { taxe12Rows }; break
        case "acompte":        tabData = { acompteMonths }; break

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
          const deleteErrorPayload = await deleteResponse.json().catch(() => ({}))
          const deleteErrorMessage = deleteErrorPayload && typeof deleteErrorPayload === "object" && "message" in deleteErrorPayload
            ? String((deleteErrorPayload as { message?: unknown }).message ?? "Erreur lors de la suppression avant modification")
            : "Erreur lors de la suppression avant modification"

          try {
            localStorage.setItem("fiscal_declarations", JSON.stringify(existingDeclarations))
          } catch {
            // Ignore local cache restore failures.
          }

          setIsSubmitting(false)
          toast({
            title: "Erreur de modification",
            description: deleteErrorMessage,
            variant: "destructive",
          })
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
        const errorPayload = await createResponse.json().catch(() => ({}))
        const errorMessage = errorPayload && typeof errorPayload === "object" && "message" in errorPayload
          ? String((errorPayload as { message?: unknown }).message ?? "Erreur lors de l'enregistrement")
          : "Erreur lors de l'enregistrement"

        let restoreSucceeded = false
        if (editingDeclarationId && originalDeclaration) {
          let restoreTabData: unknown = {}
          switch (activeTab) {
            case "encaissement":   restoreTabData = { encRows: originalDeclaration.encRows ?? [] }; break
            case "tva_immo":       restoreTabData = { tvaImmoRows: originalDeclaration.tvaImmoRows ?? [] }; break
            case "tva_biens":      restoreTabData = { tvaBiensRows: originalDeclaration.tvaBiensRows ?? [] }; break
            case "droits_timbre":  restoreTabData = { timbreRows: originalDeclaration.timbreRows ?? [] }; break
            case "ca_tap":         restoreTabData = { b12: originalDeclaration.b12 ?? "", b13: originalDeclaration.b13 ?? "" }; break
            case "etat_tap":       restoreTabData = { tapRows: originalDeclaration.tapRows ?? [] }; break
            case "ca_siege":       restoreTabData = { caSiegeRows: originalDeclaration.caSiegeRows ?? [] }; break
            case "irg":            restoreTabData = { irgRows: originalDeclaration.irgRows ?? [] }; break
            case "taxe2":          restoreTabData = { taxe2Rows: originalDeclaration.taxe2Rows ?? [] }; break
            case "taxe_masters":   restoreTabData = { masterRows: originalDeclaration.masterRows ?? [] }; break
            case "taxe_vehicule":  restoreTabData = { taxe11Montant: originalDeclaration.taxe11Montant ?? "" }; break
            case "taxe_formation": restoreTabData = { taxe12Rows: originalDeclaration.taxe12Rows ?? [] }; break
            case "acompte":        restoreTabData = { acompteMonths: originalDeclaration.acompteMonths ?? [] }; break

            case "tnfdal1":       restoreTabData = { tnfdal1Rows: originalDeclaration.tnfdal1Rows ?? [] }; break
            case "tacp7":         restoreTabData = { tacp7Rows: originalDeclaration.tacp7Rows ?? [] }; break
          }

          const restoreResponse = await fetch(`${apiBase}/api/fiscal`, {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
              tabKey: activeTab,
              mois: originalDeclaration.mois,
              annee: originalDeclaration.annee,
              direction: originalDeclaration.direction,
              dataJson: JSON.stringify(restoreTabData),
            }),
          })

          restoreSucceeded = restoreResponse.ok
        }

        try {
          localStorage.setItem("fiscal_declarations", JSON.stringify(existingDeclarations))
        } catch {
          // Ignore local cache restore failures.
        }

        const finalErrorMessage = restoreSucceeded
          ? `${errorMessage} L'ancienne déclaration a été restaurée automatiquement.`
          : errorMessage

        setIsSubmitting(false)
        toast({
          title: "Erreur d'enregistrement",
          description: finalErrorMessage,
          variant: "destructive",
        })
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

        const next = prev.filter((item) => Number(item.id) !== savedDeclaration.id)
        return [savedDeclaration, ...next]
      })

      try {
        const recapResponse = await fetch(`${apiBase}/api/fiscal/recap-sources?mois=${encodeURIComponent(mois)}&annee=${encodeURIComponent(annee)}`, {
          credentials: "include",
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        })

        if (recapResponse.ok) {
          const payload = await recapResponse.json().catch(() => null)
          const nextSources: RecapSourcesResponse = {
            encaissementByDirection: Array.isArray(payload?.encaissementByDirection) ? payload.encaissementByDirection : [],
            tvaImmoByDirection: Array.isArray(payload?.tvaImmoByDirection) ? payload.tvaImmoByDirection : [],
            tvaBiensByDirection: Array.isArray(payload?.tvaBiensByDirection) ? payload.tvaBiensByDirection : [],
            caTapByDirection: Array.isArray(payload?.caTapByDirection) ? payload.caTapByDirection : [],
            tapByDirection: Array.isArray(payload?.tapByDirection) ? payload.tapByDirection : [],
            droitsTimbreByDirection: Array.isArray(payload?.droitsTimbreByDirection) ? payload.droitsTimbreByDirection : [],
          }

          setRecapSources(nextSources)
          setAnnualRecapSourcesByMonth((prev) => ({
            ...prev,
            [mois]: nextSources,
          }))
        }
      } catch {
        // Keep the saved declaration; the next page refresh will recover recap sources.
      }

    } catch (error) {
      try {
        localStorage.setItem("fiscal_declarations", JSON.stringify(existingDeclarations))
      } catch {
        // Ignore local cache restore failures.
      }

      setIsSubmitting(false)
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de contacter le serveur",
        variant: "destructive",
      })
      return
    }
    
    const tabLabel = TABS.find((t) => t.key === activeTab)?.label ?? activeTab
    toast({
      title: editingDeclarationId ? " Declaration modifiee" : " Declaration enregistree",
      description: `La declaration "${tabLabel}" a ete sauvegardee avec succes.`,
    })
    setIsSubmitting(false)
    router.push("/fisca_dashbord")
  }


  const buildSavedDeclarationFromApi = useCallback((declaration: ApiFiscalDeclaration): SavedDeclaration => {
    const payload = parseFiscalDataPayload(safeString(declaration.dataJson))
    const saved: SavedDeclaration = {
      id: String(declaration.id),
      createdAt: new Date().toISOString(),
      direction: declaration.direction,
      mois: declaration.mois,
      annee: declaration.annee,
    }

    switch (declaration.tabKey) {
      case "encaissement":
        saved.encRows = normalizeEncRows(Array.isArray(payload.encRows) ? (payload.encRows as EncRow[]) : undefined)
        break
      case "tva_immo":
        saved.tvaImmoRows = normalizeTvaRows(Array.isArray(payload.tvaImmoRows) ? (payload.tvaImmoRows as TvaRow[]) : undefined)
        break
      case "tva_biens":
        saved.tvaBiensRows = normalizeTvaRows(Array.isArray(payload.tvaBiensRows) ? (payload.tvaBiensRows as TvaRow[]) : undefined)
        break
      case "droits_timbre":
        saved.timbreRows = normalizeTimbreRows(Array.isArray(payload.timbreRows) ? (payload.timbreRows as TimbreRow[]) : undefined)
        break
      case "ca_tap":
        saved.b12 = safeString(payload.b12)
        saved.b13 = safeString(payload.b13)
        break
      case "etat_tap":
        saved.tapRows = normalizeTapRows(Array.isArray(payload.tapRows) ? (payload.tapRows as TAPRow[]) : undefined)
        break
      case "ca_siege":
        saved.caSiegeRows = normalizeSiegeRows(Array.isArray(payload.caSiegeRows) ? (payload.caSiegeRows as SiegeEncRow[]) : undefined)
        break
      case "irg":
        saved.irgRows = normalizeIrgRows(Array.isArray(payload.irgRows) ? (payload.irgRows as IrgRow[]) : undefined)
        break
      case "taxe2":
        saved.taxe2Rows = normalizeTaxe2Rows(Array.isArray(payload.taxe2Rows) ? (payload.taxe2Rows as Taxe2Row[]) : undefined)
        break
      case "taxe_masters":
        saved.masterRows = normalizeMasterRows(Array.isArray(payload.masterRows) ? (payload.masterRows as MasterRow[]) : undefined)
        break
      case "taxe_vehicule":
        saved.taxe11Montant = safeString(payload.taxe11Montant)
        break
      case "taxe_formation":
        saved.taxe12Rows = normalizeTaxe12Rows(Array.isArray(payload.taxe12Rows) ? (payload.taxe12Rows as Taxe12Row[]) : undefined)
        break
      case "acompte":
        saved.acompteMonths = normalizeAcompteMonths(Array.isArray(payload.acompteMonths) ? (payload.acompteMonths as string[]) : undefined)
        break

      case "tnfdal1":
        saved.tnfdal1Rows = normalizeTnfdal1Rows(Array.isArray(payload.tnfdal1Rows) ? (payload.tnfdal1Rows as Tnfdal1Row[]) : undefined)
        break
      case "tacp7":
        saved.tacp7Rows = normalizeTacp7Rows(Array.isArray(payload.tacp7Rows) ? (payload.tacp7Rows as Tacp7Row[]) : undefined)
        break
    }

    return saved
  }, [])

  const upsertSavedDeclarationLocal = useCallback((declaration: SavedDeclaration) => {
    try {
      const parsed = JSON.parse(localStorage.getItem("fiscal_declarations") ?? "[]")
      const declarations = Array.isArray(parsed) ? (parsed as SavedDeclaration[]) : []
      const next = [declaration, ...declarations.filter((item) => safeString(item.id) !== safeString(declaration.id))]
      localStorage.setItem("fiscal_declarations", JSON.stringify(next))
    } catch {
      // Ignore local storage sync errors.
    }
  }, [])

  const removeSavedDeclarationLocal = useCallback((declarationId: string) => {
    try {
      const parsed = JSON.parse(localStorage.getItem("fiscal_declarations") ?? "[]")
      const declarations = Array.isArray(parsed) ? (parsed as SavedDeclaration[]) : []
      const next = declarations.filter((item) => safeString(item.id) !== safeString(declarationId))
      localStorage.setItem("fiscal_declarations", JSON.stringify(next))
    } catch {
      // Ignore local storage sync errors.
    }
  }, [])

  const handleModifyExistingDeclaration = useCallback(() => {
    if (!existingDeclarationMatch) return

    const targetEditId = String(existingDeclarationMatch.id)
    const targetTab = existingDeclarationMatch.tabKey
    const saved = buildSavedDeclarationFromApi(existingDeclarationMatch)
    upsertSavedDeclarationLocal(saved)

    // Ensure edit loader effect runs immediately, even if the page does not remount.
    setEntryMode("declaration")
    setEditQuery({ editId: targetEditId, tab: targetTab })

    setShowExistingDeclarationDialog(false)
    router.push(`/declaration?editId=${encodeURIComponent(targetEditId)}&tab=${encodeURIComponent(targetTab)}`)
  }, [buildSavedDeclarationFromApi, existingDeclarationMatch, router, upsertSavedDeclarationLocal])

  const handleDeleteExistingDeclaration = useCallback(async () => {
    if (!existingDeclarationMatch) return

    try {
      const token = typeof localStorage !== "undefined" ? localStorage.getItem("jwt") : null
      const response = await fetch(`${API_BASE}/api/fiscal/${encodeURIComponent(String(existingDeclarationMatch.id))}`, {
        method: "DELETE",
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        const message = payload && typeof payload === "object" && "message" in payload
          ? String((payload as { message?: unknown }).message ?? "Impossible de supprimer la déclaration existante")
          : "Impossible de supprimer la déclaration existante"
        toast({ title: "Suppression impossible", description: message, variant: "destructive" })
        return
      }

      setFiscalDeclarations((prev) => prev.filter((item) => String(item.id) !== String(existingDeclarationMatch.id)))
      removeSavedDeclarationLocal(String(existingDeclarationMatch.id))
      setShowExistingDeclarationDialog(false)
      toast({ title: "Déclaration supprimée", description: "La déclaration existante a été supprimée." })
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de contacter le serveur",
        variant: "destructive",
      })
    }
  }, [existingDeclarationMatch, removeSavedDeclarationLocal, toast])


  const activeColor = TABS.find((t) => t.key === activeTab)?.color ?? "#2db34b"
  const mon = MONTHS.find((m) => m.value === mois)?.label ?? mois
  const directionSelectValue = entryMode === "etats_sortie" ? "Siege" : effectiveDirection
  const currentPeriodLockMessage = (() => {
    if (editingDeclarationId && editingSourceMois && editingSourceAnnee && isFiscalPeriodLocked(editingSourceMois, editingSourceAnnee, userRole)) {
      return `${getFiscalPeriodLockMessage(editingSourceMois, editingSourceAnnee, userRole)} Aucune modification n'est autorisee.`
    }
    if (isFiscalPeriodLocked(mois, annee, userRole)) {
      return `${getFiscalPeriodLockMessage(mois, annee, userRole)} Aucune creation ou modification n'est autorisee.`
    }
    return ""
  })()

  if (isLoading || !user || status !== "authenticated") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Chargement...</p>
      </div>
    )
  }

  return (
    <LayoutWrapper user={user}>
      {/* Block global (direction) role */}
      {!hasFiscalTabAccess ? (
        <AccessDeniedDialog
          title="Acces refuse"
          message="Votre role ne vous permet pas de gerer les tableaux fiscaux."
          redirectTo="/fisca_dashbord"
        />
      ) : (
        <>
        <PrintZone
        activeTab={activeTab} direction={effectiveDirection} mois={mois} annee={annee}
        wilayas={wilayas}
        encRows={encRows} tvaImmoRows={tvaImmoRows} tvaBiensRows={tvaBiensRows}
        timbreRows={timbreRows} b12={b12} b13={b13} tapRows={tapRows}
        caSiegeRows={siegeEncRows}
        irgRows={irgRows}
        taxe2Rows={taxe2Rows}
        masterRows={masterRows}
        taxe11Montant={taxe11Montant}
        taxe12Rows={taxe12Rows}
        acompteMonths={acompteMonths}

        tnfdal1Rows={tnfdal1Rows}
        tacp7Rows={tacp7Rows}
      />

      <div className="space-y-5 w-full" ref={printRef}>
        {/*  Page header bar  */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{editingDeclarationId ? "Modifier Declaration" : "Nouvelle Declaration"}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {editingDeclarationId
                ? "Mettez a jour les informations du tableau puis enregistrez les modifications."
                : "Remplissez chaque tableau, puis enregistrez."}
            </p>
          </div>
        </div>

        {/*  Global meta card (Direction + Periode)  */}
        <Card className="border border-gray-200">
          <CardContent className="pt-4 pb-3">
            <div className="mb-4 flex items-center justify-end">
              <div className="flex items-center gap-2 text-xs font-medium text-emerald-800">
                <span>Declaration</span>
                <Switch checked={entryMode === "etats_sortie"} onCheckedChange={(checked) => setEntryMode(checked ? "etats_sortie" : "declaration")} />
                <span>Recap</span>
              </div>
            </div>
            <div className="flex flex-wrap items-end gap-6">
      {/* Direction */}
              <div className="space-y-1 flex-1 min-w-[220px]">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Direction</label>
                <Select value={directionSelectValue} onValueChange={setDirection} disabled={isDirectionLocked || entryMode === "etats_sortie"}>
                  <SelectTrigger className="h-10 text-sm">
                    <SelectValue placeholder="- Selectionner une direction -" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Siege">Siege</SelectItem>
                    {isDirectionLocked && effectiveDirection && effectiveDirection !== "Siege" && !regions.some((r) => r.name === effectiveDirection) && (
                      <SelectItem value={effectiveDirection}>{effectiveDirection}</SelectItem>
                    )}
                    {regions.map((r) => <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {/* Mois */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Mois</label>
                <Select value={mois} onValueChange={setMois}>
                  <SelectTrigger className="h-10 text-sm w-[150px]">
                    <SelectValue placeholder="Mois" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectableMonths.length === 0
                      ? <SelectItem value="no-months" disabled>Aucun mois disponible</SelectItem>
                      : selectableMonths.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {/* Annee */}
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
              {/* Tableau */}
              <div className="space-y-1 flex-1 min-w-[220px]">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Tableau</label>
                <Select value={entryMode === "declaration" ? activeTab : activeRecapTab} onValueChange={(value) => {
                  if (entryMode === "declaration") {
                    if (disabledTabKeys.has(value)) return
                    setActiveTab(value)
                    return
                  }
                  setActiveRecapTab(value as RecapKey)
                }}>
                  <SelectTrigger className="h-10 text-sm">
                    <SelectValue placeholder="Selectionner un tableau" />
                  </SelectTrigger>
                  <SelectContent>
                    {entryMode === "declaration"
                      ? selectableTabs.map((t) => (
                        <SelectItem key={t.key} value={t.key} disabled={t.isDisabled} className={t.isDisabled ? "text-muted-foreground" : ""}>
                          {t.label}{t.isDisabled ? " (desactive)" : ""}
                        </SelectItem>
                      ))
                      : RECAP_TABS.map((item) => (
                        <SelectItem key={item.key} value={item.key}>{item.title}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {isActiveTabDisabled && (
              <p className="mt-3 rounded border border-slate-300 bg-slate-100 px-3 py-2 text-xs font-medium text-slate-600">
                Ce tableau est desactive par l'administration. Il apparait en grise et ne peut pas etre enregistre.
              </p>
            )}
            {currentPeriodLockMessage && (
              <p className="mt-3 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
                 {currentPeriodLockMessage}
              </p>
            )}
            {existingDeclarationMatch && (
              <div className="mt-3 rounded border border-amber-300 bg-amber-50 px-3 py-3 text-xs text-amber-900">
                <p className="font-semibold">Déclaration existante détectée pour les critères sélectionnés.</p>
                <p className="mt-1">
                  Tableau {TABS.find((tab) => tab.key === existingDeclarationMatch.tabKey)?.label ?? existingDeclarationMatch.tabKey}
                  , période {MONTHS.find((month) => month.value === existingDeclarationMatch.mois)?.label ?? existingDeclarationMatch.mois} {existingDeclarationMatch.annee}
                  , direction {existingDeclarationMatch.direction || "-"}.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setShowExistingDeclarationDialog(true)}>
                    Consulter
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 text-xs border-red-300 text-red-700 hover:bg-red-50" onClick={() => { void handleDeleteExistingDeclaration() }}>
                    Supprimer
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 text-xs border-sky-300 text-sky-700 hover:bg-sky-50" onClick={handleModifyExistingDeclaration}>
                    Modifier
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/*  Table content  */}
        <div>
          {entryMode === "etats_sortie" ? (
            <Card>
              <CardHeader className="pb-3">
                 <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-semibold" style={{ color: PRIMARY_COLOR }}>
                      Recap - {activeRecapDefinition.title}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">Survolez chaque case pour voir la regle de calcul ou 'Saisie manuelle'.</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      let newRows: Record<string, string>[] = []
                      switch (activeRecapTab) {
                        case "tva_collectee":
                          newRows = recalcTvaCollecteeRecapRows(buildTvaCollecteeRecapRows(recapSources))
                          break
                        case "tva_situation":
                          newRows = recalcTvaSituationRecapRows(buildTvaSituationRecapRows(recapSources))
                          break
                        case "tva_a_payer":
                          newRows = annotateTvaAPayerMissing(
                            buildTvaAPayerRecapRows(
                              recalcTvaCollecteeRecapRows(buildTvaCollecteeRecapRows(recapSources)),
                              recalcTvaSituationRecapRows(buildTvaSituationRecapRows(recapSources)),
                            ),
                            recalcTvaCollecteeRecapRows(buildTvaCollecteeRecapRows(recapSources)),
                            recalcTvaSituationRecapRows(buildTvaSituationRecapRows(recapSources)),
                          )
                          break
                        case "tap15":
                          newRows = annotateTapLikeMissing(
                            buildTap15RecapRows(recapSources),
                            fiscalDeclarations,
                            mois,
                            annee,
                            "ca_tap",
                            "caHt",
                          )
                          break
                        case "tnfdal1":
                          newRows = annotateTapLikeMissing(
                            buildTnfdal1RecapRows(recapSources),
                            fiscalDeclarations,
                            mois,
                            annee,
                            "ca_tap",
                            "caHt",
                          )
                          break
                        case "tacp7":
                          newRows = annotateTapLikeMissing(
                            recalcTacp7RecapRows(buildTacp7RecapRows(recapSources)),
                            fiscalDeclarations,
                            mois,
                            annee,
                            "ca_tap",
                            "base",
                          )
                          break
                        case "masters15":
                          newRows = recalcMasters15RecapRows(buildMasters15RecapRows())
                          break
                        case "droits_timbre":
                          newRows = annotateDroitsTimbreMissing(
                            buildDroitsTimbreRecapRows(recapSources),
                            fiscalDeclarations,
                            mois,
                            annee,
                          )
                          break
                        case "g50":
                          newRows = annotateG50Missing(
                            buildG50RecapRows(mois, annee, fiscalDeclarations, recapSources, monthlyG50RecapRowsByKey),
                            fiscalDeclarations,
                            mois,
                            annee,
                            recapRowsByKey.tva_a_payer ?? [],
                            recapRowsByKey.tva_situation ?? [],
                            recapRowsByKey.droits_timbre ?? [],
                            monthlyG50RecapRowsByKey,
                          )
                          break
                        case "g50_annuel":
                          newRows = buildG50AnnualRecapRows(annee, g50AnnualRecaps).rows
                          break
                        case "irg_recap":
                          newRows = buildIrgRecapRows(fiscalDeclarations, mois, annee, effectiveDirection)
                          break
                        default:
                          return
                      }
                      setRecapRowsByKey((prev) => ({
                        ...prev,
                        [activeRecapTab]: newRows,
                      }))
                      toast({ title: "Recalcul réussi", description: "Les valeurs ont été recalculées automatiquement." })
                    }}
                    className="text-xs"
                  >
                    Recalculer
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50">
                          {activeRecapDefinition.columns.map((column) => (
                            <th key={column.key} className={`px-3 py-2 text-xs font-semibold text-gray-700 border-b ${column.right ? "text-right" : "text-left"}`}>
                              {column.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {activeRecapRows.map((row, rowIndex) => (
                          <tr key={`${activeRecapTab}-${rowIndex}`} className={rowIndex % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                            {activeRecapDefinition.columns.map((column) => {
                              const designation = String(row.designation ?? "")
                              const editable = isRecapCellEditable(activeRecapTab, designation, column.key)
                              const mandatory = isRecapCellMandatory(activeRecapTab, designation, column.key)
                              const cellValue = safeString(row[column.key])
                              const formula = getRecapCellFormula(activeRecapTab, designation, column.key)
                              const missingReason = getRecapMissingReason(row, column.key)
                              const missingHint = missingReason ? ` - ${RECAP_MISSING_REASON_LABEL[missingReason]} (valeur forcée à 0)` : ""

                              if (column.key === "designation") {
                                return (
                                  <td key={column.key} className="px-3 py-2 border-b text-xs">
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span className="inline-block w-full">{cellValue}</span>
                                      </TooltipTrigger>
                                      <TooltipContent side="top">{formula}</TooltipContent>
                                    </Tooltip>
                                  </td>
                                )
                              }

                              return (
                                <td key={column.key} className={`px-2 py-1 border-b ${column.right ? "text-right" : "text-left"}`}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div>
                                        <AmountInput
                                          value={cellValue}
                                          onChange={editable ? (event) => handleRecapCellChange(rowIndex, column.key, event.target.value) : undefined}
                                          readOnly={!editable}
                                          className={`h-7 px-2 text-xs ${missingReason ? "bg-orange-100" : editable ? "bg-white" : "bg-gray-100 text-gray-500"}`}
                                          placeholder="0,00"
                                        />
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">{`${formula}${missingHint}`}</TooltipContent>
                                  </Tooltip>
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {activeRecapMissingLegendItems.length > 0 && (
                    <div className="rounded border border-orange-300 bg-orange-50 px-3 py-2 text-xs text-orange-800">
                      Déclaration non saisie : les données manquantes sont remplacées par 0.
                    </div>
                  )}

                  {activeRecapTab === "g50_annuel" && g50AnnualMissingPeriods.length > 0 && (
                    <div className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                      Periodes G50 manquantes : {g50AnnualMissingPeriods.join(", ")}
                    </div>
                  )}

                  <div className="flex justify-end">
                    <div className="flex items-center gap-2">
                      <Button size="sm" onClick={handleSave} disabled={isSubmitting} className="gap-1.5" style={{ backgroundColor: PRIMARY_COLOR, color: "white" }}>
                      <Save size={13} /> {isSubmitting ? "Enregistrement" : "Enregistrer"}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
          {activeTab === "encaissement" && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold" style={{ color: PRIMARY_COLOR }}>Encaissement - Saisie des montants</CardTitle>
                </CardHeader>
                <CardContent>
                  <TabEncaissement rows={encRows} setRows={setEncRows} onSave={handleSave} isSubmitting={isSubmitting} />
                </CardContent>
              </Card>
            )}
            {activeTab === "tva_immo" && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold" style={{ color: PRIMARY_COLOR }}>Etat TVA / Immobilisations - Liste des factures</CardTitle>
                </CardHeader>
                <CardContent>
                  <TabTVAEtat rows={tvaImmoRows} setRows={setTvaImmoRows} onSave={handleSave} isSubmitting={isSubmitting} fournisseurs={fiscalFournisseurs} withSelectableRate mois={mois} annee={annee} />
                </CardContent>
              </Card>
            )}
            {activeTab === "tva_biens" && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold" style={{ color: PRIMARY_COLOR }}>Etat TVA / Biens &amp; Services - Liste des factures</CardTitle>
                </CardHeader>
                <CardContent>
                  <TabTVAEtat rows={tvaBiensRows} setRows={setTvaBiensRows} onSave={handleSave} isSubmitting={isSubmitting} fournisseurs={fiscalFournisseurs} withSelectableRate mois={mois} annee={annee} />
                </CardContent>
              </Card>
            )}
            {activeTab === "droits_timbre" && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold" style={{ color: PRIMARY_COLOR }}>Etat Droits de Timbre - Saisie des montants</CardTitle>
                </CardHeader>
                <CardContent>
                  <TabDroitsTimbre rows={timbreRows} setRows={setTimbreRows} onSave={handleSave} isSubmitting={isSubmitting} />
                </CardContent>
              </Card>
            )}
            {activeTab === "ca_tap" && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold" style={{ color: PRIMARY_COLOR }}>CA soumis a 7% &amp; CA Global soumis a 1% - Calcul automatique</CardTitle>
                </CardHeader>
                <CardContent>
                  <TabCA b12={b12} setB12={setB12} b13={b13} setB13={setB13} onSave={handleSave} isSubmitting={isSubmitting} />
                </CardContent>
              </Card>
            )}
            {activeTab === "etat_tap" && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold" style={{ color: PRIMARY_COLOR }}>Etat TAP - Saisie par Wilaya / Commune</CardTitle>
                </CardHeader>
                <CardContent>
                  <TabTAP rows={tapRows} setRows={setTapRows}
                    mois={mois} setMois={setMois} annee={annee} setAnnee={setAnnee}
                    onSave={handleSave} isSubmitting={isSubmitting} wilayas={wilayas} />
                </CardContent>
              </Card>
            )}
            {activeTab === "ca_siege" && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold" style={{ color: PRIMARY_COLOR }}>N7 - Chiffre d'affaire encaisse Siege</CardTitle>
                </CardHeader>
                <CardContent>
                  <TabCaSiege rows={siegeEncRows} setRows={setSiegeEncRows} onSave={handleSave} isSubmitting={isSubmitting} />
                </CardContent>
              </Card>
            )}
            {activeTab === "irg" && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold" style={{ color: PRIMARY_COLOR }}>N8 - Situation IRG</CardTitle>
                </CardHeader>
                <CardContent>
                  <TabIRG rows={irgRows} setRows={setIrgRows} onSave={handleSave} isSubmitting={isSubmitting} />
                </CardContent>
              </Card>
            )}
            {activeTab === "taxe2" && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold" style={{ color: PRIMARY_COLOR }}>N9 - Situation de la Taxe 2%</CardTitle>
                </CardHeader>
                <CardContent>
                  <TabTaxe2 rows={taxe2Rows} setRows={setTaxe2Rows} onSave={handleSave} isSubmitting={isSubmitting} />
                </CardContent>
              </Card>
            )}
            {activeTab === "taxe_masters" && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold" style={{ color: PRIMARY_COLOR }}>N10 - Etat de la Taxe 1,5% des Masters</CardTitle>
                </CardHeader>
                <CardContent>
                  <TabMasters
                    rows={masterRows}
                    setRows={setMasterRows}
                    mois={mois}
                    annee={annee}
                    onSave={handleSave}
                    isSubmitting={isSubmitting}
                  />
                </CardContent>
              </Card>
            )}
            {activeTab === "taxe_vehicule" && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold" style={{ color: PRIMARY_COLOR }}>N11 - Taxe de Vehicule</CardTitle>
                </CardHeader>
                <CardContent>
                  <TabTaxeVehicule montant={taxe11Montant} setMontant={setTaxe11Montant} onSave={handleSave} isSubmitting={isSubmitting} />
                </CardContent>
              </Card>
            )}
            {activeTab === "taxe_formation" && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold" style={{ color: PRIMARY_COLOR }}>N12 - Taxe de Formation</CardTitle>
                </CardHeader>
                <CardContent>
                  <TabTaxeFormation rows={taxe12Rows} setRows={setTaxe12Rows} onSave={handleSave} isSubmitting={isSubmitting} />
                </CardContent>
              </Card>
            )}
            {activeTab === "acompte" && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold" style={{ color: PRIMARY_COLOR }}>N13 - Acompte Provisionnel</CardTitle>
                </CardHeader>
                <CardContent>
                  <TabAcompte months={acompteMonths} setMonths={setAcompteMonths} annee={annee} onSave={handleSave} isSubmitting={isSubmitting} />
                </CardContent>
              </Card>
            )}

            {activeTab === "tnfdal1" && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold" style={{ color: PRIMARY_COLOR }}>TNFDAL 1%</CardTitle>
                </CardHeader>
                <CardContent>
                  <TabTnfdal1 rows={tnfdal1Rows} setRows={setTnfdal1Rows} onSave={handleSave} isSubmitting={isSubmitting} />
                </CardContent>
              </Card>
            )}
            {activeTab === "tacp7" && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold" style={{ color: PRIMARY_COLOR }}>TACP 7%</CardTitle>
                </CardHeader>
                <CardContent>
                  <TabTacp7 rows={tacp7Rows} setRows={setTacp7Rows} onSave={handleSave} isSubmitting={isSubmitting} />
                </CardContent>
              </Card>
            )}
            </>
          )}
          </div>
      </div>
        </>
      )}

      <Dialog open={showExistingDeclarationDialog} onOpenChange={setShowExistingDeclarationDialog}>
        <DialogContent className="!w-[95vw] sm:!w-[90vw] xl:!w-[74vw] !max-w-[1200px] h-[82vh] p-0 overflow-hidden [&_[data-slot=table-head]]:border-r [&_[data-slot=table-head]]:border-border [&_[data-slot=table-head]:last-child]:border-r-0 [&_[data-slot=table-cell]]:border-r [&_[data-slot=table-cell]]:border-border [&_[data-slot=table-cell]:last-child]:border-r-0">
          <div className="border-b bg-gradient-to-r from-slate-50 to-white px-6 py-4">
            <DialogHeader className="space-y-3">
              <DialogTitle className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-base font-semibold leading-tight" style={{ color: TABS.find((tab) => tab.key === existingDeclarationPreview?.tabKey)?.color ?? PRIMARY_COLOR }}>
                    {TABS.find((tab) => tab.key === existingDeclarationPreview?.tabKey)?.title ?? "Déclaration existante"}
                  </p>
                </div>
              </DialogTitle>
              {existingDeclarationPreview && (
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="secondary" className="gap-1.5 font-normal">
                    <Building2 size={12} /> {existingDeclarationPreview.direction || "-"}
                  </Badge>
                  <Badge variant="secondary" className="gap-1.5 font-normal">
                    <CalendarDays size={12} /> {MONTHS.find((month) => month.value === existingDeclarationPreview.mois)?.label ?? existingDeclarationPreview.mois} {existingDeclarationPreview.annee}
                  </Badge>
                </div>
              )}
            </DialogHeader>
          </div>

          <div className="h-[calc(82vh-140px)] overflow-auto bg-slate-50/60 px-6 py-5">
            <div className="rounded-xl border bg-white p-4 shadow-sm">
              {existingDeclarationPreview ? (
                <div className="overflow-x-auto">
                  <ExistingDeclarationTableView
                    tabKey={existingDeclarationPreview.tabKey}
                    decl={{
                      id: existingDeclarationPreview.id,
                      createdAt: new Date().toISOString(),
                      direction: existingDeclarationPreview.direction,
                      mois: existingDeclarationPreview.mois,
                      annee: existingDeclarationPreview.annee,
                      encRows: normalizeEncRows(Array.isArray(existingDeclarationPreview.data.encRows) ? (existingDeclarationPreview.data.encRows as EncRow[]) : undefined),
                      tvaImmoRows: normalizeTvaRows(Array.isArray(existingDeclarationPreview.data.tvaImmoRows) ? (existingDeclarationPreview.data.tvaImmoRows as TvaRow[]) : undefined),
                      tvaBiensRows: normalizeTvaRows(Array.isArray(existingDeclarationPreview.data.tvaBiensRows) ? (existingDeclarationPreview.data.tvaBiensRows as TvaRow[]) : undefined),
                      timbreRows: normalizeTimbreRows(Array.isArray(existingDeclarationPreview.data.timbreRows) ? (existingDeclarationPreview.data.timbreRows as TimbreRow[]) : undefined),
                      b12: safeString(existingDeclarationPreview.data.b12),
                      b13: safeString(existingDeclarationPreview.data.b13),
                      tapRows: normalizeTapRows(Array.isArray(existingDeclarationPreview.data.tapRows) ? (existingDeclarationPreview.data.tapRows as TAPRow[]) : undefined),
                      caSiegeRows: normalizeSiegeRows(Array.isArray(existingDeclarationPreview.data.caSiegeRows) ? (existingDeclarationPreview.data.caSiegeRows as SiegeEncRow[]) : undefined),
                      irgRows: normalizeIrgRows(Array.isArray(existingDeclarationPreview.data.irgRows) ? (existingDeclarationPreview.data.irgRows as IrgRow[]) : undefined),
                      taxe2Rows: normalizeTaxe2Rows(Array.isArray(existingDeclarationPreview.data.taxe2Rows) ? (existingDeclarationPreview.data.taxe2Rows as Taxe2Row[]) : undefined),
                      masterRows: normalizeMasterRows(Array.isArray(existingDeclarationPreview.data.masterRows) ? (existingDeclarationPreview.data.masterRows as MasterRow[]) : undefined),
                      taxe11Montant: safeString(existingDeclarationPreview.data.taxe11Montant),
                      taxe12Rows: normalizeTaxe12Rows(Array.isArray(existingDeclarationPreview.data.taxe12Rows) ? (existingDeclarationPreview.data.taxe12Rows as Taxe12Row[]) : undefined),
                      acompteMonths: normalizeAcompteMonths(Array.isArray(existingDeclarationPreview.data.acompteMonths) ? (existingDeclarationPreview.data.acompteMonths as string[]) : undefined),

                      tnfdal1Rows: normalizeTnfdal1Rows(Array.isArray(existingDeclarationPreview.data.tnfdal1Rows) ? (existingDeclarationPreview.data.tnfdal1Rows as Tnfdal1Row[]) : undefined),
                      tacp7Rows: normalizeTacp7Rows(Array.isArray(existingDeclarationPreview.data.tacp7Rows) ? (existingDeclarationPreview.data.tacp7Rows as Tacp7Row[]) : undefined),
                    }}
                  />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Aucune déclaration à afficher.</p>
              )}
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setShowExistingDeclarationDialog(false)}>
                Fermer
              </Button>
              <Button size="sm" variant="outline" className="h-8 text-xs border-red-300 text-red-700 hover:bg-red-50" onClick={() => { void handleDeleteExistingDeclaration() }}>
                Supprimer
              </Button>
              <Button size="sm" variant="outline" className="h-8 text-xs border-sky-300 text-sky-700 hover:bg-sky-50" onClick={handleModifyExistingDeclaration}>
                Modifier
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </LayoutWrapper>
  )
}

//
// TAB 17 - TNFDAL 1%
//
interface Tab17Props { rows: Tnfdal1Row[]; setRows: React.Dispatch<React.SetStateAction<Tnfdal1Row[]>>; onSave: () => void; isSubmitting: boolean }
function TabTnfdal1({ rows, setRows, onSave, isSubmitting }: Tab17Props) {
  const upd = (i: number, f: "caHt" | "taxe", v: string) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [f]: v } : r)))

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">Designation</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">Chiffres d'Affaires HT</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">Montant du TNFDAL 1%</th>
            </tr>
          </thead>
          <tbody>
            {TNFDAL1_DECLARATION_ROWS.map((label, i) => (
              <tr key={label} className="bg-white">
                <td className="px-3 py-1 text-xs border-b font-medium text-gray-800" style={{ minWidth: 240 }}>{label}</td>
                <td className="px-1 py-1 border-b">
                  <AmountInput
                    min={0}
                    step="0.01"
                    value={rows[i]?.caHt ?? ""}
                    onChange={(e) => upd(i, "caHt", e.target.value)}
                    className="h-7 px-2 text-xs"
                    placeholder="0.00"
                    style={{ minWidth: 170 }}
                  />
                </td>
                <td className="px-1 py-1 border-b">
                  <AmountInput
                    min={0}
                    step="0.01"
                    value={rows[i]?.taxe ?? ""}
                    onChange={(e) => upd(i, "taxe", e.target.value)}
                    className="h-7 px-2 text-xs"
                    placeholder="0.00"
                    style={{ minWidth: 170 }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-end">
        <Button size="sm" onClick={onSave} disabled={isSubmitting}
          className="gap-1.5" style={{ backgroundColor: PRIMARY_COLOR, color: "white" }}>
          <Save size={13} /> {isSubmitting ? "Enregistrement" : "Enregistrer"}
        </Button>
      </div>
    </div>
  )
}

//
// TAB 18 - TACP 7%
//
interface Tab18Props { rows: Tacp7Row[]; setRows: React.Dispatch<React.SetStateAction<Tacp7Row[]>>; onSave: () => void; isSubmitting: boolean }
function TabTacp7({ rows, setRows, onSave, isSubmitting }: Tab18Props) {
  const upd = (i: number, f: "base" | "taxe", v: string) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [f]: v } : r)))

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">Designation</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">Montant des Recharges HT</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">Montant du TACP 7%</th>
            </tr>
          </thead>
          <tbody>
            {TACP7_DECLARATION_ROWS.map((label, i) => (
              <tr key={label} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                <td className="px-3 py-1 text-xs border-b font-medium text-gray-800" style={{ minWidth: 240 }}>{label}</td>
                <td className="px-1 py-1 border-b">
                  <AmountInput
                    min={0}
                    step="0.01"
                    value={rows[i]?.base ?? ""}
                    onChange={(e) => upd(i, "base", e.target.value)}
                    className="h-7 px-2 text-xs"
                    placeholder="0.00"
                    style={{ minWidth: 170 }}
                  />
                </td>
                <td className="px-1 py-1 border-b">
                  <AmountInput
                    min={0}
                    step="0.01"
                    value={rows[i]?.taxe ?? ""}
                    onChange={(e) => upd(i, "taxe", e.target.value)}
                    className="h-7 px-2 text-xs"
                    placeholder="0.00"
                    style={{ minWidth: 170 }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-end">
        <Button size="sm" onClick={onSave} disabled={isSubmitting}
          className="gap-1.5" style={{ backgroundColor: PRIMARY_COLOR, color: "white" }}>
          <Save size={13} /> {isSubmitting ? "Enregistrement" : "Enregistrer"}
        </Button>
      </div>
    </div>
  )
}
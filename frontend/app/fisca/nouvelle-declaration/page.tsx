"use client"

import { useState, useCallback, useMemo, useRef, useEffect } from "react"
import { LayoutWrapper } from "@/components/layout-wrapper"
import { useAuth } from "@/hooks/use-auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { Plus, Trash2, Save } from "lucide-react"
import { AccessDeniedDialog } from "@/components/access-denied-dialog"
import WILAYAS_COMMUNES, { type WilayaCommuneEntry } from "@/lib/wilayas-communes"

// primary colour used by all tables/buttons
const PRIMARY_COLOR = "#2db34b"

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const fmt = (v: number | string) =>
  isNaN(Number(v)) || v === "" ? "" : Number(v).toLocaleString("fr-DZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const num = (v: string) => parseFloat(v) || 0

// ─────────────────────────────────────────────────────────────────────────────
// TAB 1 – ENCAISSEMENT  (controlled)
// Encaissement HT = TTC / 1.19   |   TVA = TTC − HT
// ─────────────────────────────────────────────────────────────────────────────
type EncRow = { designation: string; ttc: string }

interface Tab1Props { rows: EncRow[]; setRows: React.Dispatch<React.SetStateAction<EncRow[]>>
  onSave: () => void;
  isSubmitting: boolean;
}

function TabEncaissement({ rows, setRows, onSave, isSubmitting }: Tab1Props) {
  const addRow    = () => setRows((p) => [...p, { designation: "", ttc: "" }])
  const removeRow = (i: number) => setRows((p) => p.filter((_, idx) => idx !== i))
  const update    = (i: number, field: keyof EncRow, val: string) =>
    setRows((p) => p.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)))

  const totals = useMemo(() => {
    const ttc = rows.reduce((s, r) => s + num(r.ttc), 0)
    const ht  = ttc / 1.19
    return { ttc, ht, tva: ttc - ht }
  }, [rows])

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-2 py-2 text-center text-xs font-semibold text-gray-400 border-b w-8">#</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">Désignation</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">Encaissement TTC</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">TVA</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">Encaissement HT</th>
              <th className="px-2 py-2 border-b w-8" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const ht = num(row.ttc) / 1.19
              const tva = num(row.ttc) - ht
              return (
                <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className="px-2 py-1 text-center text-xs text-gray-400 border-b">{i + 1}</td>
                  <td className="px-1 py-1 border-b">
                    <Input value={row.designation} onChange={(e) => update(i, "designation", e.target.value)}
                      className="h-7 px-2 text-xs" placeholder="Désignation" style={{ minWidth: 200 }} />
                  </td>
                  <td className="px-1 py-1 border-b">
                    <Input type="number" min={0} step="0.01" value={row.ttc}
                      onChange={(e) => update(i, "ttc", e.target.value)}
                      className="h-7 px-2 text-xs" placeholder="0.00" style={{ minWidth: 130 }} />
                  </td>
                  <td className="px-3 py-1 border-b text-xs text-gray-700 font-semibold bg-gray-50/50">
                    {row.ttc ? fmt(tva) : "—"}
                  </td>
                  <td className="px-3 py-1 border-b text-xs text-gray-700 font-semibold bg-gray-50/50">
                    {row.ttc ? fmt(ht) : "—"}
                  </td>
                  <td className="px-2 py-1 text-center border-b">
                    <button type="button" onClick={() => removeRow(i)} disabled={rows.length === 1}
                      className="text-red-400 hover:text-red-600 disabled:opacity-30"><Trash2 size={13} /></button>
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="bg-green-100 font-semibold">
              <td colSpan={2} className="px-3 py-2 text-xs text-right border-t">TOTAL</td>
              <td className="px-3 py-2 text-xs border-t">{fmt(totals.ttc)}</td>
              <td className="px-3 py-2 text-xs text-gray-700 border-t">{fmt(totals.tva)}</td>
              <td className="px-3 py-2 text-xs text-gray-700 border-t">{fmt(totals.ht)}</td>
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
          <Save size={13} /> {isSubmitting ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 2 & 3 – TVA/IMMO  and  TVA/BIENS & SERV (controlled, same structure)
// ─────────────────────────────────────────────────────────────────────────────
type FiscalFournisseurOption = {
  id: number
  raisonSociale: string
  adresse: string
  nif: string
  authNif: string
  rc: string
  authRc: string
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
  return rate ? `${rate}%` : "—"
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
}

function TabTVAEtat({ rows, setRows, onSave, isSubmitting, fournisseurs, withSelectableRate = false }: Tab23Props) {
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
    "Nom / Raison Sociale", "Adresse", "NIF", "Auth. NIF",
    "N° RC", "Auth. N° RC", "N° Facture", "Date",
    "Montant HT", ...(withSelectableRate ? ["Taux TVA"] : []), "TVA", "Montant TTC",
  ]

  return (
    <div className="space-y-3">
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
              const supplierPlaceholder = currentRow.nomRaisonSociale?.trim() || "Sélectionner…"
              return (
                <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className="px-2 py-1 text-center text-xs text-gray-400 border-b">{i + 1}</td>
                  <td className="px-1 py-1 border-b">
                    <select
                      value={currentRow.fournisseurId ?? ""}
                      onChange={(e) => selectFournisseur(i, e.target.value)}
                      className="h-7 rounded border border-gray-200 bg-white px-2 text-xs focus:outline-none focus:ring-2 focus:ring-green-300"
                      style={{ minWidth: 220 }}
                    >
                      <option value="">{supplierPlaceholder}</option>
                      {fournisseurs.map((f) => (
                        <option key={f.id} value={String(f.id)}>{f.raisonSociale || "—"}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-1 py-1 border-b"><Input value={currentRow.adresse ?? ""} readOnly className="h-7 px-2 text-xs bg-gray-50" style={{ minWidth: 150 }} placeholder="Auto" /></td>
                  <td className="px-1 py-1 border-b"><Input value={currentRow.nif ?? ""} readOnly className="h-7 px-2 text-xs bg-gray-50" style={{ minWidth: 110 }} placeholder="Auto" /></td>
                  <td className="px-1 py-1 border-b"><Input value={currentRow.authNif ?? ""} readOnly className="h-7 px-2 text-xs bg-gray-50" style={{ minWidth: 110 }} placeholder="Auto" /></td>
                  <td className="px-1 py-1 border-b"><Input value={currentRow.numRC ?? ""} readOnly className="h-7 px-2 text-xs bg-gray-50" style={{ minWidth: 110 }} placeholder="Auto" /></td>
                  <td className="px-1 py-1 border-b"><Input value={currentRow.authRC ?? ""} readOnly className="h-7 px-2 text-xs bg-gray-50" style={{ minWidth: 110 }} placeholder="Auto" /></td>
                  <td className="px-1 py-1 border-b"><Input value={currentRow.numFacture ?? ""} onChange={(e) => update(i, "numFacture", e.target.value)} className="h-7 px-2 text-xs" style={{ minWidth: 110 }} placeholder="N° Facture" /></td>
                  <td className="px-1 py-1 border-b"><Input type="date" value={currentRow.dateFacture ?? ""} onChange={(e) => update(i, "dateFacture", e.target.value)} className="h-7 px-2 text-xs" style={{ minWidth: 130 }} /></td>
                  <td className="px-1 py-1 border-b"><Input type="number" min={0} step="0.01" value={currentRow.montantHT ?? ""} onChange={(e) => update(i, "montantHT", e.target.value)} className="h-7 px-2 text-xs" style={{ minWidth: 110 }} placeholder="0.00" /></td>
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
                      {currentRow.montantHT && normalizeTvaRate(currentRow.tauxTVA) ? fmt(rowTva) : "—"}
                    </td>
                  ) : (
                    <td className="px-1 py-1 border-b"><Input type="number" min={0} step="0.01" value={currentRow.tva ?? ""} onChange={(e) => update(i, "tva", e.target.value)} className="h-7 px-2 text-xs" style={{ minWidth: 110 }} placeholder="0.00" /></td>
                  )}
                  <td className="px-1 py-1 border-b text-xs text-right pr-3 text-gray-600" style={{ minWidth: 110 }}>{ttc > 0 ? fmt(ttc) : "—"}</td>
                  <td className="px-2 py-1 text-center border-b">
                    <button type="button" onClick={() => removeRow(i)} disabled={rows.length === 1}
                      className="text-red-400 hover:text-red-600 disabled:opacity-30"><Trash2 size={13} /></button>
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="bg-green-100 font-semibold">
              <td colSpan={9} className="px-3 py-2 text-xs text-right border-t">TOTAL</td>
              <td className="px-3 py-2 text-xs border-t">{fmt(totalHT)}</td>
              {withSelectableRate && <td className="px-3 py-2 text-xs text-center border-t text-gray-500">—</td>}
              <td className="px-3 py-2 text-xs border-t">{fmt(totalTVA)}</td>
              <td className="px-3 py-2 text-xs border-t">{fmt(totalTTC)}</td>
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
          <Save size={13} /> {isSubmitting ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 4 – ETAT DROITS TIMBRE (controlled)
// ─────────────────────────────────────────────────────────────────────────────
type TimbreRow = { designation: string; caTTCEsp: string; droitTimbre: string }

interface Tab4Props { rows: TimbreRow[]; setRows: React.Dispatch<React.SetStateAction<TimbreRow[]>>;
  onSave: () => void;
  isSubmitting: boolean;
}

function TabDroitsTimbre({ rows, setRows, onSave, isSubmitting }: Tab4Props) {
  const addRow    = () => setRows((p) => [...p, { designation: "", caTTCEsp: "", droitTimbre: "" }])
  const removeRow = (i: number) => setRows((p) => p.filter((_, idx) => idx !== i))
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
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">Désignation</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">Chiffres d'affaires TTC Esp.</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">Droit de Timbre</th>
              <th className="px-2 py-2 border-b w-8" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                <td className="px-2 py-1 text-center text-xs text-gray-400 border-b">{i + 1}</td>
                <td className="px-1 py-1 border-b"><Input value={row.designation} onChange={(e) => update(i, "designation", e.target.value)} className="h-7 px-2 text-xs" style={{ minWidth: 220 }} placeholder="Désignation" /></td>
                <td className="px-1 py-1 border-b"><Input type="number" min={0} step="0.01" value={row.caTTCEsp} onChange={(e) => update(i, "caTTCEsp", e.target.value)} className="h-7 px-2 text-xs" style={{ minWidth: 150 }} placeholder="0.00" /></td>
                <td className="px-1 py-1 border-b"><Input type="number" min={0} step="0.01" value={row.droitTimbre} onChange={(e) => update(i, "droitTimbre", e.target.value)} className="h-7 px-2 text-xs" style={{ minWidth: 140 }} placeholder="0.00" /></td>
                <td className="px-2 py-1 text-center border-b">
                  <button type="button" onClick={() => removeRow(i)} disabled={rows.length === 1}
                    className="text-red-400 hover:text-red-600 disabled:opacity-30"><Trash2 size={13} /></button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-green-100 font-semibold">
              <td colSpan={2} className="px-3 py-2 text-xs text-right border-t">TOTAL</td>
              <td className="px-3 py-2 text-xs border-t">{fmt(totalCA)}</td>
              <td className="px-3 py-2 text-xs border-t">{fmt(totalDroit)}</td>
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
          <Save size={13} /> {isSubmitting ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 5 – CA 7% & CA GLOB 1% (controlled)
// B12 = CA HT soumis à 7% (saisie)  →  C12 = B12 × 7%
// B13 = CA HT global soumis à 1%    →  C13 = B13 × 1%
// ─────────────────────────────────────────────────────────────────────────────
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
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">Désignation</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">
                Chiffre d'affaires HT
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">
                Montant Taxe à verser
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="bg-white">
              <td className="px-3 py-2 border-b text-xs font-medium text-gray-800">Chiffre d'affaires soumis à 7%</td>
              <td className="px-1 py-1 border-b">
                <Input type="number" min={0} step="0.01" value={b12} onChange={(e) => setB12(e.target.value)}
                  className="h-7 px-2 text-xs" placeholder="Saisir le CA HT soumis à 7%" style={{ minWidth: 200 }} />
              </td>
              <td className="px-3 py-1 border-b text-xs text-gray-700 font-semibold bg-gray-50/50">
                {b12 ? fmt(c12) : "—"}
              </td>
            </tr>
            <tr className="bg-gray-50">
              <td className="px-3 py-2 border-b text-xs font-medium text-gray-800">Chiffre d'affaires global soumis à 1%</td>
              <td className="px-1 py-1 border-b">
                <Input type="number" min={0} step="0.01" value={b13} onChange={(e) => setB13(e.target.value)}
                  className="h-7 px-2 text-xs" placeholder="Saisir le CA HT global soumis à 1%" style={{ minWidth: 200 }} />
              </td>
              <td className="px-3 py-1 border-b text-xs text-gray-700 font-semibold bg-gray-50/50">
                {b13 ? fmt(c13) : "—"}
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr className="bg-green-100 font-semibold">
              <td className="px-3 py-2 text-xs text-right border-t">TOTAL</td>
              <td className="px-3 py-2 text-xs border-t">{fmt(num(b12) + num(b13))}</td>
              <td className="px-3 py-2 text-xs text-gray-700 border-t">{fmt(c12 + c13)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="flex justify-end">
        <Button size="sm" onClick={onSave} disabled={isSubmitting}
          className="gap-1.5" style={{ backgroundColor: PRIMARY_COLOR, color: "white" }}>
          <Save size={13} /> {isSubmitting ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 6 – ETAT TAP (controlled)
// Période : mois + année (page-level)
// Tableau : Code (auto), Wilaya (dropdown), Commune (dropdown), TAP 2% (saisie)
// MONTANT TAP = Total(TAP 2%)
// ─────────────────────────────────────────────────────────────────────────────
type TAPRow = { wilayaCode: string; commune: string; tap2: string }
type SiegeEncRow = { ttc: string; ht: string }

const WILAYA_COMMUNE_DATA: WilayaCommuneEntry[] = WILAYAS_COMMUNES

const SIEGE_G1_LABELS = ["Encaissement", "Encaissement Exon\u00e9r\u00e9e"]
const SIEGE_G2_LABELS = [
  "Encaissement MOBIPOST", "Encaissement POST PAID", "Encaissement RACIMO",
  "Encaissement DME", "Encaissement SOFIA", "Encaissement CCP RECOUVREMENT A",
  "Encaissement CCP RECOUVREMENT B", "Encaissement CCP TPE",
  "Encaissement BNA TPE", "Encaissement MASTER ALGERIE POSTE",
]

const MONTHS = [
  { value: "01", label: "Janvier" },   { value: "02", label: "Février" },
  { value: "03", label: "Mars" },      { value: "04", label: "Avril" },
  { value: "05", label: "Mai" },       { value: "06", label: "Juin" },
  { value: "07", label: "Juillet" },   { value: "08", label: "Août" },
  { value: "09", label: "Septembre" }, { value: "10", label: "Octobre" },
  { value: "11", label: "Novembre" },  { value: "12", label: "Décembre" },
]
const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: 10 }, (_, i) => (CURRENT_YEAR - 5 + i).toString())
interface Tab6Props {
  rows: TAPRow[]; setRows: React.Dispatch<React.SetStateAction<TAPRow[]>>
  mois: string; setMois: (v: string) => void
  annee: string; setAnnee: (v: string) => void
  onSave: () => void;
  isSubmitting: boolean;
}

function TabTAP({ rows, setRows, mois, setMois, annee, setAnnee, onSave, isSubmitting }: Tab6Props) {
  const addRow    = () => setRows((p) => [...p, { wilayaCode: "", commune: "", tap2: "" }])
  const removeRow = (i: number) => setRows((p) => p.filter((_, idx) => idx !== i))
  const updateRow = useCallback((i: number, field: keyof TAPRow, val: string) =>
    setRows((p) => p.map((r, idx) => (idx === i ? { ...r, [field]: val } : r))), [setRows])

  const totalTAP = rows.reduce((s, r) => s + num(r.tap2), 0)
  const getWilaya = (code: string) => WILAYA_COMMUNE_DATA.find((w) => w.code === code)

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
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">TAP 2%</th>
              <th className="px-2 py-2 border-b w-8" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const wilaya = getWilaya(row.wilayaCode)
              return (
                <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className="px-2 py-1 text-center text-xs text-gray-400 border-b">{i + 1}</td>

                  {/* Code – automatique depuis wilaya */}
                  <td className="px-3 py-1 border-b">
                    <span className="font-mono text-xs font-bold text-red-700 bg-red-50 border border-red-100 px-2 py-0.5 rounded">
                      {row.wilayaCode || "—"}
                    </span>
                  </td>

                  {/* Wilaya dropdown */}
                  <td className="px-1 py-1 border-b">
                    <select value={row.wilayaCode}
                      onChange={(e) => { updateRow(i, "wilayaCode", e.target.value); updateRow(i, "commune", "") }}
                      className="h-7 rounded border border-gray-200 px-2 text-xs focus:outline-none focus:ring-1 focus:ring-green-300"
                      style={{ minWidth: 190 }}>
                      <option value="">— Wilaya —</option>
                      {WILAYA_COMMUNE_DATA.map((w) => (
                        <option key={w.code} value={w.code}>{w.code} – {w.wilaya}</option>
                      ))}
                    </select>
                  </td>

                  {/* Commune dropdown – dépend de la wilaya sélectionnée */}
                  <td className="px-1 py-1 border-b">
                    <select value={row.commune} onChange={(e) => updateRow(i, "commune", e.target.value)}
                      disabled={!row.wilayaCode}
                      className="h-7 rounded border border-gray-200 px-2 text-xs focus:outline-none focus:ring-1 focus:ring-green-300 disabled:opacity-40"
                      style={{ minWidth: 165 }}>
                      <option value="">— Commune —</option>
                      {(wilaya?.communes ?? []).map((c) => {
                        const communeCode = String(c)
                        return <option key={communeCode} value={communeCode}>{communeCode}</option>
                      })}
                    </select>
                  </td>

                  {/* TAP 2% */}
                  <td className="px-1 py-1 border-b">
                    <Input type="number" min={0} step="0.01" value={row.tap2}
                      onChange={(e) => updateRow(i, "tap2", e.target.value)}
                      className="h-7 px-2 text-xs" placeholder="0.00" style={{ minWidth: 130 }} />
                  </td>

                  <td className="px-2 py-1 text-center border-b">
                    <button type="button" onClick={() => removeRow(i)} disabled={rows.length === 1}
                      className="text-red-400 hover:text-red-600 disabled:opacity-30"><Trash2 size={13} /></button>
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="bg-green-100 font-semibold">
              <td colSpan={4} className="px-3 py-2 text-xs text-right border-t">MONTANT TAP</td>
              <td className="px-3 py-2 text-sm font-bold text-green-700 border-t">{fmt(totalTAP)} DZD</td>
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
          <Save size={13} /> {isSubmitting ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 7 – CHIFFRE D'AFFAIRE ENCAISSÉ SIÈGE
// ─────────────────────────────────────────────────────────────────────────────
interface Tab7Props { rows: SiegeEncRow[]; setRows: React.Dispatch<React.SetStateAction<SiegeEncRow[]>>; onSave: () => void; isSubmitting: boolean }
function TabCaSiege({ rows, setRows, onSave, isSubmitting }: Tab7Props) {
  const upd = (i: number, f: keyof SiegeEncRow, v: string) =>
    setRows((prev) => prev.map((r, idx) => idx === i ? { ...r, [f]: v } : r))
  const g1 = rows.slice(0, 2)
  const g2 = rows.slice(2, 12)
  const t1ttc = g1.reduce((s, r) => s + num(r.ttc), 0)
  const t1ht  = g1.reduce((s, r) => s + num(r.ht), 0)
  const t2ttc = g2.reduce((s, r) => s + num(r.ttc), 0)
  const t2ht  = g2.reduce((s, r) => s + num(r.ht), 0)
  const totalRow: React.CSSProperties = { background: "#f3f4f6", fontWeight: 700 }
  const grandRow: React.CSSProperties = { background: "#dcfce7", fontWeight: 700 }
  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
        <table className="min-w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 border-b" style={{ width: "55%" }}>Désignation</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700 border-b" style={{ width: "22.5%" }}>TTC</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700 border-b" style={{ width: "22.5%" }}>HT</th>
            </tr>
          </thead>
          <tbody>
            {SIEGE_G1_LABELS.map((lbl, i) => (
              <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                <td className="px-4 py-1 text-xs border-b">{lbl}</td>
                <td className="px-1 py-1 border-b"><Input type="number" min={0} step="0.01" className="h-7 px-2 text-xs text-right" value={rows[i].ttc} onChange={(e) => upd(i, "ttc", e.target.value)} placeholder="0.00" style={{ minWidth: 130 }} /></td>
                <td className="px-1 py-1 border-b"><Input type="number" min={0} step="0.01" className="h-7 px-2 text-xs text-right" value={rows[i].ht} onChange={(e) => upd(i, "ht", e.target.value)} placeholder="0.00" style={{ minWidth: 130 }} /></td>
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
                <td className="px-1 py-1 border-b"><Input type="number" min={0} step="0.01" className="h-7 px-2 text-xs text-right" value={rows[i + 2].ttc} onChange={(e) => upd(i + 2, "ttc", e.target.value)} placeholder="0.00" style={{ minWidth: 130 }} /></td>
                <td className="px-1 py-1 border-b"><Input type="number" min={0} step="0.01" className="h-7 px-2 text-xs text-right" value={rows[i + 2].ht} onChange={(e) => upd(i + 2, "ht", e.target.value)} placeholder="0.00" style={{ minWidth: 130 }} /></td>
              </tr>
            ))}
            <tr style={totalRow}>
              <td className="px-4 py-2 text-xs border-b font-bold">TOTAL 2</td>
              <td className="px-3 py-2 text-xs border-b text-right font-bold">{fmt(t2ttc)}</td>
              <td className="px-3 py-2 text-xs border-b text-right font-bold">{fmt(t2ht)}</td>
            </tr>
            <tr style={grandRow}>
              <td className="px-4 py-2 text-xs font-bold text-green-800">TOTAL GÉNÉRAL</td>
              <td className="px-3 py-2 text-xs text-right font-bold text-green-800">{fmt(t1ttc + t2ttc)}</td>
              <td className="px-3 py-2 text-xs text-right font-bold text-green-800">{fmt(t1ht + t2ht)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="flex justify-end">
        <Button size="sm" onClick={onSave} disabled={isSubmitting}
          className="gap-1.5" style={{ backgroundColor: PRIMARY_COLOR, color: "white" }}>
          <Save size={13} /> {isSubmitting ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 8 – SITUATION IRG
// ─────────────────────────────────────────────────────────────────────────────
type IrgRow = { assietteImposable: string; montant: string }
const IRG_LABELS = [
  "IRG sur Salaire Barème", "Autre IRG 10%", "Autre IRG 15%",
  "Jetons de présence 15%", "Tantième 15%",
]
interface Tab8Props { rows: IrgRow[]; setRows: React.Dispatch<React.SetStateAction<IrgRow[]>>; onSave: () => void; isSubmitting: boolean }
function TabIRG({ rows, setRows, onSave, isSubmitting }: Tab8Props) {
  const upd = (i: number, f: keyof IrgRow, v: string) =>
    setRows((prev) => prev.map((r, idx) => idx === i ? { ...r, [f]: v } : r))
  const total = rows.reduce((s, r) => s + num(r.montant), 0)
  const totalAssiet = rows.reduce((s, r) => s + num(r.assietteImposable), 0)
  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">Désignation</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">Assiette Imposable</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">Montant</th>
            </tr>
          </thead>
          <tbody>
            {IRG_LABELS.map((lbl, i) => (
              <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                <td className="px-3 py-1 text-xs border-b font-medium text-gray-800" style={{ minWidth: 220 }}>{lbl}</td>
                <td className="px-1 py-1 border-b"><Input type="number" min={0} step="0.01" className="h-7 px-2 text-xs" value={rows[i].assietteImposable} onChange={(e) => upd(i, "assietteImposable", e.target.value)} placeholder="0.00" style={{ minWidth: 150 }} /></td>
                <td className="px-1 py-1 border-b"><Input type="number" min={0} step="0.01" className="h-7 px-2 text-xs" value={rows[i].montant} onChange={(e) => upd(i, "montant", e.target.value)} placeholder="0.00" style={{ minWidth: 150 }} /></td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-green-100 font-semibold">
              <td className="px-3 py-2 text-xs text-right border-t">TOTAL</td>
              <td className="px-3 py-2 text-xs border-t">{fmt(totalAssiet)}</td>
              <td className="px-3 py-2 text-xs border-t">{fmt(total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="flex justify-end">
        <Button size="sm" onClick={onSave} disabled={isSubmitting}
          className="gap-1.5" style={{ backgroundColor: PRIMARY_COLOR, color: "white" }}>
          <Save size={13} /> {isSubmitting ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 9 – SITUATION TAXE 2%
// ─────────────────────────────────────────────────────────────────────────────
type Taxe2Row = { base: string; montant: string }
const TAXE2_LABELS = ["Taxe sur l'importation des biens et services"]
interface Tab9Props { rows: Taxe2Row[]; setRows: React.Dispatch<React.SetStateAction<Taxe2Row[]>>; onSave: () => void; isSubmitting: boolean }
function TabTaxe2({ rows, setRows, onSave, isSubmitting }: Tab9Props) {
  const upd = (i: number, f: keyof Taxe2Row, v: string) =>
    setRows((prev) => prev.map((r, idx) => idx === i ? { ...r, [f]: v } : r))
  const totalBase = rows.reduce((s, r) => s + num(r.base), 0)
  const totalMont = rows.reduce((s, r) => s + num(r.montant), 0)
  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">Désignation</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">Montant de la base</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">Montant de la Taxe 2%</th>
            </tr>
          </thead>
          <tbody>
            {TAXE2_LABELS.map((lbl, i) => (
              <tr key={i} className="bg-white">
                <td className="px-3 py-1 text-xs border-b font-medium text-gray-800" style={{ minWidth: 320 }}>{lbl}</td>
                <td className="px-1 py-1 border-b"><Input type="number" min={0} step="0.01" className="h-7 px-2 text-xs" value={rows[i].base} onChange={(e) => upd(i, "base", e.target.value)} placeholder="0.00" style={{ minWidth: 150 }} /></td>
                <td className="px-1 py-1 border-b"><Input type="number" min={0} step="0.01" className="h-7 px-2 text-xs" value={rows[i].montant} onChange={(e) => upd(i, "montant", e.target.value)} placeholder="0.00" style={{ minWidth: 150 }} /></td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-green-100 font-semibold">
              <td className="px-3 py-2 text-xs text-right border-t">TOTAL</td>
              <td className="px-3 py-2 text-xs border-t">{fmt(totalBase)}</td>
              <td className="px-3 py-2 text-xs border-t">{fmt(totalMont)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="flex justify-end">
        <Button size="sm" onClick={onSave} disabled={isSubmitting}
          className="gap-1.5" style={{ backgroundColor: PRIMARY_COLOR, color: "white" }}>
          <Save size={13} /> {isSubmitting ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>
    </div>
  )
}
// ─────────────────────────────────────────────────────────────────────────────
// TAB 10 – ÉTAT DE LA TAXE 1,5% DES MASTERS
// ─────────────────────────────────────────────────────────────────────────────
type MasterRow = { date: string; nomMaster: string; numFacture: string; dateFacture: string; montantHT: string; taxe15: string; mois: string; observation: string }
const EMPTY_MASTER: MasterRow = { date: "", nomMaster: "", numFacture: "", dateFacture: "", montantHT: "", taxe15: "", mois: "", observation: "" }
interface Tab10Props { rows: MasterRow[]; setRows: React.Dispatch<React.SetStateAction<MasterRow[]>>; onSave: () => void; isSubmitting: boolean }
function TabMasters({ rows, setRows, onSave, isSubmitting }: Tab10Props) {
  const addRow    = () => setRows((p) => [...p, { ...EMPTY_MASTER }])
  const removeRow = (i: number) => setRows((p) => p.filter((_, idx) => idx !== i))
  const upd = (i: number, f: keyof MasterRow, v: string) =>
    setRows((prev) => prev.map((r, idx) => idx === i ? { ...r, [f]: v } : r))
  const totalHT   = rows.reduce((s, r) => s + num(r.montantHT), 0)
  const totalTaxe = rows.reduce((s, r) => s + num(r.taxe15), 0)
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
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">N° de Facture</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">Date de la Facture</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">Montant Facture HT</th>
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
                <td className="px-1 py-1 border-b"><Input type="date" value={row.date} onChange={(e) => upd(i, "date", e.target.value)} className="h-7 px-2 text-xs" style={iw} /></td>
                <td className="px-1 py-1 border-b"><Input value={row.nomMaster} onChange={(e) => upd(i, "nomMaster", e.target.value)} className="h-7 px-2 text-xs" placeholder="Nom du Master" style={{ minWidth: 160 }} /></td>
                <td className="px-1 py-1 border-b"><Input value={row.numFacture} onChange={(e) => upd(i, "numFacture", e.target.value)} className="h-7 px-2 text-xs" placeholder="N° Facture" style={iw} /></td>
                <td className="px-1 py-1 border-b"><Input type="date" value={row.dateFacture} onChange={(e) => upd(i, "dateFacture", e.target.value)} className="h-7 px-2 text-xs" style={iw} /></td>
                <td className="px-1 py-1 border-b"><Input type="number" min={0} step="0.01" value={row.montantHT} onChange={(e) => upd(i, "montantHT", e.target.value)} className="h-7 px-2 text-xs" placeholder="0.00" style={iw} /></td>
                <td className="px-3 py-1 border-b text-xs text-gray-700 font-semibold bg-gray-50/50">{row.montantHT ? fmt(num(row.montantHT) * 0.015) : "—"}</td>
                <td className="px-1 py-1 border-b">
                  <select value={row.mois} onChange={(e) => upd(i, "mois", e.target.value)}
                    className="h-7 rounded border border-gray-200 px-2 text-xs focus:outline-none" style={{ minWidth: 110 }}>
                    <option value="">— Mois —</option>
                    {["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"]
                      .map((m, idx) => <option key={idx} value={m}>{m}</option>)}
                  </select>
                </td>
                <td className="px-1 py-1 border-b"><Input value={row.observation} onChange={(e) => upd(i, "observation", e.target.value)} className="h-7 px-2 text-xs" placeholder="Observation" style={{ minWidth: 140 }} /></td>
                <td className="px-2 py-1 text-center border-b">
                  <button type="button" onClick={() => removeRow(i)} disabled={rows.length === 1}
                    className="text-red-400 hover:text-red-600 disabled:opacity-30"><Trash2 size={13} /></button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-green-100 font-semibold">
              <td colSpan={5} className="px-3 py-2 text-xs text-right border-t">TOTAL</td>
              <td className="px-3 py-2 text-xs border-t">{fmt(totalHT)}</td>
              <td className="px-3 py-2 text-xs border-t">{fmt(totalTaxe)}</td>
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
          <Save size={13} /> {isSubmitting ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 11 – TAXE DE VÉHICULE
// ─────────────────────────────────────────────────────────────────────────────
interface Tab11Props { montant: string; setMontant: (v: string) => void; onSave: () => void; isSubmitting: boolean }
function TabTaxeVehicule({ montant, setMontant, onSave, isSubmitting }: Tab11Props) {
  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">Désignation</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">Montant</th>
            </tr>
          </thead>
          <tbody>
            <tr className="bg-white">
              <td className="px-3 py-1 text-xs border-b font-medium text-gray-800" style={{ minWidth: 280 }}>Taxe de véhicule</td>
              <td className="px-1 py-1 border-b"><Input type="number" min={0} step="0.01" value={montant} onChange={(e) => setMontant(e.target.value)} className="h-7 px-2 text-xs" placeholder="0.00" style={{ minWidth: 180 }} /></td>
            </tr>
          </tbody>
          <tfoot>
            <tr className="bg-green-100 font-semibold">
              <td className="px-3 py-2 text-xs text-right border-t">TOTAL</td>
              <td className="px-3 py-2 text-xs border-t">{fmt(num(montant))}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="flex justify-end">
        <Button size="sm" onClick={onSave} disabled={isSubmitting}
          className="gap-1.5" style={{ backgroundColor: PRIMARY_COLOR, color: "white" }}>
          <Save size={13} /> {isSubmitting ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 12 – TAXE DE FORMATION
// ─────────────────────────────────────────────────────────────────────────────
type Taxe12Row = { montant: string }
const TAXE12_LABELS = ["Taxe de Formation Professionnelle 1%", "Taxe d'Apprentissage 1%"]
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
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">Désignation</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">Montant</th>
            </tr>
          </thead>
          <tbody>
            {TAXE12_LABELS.map((lbl, i) => (
              <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                <td className="px-3 py-1 text-xs border-b font-medium text-gray-800" style={{ minWidth: 280 }}>{lbl}</td>
                <td className="px-1 py-1 border-b"><Input type="number" min={0} step="0.01" value={rows[i].montant} onChange={(e) => upd(i, e.target.value)} className="h-7 px-2 text-xs" placeholder="0.00" style={{ minWidth: 180 }} /></td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-green-100 font-semibold">
              <td className="px-3 py-2 text-xs text-right border-t">TOTAL</td>
              <td className="px-3 py-2 text-xs border-t">{fmt(total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="flex justify-end">
        <Button size="sm" onClick={onSave} disabled={isSubmitting}
          className="gap-1.5" style={{ backgroundColor: PRIMARY_COLOR, color: "white" }}>
          <Save size={13} /> {isSubmitting ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 13 – SITUATION DE L'ACOMPTE PROVISIONNEL (year only, 12 months)
// ─────────────────────────────────────────────────────────────────────────────
const MONTH_LABELS_SHORT = ["Janv","Fév","Mars","Avr","Mai","Juin","Juil","Août","Sept","Oct","Nov","Déc"]
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
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b" style={{ minWidth: 100 }}>Désignation</th>
              {MONTH_LABELS_SHORT.map((m) => (
                <th key={m} className="px-2 py-2 text-center text-xs font-semibold text-gray-700 border-b" style={{ minWidth: 90 }}>{m} {yy}</th>
              ))}
              <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700 border-b" style={{ minWidth: 110 }}>TOTAL</th>
            </tr>
          </thead>
          <tbody>
            <tr className="bg-white">
              <td className="px-3 py-1 text-xs border-b font-medium text-gray-800">Montant</td>
              {months.map((v, i) => (
                <td key={i} className="px-1 py-1 border-b">
                  <Input type="number" min={0} step="0.01" value={v} onChange={(e) => upd(i, e.target.value)} className="h-7 px-2 text-xs" placeholder="0.00" style={{ minWidth: 80 }} />
                </td>
              ))}
              <td className="px-3 py-1 text-xs border-b font-semibold text-green-700 bg-green-50">{fmt(total)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="flex justify-end">
        <Button size="sm" onClick={onSave} disabled={isSubmitting}
          className="gap-1.5" style={{ backgroundColor: PRIMARY_COLOR, color: "white" }}>
          <Save size={13} /> {isSubmitting ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 14 – IBS SUR FOURNISSEURS ÉTRANGERS
// ─────────────────────────────────────────────────────────────────────────────
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
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">N° de Facture</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">Montant Brut en Devise</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">Taux de Change Date du Contrat</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">Montant Brut en Dinars</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">Montant Net Transférable en Devise</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">Montant de l'IBS (Taux...%)</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">Montant Net Transférable en Dinars</th>
              <th className="px-2 py-2 border-b w-8" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                <td className="px-2 py-1 text-center text-xs text-gray-400 border-b">{i + 1}</td>
                <td className="px-1 py-1 border-b"><Input value={row.numFacture} onChange={(e) => upd(i,"numFacture",e.target.value)} className="h-7 px-2 text-xs" placeholder="N° Facture" style={iw} /></td>
                <td className="px-1 py-1 border-b"><Input type="number" min={0} step="0.01" value={row.montantBrutDevise} onChange={(e) => upd(i,"montantBrutDevise",e.target.value)} className="h-7 px-2 text-xs" placeholder="0.00" style={iw} /></td>
                <td className="px-1 py-1 border-b"><Input type="number" min={0} step="0.01" value={row.tauxChange} onChange={(e) => upd(i,"tauxChange",e.target.value)} className="h-7 px-2 text-xs" placeholder="0.00" style={iw} /></td>
                <td className="px-1 py-1 border-b"><Input type="number" min={0} step="0.01" value={row.montantBrutDinars} onChange={(e) => upd(i,"montantBrutDinars",e.target.value)} className="h-7 px-2 text-xs" placeholder="0.00" style={iw} /></td>
                <td className="px-1 py-1 border-b"><Input type="number" min={0} step="0.01" value={row.montantNetDevise} onChange={(e) => upd(i,"montantNetDevise",e.target.value)} className="h-7 px-2 text-xs" placeholder="0.00" style={iw} /></td>
                <td className="px-1 py-1 border-b"><Input type="number" min={0} step="0.01" value={row.montantIBS} onChange={(e) => upd(i,"montantIBS",e.target.value)} className="h-7 px-2 text-xs" placeholder="0.00" style={iw} /></td>
                <td className="px-1 py-1 border-b"><Input type="number" min={0} step="0.01" value={row.montantNetDinars} onChange={(e) => upd(i,"montantNetDinars",e.target.value)} className="h-7 px-2 text-xs" placeholder="0.00" style={iw} /></td>
                <td className="px-2 py-1 text-center border-b">
                  <button type="button" onClick={() => removeRow(i)} disabled={rows.length === 1}
                    className="text-red-400 hover:text-red-600 disabled:opacity-30"><Trash2 size={13} /></button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-green-100 font-semibold">
              <td colSpan={2} className="px-3 py-2 text-xs text-right border-t">TOTAL</td>
              <td className="px-3 py-2 text-xs border-t">{fmt(s("montantBrutDevise"))}</td>
              <td className="px-3 py-2 text-xs border-t">{fmt(s("tauxChange"))}</td>
              <td className="px-3 py-2 text-xs border-t">{fmt(s("montantBrutDinars"))}</td>
              <td className="px-3 py-2 text-xs border-t">{fmt(s("montantNetDevise"))}</td>
              <td className="px-3 py-2 text-xs border-t">{fmt(s("montantIBS"))}</td>
              <td className="px-3 py-2 text-xs border-t">{fmt(s("montantNetDinars"))}</td>
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
          <Save size={13} /> {isSubmitting ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 15 – TAXE DOMICILIATION BANCAIRE SUR FOURNISSEURS ÉTRANGERS
// ─────────────────────────────────────────────────────────────────────────────
type Taxe15Row = { numFacture: string; dateFacture: string; raisonSociale: string; montantNetDevise: string; monnaie: string; tauxChange: string; montantDinars: string; tauxTaxe: string; montantAPayer: string }
const EMPTY_TAXE15: Taxe15Row = { numFacture: "", dateFacture: "", raisonSociale: "", montantNetDevise: "", monnaie: "", tauxChange: "", montantDinars: "", tauxTaxe: "", montantAPayer: "" }
interface Tab15Props { rows: Taxe15Row[]; setRows: React.Dispatch<React.SetStateAction<Taxe15Row[]>>; onSave: () => void; isSubmitting: boolean }
function TabTaxeDomicil({ rows, setRows, onSave, isSubmitting }: Tab15Props) {
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
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">N° de Facture</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">Date de la Facture</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">Raison Sociale</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">Montant Net en Devise</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">Monnaie / Devises</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">Taux de Change Date de la Facture</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">Montant Facture en Dinars</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">Taux Taxe...%</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">Montant à Payer en Dinars</th>
              <th className="px-2 py-2 border-b w-8" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                <td className="px-2 py-1 text-center text-xs text-gray-400 border-b">{i + 1}</td>
                <td className="px-1 py-1 border-b"><Input value={row.numFacture} onChange={(e) => upd(i,"numFacture",e.target.value)} className="h-7 px-2 text-xs" placeholder="N° Facture" style={iw} /></td>
                <td className="px-1 py-1 border-b"><Input type="date" value={row.dateFacture} onChange={(e) => upd(i,"dateFacture",e.target.value)} className="h-7 px-2 text-xs" style={iw} /></td>
                <td className="px-1 py-1 border-b"><Input value={row.raisonSociale} onChange={(e) => upd(i,"raisonSociale",e.target.value)} className="h-7 px-2 text-xs" placeholder="Raison Sociale" style={{ minWidth: 150 }} /></td>
                <td className="px-1 py-1 border-b"><Input type="number" min={0} step="0.01" value={row.montantNetDevise} onChange={(e) => upd(i,"montantNetDevise",e.target.value)} className="h-7 px-2 text-xs" placeholder="0.00" style={iw} /></td>
                <td className="px-1 py-1 border-b"><Input value={row.monnaie} onChange={(e) => upd(i,"monnaie",e.target.value)} className="h-7 px-2 text-xs" placeholder="EUR / USD…" style={{ minWidth: 80 }} /></td>
                <td className="px-1 py-1 border-b"><Input type="number" min={0} step="0.01" value={row.tauxChange} onChange={(e) => upd(i,"tauxChange",e.target.value)} className="h-7 px-2 text-xs" placeholder="0.00" style={iw} /></td>
                <td className="px-1 py-1 border-b"><Input type="number" min={0} step="0.01" value={row.montantDinars} onChange={(e) => upd(i,"montantDinars",e.target.value)} className="h-7 px-2 text-xs" placeholder="0.00" style={iw} /></td>
                <td className="px-1 py-1 border-b"><Input value={row.tauxTaxe} onChange={(e) => upd(i,"tauxTaxe",e.target.value)} className="h-7 px-2 text-xs" placeholder="Taux %" style={{ minWidth: 80 }} /></td>
                <td className="px-1 py-1 border-b"><Input type="number" min={0} step="0.01" value={row.montantAPayer} onChange={(e) => upd(i,"montantAPayer",e.target.value)} className="h-7 px-2 text-xs" placeholder="0.00" style={iw} /></td>
                <td className="px-2 py-1 text-center border-b">
                  <button type="button" onClick={() => removeRow(i)} disabled={rows.length === 1}
                    className="text-red-400 hover:text-red-600 disabled:opacity-30"><Trash2 size={13} /></button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-green-100 font-semibold">
              <td colSpan={4} className="px-3 py-2 text-xs text-right border-t">TOTAL</td>
              <td className="px-3 py-2 text-xs border-t">{fmt(rows.reduce((s,r)=>s+num(r.montantNetDevise),0))}</td>
              <td className="border-t" />
              <td className="px-3 py-2 text-xs border-t">{fmt(rows.reduce((s,r)=>s+num(r.tauxChange),0))}</td>
              <td className="px-3 py-2 text-xs border-t">{fmt(rows.reduce((s,r)=>s+num(r.montantDinars),0))}</td>
              <td className="border-t" />
              <td className="px-3 py-2 text-xs border-t">{fmt(rows.reduce((s,r)=>s+num(r.montantAPayer),0))}</td>
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
          <Save size={13} /> {isSubmitting ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 16 – TVA AUTO LIQUIDATION SUR FOURNISSEURS ÉTRANGERS
// ─────────────────────────────────────────────────────────────────────────────
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
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">N° de Facture</th>
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
                <td className="px-1 py-1 border-b"><Input type="number" min={0} step="0.01" value={row.montantBrutDevise} onChange={(e) => upd(i,"montantBrutDevise",e.target.value)} className="h-7 px-2 text-xs" placeholder="0.00" style={iw} /></td>
                <td className="px-1 py-1 border-b"><Input type="number" min={0} step="0.01" value={row.tauxChange} onChange={(e) => upd(i,"tauxChange",e.target.value)} className="h-7 px-2 text-xs" placeholder="0.00" style={iw} /></td>
                <td className="px-1 py-1 border-b"><Input type="number" min={0} step="0.01" value={row.montantBrutDinars} onChange={(e) => upd(i,"montantBrutDinars",e.target.value)} className="h-7 px-2 text-xs" placeholder="0.00" style={iw} /></td>
                <td className="px-1 py-1 border-b"><Input type="number" min={0} step="0.01" value={row.tva19} onChange={(e) => upd(i,"tva19",e.target.value)} className="h-7 px-2 text-xs" placeholder="0.00" style={iw} /></td>
                <td className="px-2 py-1 text-center border-b">
                  <button type="button" onClick={() => removeRow(i)} disabled={rows.length === 1}
                    className="text-red-400 hover:text-red-600 disabled:opacity-30"><Trash2 size={13} /></button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-green-100 font-semibold">
              <td colSpan={2} className="px-3 py-2 text-xs text-right border-t">TOTAL</td>
              <td className="px-3 py-2 text-xs border-t">{fmt(rows.reduce((s,r)=>s+num(r.montantBrutDevise),0))}</td>
              <td className="px-3 py-2 text-xs border-t">{fmt(rows.reduce((s,r)=>s+num(r.tauxChange),0))}</td>
              <td className="px-3 py-2 text-xs border-t">{fmt(rows.reduce((s,r)=>s+num(r.montantBrutDinars),0))}</td>
              <td className="px-3 py-2 text-xs border-t">{fmt(rows.reduce((s,r)=>s+num(r.tva19),0))}</td>
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
          <Save size={13} /> {isSubmitting ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB CONFIG
// ─────────────────────────────────────────────────────────────────────────────
const TABS = [
  { key: "encaissement",   label: "1 – Encaissement",              color: "#2db34b", title: "ENCAISSEMENT" },
  { key: "tva_immo",       label: "2 – TVA / IMMO",                color: "#2db34b", title: "ÉTAT TVA / IMMOBILISATIONS" },
  { key: "tva_biens",      label: "3 – TVA / Biens & Serv",        color: "#2db34b", title: "ÉTAT TVA / BIENS & SERVICES" },
  { key: "droits_timbre",  label: "4 – Droits Timbre",             color: "#2db34b", title: "ÉTAT DROITS DE TIMBRE" },
  { key: "ca_tap",         label: "5 – CA 7% & CA Glob 1%",        color: "#2db34b", title: "CA 7% & CA GLOBAL 1%" },
  { key: "etat_tap",       label: "6 – ETAT TAP",                  color: "#2db34b", title: "ÉTAT TAP" },
  { key: "ca_siege",       label: "7 – CA Siège",                  color: "#2db34b", title: "CHIFFRE D'AFFAIRE ENCAISSÉ SIÈGE" },
  { key: "irg",            label: "8 – Situation IRG",             color: "#2db34b", title: "SITUATION IRG" },
  { key: "taxe2",          label: "9 – Taxe 2%",                   color: "#2db34b", title: "SITUATION DE LA TAXE 2%" },
  { key: "taxe_masters",   label: "10 – Taxe Maîtres 1,5%",       color: "#2db34b", title: "ÉTAT DE LA TAXE 1,5% DES MASTERS" },
  { key: "taxe_vehicule",  label: "11 – Taxe Véhicule",            color: "#2db34b", title: "TAXE DE VÉHICULE" },
  { key: "taxe_formation", label: "12 – Taxe Formation",           color: "#2db34b", title: "TAXE DE FORMATION" },
  { key: "acompte",        label: "13 – Acompte Provisionnel",     color: "#2db34b", title: "SITUATION DE L'ACOMPTE PROVISIONNEL DE L'ANNÉE EN COURS" },
  { key: "ibs",            label: "14 – IBS Fournisseurs Étrangers", color: "#2db34b", title: "IBS SUR FOURNISSEURS ÉTRANGERS" },
  { key: "taxe_domicil",  label: "15 – Taxe Domiciliation",        color: "#2db34b", title: "TAXE DOMICILIATION BANCAIRE SUR FOURNISSEURS ÉTRANGERS" },
  { key: "tva_autoliq",   label: "16 – TVA Auto Liquidation",      color: "#2db34b", title: "TVA AUTO LIQUIDATION SUR FOURNISSEURS ÉTRANGERS" },
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
  ibs14Rows?: Ibs14Row[]
  taxe15Rows?: Taxe15Row[]
  tva16Rows?: Tva16Row[]
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
  const normalized = (rows ?? []).map((row) => ({
    designation: safeString((row as Partial<EncRow>).designation),
    ttc: safeString((row as Partial<EncRow>).ttc),
  }))
  return normalized.length > 0 ? normalized : [{ designation: "", ttc: "" }]
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
  const normalized = (rows ?? []).map((row) => ({
    designation: safeString((row as Partial<TimbreRow>).designation),
    caTTCEsp: safeString((row as Partial<TimbreRow>).caTTCEsp),
    droitTimbre: safeString((row as Partial<TimbreRow>).droitTimbre),
  }))
  return normalized.length > 0 ? normalized : [{ designation: "", caTTCEsp: "", droitTimbre: "" }]
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
  const normalized = (rows ?? []).map((row) => ({
    assietteImposable: safeString((row as Partial<IrgRow>).assietteImposable),
    montant: safeString((row as Partial<IrgRow>).montant),
  }))
  return fillRows(normalized, 5, () => ({ assietteImposable: "", montant: "" }))
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
    return {
      ...EMPTY_MASTER,
      date: safeString(source.date),
      nomMaster: safeString(source.nomMaster),
      numFacture: safeString(source.numFacture),
      dateFacture: safeString(source.dateFacture),
      montantHT: safeString(source.montantHT),
      taxe15: safeString(source.taxe15),
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

const normalizeAcompteMonths = (months?: string[]) => {
  return Array.from({ length: 12 }, (_, idx) => safeString(months?.[idx]))
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
  if ((decl.ibs14Rows?.length ?? 0) > 0) return "ibs"
  if ((decl.taxe15Rows?.length ?? 0) > 0) return "taxe_domicil"
  if ((decl.tva16Rows?.length ?? 0) > 0) return "tva_autoliq"
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
  fournisseur: safeString(row.nomRaisonSociale).trim() || safeString(row.fournisseurId).trim() || "—",
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

// ─────────────────────────────────────────────────────────────────────────────
// PRINT ZONE – hidden on screen, visible only when printing
// Renders a static read-only A4 landscape version of the active tab's data
// ─────────────────────────────────────────────────────────────────────────────
interface PrintZoneProps {
  activeTab: string
  direction: string
  mois: string
  annee: string
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
  ibs14Rows: Ibs14Row[]
  taxe15Rows: Taxe15Row[]
  tva16Rows: Tva16Row[]
}

function PrintZone({ activeTab, direction, mois, annee, encRows, tvaImmoRows, tvaBiensRows, timbreRows, b12, b13, tapRows, caSiegeRows, irgRows, taxe2Rows, masterRows, taxe11Montant, taxe12Rows, acompteMonths, ibs14Rows, taxe15Rows, tva16Rows }: PrintZoneProps) {
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
      {/* ── PDF header ── */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", paddingBottom: 12, borderBottom: "2px solid #000", marginBottom: 20 }}>
        {/* LEFT – logo + stacked info boxes */}
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
              DR : {direction || "—"}
            </div>
          </div>
        </div>
        {/* RIGHT – stacked month/year boxes */}
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
            Déclaration Mois : {mon}
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
      {/* ── Centered title ── */}
      <div style={{ textAlign: "center", fontSize: 15, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.5, color: "#000", marginBottom: 20 }}>
        {tab.title}
      </div>

      {/* ── Table content per tab ── */}
      {activeTab === "encaissement" && (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>
            <th style={thStyle}>#</th>
            <th style={thStyle}>Désignation</th>
            <th style={thStyle}>Encaissement TTC</th>
            <th style={thStyle}>TVA</th>
            <th style={thStyle}>Encaissement HT</th>
          </tr></thead>
          <tbody>
            {encRows.map((r, i) => {
              const ht = num(r.ttc) / 1.19; const tva = num(r.ttc) - ht
              return <tr key={i} style={{ background: "#fff", color: "#000" }}>
                <td style={{ ...tdStyle, textAlign: "center", backgroundColor: "#fff", color: "#000" }}>{i + 1}</td>
                <td style={{ ...tdStyle, backgroundColor: "#fff", color: "#000" }}>{r.designation}</td>
                <td style={{ ...tdStyle, textAlign: "right", backgroundColor: "#fff", color: "#000" }}>{r.ttc ? fmt(num(r.ttc)) : ""}</td>
                <td style={{ ...tdStyle, textAlign: "right", backgroundColor: "#fff", color: "#000" }}>{r.ttc ? fmt(tva) : ""}</td>
                <td style={{ ...tdStyle, textAlign: "right", backgroundColor: "#fff", color: "#000" }}>{r.ttc ? fmt(ht) : ""}</td>
              </tr>
            })}
          </tbody>
          <tfoot><tr style={{ background: "#ddd", fontWeight: 700, color: "#000" }}>
            <td colSpan={2} style={{ ...tdStyle, textAlign: "right", backgroundColor: "#ddd", color: "#000" }}>TOTAL</td>
            <td style={{ ...tdStyle, textAlign: "right", backgroundColor: "#ddd", color: "#000" }}>{fmt(encRows.reduce((s,r) => s+num(r.ttc),0))}</td>
            <td style={{ ...tdStyle, textAlign: "right", backgroundColor: "#ddd", color: "#000" }}>{fmt(encRows.reduce((s,r) => { const t=num(r.ttc); return s+t-t/1.19 },0))}</td>
            <td style={{ ...tdStyle, textAlign: "right", backgroundColor: "#ddd", color: "#000" }}>{fmt(encRows.reduce((s,r) => s+num(r.ttc)/1.19,0))}</td>
          </tr></tfoot>
        </table>
      )}

      {(activeTab === "tva_immo" || activeTab === "tva_biens") && (() => {
        const rows = activeTab === "tva_immo" ? tvaImmoRows : tvaBiensRows
        const showRateColumn = activeTab === "tva_immo" || activeTab === "tva_biens"
        const tHT  = rows.reduce((s, r) => s + num(r.montantHT), 0)
        const tTVA = rows.reduce((s, r) => s + getTvaAmount(r, showRateColumn), 0)
        const tTTC = tHT + tTVA
        return (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              {["#","Nom / Raison Sociale","Adresse","NIF","Auth. NIF","N° RC","Auth. N° RC","N° Facture","Date","Montant HT", ...(showRateColumn ? ["Taux TVA"] : []), "TVA","Montant TTC"].map((h) => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {rows.map((r, i) => {
                const rowTva = getTvaAmount(r, showRateColumn)
                const rowTTC = num(r.montantHT) + rowTva
                return <tr key={i} style={{ background: "#fff", color: "#000" }}>
                  <td style={{ ...tdStyle, textAlign: "center", backgroundColor: "#fff", color: "#000" }}>{i+1}</td>
                  <td style={{ ...tdStyle, backgroundColor: "#fff", color: "#000" }}>{printNullableText(r.nomRaisonSociale)}</td>
                  <td style={{ ...tdStyle, backgroundColor: "#fff", color: "#000" }}>{printNullableText(r.adresse)}</td>
                  <td style={{ ...tdStyle, backgroundColor: "#fff", color: "#000" }}>{printNullableText(r.nif)}</td>
                  <td style={{ ...tdStyle, backgroundColor: "#fff", color: "#000" }}>{printNullableText(r.authNif)}</td>
                  <td style={{ ...tdStyle, backgroundColor: "#fff", color: "#000" }}>{printNullableText(r.numRC)}</td>
                  <td style={{ ...tdStyle, backgroundColor: "#fff", color: "#000" }}>{printNullableText(r.authRC)}</td>
                  <td style={{ ...tdStyle, backgroundColor: "#fff", color: "#000" }}>{r.numFacture}</td>
                  <td style={{ ...tdStyle, backgroundColor: "#fff", color: "#000" }}>{r.dateFacture}</td>
                  <td style={{ ...tdStyle, textAlign: "right", backgroundColor: "#fff", color: "#000" }}>{r.montantHT ? fmt(num(r.montantHT)) : ""}</td>
                  {showRateColumn && <td style={{ ...tdStyle, textAlign: "center", backgroundColor: "#fff", color: "#000" }}>{getTvaRateLabel(r.tauxTVA)}</td>}
                  <td style={{ ...tdStyle, textAlign: "right", backgroundColor: "#fff", color: "#000" }}>{showRateColumn && r.montantHT && normalizeTvaRate(r.tauxTVA) ? fmt(rowTva) : r.tva ? fmt(num(r.tva)) : ""}</td>
                  <td style={{ ...tdStyle, textAlign: "right", backgroundColor: "#fff", color: "#000" }}>{r.montantHT || rowTva ? fmt(rowTTC) : ""}</td>
                </tr>
              })}
            </tbody>
            <tfoot><tr style={{ background: "#ddd", fontWeight: 700, color: "#000" }}>
              <td colSpan={9} style={{ ...tdStyle, textAlign: "right", backgroundColor: "#ddd", color: "#000" }}>TOTAL</td>
              <td style={{ ...tdStyle, textAlign: "right", backgroundColor: "#ddd", color: "#000" }}>{fmt(tHT)}</td>
              {showRateColumn && <td style={{ ...tdStyle, textAlign: "center", backgroundColor: "#ddd", color: "#000" }}>—</td>}
              <td style={{ ...tdStyle, textAlign: "right", backgroundColor: "#ddd", color: "#000" }}>{fmt(tTVA)}</td>
              <td style={{ ...tdStyle, textAlign: "right", backgroundColor: "#ddd", color: "#000" }}>{fmt(tTTC)}</td>
            </tr></tfoot>
          </table>
        )
      })()}

      {activeTab === "droits_timbre" && (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>
            {["#","Désignation","CA TTC Esp.","Droit de Timbre"].map((h) => <th key={h} style={thStyle}>{h}</th>)}
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
            {["Désignation","Chiffre d'affaires HT","Montant Taxe à verser"].map((h) => <th key={h} style={thStyle}>{h}</th>)}
          </tr></thead>
          <tbody>
            <tr style={{ background: "#fff", color: "#000" }}>
              <td style={{ ...tdStyle, backgroundColor: "#fff", color: "#000" }}>Chiffre d'affaires soumis à 7%</td>
              <td style={{ ...tdStyle, textAlign: "right", backgroundColor: "#fff", color: "#000" }}>{b12 ? fmt(num(b12)) : ""}</td>
              <td style={{ ...tdStyle, textAlign: "right", backgroundColor: "#fff", color: "#000" }}>{b12 ? fmt(c12) : ""}</td>
            </tr>
            <tr style={{ background: "#eee", color: "#000" }}>
              <td style={{ ...tdStyle, backgroundColor: "#eee", color: "#000" }}>Chiffre d'affaires global soumis à 1%</td>
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
                const w = WILAYA_COMMUNE_DATA.find((w) => w.code === r.wilayaCode)
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
              {["Désignation","Assiette Imposable","Montant"].map(h=><th key={h} style={thStyle}>{h}</th>)}
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
              {["Désignation","Montant de la base","Montant de la Taxe 2%"].map(h=><th key={h} style={thStyle}>{h}</th>)}
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
              {["#","Date","Nom du Master","N° Facture","Date Facture","Montant HT","Taxe 1,5%","Mois","Observation"].map(h=><th key={h} style={thStyle}>{h}</th>)}
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
          <thead><tr>{["Désignation","Montant"].map(h=><th key={h} style={thStyle}>{h}</th>)}</tr></thead>
          <tbody>
            <tr><td style={tdStyle}>Taxe de véhicule</td><td style={{...tdStyle,textAlign:"right"}}>{taxe11Montant?fmt(num(taxe11Montant)):""}</td></tr>
            <tr style={{fontWeight:700}}><td style={tdStyle}>TOTAL</td><td style={{...tdStyle,textAlign:"right"}}>{fmt(num(taxe11Montant))}</td></tr>
          </tbody>
        </table>
      )}

      {activeTab === "taxe_formation" && (() => {
        const total = taxe12Rows.reduce((s,r)=>s+num(r.montant),0)
        return (
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead><tr>{["Désignation","Montant"].map(h=><th key={h} style={thStyle}>{h}</th>)}</tr></thead>
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
              <th style={thStyle}>Désignation</th>
              {MONTH_LABELS_SHORT.map(m=><th key={m} style={thStyle}>{m} {yy}</th>)}
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

      {activeTab === "ibs" && (() => {
        const numCols: (keyof Ibs14Row)[] = ["montantBrutDevise","montantBrutDinars","montantNetDevise","montantIBS","montantNetDinars"]
        return (
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead><tr>
              {["#","N° Facture","Montant Brut Devise","Taux Change/Date","Montant Brut Dinars","Montant Net Devise","Montant IBS","Montant Net Dinars"].map(h=><th key={h} style={thStyle}>{h}</th>)}
            </tr></thead>
            <tbody>
              {ibs14Rows.map((r,i)=>(
                <tr key={i}>
                  <td style={{...tdStyle,textAlign:"center"}}>{i+1}</td>
                  <td style={tdStyle}>{r.numFacture}</td>
                  <td style={{...tdStyle,textAlign:"right"}}>{r.montantBrutDevise?fmt(num(r.montantBrutDevise)):""}</td>
                  <td style={tdStyle}>{r.tauxChange}</td>
                  <td style={{...tdStyle,textAlign:"right"}}>{r.montantBrutDinars?fmt(num(r.montantBrutDinars)):""}</td>
                  <td style={{...tdStyle,textAlign:"right"}}>{r.montantNetDevise?fmt(num(r.montantNetDevise)):""}</td>
                  <td style={{...tdStyle,textAlign:"right"}}>{r.montantIBS?fmt(num(r.montantIBS)):""}</td>
                  <td style={{...tdStyle,textAlign:"right"}}>{r.montantNetDinars?fmt(num(r.montantNetDinars)):""}</td>
                </tr>
              ))}
              <tr style={{fontWeight:700}}>
                <td style={tdStyle} colSpan={2}>TOTAL</td>
                <td style={{...tdStyle,textAlign:"right"}}>{fmt(ibs14Rows.reduce((s,r)=>s+num(r.montantBrutDevise),0))}</td>
                <td style={tdStyle}/>
                <td style={{...tdStyle,textAlign:"right"}}>{fmt(ibs14Rows.reduce((s,r)=>s+num(r.montantBrutDinars),0))}</td>
                <td style={{...tdStyle,textAlign:"right"}}>{fmt(ibs14Rows.reduce((s,r)=>s+num(r.montantNetDevise),0))}</td>
                <td style={{...tdStyle,textAlign:"right"}}>{fmt(ibs14Rows.reduce((s,r)=>s+num(r.montantIBS),0))}</td>
                <td style={{...tdStyle,textAlign:"right"}}>{fmt(ibs14Rows.reduce((s,r)=>s+num(r.montantNetDinars),0))}</td>
              </tr>
            </tbody>
          </table>
        )
      })()}

      {activeTab === "taxe_domicil" && (
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead><tr>
            {["#","N° Facture","Date Facture","Raison Sociale","Mont. Net Devise","Monnaie","Taux Change","Mont. Dinars","Taux Taxe","Mont. à Payer"].map(h=><th key={h} style={thStyle}>{h}</th>)}
          </tr></thead>
          <tbody>
            {taxe15Rows.map((r,i)=>(
              <tr key={i}>
                <td style={{...tdStyle,textAlign:"center"}}>{i+1}</td>
                <td style={tdStyle}>{r.numFacture}</td>
                <td style={tdStyle}>{r.dateFacture}</td>
                <td style={tdStyle}>{r.raisonSociale}</td>
                <td style={{...tdStyle,textAlign:"right"}}>{r.montantNetDevise?fmt(num(r.montantNetDevise)):""}</td>
                <td style={tdStyle}>{r.monnaie}</td>
                <td style={tdStyle}>{r.tauxChange}</td>
                <td style={{...tdStyle,textAlign:"right"}}>{r.montantDinars?fmt(num(r.montantDinars)):""}</td>
                <td style={tdStyle}>{r.tauxTaxe}</td>
                <td style={{...tdStyle,textAlign:"right"}}>{r.montantAPayer?fmt(num(r.montantAPayer)):""}</td>
              </tr>
            ))}
            <tr style={{fontWeight:700}}>
              <td style={tdStyle} colSpan={4}>TOTAL</td>
              <td style={{...tdStyle,textAlign:"right"}}>{fmt(taxe15Rows.reduce((s,r)=>s+num(r.montantNetDevise),0))}</td>
              <td style={tdStyle}/><td style={tdStyle}/>
              <td style={{...tdStyle,textAlign:"right"}}>{fmt(taxe15Rows.reduce((s,r)=>s+num(r.montantDinars),0))}</td>
              <td style={tdStyle}/>
              <td style={{...tdStyle,textAlign:"right"}}>{fmt(taxe15Rows.reduce((s,r)=>s+num(r.montantAPayer),0))}</td>
            </tr>
          </tbody>
        </table>
      )}

      {activeTab === "tva_autoliq" && (
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead><tr>
            {["#","N° Facture","Montant Brut Devises","Taux Change/Date","Montant Brut Dinars","TVA 19%"].map(h=><th key={h} style={thStyle}>{h}</th>)}
          </tr></thead>
          <tbody>
            {tva16Rows.map((r,i)=>(
              <tr key={i}>
                <td style={{...tdStyle,textAlign:"center"}}>{i+1}</td>
                <td style={tdStyle}>{r.numFacture}</td>
                <td style={{...tdStyle,textAlign:"right"}}>{r.montantBrutDevise?fmt(num(r.montantBrutDevise)):""}</td>
                <td style={tdStyle}>{r.tauxChange}</td>
                <td style={{...tdStyle,textAlign:"right"}}>{r.montantBrutDinars?fmt(num(r.montantBrutDinars)):""}</td>
                <td style={{...tdStyle,textAlign:"right"}}>{r.tva19?fmt(num(r.tva19)):""}</td>
              </tr>
            ))}
            <tr style={{fontWeight:700}}>
              <td style={tdStyle} colSpan={2}>TOTAL</td>
              <td style={{...tdStyle,textAlign:"right"}}>{fmt(tva16Rows.reduce((s,r)=>s+num(r.montantBrutDevise),0))}</td>
              <td style={tdStyle}/>
              <td style={{...tdStyle,textAlign:"right"}}>{fmt(tva16Rows.reduce((s,r)=>s+num(r.montantBrutDinars),0))}</td>
              <td style={{...tdStyle,textAlign:"right"}}>{fmt(tva16Rows.reduce((s,r)=>s+num(r.tva19),0))}</td>
            </tr>
          </tbody>
        </table>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function NouvelleDeclarationPage() {
  const { user, isLoading, status } = useAuth({ requireAuth: true, redirectTo: "/login" })
  const { toast } = useToast()
  const router    = useRouter()
  const printRef  = useRef<HTMLDivElement>(null)
  const [editQuery, setEditQuery] = useState<{ editId: string; tab: string }>({ editId: "", tab: "" })

  // ── Regions (fetched from API) ──
  const [regions, setRegions] = useState<{ id: number; name: string }[]>([])
  const [fiscalFournisseurs, setFiscalFournisseurs] = useState<FiscalFournisseurOption[]>([])
  useEffect(() => {
    const token = typeof localStorage !== "undefined" ? localStorage.getItem("jwt") : null
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5001"}/api/regions`, {
      credentials: "include",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((data: { id: number; name: string }[]) => setRegions(data))
      .catch(() => {})
  }, [])

  useEffect(() => {
    const token = typeof localStorage !== "undefined" ? localStorage.getItem("jwt") : null
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5001"}/api/fiscal-fournisseurs`, {
      credentials: "include",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((data: unknown) => {
        const normalized = Array.isArray(data)
          ? data
              .map((item) => normalizeFiscalFournisseurOption(item))
              .filter((item): item is FiscalFournisseurOption => item !== null)
          : []
        setFiscalFournisseurs(normalized)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    const params = new URLSearchParams(window.location.search)
    setEditQuery({
      editId: safeString(params.get("editId")).trim(),
      tab: safeString(params.get("tab")).trim(),
    })
  }, [])

  // ── Global meta ──
  const [activeTab,  setActiveTab]  = useState("encaissement")
  const [direction,  setDirection]  = useState("")
  const [mois,       setMois]       = useState(String(new Date().getMonth() + 1).padStart(2, "0"))
  const [annee,      setAnnee]      = useState(String(CURRENT_YEAR))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingDeclarationId, setEditingDeclarationId] = useState<string | null>(null)
  const [editingCreatedAt, setEditingCreatedAt] = useState("")

  // ── Tab data (lifted) ──
  const [encRows,       setEncRows]       = useState<EncRow[]>([{ designation: "", ttc: "" }])
  const [tvaImmoRows,   setTvaImmoRows]   = useState<TvaRow[]>([{ ...EMPTY_TVA }])
  const [tvaBiensRows,  setTvaBiensRows]  = useState<TvaRow[]>([{ ...EMPTY_TVA }])
  const [timbreRows,    setTimbreRows]    = useState<TimbreRow[]>([{ designation: "", caTTCEsp: "", droitTimbre: "" }])
  const [b12,           setB12]           = useState("")
  const [b13,           setB13]           = useState("")
  const [tapRows,       setTapRows]       = useState<TAPRow[]>([{ wilayaCode: "", commune: "", tap2: "" }])
  const [siegeEncRows,  setSiegeEncRows]  = useState<SiegeEncRow[]>(Array(12).fill(null).map(() => ({ ttc: "", ht: "" })))
  const [irgRows,        setIrgRows]        = useState<IrgRow[]>(Array(5).fill(null).map(() => ({ assietteImposable: "", montant: "" })))
  const [taxe2Rows,      setTaxe2Rows]      = useState<Taxe2Row[]>([{ base: "", montant: "" }])
  const [masterRows,     setMasterRows]     = useState<MasterRow[]>([{ ...EMPTY_MASTER }])
  const [taxe11Montant,  setTaxe11Montant]  = useState("")
  const [taxe12Rows,     setTaxe12Rows]     = useState<Taxe12Row[]>([{ montant: "" }, { montant: "" }])
  const [acompteMonths,  setAcompteMonths]  = useState<string[]>(Array(12).fill(""))
  const [ibs14Rows,      setIbs14Rows]      = useState<Ibs14Row[]>([{ ...EMPTY_IBS14 }])
  const [taxe15Rows,     setTaxe15Rows]     = useState<Taxe15Row[]>([{ ...EMPTY_TAXE15 }])
  const [tva16Rows,      setTva16Rows]      = useState<Tva16Row[]>([{ ...EMPTY_TVA16 }])

  // ── Auto-set direction based on user role ──
  useEffect(() => {
    if (!user) return
    if (user.role === "regionale") {
      setDirection(user.region ?? user.direction ?? "")
    } else if (user.role === "comptabilite" || user.role === "admin") {
      setDirection((prev) => prev || "Siège")
    }
  }, [user])

  useEffect(() => {
    if (!editQuery.editId) {
      setEditingDeclarationId(null)
      setEditingCreatedAt("")
      return
    }

    try {
      const parsed = JSON.parse(localStorage.getItem("fiscal_declarations") ?? "[]")
      const declarations = Array.isArray(parsed) ? (parsed as SavedDeclaration[]) : []
      const declaration = declarations.find((item) => safeString(item.id) === editQuery.editId)

      if (!declaration) {
        toast({
          title: "⚠ Déclaration introuvable",
          description: "La déclaration demandée n'existe pas ou a déjà été supprimée.",
          variant: "destructive",
        })
        return
      }

      const requestedTab = isFiscalTabKey(editQuery.tab) ? editQuery.tab : resolveDeclarationTabKey(declaration)

      setEditingDeclarationId(safeString(declaration.id) || editQuery.editId)
      setEditingCreatedAt(safeString(declaration.createdAt) || new Date().toISOString())
      setActiveTab(requestedTab)
      setDirection(safeString(declaration.direction))
      setMois(normalizeMonthValue(safeString(declaration.mois)))
      setAnnee(normalizeYearValue(safeString(declaration.annee)))

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
      setIbs14Rows(normalizeIbsRows(declaration.ibs14Rows))
      setTaxe15Rows(normalizeTaxe15Rows(declaration.taxe15Rows))
      setTva16Rows(normalizeTva16Rows(declaration.tva16Rows))
    } catch {
      toast({
        title: "⚠ Erreur de chargement",
        description: "Impossible de charger la déclaration à modifier.",
        variant: "destructive",
      })
    }
  }, [editQuery.editId, editQuery.tab])

  if (isLoading || !user || status !== "authenticated") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Chargement...</p>
      </div>
    )
  }

  const handleSave = async () => {
    // Validation : direction, mois, année obligatoires
    if (!direction.trim()) {
      toast({ title: "⚠ Direction requise", description: "Veuillez saisir la direction avant d'enregistrer.", variant: "destructive" })
      return
    }
    if (!mois) {
      toast({ title: "⚠ Mois requis", description: "Veuillez sélectionner le mois avant d'enregistrer.", variant: "destructive" })
      return
    }
    if (!annee) {
      toast({ title: "⚠ Année requise", description: "Veuillez sélectionner l'année avant d'enregistrer.", variant: "destructive" })
      return
    }

    // Validation : aucune case du tableau actif ne doit être vide
    let validationError = false
    switch (activeTab) {
      case "encaissement":
        if (encRows.some(r => !r.designation.trim() || !r.ttc)) {
          toast({ title: "⚠ Champs incomplets", description: "Tous les champs du tableau doivent être remplis.", variant: "destructive" })
          validationError = true
        }
        break
      case "tva_immo":
        if (tvaImmoRows.some(r => !r.fournisseurId || !r.nomRaisonSociale.trim() || !r.nif.trim() || !r.adresse.trim() || !r.numRC.trim() || !r.dateFacture || !r.numFacture.trim() || !r.montantHT || !normalizeTvaRate(r.tauxTVA))) {
          toast({ title: "⚠ Champs incomplets", description: "Tous les champs du tableau doivent être remplis.", variant: "destructive" })
          validationError = true
        }
        break
      case "tva_biens":
        if (tvaBiensRows.some(r => !r.fournisseurId || !r.nomRaisonSociale.trim() || !r.nif.trim() || !r.adresse.trim() || !r.numRC.trim() || !r.dateFacture || !r.numFacture.trim() || !r.montantHT || !normalizeTvaRate(r.tauxTVA))) {
          toast({ title: "⚠ Champs incomplets", description: "Tous les champs du tableau doivent être remplis.", variant: "destructive" })
          validationError = true
        }
        break
      case "droits_timbre":
        if (timbreRows.some(r => !r.designation.trim() || !r.caTTCEsp || !r.droitTimbre)) {
          toast({ title: "⚠ Champs incomplets", description: "Tous les champs du tableau doivent être remplis.", variant: "destructive" })
          validationError = true
        }
        break
      case "ca_tap":
        if (!b12 || !b13) {
          toast({ title: "⚠ Champs incomplets", description: "Tous les champs doivent être remplis.", variant: "destructive" })
          validationError = true
        }
        break
      case "etat_tap":
        if (tapRows.some(r => !r.wilayaCode || !r.commune.trim() || !r.tap2)) {
          toast({ title: "⚠ Champs incomplets", description: "Tous les champs du tableau doivent être remplis.", variant: "destructive" })
          validationError = true
        }
        break
      case "ca_siege":
        if (siegeEncRows.every(r => !r.ttc && !r.ht)) {
          toast({ title: "⚠ Champs incomplets", description: "Veuillez renseigner au moins une ligne du tableau Siège.", variant: "destructive" })
          validationError = true
        }
        break
      case "irg":
        if (irgRows.every(r => !r.assietteImposable && !r.montant)) {
          toast({ title: "⚠ Champs incomplets", description: "Veuillez renseigner au moins une ligne IRG.", variant: "destructive" })
          validationError = true
        }
        break
      case "taxe2":
        if (!taxe2Rows[0].base && !taxe2Rows[0].montant) {
          toast({ title: "⚠ Champs incomplets", description: "Veuillez renseigner la ligne Taxe 2%.", variant: "destructive" })
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

    if (activeTab === "tva_immo" || activeTab === "tva_biens") {
      const currentRows = activeTab === "tva_immo" ? tvaImmoRows : tvaBiensRows

      const duplicateInCurrentTable = findDuplicateInTvaRows(currentRows)
      if (duplicateInCurrentTable) {
        toast({
          title: "⚠ Facture en doublon",
          description: `Doublon détecté dans le tableau: Fournisseur "${duplicateInCurrentTable.fournisseur}", Référence "${duplicateInCurrentTable.reference}", Date "${duplicateInCurrentTable.date}".`,
          variant: "destructive",
        })
        return
      }

      const duplicateInHistory = findDuplicateAcrossSavedDeclarations(currentRows, existingDeclarations, editingDeclarationId)
      if (duplicateInHistory) {
        toast({
          title: "⚠ Facture déjà enregistrée",
          description: `Cette facture existe déjà (tableau 2/3, toutes périodes): Fournisseur "${duplicateInHistory.fournisseur}", Référence "${duplicateInHistory.reference}", Date "${duplicateInHistory.date}".`,
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
      direction,
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
      ibs14Rows: [] as Ibs14Row[],
      taxe15Rows: [] as Taxe15Row[],
      tva16Rows: [] as Tva16Row[],
    }
    
    // Remplir uniquement les données du tableau actif
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
      case "ibs":
        baseDecl.ibs14Rows = ibs14Rows
        break
      case "taxe_domicil":
        baseDecl.taxe15Rows = taxe15Rows
        break
      case "tva_autoliq":
        baseDecl.tva16Rows = tva16Rows
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

    // Persist to database (non-blocking)
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5001"
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
        case "ibs":            tabData = { ibs14Rows }; break
        case "taxe_domicil":   tabData = { taxe15Rows }; break
        case "tva_autoliq":    tabData = { tva16Rows }; break
      }
      await fetch(`${apiBase}/api/fiscal`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          tabKey: activeTab,
          mois,
          annee,
          direction,
          dataJson: JSON.stringify(tabData),
        }),
      })
    } catch { /* silently fail if backend unavailable */ }
    
    const tabLabel = TABS.find((t) => t.key === activeTab)?.label ?? activeTab
    toast({
      title: editingDeclarationId ? "✓ Déclaration modifiée" : "✓ Déclaration enregistrée",
      description: `La déclaration "${tabLabel}" a été sauvegardée avec succès.`,
    })
    setIsSubmitting(false)
    router.push("/fisca/dashboard")
  }


  const activeColor = TABS.find((t) => t.key === activeTab)?.color ?? "#2db34b"
  const mon = MONTHS.find((m) => m.value === mois)?.label ?? mois

  return (
    <LayoutWrapper user={user}>
      {/* Block global (direction) role */}
      {user.role === "direction" ? (
        <AccessDeniedDialog
          title="Accès refusé"
          message="Votre rôle ne vous permet pas de créer des déclarations fiscales."
          redirectTo="/fisca/dashboard"
        />
      ) : (
        <>
        <PrintZone
        activeTab={activeTab} direction={direction} mois={mois} annee={annee}
        encRows={encRows} tvaImmoRows={tvaImmoRows} tvaBiensRows={tvaBiensRows}
        timbreRows={timbreRows} b12={b12} b13={b13} tapRows={tapRows}
        caSiegeRows={siegeEncRows}
        irgRows={irgRows}
        taxe2Rows={taxe2Rows}
        masterRows={masterRows}
        taxe11Montant={taxe11Montant}
        taxe12Rows={taxe12Rows}
        acompteMonths={acompteMonths}
        ibs14Rows={ibs14Rows}
        taxe15Rows={taxe15Rows}
        tva16Rows={tva16Rows}
      />

      <div className="space-y-5 w-full" ref={printRef}>
        {/* ── Page header bar ── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{editingDeclarationId ? "Modifier Déclaration" : "Nouvelle Déclaration"}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {editingDeclarationId
                ? "Mettez à jour les informations du tableau puis enregistrez les modifications."
                : "Remplissez chaque tableau, puis enregistrez."}
            </p>
          </div>

        </div>

        {/* ── Global meta card (Direction + Période) ── */}
        <Card className="border border-gray-200">
          <CardContent className="pt-4 pb-3">
            <div className="flex flex-wrap items-end gap-6">
      {/* Direction */}
              <div className="space-y-1 flex-1 min-w-[220px]">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Direction</label>
                <select value={direction} onChange={(e) => setDirection(e.target.value)}
                  disabled={user.role === "regionale"}
                  className="w-full rounded border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300 disabled:opacity-60 disabled:cursor-not-allowed">
                  <option value="">— Sélectionner une direction —</option>
                  <option value="Siège">Siège</option>
                  {regions.map((r) => <option key={r.id} value={r.name}>{r.name}</option>)}
                </select>
              </div>
              {/* Mois */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Mois</label>
                <select value={mois} onChange={(e) => setMois(e.target.value)}
                  disabled={activeTab === "acompte"}
                  className="rounded border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300 disabled:opacity-50 disabled:cursor-not-allowed">
                  {MONTHS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
              {/* Année */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Année</label>
                <select value={annee} onChange={(e) => setAnnee(e.target.value)}
                  className="rounded border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300">
                  {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              {/* Tableau */}
              <div className="space-y-1 flex-1 min-w-[220px]">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Tableau</label>
                <select value={activeTab} onChange={(e) => setActiveTab(e.target.value)}
                  className="w-full rounded border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2"
                  style={{ borderColor: TABS.find(t => t.key === activeTab)?.color ?? undefined }}>
                  {TABS.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Table content ── */}
        <div>
          {activeTab === "encaissement" && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold" style={{ color: PRIMARY_COLOR }}>Encaissement – Saisie des montants</CardTitle>
                </CardHeader>
                <CardContent>
                  <TabEncaissement rows={encRows} setRows={setEncRows} onSave={handleSave} isSubmitting={isSubmitting} />
                </CardContent>
              </Card>
            )}
            {activeTab === "tva_immo" && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold" style={{ color: PRIMARY_COLOR }}>État TVA / Immobilisations – Liste des factures</CardTitle>
                </CardHeader>
                <CardContent>
                  <TabTVAEtat rows={tvaImmoRows} setRows={setTvaImmoRows} onSave={handleSave} isSubmitting={isSubmitting} fournisseurs={fiscalFournisseurs} withSelectableRate />
                </CardContent>
              </Card>
            )}
            {activeTab === "tva_biens" && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold" style={{ color: PRIMARY_COLOR }}>État TVA / Biens &amp; Services – Liste des factures</CardTitle>
                </CardHeader>
                <CardContent>
                  <TabTVAEtat rows={tvaBiensRows} setRows={setTvaBiensRows} onSave={handleSave} isSubmitting={isSubmitting} fournisseurs={fiscalFournisseurs} withSelectableRate />
                </CardContent>
              </Card>
            )}
            {activeTab === "droits_timbre" && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold" style={{ color: PRIMARY_COLOR }}>État Droits de Timbre – Saisie des montants</CardTitle>
                </CardHeader>
                <CardContent>
                  <TabDroitsTimbre rows={timbreRows} setRows={setTimbreRows} onSave={handleSave} isSubmitting={isSubmitting} />
                </CardContent>
              </Card>
            )}
            {activeTab === "ca_tap" && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold" style={{ color: PRIMARY_COLOR }}>CA soumis à 7% &amp; CA Global soumis à 1% – Calcul automatique</CardTitle>
                </CardHeader>
                <CardContent>
                  <TabCA b12={b12} setB12={setB12} b13={b13} setB13={setB13} onSave={handleSave} isSubmitting={isSubmitting} />
                </CardContent>
              </Card>
            )}
            {activeTab === "etat_tap" && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold" style={{ color: PRIMARY_COLOR }}>État TAP – Saisie par Wilaya / Commune</CardTitle>
                </CardHeader>
                <CardContent>
                  <TabTAP rows={tapRows} setRows={setTapRows}
                    mois={mois} setMois={setMois} annee={annee} setAnnee={setAnnee}
                    onSave={handleSave} isSubmitting={isSubmitting} />
                </CardContent>
              </Card>
            )}
            {activeTab === "ca_siege" && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold" style={{ color: PRIMARY_COLOR }}>N7 – Chiffre d’affaire encaissé Siège</CardTitle>
                </CardHeader>
                <CardContent>
                  <TabCaSiege rows={siegeEncRows} setRows={setSiegeEncRows} onSave={handleSave} isSubmitting={isSubmitting} />
                </CardContent>
              </Card>
            )}
            {activeTab === "irg" && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold" style={{ color: PRIMARY_COLOR }}>N8 – Situation IRG</CardTitle>
                </CardHeader>
                <CardContent>
                  <TabIRG rows={irgRows} setRows={setIrgRows} onSave={handleSave} isSubmitting={isSubmitting} />
                </CardContent>
              </Card>
            )}
            {activeTab === "taxe2" && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold" style={{ color: PRIMARY_COLOR }}>N9 – Situation de la Taxe 2%</CardTitle>
                </CardHeader>
                <CardContent>
                  <TabTaxe2 rows={taxe2Rows} setRows={setTaxe2Rows} onSave={handleSave} isSubmitting={isSubmitting} />
                </CardContent>
              </Card>
            )}
            {activeTab === "taxe_masters" && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold" style={{ color: PRIMARY_COLOR }}>N10 – État de la Taxe 1,5% des Masters</CardTitle>
                </CardHeader>
                <CardContent>
                  <TabMasters rows={masterRows} setRows={setMasterRows} onSave={handleSave} isSubmitting={isSubmitting} />
                </CardContent>
              </Card>
            )}
            {activeTab === "taxe_vehicule" && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold" style={{ color: PRIMARY_COLOR }}>N11 – Taxe de Véhicule</CardTitle>
                </CardHeader>
                <CardContent>
                  <TabTaxeVehicule montant={taxe11Montant} setMontant={setTaxe11Montant} onSave={handleSave} isSubmitting={isSubmitting} />
                </CardContent>
              </Card>
            )}
            {activeTab === "taxe_formation" && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold" style={{ color: PRIMARY_COLOR }}>N12 – Taxe de Formation</CardTitle>
                </CardHeader>
                <CardContent>
                  <TabTaxeFormation rows={taxe12Rows} setRows={setTaxe12Rows} onSave={handleSave} isSubmitting={isSubmitting} />
                </CardContent>
              </Card>
            )}
            {activeTab === "acompte" && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold" style={{ color: PRIMARY_COLOR }}>N13 – Acompte Provisionnel</CardTitle>
                </CardHeader>
                <CardContent>
                  <TabAcompte months={acompteMonths} setMonths={setAcompteMonths} annee={annee} onSave={handleSave} isSubmitting={isSubmitting} />
                </CardContent>
              </Card>
            )}
            {activeTab === "ibs" && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold" style={{ color: PRIMARY_COLOR }}>N14 – IBS sur Fournisseurs Étrangers</CardTitle>
                </CardHeader>
                <CardContent>
                  <TabIBS rows={ibs14Rows} setRows={setIbs14Rows} onSave={handleSave} isSubmitting={isSubmitting} />
                </CardContent>
              </Card>
            )}
            {activeTab === "taxe_domicil" && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold" style={{ color: PRIMARY_COLOR }}>N15 – Taxe Domiciliation Bancaire</CardTitle>
                </CardHeader>
                <CardContent>
                  <TabTaxeDomicil rows={taxe15Rows} setRows={setTaxe15Rows} onSave={handleSave} isSubmitting={isSubmitting} />
                </CardContent>
              </Card>
            )}
            {activeTab === "tva_autoliq" && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold" style={{ color: PRIMARY_COLOR }}>N16 – TVA Auto Liquidation</CardTitle>
                </CardHeader>
                <CardContent>
                  <TabTvaAutoLiq rows={tva16Rows} setRows={setTva16Rows} onSave={handleSave} isSubmitting={isSubmitting} />
                </CardContent>
              </Card>
            )}
          </div>
      </div>
        </>
      )}
    </LayoutWrapper>
  )
}

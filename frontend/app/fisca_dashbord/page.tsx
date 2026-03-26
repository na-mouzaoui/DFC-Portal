"use client"

import { useState, useEffect } from "react"
import { LayoutWrapper } from "@/components/layout-wrapper"
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { CheckCircle, Trash2, Printer, Filter, ChevronUp, ChevronDown, X, Pencil } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { getFiscalPeriodLockMessage, isFiscalPeriodLocked } from "@/lib/fiscal-period-deadline"
import { canManageFiscalTab } from "@/lib/fiscal-tab-access"
import { API_BASE } from "@/lib/config"
import WILAYAS_COMMUNES from "@/lib/wilayas-communes"

type EncRow = { designation: string; ht?: string; ttc?: string }
type TvaRate = "19" | "9"
type TvaRow = { nomRaisonSociale: string; adresse: string; nif: string; authNif: string; numRC: string; authRC: string; numFacture: string; dateFacture: string; montantHT: string; tva: string; tauxTVA?: TvaRate | "" }
type TimbreRow = { designation: string; caTTCEsp: string; droitTimbre: string }
type TAPRow = { wilayaCode: string; commune: string; tap2: string }
type SiegeEncRow = { ttc: string; ht: string }
type IrgRow    = { assietteImposable: string; montant: string }
type Taxe2Row  = { base: string; montant: string }
type MasterRow = { date: string; nomMaster: string; numFacture: string; dateFacture: string; montantHT: string; taxe15: string; mois: string; observation: string }
type Taxe12Row = { montant: string }
type Ibs14Row  = { numFacture: string; montantBrutDevise: string; tauxChange: string; montantBrutDinars: string; montantNetDevise: string; montantIBS: string; montantNetDinars: string }
type Taxe15Row = { numFacture: string; dateFacture: string; raisonSociale: string; montantNetDevise: string; monnaie: string; tauxChange: string; montantDinars: string; tauxTaxe: string; montantAPayer: string }
type Tva16Row  = { numFacture: string; montantBrutDevise: string; tauxChange: string; montantBrutDinars: string; tva19: string }

const SIEGE_G1_LABELS = ["Encaissement", "Encaissement Exon\u00e9r\u00e9e"]
const SIEGE_G2_LABELS = [
  "Encaissement MOBIPOST", "Encaissement POST PAID", "Encaissement RACIMO",
  "Encaissement DME", "Encaissement SOFIA", "Encaissement CCP RECOUVREMENT A",
  "Encaissement CCP RECOUVREMENT B", "Encaissement CCP TPE",
  "Encaissement BNA TPE", "Encaissement MASTER ALGERIE POSTE",
]

const IRG_LABELS = [
  "IRG sur Salaire Bareme", "Autre IRG 10%", "Autre IRG 15%",
  "Jetons de prAsence 15%", "Tantieme 15%",
]
const TAXE2_LABELS = ["Taxe sur l'importation des biens et services"]
const TAXE12_LABELS = ["Taxe de Formation Professionnelle 1%", "Taxe d'Apprentissage 1%"]
const MONTH_LABELS_SHORT = ["Janv","FAv","Mars","Avr","Mai","Juin","Juil","AoAt","Sept","Oct","Nov","DAc"]

interface SavedDeclaration {
  id: string
  userId?: number
  createdAt: string
  direction: string
  mois: string
  annee: string
  isApproved?: boolean
  approvedByUserId?: number | null
  approvedAt?: string | null
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

interface ApiFiscalDeclaration {
  id: number
  userId: number
  tabKey: string
  mois: string
  annee: string
  direction: string
  dataJson: string
  isApproved?: boolean
  approvedByUserId?: number | null
  approvedAt?: string | null
  createdAt: string
}

const toArray = <T,>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : [])

const toStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.map((item) => String(item ?? "")) : []

const mapApiDeclarationToSaved = (item: ApiFiscalDeclaration): SavedDeclaration => {
  const parsedData = (() => {
    try {
      const payload = JSON.parse(item.dataJson ?? "{}")
      return payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {}
    } catch {
      return {}
    }
  })()

  const declaration: SavedDeclaration = {
    id: String(item.id),
    userId: item.userId,
    createdAt: item.createdAt,
    direction: item.direction ?? "",
    mois: item.mois,
    annee: item.annee,
    isApproved: !!item.isApproved,
    approvedByUserId: item.approvedByUserId ?? null,
    approvedAt: item.approvedAt ?? null,
    encRows: [],
    tvaImmoRows: [],
    tvaBiensRows: [],
    timbreRows: [],
    b12: "",
    b13: "",
    tapRows: [],
    caSiegeRows: [],
    irgRows: [],
    taxe2Rows: [],
    masterRows: [],
    taxe11Montant: "",
    taxe12Rows: [],
    acompteMonths: [],
    ibs14Rows: [],
    taxe15Rows: [],
    tva16Rows: [],
  }

  switch ((item.tabKey ?? "").trim().toLowerCase()) {
    case "encaissement":
      declaration.encRows = toArray<EncRow>(parsedData.encRows)
      break
    case "tva_immo":
      declaration.tvaImmoRows = toArray<TvaRow>(parsedData.tvaImmoRows)
      break
    case "tva_biens":
      declaration.tvaBiensRows = toArray<TvaRow>(parsedData.tvaBiensRows)
      break
    case "droits_timbre":
      declaration.timbreRows = toArray<TimbreRow>(parsedData.timbreRows)
      break
    case "ca_tap":
      declaration.b12 = String(parsedData.b12 ?? "")
      declaration.b13 = String(parsedData.b13 ?? "")
      break
    case "etat_tap":
      declaration.tapRows = toArray<TAPRow>(parsedData.tapRows)
      break
    case "ca_siege":
      declaration.caSiegeRows = toArray<SiegeEncRow>(parsedData.caSiegeRows)
      break
    case "irg":
      declaration.irgRows = toArray<IrgRow>(parsedData.irgRows)
      break
    case "taxe2":
      declaration.taxe2Rows = toArray<Taxe2Row>(parsedData.taxe2Rows)
      break
    case "taxe_masters":
      declaration.masterRows = toArray<MasterRow>(parsedData.masterRows)
      break
    case "taxe_vehicule":
      declaration.taxe11Montant = String(parsedData.taxe11Montant ?? "")
      break
    case "taxe_formation":
      declaration.taxe12Rows = toArray<Taxe12Row>(parsedData.taxe12Rows)
      break
    case "acompte":
      declaration.acompteMonths = toStringArray(parsedData.acompteMonths)
      break
    case "ibs":
      declaration.ibs14Rows = toArray<Ibs14Row>(parsedData.ibs14Rows)
      break
    case "taxe_domicil":
      declaration.taxe15Rows = toArray<Taxe15Row>(parsedData.taxe15Rows)
      break
    case "tva_autoliq":
      declaration.tva16Rows = toArray<Tva16Row>(parsedData.tva16Rows)
      break
    default:
      break
  }

  return declaration
}

const MONTHS: Record<string, string> = {
  "01": "Janvier", "02": "FAvrier", "03": "Mars", "04": "Avril",
  "05": "Mai", "06": "Juin", "07": "Juillet", "08": "AoAt",
  "09": "Septembre", "10": "Octobre", "11": "Novembre", "12": "DAcembre",
}

const DASH_TABS = [
  { key: "encaissement",  label: "1 - Encaissement",       color: "#2db34b", title: "ETAT DES ENCAISSEMENTS" },
  { key: "tva_immo",      label: "2 - TVA / IMMO",         color: "#1d6fb8", title: "ETAT TVA / IMMOBILISATIONS" },
  { key: "tva_biens",     label: "3 - TVA / Biens & Serv", color: "#7c3aed", title: "ETAT TVA / BIENS & SERVICES" },
  { key: "droits_timbre", label: "4 - Droits Timbre",      color: "#0891b2", title: "ETAT DROITS DE TIMBRE" },
  { key: "ca_tap",        label: "5 - CA 7% & CA Glob 1%", color: "#ea580c", title: "CA 7% & CA GLOBAL 1%" },
  { key: "etat_tap",      label: "6 - ETAT TAP",           color: "#be123c", title: "ETAT TAP" },
  { key: "ca_siege",      label: "7 a CA SiAge",           color: "#854d0e", title: "CHIFFRE D'AFFAIRE ENCAISSA SIAGE" },
  { key: "irg",           label: "8 a Situation IRG",      color: "#0f766e", title: "SITUATION IRG" },
  { key: "taxe2",         label: "9 a Taxe 2%",            color: "#6d28d9", title: "SITUATION DE LA TAXE 2%" },
  { key: "taxe_masters",  label: "10 a Taxe des Master 1,5%", color: "#0369a1", title: "ATAT DE LA TAXE 1,5% DES MASTERS" },
  { key: "taxe_vehicule", label: "11 a Taxe Vehicule",      color: "#92400e", title: "TAXE DE VEHICULE" },
  { key: "taxe_formation",label: "12 a Taxe Formation",     color: "#065f46", title: "TAXE DE FORMATION" },
  { key: "acompte",       label: "13 a Acompte Provisionnel", color: "#1e40af", title: "SITUATION DE L'ACOMPTE PROVISIONNEL" },
  { key: "ibs",           label: "14 a IBS Fournisseurs Etrangers", color: "#7c2d12", title: "IBS SUR FOURNISSEURS ETRANGERS" },
  { key: "taxe_domicil",  label: "15 a Taxe Domiciliation", color: "#134e4a", title: "TAXE DOMICILIATION BANCAIRE" },
  { key: "tva_autoliq",   label: "16 a TVA Auto Liquidation", color: "#312e81", title: "TVA AUTO LIQUIDATION" },
]

// aaa Shared styles & helpers aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
const fmt = (v: number | string) => {
  const cleaned = String(v).replace(/\//g, " ").replace(/\u00A0/g, " ").trim()
  const parsed = Number(cleaned)
  if (isNaN(parsed) || v === "") return "a"
  
  // Manual formatting: integer part with space separators, decimal part
  const parts = parsed.toFixed(2).split(".")
  const intPart = parts[0]
  const decPart = parts[1]
  
  // Add space separators to integer part (from right to left)
  const intFormatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, " ")
  
  return `${intFormatted},${decPart}`
}
const num = (v: string | number | null | undefined) => {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0

  const raw = String(v ?? "").replace(/\u00A0/g, " ").trim()
  if (!raw) return 0

  const standardized = raw.replace(/\s/g, "").replace(/,/g, ".")
  const normalizedDots = standardized.replace(/\.(?=.*\.)/g, "")
  const parsed = parseFloat(normalizedDots)

  return Number.isFinite(parsed) ? parsed : 0
}
const resolveEncaissementAmounts = (row: EncRow) => {
  const htRaw = (row.ht ?? "").trim()
  if (htRaw !== "") {
    const ht = num(htRaw)
    const tva = ht * 0.19
    return { ht, tva, ttc: ht + tva }
  }

  // Backward compatibility for declarations saved with TTC as input.
  const ttc = num(row.ttc ?? "")
  const ht = ttc / 1.19
  return { ht, tva: ttc - ht, ttc }
}
const normalizeTvaRate = (value?: string): TvaRate | "" => {
  if (value === "19" || value === "9") return value
  return ""
}
const getTvaAmount = (row: TvaRow, showRateColumn: boolean) => {
  const rate = normalizeTvaRate(row.tauxTVA)
  if (showRateColumn && rate) {
    return num(row.montantHT) * (Number(rate) / 100)
  }
  return num(row.tva)
}
const getTvaRateLabel = (value?: string) => {
  const rate = normalizeTvaRate(value)
  return rate ? `${rate}%` : "a"
}
const textForPdf = (value?: string) => {
  const normalized = (value ?? "").trim()
  return normalized === "0" ? "" : normalized
}
const TH: React.CSSProperties = { border: "1px solid #d1d5db", padding: "1px 4px", textAlign: "left", fontWeight: 600, lineHeight: "1.1" }
const TD: React.CSSProperties = { border: "1px solid #e5e7eb", padding: "1px 4px", lineHeight: "1.1" }

function EncTable({ rows }: { rows: EncRow[] }) {
  const computedRows = rows.map((row) => ({
    designation: row.designation,
    ...resolveEncaissementAmounts(row),
  }))
  const totals = computedRows.reduce(
    (acc, row) => ({ ht: acc.ht + row.ht, tva: acc.tva + row.tva, ttc: acc.ttc + row.ttc }),
    { ht: 0, tva: 0, ttc: 0 },
  )

  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, border: "1px solid #000" }}>
      <thead>
        <tr style={{ background: "#ddd", color: "#000" }}>
          {["DESIGNATIONS", "ENCAISSEMENTS HT", "TVA", "ENCAISSEMENTS TTC"].map((h) => (
            <th key={h} style={{ ...TH, background: "#ddd", color: "#000" }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {computedRows.map((r, i) => {
          return (
            <tr key={i} style={{ background: "#fff", color: "#000" }}>
              <td style={{ ...TD, background: "#fff", color: "#000" }}>{r.designation || "a"}</td>
              <td style={{ ...TD, background: "#fff", color: "#000", textAlign: "right" }}>{fmt(r.ht)}</td>
              <td style={{ ...TD, background: "#fff", color: "#000", textAlign: "right" }}>{fmt(r.tva)}</td>
              <td style={{ ...TD, background: "#fff", color: "#000", textAlign: "right" }}>{fmt(r.ttc)}</td>
            </tr>
          )
        })}
      </tbody>
      <tfoot>
        <tr style={{ background: "#eee", color: "#000", fontWeight: "bold" }}>
          <td style={{ ...TD, background: "#eee", color: "#000" }}>TOTAL</td>
          <td style={{ ...TD, background: "#eee", color: "#000", textAlign: "right" }}>{fmt(totals.ht)}</td>
          <td style={{ ...TD, background: "#eee", color: "#000", textAlign: "right" }}>{fmt(totals.tva)}</td>
          <td style={{ ...TD, background: "#eee", color: "#000", textAlign: "right" }}>{fmt(totals.ttc)}</td>
        </tr>
      </tfoot>
    </table>
  )
}

function TvaTable({ rows, showRateColumn = false }: { rows: TvaRow[]; showRateColumn?: boolean }) {
  const tHT  = rows.reduce((s, r) => s + num(r.montantHT), 0)
  const tTVA = rows.reduce((s, r) => s + getTvaAmount(r, showRateColumn), 0)
  const tTTC = tHT + tTVA
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10, border: "1px solid #000" }}>
      <thead>
        <tr style={{ background: "#ddd", color: "#000" }}>
          {["Nom Prenom / Raison Sociale","Adresse","NIF","Auth. NIF","N° RC","Auth. N° RC","N° Facture","Date","Montant HT", ...(showRateColumn ? ["Taux TVA"] : []), "TVA","Montant TTC"].map((h) => (
            <th key={h} style={{ ...TH, background: "#ddd", color: "#000" }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => {
          const rowTva = getTvaAmount(r, showRateColumn)
          return <tr key={i} style={{ background: "#fff", color: "#000" }}>
            <td style={{ ...TD, background: "#fff", color: "#000" }}>{textForPdf(r.nomRaisonSociale)}</td>
            <td style={{ ...TD, background: "#fff", color: "#000" }}>{textForPdf(r.adresse)}</td>
            <td style={{ ...TD, background: "#fff", color: "#000" }}>{textForPdf(r.nif)}</td>
            <td style={{ ...TD, background: "#fff", color: "#000" }}>{textForPdf(r.authNif)}</td>
            <td style={{ ...TD, background: "#fff", color: "#000" }}>{textForPdf(r.numRC)}</td>
            <td style={{ ...TD, background: "#fff", color: "#000" }}>{textForPdf(r.authRC)}</td>
            <td style={{ ...TD, background: "#fff", color: "#000" }}>{r.numFacture || "a"}</td>
            <td style={{ ...TD, background: "#fff", color: "#000" }}>{r.dateFacture || "a"}</td>
            <td style={{ ...TD, background: "#fff", color: "#000", textAlign: "right" }}>{fmt(r.montantHT)}</td>
            {showRateColumn && <td style={{ ...TD, background: "#fff", color: "#000", textAlign: "center" }}>{getTvaRateLabel(r.tauxTVA)}</td>}
            <td style={{ ...TD, background: "#fff", color: "#000", textAlign: "right" }}>{showRateColumn && r.montantHT && normalizeTvaRate(r.tauxTVA) ? fmt(rowTva) : fmt(r.tva)}</td>
            <td style={{ ...TD, background: "#fff", color: "#000", textAlign: "right" }}>{fmt(num(r.montantHT) + rowTva)}</td>
          </tr>
        })}
      </tbody>
      <tfoot>
        <tr style={{ background: "#eee", color: "#000", fontWeight: "bold" }}>
          <td colSpan={8} style={{ ...TD, background: "#eee", color: "#000" }}>TOTAL</td>
          <td style={{ ...TD, background: "#eee", color: "#000", textAlign: "right" }}>{fmt(tHT)}</td>
          {showRateColumn && <td style={{ ...TD, background: "#eee", color: "#000", textAlign: "center" }}></td>}
          <td style={{ ...TD, background: "#eee", color: "#000", textAlign: "right" }}>{fmt(tTVA)}</td>
          <td style={{ ...TD, background: "#eee", color: "#000", textAlign: "right" }}>{fmt(tTTC)}</td>
        </tr>
      </tfoot>
    </table>
  )
}

function TimbreTable({ rows }: { rows: TimbreRow[] }) {
  const totalCA = rows.reduce((s, r) => s + num(r.caTTCEsp), 0)
  const totalDroit = rows.reduce((s, r) => s + num(r.droitTimbre), 0)

  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, border: "1px solid #000" }}>
      <thead>
        <tr style={{ background: "#ddd", color: "#000" }}>
          {["DESIGNATIONS", "CHIFFRE D'AFFAIRES TTC ENCAISSE EN ESPECE", "DROITS DE TIMBRE"].map((h) => (
            <th key={h} style={{ ...TH, background: "#ddd", color: "#000" }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} style={{ background: "#fff", color: "#000" }}>
            <td style={{ ...TD, background: "#fff", color: "#000" }}>{r.designation || "a"}</td>
            <td style={{ ...TD, background: "#fff", color: "#000", textAlign: "right" }}>{fmt(r.caTTCEsp)}</td>
            <td style={{ ...TD, background: "#fff", color: "#000", textAlign: "right" }}>{fmt(r.droitTimbre)}</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr style={{ background: "#eee", color: "#000", fontWeight: "bold" }}>
          <td style={{ ...TD, background: "#eee", color: "#000" }}>TOTAL</td>
          <td style={{ ...TD, background: "#eee", color: "#000", textAlign: "right" }}>{fmt(totalCA)}</td>
          <td style={{ ...TD, background: "#eee", color: "#000", textAlign: "right" }}>{fmt(totalDroit)}</td>
        </tr>
      </tfoot>
    </table>
  )
}

function CATable({ b12, b13 }: { b12: string; b13: string }) {
  const totalBase = num(b12) + num(b13)
  const totalTaxe = num(b12) * 0.07 + num(b13) * 0.01
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, border: "1px solid #000" }}>
      <thead>
        <tr style={{ background: "#ddd", color: "#000" }}>
          {["DESIGNATIONS", "MONTANT DU CHIFFRE D'AFFAIRES HT SOUMIS", "MONTANT DE LA TAXE A VERSER"].map((h) => (
            <th key={h} style={{ ...TH, background: "#ddd", color: "#000" }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        <tr style={{ background: "#fff", color: "#000" }}>
          <td style={{ ...TD, background: "#fff", color: "#000" }}>CHIFFRE D'AFFAIRES RECHARGEMENT SOUMIS A 7%</td>
          <td style={{ ...TD, background: "#fff", color: "#000", textAlign: "right" }}>{fmt(b12)}</td>
          <td style={{ ...TD, background: "#fff", color: "#000", textAlign: "right" }}>{fmt(num(b12) * 0.07)}</td>
        </tr>
        <tr style={{ background: "#eee", color: "#000" }}>
          <td style={{ ...TD, background: "#eee", color: "#000" }}>CHIFFRE D'AFFAIRES GLOBAL SOUMIS A 1%</td>
          <td style={{ ...TD, background: "#eee", color: "#000", textAlign: "right" }}>{fmt(b13)}</td>
          <td style={{ ...TD, background: "#eee", color: "#000", textAlign: "right" }}>{fmt(num(b13) * 0.01)}</td>
        </tr>
      </tbody>
      <tfoot>
        <tr style={{ background: "#eee", color: "#000", fontWeight: "bold" }}>
          <td style={{ ...TD, background: "#eee", color: "#000" }}>TOTAL</td>
          <td style={{ ...TD, background: "#eee", color: "#000", textAlign: "right" }}>{fmt(totalBase)}</td>
          <td style={{ ...TD, background: "#eee", color: "#000", textAlign: "right" }}>{fmt(totalTaxe)}</td>
        </tr>
      </tfoot>
    </table>
  )
}

function TAPTable({ rows }: { rows: TAPRow[] }) {
  const getWilayaName = (code: string) =>
    WILAYAS_COMMUNES.find((entry) => entry.code === code)?.wilaya ?? "a"

  const totalImposable = rows.reduce((s, r) => s + num(r.tap2), 0)
  const totalTap = totalImposable * 0.015
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, border: "1px solid #000" }}>
      <thead>
        <tr style={{ background: "#ddd", color: "#000" }}>
          {["Code", "Wilaya", "Commune", "Montant Imposable", "TAP 1,5%"].map((h) => (
            <th key={h} style={{ ...TH, background: "#ddd", color: "#000" }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} style={{ background: "#fff", color: "#000" }}>
            <td style={{ ...TD, background: "#fff", color: "#000" }}>{r.wilayaCode || "a"}</td>
            <td style={{ ...TD, background: "#fff", color: "#000" }}>{getWilayaName(r.wilayaCode)}</td>
            <td style={{ ...TD, background: "#fff", color: "#000" }}>{r.commune || "a"}</td>
            <td style={{ ...TD, background: "#fff", color: "#000", textAlign: "right" }}>{fmt(r.tap2)}</td>
            <td style={{ ...TD, background: "#fff", color: "#000", textAlign: "right" }}>{fmt(num(r.tap2) * 0.015)}</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr style={{ background: "#eee", fontWeight: "bold", color: "#000" }}>
          <td style={{ ...TD, background: "#eee", color: "#000" }} colSpan={3}>TOTAL</td>
          <td style={{ ...TD, background: "#eee", color: "#000", textAlign: "right" }}>{fmt(totalImposable)}</td>
          <td style={{ ...TD, background: "#eee", color: "#000", textAlign: "right" }}>{fmt(totalTap)}</td>
        </tr>
      </tfoot>
    </table>
  )
}

function CaSiegeTable({ rows }: { rows: SiegeEncRow[] }) {
  if (!rows || rows.length < 12) return <p style={{ fontSize: 11, color: "#666" }}>Aucune donnAe</p>
  const g1 = rows.slice(0, 2)
  const g2 = rows.slice(2, 12)
  const t1ttc = g1.reduce((s, r) => s + num(r.ttc), 0)
  const t1ht  = g1.reduce((s, r) => s + num(r.ht), 0)
  const t2ttc = g2.reduce((s, r) => s + num(r.ttc), 0)
  const t2ht  = g2.reduce((s, r) => s + num(r.ht), 0)
  type DR = { label: string; ttc: string; ht: string; total?: boolean }
  const displayRows: DR[] = [
    ...g1.map((r, i) => ({ label: SIEGE_G1_LABELS[i], ttc: fmt(r.ttc), ht: fmt(r.ht) })),
    { label: "TOTAL 1", ttc: fmt(t1ttc), ht: fmt(t1ht), total: true },
    ...g2.map((r, i) => ({ label: SIEGE_G2_LABELS[i], ttc: fmt(r.ttc), ht: fmt(r.ht) })),
    { label: "TOTAL 2", ttc: fmt(t2ttc), ht: fmt(t2ht), total: true },
    { label: "TOTAL G\u00c9N\u00c9RAL", ttc: fmt(t1ttc + t2ttc), ht: fmt(t1ht + t2ht), total: true },
  ]
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, border: "1px solid #000" }}>
      <thead>
        <tr style={{ background: "#ddd", color: "#000" }}>
          {["D\u00e9signation", "TTC", "HT"].map(h => <th key={h} style={{ ...TH, background: "#ddd", color: "#000" }}>{h}</th>)}
        </tr>
      </thead>
      <tbody>
        {displayRows.map((r, i) => (
          <tr key={i} style={{ background: r.total ? "#eee" : "#fff", color: "#000", fontWeight: r.total ? 700 : 400 }}>
            <td style={{ ...TD, background: r.total ? "#eee" : "#fff", color: "#000" }}>{r.label}</td>
            <td style={{ ...TD, background: r.total ? "#eee" : "#fff", color: "#000", textAlign: "right" }}>{r.ttc}</td>
            <td style={{ ...TD, background: r.total ? "#eee" : "#fff", color: "#000", textAlign: "right" }}>{r.ht}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function IrgTable({ rows }: { rows: IrgRow[] }) {
  if (!rows || rows.length === 0) return <p style={{ fontSize: 11, color: "#666" }}>Aucune donnAe</p>
  const total = rows.reduce((s, r) => s + num(r.montant), 0)
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, border: "1px solid #000" }}>
      <thead>
        <tr style={{ background: "#ddd", color: "#000" }}>
          {["Désignation", "Assiette Imposable", "Montant"].map(h => <th key={h} style={{ ...TH, background: "#ddd", color: "#000" }}>{h}</th>)}
        </tr>
      </thead>
      <tbody>
        {IRG_LABELS.map((lbl, i) => (
          <tr key={i} style={{ background: "#fff", color: "#000" }}>
            <td style={{ ...TD, background: "#fff", color: "#000" }}>{lbl}</td>
            <td style={{ ...TD, background: "#fff", color: "#000", textAlign: "right" }}>{fmt(rows[i]?.assietteImposable ?? "0")}</td>
            <td style={{ ...TD, background: "#fff", color: "#000", textAlign: "right" }}>{fmt(rows[i]?.montant ?? "0")}</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr style={{ background: "#eee", fontWeight: "bold", color: "#000" }}>
          <td style={{ ...TD, background: "#eee", color: "#000" }} colSpan={2}>TOTAL</td>
          <td style={{ ...TD, background: "#eee", color: "#000", textAlign: "right" }}>{fmt(total)}</td>
        </tr>
      </tfoot>
    </table>
  )
}

function Taxe2Table({ rows }: { rows: Taxe2Row[] }) {
  if (!rows || rows.length === 0) return <p style={{ fontSize: 11, color: "#666" }}>Aucune donnAe</p>
  const totalBase = rows.reduce((s, r) => s + num(r.base), 0)
  const totalMont = rows.reduce((s, r) => s + num(r.montant), 0)
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, border: "1px solid #000" }}>
      <thead>
        <tr style={{ background: "#ddd", color: "#000" }}>
          {["Désignation", "Montant de la base", "Montant de la Taxe 2%"].map(h => <th key={h} style={{ ...TH, background: "#ddd", color: "#000" }}>{h}</th>)}
        </tr>
      </thead>
      <tbody>
        {TAXE2_LABELS.map((lbl, i) => (
          <tr key={i} style={{ background: "#fff", color: "#000" }}>
            <td style={{ ...TD, background: "#fff", color: "#000" }}>{lbl}</td>
            <td style={{ ...TD, background: "#fff", color: "#000", textAlign: "right" }}>{fmt(rows[i]?.base ?? "0")}</td>
            <td style={{ ...TD, background: "#fff", color: "#000", textAlign: "right" }}>{fmt(rows[i]?.montant ?? "0")}</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr style={{ background: "#eee", fontWeight: "bold", color: "#000" }}>
          <td style={{ ...TD, background: "#eee", color: "#000" }}>TOTAL</td>
          <td style={{ ...TD, background: "#eee", color: "#000", textAlign: "right" }}>{fmt(totalBase)}</td>
          <td style={{ ...TD, background: "#eee", color: "#000", textAlign: "right" }}>{fmt(totalMont)}</td>
        </tr>
      </tfoot>
    </table>
  )
}

function MastersTable({ rows }: { rows: MasterRow[] }) {
  if (!rows || rows.length === 0) return <p style={{ fontSize: 11, color: "#666" }}>Aucune donnAe</p>
  const totalHT   = rows.reduce((s,r)=>s+num(r.montantHT),0)
  const totalTaxe = rows.reduce((s,r)=>s+num(r.montantHT)*0.015,0)
  return (
    <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11, border:"1px solid #000" }}>
      <thead><tr style={{ background:"#ddd", color:"#000" }}>
        {["#","Date","Nom du Master","N° Facture","Date Facture","Montant de la Facture HT","Taxe 1,5%","Mois","Observation"].map(h=><th key={h} style={{...TH,background:"#ddd",color:"#000"}}>{h}</th>)}
      </tr></thead>
      <tbody>
        {rows.map((r,i)=>(
          <tr key={i} style={{background:"#fff",color:"#000"}}>
            <td style={{...TD,background:"#fff",color:"#000",textAlign:"center"}}>{i+1}</td>
            <td style={{...TD,background:"#fff",color:"#000"}}>{r.date}</td>
            <td style={{...TD,background:"#fff",color:"#000"}}>{r.nomMaster}</td>
            <td style={{...TD,background:"#fff",color:"#000"}}>{r.numFacture}</td>
            <td style={{...TD,background:"#fff",color:"#000"}}>{r.dateFacture}</td>
            <td style={{...TD,background:"#fff",color:"#000",textAlign:"right"}}>{fmt(r.montantHT)}</td>
            <td style={{...TD,background:"#fff",color:"#000",textAlign:"right"}}>{fmt(num(r.montantHT)*0.015)}</td>
            <td style={{...TD,background:"#fff",color:"#000"}}>{r.mois}</td>
            <td style={{...TD,background:"#fff",color:"#000"}}>{r.observation}</td>
          </tr>
        ))}
      </tbody>
      <tfoot><tr style={{background:"#eee",fontWeight:"bold",color:"#000"}}>
        <td style={{...TD,background:"#eee",color:"#000"}} colSpan={5}>TOTAL</td>
        <td style={{...TD,background:"#eee",color:"#000",textAlign:"right"}}>{fmt(totalHT)}</td>
        <td style={{...TD,background:"#eee",color:"#000",textAlign:"right"}}>{fmt(totalTaxe)}</td>
        <td colSpan={2} style={{...TD,background:"#eee",color:"#000"}}/>
      </tr></tfoot>
    </table>
  )
}

function Taxe11Table({ montant }: { montant: string }) {
  return (
    <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11, border:"1px solid #000" }}>
      <thead><tr style={{background:"#ddd",color:"#000"}}>
        {["Désignation","Montant"].map(h=><th key={h} style={{...TH,background:"#ddd",color:"#000"}}>{h}</th>)}
      </tr></thead>
      <tbody><tr style={{background:"#fff",color:"#000"}}>
        <td style={{...TD,background:"#fff",color:"#000"}}>Taxe de vehicule</td>
        <td style={{...TD,background:"#fff",color:"#000",textAlign:"right"}}>{fmt(montant)}</td>
      </tr></tbody>
    </table>
  )
}

function Taxe12Table({ rows }: { rows: Taxe12Row[] }) {
  if (!rows || rows.length === 0) return <p style={{ fontSize: 11, color: "#666" }}>Aucune donnAe</p>
  const total = rows.reduce((s,r)=>s+num(r.montant),0)
  return (
    <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11, border:"1px solid #000" }}>
      <thead><tr style={{background:"#ddd",color:"#000"}}>
        {["Désignation","Montant"].map(h=><th key={h} style={{...TH,background:"#ddd",color:"#000"}}>{h}</th>)}
      </tr></thead>
      <tbody>
        {TAXE12_LABELS.map((lbl,i)=>(
          <tr key={i} style={{background:"#fff",color:"#000"}}>
            <td style={{...TD,background:"#fff",color:"#000"}}>{lbl}</td>
            <td style={{...TD,background:"#fff",color:"#000",textAlign:"right"}}>{fmt(rows[i]?.montant??"0")}</td>
          </tr>
        ))}
      </tbody>
      <tfoot><tr style={{background:"#eee",fontWeight:"bold",color:"#000"}}>
        <td style={{...TD,background:"#eee",color:"#000"}}>TOTAL</td>
        <td style={{...TD,background:"#eee",color:"#000",textAlign:"right"}}>{fmt(total)}</td>
      </tr></tfoot>
    </table>
  )
}

function AcompteTable({ months, annee }: { months: string[]; annee: string }) {
  if (!months || months.length === 0) return <p style={{ fontSize: 11, color: "#666" }}>Aucune donnAe</p>
  const yy = annee.slice(-2)
  return (
    <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11, border:"1px solid #000" }}>
      <thead><tr style={{background:"#ddd",color:"#000"}}>
        <th style={{...TH,background:"#ddd",color:"#000"}}>Désignation</th>
        {MONTH_LABELS_SHORT.map(m=><th key={m} style={{...TH,background:"#ddd",color:"#000"}}>{m} {yy}</th>)}
      </tr></thead>
      <tbody><tr style={{background:"#fff",color:"#000"}}>
        <td style={{...TD,background:"#fff",color:"#000"}}>Montant</td>
        {months.map((v,i)=>(<td key={i} style={{...TD,background:"#fff",color:"#000",textAlign:"right"}}>{fmt(v)}</td>))}
      </tr></tbody>
    </table>
  )
}

function Ibs14Table({ rows }: { rows: Ibs14Row[] }) {
  if (!rows || rows.length === 0) return <p style={{ fontSize: 11, color: "#666" }}>Aucune donnAe</p>
  return (
    <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11, border:"1px solid #000" }}>
      <thead><tr style={{background:"#ddd",color:"#000"}}>
        {["#","N° Facture","Mont. Brut Devise","Taux Change","Mont. Brut Dinars","Mont. Net Devise","Mont. IBS","Mont. Net Dinars"].map(h=><th key={h} style={{...TH,background:"#ddd",color:"#000"}}>{h}</th>)}
      </tr></thead>
      <tbody>
        {rows.map((r,i)=>(
          <tr key={i} style={{background:"#fff",color:"#000"}}>
            <td style={{...TD,background:"#fff",color:"#000",textAlign:"center"}}>{i+1}</td>
            <td style={{...TD,background:"#fff",color:"#000"}}>{r.numFacture}</td>
            <td style={{...TD,background:"#fff",color:"#000",textAlign:"right"}}>{fmt(r.montantBrutDevise)}</td>
            <td style={{...TD,background:"#fff",color:"#000"}}>{r.tauxChange}</td>
            <td style={{...TD,background:"#fff",color:"#000",textAlign:"right"}}>{fmt(r.montantBrutDinars)}</td>
            <td style={{...TD,background:"#fff",color:"#000",textAlign:"right"}}>{fmt(r.montantNetDevise)}</td>
            <td style={{...TD,background:"#fff",color:"#000",textAlign:"right"}}>{fmt(r.montantIBS)}</td>
            <td style={{...TD,background:"#fff",color:"#000",textAlign:"right"}}>{fmt(r.montantNetDinars)}</td>
          </tr>
        ))}
      </tbody>
      <tfoot><tr style={{background:"#eee",fontWeight:"bold",color:"#000"}}>
        <td style={{...TD,background:"#eee",color:"#000"}} colSpan={2}>TOTAL</td>
        <td style={{...TD,background:"#eee",color:"#000",textAlign:"right"}}>{fmt(rows.reduce((s,r)=>s+num(r.montantBrutDevise),0))}</td>
        <td style={{...TD,background:"#eee",color:"#000"}}/>
        <td style={{...TD,background:"#eee",color:"#000",textAlign:"right"}}>{fmt(rows.reduce((s,r)=>s+num(r.montantBrutDinars),0))}</td>
        <td style={{...TD,background:"#eee",color:"#000",textAlign:"right"}}>{fmt(rows.reduce((s,r)=>s+num(r.montantNetDevise),0))}</td>
        <td style={{...TD,background:"#eee",color:"#000",textAlign:"right"}}>{fmt(rows.reduce((s,r)=>s+num(r.montantIBS),0))}</td>
        <td style={{...TD,background:"#eee",color:"#000",textAlign:"right"}}>{fmt(rows.reduce((s,r)=>s+num(r.montantNetDinars),0))}</td>
      </tr></tfoot>
    </table>
  )
}

function Taxe15Table({ rows }: { rows: Taxe15Row[] }) {
  if (!rows || rows.length === 0) return <p style={{ fontSize: 11, color: "#666" }}>Aucune donnAe</p>
  return (
    <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11, border:"1px solid #000" }}>
      <thead><tr style={{background:"#ddd",color:"#000"}}>
        {["#","N° Facture","Date Facture","Raison Sociale","Mont. Net Devise","Monnaie","Taux Change","Mont. Dinars","Taux Taxe","Mont. A Payer"].map(h=><th key={h} style={{...TH,background:"#ddd",color:"#000"}}>{h}</th>)}
      </tr></thead>
      <tbody>
        {rows.map((r,i)=>(
          <tr key={i} style={{background:"#fff",color:"#000"}}>
            <td style={{...TD,background:"#fff",color:"#000",textAlign:"center"}}>{i+1}</td>
            <td style={{...TD,background:"#fff",color:"#000"}}>{r.numFacture}</td>
            <td style={{...TD,background:"#fff",color:"#000"}}>{r.dateFacture}</td>
            <td style={{...TD,background:"#fff",color:"#000"}}>{r.raisonSociale}</td>
            <td style={{...TD,background:"#fff",color:"#000",textAlign:"right"}}>{fmt(r.montantNetDevise)}</td>
            <td style={{...TD,background:"#fff",color:"#000"}}>{r.monnaie}</td>
            <td style={{...TD,background:"#fff",color:"#000"}}>{r.tauxChange}</td>
            <td style={{...TD,background:"#fff",color:"#000",textAlign:"right"}}>{fmt(r.montantDinars)}</td>
            <td style={{...TD,background:"#fff",color:"#000"}}>{r.tauxTaxe}</td>
            <td style={{...TD,background:"#fff",color:"#000",textAlign:"right"}}>{fmt(r.montantAPayer)}</td>
          </tr>
        ))}
      </tbody>
      <tfoot><tr style={{background:"#eee",fontWeight:"bold",color:"#000"}}>
        <td style={{...TD,background:"#eee",color:"#000"}} colSpan={4}>TOTAL</td>
        <td style={{...TD,background:"#eee",color:"#000",textAlign:"right"}}>{fmt(rows.reduce((s,r)=>s+num(r.montantNetDevise),0))}</td>
        <td style={{...TD,background:"#eee",color:"#000"}}/><td style={{...TD,background:"#eee",color:"#000"}}/>
        <td style={{...TD,background:"#eee",color:"#000",textAlign:"right"}}>{fmt(rows.reduce((s,r)=>s+num(r.montantDinars),0))}</td>
        <td style={{...TD,background:"#eee",color:"#000"}}/>
        <td style={{...TD,background:"#eee",color:"#000",textAlign:"right"}}>{fmt(rows.reduce((s,r)=>s+num(r.montantAPayer),0))}</td>
      </tr></tfoot>
    </table>
  )
}

function Tva16Table({ rows }: { rows: Tva16Row[] }) {
  if (!rows || rows.length === 0) return <p style={{ fontSize: 11, color: "#666" }}>Aucune donnAe</p>
  return (
    <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11, border:"1px solid #000" }}>
      <thead><tr style={{background:"#ddd",color:"#000"}}>
        {["#","N° Facture","Mont. Brut Devises","Taux Change","Mont. Brut Dinars","TVA 19%"].map(h=><th key={h} style={{...TH,background:"#ddd",color:"#000"}}>{h}</th>)}
      </tr></thead>
      <tbody>
        {rows.map((r,i)=>(
          <tr key={i} style={{background:"#fff",color:"#000"}}>
            <td style={{...TD,background:"#fff",color:"#000",textAlign:"center"}}>{i+1}</td>
            <td style={{...TD,background:"#fff",color:"#000"}}>{r.numFacture}</td>
            <td style={{...TD,background:"#fff",color:"#000",textAlign:"right"}}>{fmt(r.montantBrutDevise)}</td>
            <td style={{...TD,background:"#fff",color:"#000"}}>{r.tauxChange}</td>
            <td style={{...TD,background:"#fff",color:"#000",textAlign:"right"}}>{fmt(r.montantBrutDinars)}</td>
            <td style={{...TD,background:"#fff",color:"#000",textAlign:"right"}}>{fmt(r.tva19)}</td>
          </tr>
        ))}
      </tbody>
      <tfoot><tr style={{background:"#eee",fontWeight:"bold",color:"#000"}}>
        <td style={{...TD,background:"#eee",color:"#000"}} colSpan={2}>TOTAL</td>
        <td style={{...TD,background:"#eee",color:"#000",textAlign:"right"}}>{fmt(rows.reduce((s,r)=>s+num(r.montantBrutDevise),0))}</td>
        <td style={{...TD,background:"#eee",color:"#000"}}/>
        <td style={{...TD,background:"#eee",color:"#000",textAlign:"right"}}>{fmt(rows.reduce((s,r)=>s+num(r.montantBrutDinars),0))}</td>
        <td style={{...TD,background:"#eee",color:"#000",textAlign:"right"}}>{fmt(rows.reduce((s,r)=>s+num(r.tva19),0))}</td>
      </tr></tfoot>
    </table>
  )
}

function TabDataView({ tabKey, decl, color }: { tabKey: string; decl: SavedDeclaration; color: string }) {
  switch (tabKey) {
    case "encaissement":  return <EncTable rows={decl.encRows ?? []} />
    case "tva_immo":      return <TvaTable rows={decl.tvaImmoRows ?? []} showRateColumn />
    case "tva_biens":     return <TvaTable rows={decl.tvaBiensRows ?? []} showRateColumn />
    case "droits_timbre": return <TimbreTable rows={decl.timbreRows ?? []} />
    case "ca_tap":        return <CATable b12={decl.b12 ?? ""} b13={decl.b13 ?? ""} />
    case "etat_tap":      return <TAPTable rows={decl.tapRows ?? []} />
    case "ca_siege":      return <CaSiegeTable rows={decl.caSiegeRows ?? []} />
    case "irg":           return <IrgTable rows={decl.irgRows ?? []} />
    case "taxe2":         return <Taxe2Table rows={decl.taxe2Rows ?? []} />
    case "taxe_masters":  return <MastersTable rows={decl.masterRows ?? []} />
    case "taxe_vehicule": return <Taxe11Table montant={decl.taxe11Montant ?? ""} />
    case "taxe_formation":return <Taxe12Table rows={decl.taxe12Rows ?? []} />
    case "acompte":       return <AcompteTable months={decl.acompteMonths ?? []} annee={decl.annee} />
    case "ibs":           return <Ibs14Table rows={decl.ibs14Rows ?? []} />
    case "taxe_domicil":  return <Taxe15Table rows={decl.taxe15Rows ?? []} />
    case "tva_autoliq":   return <Tva16Table rows={decl.tva16Rows ?? []} />
    default:              return null
  }
}

// aaa Print Zone aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
function DashPrintZone({ decl, tabKey, tabTitle }: {
  decl: SavedDeclaration | null; tabKey: string; tabTitle: string; color: string
}) {
  if (!decl) return null
  const moisLabel = MONTHS[decl.mois] ?? decl.mois
  return (
    <div id="dash-print-zone" style={{ fontFamily: "Arial, sans-serif", color: "#000" }}>
      {/* aa Header aa */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 100 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Logo" style={{ height: 64, objectFit: "contain" }} />
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
              DR : {decl.direction || "a"}
            </div>
          </div>
        </div>
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
            DAclaration Mois : {moisLabel}
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
            Annee : {decl.annee}
          </div>
        </div>
      </div>
      {/* aa Centered title aa */}
      <div style={{ textAlign: "center", fontSize: 20, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, color: "#222", marginBottom: 160 }}>
        {tabTitle}
      </div>
      {/* aa Table aa */}
      <TabDataView tabKey={tabKey} decl={decl} color="#555" />
    </div>
  )
}

export default function FiscaDashboardPage() {
  const { user, isLoading, status } = useAuth({ requireAuth: true, redirectTo: "/login" })
  const router = useRouter()
  const { toast } = useToast()
  const [declarations, setDeclarations] = useState<SavedDeclaration[]>([])
  const [viewDecl, setViewDecl] = useState<SavedDeclaration | null>(null)
  const [printDecl, setPrintDecl] = useState<SavedDeclaration | null>(null)
  const [showDialog, setShowDialog] = useState(false)
  const [viewTabKey, setViewTabKey] = useState<string>("encaissement")
  const [filterType, setFilterType] = useState("")
  const [filterMois, setFilterMois] = useState("")
  const [filterAnnee, setFilterAnnee] = useState("")
  const [filterDirection, setFilterDirection] = useState("")
  const [filterDateFrom, setFilterDateFrom] = useState("")
  const [filterDateTo, setFilterDateTo] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const [sortCol, setSortCol] = useState<"type"|"direction"|"periode"|"date">("date")
  const [sortDir, setSortDir] = useState<"asc"|"desc">("desc")
  const normalizedRole = (user?.role ?? "").trim().toLowerCase()
  const normalizedRegion = (user?.region ?? "").trim().toLowerCase()
  const isFinanceRole = normalizedRole === "finance" || normalizedRole === "comptabilite"
  const canApproveRegionalDeclarations = normalizedRole === "regionale" && !!user?.isRegionalApprover
  const canApproveFinanceDeclarations = isFinanceRole && !!user?.isFinanceApprover

  useEffect(() => {
    if (!user || status !== "authenticated") {
      setDeclarations([])
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
          if (!cancelled) setDeclarations([])
          return
        }

        const payload = await response.json().catch(() => null)
        const nextDeclarations = Array.isArray(payload)
          ? (payload as ApiFiscalDeclaration[]).map(mapApiDeclarationToSaved)
          : []

        if (!cancelled) {
          setDeclarations(nextDeclarations)
          try {
            localStorage.setItem("fiscal_declarations", JSON.stringify(nextDeclarations))
          } catch {
            // Ignore storage errors.
          }
        }
      } catch {
        if (!cancelled) setDeclarations([])
      }
    }

    loadDeclarations()

    return () => {
      cancelled = true
    }
  }, [status, user])

  if (isLoading || !user || status !== "authenticated") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Chargement...</p>
      </div>
    )
  }

  const isDeclarationLocked = (decl: SavedDeclaration) => isFiscalPeriodLocked(decl.mois, decl.annee, user.role)

  const showTabAccessDeniedToast = (tabLabel: string, actionLabel: "modifier" | "supprimer") => {
    toast({
      title: "a AccAs refusA",
      description: `Votre profil n'est pas autorisA A ${actionLabel} le tableau "${tabLabel}".`,
      variant: "destructive",
    })
  }

  const showPeriodLockedToast = (decl: SavedDeclaration, actionLabel: "modifier" | "supprimer") => {
    toast({
      title: "a PAriode clAturAe",
      description: `${getFiscalPeriodLockMessage(decl.mois, decl.annee, user.role)} Impossible de ${actionLabel} cette dAclaration.`,
      variant: "destructive",
    })
  }

  const handleDelete = async (decl: SavedDeclaration) => {
    const declType = getDeclarationType(decl)
    if (!canManageFiscalTab(user.role, declType.key)) {
      showTabAccessDeniedToast(declType.label, "supprimer")
      return
    }

    if (isDeclarationLocked(decl)) {
      showPeriodLockedToast(decl, "supprimer")
      return
    }

    try {
      const declarationId = Number(decl.id)
      if (!Number.isFinite(declarationId)) {
        throw new Error("ID de dAclaration invalide")
      }

      const token = typeof localStorage !== "undefined" ? localStorage.getItem("jwt") : null
      const response = await fetch(`${API_BASE}/api/fiscal/${declarationId}`, {
        method: "DELETE",
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        const message = payload && typeof payload === "object" && "message" in payload
          ? String((payload as { message?: unknown }).message ?? "")
          : ""
        throw new Error(message || "Suppression impossible")
      }

      const updated = declarations.filter((d) => d.id !== decl.id)
      setDeclarations(updated)
      try {
        localStorage.setItem("fiscal_declarations", JSON.stringify(updated))
      } catch {
        // Ignore storage errors.
      }

      toast({ title: "DAclaration supprimAe" })
    } catch (error) {
      toast({
        title: "Erreur de suppression",
        description: error instanceof Error ? error.message : "Impossible de supprimer la dAclaration.",
        variant: "destructive",
      })
    }
  }

  const handleView = (decl: SavedDeclaration, tabKey: string) => {
    setViewDecl(decl)
    setViewTabKey(tabKey)
    setShowDialog(true)
  }

  const handlePrint = (decl: SavedDeclaration, tabKey: string) => {
    setPrintDecl(decl)
    setViewTabKey(tabKey)
    setTimeout(async () => {
      const printZone = document.getElementById("dash-print-zone")
      const tableElement = printZone?.querySelector("table") as HTMLTableElement | null
      if (!printZone || !tableElement) return

      try {
        const [{ jsPDF }, { default: autoTable }] = await Promise.all([
          import("jspdf"),
          import("jspdf-autotable"),
        ])

        const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" })
        const pageW = pdf.internal.pageSize.getWidth()
        const periodText = `${MONTHS[decl.mois] ?? decl.mois} ${decl.annee}`
        const tableTitle = DASH_TABS.find((t) => t.key === tabKey)?.title ?? "TABLEAU FISCAL"
        const pdfTableTitle =
          tabKey === "ca_tap"
            ? "ETAT DU CHIFFRE D'AFFAIRES RECHARGEMENT HT (7%) et CHIFFRE D'AFFAIRES GLOBAL HT (1%)"
            : tableTitle
        const tableLabel = DASH_TABS.find((t) => t.key === tabKey)?.label ?? ""
        const tableNumberMatch = tableLabel.match(/^(\d+)/)
        const tableNumber = tableNumberMatch ? tableNumberMatch[1] : ""
        const tableNumberValue = tableNumber ? Number(tableNumber) : NaN
        const isTable7To16 = Number.isFinite(tableNumberValue) && tableNumberValue >= 7 && tableNumberValue <= 16
        const headerTitle = isTable7To16
          ? `${pdfTableTitle} Mois de ${periodText}`.trim()
          : `${pdfTableTitle} ${decl.direction || "Direction"} ${periodText}`.trim()
        const hasCustomEncHeader =
          tabKey === "encaissement" ||
          tabKey === "droits_timbre" ||
          tabKey === "ca_tap" ||
          tabKey === "etat_tap"
        const hasCustomTvaHeader = tabKey === "tva_immo" || tabKey === "tva_biens"
        const customHeaderTableLine = tableNumber
          ? `TABLEAU N° ${tableNumber} : ${pdfTableTitle}`
          : pdfTableTitle

        const drawUnderlinedText = (text: string, x: number, y: number, align: "left" | "center" | "right" = "left") => {
          pdf.text(text, x, y, { align })
          const width = pdf.getTextWidth(text)
          const startX = align === "center" ? x - width / 2 : align === "right" ? x - width : x
          pdf.setLineWidth(0.2)
          pdf.line(startX, y + 0.6, startX + width, y + 0.6)
        }

        const logo = await new Promise<HTMLImageElement | null>((resolve) => {
          const img = new Image()
          img.onload = () => resolve(img)
          img.onerror = () => resolve(null)
          img.src = "/logo_doc.png"
        })

        let tableStartY = 85

        if (hasCustomEncHeader) {
          pdf.setFont("times", "bold")
          pdf.setTextColor(0, 0, 0)

          if (logo) {
            pdf.addImage(logo, "PNG", 10, 6, 34, 16)
          }

          const headerTopY = 24

          // Left box: ATM MOBILIS / DR
          pdf.rect(10, headerTopY, 62, 14)
          pdf.line(10, headerTopY + 7, 72, headerTopY + 7)
          pdf.setFontSize(12)
          pdf.text("ATM MOBILIS", 12, headerTopY + 5)
          pdf.text(`DR : ${String(decl.direction || "")}`, 12, headerTopY + 12)

          // Right box: month/year declaration
          const rightBoxX = pageW - 72
          pdf.rect(rightBoxX, headerTopY, 62, 14)
          pdf.line(rightBoxX, headerTopY + 7, rightBoxX + 62, headerTopY + 7)
          pdf.text(`Declaration Mois : ${String(MONTHS[decl.mois] ?? decl.mois ?? "")}`, rightBoxX + 2, headerTopY + 5)
          pdf.text(`Annee : ${String(decl.annee || "")}`, rightBoxX + 2, headerTopY + 12)

          // Center title box with 2 lines.
          const baseCenterBoxW = 160
          const dynamicCenterBoxW = (() => {
            if (tabKey !== "ca_tap") return baseCenterBoxW

            const topLineWidth = pdf.getTextWidth("ETAT MENSUEL DE DECLATION G50")
            const bottomLineWidth = pdf.getTextWidth(customHeaderTableLine)
            const requiredWidth = Math.max(topLineWidth, bottomLineWidth) + 10

            // Keep margins on both sides of the page.
            return Math.min(pageW - 20, Math.max(baseCenterBoxW, requiredWidth))
          })()
          const centerBoxW = dynamicCenterBoxW
          const centerBoxX = (pageW - centerBoxW) / 2
          pdf.rect(centerBoxX, 44, centerBoxW, 14)
          pdf.line(centerBoxX, 51, centerBoxX + centerBoxW, 51)
          pdf.setFontSize(11)
          pdf.text("ETAT MENSUEL DE DECLATION G50", pageW / 2, 49, { align: "center" })
          pdf.text(customHeaderTableLine, pageW / 2, 56, { align: "center" })

          tableStartY = 66
        } else if (hasCustomTvaHeader) {
          const staticAddress = "QUARTIER DES AFFAIRES GROUPE 05 ILOT 27,28 ET 29 BAB EZZOUAR"
          const staticNifNis = "316096228742"
          const staticTin = "67547"

          // jsPDF does not embed Georgia by default; Times is used as the closest built-in serif fallback.
          pdf.setFont("times", "bold")
          pdf.setTextColor(0, 0, 0)

          // Left info box: year/month/direction.
          pdf.rect(10, 8, 62, 18)
          pdf.setFontSize(9)
          pdf.text("Annee:", 14, 13)
          pdf.text("Mois de:", 14, 18)
          pdf.text("Direction:", 14, 23)
          pdf.text(String(decl.annee || ""), 50, 13)
          pdf.text(String(MONTHS[decl.mois] ?? decl.mois ?? ""), 50, 18)
          pdf.text(String(decl.direction || ""), 50, 23)

          // Main company identity box (wider to fully contain address).
          pdf.rect(80, 10, 140, 26)
          pdf.setFontSize(8)
          pdf.text("M:", 86, 15)
          pdf.text("Activite:", 86, 19)
          pdf.text("Adresse:", 86, 23)
          pdf.text("NIF / NIS:", 86, 27)
          pdf.text("TIN:", 86, 31)
          pdf.text("AIN:", 86, 35)

          pdf.setFontSize(7.5)
          pdf.text("ATM MOBILIS", 118, 15)
          pdf.text("TELEPHONIE MOBILE", 118, 19)
          pdf.text(staticAddress, 118, 23, { maxWidth: 140 })
          pdf.text(staticNifNis, 118, 27)
          pdf.text(staticTin, 118, 31)
          pdf.text("", 118, 35)

          // Title box for TVA declaration.
          pdf.rect(10, 44, pageW - 20, 12)
          pdf.setFontSize(13)
          pdf.text("Etat de declaration de la TVA", pageW / 2, 49, { align: "center" })
          pdf.setFont("times", "italic")
          pdf.setFontSize(8)
          pdf.text("(Conformement a l'article 92 de la loi de Finances pour 2021)", pageW / 2, 53, { align: "center" })
          pdf.setFont("times", "bold")

          tableStartY = 64
        } else {
          if (logo) {
            pdf.addImage(logo, "PNG", 10, 8, 38, 20)
          }

          pdf.setFont("times", "bold")
          pdf.setFontSize(11)
          // One visual line break after the logo, then the requested identity lines.
          drawUnderlinedText("ATM MOBILIS SPA", 10, 36)
          drawUnderlinedText("DIRECTION DES FINANCES ET DE LA COMPTABILITE", 10, 41)
          drawUnderlinedText("SOUS DIRECTION FISCALITE", 10, 46)
          // Add a line break before the table title, then place it on the left.
          pdf.setFontSize(14)
          drawUnderlinedText(headerTitle, 10, 56, "left")
        }

        autoTable(pdf, {
          html: tableElement,
          startY: tableStartY,
          theme: "grid",
          useCss: true,
          margin: { left: 10, right: 10, top: tableStartY, bottom: 10 },
          styles: {
            font: "times",
            fontSize: 10,
            cellPadding: 0.8,
            lineColor: [210, 210, 210],
            lineWidth: 0.1,
            textColor: [0, 0, 0],
          },
          headStyles: {
            fillColor: [221, 221, 221],
            textColor: [0, 0, 0],
            font: "times",
            fontStyle: "bold",
            fontSize: 10,
          },
          bodyStyles: {
            textColor: [0, 0, 0],
            font: "times",
            fontSize: 10,
          },
          didParseCell: (data) => {
            // Normalize thousand separators for PDF output: use spaces instead of slashes
            data.cell.text = data.cell.text.map((line) =>
              line
                .replace(/\//g, " ")
                .replace(/\u00A0/g, " ")
            )
          },
          horizontalPageBreak: true,
          horizontalPageBreakRepeat: [0],
        })

        const blobUrl = URL.createObjectURL(pdf.output("blob"))
        window.open(blobUrl, "_blank")
      } catch (err) {
        console.error("PDF generation failed", err)
      }
    }, 200)
  }

  const handleEdit = (decl: SavedDeclaration, tabKey: string) => {
    const declType = getDeclarationType(decl)
    if (!canManageFiscalTab(user.role, declType.key)) {
      showTabAccessDeniedToast(declType.label, "modifier")
      return
    }

    if (isDeclarationLocked(decl)) {
      showPeriodLockedToast(decl, "modifier")
      return
    }

    router.push(`/declaration?editId=${encodeURIComponent(decl.id)}&tab=${encodeURIComponent(tabKey)}`)
  }

  const handleApprove = async (decl: SavedDeclaration) => {
    if (!canApproveRegionalDeclarations && !canApproveFinanceDeclarations) {
      toast({
        title: "AccAs refusA",
        description: "Seuls les comptes approbateurs (rAgional ou finance) peuvent valider les dAclarations.",
        variant: "destructive",
      })
      return
    }

    const declarationId = Number(decl.id)
    if (!Number.isFinite(declarationId)) {
      toast({ title: "Erreur", description: "ID de dAclaration invalide", variant: "destructive" })
      return
    }

    try {
      const token = typeof localStorage !== "undefined" ? localStorage.getItem("jwt") : null
      const response = await fetch(`${API_BASE}/api/fiscal/${declarationId}/approve`, {
        method: "POST",
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        const message = payload && typeof payload === "object" && "message" in payload
          ? String((payload as { message?: unknown }).message ?? "")
          : "Approbation impossible"
        throw new Error(message)
      }

      const nowIso = new Date().toISOString()
      const updated = declarations.map((item) =>
        item.id === decl.id
          ? {
              ...item,
              isApproved: true,
              approvedAt: typeof payload?.approvedAt === "string" ? payload.approvedAt : nowIso,
              approvedByUserId: typeof payload?.approvedByUserId === "number" ? payload.approvedByUserId : Number(user.id),
            }
          : item,
      )

      setDeclarations(updated)
      try {
        localStorage.setItem("fiscal_declarations", JSON.stringify(updated))
      } catch {
        // Ignore storage errors.
      }

      toast({ title: "DAclaration approuvAe" })
    } catch (error) {
      toast({
        title: "Erreur d'approbation",
        description: error instanceof Error ? error.message : "Impossible d'approuver la dAclaration.",
        variant: "destructive",
      })
    }
  }

  const getDeclarationType = (decl: SavedDeclaration) => {
    if ((decl.encRows?.length ?? 0) > 0) return { key: "encaissement", label: "Encaissement", color: "#2db34b" }
    if ((decl.tvaImmoRows?.length ?? 0) > 0) return { key: "tva_immo", label: "TVA / IMMO", color: "#1d6fb8" }
    if ((decl.tvaBiensRows?.length ?? 0) > 0) return { key: "tva_biens", label: "TVA / Biens & Serv", color: "#7c3aed" }
    if ((decl.timbreRows?.length ?? 0) > 0) return { key: "droits_timbre", label: "Droits Timbre", color: "#0891b2" }
    if (decl.b12 || decl.b13) return { key: "ca_tap", label: "CA 7% & CA Glob 1%", color: "#ea580c" }
    if ((decl.tapRows?.length ?? 0) > 0) return { key: "etat_tap", label: "ETAT TAP", color: "#be123c" }
    if ((decl.caSiegeRows?.length ?? 0) > 0) return { key: "ca_siege", label: "CA Si\u00e8ge", color: "#854d0e" }
    if ((decl.irgRows?.length ?? 0) > 0) return { key: "irg", label: "Situation IRG", color: "#0f766e" }
    if ((decl.taxe2Rows?.length ?? 0) > 0) return { key: "taxe2", label: "Taxe 2%", color: "#6d28d9" }
    if ((decl.masterRows?.length ?? 0) > 0) return { key: "taxe_masters", label: "Taxe des Master 1,5%", color: "#0369a1" }
    if (decl.taxe11Montant) return { key: "taxe_vehicule", label: "Taxe Vehicule", color: "#92400e" }
    if ((decl.taxe12Rows?.length ?? 0) > 0) return { key: "taxe_formation", label: "Taxe Formation", color: "#065f46" }
    if ((decl.acompteMonths?.length ?? 0) > 0) return { key: "acompte", label: "Acompte Provisionnel", color: "#1e40af" }
    if ((decl.ibs14Rows?.length ?? 0) > 0) return { key: "ibs", label: "IBS Fournisseurs Etrangers", color: "#7c2d12" }
    if ((decl.taxe15Rows?.length ?? 0) > 0) return { key: "taxe_domicil", label: "Taxe Domiciliation", color: "#134e4a" }
    if ((decl.tva16Rows?.length ?? 0) > 0) return { key: "tva_autoliq", label: "TVA Auto Liquidation", color: "#312e81" }
    return { key: "encaissement", label: "Non dAfini", color: "#6b7280" }
  }

  const hasActiveFilters = !!(filterType || filterMois || filterAnnee || filterDirection || filterDateFrom || filterDateTo)

  const filteredDeclarations = declarations.filter((decl) => {
    const declType = getDeclarationType(decl)
    if (filterType && declType.key !== filterType) return false
    if (filterMois && decl.mois !== filterMois) return false
    if (filterAnnee && decl.annee !== filterAnnee) return false
    if (filterDirection && !(decl.direction ?? "").toLowerCase().includes(filterDirection.toLowerCase())) return false
    if (filterDateFrom && new Date(decl.createdAt) < new Date(filterDateFrom)) return false
    if (filterDateTo && new Date(decl.createdAt) > new Date(filterDateTo + "T23:59:59")) return false
    return true
  })

  const recentDeclarations = [...filteredDeclarations].sort((a, b) => {
    let cmp = 0
    if (sortCol === "date") {
      cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    } else if (sortCol === "type") {
      cmp = getDeclarationType(a).label.localeCompare(getDeclarationType(b).label, "fr")
    } else if (sortCol === "direction") {
      cmp = (a.direction ?? "").localeCompare(b.direction ?? "", "fr")
    } else if (sortCol === "periode") {
      cmp = (a.annee + a.mois).localeCompare(b.annee + b.mois)
    }
    return sortDir === "asc" ? cmp : -cmp
  })

  const handleSort = (col: "type" | "direction" | "periode" | "date") => {
    if (sortCol === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    else { setSortCol(col); setSortDir("asc") }
  }

  const SortIcon = ({ col }: { col: "type" | "direction" | "periode" | "date" }) =>
    sortCol === col
      ? sortDir === "asc" ? <ChevronUp size={13} className="inline ml-0.5" /> : <ChevronDown size={13} className="inline ml-0.5" />
      : <span className="inline-block w-3" />

  return (
    <LayoutWrapper user={user}>
      {/* Off-screen zone for PDF generation */}
      <style>{`
        #dash-print-zone {
          position: fixed;
          left: -9999px;
          top: 0;
          width: max-content;
          min-width: 1280px;
          max-width: 2400px;
          background: #fff;
          padding: 44px 40px;
          font-family: Arial, sans-serif;
          pointer-events: none;
          z-index: -1;
          color: #000;
        }
        #dash-print-zone table {
          width: 100% !important;
          border-collapse: collapse !important;
          margin-top: 50px !important;
          font-size: 14px !important;
        }
        #dash-print-zone th, #dash-print-zone td {
          border: 1.5px solid #333 !important;
          padding: 1px 4px !important;
          font-size: 14px !important;
          vertical-align: middle !important;
          line-height: 1.3 !important;
          color: #000 !important;
          direction: ltr !important;
        }
        #dash-print-zone th {
          font-weight: 700 !important;
          background: #2db34b !important;
          color: #fff !important;
          text-align: center !important;
          white-space: nowrap !important;
          font-size: 13px !important;
        }
        #dash-print-zone td { white-space: nowrap !important; text-align: left !important; }
        #dash-print-zone tbody td { background: #fff !important; text-align: left !important; }
        #dash-print-zone tbody td:not(:first-child) { text-align: center !important; }
        #dash-print-zone tbody tr[style*="font-weight:700"] td,
        #dash-print-zone tbody tr[style*="font-weight: 700"] td,
        #dash-print-zone tbody tr[style*="font-weight:bold"] td,
        #dash-print-zone tbody tr[style*="font-weight: bold"] td {
          background: #2db34b !important;
          color: #000 !important;
          font-weight: 800 !important;
          text-align: center !important;
        }
        #dash-print-zone tfoot td {
          font-weight: 700 !important;
          background: #2db34b !important;
          color: #000 !important;
          font-size: 14px !important;
          text-align: center !important;
        }
      `}</style>
      {/* Hidden print zone a content read by handlePrint via innerHTML */}
      <DashPrintZone
        decl={printDecl}
        tabKey={viewTabKey}
        tabTitle={DASH_TABS.find((t) => t.key === viewTabKey)?.title ?? ""}
        color={DASH_TABS.find((t) => t.key === viewTabKey)?.color ?? "#000"}
      />

      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard Fiscal</h1>
          <p className="text-sm text-muted-foreground mt-1">
            DAclarations fiscales rAcentes
          </p>
        </div>

        {/* Recent declarations */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-base">
                DAclarations rAcentes
                {declarations.length > 0 && (
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    ({filteredDeclarations.length}{hasActiveFilters ? ` / ${declarations.length}` : ""})
                  </span>
                )}
              </CardTitle>
              <div className="flex items-center gap-2">
                {hasActiveFilters && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 text-xs text-muted-foreground hover:text-red-500"
                    onClick={() => { setFilterType(""); setFilterMois(""); setFilterAnnee(""); setFilterDirection(""); setFilterDateFrom(""); setFilterDateTo("") }}
                  >
                    <X size={14} className="mr-1" /> Effacer filtres
                  </Button>
                )}
                <Button
                  size="sm"
                  variant={showFilters ? "secondary" : "outline"}
                  className="h-8 text-xs"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <Filter size={14} className="mr-1" /> Filtrer
                </Button>
              </div>
            </div>
            {showFilters && (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6 text-sm">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Type</label>
                  <select value={filterType} onChange={e => setFilterType(e.target.value)} className="w-full border rounded px-2 py-1.5 text-xs">
                    <option value="">Tous</option>
                    <option value="encaissement">Encaissement</option>
                    <option value="tva_immo">TVA / IMMO</option>
                    <option value="tva_biens">TVA / Biens &amp; Serv</option>
                    <option value="droits_timbre">Droits Timbre</option>
                    <option value="ca_tap">CA 7% &amp; CA Glob 1%</option>
                    <option value="etat_tap">ETAT TAP</option>
                    <option value="ca_siege">CA SiAge</option>
                    <option value="irg">Situation IRG</option>
                    <option value="taxe2">Taxe 2%</option>
                    <option value="taxe_masters">Taxe des Master 1,5%</option>
                    <option value="taxe_vehicule">Taxe Vehicule</option>
                    <option value="taxe_formation">Taxe Formation</option>
                    <option value="acompte">Acompte Provisionnel</option>
                    <option value="ibs">IBS Etrangers</option>
                    <option value="taxe_domicil">Taxe Domiciliation</option>
                    <option value="tva_autoliq">TVA Auto Liquidation</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Mois</label>
                  <select value={filterMois} onChange={e => setFilterMois(e.target.value)} className="w-full border rounded px-2 py-1.5 text-xs">
                    <option value="">Tous</option>
                    {Object.entries(MONTHS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">AnnAe</label>
                  <input type="number" placeholder="ex: 2025" value={filterAnnee} onChange={e => setFilterAnnee(e.target.value)} className="w-full border rounded px-2 py-1.5 text-xs" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Direction</label>
                  <input type="text" placeholder="Rechercher..." value={filterDirection} onChange={e => setFilterDirection(e.target.value)} className="w-full border rounded px-2 py-1.5 text-xs" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Du</label>
                  <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} className="w-full border rounded px-2 py-1.5 text-xs" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Au</label>
                  <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} className="w-full border rounded px-2 py-1.5 text-xs" />
                </div>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {recentDeclarations.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Aucune dAclaration fiscale enregistrAe pour le moment.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="cursor-pointer select-none" onClick={() => handleSort("type")}>
                        Type de dAclaration <SortIcon col="type" />
                      </TableHead>
                      <TableHead className="cursor-pointer select-none" onClick={() => handleSort("direction")}>
                        Direction <SortIcon col="direction" />
                      </TableHead>
                      <TableHead className="cursor-pointer select-none" onClick={() => handleSort("periode")}>
                        PAriode <SortIcon col="periode" />
                      </TableHead>
                      <TableHead className="cursor-pointer select-none" onClick={() => handleSort("date")}>
                        Date d&apos;enregistrement <SortIcon col="date" />
                      </TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentDeclarations.map((decl) => {
                      const declType = getDeclarationType(decl)
                      const isLocked = isDeclarationLocked(decl)
                      const canManage = canManageFiscalTab(user.role, declType.key)
                      const declarationDirection = (decl.direction ?? "").trim().toLowerCase()
                      const isSiegeDeclaration = declarationDirection === "siAge"
                        || declarationDirection === "siege"
                        || declarationDirection.includes("siAge")
                        || declarationDirection.includes("siege")
                      const isOwnDeclaration = String(decl.userId ?? "") === String(user.id)
                      const canApproveAsRegional = canApproveRegionalDeclarations
                        && !decl.isApproved
                        && !isOwnDeclaration
                        && !!normalizedRegion
                        && declarationDirection === normalizedRegion
                      const canApproveAsFinance = canApproveFinanceDeclarations
                        && !decl.isApproved
                        && !isOwnDeclaration
                        && isSiegeDeclaration
                      const canApproveThisDeclaration = canApproveAsRegional || canApproveAsFinance
                      return (
                        <TableRow
                          key={decl.id}
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => handleView(decl, declType.key)}
                          title="Cliquer pour consulter"
                        >
                          <TableCell>
                            <Badge variant="outline" className="text-xs" style={{ borderColor: declType.color, color: declType.color }}>
                              {declType.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{decl.direction || <span className="text-muted-foreground italic">a</span>}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {MONTHS[decl.mois] || decl.mois} {decl.annee}
                            </Badge>
                            {isLocked && (
                              <Badge variant="secondary" className="ml-2 text-[10px] text-red-600">
                                ClAturAe
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(decl.createdAt).toLocaleString("fr-DZ", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false })}
                          </TableCell>
                          <TableCell>
                            {decl.isApproved ? (
                              <Badge className="bg-emerald-100 text-emerald-800">ApprouvAe</Badge>
                            ) : (
                              <Badge variant="outline" className="text-amber-700 border-amber-400">En attente</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-2">
                              {(canApproveRegionalDeclarations || canApproveFinanceDeclarations) && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 w-8 p-0 border-emerald-300 text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40"
                                  disabled={!canApproveThisDeclaration}
                                  onClick={(event) => {
                                    event.stopPropagation()
                                    handleApprove(decl)
                                  }}
                                  title={decl.isApproved ? "DAclaration dAjA approuvAe" : !canApproveThisDeclaration ? "Action non autorisAe pour cette dAclaration" : "Approuver"}
                                >
                                  <CheckCircle size={16} />
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                                disabled={isLocked || !canManage}
                                onClick={(event) => {
                                  event.stopPropagation()
                                  handleDelete(decl)
                                }}
                                title={!canManage ? "Profil non autorisA pour ce tableau" : isLocked ? "PAriode clAturAe (suppression impossible)" : "Supprimer"}
                              >
                                <Trash2 size={16} />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}

          </CardContent>
        </Card>
      </div>

      {/* aa Consult Dialog aa */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="!w-[69vw] !max-w-[69vw] h-[66vh] max-h-[66vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-4">
              <span style={{ color: DASH_TABS.find((t) => t.key === viewTabKey)?.color }}>
                {DASH_TABS.find((t) => t.key === viewTabKey)?.title}
              </span>
              {viewDecl && (
                <div className="flex items-center gap-3 text-sm font-normal text-muted-foreground">
                  <span>{viewDecl.direction}</span>
                  <span>A</span>
                  <span>{MONTHS[viewDecl.mois] ?? viewDecl.mois} {viewDecl.annee}</span>
                  {(() => {
                    const currentDeclType = getDeclarationType(viewDecl)
                    const isLocked = isDeclarationLocked(viewDecl)
                    const canManage = canManageFiscalTab(user.role, currentDeclType.key)

                    return (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-xs h-8 ml-2 border-amber-300 text-amber-700 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-40"
                        disabled={isLocked || !canManage}
                        title={!canManage ? "Profil non autorisA pour ce tableau" : isLocked ? "PAriode clAturAe (modification impossible)" : "Modifier"}
                        onClick={() => {
                          setShowDialog(false)
                          handleEdit(viewDecl, viewTabKey)
                        }}
                      >
                        <Pencil size={13} /> Modifier
                      </Button>
                    )
                  })()}
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-xs h-8 ml-2"
                    onClick={() => { setShowDialog(false); if (viewDecl) handlePrint(viewDecl, viewTabKey) }}
                  >
                    <Printer size={13} /> Imprimer
                  </Button>
                </div>
              )}
            </DialogTitle>
          </DialogHeader>
          {viewDecl && (
            <div className="mt-2 overflow-x-auto">
              <TabDataView tabKey={viewTabKey} decl={viewDecl} color={DASH_TABS.find((t) => t.key === viewTabKey)?.color ?? "#000"} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </LayoutWrapper>
  )
}


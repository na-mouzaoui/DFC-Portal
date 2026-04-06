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
import { CheckCircle, Trash2, Printer, Filter, ChevronUp, ChevronDown, X, Pencil, Clock3, CalendarDays, Building2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { getFiscalPeriodLockMessage, isFiscalPeriodLocked } from "@/lib/fiscal-period-deadline"
import { canManageFiscalTab } from "@/lib/fiscal-tab-access"
import { syncFiscalPolicy } from "@/lib/fiscal-policy"
import { getFiscalReminders, type ReminderData } from "@/lib/fiscal-reminders"
import { RemindersCard } from "@/components/fiscal-reminders-card"
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
  "Jetons de présence 15%", "Tantieme 15%",
]
const TAXE2_LABELS = ["Taxe sur l'importation des biens et services"]
const TAXE12_LABELS = ["Taxe de Formation Professionnelle 1%", "Taxe d'Apprentissage 1%"]
const MONTH_LABELS_SHORT = ["Janv","Fév","Mars","Avr","Mai","Juin","Juil","Août","Sept","Oct","Nov","Déc"]

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
  "01": "Janvier", "02": "Février", "03": "Mars", "04": "Avril",
  "05": "Mai", "06": "Juin", "07": "Juillet", "08": "Août",
  "09": "Septembre", "10": "Octobre", "11": "Novembre", "12": "Décembre",
}

const DASH_TABS = [
  { key: "encaissement",  label: "1 - Encaissement",       color: "#2db34b", title: "ETAT DES ENCAISSEMENTS" },
  { key: "tva_immo",      label: "2 - TVA / IMMO",         color: "#1d6fb8", title: "ETAT TVA / IMMOBILISATIONS" },
  { key: "tva_biens",     label: "3 - TVA / Biens & Serv", color: "#7c3aed", title: "ETAT TVA / BIENS & SERVICES" },
  { key: "droits_timbre", label: "4 - Droits Timbre",      color: "#0891b2", title: "ETAT DROITS DE TIMBRE" },
  { key: "ca_tap",        label: "5 - CA 7% & CA Glob 1%", color: "#ea580c", title: "CA 7% & CA GLOBAL 1%" },
  { key: "etat_tap",      label: "6 - ETAT TAP",           color: "#be123c", title: "ETAT TAP" },
  { key: "ca_siege",      label: "7 a CA Siège",           color: "#854d0e", title: "CHIFFRE D'AFFAIRE ENCAISSÉ SIÈGE" },
  { key: "irg",           label: "8 a Situation IRG",      color: "#0f766e", title: "SITUATION IRG" },
  { key: "taxe2",         label: "9 a Taxe 2%",            color: "#6d28d9", title: "SITUATION DE LA TAXE 2%" },
  { key: "taxe_masters",  label: "10 a Taxe des Master 1,5%", color: "#0369a1", title: "ÉTAT DE LA TAXE 1,5% DES MASTERS" },
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
    <Table>
      <TableHeader>
        <TableRow>
          {["DESIGNATIONS", "ENCAISSEMENTS HT", "TVA", "ENCAISSEMENTS TTC"].map((h) => (
            <TableHead key={h} className={h !== "DESIGNATIONS" ? "text-right" : undefined}>{h}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {computedRows.map((r, i) => (
          <TableRow key={i}>
            <TableCell>{r.designation || "-"}</TableCell>
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

function TvaTable({ rows, showRateColumn = false }: { rows: TvaRow[]; showRateColumn?: boolean }) {
  const tHT  = rows.reduce((s, r) => s + num(r.montantHT), 0)
  const tTVA = rows.reduce((s, r) => s + getTvaAmount(r, showRateColumn), 0)
  const tTTC = tHT + tTVA
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {["Nom/Raison Sociale","Adresse","NIF","Auth. NIF","N° RC","Auth. RC","N° Facture","Date","Montant HT", ...(showRateColumn ? ["Taux TVA"] : []), "TVA","Montant TTC"].map((h) => (
            <TableHead key={h} className={["Montant HT", "TVA", "Montant TTC", "Taux TVA"].includes(h) ? "text-right" : undefined}>{h}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r, i) => {
          const rowTva = getTvaAmount(r, showRateColumn)
          return <TableRow key={i}>
            <TableCell className="text-xs">{textForPdf(r.nomRaisonSociale)}</TableCell>
            <TableCell className="text-xs">{textForPdf(r.adresse)}</TableCell>
            <TableCell className="text-xs">{textForPdf(r.nif)}</TableCell>
            <TableCell className="text-xs">{textForPdf(r.authNif)}</TableCell>
            <TableCell className="text-xs">{textForPdf(r.numRC)}</TableCell>
            <TableCell className="text-xs">{textForPdf(r.authRC)}</TableCell>
            <TableCell className="text-xs">{r.numFacture || "-"}</TableCell>
            <TableCell className="text-xs">{r.dateFacture || "-"}</TableCell>
            <TableCell className="text-right text-xs font-semibold">{fmt(r.montantHT)}</TableCell>
            {showRateColumn && <TableCell className="text-center text-xs">{getTvaRateLabel(r.tauxTVA)}</TableCell>}
            <TableCell className="text-right text-xs font-semibold">{showRateColumn && r.montantHT && normalizeTvaRate(r.tauxTVA) ? fmt(rowTva) : fmt(r.tva)}</TableCell>
            <TableCell className="text-right text-xs font-semibold">{fmt(num(r.montantHT) + rowTva)}</TableCell>
          </TableRow>
        })}
        <TableRow className="font-bold bg-muted">
          <TableCell colSpan={8}>TOTAL</TableCell>
          <TableCell className="text-right font-bold">{fmt(tHT)}</TableCell>
          {showRateColumn && <TableCell></TableCell>}
          <TableCell className="text-right font-bold">{fmt(tTVA)}</TableCell>
          <TableCell className="text-right font-bold">{fmt(tTTC)}</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  )
}

function TimbreTable({ rows }: { rows: TimbreRow[] }) {
  const totalCA = rows.reduce((s, r) => s + num(r.caTTCEsp), 0)
  const totalDroit = rows.reduce((s, r) => s + num(r.droitTimbre), 0)

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {["DESIGNATIONS", "CHIFFRE D'AFFAIRES TTC", "DROITS DE TIMBRE"].map((h) => (
            <TableHead key={h} className={h !== "DESIGNATIONS" ? "text-right" : undefined}>{h}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r, i) => (
          <TableRow key={i}>
            <TableCell>{r.designation || "-"}</TableCell>
            <TableCell className="text-right font-semibold">{fmt(r.caTTCEsp)}</TableCell>
            <TableCell className="text-right font-semibold">{fmt(r.droitTimbre)}</TableCell>
          </TableRow>
        ))}
        <TableRow className="font-bold bg-muted">
          <TableCell>TOTAL</TableCell>
          <TableCell className="text-right font-bold">{fmt(totalCA)}</TableCell>
          <TableCell className="text-right font-bold">{fmt(totalDroit)}</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  )
}

function CATable({ b12, b13 }: { b12: string; b13: string }) {
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

function TAPTable({ rows }: { rows: TAPRow[] }) {
  const getWilayaName = (code: string) =>
    WILAYAS_COMMUNES.find((entry) => entry.code === code)?.wilaya ?? "-"

  const totalImposable = rows.reduce((s, r) => s + num(r.tap2), 0)
  const totalTap = totalImposable * 0.015
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {["Code", "Wilaya", "Commune", "Montant Imposable", "TAP 1,5%"].map((h) => (
            <TableHead key={h} className={["Montant Imposable", "TAP 1,5%"].includes(h) ? "text-right" : undefined}>{h}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r, i) => (
          <TableRow key={i}>
            <TableCell>{r.wilayaCode || "-"}</TableCell>
            <TableCell>{getWilayaName(r.wilayaCode)}</TableCell>
            <TableCell>{r.commune || "-"}</TableCell>
            <TableCell className="text-right font-semibold">{fmt(r.tap2)}</TableCell>
            <TableCell className="text-right font-semibold">{fmt(num(r.tap2) * 0.015)}</TableCell>
          </TableRow>
        ))}
        <TableRow className="font-bold bg-muted">
          <TableCell colSpan={3}>TOTAL</TableCell>
          <TableCell className="text-right font-bold">{fmt(totalImposable)}</TableCell>
          <TableCell className="text-right font-bold">{fmt(totalTap)}</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  )
}

function CaSiegeTable({ rows }: { rows: SiegeEncRow[] }) {
  if (!rows || rows.length < 12) return <div className="text-xs text-muted-foreground">Aucune donnée</div>
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
    { label: "TOTAL GÉNÉRAL", ttc: fmt(t1ttc + t2ttc), ht: fmt(t1ht + t2ht), total: true },
  ]
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {["Désignation", "TTC", "HT"].map(h => <TableHead key={h} className={h !== "Désignation" ? "text-right" : undefined}>{h}</TableHead>)}
        </TableRow>
      </TableHeader>
      <TableBody>
        {displayRows.map((r, i) => (
          <TableRow key={i} className={r.total ? "font-bold bg-muted" : ""}>
            <TableCell>{r.label}</TableCell>
            <TableCell className="text-right font-semibold">{r.ttc}</TableCell>
            <TableCell className="text-right font-semibold">{r.ht}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function IrgTable({ rows }: { rows: IrgRow[] }) {
  if (!rows || rows.length === 0) return <div className="text-xs text-muted-foreground">Aucune donnée</div>
  const total = rows.reduce((s, r) => s + num(r.montant), 0)
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {["Désignation", "Assiette Imposable", "Montant"].map(h => <TableHead key={h} className={h !== "Désignation" ? "text-right" : undefined}>{h}</TableHead>)}
        </TableRow>
      </TableHeader>
      <TableBody>
        {IRG_LABELS.map((lbl, i) => (
          <TableRow key={i}>
            <TableCell>{lbl}</TableCell>
            <TableCell className="text-right font-semibold">{fmt(rows[i]?.assietteImposable ?? "0")}</TableCell>
            <TableCell className="text-right font-semibold">{fmt(rows[i]?.montant ?? "0")}</TableCell>
          </TableRow>
        ))}
        <TableRow className="font-bold bg-muted">
          <TableCell colSpan={2}>TOTAL</TableCell>
          <TableCell className="text-right font-bold">{fmt(total)}</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  )
}

function Taxe2Table({ rows }: { rows: Taxe2Row[] }) {
  if (!rows || rows.length === 0) return <div className="text-xs text-muted-foreground">Aucune donnée</div>
  const totalBase = rows.reduce((s, r) => s + num(r.base), 0)
  const totalMont = rows.reduce((s, r) => s + num(r.montant), 0)
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {["Désignation", "Montant de la base", "Montant de la Taxe 2%"].map(h => <TableHead key={h} className={h !== "Désignation" ? "text-right" : undefined}>{h}</TableHead>)}
        </TableRow>
      </TableHeader>
      <TableBody>
        {TAXE2_LABELS.map((lbl, i) => (
          <TableRow key={i}>
            <TableCell>{lbl}</TableCell>
            <TableCell className="text-right font-semibold">{fmt(rows[i]?.base ?? "0")}</TableCell>
            <TableCell className="text-right font-semibold">{fmt(rows[i]?.montant ?? "0")}</TableCell>
          </TableRow>
        ))}
        <TableRow className="font-bold bg-muted">
          <TableCell>TOTAL</TableCell>
          <TableCell className="text-right font-bold">{fmt(totalBase)}</TableCell>
          <TableCell className="text-right font-bold">{fmt(totalMont)}</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  )
}

function MastersTable({ rows }: { rows: MasterRow[] }) {
  if (!rows || rows.length === 0) return <div className="text-xs text-muted-foreground">Aucune donnée</div>
  const totalHT   = rows.reduce((s,r)=>s+num(r.montantHT),0)
  const totalTaxe = rows.reduce((s,r)=>s+num(r.montantHT)*0.015,0)
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {["#","Date","Nom du Master","N° Facture","Date Facture","Montant HT","Taxe 1,5%","Mois","Observation"].map(h=><TableHead key={h} className={["Montant HT","Taxe 1,5%"].includes(h) ? "text-right" : undefined}>{h}</TableHead>)}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r,i)=>(
          <TableRow key={i}>
            <TableCell className="text-center">{i+1}</TableCell>
            <TableCell>{r.date}</TableCell>
            <TableCell className="text-xs">{r.nomMaster}</TableCell>
            <TableCell>{r.numFacture}</TableCell>
            <TableCell>{r.dateFacture}</TableCell>
            <TableCell className="text-right font-semibold">{fmt(r.montantHT)}</TableCell>
            <TableCell className="text-right font-semibold">{fmt(num(r.montantHT)*0.015)}</TableCell>
            <TableCell className="text-xs">{r.mois}</TableCell>
            <TableCell className="text-xs">{r.observation}</TableCell>
          </TableRow>
        ))}
        <TableRow className="font-bold bg-muted">
          <TableCell colSpan={5}>TOTAL</TableCell>
          <TableCell className="text-right font-bold">{fmt(totalHT)}</TableCell>
          <TableCell className="text-right font-bold">{fmt(totalTaxe)}</TableCell>
          <TableCell colSpan={2}/>
        </TableRow>
      </TableBody>
    </Table>
  )
}

function Taxe11Table({ montant }: { montant: string }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {["Désignation","Montant"].map(h=><TableHead key={h} className={h !== "Désignation" ? "text-right" : undefined}>{h}</TableHead>)}
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell>Taxe de véhicule</TableCell>
          <TableCell className="text-right font-semibold">{fmt(montant)}</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  )
}

function Taxe12Table({ rows }: { rows: Taxe12Row[] }) {
  if (!rows || rows.length === 0) return <div className="text-xs text-muted-foreground">Aucune donnée</div>
  const total = rows.reduce((s,r)=>s+num(r.montant),0)
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {["Désignation","Montant"].map(h=><TableHead key={h} className={h !== "Désignation" ? "text-right" : undefined}>{h}</TableHead>)}
        </TableRow>
      </TableHeader>
      <TableBody>
        {TAXE12_LABELS.map((lbl,i)=>(
          <TableRow key={i}>
            <TableCell>{lbl}</TableCell>
            <TableCell className="text-right font-semibold">{fmt(rows[i]?.montant??"0")}</TableCell>
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

function AcompteTable({ months, annee }: { months: string[]; annee: string }) {
  if (!months || months.length === 0) return <div className="text-xs text-muted-foreground">Aucune donnée</div>
  const yy = annee.slice(-2)
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Désignation</TableHead>
          {MONTH_LABELS_SHORT.map(m=><TableHead key={m} className="text-center">{m} {yy}</TableHead>)}
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell>Montant</TableCell>
          {months.map((v,i)=>(<TableCell key={i} className="text-right font-semibold">{fmt(v)}</TableCell>))}
        </TableRow>
      </TableBody>
    </Table>
  )
}

function Ibs14Table({ rows }: { rows: Ibs14Row[] }) {
  if (!rows || rows.length === 0) return <div className="text-xs text-muted-foreground">Aucune donnée</div>
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {["#","N° Facture","Mont. Brut Devise","Taux Change","Mont. Brut Dinars","Mont. Net Devise","Mont. IBS","Mont. Net Dinars"].map(h=><TableHead key={h} className={h === "#" || h === "Taux Change" || h === "N° Facture" ? undefined : "text-right"}>{h}</TableHead>)}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r,i)=>(
          <TableRow key={i}>
            <TableCell className="text-center">{i+1}</TableCell>
            <TableCell>{r.numFacture}</TableCell>
            <TableCell className="text-right font-semibold">{fmt(r.montantBrutDevise)}</TableCell>
            <TableCell>{r.tauxChange}</TableCell>
            <TableCell className="text-right font-semibold">{fmt(r.montantBrutDinars)}</TableCell>
            <TableCell className="text-right font-semibold">{fmt(r.montantNetDevise)}</TableCell>
            <TableCell className="text-right font-semibold">{fmt(r.montantIBS)}</TableCell>
            <TableCell className="text-right font-semibold">{fmt(r.montantNetDinars)}</TableCell>
          </TableRow>
        ))}
        <TableRow className="font-bold bg-muted">
          <TableCell colSpan={2}>TOTAL</TableCell>
          <TableCell className="text-right font-bold">{fmt(rows.reduce((s,r)=>s+num(r.montantBrutDevise),0))}</TableCell>
          <TableCell/>
          <TableCell className="text-right font-bold">{fmt(rows.reduce((s,r)=>s+num(r.montantBrutDinars),0))}</TableCell>
          <TableCell className="text-right font-bold">{fmt(rows.reduce((s,r)=>s+num(r.montantNetDevise),0))}</TableCell>
          <TableCell className="text-right font-bold">{fmt(rows.reduce((s,r)=>s+num(r.montantIBS),0))}</TableCell>
          <TableCell className="text-right font-bold">{fmt(rows.reduce((s,r)=>s+num(r.montantNetDinars),0))}</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  )
}

function Taxe15Table({ rows }: { rows: Taxe15Row[] }) {
  if (!rows || rows.length === 0) return <div className="text-xs text-muted-foreground">Aucune donnée</div>
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {["#","N° Facture","Date Facture","Raison Sociale","Mont. Net Devise","Monnaie","Taux Change","Mont. Dinars","Taux Taxe","Mont. A Payer"].map(h=><TableHead key={h} className={["Mont. Net Devise","Mont. Dinars","Mont. A Payer"].includes(h) ? "text-right" : undefined}>{h}</TableHead>)}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r,i)=>(
          <TableRow key={i}>
            <TableCell className="text-center">{i+1}</TableCell>
            <TableCell className="text-xs">{r.numFacture}</TableCell>
            <TableCell className="text-xs">{r.dateFacture}</TableCell>
            <TableCell className="text-xs">{r.raisonSociale}</TableCell>
            <TableCell className="text-right font-semibold">{fmt(r.montantNetDevise)}</TableCell>
            <TableCell>{r.monnaie}</TableCell>
            <TableCell>{r.tauxChange}</TableCell>
            <TableCell className="text-right font-semibold">{fmt(r.montantDinars)}</TableCell>
            <TableCell className="text-xs">{r.tauxTaxe}</TableCell>
            <TableCell className="text-right font-semibold">{fmt(r.montantAPayer)}</TableCell>
          </TableRow>
        ))}
        <TableRow className="font-bold bg-muted">
          <TableCell colSpan={4}>TOTAL</TableCell>
          <TableCell className="text-right font-bold">{fmt(rows.reduce((s,r)=>s+num(r.montantNetDevise),0))}</TableCell>
          <TableCell/><TableCell/>
          <TableCell className="text-right font-bold">{fmt(rows.reduce((s,r)=>s+num(r.montantDinars),0))}</TableCell>
          <TableCell/>
          <TableCell className="text-right font-bold">{fmt(rows.reduce((s,r)=>s+num(r.montantAPayer),0))}</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  )
}

function Tva16Table({ rows }: { rows: Tva16Row[] }) {
  if (!rows || rows.length === 0) return <div className="text-xs text-muted-foreground">Aucune donnée</div>
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {["#","N° Facture","Mont. Brut Devises","Taux Change","Mont. Brut Dinars","TVA 19%"].map(h=><TableHead key={h} className={["Mont. Brut Devises","Mont. Brut Dinars","TVA 19%"].includes(h) ? "text-right" : undefined}>{h}</TableHead>)}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r,i)=>(
          <TableRow key={i}>
            <TableCell className="text-center">{i+1}</TableCell>
            <TableCell>{r.numFacture}</TableCell>
            <TableCell className="text-right font-semibold">{fmt(r.montantBrutDevise)}</TableCell>
            <TableCell>{r.tauxChange}</TableCell>
            <TableCell className="text-right font-semibold">{fmt(r.montantBrutDinars)}</TableCell>
            <TableCell className="text-right font-semibold">{fmt(r.tva19)}</TableCell>
          </TableRow>
        ))}
        <TableRow className="font-bold bg-muted">
          <TableCell colSpan={2}>TOTAL</TableCell>
          <TableCell className="text-right font-bold">{fmt(rows.reduce((s,r)=>s+num(r.montantBrutDevise),0))}</TableCell>
          <TableCell/>
          <TableCell className="text-right font-bold">{fmt(rows.reduce((s,r)=>s+num(r.montantBrutDinars),0))}</TableCell>
          <TableCell className="text-right font-bold">{fmt(rows.reduce((s,r)=>s+num(r.tva19),0))}</TableCell>
        </TableRow>
      </TableBody>
    </Table>
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
            Déclaration Mois : {moisLabel}
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
  const [reminders, setReminders] = useState<ReminderData[]>([])
  const [remindersLoading, setRemindersLoading] = useState(true)
  const [regions, setRegions] = useState<Array<{ id: number; name: string }>>([])
  const [, setFiscalPolicyRevision] = useState(0)
  const normalizedRole = (user?.role ?? "").trim().toLowerCase()
  const normalizedRegion = (user?.region ?? "").trim().toLowerCase()
  const isFinanceRole = normalizedRole === "finance" || normalizedRole === "comptabilite"
  const canApproveRegionalDeclarations = normalizedRole === "regionale" && !!user?.isRegionalApprover
  const canApproveFinanceDeclarations = isFinanceRole && !!user?.isFinanceApprover

  useEffect(() => {
    if (!user || status !== "authenticated") return

    let cancelled = false

    const syncPolicy = async () => {
      await syncFiscalPolicy()
      if (!cancelled) {
        setFiscalPolicyRevision((prev) => prev + 1)
      }
    }

    syncPolicy()

    return () => {
      cancelled = true
    }
  }, [status, user])

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

  useEffect(() => {
    if (!user || status !== "authenticated") {
      setReminders([])
      setRemindersLoading(false)
      return
    }

    let cancelled = false
    setRemindersLoading(true)

    const loadReminders = async () => {
      try {
        const data = await getFiscalReminders()
        if (!cancelled) {
          setReminders(data)
        }
      } catch {
        if (!cancelled) setReminders([])
      } finally {
        if (!cancelled) setRemindersLoading(false)
      }
    }

    loadReminders()

    return () => {
      cancelled = true
    }
  }, [status, user])

  useEffect(() => {
    if (!user || status !== "authenticated") {
      setRegions([])
      return
    }

    let cancelled = false

    const loadRegions = async () => {
      try {
        const token = typeof localStorage !== "undefined" ? localStorage.getItem("jwt") : null
        const response = await fetch(`${API_BASE}/api/regions`, {
          method: "GET",
          credentials: "include",
          cache: "no-store",
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        })

        if (!response.ok) {
          if (!cancelled) setRegions([])
          return
        }

        const payload = await response.json().catch(() => null)
        const nextRegions = Array.isArray(payload)
          ? payload
              .map((item) => ({
                id: Number((item as { id?: unknown }).id ?? 0),
                name: String((item as { name?: unknown }).name ?? "").trim(),
              }))
              .filter((item) => item.name.length > 0)
          : []

        if (!cancelled) {
          setRegions(nextRegions)
        }
      } catch {
        if (!cancelled) setRegions([])
      }
    }

    loadRegions()

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
      title: "Accès refusé",
      description: `Votre profil n'est pas autorisé à ${actionLabel} le tableau "${tabLabel}".`,
      variant: "destructive",
    })
  }

  const showPeriodLockedToast = (decl: SavedDeclaration, actionLabel: "modifier" | "supprimer") => {
    toast({
      title: "Période clôturée",
      description: `${getFiscalPeriodLockMessage(decl.mois, decl.annee, user.role)} Impossible de ${actionLabel} cette déclaration.`,
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
        throw new Error("ID de déclaration invalide")
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

      toast({ title: "Déclaration supprimée" })
    } catch (error) {
      toast({
        title: "Erreur de suppression",
        description: error instanceof Error ? error.message : "Impossible de supprimer la déclaration.",
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
        title: "Accès refusé",
        description: "Seuls les comptes approbateurs (régional ou finance) peuvent valider les déclarations.",
        variant: "destructive",
      })
      return
    }

    const declarationId = Number(decl.id)
    if (!Number.isFinite(declarationId)) {
      toast({ title: "Erreur", description: "ID de déclaration invalide", variant: "destructive" })
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

      toast({ title: "Déclaration approuvée" })
    } catch (error) {
      toast({
        title: "Erreur d'approbation",
        description: error instanceof Error ? error.message : "Impossible d'approuver la déclaration.",
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
    return { key: "encaissement", label: "Non défini", color: "#6b7280" }
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

  const reminderDirectionOptions = (() => {
    const normalizeDirection = (value: string) => {
      const normalized = value.trim().toLowerCase()
      if (!normalized) return ""
      if (normalized === "siege" || normalized === "siège" || normalized.includes("siege") || normalized.includes("siège")) {
        return "Siège"
      }
      return value.trim()
    }

    const regionNames = regions.map((region) => normalizeDirection(region.name))

    const allDirections = [
      ...regionNames,
      ...(regionNames.length === 0 ? declarations.map((d) => normalizeDirection(d.direction ?? "")) : []),
      ...(regionNames.length === 0 ? reminders.map((r) => normalizeDirection(r.direction ?? "")) : []),
      "Siège",
    ].filter(Boolean)

    return Array.from(new Set(allDirections)).sort((a, b) => a.localeCompare(b, "fr"))
  })()

  const viewTab = DASH_TABS.find((t) => t.key === viewTabKey)
  const viewTabColor = viewTab?.color ?? "#000"
  const viewTabTitle = viewTab?.title ?? ""

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
        tabTitle={viewTabTitle}
        color={viewTabColor}
      />

      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard Fiscal</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Déclarations fiscales récentes
          </p>
        </div>

        <RemindersCard
          reminders={reminders}
          loading={remindersLoading}
          userRole={user.role}
          directionOptions={reminderDirectionOptions}
        />

        {/* Recent declarations */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-base">
                Déclarations récentes
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
                    className="h-8 text-xs text-muted-foreground hover:text-emerald-600"
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
                    <option value="ca_siege">CA Siège</option>
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
                  <label className="text-xs text-muted-foreground block mb-1">Année</label>
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
                Aucune déclaration fiscale enregistrée pour le moment.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="cursor-pointer select-none" onClick={() => handleSort("type")}>
                        Type de déclaration <SortIcon col="type" />
                      </TableHead>
                      <TableHead className="cursor-pointer select-none" onClick={() => handleSort("direction")}>
                        Direction <SortIcon col="direction" />
                      </TableHead>
                      <TableHead className="cursor-pointer select-none" onClick={() => handleSort("periode")}>
                        Période <SortIcon col="periode" />
                      </TableHead>
                      <TableHead className="cursor-pointer select-none" onClick={() => handleSort("date")}>
                        Date d&apos;enregistrement <SortIcon col="date" />
                      </TableHead>
                      <TableHead className="w-20 text-center">Statut</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentDeclarations.map((decl) => {
                      const declType = getDeclarationType(decl)
                      const isLocked = isDeclarationLocked(decl)
                      const canManage = canManageFiscalTab(user.role, declType.key)
                      const declarationDirection = (decl.direction ?? "").trim().toLowerCase()
                      const isSiegeDeclaration = declarationDirection === "siège"
                        || declarationDirection === "siege"
                        || declarationDirection.includes("siège")
                        || declarationDirection.includes("siege")
                      const isOwnDeclaration = String(decl.userId ?? "") === String(user.id)
                      const canApproveAsRegional = canApproveRegionalDeclarations
                        && !decl.isApproved
                        && (isOwnDeclaration || (!!normalizedRegion && declarationDirection === normalizedRegion))
                      const canApproveAsFinance = canApproveFinanceDeclarations
                        && !decl.isApproved
                        && (isOwnDeclaration || isSiegeDeclaration)
                      const canApproveThisDeclaration = canApproveAsRegional || canApproveAsFinance
                      return (
                        <TableRow
                          key={decl.id}
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => handleView(decl, declType.key)}
                          title="Cliquer pour consulter"
                        >
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {declType.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{decl.direction || <span className="text-muted-foreground italic">a</span>}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {MONTHS[decl.mois] || decl.mois} {decl.annee}
                            </Badge>
                            {isLocked && (
                              <Badge variant="secondary" className="ml-2 text-[10px] text-emerald-700">
                                Clôturée
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(decl.createdAt).toLocaleString("fr-DZ", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false })}
                          </TableCell>
                          <TableCell className="w-20 p-0 align-middle">
                            <div className="flex items-center justify-center">
                              {decl.isApproved ? (
                                <span className="inline-flex" title="Approuvée" aria-label="Approuvée">
                                  <CheckCircle className="h-4 w-4 text-emerald-600" />
                                </span>
                              ) : (
                                <span className="inline-flex" title="En attente" aria-label="En attente">
                                  <Clock3 className="h-4 w-4 text-amber-600" />
                                </span>
                              )}
                            </div>
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
                                  title={decl.isApproved ? "Déclaration déjà approuvée" : !canApproveThisDeclaration ? "Action non autorisée pour cette déclaration" : "Approuver"}
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
                                title={!canManage ? "Profil non autorisé pour ce tableau" : isLocked ? "Période clôturée (suppression impossible)" : "Supprimer"}
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
        <DialogContent className="!w-[95vw] sm:!w-[90vw] xl:!w-[74vw] !max-w-[1200px] h-[82vh] p-0 overflow-hidden">
          <div className="border-b bg-gradient-to-r from-slate-50 to-white px-6 py-4">
            <DialogHeader className="space-y-3">
              <DialogTitle className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-base font-semibold leading-tight" style={{ color: viewTabColor }}>
                    {viewTabTitle}
                  </p>
                </div>
              </DialogTitle>
              {viewDecl && (
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="secondary" className="gap-1.5 font-normal">
                    <Building2 size={12} /> {viewDecl.direction || "-"}
                  </Badge>
                  <Badge variant="secondary" className="gap-1.5 font-normal">
                    <CalendarDays size={12} /> {MONTHS[viewDecl.mois] ?? viewDecl.mois} {viewDecl.annee}
                  </Badge>
                </div>
              )}
            </DialogHeader>
          </div>
          {viewDecl && (
            <div className="h-[calc(82vh-140px)] overflow-auto bg-slate-50/60 px-6 py-5">
              <div className="rounded-xl border bg-white p-4 shadow-sm">
                <div className="overflow-x-auto">
                  <TabDataView tabKey={viewTabKey} decl={viewDecl} color={viewTabColor} />
                </div>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                {(() => {
                  const currentDeclType = getDeclarationType(viewDecl)
                  const isLocked = isDeclarationLocked(viewDecl)
                  const canManage = canManageFiscalTab(user.role, currentDeclType.key)

                  return (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-xs h-8 border-emerald-300 text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40"
                      disabled={isLocked || !canManage}
                      title={!canManage ? "Profil non autorisé pour ce tableau" : isLocked ? "Période clôturée (modification impossible)" : "Modifier"}
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
                  className="gap-1.5 text-xs h-8 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                  onClick={() => { setShowDialog(false); if (viewDecl) handlePrint(viewDecl, viewTabKey) }}
                >
                  <Printer size={13} /> Imprimer
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </LayoutWrapper>
  )
}



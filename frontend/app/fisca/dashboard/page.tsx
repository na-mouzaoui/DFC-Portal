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
import { FileText, CheckCircle, Clock, AlertTriangle, Eye, Trash2, Printer } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

type EncRow = { designation: string; ttc: string }
type TvaRow = { nomRaisonSociale: string; adresse: string; nif: string; authNif: string; numRC: string; authRC: string; numFacture: string; dateFacture: string; montantHT: string; tva: string }
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
  "IRG sur Salaire Barème", "Autre IRG 10%", "Autre IRG 15%",
  "Jetons de présence 15%", "Tantième 15%",
]
const TAXE2_LABELS = ["Taxe sur l'importation des biens et services"]
const TAXE12_LABELS = ["Taxe de Formation Professionnelle 1%", "Taxe d'Apprentissage 1%"]
const MONTH_LABELS_SHORT = ["Janv","Fév","Mars","Avr","Mai","Juin","Juil","Août","Sept","Oct","Nov","Déc"]

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

const MONTHS: Record<string, string> = {
  "01": "Janvier", "02": "Février", "03": "Mars", "04": "Avril",
  "05": "Mai", "06": "Juin", "07": "Juillet", "08": "Août",
  "09": "Septembre", "10": "Octobre", "11": "Novembre", "12": "Décembre",
}

const DASH_TABS = [
  { key: "encaissement",  label: "1 – Encaissement",       color: "#2db34b", title: "ENCAISSEMENT" },
  { key: "tva_immo",      label: "2 – TVA / IMMO",         color: "#1d6fb8", title: "ÉTAT TVA / IMMOBILISATIONS" },
  { key: "tva_biens",     label: "3 – TVA / Biens & Serv", color: "#7c3aed", title: "ÉTAT TVA / BIENS & SERVICES" },
  { key: "droits_timbre", label: "4 – Droits Timbre",      color: "#0891b2", title: "ÉTAT DROITS DE TIMBRE" },
  { key: "ca_tap",        label: "5 – CA 7% & CA Glob 1%", color: "#ea580c", title: "CA 7% & CA GLOBAL 1%" },
  { key: "etat_tap",      label: "6 – ETAT TAP",           color: "#be123c", title: "ÉTAT TAP" },
  { key: "ca_siege",      label: "7 – CA Siège",           color: "#854d0e", title: "CHIFFRE D'AFFAIRE ENCAISSÉ SIÈGE" },
  { key: "irg",           label: "8 – Situation IRG",      color: "#0f766e", title: "SITUATION IRG" },
  { key: "taxe2",         label: "9 – Taxe 2%",            color: "#6d28d9", title: "SITUATION DE LA TAXE 2%" },
  { key: "taxe_masters",  label: "10 – Taxe Maîtres 1,5%", color: "#0369a1", title: "ÉTAT DE LA TAXE 1,5% DES MASTERS" },
  { key: "taxe_vehicule", label: "11 – Taxe Véhicule",      color: "#92400e", title: "TAXE DE VÉHICULE" },
  { key: "taxe_formation",label: "12 – Taxe Formation",     color: "#065f46", title: "TAXE DE FORMATION" },
  { key: "acompte",       label: "13 – Acompte Provisionnel", color: "#1e40af", title: "SITUATION DE L'ACOMPTE PROVISIONNEL" },
  { key: "ibs",           label: "14 – IBS Fournisseurs Étrangers", color: "#7c2d12", title: "IBS SUR FOURNISSEURS ÉTRANGERS" },
  { key: "taxe_domicil",  label: "15 – Taxe Domiciliation", color: "#134e4a", title: "TAXE DOMICILIATION BANCAIRE" },
  { key: "tva_autoliq",   label: "16 – TVA Auto Liquidation", color: "#312e81", title: "TVA AUTO LIQUIDATION" },
]

// ─── Shared styles & helpers ──────────────────────────────────────────────────
const fmt = (v: number | string) =>
  isNaN(Number(v)) || v === "" ? "–" : Number(v).toLocaleString("fr-DZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const num = (v: string) => parseFloat(v) || 0
const TH: React.CSSProperties = { border: "1px solid #d1d5db", padding: "5px 8px", textAlign: "left", fontWeight: 600 }
const TD: React.CSSProperties = { border: "1px solid #e5e7eb", padding: "4px 8px" }

function EncTable({ rows }: { rows: EncRow[] }) {
  const total = rows.reduce((s, r) => s + num(r.ttc), 0)
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, border: "1px solid #000" }}>
      <thead>
        <tr style={{ background: "#ddd", color: "#000" }}>
          {["Désignation", "TTC", "HT (÷1.19)", "TVA (TTC−HT)"].map((h) => (
            <th key={h} style={{ ...TH, background: "#ddd", color: "#000" }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => {
          const ht = num(r.ttc) / 1.19
          const tva = num(r.ttc) - ht
          return (
            <tr key={i} style={{ background: "#fff", color: "#000" }}>
              <td style={{ ...TD, background: "#fff", color: "#000" }}>{r.designation || "—"}</td>
              <td style={{ ...TD, background: "#fff", color: "#000", textAlign: "right" }}>{fmt(r.ttc)}</td>
              <td style={{ ...TD, background: "#fff", color: "#000", textAlign: "right" }}>{fmt(ht)}</td>
              <td style={{ ...TD, background: "#fff", color: "#000", textAlign: "right" }}>{fmt(tva)}</td>
            </tr>
          )
        })}
      </tbody>
      <tfoot>
        <tr style={{ background: "#eee", color: "#000", fontWeight: "bold" }}>
          <td style={{ ...TD, background: "#eee", color: "#000" }}>TOTAL</td>
          <td style={{ ...TD, background: "#eee", color: "#000", textAlign: "right" }}>{fmt(total)}</td>
          <td style={{ ...TD, background: "#eee", color: "#000", textAlign: "right" }}>{fmt(total / 1.19)}</td>
          <td style={{ ...TD, background: "#eee", color: "#000", textAlign: "right" }}>{fmt(total - total / 1.19)}</td>
        </tr>
      </tfoot>
    </table>
  )
}

function TvaTable({ rows }: { rows: TvaRow[] }) {
  const tHT  = rows.reduce((s, r) => s + num(r.montantHT), 0)
  const tTVA = rows.reduce((s, r) => s + num(r.tva), 0)
  const tTTC = tHT + tTVA
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10, border: "1px solid #000" }}>
      <thead>
        <tr style={{ background: "#ddd", color: "#000" }}>
          {["Nom / Raison Sociale","Adresse","NIF","Auth. NIF","N° RC","Auth. N° RC","N° Facture","Date","Montant HT","TVA","Montant TTC"].map((h) => (
            <th key={h} style={{ ...TH, background: "#ddd", color: "#000" }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} style={{ background: "#fff", color: "#000" }}>
            <td style={{ ...TD, background: "#fff", color: "#000" }}>{r.nomRaisonSociale || "—"}</td>
            <td style={{ ...TD, background: "#fff", color: "#000" }}>{r.adresse || "—"}</td>
            <td style={{ ...TD, background: "#fff", color: "#000" }}>{r.nif || "—"}</td>
            <td style={{ ...TD, background: "#fff", color: "#000" }}>{r.authNif || "—"}</td>
            <td style={{ ...TD, background: "#fff", color: "#000" }}>{r.numRC || "—"}</td>
            <td style={{ ...TD, background: "#fff", color: "#000" }}>{r.authRC || "—"}</td>
            <td style={{ ...TD, background: "#fff", color: "#000" }}>{r.numFacture || "—"}</td>
            <td style={{ ...TD, background: "#fff", color: "#000" }}>{r.dateFacture || "—"}</td>
            <td style={{ ...TD, background: "#fff", color: "#000", textAlign: "right" }}>{fmt(r.montantHT)}</td>
            <td style={{ ...TD, background: "#fff", color: "#000", textAlign: "right" }}>{fmt(r.tva)}</td>
            <td style={{ ...TD, background: "#fff", color: "#000", textAlign: "right" }}>{fmt(num(r.montantHT) + num(r.tva))}</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr style={{ background: "#eee", color: "#000", fontWeight: "bold" }}>
          <td colSpan={8} style={{ ...TD, background: "#eee", color: "#000" }}>TOTAL</td>
          <td style={{ ...TD, background: "#eee", color: "#000", textAlign: "right" }}>{fmt(tHT)}</td>
          <td style={{ ...TD, background: "#eee", color: "#000", textAlign: "right" }}>{fmt(tTVA)}</td>
          <td style={{ ...TD, background: "#eee", color: "#000", textAlign: "right" }}>{fmt(tTTC)}</td>
        </tr>
      </tfoot>
    </table>
  )
}

function TimbreTable({ rows }: { rows: TimbreRow[] }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, border: "1px solid #000" }}>
      <thead>
        <tr style={{ background: "#ddd", color: "#000" }}>
          {["Désignation", "CA TTC Espèces", "Droit de Timbre"].map((h) => (
            <th key={h} style={{ ...TH, background: "#ddd", color: "#000" }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} style={{ background: "#fff", color: "#000" }}>
            <td style={{ ...TD, background: "#fff", color: "#000" }}>{r.designation || "—"}</td>
            <td style={{ ...TD, background: "#fff", color: "#000", textAlign: "right" }}>{fmt(r.caTTCEsp)}</td>
            <td style={{ ...TD, background: "#fff", color: "#000", textAlign: "right" }}>{fmt(r.droitTimbre)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function CATable({ b12, b13 }: { b12: string; b13: string }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, border: "1px solid #000" }}>
      <thead>
        <tr style={{ background: "#ddd", color: "#000" }}>
          {["Ligne", "Base (B)", "Taux", "Montant"].map((h) => (
            <th key={h} style={{ ...TH, background: "#ddd", color: "#000" }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        <tr style={{ background: "#fff", color: "#000" }}>
          <td style={{ ...TD, background: "#fff", color: "#000" }}>B12 – CA 7%</td>
          <td style={{ ...TD, background: "#fff", color: "#000", textAlign: "right" }}>{fmt(b12)}</td>
          <td style={{ ...TD, background: "#fff", color: "#000", textAlign: "right" }}>7%</td>
          <td style={{ ...TD, background: "#fff", color: "#000", textAlign: "right" }}>{fmt(num(b12) * 0.07)}</td>
        </tr>
        <tr style={{ background: "#eee", color: "#000" }}>
          <td style={{ ...TD, background: "#eee", color: "#000" }}>B13 – CA Global 1%</td>
          <td style={{ ...TD, background: "#eee", color: "#000", textAlign: "right" }}>{fmt(b13)}</td>
          <td style={{ ...TD, background: "#eee", color: "#000", textAlign: "right" }}>1%</td>
          <td style={{ ...TD, background: "#eee", color: "#000", textAlign: "right" }}>{fmt(num(b13) * 0.01)}</td>
        </tr>
      </tbody>
    </table>
  )
}

function TAPTable({ rows }: { rows: TAPRow[] }) {
  const total = rows.reduce((s, r) => s + num(r.tap2), 0)
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, border: "1px solid #000" }}>
      <thead>
        <tr style={{ background: "#ddd", color: "#000" }}>
          {["Wilaya", "Commune", "TAP 2%"].map((h) => (
            <th key={h} style={{ ...TH, background: "#ddd", color: "#000" }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} style={{ background: "#fff", color: "#000" }}>
            <td style={{ ...TD, background: "#fff", color: "#000" }}>{r.wilayaCode || "—"}</td>
            <td style={{ ...TD, background: "#fff", color: "#000" }}>{r.commune || "—"}</td>
            <td style={{ ...TD, background: "#fff", color: "#000", textAlign: "right" }}>{fmt(r.tap2)}</td>
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

function CaSiegeTable({ rows }: { rows: SiegeEncRow[] }) {
  if (!rows || rows.length < 12) return <p style={{ fontSize: 11, color: "#666" }}>Aucune donnée</p>
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
  if (!rows || rows.length === 0) return <p style={{ fontSize: 11, color: "#666" }}>Aucune donnée</p>
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
  if (!rows || rows.length === 0) return <p style={{ fontSize: 11, color: "#666" }}>Aucune donnée</p>
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
  if (!rows || rows.length === 0) return <p style={{ fontSize: 11, color: "#666" }}>Aucune donnée</p>
  const totalHT   = rows.reduce((s,r)=>s+num(r.montantHT),0)
  const totalTaxe = rows.reduce((s,r)=>s+num(r.montantHT)*0.015,0)
  return (
    <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11, border:"1px solid #000" }}>
      <thead><tr style={{ background:"#ddd", color:"#000" }}>
        {["#","Date","Nom du Master","N° Facture","Date Facture","Montant HT","Taxe 1,5%","Mois","Observation"].map(h=><th key={h} style={{...TH,background:"#ddd",color:"#000"}}>{h}</th>)}
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
        <td style={{...TD,background:"#fff",color:"#000"}}>Taxe de véhicule</td>
        <td style={{...TD,background:"#fff",color:"#000",textAlign:"right"}}>{fmt(montant)}</td>
      </tr></tbody>
      <tfoot><tr style={{background:"#eee",fontWeight:"bold",color:"#000"}}>
        <td style={{...TD,background:"#eee",color:"#000"}}>TOTAL</td>
        <td style={{...TD,background:"#eee",color:"#000",textAlign:"right"}}>{fmt(montant)}</td>
      </tr></tfoot>
    </table>
  )
}

function Taxe12Table({ rows }: { rows: Taxe12Row[] }) {
  if (!rows || rows.length === 0) return <p style={{ fontSize: 11, color: "#666" }}>Aucune donnée</p>
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
  if (!months || months.length === 0) return <p style={{ fontSize: 11, color: "#666" }}>Aucune donnée</p>
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
  if (!rows || rows.length === 0) return <p style={{ fontSize: 11, color: "#666" }}>Aucune donnée</p>
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
  if (!rows || rows.length === 0) return <p style={{ fontSize: 11, color: "#666" }}>Aucune donnée</p>
  return (
    <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11, border:"1px solid #000" }}>
      <thead><tr style={{background:"#ddd",color:"#000"}}>
        {["#","N° Facture","Date Facture","Raison Sociale","Mont. Net Devise","Monnaie","Taux Change","Mont. Dinars","Taux Taxe","Mont. à Payer"].map(h=><th key={h} style={{...TH,background:"#ddd",color:"#000"}}>{h}</th>)}
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
  if (!rows || rows.length === 0) return <p style={{ fontSize: 11, color: "#666" }}>Aucune donnée</p>
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
    case "tva_immo":      return <TvaTable rows={decl.tvaImmoRows ?? []} />
    case "tva_biens":     return <TvaTable rows={decl.tvaBiensRows ?? []} />
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

// ─── Print Zone ───────────────────────────────────────────────────────────────
function DashPrintZone({ decl, tabKey, tabTitle, color }: {
  decl: SavedDeclaration | null; tabKey: string; tabTitle: string; color: string
}) {
  if (!decl) return null
  const moisLabel = MONTHS[decl.mois] ?? decl.mois
  return (
    <div id="dash-print-zone" style={{ display: "none", fontFamily: "Arial, sans-serif" }}>
      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 40 }}>
        {/* LEFT – logo + ATM MOBILIS + direction */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Logo" style={{ height: 52, objectFit: "contain" }} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 900, color: "#000", letterSpacing: 0.5, textTransform: "uppercase" }}>ATM MOBILIS</div>
            {decl.direction && <div style={{ fontSize: 11, color: "#000", marginTop: 2 }}>{decl.direction}</div>}
          </div>
        </div>
        {/* RIGHT – période */}
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 10, color: "#000", textTransform: "uppercase", letterSpacing: 0.5 }}>Période</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#000" }}>{moisLabel} {decl.annee}</div>
        </div>
      </div>
      {/* ── Centered title ── */}
      <div style={{ textAlign: "center", fontSize: 15, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.5, color: "#000", marginBottom: 32 }}>
        {tabTitle}
      </div>
      {/* ── Table ── */}
      <TabDataView tabKey={tabKey} decl={decl} color={color} />
    </div>
  )
}

const statCards = [
  {
    label: "Déclarations ce mois",
    value: "0",
    icon: FileText,
    color: "#2db34b",
  },
  {
    label: "Déclarations validées",
    value: "0",
    icon: CheckCircle,
    color: "#2563eb",
  },
  {
    label: "En attente",
    value: "0",
    icon: Clock,
    color: "#f59e0b",
  },
  {
    label: "Rejetées",
    value: "0",
    icon: AlertTriangle,
    color: "#e82c2a",
  },
]

export default function FiscaDashboardPage() {
  const { user, isLoading, status } = useAuth({ requireAuth: true, redirectTo: "/login" })
  const router = useRouter()
  const { toast } = useToast()
  const [declarations, setDeclarations] = useState<SavedDeclaration[]>([])
  const [viewDecl, setViewDecl] = useState<SavedDeclaration | null>(null)
  const [printDecl, setPrintDecl] = useState<SavedDeclaration | null>(null)
  const [showDialog, setShowDialog] = useState(false)
  const [viewTabKey, setViewTabKey] = useState<string>("encaissement")

  useEffect(() => {
    try {
      const raw = localStorage.getItem("fiscal_declarations")
      setDeclarations(raw ? JSON.parse(raw) : [])
    } catch {
      setDeclarations([])
    }
  }, [])

  if (isLoading || !user || status !== "authenticated") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Chargement...</p>
      </div>
    )
  }

  const handleDelete = (id: string) => {
    const updated = declarations.filter((d) => d.id !== id)
    setDeclarations(updated)
    try {
      localStorage.setItem("fiscal_declarations", JSON.stringify(updated))
    } catch { }
    toast({ title: "Déclaration supprimée" })
  }

  const handleView = (decl: SavedDeclaration, tabKey: string) => {
    setViewDecl(decl)
    setViewTabKey(tabKey)
    setShowDialog(true)
  }

  const handlePrint = (decl: SavedDeclaration, tabKey: string) => {
    setPrintDecl(decl)
    setViewTabKey(tabKey)
    setTimeout(() => {
      const el = document.getElementById('dash-print-zone')
      if (!el) return
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Impression</title><base href="${window.location.origin}"><style>@page{size:A4 landscape;margin:15mm 12mm}body{font-family:Arial,sans-serif;margin:0;padding:30px 20px 20px;color:#000;background:#fff}*{background:#fff!important;background-color:#fff!important;color:#000!important}img{background:none!important}table{width:100%;border-collapse:collapse;border:2px solid #000!important}th,td{border:2px solid #000!important;padding:6px 10px!important;font-size:11px}th{font-weight:700;text-align:center!important}td[colspan]{text-align:right}.print-btn{position:fixed;top:14px;right:18px;z-index:9999}@media print{.print-btn{display:none}}</style></head><body><div class="print-btn"><button onclick="window.print()" style="background:#2db34b;color:white;border:none;padding:8px 20px;border-radius:6px;cursor:pointer;font-size:14px;font-weight:600;font-family:Arial,sans-serif;box-shadow:0 2px 8px rgba(0,0,0,.18)">🖨️ Imprimer / PDF</button></div>${el.innerHTML}</body></html>`
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
      setTimeout(() => URL.revokeObjectURL(url), 60000)
    }, 300)
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
    if ((decl.masterRows?.length ?? 0) > 0) return { key: "taxe_masters", label: "Taxe Maîtres 1,5%", color: "#0369a1" }
    if (decl.taxe11Montant) return { key: "taxe_vehicule", label: "Taxe Véhicule", color: "#92400e" }
    if ((decl.taxe12Rows?.length ?? 0) > 0) return { key: "taxe_formation", label: "Taxe Formation", color: "#065f46" }
    if ((decl.acompteMonths?.length ?? 0) > 0) return { key: "acompte", label: "Acompte Provisionnel", color: "#1e40af" }
    if ((decl.ibs14Rows?.length ?? 0) > 0) return { key: "ibs", label: "IBS Fournisseurs Étrangers", color: "#7c2d12" }
    if ((decl.taxe15Rows?.length ?? 0) > 0) return { key: "taxe_domicil", label: "Taxe Domiciliation", color: "#134e4a" }
    if ((decl.tva16Rows?.length ?? 0) > 0) return { key: "tva_autoliq", label: "TVA Auto Liquidation", color: "#312e81" }
    return { key: "encaissement", label: "Non défini", color: "#6b7280" }
  }

  const recentDeclarations = [...declarations]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10)

  return (
    <LayoutWrapper user={user}>
      {/* Hidden print zone – content read by handlePrint via innerHTML */}
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
            Vue d'ensemble de vos déclarations fiscales
          </p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {statCards.map((card) => {
            const Icon = card.icon
            return (
              <Card key={card.label}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {card.label}
                  </CardTitle>
                  <Icon className="h-5 w-5" style={{ color: card.color }} />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold" style={{ color: card.color }}>
                    {card.value}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Recent declarations */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Déclarations récentes</CardTitle>
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
                      <TableHead>Type de déclaration</TableHead>
                      <TableHead>Direction</TableHead>
                      <TableHead>Mois</TableHead>
                      <TableHead>Année</TableHead>
                      <TableHead>Date d'enregistrement</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentDeclarations.map((decl) => {
                      const declType = getDeclarationType(decl)
                      return (
                        <TableRow key={decl.id} className="hover:bg-gray-50">
                          <TableCell>
                            <Badge variant="outline" className="text-xs" style={{ borderColor: declType.color, color: declType.color }}>
                              {declType.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{decl.direction || <span className="text-muted-foreground italic">—</span>}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {MONTHS[decl.mois] || decl.mois}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">{decl.annee}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(decl.createdAt).toLocaleString("fr-DZ")}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 p-0 border-blue-300 text-blue-600 hover:bg-blue-50"
                                onClick={() => handleView(decl, declType.key)}
                                title="Consulter"
                              >
                                <Eye size={16} />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 p-0 border-gray-300 text-gray-600 hover:bg-gray-50"
                                onClick={() => handlePrint(decl, declType.key)}
                                title="Imprimer"
                              >
                                <Printer size={16} />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleDelete(decl.id)}
                                title="Supprimer"
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
            {declarations.length > 10 && (
              <div className="mt-4 text-center">
                <Button variant="outline" size="sm" onClick={() => router.push("/fisca/historique")}>
                  Voir toutes les déclarations ({declarations.length})
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Consult Dialog ── */}
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
                  <span>·</span>
                  <span>{MONTHS[viewDecl.mois] ?? viewDecl.mois} {viewDecl.annee}</span>
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

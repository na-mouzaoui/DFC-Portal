"use client"

import { useState, useEffect } from "react"
import { LayoutWrapper } from "@/components/layout-wrapper"
import { useAuth } from "@/hooks/use-auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Eye, Printer, Search, Trash2, Filter } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

// ─── Types (mirrors nouvelle-declaration) ────────────────────────────────────

type EncRow    = { designation: string; ttc: string }
type TvaRow    = { fournisseur: string; nif: string; numFact: string; dateFact: string; montantHT: string; tva: string; montantTTC: string; montantPaye: string; nature: string }
type TimbreRow = { designation: string; caTTCEsp: string; droitTimbre: string }
type TAPRow    = { wilayaCode: string; commune: string; tap2: string }

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
}

// ─── Constants ───────────────────────────────────────────────────────────────

const HIST_TABS = [
  { key: "encaissement",  label: "1 – Encaissement",       color: "#2db34b", title: "ENCAISSEMENT" },
  { key: "tva_immo",      label: "2 – TVA / IMMO",         color: "#1d6fb8", title: "ÉTAT TVA / IMMOBILISATIONS" },
  { key: "tva_biens",     label: "3 – TVA / Biens & Serv", color: "#7c3aed", title: "ÉTAT TVA / BIENS & SERVICES" },
  { key: "droits_timbre", label: "4 – Droits Timbre",      color: "#0891b2", title: "ÉTAT DROITS DE TIMBRE" },
  { key: "ca_tap",        label: "5 – CA 7% & CA Glob 1%", color: "#ea580c", title: "CA 7% & CA GLOBAL 1%" },
  { key: "etat_tap",      label: "6 – ETAT TAP",           color: "#be123c", title: "ÉTAT TAP" },
]

const MONTHS: Record<string, string> = {
  "01": "Janvier", "02": "Février", "03": "Mars", "04": "Avril",
  "05": "Mai", "06": "Juin", "07": "Juillet", "08": "Août",
  "09": "Septembre", "10": "Octobre", "11": "Novembre", "12": "Décembre",
}

const fmt = (v: number | string) =>
  isNaN(Number(v)) || v === "" ? "–" : Number(v).toLocaleString("fr-DZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const num = (v: string) => parseFloat(v) || 0

// ─── Render helpers (read-only tables for dialog & print) ───────────────────

function EncTable({ rows }: { rows: EncRow[] }) {
  const total = rows.reduce((s, r) => s + num(r.ttc), 0)
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
      <thead>
        <tr style={{ background: "#2db34b", color: "white" }}>
          <th style={TH}>Désignation</th>
          <th style={TH}>TTC</th>
          <th style={TH}>HT (÷1.19)</th>
          <th style={TH}>TVA (TTC−HT)</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => {
          const ht = num(r.ttc) / 1.19
          const tva = num(r.ttc) - ht
          return (
            <tr key={i} style={{ background: i % 2 ? "#f9fafb" : "white" }}>
              <td style={TD}>{r.designation || "—"}</td>
              <td style={{ ...TD, textAlign: "right" }}>{fmt(r.ttc)}</td>
              <td style={{ ...TD, textAlign: "right" }}>{fmt(ht)}</td>
              <td style={{ ...TD, textAlign: "right" }}>{fmt(tva)}</td>
            </tr>
          )
        })}
      </tbody>
      <tfoot>
        <tr style={{ background: "#f0fdf4", fontWeight: "bold" }}>
          <td style={TD}>TOTAL</td>
          <td style={{ ...TD, textAlign: "right" }}>{fmt(total)}</td>
          <td style={{ ...TD, textAlign: "right" }}>{fmt(total / 1.19)}</td>
          <td style={{ ...TD, textAlign: "right" }}>{fmt(total - total / 1.19)}</td>
        </tr>
      </tfoot>
    </table>
  )
}

function TvaTable({ rows, color }: { rows: TvaRow[]; color: string }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
      <thead>
        <tr style={{ background: color, color: "white" }}>
          {["Fournisseur", "NIF", "N° Fact.", "Date Fact.", "Mnt HT", "TVA", "Mnt TTC", "Mnt Payé", "Nature"].map((h) => (
            <th key={h} style={TH}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} style={{ background: i % 2 ? "#f9fafb" : "white" }}>
            <td style={TD}>{r.fournisseur || "—"}</td>
            <td style={TD}>{r.nif || "—"}</td>
            <td style={TD}>{r.numFact || "—"}</td>
            <td style={TD}>{r.dateFact || "—"}</td>
            <td style={{ ...TD, textAlign: "right" }}>{fmt(r.montantHT)}</td>
            <td style={{ ...TD, textAlign: "right" }}>{fmt(r.tva)}</td>
            <td style={{ ...TD, textAlign: "right" }}>{fmt(r.montantTTC)}</td>
            <td style={{ ...TD, textAlign: "right" }}>{fmt(r.montantPaye)}</td>
            <td style={TD}>{r.nature || "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function TimbreTable({ rows }: { rows: TimbreRow[] }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
      <thead>
        <tr style={{ background: "#0891b2", color: "white" }}>
          {["Désignation", "CA TTC Espèces", "Droit de Timbre"].map((h) => (
            <th key={h} style={TH}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} style={{ background: i % 2 ? "#f9fafb" : "white" }}>
            <td style={TD}>{r.designation || "—"}</td>
            <td style={{ ...TD, textAlign: "right" }}>{fmt(r.caTTCEsp)}</td>
            <td style={{ ...TD, textAlign: "right" }}>{fmt(r.droitTimbre)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function CATable({ b12, b13 }: { b12: string; b13: string }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
      <thead>
        <tr style={{ background: "#ea580c", color: "white" }}>
          <th style={TH}>Ligne</th>
          <th style={TH}>Base (B)</th>
          <th style={TH}>Taux</th>
          <th style={TH}>Montant</th>
        </tr>
      </thead>
      <tbody>
        <tr style={{ background: "white" }}>
          <td style={TD}>B12 – CA 7%</td>
          <td style={{ ...TD, textAlign: "right" }}>{fmt(b12)}</td>
          <td style={{ ...TD, textAlign: "right" }}>7%</td>
          <td style={{ ...TD, textAlign: "right" }}>{fmt(num(b12) * 0.07)}</td>
        </tr>
        <tr style={{ background: "#f9fafb" }}>
          <td style={TD}>B13 – CA Global 1%</td>
          <td style={{ ...TD, textAlign: "right" }}>{fmt(b13)}</td>
          <td style={{ ...TD, textAlign: "right" }}>1%</td>
          <td style={{ ...TD, textAlign: "right" }}>{fmt(num(b13) * 0.01)}</td>
        </tr>
      </tbody>
    </table>
  )
}

function TAPTable({ rows }: { rows: TAPRow[] }) {
  const total = rows.reduce((s, r) => s + num(r.tap2), 0)
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
      <thead>
        <tr style={{ background: "#be123c", color: "white" }}>
          {["Wilaya", "Commune", "TAP 2%"].map((h) => <th key={h} style={TH}>{h}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} style={{ background: i % 2 ? "#f9fafb" : "white" }}>
            <td style={TD}>{r.wilayaCode || "—"}</td>
            <td style={TD}>{r.commune || "—"}</td>
            <td style={{ ...TD, textAlign: "right" }}>{fmt(r.tap2)}</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr style={{ background: "#fff1f2", fontWeight: "bold" }}>
          <td style={TD} colSpan={2}>TOTAL</td>
          <td style={{ ...TD, textAlign: "right" }}>{fmt(total)}</td>
        </tr>
      </tfoot>
    </table>
  )
}

const TH: React.CSSProperties = { border: "1px solid #d1d5db", padding: "5px 8px", textAlign: "left", fontWeight: 600 }
const TD: React.CSSProperties = { border: "1px solid #e5e7eb", padding: "4px 8px" }

function TabDataView({ tabKey, decl, color }: { tabKey: string; decl: SavedDeclaration; color: string }) {
  switch (tabKey) {
    case "encaissement":  return <EncTable rows={decl.encRows ?? []} />
    case "tva_immo":      return <TvaTable rows={decl.tvaImmoRows ?? []} color={color} />
    case "tva_biens":     return <TvaTable rows={decl.tvaBiensRows ?? []} color={color} />
    case "droits_timbre": return <TimbreTable rows={decl.timbreRows ?? []} />
    case "ca_tap":        return <CATable b12={decl.b12 ?? ""} b13={decl.b13 ?? ""} />
    case "etat_tap":      return <TAPTable rows={decl.tapRows ?? []} />
    default:              return null
  }
}

// ─── Print Zone ──────────────────────────────────────────────────────────────

function HistPrintZone({ decl, tabKey, tabTitle, color }: {
  decl: SavedDeclaration | null; tabKey: string; tabTitle: string; color: string
}) {
  if (!decl) return null
  const moisLabel = MONTHS[decl.mois] ?? decl.mois
  return (
    <div id="hist-print-zone" style={{ display: "none", fontFamily: "Arial, sans-serif" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14, borderBottom: "2px solid #333", paddingBottom: 10 }}>
        <div style={{ fontSize: 13, lineHeight: 1.6 }}>
          <div><strong>Période :</strong> {moisLabel} {decl.annee}</div>
          <div style={{ fontSize: 11, color: "#555" }}>Déclaration du {new Date(decl.createdAt).toLocaleDateString("fr-DZ")}</div>
        </div>
        <div style={{ textAlign: "center", flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: "bold", textTransform: "uppercase", letterSpacing: 1 }}>{tabTitle}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Logo" style={{ height: 40, objectFit: "contain", marginBottom: 4 }} />
          <div style={{ fontSize: 11, fontWeight: 600 }}>{decl.direction}</div>
        </div>
      </div>
      {/* Table */}
      <TabDataView tabKey={tabKey} decl={decl} color={color} />
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HistoriquePage() {
  const { user, isLoading, status } = useAuth({ requireAuth: true, redirectTo: "/login" })
  const { toast } = useToast()

  const [declarations, setDeclarations]     = useState<SavedDeclaration[]>([])
  const [viewDecl, setViewDecl]             = useState<SavedDeclaration | null>(null)
  const [printDecl, setPrintDecl]           = useState<SavedDeclaration | null>(null)
  const [showDialog, setShowDialog]         = useState(false)
  const [viewTabKey, setViewTabKey]         = useState<string>("encaissement")
  const [showFilters, setShowFilters]       = useState(false)
  
  // Filter states
  const [filterMois, setFilterMois]         = useState("")
  const [filterAnnee, setFilterAnnee]       = useState("")
  const [filterDirection, setFilterDirection] = useState("")
  const [filterType, setFilterType]         = useState("")
  const [filterMontantMin, setFilterMontantMin] = useState("")
  const [filterMontantMax, setFilterMontantMax] = useState("")

  useEffect(() => {
    try {
      const raw = localStorage.getItem("fiscal_declarations")
      setDeclarations(raw ? JSON.parse(raw) : [])
    } catch { setDeclarations([]) }
  }, [])

  if (isLoading || !user || status !== "authenticated") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Chargement...</p>
      </div>
    )
  }

  const filtered = declarations.filter((d) => {
    // Filter by month
    if (filterMois && filterMois !== "all" && d.mois !== filterMois) return false
    
    // Filter by year
    if (filterAnnee && d.annee !== filterAnnee) return false
    
    // Filter by direction
    if (filterDirection && !d.direction.toLowerCase().includes(filterDirection.toLowerCase())) return false
    
    // Filter by type
    if (filterType && filterType !== "all") {
      const hasType = 
        (filterType === "encaissement" && (d.encRows?.length ?? 0) > 0) ||
        (filterType === "tva_immo" && (d.tvaImmoRows?.length ?? 0) > 0) ||
        (filterType === "tva_biens" && (d.tvaBiensRows?.length ?? 0) > 0) ||
        (filterType === "droits_timbre" && (d.timbreRows?.length ?? 0) > 0) ||
        (filterType === "ca_tap" && (d.b12 || d.b13)) ||
        (filterType === "etat_tap" && (d.tapRows?.length ?? 0) > 0)
      if (!hasType) return false
    }
    
    // Filter by montant - calculate total based on declaration type
    if (filterMontantMin || filterMontantMax) {
      let total = 0
      
      if ((d.encRows?.length ?? 0) > 0) {
        total = d.encRows!.reduce((s, r) => s + num(r.ttc), 0)
      } else if ((d.tvaImmoRows?.length ?? 0) > 0) {
        total = d.tvaImmoRows!.reduce((s, r) => s + num(r.montantHT), 0)
      } else if ((d.tvaBiensRows?.length ?? 0) > 0) {
        total = d.tvaBiensRows!.reduce((s, r) => s + num(r.montantHT), 0)
      } else if ((d.timbreRows?.length ?? 0) > 0) {
        total = d.timbreRows!.reduce((s, r) => s + num(r.droitTimbre), 0)
      } else if (d.b12 || d.b13) {
        total = num(d.b12 ?? "") * 0.07 + num(d.b13 ?? "") * 0.01
      } else if ((d.tapRows?.length ?? 0) > 0) {
        total = d.tapRows!.reduce((s, r) => s + num(r.tap2), 0)
      }
      
      if (filterMontantMin && total < Number(filterMontantMin)) return false
      if (filterMontantMax && total > Number(filterMontantMax)) return false
    }
    
    return true
  })

  const handleView = (decl: SavedDeclaration, tabKey: string) => {
    setViewDecl(decl)
    setViewTabKey(tabKey)
    setShowDialog(true)
  }

  const handlePrint = (decl: SavedDeclaration, tabKey: string) => {
    setPrintDecl(decl)
    setViewTabKey(tabKey)
    setTimeout(() => {
      const zone = document.getElementById("hist-print-zone")
      if (zone) zone.style.display = "block"
      window.print()
      if (zone) zone.style.display = "none"
    }, 80)
  }

  const handleDelete = (id: string) => {
    const updated = declarations.filter((d) => d.id !== id)
    setDeclarations(updated)
    try { localStorage.setItem("fiscal_declarations", JSON.stringify(updated)) } catch { /* noop */ }
    toast({ title: "Déclaration supprimée" })
  }

  return (
    <LayoutWrapper user={user}>
      {/* Print CSS */}
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 12mm 10mm; }
          body > * { display: none !important; }
          #hist-print-zone { display: block !important; }
        }
      `}</style>

      {/* Hidden print zone */}
      <HistPrintZone
        decl={printDecl}
        tabKey={viewTabKey}
        tabTitle={HIST_TABS.find(t => t.key === viewTabKey)?.title ?? ""}
        color={HIST_TABS.find(t => t.key === viewTabKey)?.color ?? "#000"}
      />

      <div className="space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Historique des Déclarations</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Consultez et imprimez vos déclarations fiscales enregistrées.
          </p>
        </div>

        <Card className="border border-gray-200">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between py-3">
            <CardTitle className="text-sm font-semibold text-gray-700">
              Toutes les déclarations
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                ({filtered.length} déclaration{filtered.length !== 1 ? "s" : ""})
              </span>
            </CardTitle>
            <Button
              onClick={() => setShowFilters(!showFilters)}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <Filter className="h-4 w-4" style={{ color: '#e82c2a' }} />
              {showFilters ? "Masquer les filtres" : "Filtres"}
            </Button>
          </CardHeader>

          {showFilters && (
            <div className="px-6 pb-4">
              <div className="rounded-lg border bg-muted/50 p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Mois filter */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-600">Mois</label>
                    <Select value={filterMois} onValueChange={setFilterMois}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Tous les mois" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous les mois</SelectItem>
                        {Object.entries(MONTHS).map(([key, label]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Année filter */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-600">Année</label>
                    <Input
                      type="text"
                      placeholder="Ex: 2024"
                      value={filterAnnee}
                      onChange={(e) => setFilterAnnee(e.target.value)}
                      className="h-9"
                    />
                  </div>

                  {/* Direction filter */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-600">Direction</label>
                    <Input
                      type="text"
                      placeholder="Nom de la direction"
                      value={filterDirection}
                      onChange={(e) => setFilterDirection(e.target.value)}
                      className="h-9"
                    />
                  </div>

                  {/* Type de déclaration filter */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-600">Type de déclaration</label>
                    <Select value={filterType} onValueChange={setFilterType}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Tous les types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous les types</SelectItem>
                        {HIST_TABS.map((tab) => (
                          <SelectItem key={tab.key} value={tab.key}>{tab.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Montant min */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-600">Montant min (DA)</label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={filterMontantMin}
                      onChange={(e) => setFilterMontantMin(e.target.value)}
                      className="h-9"
                    />
                  </div>

                  {/* Montant max */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-600">Montant max (DA)</label>
                    <Input
                      type="number"
                      placeholder="∞"
                      value={filterMontantMax}
                      onChange={(e) => setFilterMontantMax(e.target.value)}
                      className="h-9"
                    />
                  </div>
                </div>

                <div className="mt-3 flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setFilterMois("")
                      setFilterAnnee("")
                      setFilterDirection("")
                      setFilterType("")
                      setFilterMontantMin("")
                      setFilterMontantMax("")
                    }}
                    className="text-xs"
                  >
                    Réinitialiser
                  </Button>
                </div>
              </div>
            </div>
          )}

          <CardContent className="p-0">
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
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-muted-foreground text-sm">
                        {filterMois || filterAnnee || filterDirection || filterType || filterMontantMin || filterMontantMax
                          ? "Aucune déclaration ne correspond aux filtres."
                          : "Aucune déclaration enregistrée pour le moment."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((decl) => {
                      // Determine declaration type based on which rows are filled
                      const getDeclarationType = () => {
                        if ((decl.encRows?.length ?? 0) > 0) return { key: "encaissement", label: "Encaissement", color: "#2db34b" }
                        if ((decl.tvaImmoRows?.length ?? 0) > 0) return { key: "tva_immo", label: "TVA / IMMO", color: "#1d6fb8" }
                        if ((decl.tvaBiensRows?.length ?? 0) > 0) return { key: "tva_biens", label: "TVA / Biens & Serv", color: "#7c3aed" }
                        if ((decl.timbreRows?.length ?? 0) > 0) return { key: "droits_timbre", label: "Droits Timbre", color: "#0891b2" }
                        if (decl.b12 || decl.b13) return { key: "ca_tap", label: "CA 7% & CA Glob 1%", color: "#ea580c" }
                        if ((decl.tapRows?.length ?? 0) > 0) return { key: "etat_tap", label: "ETAT TAP", color: "#be123c" }
                        return { key: "encaissement", label: "Non défini", color: "#6b7280" }
                      }
                      const declType = getDeclarationType()
                      
                      return (
                        <TableRow key={decl.id} className="hover:bg-gray-50">
                          <TableCell className="text-sm">
                            <Badge variant="outline" className="text-xs" style={{ borderColor: declType.color, color: declType.color }}>
                              {declType.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{decl.direction || <span className="text-muted-foreground italic">—</span>}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {MONTHS[decl.mois] ?? decl.mois}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">{decl.annee}</TableCell>
                          <TableCell className="text-sm text-gray-700">
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
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Consult Dialog ── */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-4">
              <span style={{ color: HIST_TABS.find(t => t.key === viewTabKey)?.color }}>
                {HIST_TABS.find(t => t.key === viewTabKey)?.title}
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
              <TabDataView tabKey={viewTabKey} decl={viewDecl} color={HIST_TABS.find(t => t.key === viewTabKey)?.color ?? "#000"} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </LayoutWrapper>
  )
}

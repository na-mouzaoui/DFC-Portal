"use client"

import { useMemo, useState } from "react"
import { LayoutWrapper } from "@/components/layout-wrapper"
import { useAuth } from "@/hooks/use-auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { CheckCircle, Printer, Trash2, Filter, X } from "lucide-react"

type RecapColumn = {
  key: string
  label: string
  right?: boolean
}

type RecapDefinition = {
  key: string
  title: string
  columns: RecapColumn[]
  rows: Record<string, string>[]
}

type GeneratedRecap = {
  id: string
  key: string
  title: string
  mois: string
  annee: string
  createdAt: string
  isGenerated: boolean
}

const MONTHS: Record<string, string> = {
  "01": "Janvier",
  "02": "Fevrier",
  "03": "Mars",
  "04": "Avril",
  "05": "Mai",
  "06": "Juin",
  "07": "Juillet",
  "08": "Aout",
  "09": "Septembre",
  "10": "Octobre",
  "11": "Novembre",
  "12": "Decembre",
}

const RECAP_G50_ROWS = [
  "ACOMPTE PROVISIONEL",
  "TVA COLLECTEE",
  "TVA DEDUCTIBLE",
  "Total TVA a Payer (Voir la Piece)",
  "DROIT DE TIMBRE",
  "TACP 7%",
  "TNFPDAL 1%",
  "IRG SALAIRE",
  "AUTRE IRG",
  "TAXE DE FORMATION",
  "TAXE VEHICULE",
  "LA TAP",
  "TAXE 2%",
  "Total Declaration G 50 (Voir la Piece)",
  "TAXE 1,5% SUR MASTERS (Voir la Piece)",
  "Total",
]

const TVA_SITUATION_ROWS = [
  "Precompte",
  "Reversement",
  "Direction Generale",
  "TVA AutoLiquidation",
  "DR Alger",
  "DR Setif",
  "DR Constantine",
  "DR Annaba",
  "DR Chlef",
  "DR Bechar",
  "DR Ouargla",
  "Total",
]

const TVA_COLLECTEE_ROWS = [
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

const DROITS_TIMBRE_ROWS = [
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

const TACP7_ROWS = [
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
]

const TNFDAL1_ROWS = [
  "Direction Generale",
  "DR Alger",
  "DR Setif",
  "DR Constantine",
  "DR Annaba",
  "DR Chlef",
  "DR Oran",
  "DR Bechar",
  "DR Ouargla",
  "Regul CA du Janvier 2025 a Juin 2025",
  "Total",
]

const MASTERS15_ROWS = [
  "Masters",
  "ASSILOU COM",
  "GTS PHONE",
  "ALGERIE POSTE",
  "Total",
]

const RECAP_DEFINITIONS: RecapDefinition[] = [
  {
    key: "g50",
    title: "RECAP DECLARATION G50",
    columns: [
      { key: "designation", label: "Designation" },
      { key: "montant", label: "Montant", right: true },
    ],
    rows: RECAP_G50_ROWS.map((designation) => ({ designation, montant: "0 DZD" })),
  },
  {
    key: "tva_collectee",
    title: "Situation de la TVA Collectee",
    columns: [
      { key: "designation", label: "Designation" },
      { key: "ttc", label: "Montant des Encaissements TTC", right: true },
      { key: "exonere", label: "Montant Exonere", right: true },
      { key: "ht", label: "Montant des Encaissements HT", right: true },
      { key: "tva", label: "Montant de la TVA", right: true },
    ],
    rows: TVA_COLLECTEE_ROWS.map((designation) => ({
      designation,
      ttc: "0,00 DZD",
      exonere: "0,00 DZD",
      ht: "0,00 DZD",
      tva: "0,00 DZD",
    })),
  },
  {
    key: "tva_situation",
    title: "Situation de la TVA",
    columns: [
      { key: "designation", label: "Designation" },
      { key: "collectee", label: "TVA Collectee", right: true },
      { key: "immo", label: "TVA Deductible sur Immobilisation", right: true },
      { key: "biens", label: "TVA Deductible sur Biens et services", right: true },
      { key: "totalDed", label: "Total de la TVA Deductible", right: true },
      { key: "payer", label: "TVA a Payer", right: true },
    ],
    rows: TVA_SITUATION_ROWS.map((designation) => ({
      designation,
      collectee: "0,00 DZD",
      immo: "0,00 DZD",
      biens: "0,00 DZD",
      totalDed: "0,00 DZD",
      payer: "0,00 DZD",
    })),
  },
  {
    key: "droits_timbre",
    title: "Situation des Droits de Timbre",
    columns: [
      { key: "designation", label: "Designation" },
      { key: "caHt", label: "Chiffres d'Affaires Encaisse HT", right: true },
      { key: "montant", label: "Montant des Droits de Timbre", right: true },
    ],
    rows: DROITS_TIMBRE_ROWS.map((designation) => ({
      designation,
      caHt: "0,00 DZD",
      montant: "0,00 DZD",
    })),
  },
  {
    key: "tacp7",
    title: "Situation de la Taxe TACP 7%",
    columns: [
      { key: "designation", label: "Designation" },
      { key: "base", label: "Montant des Recharges HT", right: true },
      { key: "taxe", label: "Montant du TACP 7%", right: true },
    ],
    rows: TACP7_ROWS.map((designation) => ({
      designation,
      base: "0,00 DZD",
      taxe: "0,00 DZD",
    })),
  },
  {
    key: "tnfdal1",
    title: "Situation de la Taxe TNFDAL 1%",
    columns: [
      { key: "designation", label: "Designation" },
      { key: "caHt", label: "Chiffres d'Affaires E HT", right: true },
      { key: "taxe", label: "Montant du TNFFDAL 1%", right: true },
    ],
    rows: TNFDAL1_ROWS.map((designation) => ({
      designation,
      caHt: "0,00 DZD",
      taxe: "0,00 DZD",
    })),
  },
  {
    key: "masters15",
    title: "TAXE MASTERS 1.5%",
    columns: [
      { key: "designation", label: "Designation" },
      { key: "base", label: "Montant de la Base", right: true },
      { key: "taxe", label: "Montant de la Taxe 1,5%", right: true },
    ],
    rows: MASTERS15_ROWS.map((designation) => ({
      designation,
      base: "0 DZD",
      taxe: "0 DZD",
    })),
  },
]

const getRecapDefinition = (key: string) => RECAP_DEFINITIONS.find((item) => item.key === key)

export default function RecapPage() {
  const { user, isLoading, status } = useAuth({ requireAuth: true, redirectTo: "/login" })
  const [selectedMonth, setSelectedMonth] = useState("")
  const [selectedYear, setSelectedYear] = useState("")
  const [generatedRecaps, setGeneratedRecaps] = useState<GeneratedRecap[]>([])
  const [viewRecap, setViewRecap] = useState<GeneratedRecap | null>(null)
  const [showDialog, setShowDialog] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [filterType, setFilterType] = useState("")
  const [filterMois, setFilterMois] = useState("")
  const [filterAnnee, setFilterAnnee] = useState("")
  const [filterDateFrom, setFilterDateFrom] = useState("")
  const [filterDateTo, setFilterDateTo] = useState("")

  const periodLabel = useMemo(() => {
    if (!selectedMonth || !selectedYear) return "-"
    return `${MONTHS[selectedMonth] ?? selectedMonth} ${selectedYear}`
  }, [selectedMonth, selectedYear])

  const hasActiveFilters = useMemo(
    () => !!(filterType || filterMois || filterAnnee || filterDateFrom || filterDateTo),
    [filterType, filterMois, filterAnnee, filterDateFrom, filterDateTo],
  )

  const filteredRecaps = useMemo(() => {
    return generatedRecaps.filter((item) => {
      if (filterType && item.key !== filterType) return false
      if (filterMois && item.mois !== filterMois) return false
      if (filterAnnee && item.annee !== filterAnnee.trim()) return false

      if (filterDateFrom) {
        const created = new Date(item.createdAt)
        const from = new Date(`${filterDateFrom}T00:00:00`)
        if (!Number.isNaN(created.getTime()) && created < from) return false
      }

      if (filterDateTo) {
        const created = new Date(item.createdAt)
        const to = new Date(`${filterDateTo}T23:59:59`)
        if (!Number.isNaN(created.getTime()) && created > to) return false
      }

      return true
    })
  }, [generatedRecaps, filterType, filterMois, filterAnnee, filterDateFrom, filterDateTo])

  const handleGenerate = () => {
    if (!selectedMonth || !selectedYear) return
    const now = new Date().toISOString()
    const entries: GeneratedRecap[] = RECAP_DEFINITIONS.map((definition) => ({
      id: `${definition.key}-${selectedYear}${selectedMonth}-${Date.now()}`,
      key: definition.key,
      title: definition.title,
      mois: selectedMonth,
      annee: selectedYear,
      createdAt: now,
      isGenerated: true,
    }))

    setGeneratedRecaps((prev) => {
      const withoutSamePeriod = prev.filter(
        (item) => !(item.mois === selectedMonth && item.annee === selectedYear),
      )
      return [...entries, ...withoutSamePeriod]
    })
  }

  const handleView = (item: GeneratedRecap) => {
    setViewRecap(item)
    setShowDialog(true)
  }

  const handleDelete = (id: string) => {
    setGeneratedRecaps((prev) => prev.filter((item) => item.id !== id))
    if (viewRecap?.id === id) {
      setShowDialog(false)
      setViewRecap(null)
    }
  }

  const handlePrint = (item: GeneratedRecap) => {
    const definition = getRecapDefinition(item.key)
    if (!definition) return

    void (async () => {
      try {
        const [{ jsPDF }, { default: autoTable }] = await Promise.all([
          import("jspdf"),
          import("jspdf-autotable"),
        ])

        const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" })
        const pageW = pdf.internal.pageSize.getWidth()
        const period = `${MONTHS[item.mois] ?? item.mois} ${item.annee}`
        const headerTitle = `${definition.title} ${period}`.trim()

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

        if (logo) {
          pdf.addImage(logo, "PNG", 10, 8, 38, 20)
        }

        pdf.setFont("times", "bold")
        pdf.setFontSize(11)
        drawUnderlinedText("ATM MOBILIS SPA", 10, 36)
        drawUnderlinedText("DIRECTION DES FINANCES ET DE LA COMPTABILITE", 10, 41)
        drawUnderlinedText("SOUS DIRECTION FISCALITE", 10, 46)
        pdf.setFontSize(14)
        drawUnderlinedText(headerTitle, 10, 56, "left")

        const tableHead = [definition.columns.map((col) => col.label)]
        const tableBody = definition.rows.map((row) => definition.columns.map((col) => String(row[col.key] ?? "")))

        autoTable(pdf, {
          head: tableHead,
          body: tableBody,
          startY: 64,
          theme: "grid",
          margin: { left: 10, right: 10, top: 64, bottom: 10 },
          styles: {
            font: "times",
            fontSize: 10,
            cellPadding: 0.8,
            lineColor: [51, 51, 51],
            lineWidth: 0.2,
            textColor: [0, 0, 0],
          },
          headStyles: {
            fillColor: [45, 179, 75],
            textColor: [255, 255, 255],
            font: "times",
            fontStyle: "bold",
            fontSize: 10,
            halign: "center",
          },
          bodyStyles: {
            textColor: [0, 0, 0],
            font: "times",
            fontSize: 10,
          },
          didParseCell: (data) => {
            data.cell.text = data.cell.text.map((line) =>
              line
                .replace(/\//g, " ")
                .replace(/\u00A0/g, " "),
            )

            if (data.section === "body") {
              if (data.column.index === 0) {
                data.cell.styles.halign = "left"
              } else {
                data.cell.styles.halign = definition.columns[data.column.index]?.right ? "right" : "center"
              }
            }
          },
          horizontalPageBreak: true,
          horizontalPageBreakRepeat: [0],
        })

        const blobUrl = URL.createObjectURL(pdf.output("blob"))
        window.open(blobUrl, "_blank")
      } catch (error) {
        console.error("Recap PDF generation failed", error)
      }
    })()
  }

  if (isLoading || !user || status !== "authenticated") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Chargement...</p>
      </div>
    )
  }

  return (
    <LayoutWrapper user={user}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Recap Fiscal</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Generer des tableaux recapitulatifs a partir des declarations saisies sur une periode donnee.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Parametres de generation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Mois</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full border rounded px-2 py-2 text-sm"
                >
                  <option value="">Selectionner</option>
                  {Object.entries(MONTHS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-muted-foreground block mb-1">Annee</label>
                <input
                  type="number"
                  min="2000"
                  max="2100"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  placeholder="Ex: 2026"
                  className="w-full border rounded px-2 py-2 text-sm"
                />
              </div>

              <Button
                onClick={handleGenerate}
                disabled={!selectedMonth || !selectedYear}
                className="h-10"
              >
                Generer
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-base">
                Historique des recaps generes
                {generatedRecaps.length > 0 && (
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    ({filteredRecaps.length}{hasActiveFilters ? ` / ${generatedRecaps.length}` : ""})
                  </span>
                )}
              </CardTitle>
              <div className="flex items-center gap-2">
                {hasActiveFilters && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 text-xs text-muted-foreground hover:text-emerald-600"
                    onClick={() => {
                      setFilterType("")
                      setFilterMois("")
                      setFilterAnnee("")
                      setFilterDateFrom("")
                      setFilterDateTo("")
                    }}
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
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5 text-sm">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Type</label>
                  <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="w-full border rounded px-2 py-1.5 text-xs">
                    <option value="">Tous</option>
                    {RECAP_DEFINITIONS.map((definition) => (
                      <option key={definition.key} value={definition.key}>{definition.title}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Mois</label>
                  <select value={filterMois} onChange={(e) => setFilterMois(e.target.value)} className="w-full border rounded px-2 py-1.5 text-xs">
                    <option value="">Tous</option>
                    {Object.entries(MONTHS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Annee</label>
                  <input
                    type="number"
                    placeholder="ex: 2026"
                    value={filterAnnee}
                    onChange={(e) => setFilterAnnee(e.target.value)}
                    className="w-full border rounded px-2 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Du</label>
                  <input
                    type="date"
                    value={filterDateFrom}
                    onChange={(e) => setFilterDateFrom(e.target.value)}
                    className="w-full border rounded px-2 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Au</label>
                  <input
                    type="date"
                    value={filterDateTo}
                    onChange={(e) => setFilterDateTo(e.target.value)}
                    className="w-full border rounded px-2 py-1.5 text-xs"
                  />
                </div>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {generatedRecaps.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Aucun recap genere pour le moment.
              </p>
            ) : filteredRecaps.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Aucun recap ne correspond aux filtres.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type de recap</TableHead>
                      <TableHead>Periode</TableHead>
                      <TableHead>Date de generation</TableHead>
                      <TableHead className="w-20 text-center">Statut</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRecaps.map((item) => (
                      <TableRow
                        key={item.id}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleView(item)}
                        title="Cliquer pour consulter"
                      >
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{item.title}</Badge>
                        </TableCell>
                        <TableCell>{MONTHS[item.mois] ?? item.mois} {item.annee}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(item.createdAt).toLocaleString("fr-DZ", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false })}
                        </TableCell>
                        <TableCell className="w-20 p-0 align-middle">
                          <div className="flex items-center justify-center">
                            <span className="inline-flex" title="Genere" aria-label="Genere">
                              <CheckCircle className="h-4 w-4 text-emerald-600" />
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 p-0 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                              onClick={(event) => {
                                event.stopPropagation()
                                handlePrint(item)
                              }}
                              title="Imprimer"
                            >
                              <Printer size={16} />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={(event) => {
                                event.stopPropagation()
                                handleDelete(item.id)
                              }}
                              title="Supprimer"
                            >
                              <Trash2 size={16} />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {viewRecap && (
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogContent className="!w-[95vw] sm:!w-[90vw] xl:!w-[74vw] !max-w-[1200px] h-[82vh] p-0 overflow-hidden">
              <div className="border-b bg-gradient-to-r from-slate-50 to-white px-6 py-4">
                <DialogHeader className="space-y-2">
                  <DialogTitle className="text-base font-semibold leading-tight">
                    {viewRecap.title}
                  </DialogTitle>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="secondary">{MONTHS[viewRecap.mois] ?? viewRecap.mois} {viewRecap.annee}</Badge>
                  </div>
                </DialogHeader>
              </div>

              <div className="h-[calc(82vh-140px)] overflow-auto bg-slate-50/60 px-6 py-5">
                <div className="rounded-xl border bg-white p-4 shadow-sm">
                  <div className="overflow-x-auto">
                    {(() => {
                      const definition = getRecapDefinition(viewRecap.key)
                      if (!definition) return null

                      return (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              {definition.columns.map((column) => (
                                <TableHead key={column.key} className={column.right ? "text-right" : undefined}>
                                  {column.label}
                                </TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {definition.rows.map((row, index) => (
                              <TableRow key={`${viewRecap.key}-${index}`}>
                                {definition.columns.map((column) => (
                                  <TableCell key={column.key} className={column.right ? "text-right font-semibold" : undefined}>
                                    {row[column.key] ?? ""}
                                  </TableCell>
                                ))}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )
                    })()}
                  </div>
                </div>

                <div className="mt-4 flex justify-end gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-xs h-8 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                    onClick={() => handlePrint(viewRecap)}
                  >
                    <Printer size={13} /> Imprimer
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

      </div>
    </LayoutWrapper>
  )
}

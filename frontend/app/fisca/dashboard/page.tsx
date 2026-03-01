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
import { FileText, CheckCircle, Clock, AlertTriangle, Eye, Trash2 } from "lucide-react"

type EncRow = { designation: string; ttc: string }
type TvaRow = { fournisseur: string; nif: string; numFact: string; dateFact: string; montantHT: string; tva: string; montantTTC: string; montantPaye: string; nature: string }
type TimbreRow = { designation: string; caTTCEsp: string; droitTimbre: string }
type TAPRow = { wilayaCode: string; commune: string; tap2: string }

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

const MONTHS: Record<string, string> = {
  "01": "Janvier", "02": "Février", "03": "Mars", "04": "Avril",
  "05": "Mai", "06": "Juin", "07": "Juillet", "08": "Août",
  "09": "Septembre", "10": "Octobre", "11": "Novembre", "12": "Décembre",
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
  const [declarations, setDeclarations] = useState<SavedDeclaration[]>([])
  const [viewDecl, setViewDecl] = useState<SavedDeclaration | null>(null)
  const [showDialog, setShowDialog] = useState(false)

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
  }

  const getDeclarationType = (decl: SavedDeclaration) => {
    if ((decl.encRows?.length ?? 0) > 0) return { key: "encaissement", label: "Encaissement", color: "#2db34b" }
    if ((decl.tvaImmoRows?.length ?? 0) > 0) return { key: "tva_immo", label: "TVA / IMMO", color: "#1d6fb8" }
    if ((decl.tvaBiensRows?.length ?? 0) > 0) return { key: "tva_biens", label: "TVA / Biens & Serv", color: "#7c3aed" }
    if ((decl.timbreRows?.length ?? 0) > 0) return { key: "droits_timbre", label: "Droits Timbre", color: "#0891b2" }
    if (decl.b12 || decl.b13) return { key: "ca_tap", label: "CA 7% & CA Glob 1%", color: "#ea580c" }
    if ((decl.tapRows?.length ?? 0) > 0) return { key: "etat_tap", label: "ETAT TAP", color: "#be123c" }
    return { key: "encaissement", label: "Non défini", color: "#6b7280" }
  }

  // Sort declarations by creation date, most recent first
  const recentDeclarations = [...declarations].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 10)

  return (
    <LayoutWrapper user={user}>
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
                        <TableRow key={decl.id}>
                          <TableCell>
                            <Badge style={{ backgroundColor: declType.color + "20", color: declType.color, border: `1px solid ${declType.color}` }}>
                              {declType.label}
                            </Badge>
                          </TableCell>
                          <TableCell>{decl.direction}</TableCell>
                          <TableCell>{MONTHS[decl.mois] || decl.mois}</TableCell>
                          <TableCell>{decl.annee}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(decl.createdAt).toLocaleDateString("fr-FR", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex justify-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setViewDecl(decl)
                                  setShowDialog(true)
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(decl.id)}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
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

        {/* View dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                Déclaration du {MONTHS[viewDecl?.mois || ""] || viewDecl?.mois} {viewDecl?.annee} - {viewDecl?.direction}
              </DialogTitle>
            </DialogHeader>
            <div className="text-sm text-muted-foreground">
              <p>Pour consulter les détails complets, accédez à la page <strong>Historique</strong>.</p>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </LayoutWrapper>
  )
}

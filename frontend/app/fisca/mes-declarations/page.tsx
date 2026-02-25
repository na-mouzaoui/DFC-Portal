import { redirect } from "next/navigation"
export default function MesDeclarationsRedirect() {
  redirect("/fisca/historique")
}

import { useAuth } from "@/hooks/use-auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Download, Search, FileSpreadsheet } from "lucide-react"

// ─── Types ──────────────────────────────────────────────────────────────────

type DeclarationType = "TVA" | "IBS" | "IRG" | "TAP" | "TF"
type DeclarationStatus = "validee" | "en_attente" | "rejetee"

interface Declaration {
  id: number
  reference: string
  type: DeclarationType
  period: string
  year: number
  amount: number
  status: DeclarationStatus
  createdAt: string
  user: string
}

// ─── Configuration des onglets ───────────────────────────────────────────────

const TABS: { value: DeclarationType; label: string; description: string }[] = [
  { value: "TVA", label: "TVA", description: "Taxe sur la Valeur Ajoutée" },
  { value: "IBS", label: "IBS", description: "Impôt sur les Bénéfices des Sociétés" },
  { value: "IRG", label: "IRG", description: "Impôt sur le Revenu Global" },
  { value: "TAP", label: "TAP", description: "Taxe sur l'Activité Professionnelle" },
  { value: "TF", label: "TF", description: "Taxe Foncière" },
]

// ─── Données fictives (placeholder) ─────────────────────────────────────────

const MOCK_DECLARATIONS: Declaration[] = []

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  DeclarationStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" ; style?: React.CSSProperties }
> = {
  validee: { label: "Validée", variant: "default", style: { backgroundColor: "#2db34b", color: "white" } },
  en_attente: { label: "En attente", variant: "secondary", style: { backgroundColor: "#f59e0b", color: "white" } },
  rejetee: { label: "Rejetée", variant: "destructive" },
}

const formatAmount = (n: number) =>
  n.toLocaleString("fr-DZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " DZD"

// ─── Component ───────────────────────────────────────────────────────────────

export default function MesDeclarationsPage() {
  const { user, isLoading, status } = useAuth({ requireAuth: true, redirectTo: "/login" })
  const [activeTab, setActiveTab] = useState<DeclarationType>("TVA")
  const [search, setSearch] = useState("")

  if (isLoading || !user || status !== "authenticated") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Chargement...</p>
      </div>
    )
  }

  const filtered = MOCK_DECLARATIONS.filter(
    (d) =>
      d.type === activeTab &&
      (search === "" ||
        d.reference.toLowerCase().includes(search.toLowerCase()) ||
        d.user.toLowerCase().includes(search.toLowerCase()) ||
        d.period.toLowerCase().includes(search.toLowerCase())),
  )

  const activeTabInfo = TABS.find((t) => t.value === activeTab)!

  return (
    <LayoutWrapper user={user}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Mes Déclarations</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Consultez et gérez l'ensemble de vos déclarations fiscales
          </p>
        </div>

        {/* ─── Tab navigation ─────────────────────────────────────────── */}
        <div className="border-b border-gray-200">
          <nav className="flex gap-0 overflow-x-auto" aria-label="Types de déclaration">
            {TABS.map((tab) => {
              const isActive = tab.value === activeTab
              return (
                <button
                  key={tab.value}
                  onClick={() => { setActiveTab(tab.value); setSearch("") }}
                  className="relative px-5 py-3 text-sm font-medium whitespace-nowrap transition-colors focus:outline-none"
                  style={{
                    color: isActive ? '#2db34b' : '#6b7280',
                    borderBottom: isActive ? '2px solid #2db34b' : '2px solid transparent',
                    backgroundColor: 'transparent',
                  }}
                  aria-current={isActive ? "page" : undefined}
                >
                  {tab.label}
                </button>
              )
            })}
          </nav>
        </div>

        {/* ─── Table card ─────────────────────────────────────────────── */}
        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">{activeTabInfo.label} – {activeTabInfo.description}</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {filtered.length} déclaration{filtered.length !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-9 w-52"
                />
              </div>
              <Button variant="outline" size="sm" className="gap-2" disabled>
                <Download className="h-4 w-4" />
                PDF
              </Button>
              <Button variant="outline" size="sm" className="gap-2" disabled>
                <FileSpreadsheet className="h-4 w-4" />
                Excel
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Référence</TableHead>
                    <TableHead>Période</TableHead>
                    <TableHead>Année</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Déclarant</TableHead>
                    <TableHead>Date de saisie</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                        {search
                          ? "Aucune déclaration ne correspond à votre recherche."
                          : `Aucune déclaration ${activeTab} enregistrée pour le moment.`}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((decl) => {
                      const statusCfg = STATUS_CONFIG[decl.status]
                      return (
                        <TableRow key={decl.id} className="hover:bg-gray-50">
                          <TableCell className="font-mono text-sm font-medium">
                            {decl.reference}
                          </TableCell>
                          <TableCell className="capitalize">{decl.period}</TableCell>
                          <TableCell>{decl.year}</TableCell>
                          <TableCell className="text-right font-semibold">
                            {formatAmount(decl.amount)}
                          </TableCell>
                          <TableCell className="text-muted-foreground">{decl.user}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(decl.createdAt).toLocaleDateString("fr-DZ")}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={statusCfg.variant}
                              style={statusCfg.style}
                            >
                              {statusCfg.label}
                            </Badge>
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
    </LayoutWrapper>
  )
}

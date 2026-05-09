"use client"

import { useMemo, useState } from "react"
import { AlertCircle, CheckCircle2, Hourglass, ClipboardList, FileClock, ShieldCheck, Filter, Building2, FileText, Wallet, Car, BarChart3, ChevronDownIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { formatTabKey, ReminderData } from "@/lib/fiscal-reminders"

const normalizeDirectionKey = (value: string) => {
  const normalized = (value ?? "").trim().toLowerCase()
  if (!normalized) return ""
  if (normalized === "siege" || normalized === "siège" || normalized.includes("siege") || normalized.includes("siège")) {
    return "siège"
  }
  return normalized
}

const normalizeSupplierName = (value: string) => value.trim().toLowerCase()

interface RemindersCardProps {
  reminders: ReminderData[]
  loading?: boolean
  userRole?: string
  directionOptions?: string[]
  selectedMonth?: string
  selectedYear?: string
  onMonthChange?: (value: string) => void
  onYearChange?: (value: string) => void
  viewMode?: "indicateurs" | "consolidation"
  onViewModeChange?: (mode: "indicateurs" | "consolidation") => void
  consolidationTabKey?: string
  onConsolidationTabChange?: (value: string) => void
  consolidationStartMonth?: string
  consolidationStartYear?: string
  consolidationEndMonth?: string
  consolidationEndYear?: string
  onConsolidationStartMonthChange?: (value: string) => void
  onConsolidationStartYearChange?: (value: string) => void
  onConsolidationEndMonthChange?: (value: string) => void
  onConsolidationEndYearChange?: (value: string) => void
  consolidationDirections?: string[]
  onConsolidationDirectionsChange?: (value: string[]) => void
  consolidationSupplierId?: string
  onConsolidationSupplierChange?: (value: string) => void
  consolidationTabOptions?: Array<{ key: string; label: string }>
  consolidationDeclarations?: Array<{
    tabKey?: string
    mois?: string
    annee?: string
    direction?: string
    encRows?: Array<{ designation: string; ht?: string; ttc?: string }>
    tvaImmoRows?: Array<{ montantHT: string; tva?: string; tauxTVA?: string }>
    tvaBiensRows?: Array<{ montantHT: string; tva?: string; tauxTVA?: string }>
    timbreRows?: Array<{ caTTCEsp: string; droitTimbre: string }>
    b12?: string
    b13?: string
    tapRows?: Array<{ tap2: string }>
    caSiegeRows?: Array<{ ttc: string; ht: string }>
    irgRows?: Array<{ montant: string }>
    taxe2Rows?: Array<{ montant: string }>
    masterRows?: Array<{ montantHT: string }>
    taxe11Montant?: string
    taxe12Rows?: Array<{ montant: string }>
    acompteMonths?: string[]
    ibs14Rows?: Array<{ montantIBS: string }>
    ibsFournisseurId?: string
    taxe15Rows?: Array<{ raisonSociale: string; montantAPayer: string }>
    tva16Rows?: Array<{ tva19: string }>
    tva16FournisseurId?: string
  }>
  fiscalFournisseurs?: Array<{ id: number; raisonSociale: string }>
}

const MONTH_OPTIONS = [
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

const IRG_LABELS = [
  "IRG sur Salaire Bareme",
  "Autre IRG 10%",
  "Autre IRG 15%",
  "Jetons de presence 10%",
  "Tantieme 10%",
]

const TAXE12_LABELS = [
  "Taxe de Formation Professionnelle 1%",
  "Taxe d'Apprentissage 1%",
]

const formatCountdown = (daysUntilDeadline: number) => {
  if (daysUntilDeadline < 0) {
    return `${Math.abs(daysUntilDeadline)} jours de retard`
  }

  return `${daysUntilDeadline} jours restant`
}

const formatDeadlineDate = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  const day = String(date.getDate()).padStart(2, "0")
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const year = String(date.getFullYear())
  return `${day}/${month}/${year}`
}

export function RemindersCard({
  reminders,
  loading = false,
  userRole = "",
  directionOptions = [],
  selectedMonth = "",
  selectedYear = "",
  onMonthChange,
  onYearChange,
viewMode = "indicateurs",
  onViewModeChange,
  consolidationTabKey = "encaissement",
  onConsolidationTabChange,
  consolidationStartMonth = "",
  consolidationStartYear = "",
  consolidationEndMonth = "",
  consolidationEndYear = "",
  onConsolidationStartMonthChange,
  onConsolidationStartYearChange,
  onConsolidationEndMonthChange,
  onConsolidationEndYearChange,
  consolidationDirections = [],
  onConsolidationDirectionsChange,
  consolidationSupplierId = "",
  onConsolidationSupplierChange,
  consolidationTabOptions = [],
  consolidationDeclarations = [],
  fiscalFournisseurs = [],
}: RemindersCardProps) {
  const [showFilters, setShowFilters] = useState(false)
  const [selectedDirection, setSelectedDirection] = useState("all")

  const consolidationHelpers = (() => {
    const parseNum = (v: unknown) => {
      const raw = String(v ?? "").replace(/\u00A0/g, " ").trim()
      if (!raw) return 0
      const standardized = raw.replace(/\s/g, "").replace(/,/g, ".")
      const normalizedDots = standardized.replace(/\.(?=.*\.)/g, "")
      const parsed = parseFloat(normalizedDots)
      return Number.isFinite(parsed) ? parsed : 0
    }

    const periodIndex = (mois: string, annee: string) => {
      const m = parseInt(mois, 10)
      const y = parseInt(annee, 10)
      if (!Number.isFinite(m) || !Number.isFinite(y)) return null
      if (m < 1 || m > 12) return null
      return y * 12 + m
    }

    const resolveEncaissementAmounts = (row: { ht?: string; ttc?: string }) => {
      const htRaw = String(row.ht ?? "").trim()
      if (htRaw !== "") {
        const ht = parseNum(htRaw)
        const tva = ht * 0.19
        return { ht, tva, ttc: ht + tva }
      }

      const ttc = parseNum(row.ttc ?? "")
      const ht = ttc / 1.19
      return { ht, tva: ttc - ht, ttc }
    }

    const getTvaAmount = (row: { montantHT: string; tva?: string; tauxTVA?: string }) => {
      const rate = String(row.tauxTVA ?? "").trim()
      if (rate === "19" || rate === "9") {
        return parseNum(row.montantHT) * (parseInt(rate, 10) / 100)
      }
      return parseNum(row.tva)
    }

    return { parseNum, periodIndex, resolveEncaissementAmounts, getTvaAmount }
  })()
  const normalizedRole = userRole.trim().toLowerCase()
  const isAdmin = normalizedRole === "admin"
  const isGlobalRole = normalizedRole === "direction" || normalizedRole === "global" || normalizedRole === "globale"

  const availableDirectionOptions = useMemo(
    () =>
      (directionOptions.length > 0
        ? directionOptions
        : Array.from(new Set(reminders.map((r) => r.direction).filter(Boolean)))
      ).sort((a, b) => a.localeCompare(b, "fr")),
    [directionOptions, reminders],
  )

  const { parseNum, periodIndex, resolveEncaissementAmounts, getTvaAmount } = consolidationHelpers

  const consolidationDirectionOptions = availableDirectionOptions

  const consolidationSupplierOptions = useMemo(() => {
    if (!fiscalFournisseurs.length || !consolidationDeclarations.length) return []

    const usedSupplierIds = new Set<string>()
    const usedSupplierNames = new Set<string>()

    for (const decl of consolidationDeclarations) {
      if (!decl) continue
      if (decl.tabKey === "ibs" && decl.ibsFournisseurId) {
        usedSupplierIds.add(String(decl.ibsFournisseurId))
      }
      if (decl.tabKey === "tva_autoliq" && decl.tva16FournisseurId) {
        usedSupplierIds.add(String(decl.tva16FournisseurId))
      }
      if (decl.tabKey === "taxe_domicil") {
        for (const row of decl.taxe15Rows ?? []) {
          const label = normalizeSupplierName(row.raisonSociale ?? "")
          if (label) usedSupplierNames.add(label)
        }
      }
    }

    return fiscalFournisseurs
      .filter((item) =>
        usedSupplierIds.has(String(item.id))
        || usedSupplierNames.has(normalizeSupplierName(item.raisonSociale ?? "")),
      )
      .sort((a, b) => String(a.raisonSociale ?? "").localeCompare(String(b.raisonSociale ?? ""), "fr"))
  }, [consolidationDeclarations, fiscalFournisseurs])

  const selectedSupplier = useMemo(
    () => consolidationSupplierOptions.find((item) => String(item.id) === String(consolidationSupplierId)),
    [consolidationSupplierId, consolidationSupplierOptions],
  )

  const filteredConsolidationDeclarations = useMemo(() => {
    if (!consolidationDeclarations.length) return []

    const startIndex = periodIndex(consolidationStartMonth, consolidationStartYear)
    const endIndex = periodIndex(consolidationEndMonth, consolidationEndYear)
    if (startIndex === null || endIndex === null) return []

    const minIndex = Math.min(startIndex, endIndex)
    const maxIndex = Math.max(startIndex, endIndex)
    const directionFilters = consolidationDirections
      .map((direction) => normalizeDirectionKey(direction))
      .filter(Boolean)

    return consolidationDeclarations.filter((decl) => {
      if (!decl || decl.tabKey !== consolidationTabKey) return false
      const declIndex = periodIndex(String(decl.mois ?? ""), String(decl.annee ?? ""))
      if (declIndex === null || declIndex < minIndex || declIndex > maxIndex) return false

      if (directionFilters.length > 0) {
        const declDirection = normalizeDirectionKey(String(decl.direction ?? ""))
        if (!directionFilters.includes(declDirection)) return false
      }

      if (consolidationTabKey === "ibs" && consolidationSupplierId) {
        return String(decl.ibsFournisseurId ?? "") === String(consolidationSupplierId)
      }
      if (consolidationTabKey === "tva_autoliq" && consolidationSupplierId) {
        return String(decl.tva16FournisseurId ?? "") === String(consolidationSupplierId)
      }

      return true
    })
  }, [
    consolidationDeclarations,
    consolidationDirections,
    consolidationEndMonth,
    consolidationEndYear,
    consolidationStartMonth,
    consolidationStartYear,
    consolidationSupplierId,
    consolidationTabKey,
    periodIndex,
  ])

  const consolidationTiles = useMemo(() => {
    if (!filteredConsolidationDeclarations.length) return []

    const tiles: Array<{ label: string; value: number; icon: React.ReactNode; valueClassName?: string }> = []

    switch (consolidationTabKey) {
      case "encaissement": {
        let totalTtc = 0
        let totalExonere = 0
        for (const decl of filteredConsolidationDeclarations) {
          for (const row of decl.encRows ?? []) {
            const amounts = resolveEncaissementAmounts(row)
            totalTtc += amounts.ttc
            const designation = String(row.designation ?? "").toLowerCase()
            if (designation.includes("exon")) {
              totalExonere += amounts.ttc
            }
          }
        }
        tiles.push({
          label: "Montant TTC",
          value: totalTtc,
          icon: <Wallet className="h-4 w-4 text-blue-500" />,
          valueClassName: "text-blue-600",
        })
        tiles.push({
          label: "Montant Exonere",
          value: totalExonere,
          icon: <FileText className="h-4 w-4 text-purple-500" />,
          valueClassName: "text-purple-600",
        })
        return tiles
      }
      case "ca_siege": {
        let totalTtc = 0
        let totalExonere = 0
        for (const decl of filteredConsolidationDeclarations) {
          const rows = decl.caSiegeRows ?? []
          totalTtc += rows.reduce((sum, row) => sum + parseNum(row.ttc), 0)
          totalExonere += parseNum(rows[1]?.ttc)
        }
        tiles.push({
          label: "Montant TTC",
          value: totalTtc,
          icon: <Wallet className="h-4 w-4 text-blue-500" />,
          valueClassName: "text-blue-600",
        })
        tiles.push({
          label: "Montant Exonere",
          value: totalExonere,
          icon: <FileText className="h-4 w-4 text-purple-500" />,
          valueClassName: "text-purple-600",
        })
        return tiles
      }
      case "tva_immo":
      case "tva_biens": {
        let totalGeneral = 0
        for (const decl of filteredConsolidationDeclarations) {
          const rows = consolidationTabKey === "tva_immo" ? (decl.tvaImmoRows ?? []) : (decl.tvaBiensRows ?? [])
          for (const row of rows) {
            const ht = parseNum(row.montantHT)
            const tva = getTvaAmount(row)
            totalGeneral += ht + tva
          }
        }
        tiles.push({
          label: "Total general",
          value: totalGeneral,
          icon: <Wallet className="h-4 w-4 text-blue-500" />,
          valueClassName: "text-blue-600",
        })
        return tiles
      }
      case "droits_timbre": {
        const totalDroit = filteredConsolidationDeclarations.reduce((sum, decl) =>
          sum + (decl.timbreRows ?? []).reduce((s, row) => s + parseNum(row.droitTimbre), 0),
        0)
        tiles.push({
          label: "Total droits de timbre",
          value: totalDroit,
          icon: <BarChart3 className="h-4 w-4 text-emerald-500" />,
          valueClassName: "text-emerald-600",
        })
        return tiles
      }
      case "etat_tap": {
        const totalTap = filteredConsolidationDeclarations.reduce((sum, decl) =>
          sum + (decl.tapRows ?? []).reduce((s, row) => s + parseNum(row.tap2) * 0.015, 0),
        0)
        tiles.push({
          label: "Total TAP 1,5%",
          value: totalTap,
          icon: <BarChart3 className="h-4 w-4 text-amber-500" />,
          valueClassName: "text-amber-600",
        })
        return tiles
      }
      case "taxe2": {
        const totalTaxe = filteredConsolidationDeclarations.reduce((sum, decl) =>
          sum + (decl.taxe2Rows ?? []).reduce((s, row) => s + parseNum(row.montant), 0),
        0)
        tiles.push({
          label: "Total taxe 2%",
          value: totalTaxe,
          icon: <BarChart3 className="h-4 w-4 text-indigo-500" />,
          valueClassName: "text-indigo-600",
        })
        return tiles
      }
      case "taxe_masters": {
        const totalTaxe = filteredConsolidationDeclarations.reduce((sum, decl) =>
          sum + (decl.masterRows ?? []).reduce((s, row) => s + parseNum(row.montantHT) * 0.015, 0),
        0)
        tiles.push({
          label: "Total taxe 1,5%",
          value: totalTaxe,
          icon: <BarChart3 className="h-4 w-4 text-sky-500" />,
          valueClassName: "text-sky-600",
        })
        return tiles
      }
      case "taxe_vehicule": {
        const totalVehicule = filteredConsolidationDeclarations.reduce((sum, decl) =>
          sum + parseNum(decl.taxe11Montant),
        0)
        tiles.push({
          label: "Total taxe vehicule",
          value: totalVehicule,
          icon: <Car className="h-4 w-4 text-amber-500" />,
          valueClassName: "text-amber-600",
        })
        return tiles
      }
      case "ca_tap": {
        let totalTaxe7 = 0
        let totalTaxe1 = 0
        for (const decl of filteredConsolidationDeclarations) {
          const b12 = parseNum(decl.b12)
          const b13 = parseNum(decl.b13)
          totalTaxe7 += b12 * 0.07
          totalTaxe1 += b13 * 0.01
        }
        tiles.push({
          label: "Total taxe 7%",
          value: totalTaxe7,
          icon: <BarChart3 className="h-4 w-4 text-emerald-500" />,
          valueClassName: "text-emerald-600",
        })
        tiles.push({
          label: "Total taxe 1%",
          value: totalTaxe1,
          icon: <BarChart3 className="h-4 w-4 text-amber-500" />,
          valueClassName: "text-amber-600",
        })
        return tiles
      }
      case "irg": {
        const totals = new Array(IRG_LABELS.length).fill(0)
        for (const decl of filteredConsolidationDeclarations) {
          for (let i = 0; i < IRG_LABELS.length; i += 1) {
            totals[i] += parseNum(decl.irgRows?.[i]?.montant)
          }
        }
        return IRG_LABELS.map((label, index) => ({
          label,
          value: totals[index],
          icon: <BarChart3 className="h-4 w-4 text-emerald-500" />,
          valueClassName: "text-emerald-600",
        }))
      }
      case "taxe_formation": {
        const totals = new Array(TAXE12_LABELS.length).fill(0)
        for (const decl of filteredConsolidationDeclarations) {
          for (let i = 0; i < TAXE12_LABELS.length; i += 1) {
            totals[i] += parseNum(decl.taxe12Rows?.[i]?.montant)
          }
        }
        return TAXE12_LABELS.map((label, index) => ({
          label,
          value: totals[index],
          icon: <BarChart3 className="h-4 w-4 text-emerald-500" />,
          valueClassName: "text-emerald-600",
        }))
      }
      case "ibs": {
        const totalIbs = filteredConsolidationDeclarations.reduce((sum, decl) =>
          sum + (decl.ibs14Rows ?? []).reduce((s, row) => s + parseNum(row.montantIBS), 0),
        0)
        tiles.push({
          label: "Total IBS",
          value: totalIbs,
          icon: <BarChart3 className="h-4 w-4 text-amber-500" />,
          valueClassName: "text-amber-600",
        })
        return tiles
      }
      case "taxe_domicil": {
        const selectedName = normalizeSupplierName(selectedSupplier?.raisonSociale ?? "")
        const totalDomicil = filteredConsolidationDeclarations.reduce((sum, decl) =>
          sum + (decl.taxe15Rows ?? []).reduce((s, row) => {
            if (selectedName) {
              return normalizeSupplierName(row.raisonSociale ?? "") === selectedName
                ? s + parseNum(row.montantAPayer)
                : s
            }
            return s + parseNum(row.montantAPayer)
          }, 0),
        0)
        tiles.push({
          label: "Total taxe domiciliation",
          value: totalDomicil,
          icon: <BarChart3 className="h-4 w-4 text-amber-500" />,
          valueClassName: "text-amber-600",
        })
        return tiles
      }
      case "tva_autoliq": {
        const totalAutoliq = filteredConsolidationDeclarations.reduce((sum, decl) =>
          sum + (decl.tva16Rows ?? []).reduce((s, row) => s + parseNum(row.tva19), 0),
        0)
        tiles.push({
          label: "Total TVA auto liquidation",
          value: totalAutoliq,
          icon: <BarChart3 className="h-4 w-4 text-amber-500" />,
          valueClassName: "text-amber-600",
        })
        return tiles
      }
      case "acompte": {
        const totalAcompte = filteredConsolidationDeclarations.reduce((sum, decl) =>
          sum + (decl.acompteMonths ?? []).reduce((s, value) => s + parseNum(value), 0),
        0)
        tiles.push({
          label: "Total acompte",
          value: totalAcompte,
          icon: <BarChart3 className="h-4 w-4 text-indigo-500" />,
          valueClassName: "text-indigo-600",
        })
        return tiles
      }
      default:
        return tiles
    }
  }, [
    consolidationTabKey,
    filteredConsolidationDeclarations,
    getTvaAmount,
    parseNum,
    resolveEncaissementAmounts,
    selectedSupplier,
  ])

  const filteredReminders = useMemo(() => {
    if (!isAdmin || selectedDirection === "all") return reminders
    const selectedDirectionKey = normalizeDirectionKey(selectedDirection)
    return reminders.filter((r) => normalizeDirectionKey(r.direction) === selectedDirectionKey)
  }, [isAdmin, reminders, selectedDirection])

  const directionStatus = useMemo(() => {
    if (!isAdmin && !isGlobalRole) return null

    const totalDirections = availableDirectionOptions.length
    const remindersByDirection = new Map(
      reminders
        .map((r) => [normalizeDirectionKey(r.direction ?? ""), r] as const)
        .filter(([direction]) => direction.length > 0),
    )

    const upToDateDirections = availableDirectionOptions.reduce((count: number, direction: string) => {
      const reminder = remindersByDirection.get(normalizeDirectionKey(direction))
      if (!reminder) {
        return count
      }

      return reminder.remainingToEnterTabs === 0 && reminder.remainingToApproveTabs === 0
        ? count + 1
        : count
    }, 0)

    return {
      upToDateDirections,
      totalDirections,
    }
  }, [isAdmin, isGlobalRole, availableDirectionOptions, reminders])

  const remindersForDisplay = useMemo(() => {
    // Utiliser directement les rappels du backend sans recalcul local
    // Le backend calcule correctement la période fiscale et le deadline

    if (isAdmin && selectedDirection === "all") {
      if (availableDirectionOptions.length === 0) {
        return filteredReminders.length > 0 ? filteredReminders : []
      }

      const remindersByDirection = new Map(
        filteredReminders.map((reminder) => [normalizeDirectionKey(reminder.direction), reminder] as const),
      )

      // Retourner les rappels du backend pour chaque direction, sans modification
      return availableDirectionOptions
        .map((direction: string) => remindersByDirection.get(normalizeDirectionKey(direction)))
        .filter((reminder: ReminderData | undefined) => reminder !== undefined) as ReminderData[]
    }

    // Pour les non-admins ou quand une direction est sélectionnée, retourner les rappels directement
    return filteredReminders
  }, [availableDirectionOptions, filteredReminders, isAdmin, selectedDirection])

  const hasActiveReminder = useMemo(() => {
    if ((isAdmin || isGlobalRole) && directionStatus) {
      if (directionStatus.totalDirections === 0) return false
      return directionStatus.upToDateDirections < directionStatus.totalDirections
    }

    return reminders.some((reminder) =>
      reminder.daysUntilDeadline <= 5
      && (reminder.remainingToEnterTabs > 0 || reminder.remainingToApproveTabs > 0),
    )
  }, [reminders, isAdmin, isGlobalRole, directionStatus])

  const lastDeadlineLabel = useMemo(() => {
    if (remindersForDisplay.length === 0) return "-"

    const lastDeadline = remindersForDisplay.reduce((latest, current) => {
      const latestTime = new Date(latest.deadline).getTime()
      const currentTime = new Date(current.deadline).getTime()
      return currentTime > latestTime ? current : latest
    }, remindersForDisplay[0])

    return formatDeadlineDate(lastDeadline.deadline)
  }, [remindersForDisplay])

  if (loading) {
    return (
      <Card className="border-yellow-200 bg-yellow-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Hourglass size={18} className="text-yellow-700" />
            Rappels et delais
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-yellow-800">Chargement des rappels...</p>
        </CardContent>
      </Card>
    )
  }

  const fmtNumber = (v: number | string) => {
    if (v === "" || isNaN(Number(v))) return "0"
    const num = Number(v)
    const [intPart, decPart] = num.toFixed(2).split(".")
    const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, " ")
    return `${formattedInt},${decPart}`
  }

  const consolidationTabLabel =
    consolidationTabOptions.find((tab) => tab.key === consolidationTabKey)?.label
    ?? (consolidationTabKey ? formatTabKey(consolidationTabKey) : "-")
  const consolidationPeriodLabel =
    consolidationStartMonth && consolidationStartYear && consolidationEndMonth && consolidationEndYear
      ? `${consolidationStartMonth}/${consolidationStartYear} - ${consolidationEndMonth}/${consolidationEndYear}`
      : "-"

  return (
    <div className="space-y-3">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Switch
                id="view-mode-toggle"
                checked={viewMode === "consolidation"}
                onCheckedChange={(checked) => onViewModeChange?.(checked ? "consolidation" : "indicateurs")}
              />
              <span className="text-sm font-medium">
                {viewMode === "consolidation" ? "Consolidation" : "Indicateurs"}
              </span>
            </div>
          </div>
          <Button onClick={() => setShowFilters(!showFilters)} variant="outline" size="sm" className="gap-2">
            <Filter className="h-4 w-4" style={{ color: "#e82c2a" }} />
            {showFilters ? "Masquer les filtres" : "Afficher les filtres"}
          </Button>
        </div>

        {showFilters && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Filtres {viewMode === "consolidation" ? "consolidation" : "indicateurs"}</CardTitle>
            </CardHeader>
            <CardContent>
              {viewMode === "consolidation" ? (
                <div className="flex flex-wrap items-end gap-3">
                  <div className="space-y-2 min-w-40">
                    <p className="text-sm font-medium">Tableau</p>
                    <Select
                      value={consolidationTabKey}
                      onValueChange={(value) => onConsolidationTabChange?.(value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un tableau" />
                      </SelectTrigger>
                      <SelectContent>
                        {consolidationTabOptions.map((tab) => (
                          <SelectItem key={tab.key} value={tab.key}>
                            {tab.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 min-w-44">
                    <p className="text-sm font-medium">Période début</p>
                    <div className="flex gap-1.5">
                      <Select
                        value={consolidationStartMonth}
                        onValueChange={(value) => onConsolidationStartMonthChange?.(value)}
                        className="flex-1"
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Mois" />
                        </SelectTrigger>
                        <SelectContent>
                          {MONTH_OPTIONS.map((month) => (
                            <SelectItem key={month.value} value={month.value}>
                              {month.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        inputMode="numeric"
                        min={2000}
                        max={2100}
                        placeholder="Année"
                        className="w-22 h-9"
                        value={consolidationStartYear}
                        onChange={(event) =>
                          onConsolidationStartYearChange?.(event.target.value.replace(/\D/g, "").slice(0, 4))
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-2 min-w-44">
                    <p className="text-sm font-medium">Période fin</p>
                    <div className="flex gap-1.5">
                      <Select
                        value={consolidationEndMonth}
                        onValueChange={(value) => onConsolidationEndMonthChange?.(value)}
                        className="flex-1"
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Mois" />
                        </SelectTrigger>
                        <SelectContent>
                          {MONTH_OPTIONS.map((month) => (
                            <SelectItem key={month.value} value={month.value}>
                              {month.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        inputMode="numeric"
                        min={2000}
                        max={2100}
                        placeholder="Année"
                        className="w-22 h-9"
                        value={consolidationEndYear}
                        onChange={(event) =>
                          onConsolidationEndYearChange?.(event.target.value.replace(/\D/g, "").slice(0, 4))
                        }
                      />
                    </div>
                  </div>

                  {(["ibs", "taxe_domicil", "tva_autoliq"].includes(consolidationTabKey)) && (
                    <div className="space-y-2 min-w-36">
                      <p className="text-sm font-medium">Fournisseur</p>
                      <Select
                        value={consolidationSupplierId || "all"}
                        onValueChange={(value) => onConsolidationSupplierChange?.(value === "all" ? "" : value)}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Tout" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tout</SelectItem>
                          {consolidationSupplierOptions.map((supplier) => (
                            <SelectItem key={supplier.id} value={String(supplier.id)}>
                              {supplier.raisonSociale}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {isAdmin && (
                    <div className="inline-flex items-center gap-2">
                      <span className="text-sm font-medium">Directions:</span>
                      <details className="relative inline-block">
                        <summary className="border-input data-[placeholder]:text-muted-foreground flex w-fit items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 h-9 cursor-pointer">
                          <span className="text-sm">
                            {consolidationDirections.length === 0
                              ? "Toutes"
                              : `${consolidationDirections.length}`}
                          </span>
                          <ChevronDownIcon className="size-4 opacity-50" />
                        </summary>

                        <div className="mt-1 p-2 border rounded-md bg-white max-h-64 overflow-auto absolute z-10 min-w-48 shadow-lg">
                          <div className="flex items-center gap-2 mb-2 p-1">
                            <Checkbox
                              id="select-all-directions"
                              checked={consolidationDirections.length === 0 || consolidationDirections.length === consolidationDirectionOptions.length}
                              onCheckedChange={(checked) =>
                                onConsolidationDirectionsChange?.(checked ? consolidationDirectionOptions : [])
                              }
                            />
                            <label htmlFor="select-all-directions" className="text-sm font-medium cursor-pointer">
                              Tout sélectionner
                            </label>
                          </div>

                          {consolidationDirectionOptions.map((direction) => {
                            const isChecked = consolidationDirections.length === 0
                              || consolidationDirections.some((item) => normalizeDirectionKey(item) === normalizeDirectionKey(direction))
                            return (
                              <div
                                key={direction}
                                className="flex items-center gap-2 py-1.5 px-2 hover:bg-gray-100 rounded cursor-pointer"
                              >
                                <Checkbox
                                  id={`dir-${direction}`}
                                  checked={isChecked}
                                  onCheckedChange={(checked) => {
                                    const currentSelections = consolidationDirections.length === 0
                                      ? consolidationDirectionOptions
                                      : consolidationDirections
                                    if (checked) {
                                      const next = Array.from(new Set([...currentSelections, direction]))
                                      onConsolidationDirectionsChange?.(next)
                                      return
                                    }

                                    const next = currentSelections.filter(
                                      (item) => normalizeDirectionKey(item) !== normalizeDirectionKey(direction),
                                    )
                                    onConsolidationDirectionsChange?.(next)
                                  }}
                                />
                                <label htmlFor={`dir-${direction}`} className="text-sm cursor-pointer">
                                  {direction}
                                </label>
                              </div>
                            )
                          })}
                        </div>
                      </details>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Mois</p>
                    <Select value={selectedMonth} onValueChange={(value) => onMonthChange?.(value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selectionner un mois" />
                      </SelectTrigger>
                      <SelectContent>
                        {MONTH_OPTIONS.map((month) => (
                          <SelectItem key={month.value} value={month.value}>
                            {month.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Annee</p>
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={2000}
                      max={2100}
                      placeholder="ex: 2026"
                      value={selectedYear}
                      onChange={(event) => onYearChange?.(event.target.value.replace(/\D/g, "").slice(0, 4))}
                    />
                  </div>

                  {isAdmin && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Direction</p>
                      <Select
                        value={selectedDirection}
                        onValueChange={(value) => setSelectedDirection(value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Tout" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tout</SelectItem>
                          {availableDirectionOptions.map((direction) => (
                            <SelectItem key={direction} value={direction}>
                              {direction}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {viewMode === "consolidation" ? (
        <div className="space-y-2">
          <div className="flex flex-wrap justify-between items-center gap-2">
            <p className="text-sm font-medium text-muted-foreground">
              Tableau: <span className="text-foreground">{consolidationTabLabel}</span>
            </p>
            <p className="text-sm font-medium text-muted-foreground">
              Période: <span className="text-foreground">{consolidationPeriodLabel}</span>
            </p>
          </div>
          {consolidationTiles.length === 0 ? (
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="pt-6">
                <p className="text-sm text-amber-800">Aucune donnée disponible pour ces filtres.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="overflow-x-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 min-w-[640px]">
                {consolidationTiles.map((tile, index) => (
                  <IndicatorBrick
                    key={`${tile.label}-${index}`}
                    label={tile.label}
                    value={fmtNumber(tile.value)}
                    icon={tile.icon}
                    valueClassName={tile.valueClassName}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <ReminderKpiRow reminders={remindersForDisplay} directionStatus={directionStatus} />
      )}

      {hasActiveReminder ? (
        <div className="rounded-md bg-red-700 px-3 py-2">
          <p className="text-sm font-semibold text-yellow-300 whitespace-nowrap overflow-hidden text-ellipsis">
            Rappel: delai proche. Verifiez et completez vos declarations fiscales en attente ({lastDeadlineLabel})
          </p>
        </div>
      ) : (
        <div className="rounded-md bg-green-50 border border-green-200 px-3 py-2">
          <p className="text-sm font-medium text-green-800">
            Les declarations de la direction sont a jour. Dernier delai: {lastDeadlineLabel}.
          </p>
        </div>
      )}
    </div>
  )
}

function ReminderKpiRow({
  reminders,
  directionStatus,
}: {
  reminders: ReminderData[]
  directionStatus: { upToDateDirections: number; totalDirections: number } | null
}) {
  // Si aucun rappel n'existe, afficher un message d'erreur
  if (!reminders || reminders.length === 0) {
    return (
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="pt-6">
          <p className="text-sm text-amber-800">Aucun rappel disponible pour cette période.</p>
        </CardContent>
      </Card>
    )
  }

  const closestReminder = reminders.reduce((acc, current) =>
    current.daysUntilDeadline < acc.daysUntilDeadline ? current : acc,
  reminders[0])

  const totalTabs = reminders.reduce((sum, reminder) => sum + reminder.totalTabs, 0)
  const enteredTabs = reminders.reduce((sum, reminder) => sum + reminder.enteredTabs, 0)
  const approvedTabs = reminders.reduce((sum, reminder) => sum + reminder.approvedTabs, 0)
  const remainingToEnterTabs = reminders.reduce((sum, reminder) => sum + reminder.remainingToEnterTabs, 0)
  const remainingToEnterTabLabels = Array.from(new Set(
    reminders.flatMap((reminder) => reminder.missingToEnterTabs ?? []),
  ))
    .map((tabKey) => formatTabKey(tabKey))
    .sort((a, b) => a.localeCompare(b, "fr"))
  const currentPeriodLabel = `${closestReminder.mois}/${closestReminder.annee}`

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <p className="text-sm font-medium text-muted-foreground">
          Periode en cours: <span className="text-foreground">{currentPeriodLabel}</span>
        </p>
      </div>

      <div className="overflow-x-auto">
        <div className={`grid ${directionStatus ? "grid-cols-5 min-w-[1120px]" : "grid-cols-4 min-w-[900px]"} gap-3`}>
        <div>
          <IndicatorBrick
            label="Temps restant avant delai"
            value={formatCountdown(closestReminder.daysUntilDeadline)}
            icon={<Hourglass className="h-4 w-4 text-orange-500" />}
            valueClassName="text-orange-600"
          />
        </div>
        <div>
          <IndicatorBrick
            label="tableaux saisis"
            value={`${enteredTabs}/${totalTabs}`}
            icon={<ClipboardList className="h-4 w-4" style={{ color: "#e82c2a" }} />}
          />
        </div>
        <div>
          <IndicatorBrick
            label="tableaux approuvés"
            value={`${approvedTabs}/${totalTabs}`}
            icon={<ShieldCheck className="h-4 w-4 text-green-500" />}
            valueClassName="text-green-600"
          />
        </div>
        <div>
          <IndicatorBrick
            label="tableaux restants a saisir"
            value={String(remainingToEnterTabs)}
            icon={<FileClock className="h-4 w-4 text-amber-500" />}
            valueClassName="text-amber-600"
            tooltipLines={remainingToEnterTabLabels}
          />
        </div>
        {directionStatus && (
          <div>
            <IndicatorBrick
              label="Directions a jour"
              value={`${directionStatus.upToDateDirections}/${directionStatus.totalDirections}`}
              icon={<Building2 className="h-4 w-4 text-blue-500" />}
              valueClassName="text-blue-600"
            />
          </div>
        )}
        </div>
      </div>
    </div>
  )
}

function IndicatorBrick({
  label,
  value,
  icon,
  valueClassName,
  tooltipLines = [],
}: {
  label: string
  value: string
  icon: React.ReactNode
  valueClassName?: string
  tooltipLines?: string[]
}) {
  const hasTooltip = tooltipLines.length > 0

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        {hasTooltip ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className={`text-2xl font-bold underline decoration-dotted cursor-help ${valueClassName ?? ""}`.trim()}>{value}</div>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <p className="font-semibold mb-1">Tableaux restants a saisir</p>
              <ul className="list-disc pl-4 space-y-0.5">
                {tooltipLines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </TooltipContent>
          </Tooltip>
        ) : (
          <div className={`text-2xl font-bold ${valueClassName ?? ""}`.trim()}>{value}</div>
        )}
      </CardContent>
    </Card>
  )
}

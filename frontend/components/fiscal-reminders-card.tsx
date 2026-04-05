"use client"

import { useMemo, useState } from "react"
import { AlertCircle, CheckCircle2, Hourglass, ClipboardList, FileClock, ShieldCheck, Filter, Building2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ReminderData } from "@/lib/fiscal-reminders"

const normalizeDirectionKey = (value: string) => {
  const normalized = (value ?? "").trim().toLowerCase()
  if (!normalized) return ""
  if (normalized === "siege" || normalized === "siège" || normalized.includes("siege") || normalized.includes("siège")) {
    return "siège"
  }
  return normalized
}

interface RemindersCardProps {
  reminders: ReminderData[]
  loading?: boolean
  userRole?: string
  directionOptions?: string[]
}

const formatCountdown = (daysUntilDeadline: number) => {
  if (daysUntilDeadline < 0) {
    return `${Math.abs(daysUntilDeadline)} jours de retard`
  }

  return `${daysUntilDeadline} jours restant`
}

export function RemindersCard({ reminders, loading = false, userRole = "", directionOptions = [] }: RemindersCardProps) {
  const [showFilters, setShowFilters] = useState(false)
  const [selectedDirection, setSelectedDirection] = useState("all")
  const isAdmin = userRole.trim().toLowerCase() === "admin"

  const availableDirectionOptions = useMemo(
    () =>
      (directionOptions.length > 0
        ? directionOptions
        : Array.from(new Set(reminders.map((r) => r.direction).filter(Boolean)))
      ).sort((a, b) => a.localeCompare(b, "fr")),
    [directionOptions, reminders],
  )

  const filteredReminders = useMemo(() => {
    if (!isAdmin || selectedDirection === "all") return reminders
    const selectedDirectionKey = normalizeDirectionKey(selectedDirection)
    return reminders.filter((r) => normalizeDirectionKey(r.direction) === selectedDirectionKey)
  }, [isAdmin, reminders, selectedDirection])

  const directionStatus = useMemo(() => {
    if (!isAdmin) return null

    const totalDirections = availableDirectionOptions.length
    const remindersByDirection = new Map(
      reminders
        .map((r) => [normalizeDirectionKey(r.direction ?? ""), r] as const)
        .filter(([direction]) => direction.length > 0),
    )

    const upToDateDirections = availableDirectionOptions.reduce((count, direction) => {
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
  }, [isAdmin, availableDirectionOptions, reminders])

  const remindersForDisplay = useMemo(() => {
    const now = new Date()
    const targetPeriod = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const month = String(targetPeriod.getMonth() + 1).padStart(2, "0")
    const year = String(targetPeriod.getFullYear())
    const deadline = new Date(targetPeriod.getFullYear(), targetPeriod.getMonth() + 1, 7, 23, 59, 59)
    const daysUntilDeadline = Math.floor((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    const expectedTabsForDirection = (direction: string) => {
      const normalizedDirection = direction.trim().toLowerCase()
      const isSiegeDirection = normalizedDirection === "siège"
        || normalizedDirection === "siege"
        || normalizedDirection.includes("siège")
        || normalizedDirection.includes("siege")
      return isSiegeDirection ? 10 : 6
    }

    const makeFallback = (direction: string): ReminderData => {
      const expectedTotalTabs = expectedTabsForDirection(direction)
      return {
        direction,
        mois: month,
        annee: year,
        deadline: deadline.toISOString(),
        daysUntilDeadline,
        totalTabs: expectedTotalTabs,
        enteredTabs: 0,
        approvedTabs: 0,
        remainingToEnterTabs: expectedTotalTabs,
        remainingToApproveTabs: 0,
        missingTabs: [],
        isUrgent: daysUntilDeadline <= 5 && daysUntilDeadline >= 0,
      }
    }

    if (isAdmin && selectedDirection === "all") {
      if (availableDirectionOptions.length === 0) {
        if (filteredReminders.length > 0) return filteredReminders
        return [
          {
            direction: "Tout",
            mois: month,
            annee: year,
            deadline: deadline.toISOString(),
            daysUntilDeadline,
            totalTabs: 0,
            enteredTabs: 0,
            approvedTabs: 0,
            remainingToEnterTabs: 0,
            remainingToApproveTabs: 0,
            missingTabs: [],
            isUrgent: daysUntilDeadline <= 5 && daysUntilDeadline >= 0,
          } satisfies ReminderData,
        ]
      }

      const remindersByDirection = new Map(
        filteredReminders.map((reminder) => [normalizeDirectionKey(reminder.direction), reminder] as const),
      )

      return availableDirectionOptions.map((direction) => {
        const reminder = remindersByDirection.get(normalizeDirectionKey(direction))
        return reminder ?? makeFallback(direction)
      })
    }

    if (filteredReminders.length > 0) return filteredReminders

    const fallbackDirection = isAdmin ? selectedDirection : "Direction"
    return [makeFallback(fallbackDirection)]
  }, [availableDirectionOptions, filteredReminders, isAdmin, selectedDirection])

  const hasActiveReminder = useMemo(() => {
    return reminders.some((reminder) =>
      reminder.daysUntilDeadline <= 5
      && (reminder.remainingToEnterTabs > 0 || reminder.remainingToApproveTabs > 0),
    )
  }, [reminders])

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

  return (
    <div className="space-y-3">
      {isAdmin && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <Button onClick={() => setShowFilters(!showFilters)} variant="outline" size="sm" className="gap-2">
              <Filter className="h-4 w-4" style={{ color: "#e82c2a" }} />
              {showFilters ? "Masquer les filtres" : "Afficher les filtres"}
            </Button>
          </div>

          {showFilters && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Filtres indicateurs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-w-xs space-y-2">
                  <p className="text-sm font-medium">Direction</p>
                  <Select value={selectedDirection} onValueChange={setSelectedDirection}>
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
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <ReminderKpiRow reminders={remindersForDisplay} directionStatus={directionStatus} />

      {hasActiveReminder ? (
        <div className="rounded-md bg-red-700 px-3 py-2">
          <p className="text-sm font-semibold text-yellow-300 whitespace-nowrap overflow-hidden text-ellipsis">
            Rappel: delai proche. Verifiez et completez vos declarations fiscales en attente.
          </p>
        </div>
      ) : (
        <div className="rounded-md bg-green-50 border border-green-200 px-3 py-2">
          <p className="text-sm font-medium text-green-800">
            Les declarations de la direction sont a jour.
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
  const closestReminder = reminders.reduce((acc, current) =>
    current.daysUntilDeadline < acc.daysUntilDeadline ? current : acc,
  reminders[0])

  const totalTabs = reminders.reduce((sum, reminder) => sum + reminder.totalTabs, 0)
  const enteredTabs = reminders.reduce((sum, reminder) => sum + reminder.enteredTabs, 0)
  const approvedTabs = reminders.reduce((sum, reminder) => sum + reminder.approvedTabs, 0)
  const remainingToEnterTabs = reminders.reduce((sum, reminder) => sum + reminder.remainingToEnterTabs, 0)
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
}: {
  label: string
  value: string
  icon: React.ReactNode
  valueClassName?: string
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${valueClassName ?? ""}`.trim()}>{value}</div>
      </CardContent>
    </Card>
  )
}

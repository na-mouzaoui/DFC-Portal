"use client"

import { LayoutWrapper } from "@/components/layout-wrapper"
import { useAuth } from "@/hooks/use-auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, CheckCircle, Clock, AlertTriangle } from "lucide-react"

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

        {/* Placeholder recent activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Activité récente</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground text-center py-8">
              Aucune déclaration fiscale enregistrée pour le moment.
            </p>
          </CardContent>
        </Card>
      </div>
    </LayoutWrapper>
  )
}

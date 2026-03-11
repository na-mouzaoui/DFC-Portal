"use client"

import { LayoutWrapper } from "@/components/layout-wrapper"
import { FiscalFournisseursManagement } from "@/components/fiscal-fournisseurs-management"
import { useAuth } from "@/hooks/use-auth"
import { Loader2 } from "lucide-react"

export default function GestionFournisseursPage() {
  const { user, isLoading } = useAuth({ requireAuth: true, redirectTo: "/login" })

  if (isLoading || !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <LayoutWrapper user={user}>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Fournisseurs Fiscaux</h1>
          <p className="text-sm text-muted-foreground">
            Gérez vos fournisseurs (Raison Sociale, RC, NIF)
          </p>
        </div>
        <FiscalFournisseursManagement />
      </div>
    </LayoutWrapper>
  )
}

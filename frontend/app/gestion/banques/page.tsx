"use client"

import { LayoutWrapper } from "@/components/layout-wrapper"
import { BankManagement } from "@/components/bank-management"
import { useAuth } from "@/hooks/use-auth"
import { useState } from "react"
import { Loader2 } from "lucide-react"

export default function GestionBanquesPage() {
  const { user, isLoading } = useAuth({ requireAuth: true, redirectTo: "/login" })
  const [banksVersion, setBanksVersion] = useState(0)

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
          <h1 className="text-2xl font-bold">Gestion des Banques</h1>
          <p className="text-sm text-muted-foreground">
            Ajoutez, modifiez ou supprimez les banques disponibles dans le système.
          </p>
        </div>
        <BankManagement onChange={() => setBanksVersion((v) => v + 1)} />
      </div>
    </LayoutWrapper>
  )
}

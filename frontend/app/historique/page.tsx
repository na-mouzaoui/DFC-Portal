"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"

export default function HistoriquePage() {
  const router = useRouter()
  const { status, isLoading } = useAuth({ requireAuth: true, redirectTo: "/login" })

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/dashboard")
    }
  }, [router, status])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-sm text-muted-foreground">
        {isLoading ? "Vérification de la session..." : "Redirection vers le tableau de bord..."}
      </p>
    </div>
  )
}

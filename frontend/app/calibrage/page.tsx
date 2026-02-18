"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function CalibragePage() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/parametres")
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-sm text-muted-foreground">Redirection vers la page paramètres...</p>
    </div>
  )
}

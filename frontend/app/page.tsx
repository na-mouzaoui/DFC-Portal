"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    // Check if user is admin from localStorage
    const token = localStorage.getItem("jwt")
    if (token) {
      // Decode JWT to check role (basic parsing)
      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        if (payload.role === "admin") {
          router.replace("/admin/dashboard")
          return
        }
      } catch (e) {
        // Invalid token, ignore
      }
    }
    
    router.replace("/login")
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center"></div>
  )
}

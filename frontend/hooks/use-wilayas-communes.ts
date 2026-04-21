import { useState, useEffect } from "react"
import { API_BASE } from "@/lib/config"

export interface WilayaCommuneFromApi {
  code: string
  wilaya: string
  communes: { id: string; nom: string }[]
}

export const useWilayasCommunes = () => {
  const [wilayas, setWilayas] = useState<WilayaCommuneFromApi[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = typeof localStorage !== "undefined" ? localStorage.getItem("jwt") : null
        const response = await fetch(`${API_BASE}/api/fiscal/wilayas-communes`, {
          credentials: "include",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        if (!response.ok) throw new Error("Failed to fetch wilayas")
        const data = await response.json()
        setWilayas(data)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error loading wilayas")
        setWilayas([])
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  return { wilayas, loading, error }
}

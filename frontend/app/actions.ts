"use server"

import { revalidatePath } from "next/cache"

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5001"

export async function createCheckAction(data: {
  userId: string
  amount: number
  payee: string
  city: string
  date: string
  reference: string
  bank: string
  ville?: string
  checkbookId?: number | null
}) {
  await fetch(`${API_BASE}/api/checks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
    credentials: "include",
    cache: "no-store",
  })
  revalidatePath("/historique")
  revalidatePath("/dashboard")
}

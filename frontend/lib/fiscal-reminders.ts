import { authFetch } from "./auth-fetch"

export interface ReminderData {
  direction: string
  mois: string
  annee: string
  deadline: string
  daysUntilDeadline: number
  totalTabs: number
  enteredTabs: number
  approvedTabs: number
  remainingToEnterTabs: number
  remainingToApproveTabs: number
  missingTabs: string[]
  isUrgent: boolean
}

interface RemindersResponse {
  reminders: ReminderData[]
}

export const getFiscalReminders = async (): Promise<ReminderData[]> => {
  try {
    const response = await authFetch("/api/fiscal/reminders", { cache: "no-store" })
    if (!response.ok) return []

    const payload = (await response.json().catch(() => null)) as RemindersResponse | ReminderData[] | null

    if (Array.isArray(payload)) return payload
    if (!payload || !Array.isArray(payload.reminders)) return []

    return payload.reminders
  } catch {
    return []
  }
}

export const formatTabKey = (tabKey: string): string => {
  const labels: Record<string, string> = {
    encaissement: "Encaissement",
    tva_immo: "TVA Immo",
    tva_biens: "TVA Biens",
    droits_timbre: "Droits Timbre",
    ca_tap: "C.A. TAP",
    etat_tap: "Etat TAP",
    ca_siege: "C.A. Siege",
    irg: "IRG",
    taxe2: "Taxe 2%",
    taxe_masters: "Taxe Masters",
    taxe_vehicule: "Taxe Vehicule",
    taxe_formation: "Taxe Formation",
    acompte: "Acompte",
    ibs: "IBS",
    taxe_domicil: "Taxe Domiciliation",
    tva_autoliq: "TVA Auto-Liquidation",
  }

  return labels[tabKey] ?? tabKey
}

export const formatPeriodLabel = (mois: string, annee: string): string => {
  const monthLabels: Record<string, string> = {
    "01": "Janvier",
    "02": "Fevrier",
    "03": "Mars",
    "04": "Avril",
    "05": "Mai",
    "06": "Juin",
    "07": "Juillet",
    "08": "Aout",
    "09": "Septembre",
    "10": "Octobre",
    "11": "Novembre",
    "12": "Decembre",
  }

  return `${monthLabels[mois] ?? mois} ${annee}`
}

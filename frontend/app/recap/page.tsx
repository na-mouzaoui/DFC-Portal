"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { LayoutWrapper } from "@/components/layout-wrapper"
import { useAuth } from "@/hooks/use-auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { AccessDeniedDialog } from "@/components/access-denied-dialog"
import { isRegionalFiscalRole } from "@/lib/fiscal-tab-access"
import { getCurrentFiscalPeriod } from "@/lib/fiscal-period-deadline"
import { API_BASE } from "@/lib/config"
import { CheckCircle, Printer, Trash2, Filter, X, Pencil, Save } from "lucide-react"
import { Input } from "@/components/ui/input"

type RecapColumn = {
  key: string
  label: string
  right?: boolean
}

type RecapDefinition = {
  key: string
  title: string
  columns: RecapColumn[]
  rows: Record<string, string>[]
}

type GeneratedRecap = {
  id: string
  key: string
  title: string
  mois: string
  annee: string
  createdAt: string
  isGenerated: boolean
  rows?: Record<string, string>[]
  formulas?: Record<string, string>
  source?: "draft" | "saved"
}

type ApiFiscalRecap = {
  id: number
  key: string
  title: string
  mois: string
  annee: string
  direction: string
  rowsJson: string
  formulasJson: string
  isGenerated: boolean
  createdAt: string
  updatedAt: string
}

type ApiFiscalDeclaration = {
  id: number
  tabKey: string
  mois: string
  annee: string
  direction: string
  dataJson: string
}

type TvaRow = {
  montantHT?: string
  tva?: string
  tauxTVA?: string
}

type TimbreRow = {
  caTTCEsp?: string
  droitTimbre?: string
}

type EtapTapRow = {
  tap2?: string
}

type CaSiegeRow = {
  ttc?: string
  ht?: string
}

type EncaissementRow = {
  ht?: string
  ttc?: string
}

type IrgRow = {
  montant?: string
}

type Taxe2Row = {
  montant?: string
}

type Taxe12Row = {
  montant?: string
}

type MasterRow = {
  montantHT?: string
  taxe15?: string
}

const MONTHS: Record<string, string> = {
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

const RECAP_G50_ROWS = [
  "ACOMPTE PROVISIONEL",
  "TVA COLLECTEE",
  "TVA DEDUCTIBLE",
  "Total TVA a Payer (Voir la Piece)",
  "DROIT DE TIMBRE",
  "TACP 7%",
  "TNFPDAL 1%",
  "IRG SALAIRE",
  "AUTRE IRG",
  "TAXE DE FORMATION",
  "TAXE VEHICULE",
  "LA TAP",
  "TAXE 2%",
  "Total Declaration G 50 (Voir la Piece)",
  "TAXE 1,5% SUR MASTERS (Voir la Piece)",
  "Total",
]

const TVA_SITUATION_ROWS = [
  "Direction Generale",
  "Direction AutoLiquidation",
  "DR Alger",
  "DR Setif",
  "DR Constantine",
  "DR Annaba",
  "DR Chlef",
  "DR Oran",
  "DR Bechar",
  "DR Ouargla",
  "Total",
]

const TVA_RECAP_ROWS = [
  "Précompte",
  "Reversement",
  "Direction Générale",
  "TVA AutoLiquidation",
  "DR Alger",
  "DR Setif",
  "DR Constantine",
  "DR Annaba",
  "DR Chlef",
  "DR Oran",
  "DR Bechar",
  "DR Ouargla",
  "Total",
]

const TVA_COLLECTEE_ROWS = [
  "BNA EXPLOITATION (Siege)",
  "CCP POST PAID (Siege)",
  "CCP MOBIPOSTE (Siege)",
  "CCP RACIMO (Siege)",
  "SOFIA CCP",
  "CCP DME",
  "ALGERIE POSTE",
  "VENTE TERMINAUX",
  "CCP RECOUVREMENT A",
  "CCP RECOUVREMENT B",
  "ENCAISSEMENT TPE CCP",
  "ENCAISSEMENT TPE BNA",
  "Total (1)",
  "DR Alger",
  "DR Setif",
  "DR Constantine",
  "DR Annaba",
  "DR Chlef",
  "DR Oran",
  "DR Bechar",
  "DR Ouargla",
  "Total (2)",
  "Total (1)+(2)",
]

const TVA_COLLECTEE_DR_ROWS = [
  "DR Alger",
  "DR Setif",
  "DR Constantine",
  "DR Annaba",
  "DR Chlef",
  "DR Oran",
  "DR Bechar",
  "DR Ouargla",
] as const

const DROITS_TIMBRE_ROWS = [
  "DR Alger",
  "DR Setif",
  "DR Constantine",
  "DR Annaba",
  "DR Chlef",
  "DR Oran",
  "DR Bechar",
  "DR Ouargla",
  "Total",
]

const TACP7_ROWS = [
  "Masters",
  "Mobiposte",
  "Racimo",
  "Algerie Poste",
  "DR Alger",
  "DR Setif",
  "DR Constantine",
  "DR Annaba",
  "DR Chlef",
  "DR Oran",
  "DR Bechar",
  "DR Ouargla",
  "Total",
]

const TNFDAL1_ROWS = [
  "Direction Generale",
  "DR Alger",
  "DR Setif",
  "DR Constantine",
  "DR Annaba",
  "DR Chlef",
  "DR Oran",
  "DR Bechar",
  "DR Ouargla",
  "Regul CA du Janvier 2025 a Juin 2025",
  "Total",
]

const MASTERS15_ROWS = [
  "Masters",
  "ASSILOU COM",
  "GTS PHONE",
  "ALGERIE POSTE",
  "Total",
]

const RECAP_DEFINITIONS: RecapDefinition[] = [
  {
    key: "g50",
    title: "RECAP DECLARATION G50",
    columns: [
      { key: "designation", label: "Designation" },
      { key: "montant", label: "Montant", right: true },
    ],
    rows: RECAP_G50_ROWS.map((designation) => ({ designation, montant: "0" })),
  },
  {
    key: "tva_collectee",
    title: "Situation de la TVA Collectee",
    columns: [
      { key: "designation", label: "Designation" },
      { key: "ttc", label: "Montant des Encaissements TTC", right: true },
      { key: "exonere", label: "Montant Exonere", right: true },
      { key: "ht", label: "Montant des Encaissements HT", right: true },
      { key: "tva", label: "Montant de la TVA", right: true },
    ],
    rows: TVA_COLLECTEE_ROWS.map((designation) => ({
      designation,
      ttc: "0,00",
      exonere: "0,00",
      ht: "0,00",
      tva: "0,00",
    })),
  },
  {
    key: "tva_a_payer",
    title: "TVA À PAYER",
    columns: [
      { key: "designation", label: "Désignation" },
      { key: "collectee", label: "TVA Collectée", right: true },
      { key: "immo", label: "TVA Déductible sur Immobilisation", right: true },
      { key: "biens", label: "TVA Déductible sur Biens et Services", right: true },
      { key: "totalDed", label: "Total de la TVA Déductible", right: true },
      { key: "payer", label: "TVA à Payer", right: true },
    ],
    rows: TVA_RECAP_ROWS.map((designation) => ({
      designation,
      collectee: designation === "Direction Générale" || designation === "Total" ? "0" : "0,00",
      immo: "0,00",
      biens: "0,00",
      totalDed: "0,00",
      payer: designation === "Direction Générale" || designation === "Total" ? "0" : "0,00",
    })),
  },
  {
    key: "tva_situation",
    title: "TVA DEDUCTIBLE",
    columns: [
      { key: "designation", label: "Designation" },
      { key: "immo", label: "TVA Deductible sur Immobilisation", right: true },
      { key: "biens", label: "TVA Deductible sur Biens et services", right: true },
      { key: "totalDed", label: "Total de la TVA Deductible", right: true },
    ],
    rows: TVA_SITUATION_ROWS.map((designation) => ({
      designation,
      immo: "0,00",
      biens: "0,00",
      totalDed: "0,00",
    })),
  },
  {
    key: "droits_timbre",
    title: "Situation des Droits de Timbre",
    columns: [
      { key: "designation", label: "Designation" },
      { key: "caHt", label: "Chiffres d'Affaires Encaisse HT", right: true },
      { key: "montant", label: "Montant des Droits de Timbre", right: true },
    ],
    rows: DROITS_TIMBRE_ROWS.map((designation) => ({
      designation,
      caHt: "0,00",
      montant: "0,00",
    })),
  },
  {
    key: "tacp7",
    title: "Situation de la Taxe TACP 7%",
    columns: [
      { key: "designation", label: "Designation" },
      { key: "base", label: "Montant des Recharges HT", right: true },
      { key: "taxe", label: "Montant du TACP 7%", right: true },
    ],
    rows: TACP7_ROWS.map((designation) => ({
      designation,
      base: "0,00",
      taxe: "0,00",
    })),
  },
  {
    key: "tnfdal1",
    title: "Situation de la Taxe TNFDAL 1%",
    columns: [
      { key: "designation", label: "Designation" },
      { key: "caHt", label: "Chiffres d'Affaires E HT", right: true },
      { key: "taxe", label: "Montant du TNFFDAL 1%", right: true },
    ],
    rows: TNFDAL1_ROWS.map((designation) => ({
      designation,
      caHt: "0,00",
      taxe: "0,00",
    })),
  },
  {
    key: "tap15",
    title: "TAP 1.5%",
    columns: [
      { key: "designation", label: "Designation" },
      { key: "caHt", label: "Chiffres d'Affaires E HT", right: true },
      { key: "taxe", label: "Montant du TAP 1,5%", right: true },
    ],
    rows: TNFDAL1_ROWS.map((designation) => ({
      designation,
      caHt: "0,00",
      taxe: "0,00",
    })),
  },
  {
    key: "masters15",
    title: "TAXE MASTERS 1.5%",
    columns: [
      { key: "designation", label: "Designation" },
      { key: "base", label: "Montant de la Base", right: true },
      { key: "taxe", label: "Montant de la Taxe 1,5%", right: true },
    ],
    rows: MASTERS15_ROWS.map((designation) => ({
      designation,
      base: "0",
      taxe: "0",
    })),
  },
]

const getRecapDefinition = (key: string) => RECAP_DEFINITIONS.find((item) => item.key === key)

const parseAmount = (value: unknown): number => {
  const raw = String(value ?? "").replace(/\u00A0/g, " ").trim()
  if (!raw) return 0
  const standardized = raw.replace(/\s/g, "").replace(/,/g, ".")
  const normalizedDots = standardized.replace(/\.(?=.*\.)/g, "")
  const parsed = Number.parseFloat(normalizedDots)
  return Number.isFinite(parsed) ? parsed : 0
}

const isHeadOfficeDirectionValue = (direction: string): boolean => {
  const normalized = (direction ?? "").trim().toLowerCase()
  return (
    normalized === "siège"
    || normalized === "siege"
    || normalized.includes("siège")
    || normalized.includes("siege")
    || normalized.includes("direction generale")
    || normalized.includes("direction générale")
  )
}

const formatDzd = (value: number): string => {
  const safe = Number.isFinite(value) ? value : 0
  const [intPart, decPart] = safe.toFixed(2).split(".")
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, " ")
  return `${formattedInt},${decPart}`
}

const normalizeRate = (value?: string): 19 | 9 | null => {
  if (value === "19") return 19
  if (value === "9") return 9
  return null
}

const getTvaFromRow = (row: TvaRow): number => {
  const explicitTva = parseAmount(row.tva)
  if (explicitTva > 0) return explicitTva

  const rate = normalizeRate(row.tauxTVA)
  if (!rate) return 0

  const montantHt = parseAmount(row.montantHT)
  return montantHt * (rate / 100)
}

const resolveTvaSituationRowByDirection = (direction: string): string | null => {
  const normalized = (direction ?? "").trim().toLowerCase()
  if (!normalized) return null

  if (
    normalized === "siège"
    || normalized === "siege"
    || normalized.includes("siège")
    || normalized.includes("siege")
    || normalized.includes("direction generale")
    || normalized.includes("direction générale")
  ) {
    return "Direction Generale"
  }

  if (normalized.includes("autoliquidation") || normalized.includes("auto liquidation")) {
    return "Direction AutoLiquidation"
  }

  if (normalized.includes("alger")) return "DR Alger"
  if (normalized.includes("setif") || normalized.includes("sétif")) return "DR Setif"
  if (normalized.includes("constantine")) return "DR Constantine"
  if (normalized.includes("annaba")) return "DR Annaba"
  if (normalized.includes("chlef")) return "DR Chlef"
  if (normalized.includes("oran") || normalized.includes("oron") || normalized.includes("ouest")) return "DR Oran"
  if (normalized.includes("bechar") || normalized.includes("béchar")) return "DR Bechar"
  if (normalized.includes("ouargla")) return "DR Ouargla"

  return null
}

const resolveRegionalRowByDirection = (direction: string): string | null => {
  const normalized = (direction ?? "").trim().toLowerCase()
  if (!normalized) return null

  if (
    normalized === "siège"
    || normalized === "siege"
    || normalized.includes("siège")
    || normalized.includes("siege")
    || normalized.includes("direction generale")
    || normalized.includes("direction générale")
    || normalized.includes("autoliquidation")
    || normalized.includes("auto liquidation")
  ) {
    return null
  }

  if (normalized.includes("alger")) return "DR Alger"
  if (normalized.includes("setif") || normalized.includes("sétif")) return "DR Setif"
  if (normalized.includes("constantine")) return "DR Constantine"
  if (normalized.includes("annaba")) return "DR Annaba"
  if (normalized.includes("chlef")) return "DR Chlef"
  if (normalized.includes("oran") || normalized.includes("oron") || normalized.includes("ouest")) return "DR Oran"
  if (normalized.includes("bechar") || normalized.includes("béchar")) return "DR Bechar"
  if (normalized.includes("ouargla")) return "DR Ouargla"

  return null
}

const buildTvaSituationRows = (
  mois: string,
  annee: string,
  declarations: ApiFiscalDeclaration[],
): Record<string, string>[] => {
  const immoByRow = new Map<string, number>()
  const biensByRow = new Map<string, number>()

  for (const declaration of declarations) {
    if (declaration.mois !== mois || declaration.annee !== annee) continue
    if (declaration.tabKey !== "tva_immo" && declaration.tabKey !== "tva_biens") continue

    const rowLabel = resolveTvaSituationRowByDirection(declaration.direction)
    if (!rowLabel) continue

    let payload: Record<string, unknown> = {}
    try {
      const parsed = JSON.parse(declaration.dataJson ?? "{}")
      if (parsed && typeof parsed === "object") {
        payload = parsed as Record<string, unknown>
      }
    } catch {
      payload = {}
    }

    const sourceRows = declaration.tabKey === "tva_immo"
      ? (Array.isArray(payload.tvaImmoRows) ? (payload.tvaImmoRows as TvaRow[]) : [])
      : (Array.isArray(payload.tvaBiensRows) ? (payload.tvaBiensRows as TvaRow[]) : [])

    const totalTva = sourceRows.reduce((sum, row) => sum + getTvaFromRow(row), 0)

    if (declaration.tabKey === "tva_immo") {
      immoByRow.set(rowLabel, (immoByRow.get(rowLabel) ?? 0) + totalTva)
    } else {
      biensByRow.set(rowLabel, (biensByRow.get(rowLabel) ?? 0) + totalTva)
    }
  }

  let totalImmo = 0
  let totalBiens = 0

  const rows = TVA_SITUATION_ROWS.map((designation, index) => {
    if (index < 2) {
      return {
        designation,
        immo: "0,00",
        biens: "0,00",
        totalDed: "0,00",
      }
    }

    if (designation === "Total") {
      const totalDed = totalImmo + totalBiens
      return {
        designation,
        immo: formatDzd(totalImmo),
        biens: formatDzd(totalBiens),
        totalDed: formatDzd(totalDed),
      }
    }

    const immo = immoByRow.get(designation) ?? 0
    const biens = biensByRow.get(designation) ?? 0
    const totalDed = immo + biens

    totalImmo += immo
    totalBiens += biens

    return {
      designation,
      immo: formatDzd(immo),
      biens: formatDzd(biens),
      totalDed: formatDzd(totalDed),
    }
  })

  return rows
}

const buildDroitsTimbreRows = (
  mois: string,
  annee: string,
  declarations: ApiFiscalDeclaration[],
): Record<string, string>[] => {
  const caByRow = new Map<string, number>()
  const montantByRow = new Map<string, number>()

  for (const declaration of declarations) {
    if (declaration.mois !== mois || declaration.annee !== annee) continue
    if (declaration.tabKey !== "droits_timbre") continue

    const rowLabel = resolveRegionalRowByDirection(declaration.direction)
    if (!rowLabel) continue

    let payload: Record<string, unknown> = {}
    try {
      const parsed = JSON.parse(declaration.dataJson ?? "{}")
      if (parsed && typeof parsed === "object") {
        payload = parsed as Record<string, unknown>
      }
    } catch {
      payload = {}
    }

    const rows = Array.isArray(payload.timbreRows) ? (payload.timbreRows as TimbreRow[]) : []
    const totalCa = rows.reduce((sum, row) => sum + parseAmount(row.caTTCEsp), 0)
    const totalMontant = rows.reduce((sum, row) => sum + parseAmount(row.droitTimbre), 0)

    caByRow.set(rowLabel, (caByRow.get(rowLabel) ?? 0) + totalCa)
    montantByRow.set(rowLabel, (montantByRow.get(rowLabel) ?? 0) + totalMontant)
  }

  let totalCa = 0
  let totalMontant = 0

  return DROITS_TIMBRE_ROWS.map((designation) => {
    if (designation === "Total") {
      return {
        designation,
        caHt: formatDzd(totalCa),
        montant: formatDzd(totalMontant),
      }
    }

    const ca = caByRow.get(designation) ?? 0
    const montant = montantByRow.get(designation) ?? 0

    totalCa += ca
    totalMontant += montant

    return {
      designation,
      caHt: formatDzd(ca),
      montant: formatDzd(montant),
    }
  })
}

const getEncaissementTtc = (row: EncaissementRow): number => {
  const htRaw = String(row.ht ?? "").trim()
  if (htRaw !== "") {
    const ht = parseAmount(htRaw)
    return ht + (ht * 0.19)
  }

  return parseAmount(row.ttc)
}

const buildTvaCollecteeRows = (
  mois: string,
  annee: string,
  declarations: ApiFiscalDeclaration[],
): Record<string, string>[] => {
  let siegeFirstLineTtc = 0
  const drTtcByRow = new Map<string, number>()

  for (const declaration of declarations) {
    if (declaration.mois !== mois || declaration.annee !== annee) continue

    if (declaration.tabKey === "ca_siege") {
      if (!isHeadOfficeDirectionValue(declaration.direction)) continue

      let payload: Record<string, unknown> = {}
      try {
        const parsed = JSON.parse(declaration.dataJson ?? "{}")
        if (parsed && typeof parsed === "object") {
          payload = parsed as Record<string, unknown>
        }
      } catch {
        payload = {}
      }

      const rows = Array.isArray(payload.caSiegeRows) ? (payload.caSiegeRows as CaSiegeRow[]) : []
      const firstRow = rows[0]
      if (firstRow) {
        siegeFirstLineTtc += parseAmount(firstRow.ttc)
      }

      continue
    }

    if (declaration.tabKey === "encaissement") {
      const rowLabel = resolveRegionalRowByDirection(declaration.direction)
      if (!rowLabel) continue

      let payload: Record<string, unknown> = {}
      try {
        const parsed = JSON.parse(declaration.dataJson ?? "{}")
        if (parsed && typeof parsed === "object") {
          payload = parsed as Record<string, unknown>
        }
      } catch {
        payload = {}
      }

      const rows = Array.isArray(payload.encRows) ? (payload.encRows as EncaissementRow[]) : []
      const totalTtc = rows.reduce((sum, row) => sum + getEncaissementTtc(row), 0)
      drTtcByRow.set(rowLabel, (drTtcByRow.get(rowLabel) ?? 0) + totalTtc)
    }
  }

  const firstLineExonere = 0
  const firstLineHt = ((siegeFirstLineTtc - firstLineExonere) / 1.19) + firstLineExonere
  const firstLineTva = (firstLineHt - firstLineExonere) * 0.19

  let total1Ttc = 0
  let total1Exonere = 0
  let total1Ht = 0
  let total1Tva = 0

  const total2Ttc = TVA_COLLECTEE_DR_ROWS.reduce((sum, rowLabel) => sum + (drTtcByRow.get(rowLabel) ?? 0), 0)

  return TVA_COLLECTEE_ROWS.map((designation) => {
    if (designation === "BNA EXPLOITATION (Siege)") {
      total1Ttc += siegeFirstLineTtc
      total1Exonere += firstLineExonere
      total1Ht += firstLineHt
      total1Tva += firstLineTva

      return {
        designation,
        ttc: formatDzd(siegeFirstLineTtc),
        exonere: formatDzd(firstLineExonere),
        ht: formatDzd(firstLineHt),
        tva: formatDzd(firstLineTva),
      }
    }

    if (designation === "Total (1)") {
      return {
        designation,
        ttc: formatDzd(total1Ttc),
        exonere: formatDzd(total1Exonere),
        ht: formatDzd(total1Ht),
        tva: formatDzd(total1Tva),
      }
    }

    if (designation === "Total (2)") {
      return {
        designation,
        ttc: formatDzd(total2Ttc),
        exonere: "0,00",
        ht: "0,00",
        tva: "0,00",
      }
    }

    if (designation === "Total (1)+(2)") {
      return {
        designation,
        ttc: formatDzd(total1Ttc + total2Ttc),
        exonere: formatDzd(total1Exonere),
        ht: formatDzd(total1Ht),
        tva: formatDzd(total1Tva),
      }
    }

    if ((TVA_COLLECTEE_DR_ROWS as readonly string[]).includes(designation)) {
      return {
        designation,
        ttc: formatDzd(drTtcByRow.get(designation) ?? 0),
        exonere: "0,00",
        ht: "0,00",
        tva: "0,00",
      }
    }

    return {
      designation,
      ttc: "0,00",
      exonere: "0,00",
      ht: "0,00",
      tva: "0,00",
    }
  })
}

const buildTap15Rows = (
  mois: string,
  annee: string,
  declarations: ApiFiscalDeclaration[],
): Record<string, string>[] => {
  const baseByRow = new Map<string, number>()

  for (const declaration of declarations) {
    if (declaration.mois !== mois || declaration.annee !== annee) continue
    if (declaration.tabKey !== "etat_tap") continue

    const rowLabel = resolveRegionalRowByDirection(declaration.direction)
    if (!rowLabel) continue

    let payload: Record<string, unknown> = {}
    try {
      const parsed = JSON.parse(declaration.dataJson ?? "{}")
      if (parsed && typeof parsed === "object") {
        payload = parsed as Record<string, unknown>
      }
    } catch {
      payload = {}
    }

    const rows = Array.isArray(payload.tapRows) ? (payload.tapRows as EtapTapRow[]) : []
    const totalBase = rows.reduce((sum, row) => sum + parseAmount(row.tap2), 0)

    baseByRow.set(rowLabel, (baseByRow.get(rowLabel) ?? 0) + totalBase)
  }

  let totalBase = 0
  let totalTaxe = 0

  return TNFDAL1_ROWS.map((designation, index) => {
    if (index === 0) {
      return {
        designation,
        caHt: "0,00",
        taxe: "0,00",
      }
    }

    if (designation === "Total") {
      return {
        designation,
        caHt: formatDzd(totalBase),
        taxe: formatDzd(totalTaxe),
      }
    }

    const base = baseByRow.get(designation) ?? 0
    const taxe = base * 0.015

    totalBase += base
    totalTaxe += taxe

    return {
      designation,
      caHt: formatDzd(base),
      taxe: formatDzd(taxe),
    }
  })
}

const normalizeDesignation = (value: string): string =>
  (value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")

const buildTvaRecapRows = (
  mois: string,
  annee: string,
  declarations: ApiFiscalDeclaration[],
): Record<string, string>[] => {
  const collecteeRows = buildTvaCollecteeRows(mois, annee, declarations)
  const deductibleRows = buildTvaSituationRows(mois, annee, declarations)

  const collecteeByDesignation = new Map<string, number>()
  for (const row of collecteeRows) {
    collecteeByDesignation.set(normalizeDesignation(String(row.designation ?? "")), parseAmount(row.ttc))
  }

  const deductibleImmoByDesignation = new Map<string, number>()
  const deductibleBiensByDesignation = new Map<string, number>()
  for (const row of deductibleRows) {
    const key = normalizeDesignation(String(row.designation ?? ""))
    deductibleImmoByDesignation.set(key, parseAmount(row.immo))
    deductibleBiensByDesignation.set(key, parseAmount(row.biens))
  }

  let totalCollectee = 0
  let totalImmo = 0
  let totalBiens = 0

  return TVA_RECAP_ROWS.map((designation) => {
    const normalized = normalizeDesignation(designation)

    if (normalized === "total") {
      const totalDed = totalImmo + totalBiens
      return {
        designation,
        collectee: formatDzd(totalCollectee),
        immo: formatDzd(totalImmo),
        biens: formatDzd(totalBiens),
        totalDed: formatDzd(totalDed),
        payer: formatDzd(totalCollectee - totalDed),
      }
    }

    let collectee = 0
    if (normalized === "direction generale") {
      collectee = collecteeByDesignation.get(normalizeDesignation("Total (1)")) ?? 0
    } else if (normalized.startsWith("dr ")) {
      collectee = collecteeByDesignation.get(normalized) ?? 0
    }

    let immo = 0
    let biens = 0
    if (normalized === "direction generale") {
      immo = deductibleImmoByDesignation.get(normalizeDesignation("Direction Generale")) ?? 0
      biens = deductibleBiensByDesignation.get(normalizeDesignation("Direction Generale")) ?? 0
    } else if (normalized === "tva autoliquidation") {
      immo = deductibleImmoByDesignation.get(normalizeDesignation("Direction AutoLiquidation")) ?? 0
      biens = deductibleBiensByDesignation.get(normalizeDesignation("Direction AutoLiquidation")) ?? 0
    } else if (normalized.startsWith("dr ")) {
      immo = deductibleImmoByDesignation.get(normalized) ?? 0
      biens = deductibleBiensByDesignation.get(normalized) ?? 0
    }

    const totalDed = immo + biens
    const payer = collectee - totalDed

    totalCollectee += collectee
    totalImmo += immo
    totalBiens += biens

    return {
      designation,
      collectee: formatDzd(collectee),
      immo: formatDzd(immo),
      biens: formatDzd(biens),
      totalDed: formatDzd(totalDed),
      payer: formatDzd(payer),
    }
  })
}

const parsePayload = (dataJson: string): Record<string, unknown> => {
  try {
    const parsed = JSON.parse(dataJson ?? "{}")
    if (parsed && typeof parsed === "object") {
      return parsed as Record<string, unknown>
    }
  } catch {
    return {}
  }

  return {}
}

const buildG50Rows = (
  mois: string,
  annee: string,
  declarations: ApiFiscalDeclaration[],
): Record<string, string>[] => {
  const tvaRecapRows = buildTvaRecapRows(mois, annee, declarations)
  const tvaSituationRows = buildTvaSituationRows(mois, annee, declarations)
  const droitsTimbreRows = buildDroitsTimbreRows(mois, annee, declarations)
  const tapRows = buildTap15Rows(mois, annee, declarations)

  const getRowAmount = (rows: Record<string, string>[], designation: string, key: string): number => {
    const normalized = normalizeDesignation(designation)
    const row = rows.find((item) => normalizeDesignation(String(item.designation ?? "")) === normalized)
    return parseAmount(row?.[key])
  }

  const values = {
    acompte: 0,
    tvaCollectee: getRowAmount(tvaRecapRows, "Total", "collectee"),
    tvaDeductible: getRowAmount(tvaSituationRows, "Total", "totalDed"),
    tvaAPayer: getRowAmount(tvaRecapRows, "Total", "payer"),
    droitsTimbre: getRowAmount(droitsTimbreRows, "Total", "montant"),
    tacp7: 0,
    tnfpdal1: 0,
    irgSalaire: 0,
    autreIrg: 0,
    taxeFormation: 0,
    taxeVehicule: 0,
    tap: getRowAmount(tapRows, "Total", "taxe"),
    taxe2: 0,
    masters15: 0,
  }

  for (const declaration of declarations) {
    if (declaration.mois !== mois || declaration.annee !== annee) continue

    const payload = parsePayload(declaration.dataJson)

    if (declaration.tabKey === "acompte") {
      const months = Array.isArray(payload.acompteMonths) ? (payload.acompteMonths as string[]) : []
      values.acompte += months.reduce((sum, value) => sum + parseAmount(value), 0)
      continue
    }

    if (declaration.tabKey === "ca_tap") {
      const b12 = parseAmount(payload.b12)
      const b13 = parseAmount(payload.b13)
      values.tacp7 += b12 * 0.07
      values.tnfpdal1 += b13 * 0.01
      continue
    }

    if (declaration.tabKey === "irg") {
      const rows = Array.isArray(payload.irgRows) ? (payload.irgRows as IrgRow[]) : []
      values.irgSalaire += parseAmount(rows[0]?.montant)
      values.autreIrg += rows.slice(1).reduce((sum, row) => sum + parseAmount(row.montant), 0)
      continue
    }

    if (declaration.tabKey === "taxe_formation") {
      const rows = Array.isArray(payload.taxe12Rows) ? (payload.taxe12Rows as Taxe12Row[]) : []
      values.taxeFormation += rows.reduce((sum, row) => sum + parseAmount(row.montant), 0)
      continue
    }

    if (declaration.tabKey === "taxe_vehicule") {
      values.taxeVehicule += parseAmount(payload.taxe11Montant)
      continue
    }

    if (declaration.tabKey === "taxe2") {
      const rows = Array.isArray(payload.taxe2Rows) ? (payload.taxe2Rows as Taxe2Row[]) : []
      values.taxe2 += rows.reduce((sum, row) => sum + parseAmount(row.montant), 0)
      continue
    }

    if (declaration.tabKey === "taxe_masters") {
      const rows = Array.isArray(payload.masterRows) ? (payload.masterRows as MasterRow[]) : []
      values.masters15 += rows.reduce((sum, row) => {
        const taxe = parseAmount(row.taxe15)
        if (taxe > 0) return sum + taxe
        return sum + (parseAmount(row.montantHT) * 0.015)
      }, 0)
      continue
    }
  }

  const totalDeclarationG50 = values.acompte
    + values.tvaCollectee
    + values.tvaDeductible
    + values.tvaAPayer
    + values.droitsTimbre
    + values.tacp7
    + values.tnfpdal1
    + values.irgSalaire
    + values.autreIrg
    + values.taxeFormation
    + values.taxeVehicule
    + values.tap
    + values.taxe2

  const totalGeneral = totalDeclarationG50 + values.masters15

  const amountByDesignation = new Map<string, number>([
    ["acompte provisionel", values.acompte],
    ["tva collectee", values.tvaCollectee],
    ["tva deductible", values.tvaDeductible],
    ["total tva a payer (voir la piece)", values.tvaAPayer],
    ["droit de timbre", values.droitsTimbre],
    ["tacp 7%", values.tacp7],
    ["tnfpdal 1%", values.tnfpdal1],
    ["irg salaire", values.irgSalaire],
    ["autre irg", values.autreIrg],
    ["taxe de formation", values.taxeFormation],
    ["taxe vehicule", values.taxeVehicule],
    ["la tap", values.tap],
    ["taxe 2%", values.taxe2],
    ["total declaration g 50 (voir la piece)", totalDeclarationG50],
    ["taxe 1,5% sur masters (voir la piece)", values.masters15],
    ["total", totalGeneral],
  ])

  return RECAP_G50_ROWS.map((designation) => ({
    designation,
    montant: formatDzd(amountByDesignation.get(normalizeDesignation(designation)) ?? 0),
  }))
}

const getFormulaKey = (designation: string, columnKey: string): string =>
  `${normalizeDesignation(designation)}|${columnKey}`

const getCellFormula = (itemKey: string, designation: string, columnKey: string): string => {
  const row = normalizeDesignation(designation)

  if (columnKey === "designation") return "Saisie manuelle"

  if (itemKey === "g50" && columnKey === "montant") {
    if (row === "tva collectee") return "TVA collectee = TVA_a_payer.Total(colonne TVA collectee)"
    if (row === "tva deductible") return "TVA deductible = TVA_situation.Total = (TVA immo + TVA biens)"
    if (row === "total tva a payer (voir la piece)") return "TVA a payer = TVA_a_payer.Total(colonne TVA a payer) = (TVA collectee - TVA deductible)"
    if (row === "droit de timbre") return "Droit de timbre = Droits_timbre.Total"
    if (row === "tacp 7%") return "TACP 7% = SUM(CA_TAP.B12) * (7 / 100)"
    if (row === "tnfpdal 1%") return "TNFPDAL 1% = SUM(CA_TAP.B13) * (1 / 100)"
    if (row === "irg salaire") return "IRG salaire = SUM(IRG.ligne1)"
    if (row === "autre irg") return "Autre IRG = SUM(IRG.lignes2..n)"
    if (row === "taxe de formation") return "Taxe formation = (Taxe formation pro) + (Taxe d'apprentissage)"
    if (row === "taxe vehicule") return "Taxe vehicule = SUM(Tableau taxe vehicule)"
    if (row === "la tap") return "LA TAP = TAP_1.5%.Total"
    if (row === "taxe 2%") return "Taxe 2% = SUM(Tableau taxe 2%.montant)"
    if (row === "total declaration g 50 (voir la piece)") return "Total declaration G50 = (Acompte + TVA collectee + TVA deductible + TVA a payer + Droit de timbre + TACP 7% + TNFPDAL 1% + IRG salaire + Autre IRG + Taxe formation + Taxe vehicule + LA TAP + Taxe 2%)"
    if (row === "taxe 1,5% sur masters (voir la piece)") return "Taxe masters = SUM( IF(taxe15 > 0, taxe15, montantHT * (1.5 / 100)) )"
    if (row === "total") return "Total general = (Total declaration G50) + (Taxe 1.5% sur masters)"
    return "Saisie manuelle"
  }

  if (itemKey === "tva_a_payer") {
    if (columnKey === "collectee") return "TVA collectee = source recap TVA collectee (Total)"
    if (columnKey === "immo") return "TVA immo = source recap TVA deductible(colonne immobilisation)"
    if (columnKey === "biens") return "TVA biens = source recap TVA deductible(colonne biens et services)"
    if (columnKey === "totalDed") return "Total TVA deductible = (TVA immo + TVA biens)"
    if (columnKey === "payer") return "TVA a payer = (TVA collectee - Total TVA deductible)"
  }

  if (itemKey === "tva_situation") {
    if (columnKey === "immo") return "TVA immo = SUM(TVA/IMMO.TVA)"
    if (columnKey === "biens") return "TVA biens = SUM(TVA/Biens&Services.TVA)"
    if (columnKey === "totalDed") return "Total TVA deductible = (TVA immo + TVA biens)"
  }

  if (itemKey === "tva_collectee") {
    if (columnKey === "ttc") return "TTC = SUM(CA siege + Encaissement)"
    if (columnKey === "ht") return "HT = ((TTC - Exonere) / 1.19) + Exonere"
    if (columnKey === "tva") return "TVA = (HT - Exonere) * (19 / 100)"
    if (columnKey === "exonere") return "Exonere = valeur saisie (defaut: 0)"
  }

  if (itemKey === "droits_timbre") {
    if (columnKey === "caHt") return "Base CA = SUM(Droits de timbre.CA TTC especes)"
    if (columnKey === "montant") return "Montant = SUM(Droits de timbre.droit timbre)"
  }

  if (itemKey === "tnfdal1" || itemKey === "tap15") {
    if (columnKey === "caHt") return "Base = SUM(ETAT_TAP.montant imposable)"
    if (columnKey === "taxe") return "Taxe = Base * (1.5 / 100)"
  }

  return "Saisie manuelle"
}

const buildFormulaMap = (
  itemKey: string,
  definition: RecapDefinition,
  rows: Record<string, string>[],
): Record<string, string> => {
  const formulas: Record<string, string> = {}

  for (const row of rows) {
    const designation = String(row.designation ?? "")
    for (const column of definition.columns) {
      formulas[getFormulaKey(designation, column.key)] = getCellFormula(itemKey, designation, column.key)
    }
  }

  return formulas
}

const getRecapRows = (
  item: GeneratedRecap,
  definition: RecapDefinition,
  declarations: ApiFiscalDeclaration[],
): Record<string, string>[] => {
  if (item.source === "saved" && item.rows && item.rows.length > 0) {
    return item.rows
  }

  if (item.key === "g50") {
    return buildG50Rows(item.mois, item.annee, declarations)
  }

  if (item.key === "tva_a_payer") {
    return buildTvaRecapRows(item.mois, item.annee, declarations)
  }

  if (item.key === "tva_collectee") {
    return buildTvaCollecteeRows(item.mois, item.annee, declarations)
  }

  if (item.key === "tva_situation") {
    return buildTvaSituationRows(item.mois, item.annee, declarations)
  }

  if (item.key === "droits_timbre") {
    return buildDroitsTimbreRows(item.mois, item.annee, declarations)
  }

  if (item.key === "tnfdal1" || item.key === "tap15") {
    return buildTap15Rows(item.mois, item.annee, declarations)
  }

  return item.rows ?? definition.rows
}

export default function RecapPage() {
  const { user, isLoading, status } = useAuth({ requireAuth: true, redirectTo: "/login" })
  const initialFiscalPeriod = useMemo(() => getCurrentFiscalPeriod(), [])
  const [editRecapId, setEditRecapId] = useState("")
  const [selectedMonth, setSelectedMonth] = useState(initialFiscalPeriod.mois)
  const [selectedYear, setSelectedYear] = useState(initialFiscalPeriod.annee)
  const [generatedRecaps, setGeneratedRecaps] = useState<GeneratedRecap[]>([])
  const [savedRecaps, setSavedRecaps] = useState<GeneratedRecap[]>([])
  const [viewRecap, setViewRecap] = useState<GeneratedRecap | null>(null)
  const [editingRecap, setEditingRecap] = useState<GeneratedRecap | null>(null)
  const [editingRows, setEditingRows] = useState<Record<string, string>[]>([])
  const [editingDefinition, setEditingDefinition] = useState<RecapDefinition | null>(null)
  const [isSavingRecap, setIsSavingRecap] = useState(false)
  const [showDialog, setShowDialog] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [filterType, setFilterType] = useState("")
  const [filterMois, setFilterMois] = useState("")
  const [filterAnnee, setFilterAnnee] = useState("")
  const [filterDateFrom, setFilterDateFrom] = useState("")
  const [filterDateTo, setFilterDateTo] = useState("")
  const [fiscalDeclarations, setFiscalDeclarations] = useState<ApiFiscalDeclaration[]>([])
  const [handledEditRecapId, setHandledEditRecapId] = useState("")

  useEffect(() => {
    if (typeof window === "undefined") return
    const params = new URLSearchParams(window.location.search)
    setEditRecapId((params.get("editId") ?? "").trim())
  }, [])

  // Role-based access control
  const userRole = user?.role ?? ""
  const isRegionalRole = isRegionalFiscalRole(userRole)
  const isDirectionRole = userRole?.toLowerCase()?.trim() === "direction"
  const canGenerate = !isRegionalRole && !isDirectionRole

  useEffect(() => {
    if (!user || status !== "authenticated") {
      setFiscalDeclarations([])
      return
    }

    let cancelled = false

    const loadDeclarations = async () => {
      try {
        const token = typeof localStorage !== "undefined" ? localStorage.getItem("jwt") : null
        const response = await fetch(`${API_BASE}/api/fiscal`, {
          method: "GET",
          credentials: "include",
          cache: "no-store",
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        })

        if (!response.ok) {
          if (!cancelled) setFiscalDeclarations([])
          return
        }

        const payload = await response.json().catch(() => null)
        const declarations = Array.isArray(payload)
          ? payload.map((item) => ({
              id: Number((item as { id?: unknown }).id ?? 0),
              tabKey: String((item as { tabKey?: unknown }).tabKey ?? "").trim().toLowerCase(),
              mois: String((item as { mois?: unknown }).mois ?? "").trim(),
              annee: String((item as { annee?: unknown }).annee ?? "").trim(),
              direction: String((item as { direction?: unknown }).direction ?? "").trim(),
              dataJson: String((item as { dataJson?: unknown }).dataJson ?? "{}"),
            }))
          : []

        if (!cancelled) {
          setFiscalDeclarations(declarations)
        }
      } catch {
        if (!cancelled) setFiscalDeclarations([])
      }
    }

    loadDeclarations()

    return () => {
      cancelled = true
    }
  }, [status, user])

  useEffect(() => {
    if (!user || status !== "authenticated") {
      setSavedRecaps([])
      return
    }

    let cancelled = false

    const loadRecaps = async () => {
      try {
        const token = typeof localStorage !== "undefined" ? localStorage.getItem("jwt") : null
        const response = await fetch(`${API_BASE}/api/fiscal-recaps`, {
          method: "GET",
          credentials: "include",
          cache: "no-store",
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        })

        if (!response.ok) {
          if (!cancelled) setSavedRecaps([])
          return
        }

        const payload = await response.json().catch(() => null)
        const recaps: GeneratedRecap[] = Array.isArray(payload)
          ? (payload as ApiFiscalRecap[]).map((item) => {
              let rows: Record<string, string>[] = []
              let formulas: Record<string, string> = {}

              try {
                const parsedRows = JSON.parse(item.rowsJson ?? "[]")
                rows = Array.isArray(parsedRows) ? (parsedRows as Record<string, string>[]) : []
              } catch {
                rows = []
              }

              try {
                const parsedFormulas = JSON.parse(item.formulasJson ?? "{}")
                formulas = parsedFormulas && typeof parsedFormulas === "object"
                  ? (parsedFormulas as Record<string, string>)
                  : {}
              } catch {
                formulas = {}
              }

              return {
                id: String(item.id),
                key: String(item.key ?? ""),
                title: String(item.title ?? ""),
                mois: String(item.mois ?? ""),
                annee: String(item.annee ?? ""),
                createdAt: String(item.createdAt ?? new Date().toISOString()),
                isGenerated: Boolean(item.isGenerated),
                rows,
                formulas,
                source: "saved",
              }
            })
          : []

        if (!cancelled) {
          setSavedRecaps(recaps)
        }
      } catch {
        if (!cancelled) setSavedRecaps([])
      }
    }

    loadRecaps()

    return () => {
      cancelled = true
    }
  }, [status, user])

  const periodLabel = useMemo(() => {
    if (!selectedMonth || !selectedYear) return "-"
    return `${MONTHS[selectedMonth] ?? selectedMonth} ${selectedYear}`
  }, [selectedMonth, selectedYear])

  const hasActiveFilters = useMemo(
    () => !!(filterType || filterMois || filterAnnee || filterDateFrom || filterDateTo),
    [filterType, filterMois, filterAnnee, filterDateFrom, filterDateTo],
  )

  const filteredRecaps = useMemo(() => {
    return generatedRecaps.filter((item) => {
      if (filterType && item.key !== filterType) return false
      if (filterMois && item.mois !== filterMois) return false
      if (filterAnnee && item.annee !== filterAnnee.trim()) return false

      if (filterDateFrom) {
        const created = new Date(item.createdAt)
        const from = new Date(`${filterDateFrom}T00:00:00`)
        if (!Number.isNaN(created.getTime()) && created < from) return false
      }

      if (filterDateTo) {
        const created = new Date(item.createdAt)
        const to = new Date(`${filterDateTo}T23:59:59`)
        if (!Number.isNaN(created.getTime()) && created > to) return false
      }

      return true
    })
  }, [generatedRecaps, filterType, filterMois, filterAnnee, filterDateFrom, filterDateTo])

  const filteredSavedRecaps = useMemo(() => {
    return savedRecaps.filter((item) => {
      if (filterType && item.key !== filterType) return false
      if (filterMois && item.mois !== filterMois) return false
      if (filterAnnee && item.annee !== filterAnnee.trim()) return false

      if (filterDateFrom) {
        const created = new Date(item.createdAt)
        const from = new Date(`${filterDateFrom}T00:00:00`)
        if (!Number.isNaN(created.getTime()) && created < from) return false
      }

      if (filterDateTo) {
        const created = new Date(item.createdAt)
        const to = new Date(`${filterDateTo}T23:59:59`)
        if (!Number.isNaN(created.getTime()) && created > to) return false
      }

      return true
    })
  }, [savedRecaps, filterType, filterMois, filterAnnee, filterDateFrom, filterDateTo])

  const handleGenerate = () => {
    if (!selectedMonth || !selectedYear) return
    const now = new Date().toISOString()
    const entries: GeneratedRecap[] = RECAP_DEFINITIONS.map((definition) => {
      const draftItem: GeneratedRecap = {
        id: `${definition.key}-${selectedYear}${selectedMonth}-${Date.now()}`,
        key: definition.key,
        title: definition.title,
        mois: selectedMonth,
        annee: selectedYear,
        createdAt: now,
        isGenerated: true,
        source: "draft",
      }

      const rows = getRecapRows(draftItem, definition, fiscalDeclarations)
      const formulas = buildFormulaMap(definition.key, definition, rows)

      return {
        ...draftItem,
        rows,
        formulas,
      }
    })

    setGeneratedRecaps((prev) => {
      const withoutSamePeriod = prev.filter(
        (item) => !(item.mois === selectedMonth && item.annee === selectedYear),
      )
      return [...entries, ...withoutSamePeriod]
    })
  }

  const handleView = (item: GeneratedRecap) => {
    setViewRecap(item)
    setShowDialog(true)
  }

  const handleEdit = useCallback((item: GeneratedRecap) => {
    const definition = getRecapDefinition(item.key)
    if (!definition) return

    const rows = getRecapRows(item, definition, fiscalDeclarations)

    setEditingRecap(item)
    setEditingDefinition(definition)
    setEditingRows(rows)
  }, [fiscalDeclarations])

  useEffect(() => {
    if (!editRecapId || handledEditRecapId === editRecapId) return

    const recap = savedRecaps.find((item) => item.id === editRecapId)
    if (!recap) return

    handleEdit(recap)
    setHandledEditRecapId(editRecapId)
  }, [editRecapId, handleEdit, handledEditRecapId, savedRecaps])

  const handleEditCellChange = (rowIndex: number, columnKey: string, value: string) => {
    setEditingRows((prev) =>
      prev.map((row, index) => {
        if (index !== rowIndex) return row
        return {
          ...row,
          [columnKey]: value,
        }
      }),
    )
  }

  const handleSaveEditedRecap = async () => {
    if (!editingRecap || !editingDefinition) return

    const formulas = buildFormulaMap(editingRecap.key, editingDefinition, editingRows)
    const payload = {
      key: editingRecap.key,
      title: editingRecap.title,
      mois: editingRecap.mois,
      annee: editingRecap.annee,
      rows: editingRows,
      formulas,
      isGenerated: false,
    }

    setIsSavingRecap(true)
    try {
      const token = typeof localStorage !== "undefined" ? localStorage.getItem("jwt") : null
      const response = await fetch(`${API_BASE}/api/fiscal-recaps/save`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) return

      const saved = (await response.json().catch(() => null)) as ApiFiscalRecap | null
      if (!saved) return

      const savedRecap: GeneratedRecap = {
        id: String(saved.id),
        key: saved.key,
        title: saved.title,
        mois: saved.mois,
        annee: saved.annee,
        createdAt: saved.updatedAt ?? saved.createdAt,
        isGenerated: false,
        rows: editingRows,
        formulas,
        source: "saved",
      }

      setSavedRecaps((prev) => {
        const filtered = prev.filter((item) => !(item.key === savedRecap.key && item.mois === savedRecap.mois && item.annee === savedRecap.annee))
        return [savedRecap, ...filtered]
      })

      setGeneratedRecaps((prev) => prev.filter((item) => !(item.key === savedRecap.key && item.mois === savedRecap.mois && item.annee === savedRecap.annee)))

      if (viewRecap && viewRecap.key === savedRecap.key && viewRecap.mois === savedRecap.mois && viewRecap.annee === savedRecap.annee) {
        setViewRecap(savedRecap)
      }

      setEditingRecap(savedRecap)
    } finally {
      setIsSavingRecap(false)
    }
  }

  const handleDelete = async (item: GeneratedRecap) => {
    if (item.source === "saved") {
      const token = typeof localStorage !== "undefined" ? localStorage.getItem("jwt") : null
      await fetch(`${API_BASE}/api/fiscal-recaps/${item.id}`, {
        method: "DELETE",
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      }).catch(() => null)

      setSavedRecaps((prev) => prev.filter((recap) => recap.id !== item.id))
    } else {
      setGeneratedRecaps((prev) => prev.filter((recap) => recap.id !== item.id))
    }

    if (viewRecap?.id === item.id) {
      setShowDialog(false)
      setViewRecap(null)
    }
  }

  const handlePrint = (item: GeneratedRecap) => {
    const definition = getRecapDefinition(item.key)
    if (!definition) return

    void (async () => {
      try {
        const [{ jsPDF }, { default: autoTable }] = await Promise.all([
          import("jspdf"),
          import("jspdf-autotable"),
        ])

        const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" })
        const pageW = pdf.internal.pageSize.getWidth()
        const period = `${MONTHS[item.mois] ?? item.mois} ${item.annee}`
        const headerTitle = `${definition.title} ${period}`.trim()

        const drawUnderlinedText = (text: string, x: number, y: number, align: "left" | "center" | "right" = "left") => {
          pdf.text(text, x, y, { align })
          const width = pdf.getTextWidth(text)
          const startX = align === "center" ? x - width / 2 : align === "right" ? x - width : x
          pdf.setLineWidth(0.2)
          pdf.line(startX, y + 0.6, startX + width, y + 0.6)
        }

        const logo = await new Promise<HTMLImageElement | null>((resolve) => {
          const img = new Image()
          img.onload = () => resolve(img)
          img.onerror = () => resolve(null)
          img.src = "/logo_doc.png"
        })

        if (logo) {
          pdf.addImage(logo, "PNG", 10, 8, 38, 20)
        }

        pdf.setFont("times", "bold")
        pdf.setFontSize(11)
        drawUnderlinedText("ATM MOBILIS SPA", 10, 36)
        drawUnderlinedText("DIRECTION DES FINANCES ET DE LA COMPTABILITE", 10, 41)
        drawUnderlinedText("SOUS DIRECTION FISCALITE", 10, 46)
        pdf.setFontSize(14)
        drawUnderlinedText(headerTitle, 10, 56, "left")

        const tableHead = [definition.columns.map((col) => col.label)]
        const recapRows = getRecapRows(item, definition, fiscalDeclarations)
        const tableBody = recapRows.map((row) => definition.columns.map((col) => String(row[col.key] ?? "")))

        autoTable(pdf, {
          head: tableHead,
          body: tableBody,
          startY: 64,
          theme: "grid",
          margin: { left: 10, right: 10, top: 64, bottom: 10 },
          styles: {
            font: "helvetica",
            fontSize: 9,
            cellPadding: 0.8,
            lineColor: [51, 51, 51],
            lineWidth: 0.2,
            textColor: [0, 0, 0],
            overflow: "linebreak",
          },
          headStyles: {
            fillColor: [45, 179, 75],
            textColor: [255, 255, 255],
            font: "helvetica",
            fontStyle: "bold",
            fontSize: 9,
            halign: "center",
          },
          bodyStyles: {
            textColor: [0, 0, 0],
            font: "helvetica",
            fontSize: 9,
          },
          columnStyles: Array(tableHead[0]?.length ?? 0)
            .fill(null)
            .map((_, i) =>
              i === 0
                ? { halign: "left", cellWidth: "auto" }
                : { halign: "right", cellWidth: "auto" }
            ),
          didParseCell: (data) => {
            data.cell.text = data.cell.text.map((line) =>
              line
                .replace(/\u00A0/g, " ")
                .replace(/\s+/g, " ")
                .trim(),
            )

            const rowValues = Array.isArray(data.row.raw)
              ? data.row.raw.map((value) => String(value ?? "").toLowerCase())
              : []
            const isTotalRow = data.section === "body" && rowValues.some((value) => value.includes("total"))

            if (isTotalRow) {
              data.cell.styles.fillColor = [45, 179, 75]
              data.cell.styles.textColor = [255, 255, 255]
              data.cell.styles.fontStyle = "bold"
            }
          },
          horizontalPageBreak: true,
          horizontalPageBreakRepeat: [0],
        })

        const blobUrl = URL.createObjectURL(pdf.output("blob"))
        window.open(blobUrl, "_blank")
      } catch (error) {
        console.error("Recap PDF generation failed", error)
      }
    })()
  }

  if (isLoading || !user || status !== "authenticated") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Chargement...</p>
      </div>
    )
  }

  // Regional users cannot access recap page
  if (isRegionalRole) {
    return (
      <LayoutWrapper user={user}>
        <AccessDeniedDialog 
          title="Accès refusé" 
          message="Les utilisateurs régionaux ne peuvent pas accéder aux recaps fiscaux. Seuls les utilisateurs admin, finance et comptabilité peuvent consulter cette page."
          redirectTo="/"
        />
      </LayoutWrapper>
    )
  }

  return (
    <LayoutWrapper user={user}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Recap Fiscal</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Generer des tableaux recapitulatifs a partir des declarations saisies sur une periode donnee.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Parametres de generation</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">Selectionnez la periode pour generer les recaps fiscaux</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Mois</label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="h-10 text-sm">
                    <SelectValue placeholder="Selectionner un mois" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(MONTHS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Annee</label>
                <input
                  type="number"
                  min="2000"
                  max="2100"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  placeholder="Ex: 2026"
                  className="h-10 w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300 bg-white"
                />
              </div>

              <Button
                onClick={handleGenerate}
                disabled={!selectedMonth || !selectedYear || !canGenerate}
                title={!canGenerate ? "Seuls les administrateurs et les utilisateurs finance/comptabilité peuvent générer des recaps. Les utilisateurs de direction peuvent consulter les recaps existants." : ""}
                className="h-10 bg-green-500 hover:bg-green-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Generer
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-base">
                Brouillons recaps generes (non enregistres)
                {generatedRecaps.length > 0 && (
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    ({filteredRecaps.length}{hasActiveFilters ? ` / ${generatedRecaps.length}` : ""})
                  </span>
                )}
              </CardTitle>
              <div className="flex items-center gap-2">
                {hasActiveFilters && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 text-xs text-muted-foreground hover:text-emerald-600"
                    onClick={() => {
                      setFilterType("")
                      setFilterMois("")
                      setFilterAnnee("")
                      setFilterDateFrom("")
                      setFilterDateTo("")
                    }}
                  >
                    <X size={14} className="mr-1" /> Effacer filtres
                  </Button>
                )}
                <Button
                  size="sm"
                  variant={showFilters ? "secondary" : "outline"}
                  className="h-8 text-xs"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <Filter size={14} className="mr-1" /> Filtrer
                </Button>
              </div>
            </div>
            {showFilters && (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5 text-sm">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">Type</label>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Tous" />
                    </SelectTrigger>
                    <SelectContent>
                      {RECAP_DEFINITIONS.map((definition) => (
                        <SelectItem key={definition.key} value={definition.key}>{definition.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">Mois</label>
                  <Select value={filterMois} onValueChange={setFilterMois}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Tous" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(MONTHS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Annee</label>
                  <input
                    type="number"
                    placeholder="ex: 2026"
                    value={filterAnnee}
                    onChange={(e) => setFilterAnnee(e.target.value)}
                    className="w-full border rounded px-2 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Du</label>
                  <input
                    type="date"
                    value={filterDateFrom}
                    onChange={(e) => setFilterDateFrom(e.target.value)}
                    className="w-full border rounded px-2 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Au</label>
                  <input
                    type="date"
                    value={filterDateTo}
                    onChange={(e) => setFilterDateTo(e.target.value)}
                    className="w-full border rounded px-2 py-1.5 text-xs"
                  />
                </div>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {generatedRecaps.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Aucun brouillon genere pour le moment.
              </p>
            ) : filteredRecaps.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Aucun recap ne correspond aux filtres.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type de recap</TableHead>
                      <TableHead>Periode</TableHead>
                      <TableHead>Date de generation</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRecaps.map((item) => (
                      <TableRow
                        key={item.id}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleView(item)}
                        title="Cliquer pour consulter"
                      >
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{item.title}</Badge>
                        </TableCell>
                        <TableCell>{MONTHS[item.mois] ?? item.mois} {item.annee}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(item.createdAt).toLocaleString("fr-DZ", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false })}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 p-0 border-sky-300 text-sky-700 hover:bg-sky-50"
                              onClick={(event) => {
                                event.stopPropagation()
                                handleEdit(item)
                              }}
                              title="Modifier"
                            >
                              <Pencil size={16} />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 p-0 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                              onClick={(event) => {
                                event.stopPropagation()
                                handlePrint(item)
                              }}
                              title="Imprimer"
                            >
                              <Printer size={16} />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={(event) => {
                                event.stopPropagation()
                                void handleDelete(item)
                              }}
                              title="Supprimer"
                            >
                              <Trash2 size={16} />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {editingRecap && editingDefinition && (
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-base font-semibold">
                  Modification manuelle: {editingRecap.title}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{MONTHS[editingRecap.mois] ?? editingRecap.mois} {editingRecap.annee}</Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 border-gray-300 text-gray-700 hover:bg-gray-50"
                    onClick={() => {
                      setEditingRecap(null)
                      setEditingDefinition(null)
                      setEditingRows([])
                    }}
                    disabled={isSavingRecap}
                  >
                    Annuler
                  </Button>
                  <Button
                    size="sm"
                    className="gap-1.5 bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => void handleSaveEditedRecap()}
                    disabled={isSavingRecap}
                  >
                    <Save size={14} /> {isSavingRecap ? "Enregistrement..." : "Enregistrer"}
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Survolez chaque case pour voir la formule appliquee ou 'Saisie manuelle'.</p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      {editingDefinition.columns.map((column) => (
                        <th
                          key={column.key}
                          className={`px-3 py-2 text-xs font-semibold text-gray-700 border-b ${column.right ? "text-right" : "text-left"}`}
                        >
                          {column.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {editingRows.map((row, rowIndex) => (
                      <tr key={`${editingRecap.id}-edit-${rowIndex}`} className={rowIndex % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                        {editingDefinition.columns.map((column) => {
                          const designation = String(row.designation ?? "")
                          const formula = editingRecap.formulas?.[getFormulaKey(designation, column.key)]
                            ?? getCellFormula(editingRecap.key, designation, column.key)

                          if (column.key === "designation") {
                            return (
                              <td key={column.key} className="px-3 py-2 border-b text-xs">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="inline-block w-full">{String(row[column.key] ?? "")}</span>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">{formula}</TooltipContent>
                                </Tooltip>
                              </td>
                            )
                          }

                          return (
                            <td key={column.key} className={`px-2 py-1 border-b ${column.right ? "text-right" : "text-left"}`}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Input
                                    value={String(row[column.key] ?? "")}
                                    onChange={(event) => handleEditCellChange(rowIndex, column.key, event.target.value)}
                                    className="h-7 px-2 text-xs bg-white"
                                  />
                                </TooltipTrigger>
                                <TooltipContent side="top">{formula}</TooltipContent>
                              </Tooltip>
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {viewRecap && (
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogContent className="!w-[95vw] sm:!w-[90vw] xl:!w-[74vw] !max-w-[1200px] h-[82vh] p-0 overflow-hidden [&_[data-slot=table-head]]:border-r [&_[data-slot=table-head]]:border-border [&_[data-slot=table-head]:last-child]:border-r-0 [&_[data-slot=table-cell]]:border-r [&_[data-slot=table-cell]]:border-border [&_[data-slot=table-cell]:last-child]:border-r-0">
              <div className="border-b bg-gradient-to-r from-slate-50 to-white px-6 py-4">
                <DialogHeader className="space-y-2">
                  <DialogTitle className="text-base font-semibold leading-tight">
                    {viewRecap.title}
                  </DialogTitle>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="secondary">{MONTHS[viewRecap.mois] ?? viewRecap.mois} {viewRecap.annee}</Badge>
                  </div>
                </DialogHeader>
              </div>

              <div className="h-[calc(82vh-140px)] overflow-auto bg-slate-50/60 px-6 py-5">
                <div className="rounded-xl border bg-white p-4 shadow-sm">
                  <div className="overflow-x-auto">
                    {(() => {
                      const definition = getRecapDefinition(viewRecap.key)
                      if (!definition) return null

                      return (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              {definition.columns.map((column) => (
                                <TableHead key={column.key} className={column.right ? "text-right" : undefined}>
                                  {column.label}
                                </TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {getRecapRows(viewRecap, definition, fiscalDeclarations).map((row, index) => (
                              <TableRow key={`${viewRecap.key}-${index}`}>
                                {definition.columns.map((column) => {
                                  const designation = String(row.designation ?? "")
                                  const formula = viewRecap.formulas?.[getFormulaKey(designation, column.key)]
                                    ?? getCellFormula(viewRecap.key, designation, column.key)

                                  return (
                                    <TableCell key={column.key} className={column.right ? "text-right font-semibold" : undefined}>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <span className="inline-block w-full">{String(row[column.key] ?? "")}</span>
                                        </TooltipTrigger>
                                        <TooltipContent side="top">{formula}</TooltipContent>
                                      </Tooltip>
                                    </TableCell>
                                  )
                                })}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )
                    })()}
                  </div>
                </div>

                <div className="mt-4 flex justify-end gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-xs h-8 border-sky-300 text-sky-700 hover:bg-sky-50"
                    onClick={() => handleEdit(viewRecap)}
                  >
                    <Pencil size={13} /> Modifier
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-xs h-8 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                    onClick={() => handlePrint(viewRecap)}
                  >
                    <Printer size={13} /> Imprimer
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

      </div>
    </LayoutWrapper>
  )
}


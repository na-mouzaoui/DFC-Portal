"use client"

import { useState, useEffect, useRef } from "react"
import { useToast } from "@/hooks/use-toast"
import { authFetch } from "@/lib/auth-fetch"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Plus, Pencil, Trash2, Upload, Download, Search, Loader2 } from "lucide-react"

interface FiscalFournisseur {
  id: number
  raisonSociale: string
  adresse: string
  authNif: string
  rc: string
  authRc: string
  nif: string
  createdAt: string
  updatedAt: string
}

interface FormData {
  raisonSociale: string
  adresse: string
  authNif: string
  rc: string
  authRc: string
  nif: string
}

type ConflictDecision = "update" | "keep"

interface ImportConflict {
  existing: FiscalFournisseur
  incoming: FormData
}

interface ImportFailureDetail {
  supplierName: string
  operation: "creation" | "mise_a_jour"
  reason: string
}

interface ImportSummary {
  created: number
  updated: number
  kept: number
  unchanged: number
  ignored: number
  errors: number
  success: number
  failures: ImportFailureDetail[]
}

const EMPTY_FORM: FormData = { raisonSociale: "", adresse: "", authNif: "", rc: "", authRc: "", nif: "" }

const parseCsvLine = (line: string, delimiter: string) => {
  const values: string[] = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]

    if (char === '"') {
      const next = line[i + 1]
      if (inQuotes && next === '"') {
        current += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === delimiter && !inQuotes) {
      values.push(current.trim())
      current = ""
      continue
    }

    current += char
  }

  values.push(current.trim())
  return values
}

const normalizeCsvHeader = (value: string) =>
  value
    .toLowerCase()
    .replace(/[àâä]/g, "a")
    .replace(/[éèêë]/g, "e")
    .replace(/[îï]/g, "i")
    .replace(/[ôö]/g, "o")
    .replace(/[ùûü]/g, "u")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()

const normalizeSupplierName = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()

const normalizeField = (value: string) => value.trim()
const normalizeAddress = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()

const detectDelimiter = (line: string) => {
  if (line.includes("\t")) return "\t"
  if (line.includes(";")) return ";"
  if (line.includes(",")) return ","
  return ";"
}

const decodeCsvFile = async (file: File) => {
  const buffer = await file.arrayBuffer()
  const utf8 = new TextDecoder("utf-8").decode(buffer)
  if (!utf8.includes("\uFFFD")) {
    return utf8.replace(/^\uFEFF/, "")
  }

  const fallbackEncodings = ["windows-1252", "iso-8859-1"]
  for (const encoding of fallbackEncodings) {
    try {
      const decoded = new TextDecoder(encoding).decode(buffer)
      if (!decoded.includes("\uFFFD")) {
        return decoded.replace(/^\uFEFF/, "")
      }
    } catch {
      // Continue trying other encodings.
    }
  }

  return utf8.replace(/^\uFEFF/, "")
}

const expandScientificNotation = (value: string) => {
  const raw = value.trim().replace(/\s+/g, "").replace(/,/g, ".")
  const match = raw.match(/^([+-]?)(\d+)(?:\.(\d+))?[eE]([+-]?\d+)$/)
  if (!match) return value.trim()

  const sign = match[1] === "-" ? "-" : ""
  const integerPart = match[2]
  const decimalPart = match[3] ?? ""
  const exponent = Number.parseInt(match[4], 10)
  if (Number.isNaN(exponent)) return value.trim()

  const digits = `${integerPart}${decimalPart}`
  const decimalShift = exponent - decimalPart.length

  if (decimalShift >= 0) {
    return `${sign}${digits}${"0".repeat(decimalShift)}`
  }

  const splitIndex = digits.length + decimalShift
  if (splitIndex <= 0) {
    return `${sign}0.${"0".repeat(Math.abs(splitIndex))}${digits}`
  }

  return `${sign}${digits.slice(0, splitIndex)}.${digits.slice(splitIndex)}`
}

const normalizeNifValue = (value: string) => {
  const cleaned = value.trim()
  if (!cleaned) return ""
  const normalizedSource = cleaned.replace(/\s+/g, "").replace(/,/g, ".")
  const sciMatch = normalizedSource.match(/^([+-]?)(\d+)(?:\.(\d+))?[eE]([+-]?\d+)$/)

  if (sciMatch) {
    const integerPart = sciMatch[2]
    const decimalPart = sciMatch[3] ?? ""
    const exponent = Number.parseInt(sciMatch[4], 10)

    if (!Number.isNaN(exponent)) {
      const digits = `${integerPart}${decimalPart}`.replace(/^0+/, "") || "0"
      const decimalIndex = integerPart.length + exponent

      if (decimalIndex <= 0) {
        return "0"
      }

      if (decimalIndex >= digits.length) {
        return `${digits}${"0".repeat(decimalIndex - digits.length)}`
      }

      return digits.slice(0, decimalIndex)
    }
  }

  return normalizedSource.replace(/[^0-9]/g, "")
}

const buildSupplierUniqKey = (nif: string, adresse: string) => {
  const normalizedNif = normalizeNifValue(nif)
  const normalizedAdresse = normalizeAddress(adresse)
  return `${normalizedNif}|${normalizedAdresse}`
}

const extractApiErrorMessage = async (res: Response, fallback: string) => {
  const payload = await res.json().catch(() => null) as { message?: string; title?: string } | null
  if (payload?.message && payload.message.trim()) return payload.message.trim()
  if (payload?.title && payload.title.trim()) return payload.title.trim()
  return `${fallback} (HTTP ${res.status})`
}

const toSupplierPayload = (data: FormData) => ({
  raisonSociale: data.raisonSociale.trim(),
  adresse: data.adresse.trim(),
  authNIF: data.authNif.trim(),
  rc: data.rc.trim(),
  authRC: data.authRc.trim(),
  nif: normalizeNifValue(data.nif),
})

const toFrDateTime = (value?: string) => {
  if (!value) return "-"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return "-"
  return d.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

const fileToBase64Data = (file: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const content = String(reader.result ?? "")
      const base64 = content.split(",")[1] ?? ""
      resolve(base64)
    }
    reader.onerror = () => reject(new Error("Impossible de lire l'image logo."))
    reader.readAsDataURL(file)
  })

const hasDifferentSupplierDetails = (existing: FiscalFournisseur, incoming: FormData) => {
  return (
    normalizeSupplierName(existing.raisonSociale) !== normalizeSupplierName(incoming.raisonSociale) ||
    normalizeField(existing.adresse) !== normalizeField(incoming.adresse) ||
    normalizeNifValue(existing.nif) !== normalizeNifValue(incoming.nif) ||
    normalizeField(existing.rc) !== normalizeField(incoming.rc)
  )
}

export function FiscalFournisseursManagement() {
  const { toast } = useToast()

  const [fournisseurs, setFournisseurs] = useState<FiscalFournisseur[]>([])
  const [fetching, setFetching] = useState(false)
  const [search, setSearch] = useState("")

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<FiscalFournisseur | null>(null)
  const [form, setForm] = useState<FormData>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<FiscalFournisseur | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [importConflicts, setImportConflicts] = useState<ImportConflict[]>([])
  const [importDecisions, setImportDecisions] = useState<Record<string, ConflictDecision>>({})
  const [pendingImportCreates, setPendingImportCreates] = useState<FormData[]>([])
  const [pendingUnchanged, setPendingUnchanged] = useState(0)
  const [pendingIgnoredCount, setPendingIgnoredCount] = useState(0)
  const [importing, setImporting] = useState(false)
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null)
  const [importSummaryOpen, setImportSummaryOpen] = useState(false)

  const importRef = useRef<HTMLInputElement>(null)

  const resetImportResolution = () => {
    setImportDialogOpen(false)
    setImportConflicts([])
    setImportDecisions({})
    setPendingImportCreates([])
    setPendingUnchanged(0)
    setPendingIgnoredCount(0)
    setImporting(false)
  }

  const setConflictDecision = (fournisseurId: number, decision: ConflictDecision) => {
    setImportDecisions((prev) => ({ ...prev, [String(fournisseurId)]: decision }))
  }

  const fetchFournisseurs = async () => {
    setFetching(true)
    try {
      const res = await authFetch("/api/fiscal-fournisseurs")
      if (!res.ok) throw new Error()
      setFournisseurs(await res.json())
    } catch {
      toast({ title: "Erreur", description: "Impossible de charger les fournisseurs.", variant: "destructive" })
    } finally {
      setFetching(false)
    }
  }

  useEffect(() => { fetchFournisseurs() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const openCreate = () => { setEditTarget(null); setForm(EMPTY_FORM); setDialogOpen(true) }
  const openEdit = (f: FiscalFournisseur) => {
    setEditTarget(f)
    setForm({
      raisonSociale: f.raisonSociale,
      adresse: f.adresse,
      authNif: f.authNif,
      rc: f.rc,
      authRc: f.authRc,
      nif: f.nif,
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.raisonSociale.trim()) {
      toast({ title: "Validation", description: "Le champ Nom / Raison Sociale est obligatoire.", variant: "destructive" })
      return
    }

    const uniqKey = buildSupplierUniqKey(form.nif, form.adresse)
    const duplicate = fournisseurs.find(
      (f) => buildSupplierUniqKey(f.nif, f.adresse) === uniqKey && (!editTarget || f.id !== editTarget.id),
    )
    if (duplicate) {
      toast({
        title: "Validation",
        description: "Un fournisseur avec ce couple NIF + adresse existe deja.",
        variant: "destructive",
      })
      return
    }

    setSaving(true)
    try {
      const method = editTarget ? "PUT" : "POST"
      const url = editTarget ? `/api/fiscal-fournisseurs/${editTarget.id}` : "/api/fiscal-fournisseurs"
      const res = await authFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toSupplierPayload(form)),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { message?: string }).message ?? "Erreur lors de l'enregistrement.")
      }
      toast({ title: editTarget ? "Fournisseur modifié" : "Fournisseur créé", description: `${form.raisonSociale} a été ${editTarget ? "mis à jour" : "ajouté"}.` })
      setDialogOpen(false)
      fetchFournisseurs()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erreur inconnue."
      toast({ title: "Erreur", description: msg, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await authFetch(`/api/fiscal-fournisseurs/${deleteTarget.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      toast({ title: "Supprimé", description: `${deleteTarget.raisonSociale} a été supprimé.` })
      setDeleteTarget(null)
      fetchFournisseurs()
    } catch {
      toast({ title: "Erreur", description: "Impossible de supprimer ce fournisseur.", variant: "destructive" })
    } finally {
      setDeleting(false)
    }
  }

  const applyImportChanges = async (
    creates: FormData[],
    conflicts: ImportConflict[],
    decisions: Record<string, ConflictDecision>,
    unchangedCount: number,
    ignoredCount: number,
  ) => {
    setImporting(true)
    let created = 0
    let updated = 0
    let kept = 0
    let errors = 0
    const failures: ImportFailureDetail[] = []

    for (const supplier of creates) {
      try {
        const res = await authFetch("/api/fiscal-fournisseurs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(toSupplierPayload(supplier)),
        })
        if (res.ok) created += 1
        else {
          errors += 1
          failures.push({
            supplierName: supplier.raisonSociale || "(sans nom)",
            operation: "creation",
            reason: await extractApiErrorMessage(res, "Echec de creation"),
          })
        }
      } catch {
        errors += 1
        failures.push({
          supplierName: supplier.raisonSociale || "(sans nom)",
          operation: "creation",
          reason: "Echec de creation (erreur reseau ou serveur inaccessible)",
        })
      }
    }

    for (const conflict of conflicts) {
      const decision = decisions[String(conflict.existing.id)] ?? "keep"
      if (decision === "keep") {
        kept += 1
        continue
      }

      try {
        const mergedPayload: FormData = {
          ...conflict.incoming,
          authNif: conflict.existing.authNif ?? "",
          authRc: conflict.existing.authRc ?? "",
        }
        const res = await authFetch(`/api/fiscal-fournisseurs/${conflict.existing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(toSupplierPayload(mergedPayload)),
        })
        if (res.ok) updated += 1
        else {
          errors += 1
          failures.push({
            supplierName: conflict.incoming.raisonSociale || conflict.existing.raisonSociale || "(sans nom)",
            operation: "mise_a_jour",
            reason: await extractApiErrorMessage(res, "Echec de mise a jour"),
          })
        }
      } catch {
        errors += 1
        failures.push({
          supplierName: conflict.incoming.raisonSociale || conflict.existing.raisonSociale || "(sans nom)",
          operation: "mise_a_jour",
          reason: "Echec de mise a jour (erreur reseau ou serveur inaccessible)",
        })
      }
    }

    const summary: string[] = []
    if (created > 0) summary.push(`${created} importé(s)`)
    if (updated > 0) summary.push(`${updated} modifié(s)`)
    if (kept > 0) summary.push(`${kept} conservé(s)`)
    if (unchangedCount > 0) summary.push(`${unchangedCount} déjà existant(s)`)
    if (ignoredCount > 0) summary.push(`${ignoredCount} ligne(s) ignorée(s)`)
    if (summary.length === 0) summary.push("Aucun changement")

    try {
      await authFetch("/api/fiscal-fournisseurs/import-audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          created,
          updated,
          kept,
          unchanged: unchangedCount,
          ignored: ignoredCount,
          errors,
          source: "csv",
        }),
      })
    } catch {
      // Keep import flow resilient even if audit endpoint fails.
    }

    const success = created + updated
    setImportSummary({
      created,
      updated,
      kept,
      unchanged: unchangedCount,
      ignored: ignoredCount,
      errors,
      success,
      failures,
    })
    setImportSummaryOpen(true)

    toast({
      title: "Import termine",
      description: `${summary.join(", ")}${errors > 0 ? `, ${errors} echec(s)` : ""}.`,
      variant: errors > 0 ? "destructive" : "default",
    })

    setImporting(false)
    resetImportResolution()
    fetchFournisseurs()
  }

  const handleImportConflictConfirm = async () => {
    await applyImportChanges(
      pendingImportCreates,
      importConflicts,
      importDecisions,
      pendingUnchanged,
      pendingIgnoredCount,
    )
  }

  const handleExport = async () => {
    try {
      const ExcelJS = (await import("exceljs")).default
      const workbook = new ExcelJS.Workbook()
      workbook.creator = "DFC Portal"
      workbook.created = new Date()

      const worksheet = workbook.addWorksheet("Fournisseurs fiscaux", {
        pageSetup: {
          orientation: "landscape",
          paperSize: 9,
          fitToPage: true,
          fitToWidth: 1,
          fitToHeight: 0,
          margins: { left: 0.3, right: 0.3, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 },
        },
      })

      const lastModified = filtered.reduce<string | undefined>((latest, item) => {
        if (!item.updatedAt) return latest
        if (!latest) return item.updatedAt
        return new Date(item.updatedAt).getTime() > new Date(latest).getTime() ? item.updatedAt : latest
      }, undefined)
      const lastModifiedText = toFrDateTime(lastModified)

      // Keep only keys/widths here to avoid auto-generated header cells in row 1.
      worksheet.columns = [
        { key: "raisonSociale", width: 38 },
        { key: "adresse", width: 32 },
        { key: "nif", width: 22 },
        { key: "authNif", width: 22 },
        { key: "rc", width: 18 },
        { key: "authRc", width: 22 },
      ]

      worksheet.mergeCells("A1:B3")
      try {
        const logoRes = await fetch("/logo_doc.png")
        if (logoRes.ok) {
          const logoBlob = await logoRes.blob()
          const logoBase64 = await fileToBase64Data(logoBlob)
          const imageId = workbook.addImage({ base64: logoBase64, extension: "png" })
          worksheet.addImage(imageId, {
            tl: { col: 0, row: 0 },
            ext: { width: 170, height: 56 },
          })
        }
      } catch {
        // Keep export functional even if logo loading fails.
      }

      worksheet.mergeCells("D1:F3")
      const metaCell = worksheet.getCell("D1")
      metaCell.value = `Derniere modification: ${lastModifiedText}`
      metaCell.alignment = { vertical: "middle", horizontal: "right", wrapText: true }
      metaCell.font = { size: 11, bold: true, name: "Calibri" }

      // Row layout:
      // 1-3: top header (logo + meta)
      // 4-6: 3 blank rows
      // 7: title
      // 8: 1 blank row
      // 9: table header
      const titleRowIndex = 7
      worksheet.mergeCells(`A${titleRowIndex}:F${titleRowIndex}`)
      const titleCell = worksheet.getCell(`A${titleRowIndex}`)
      titleCell.value = "LISTE DES FOURNISSEURS FISCAUX"
      titleCell.font = { bold: true, size: 14, color: { argb: "FF000000" }, name: "Calibri" }
      titleCell.alignment = { horizontal: "center", vertical: "middle" }

      worksheet.getRow(titleRowIndex).height = 26
      for (let row = 4; row <= 6; row += 1) {
        worksheet.getRow(row).height = 16
      }
      worksheet.getRow(8).height = 16

      const headerRowIndex = 9
      const headerRow = worksheet.getRow(headerRowIndex)
      headerRow.values = [
        "Nom / Raison Sociale",
        "Adresse",
        "NIF",
        "Auth. NIF",
        "N° RC",
        "Auth. N° RC",
      ]
      headerRow.height = 22

      for (let col = 1; col <= 6; col += 1) {
        const cell = headerRow.getCell(col)
        cell.font = { bold: true, color: { argb: "FF000000" }, name: "Calibri", size: 11 }
        cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true }
        cell.border = {
          top: { style: "medium", color: { argb: "FF000000" } },
          left: { style: "medium", color: { argb: "FF000000" } },
          bottom: { style: "medium", color: { argb: "FF000000" } },
          right: { style: "medium", color: { argb: "FF000000" } },
        }
      }

      filtered.forEach((f) => {
        worksheet.addRow([
          f.raisonSociale || "",
          f.adresse || "",
          f.nif || "",
          f.authNif || "",
          f.rc || "",
          f.authRc || "",
        ])
      })

      const dataStart = headerRowIndex + 1
      const dataEnd = worksheet.rowCount
      for (let row = dataStart; row <= dataEnd; row += 1) {
        const current = worksheet.getRow(row)
        current.height = 20
        for (let col = 1; col <= 6; col += 1) {
          const cell = current.getCell(col)
          cell.alignment = { vertical: "middle", horizontal: col <= 2 ? "left" : "center" }
          cell.font = { name: "Calibri", size: 10 }
          cell.border = {
            top: { style: "thin", color: { argb: "FF000000" } },
            left: { style: "thin", color: { argb: "FF000000" } },
            bottom: { style: "thin", color: { argb: "FF000000" } },
            right: { style: "thin", color: { argb: "FF000000" } },
          }
        }
      }

      worksheet.autoFilter = {
        from: { row: headerRowIndex, column: 1 },
        to: { row: headerRowIndex, column: 6 },
      }

      worksheet.headerFooter.oddHeader = `&RDerniere modification: ${lastModifiedText}\nPage &P / &N`
      worksheet.pageSetup.printArea = `A1:F${Math.max(worksheet.rowCount, headerRowIndex)}`

      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "fournisseurs-fiscaux.xlsx"
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast({
        title: "Erreur",
        description: "Impossible de generer le fichier Excel.",
        variant: "destructive",
      })
    }
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ""
    try {
      const source = (await decodeCsvFile(file)).replace(/\r/g, "")
      const allLines = source.split("\n").map((line) => line.trim()).filter(Boolean)
      if (allLines.length === 0) {
        toast({ title: "Import CSV", description: "Le fichier est vide.", variant: "destructive" })
        return
      }

      const delimiter = detectDelimiter(allLines[0])
      const firstLine = parseCsvLine(allLines[0], delimiter)
      const headers = firstLine.map(normalizeCsvHeader)
      const hasHeader = headers.some((h) =>
        [
          "numero",
          "nom four",
          "id site",
          "site",
          "ident fiscal",
          "rc",
          "nom raison sociale",
          "raison sociale",
          "adresse",
          "nif",
          "auth nif",
          "n rc",
          "no rc",
          "numero rc",
          "auth n rc",
          "auth no rc",
          "auth numero rc",
        ].includes(h),
      )

      const lines = hasHeader ? allLines.slice(1) : allLines

      const headerIndex = (candidates: string[], fallback: number) => {
        if (!hasHeader) return fallback
        const index = headers.findIndex((h) => candidates.includes(h))
        return index >= 0 ? index : fallback
      }

      const idxNom = headerIndex(["nom four", "nom raison sociale", "raison sociale"], 1)
      const idxSite = headerIndex(["site", "ville"], 3)
      const idxAdresse = headerIndex(["adresse"], 6)
      const idxNif = headerIndex(["ident fiscal", "nif"], 4)
      const idxRc = headerIndex(["rc", "n rc", "no rc", "numero rc"], 5)
      const idxAuthNif = hasHeader ? headers.findIndex((h) => ["auth nif"].includes(h)) : -1
      const idxAuthRc = hasHeader ? headers.findIndex((h) => ["auth n rc", "auth no rc", "auth numero rc"].includes(h)) : -1

      const csvRowsByKey = new Map<string, FormData>()
      let ignoredCount = 0
      for (const line of lines) {
        const cols = parseCsvLine(line, delimiter)
        const isLegacyFormat = !hasHeader && cols.length <= 3
        const nom = (isLegacyFormat ? cols[0] ?? "" : cols[idxNom] ?? cols[0] ?? "").trim()
        if (!nom) {
          ignoredCount += 1
          continue
        }

        const adresseValue = isLegacyFormat ? "" : (cols[idxAdresse] ?? "").trim()
        const siteValue = isLegacyFormat ? "" : (cols[idxSite] ?? "").trim()
        const normalizedAdresse = adresseValue || siteValue
        const rawNif = (isLegacyFormat ? cols[2] ?? "" : cols[idxNif] ?? "").trim()

        const formRow: FormData = {
          raisonSociale: nom,
          adresse: normalizedAdresse,
          nif: normalizeNifValue(rawNif),
          authNif: idxAuthNif >= 0 ? (cols[idxAuthNif] ?? "").trim() : "",
          rc: (isLegacyFormat ? cols[1] ?? "" : cols[idxRc] ?? "").trim(),
          authRc: idxAuthRc >= 0 ? (cols[idxAuthRc] ?? "").trim() : "",
        }

        const uniqKey = buildSupplierUniqKey(formRow.nif, formRow.adresse)
        csvRowsByKey.set(uniqKey || normalizeSupplierName(formRow.raisonSociale), formRow)
      }

      const parsedRows = Array.from(csvRowsByKey.values())
      if (parsedRows.length === 0) {
        toast({
          title: "Import CSV",
          description: ignoredCount > 0 ? "Aucune ligne valide à importer." : "Aucun fournisseur trouvé dans le fichier.",
          variant: "destructive",
        })
        return
      }

      const existingByKey = new Map<string, FiscalFournisseur>()
      for (const fournisseur of fournisseurs) {
        const key = buildSupplierUniqKey(fournisseur.nif, fournisseur.adresse)
        if (key && !existingByKey.has(key)) {
          existingByKey.set(key, fournisseur)
        }
      }

      const toCreate: FormData[] = []
      const conflicts: ImportConflict[] = []
      let unchanged = 0

      for (const row of parsedRows) {
        const key = buildSupplierUniqKey(row.nif, row.adresse)
        const existing = existingByKey.get(key)
        if (!existing) {
          toCreate.push(row)
          continue
        }

        if (hasDifferentSupplierDetails(existing, row)) {
          conflicts.push({ existing, incoming: row })
        } else {
          unchanged += 1
        }
      }

      if (conflicts.length > 0) {
        const defaults: Record<string, ConflictDecision> = {}
        for (const conflict of conflicts) {
          defaults[String(conflict.existing.id)] = "keep"
        }
        setPendingImportCreates(toCreate)
        setImportConflicts(conflicts)
        setImportDecisions(defaults)
        setPendingUnchanged(unchanged)
        setPendingIgnoredCount(ignoredCount)
        setImportDialogOpen(true)
        return
      }

      await applyImportChanges(toCreate, [], {}, unchanged, ignoredCount)
    } catch {
      toast({
        title: "Import CSV",
        description: "Impossible de lire le fichier importe.",
        variant: "destructive",
      })
    }
  }

  const filtered = fournisseurs.filter((f) => {
    const q = search.toLowerCase()
    return (
      f.raisonSociale.toLowerCase().includes(q) ||
      f.adresse.toLowerCase().includes(q) ||
      normalizeNifValue(f.nif).toLowerCase().includes(q) ||
      f.authNif.toLowerCase().includes(q) ||
      f.rc.toLowerCase().includes(q) ||
      f.authRc.toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex flex-wrap gap-2">
          <input ref={importRef} type="file" accept=".csv" className="hidden" onChange={handleImport} />
          <Button variant="outline" size="sm" onClick={() => importRef.current?.click()}>
            <Upload className="mr-2 h-4 w-4" /> Importer CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={filtered.length === 0}>
            <Download className="mr-2 h-4 w-4" /> Exporter Excel
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" /> Nouveau Fournisseur
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Nom / Raison Sociale</TableHead>
              <TableHead>Adresse</TableHead>
              <TableHead>NIF</TableHead>
              <TableHead>Auth. NIF</TableHead>
              <TableHead>N° RC</TableHead>
              <TableHead>Auth. N° RC</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fetching ? (
              <TableRow><TableCell colSpan={8} className="h-32 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" /></TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="h-32 text-center text-muted-foreground">{search ? "Aucun résultat." : "Aucun fournisseur enregistré."}</TableCell></TableRow>
            ) : (
              filtered.map((f, idx) => (
                <TableRow key={f.id}>
                  <TableCell className="font-mono text-muted-foreground">{idx + 1}</TableCell>
                  <TableCell className="font-medium">{f.raisonSociale}</TableCell>
                  <TableCell>{f.adresse || "—"}</TableCell>
                  <TableCell>{normalizeNifValue(f.nif) || "—"}</TableCell>
                  <TableCell>{f.authNif || "—"}</TableCell>
                  <TableCell>{f.rc || "—"}</TableCell>
                  <TableCell>{f.authRc || "—"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(f)} title="Modifier"><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setDeleteTarget(f)} title="Supprimer"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">{filtered.length} fournisseur{filtered.length !== 1 ? "s" : ""}{search && ` (filtrés sur ${fournisseurs.length} au total)`}</p>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editTarget ? "Modifier le fournisseur" : "Nouveau fournisseur"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="raisonSociale">Nom / Raison Sociale <span className="text-destructive">*</span></Label>
              <Input id="raisonSociale" value={form.raisonSociale} onChange={(e) => setForm({ ...form, raisonSociale: e.target.value })} placeholder="Ex: SARL ALGÉRIE TÉLÉCOMS" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="adresse">Adresse</Label>
              <Input id="adresse" value={form.adresse} onChange={(e) => setForm({ ...form, adresse: e.target.value })} placeholder="Ex: Alger Centre" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nif">Numéro d'Identification Fiscale (NIF)</Label>
              <Input id="nif" value={form.nif} onChange={(e) => setForm({ ...form, nif: e.target.value })} placeholder="Ex: 000016001234567" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="authNif">Auth. NIF</Label>
              <Input id="authNif" value={form.authNif} onChange={(e) => setForm({ ...form, authNif: e.target.value })} placeholder="Ex: 2026/00123" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rc">N° RC</Label>
              <Input id="rc" value={form.rc} onChange={(e) => setForm({ ...form, rc: e.target.value })} placeholder="Ex: 16B123456" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="authRc">Auth. N° RC</Label>
              <Input id="authRc" value={form.authRc} onChange={(e) => setForm({ ...form, authRc: e.target.value })} placeholder="Ex: RC/2026/0145" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editTarget ? "Enregistrer" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Loader */}
      <Dialog open={importing}>
        <DialogContent className="sm:max-w-md" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Import en cours</DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-3 py-2 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Traitement des fournisseurs, veuillez patienter...</span>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Summary */}
      <Dialog open={importSummaryOpen} onOpenChange={setImportSummaryOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Recapitulatif de l'import</DialogTitle>
          </DialogHeader>

          <div className="space-y-2 text-sm">
            <p>Nombre d'import reussi: <strong>{importSummary?.success ?? 0}</strong></p>
            <p>Nombre d'echec: <strong>{importSummary?.errors ?? 0}</strong></p>
            <p className="text-muted-foreground">
              Crees: {importSummary?.created ?? 0}, modifies: {importSummary?.updated ?? 0}, conserves: {importSummary?.kept ?? 0}, deja identiques: {importSummary?.unchanged ?? 0}, lignes ignorees: {importSummary?.ignored ?? 0}
            </p>
          </div>

          {(importSummary?.failures.length ?? 0) > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Details des echecs</p>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fournisseur</TableHead>
                      <TableHead>Operation</TableHead>
                      <TableHead>Raison</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importSummary?.failures.map((failure, index) => (
                      <TableRow key={`${failure.supplierName}-${index}`}>
                        <TableCell>{failure.supplierName}</TableCell>
                        <TableCell>{failure.operation === "creation" ? "Creation" : "Mise a jour"}</TableCell>
                        <TableCell>{failure.reason}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setImportSummaryOpen(false)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Conflict Resolution */}
      <Dialog
        open={importDialogOpen}
        onOpenChange={(open) => {
          if (!open && !importing) {
            resetImportResolution()
          }
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Conflits détectés lors de l'import</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              {importConflicts.length} conflit(s) détecté(s), {pendingImportCreates.length} nouveau(x) fournisseur(s), {pendingUnchanged} déjà identique(s).
            </p>
            {pendingIgnoredCount > 0 && (
              <p className="text-muted-foreground">{pendingIgnoredCount} ligne(s) CSV ont été ignorée(s) (nom vide).</p>
            )}

            {importConflicts.map((conflict) => {
              const decision = importDecisions[String(conflict.existing.id)] ?? "keep"
              return (
                <div key={conflict.existing.id} className="space-y-3 rounded-md border p-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="font-medium">{conflict.existing.raisonSociale}</p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant={decision === "keep" ? "default" : "outline"}
                        onClick={() => setConflictDecision(conflict.existing.id, "keep")}
                        disabled={importing}
                      >
                        Garder les infos existantes
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={decision === "update" ? "default" : "outline"}
                        onClick={() => setConflictDecision(conflict.existing.id, "update")}
                        disabled={importing}
                      >
                        Modifier avec le CSV
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-2 text-xs sm:grid-cols-2">
                    <div className="rounded border bg-muted/30 p-2">
                      <p className="mb-1 font-medium text-emerald-700">Existant (base actuelle)</p>
                      <p>Adresse existante: {conflict.existing.adresse || "—"}</p>
                      <p>NIF existant: {conflict.existing.nif || "—"}</p>
                      <p>Auth. NIF existant: {conflict.existing.authNif || "—"}</p>
                      <p>N° RC existant: {conflict.existing.rc || "—"}</p>
                      <p>Auth. N° RC existant: {conflict.existing.authRc || "—"}</p>
                    </div>
                    <div className="rounded border bg-muted/30 p-2">
                      <p className="mb-1 font-medium text-blue-700">Import (fichier CSV)</p>
                      <p>Adresse importée: {conflict.incoming.adresse || "—"}</p>
                      <p>NIF importé: {conflict.incoming.nif || "—"}</p>
                      <p>Auth. NIF importé: {conflict.incoming.authNif || "—"}</p>
                      <p>N° RC importé: {conflict.incoming.rc || "—"}</p>
                      <p>Auth. N° RC importé: {conflict.incoming.authRc || "—"}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetImportResolution} disabled={importing}>Annuler</Button>
            <Button onClick={handleImportConflictConfirm} disabled={importing}>
              {importing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Appliquer l'import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le fournisseur ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irréversible. <strong>{deleteTarget?.raisonSociale}</strong> sera définitivement supprimé.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

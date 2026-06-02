"use client"

const fmt = (v: number | string) => {
  if (v === "" || isNaN(Number(v))) return ""
  const num = Number(v)
  const [intPart, decPart] = num.toFixed(2).split(".")
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, " ")
  return `${formattedInt},${decPart}`
}

const num = (v: string | number | null | undefined) => {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0
  const raw = String(v ?? "").replace(/\u00A0/g, " ").trim()
  if (!raw) return 0
  const standardized = raw.replace(/\s/g, "").replace(/,/g, ".")
  const parsed = parseFloat(standardized)
  return Number.isFinite(parsed) ? parsed : 0
}

const getPeriodEndDate = (mois: string, annee: string) => {
  const m = Number(mois)
  const y = Number(annee)
  if (!Number.isFinite(m) || !Number.isFinite(y) || m < 1 || m > 12 || y < 1) return ""
  const prevMonth = m === 1 ? 12 : m - 1
  const prevYear = m === 1 ? y - 1 : y
  const lastDay = new Date(prevYear, prevMonth, 0).getDate()
  return `${prevYear}-${String(prevMonth).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`
}

const MONTHS: Record<string, string> = {
  "01": "Janvier", "02": "Février", "03": "Mars", "04": "Avril",
  "05": "Mai", "06": "Juin", "07": "Juillet", "08": "Août",
  "09": "Septembre", "10": "Octobre", "11": "Novembre", "12": "Décembre",
}

const SIEGE_G1_LABELS = ["Encaissement", "Encaissement Exonérée"]
const SIEGE_G2_LABELS = [
  "Encaissement MOBIPOST", "Encaissement POST PAID", "Encaissement RACIMO",
  "Encaissement DME", "Encaissement SOFIA", "Encaissement CCP RECOUVREMENT A",
  "Encaissement CCP RECOUVREMENT B", "Encaissement CCP TPE",
  "Encaissement BNA TPE", "Encaissement MASTER ALGERIE POSTE",
]
const IRG_LABELS = [
  "IRG sur Salaire Bareme", "Autre IRG 10%", "Autre IRG 15%",
  "Jetons de presence 10%", "Tantieme 10%",
]
const TAXE2_LABELS = ["Taxe sur l'importation des biens et services"]
const TAXE12_LABELS = ["Taxe de Formation Professionnelle 1%", "Taxe d'Apprentissage 1%"]
const ACOMPTE_MONTHS = [
  { value: "02", label: "Fev" },
  { value: "05", label: "Mai" },
  { value: "10", label: "Oct" },
]

const HEADER_BG = "2DB34B"
const HEADER_FONT_COLOR = "000000"
const TOTAL_BG = "2DB34B"
const TOTAL_FONT_COLOR = "000000"
const BORDER_COLOR = "333333"
const LIGHT_BORDER = "CCCCCC"

const fileToBase64 = (file: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const content = String(reader.result ?? "")
      const base64 = content.split(",")[1] ?? ""
      resolve(base64)
    }
    reader.onerror = () => reject(new Error("Cannot read logo"))
    reader.readAsDataURL(file)
  })

async function addLogo(workbook: any, worksheet: any) {
  try {
    const logoRes = await fetch("/logo_doc.png")
    if (logoRes.ok) {
      const logoBlob = await logoRes.blob()
      const logoBase64 = await fileToBase64(logoBlob)
      const imageId = workbook.addImage({ base64: logoBase64, extension: "png" })
      worksheet.addImage(imageId, {
        tl: { col: 0, row: 0 },
        ext: { width: 110, height: 36 },
      })
    }
  } catch {
    // Keep export functional even if logo loading fails
  }
}

function addHeaderSection(worksheet: any, title: string, period: string, colCount: number) {
  const mergeEnd = worksheet.getColumn(colCount).letter

  const addUnderlinedRow = (rowNum: number, text: string) => {
    worksheet.mergeCells(`A${rowNum}:${mergeEnd}${rowNum}`)
    const cell = worksheet.getCell(`A${rowNum}`)
    cell.value = text
    cell.font = { bold: true, size: 11, name: "Times New Roman" }
    cell.alignment = { horizontal: "left", vertical: "middle" }
    cell.border = {
      bottom: { style: "thin", color: { argb: "000000" } },
    }
  }

  addUnderlinedRow(3, "ATM MOBILIS SPA")
  addUnderlinedRow(4, "DIRECTION DES FINANCES ET DE LA COMPTABILITE")
  addUnderlinedRow(5, "SOUS DIRECTION FISCALITE")

  const titleRow = 7
  worksheet.mergeCells(`A${titleRow}:${mergeEnd}${titleRow}`)
  const titleCell = worksheet.getCell(`A${titleRow}`)
  titleCell.value = `${title} ${period}`.trim()
  titleCell.font = { bold: true, italic: true, size: 14, name: "Times New Roman", color: { argb: "FF000000" } }
  titleCell.alignment = { horizontal: "left", vertical: "middle" }
  titleCell.border = {
    bottom: { style: "thin", color: { argb: "000000" } },
  }
  worksheet.getRow(titleRow).height = 26
}

function addTableHeader(worksheet: any, headers: string[], headerRow: number) {
  const row = worksheet.getRow(headerRow)
  row.values = headers
  row.height = 22

  for (let col = 1; col <= headers.length; col++) {
    const cell = row.getCell(col)
    cell.font = { bold: true, color: { argb: HEADER_FONT_COLOR }, name: "Arial", size: 10 }
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true }
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_BG } }
    cell.border = {
      top: { style: "thin", color: { argb: BORDER_COLOR } },
      left: { style: "thin", color: { argb: BORDER_COLOR } },
      bottom: { style: "thin", color: { argb: BORDER_COLOR } },
      right: { style: "thin", color: { argb: BORDER_COLOR } },
    }
  }
}

function addDataCells(worksheet: any, row: any, colStart: number, colEnd: number, isTotal: boolean) {
  for (let col = colStart; col <= colEnd; col++) {
    const cell = row.getCell(col)
    if (isTotal) {
      cell.font = { bold: true, size: 10, name: "Arial", color: { argb: TOTAL_FONT_COLOR } }
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: TOTAL_BG } }
    } else {
      cell.font = { size: 10, name: "Arial" }
    }
    cell.alignment = { vertical: "middle", wrapText: true }
    cell.border = {
      top: { style: "thin", color: { argb: LIGHT_BORDER } },
      left: { style: "thin", color: { argb: LIGHT_BORDER } },
      bottom: { style: "thin", color: { argb: LIGHT_BORDER } },
      right: { style: "thin", color: { argb: LIGHT_BORDER } },
    }
  }
}

function addTvaDeductionHeader(worksheet: any, decl: any, period: string, colCount: number) {
  const mergeEnd = worksheet.getColumn(colCount).letter
  const periodParts = period.split(" ")
  const mois = periodParts[0] ?? ""
  const annee = periodParts[1] ?? ""

  const drawBox = (startRow: number, endRow: number, startCol: number, endCol: number, color = "000000") => {
    for (let r = startRow; r <= endRow; r++) {
      for (let c = startCol; c <= endCol; c++) {
        const cell = worksheet.getCell(r, c)
        cell.border = {
          top: { style: r === startRow ? "thin" : "none", color: { argb: color } },
          left: { style: c === startCol ? "thin" : "none", color: { argb: color } },
          bottom: { style: r === endRow ? "thin" : "none", color: { argb: color } },
          right: { style: c === endCol ? "thin" : "none", color: { argb: color } },
        }
      }
    }
  }

  const write = (row: number, col: number, text: string, font: any) => {
    const cell = worksheet.getCell(row, col)
    cell.value = text
    cell.font = font
    cell.alignment = { horizontal: "left", vertical: "middle" }
  }

  // Left box: Année / Mois / Direction (single column, compact font)
  write(1, 1, `Année : ${String(decl.annee ?? "")}`, { bold: true, size: 8, name: "Times New Roman" })
  write(2, 1, `Mois : ${mois}`, { bold: true, size: 8, name: "Times New Roman" })
  write(3, 1, `Dir : ${String(decl.direction ?? "")}`, { bold: true, size: 8, name: "Times New Roman" })

  drawBox(1, 3, 1, 1)

  // Right box: company identity (rows 1-6, shifted left)
  const rStart = Math.max(2, Math.floor((colCount - 6) / 2))
  const rEnd = rStart + 5
  const companyLabels = ["M.", "Activité:", "Adresse:", "NIF / NIS", "TIN", "AI"]
  const companyValues = [
    "ATM MOBILIS",
    "TELEPHONIE MOBILE",
    "QUARTIER DES AFFAIRES GROUPE 05 ILOT 27,28 ET 29 BAB EZZOUAR",
    "316096228742",
    "67547",
    "16217010002",
  ]

  for (let i = 0; i < 6; i++) {
    const row = 1 + i
    // Label in first column of box
    write(row, rStart, companyLabels[i], { bold: true, size: 8, name: "Times New Roman" })
    // Value centered across remaining columns of box
    if (rEnd > rStart) {
      worksheet.mergeCells(row, rStart + 1, row, rEnd)
    }
    const valCell = worksheet.getCell(row, rStart + 1)
    valCell.value = companyValues[i]
    valCell.font = { bold: true, size: 8, name: "Times New Roman" }
    valCell.alignment = { horizontal: "center", vertical: "middle" }
  }

  drawBox(1, 6, rStart, rEnd)
  // Horizontal separators in right box
  for (let r = 1; r <= 5; r++) {
    for (let c = rStart; c <= rEnd; c++) {
      const existing = worksheet.getCell(r, c).border
      worksheet.getCell(r, c).border = { ...existing, bottom: { style: "thin", color: { argb: "000000" } } }
    }
  }

  // Title box (rows 8-9 or 9-10, all columns)
  const titleRow = 8
  worksheet.mergeCells(titleRow, 1, titleRow, colCount)
  const titleCell = worksheet.getCell(titleRow, 1)
  titleCell.value = "Etat de déduction de la TVA"
  titleCell.font = { bold: true, italic: true, size: 16, name: "Times New Roman", color: { argb: "FF000000" } }
  titleCell.alignment = { horizontal: "center", vertical: "middle" }
  worksheet.getRow(titleRow).height = 28

  const subRow = titleRow + 1
  worksheet.mergeCells(subRow, 1, subRow, colCount)
  const subCell = worksheet.getCell(subRow, 1)
  subCell.value = "(Conformément à l'article 29 tel modifié par l'article 42 de la Loi de Finances pour 2021)"
  subCell.font = { italic: true, size: 10, name: "Times New Roman" }
  subCell.alignment = { horizontal: "center", vertical: "middle" }
  worksheet.getRow(subRow).height = 20

  drawBox(titleRow, subRow, 1, colCount)
}

const G50_TABLE_NUMBERS: Record<string, number> = {
  encaissement: 1,
  droits_timbre: 4,
  ca_tap: 5,
  etat_tap: 6,
}

const G50_TABS = new Set(["encaissement", "droits_timbre", "ca_tap", "etat_tap"])

function addG50Header(worksheet: any, tabKey: string, direction: string, period: string, title: string, colCount: number) {
  const mergeEnd = worksheet.getColumn(colCount).letter
  const periodParts = period.split(" ")
  const mois = periodParts[0] ?? ""
  const annee = periodParts[1] ?? ""
  const tableNum = G50_TABLE_NUMBERS[tabKey] ?? ""

  // Left box
  const leftStart = 1
  const leftEnd = colCount >= 4 ? 2 : 1
  // Right box
  const rightEnd = colCount
  const rightStart = colCount >= 4 ? colCount - 1 : colCount

  const setCell = (row: number, col: number, val: string) => {
    const cell = worksheet.getCell(row, col)
    cell.value = val
    cell.font = { bold: true, size: 9, name: "Arial" }
    cell.alignment = { horizontal: "left", vertical: "middle" }
  }

  const addSeparator = (row: number, startCol: number, endCol: number) => {
    for (let c = startCol; c <= endCol; c++) {
      const existing = worksheet.getCell(row, c).border
      worksheet.getCell(row, c).border = { ...existing, bottom: { style: "thin", color: { argb: "000000" } } }
    }
  }

  const drawBox = (startRow: number, endRow: number, startCol: number, endCol: number) => {
    for (let r = startRow; r <= endRow; r++) {
      for (let c = startCol; c <= endCol; c++) {
        const cell = worksheet.getCell(r, c)
        cell.border = {
          top: { style: r === startRow ? "thin" : "none", color: { argb: "333333" } },
          left: { style: c === startCol ? "thin" : "none", color: { argb: "333333" } },
          bottom: { style: r === endRow ? "thin" : "none", color: { argb: "333333" } },
          right: { style: c === endCol ? "thin" : "none", color: { argb: "333333" } },
        }
      }
    }
  }

  // Left box (rows 3-4)
  if (leftEnd > leftStart) {
    worksheet.mergeCells(3, leftStart, 3, leftEnd)
    worksheet.mergeCells(4, leftStart, 4, leftEnd)
  }
  setCell(3, leftStart, "ATM MOBILIS")
  setCell(4, leftStart, `DR : ${direction || ""}`)
  drawBox(3, 4, leftStart, leftEnd)
  addSeparator(3, leftStart, leftEnd)

  // Right box (rows 3-4)
  if (rightEnd > rightStart) {
    worksheet.mergeCells(3, rightStart, 3, rightEnd)
    worksheet.mergeCells(4, rightStart, 4, rightEnd)
  }
  setCell(3, rightStart, `Déclaration Mois : ${mois}`)
  setCell(4, rightStart, `Année : ${annee}`)
  drawBox(3, 4, rightStart, rightEnd)
  addSeparator(3, rightStart, rightEnd)

  // Center title box (rows 6-7, all columns)
  worksheet.mergeCells(6, 1, 6, colCount)
  worksheet.getCell(6, 1).value = "ETAT MENSUEL DE DECLARATION G50"
  worksheet.getCell(6, 1).font = { bold: true, italic: true, size: 12, name: "Times New Roman", color: { argb: "FF000000" } }
  worksheet.getCell(6, 1).alignment = { horizontal: "center", vertical: "middle" }
  worksheet.getRow(6).height = 22

  const tableTitleFull = tableNum ? `TABLEAU N° ${tableNum} : ${title}`.trim() : title
  worksheet.mergeCells(7, 1, 7, colCount)
  worksheet.getCell(7, 1).value = tableTitleFull
  worksheet.getCell(7, 1).font = { bold: true, size: 10, name: "Arial" }
  worksheet.getCell(7, 1).alignment = { horizontal: "center", vertical: "middle" }
  worksheet.getRow(7).height = 20

  drawBox(6, 7, 1, colCount)
}

export async function exportDeclarationToExcel(
  tabKey: string,
  decl: any,
  title: string,
  direction: string,
  wilayas?: any[],
  fiscalFournisseurs?: { id: number; raisonSociale: string }[],
  ibsFournisseurId?: string,
  tva16FournisseurId?: string,
) {
  const ExcelJS = (await import("exceljs")).default
  const workbook = new ExcelJS.Workbook()
  workbook.creator = "DFC Portal"
  workbook.created = new Date()

  const period = `${MONTHS[decl.mois] || decl.mois} ${decl.annee}`

  const setupSheet = (name: string) => {
    const ws = workbook.addWorksheet(name, {
      pageSetup: {
        orientation: "landscape",
        paperSize: 9,
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        margins: { left: 0.3, right: 0.3, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 },
      },
    })
    return ws
  }

  switch (tabKey) {
    case "encaissement": {
      const ws = setupSheet("Encaissement")
      const rows = decl.encRows ?? []
      const computedRows = rows.map((r: any, idx: number) => {
        const ht = num(r.ht ?? "")
        if (idx === 1) {
          return { designation: r.designation, ht, tva: 0, ttc: ht }
        }
        if (r.ttc) {
          const ttc = num(r.ttc)
          return { designation: r.designation, ht, tva: ttc - ht, ttc }
        }
        const tva = ht * 0.19
        return { designation: r.designation, ht, tva, ttc: ht + tva }
      })
      const totals = computedRows.reduce(
        (a: any, r: any) => ({ ht: a.ht + r.ht, tva: a.tva + r.tva, ttc: a.ttc + r.ttc }),
        { ht: 0, tva: 0, ttc: 0 },
      )

      ws.columns = [
        { key: "designation", width: 50 },
        { key: "ht", width: 22 },
        { key: "tva", width: 22 },
        { key: "ttc", width: 22 },
      ]

      await addLogo(workbook, ws)
      addG50Header(ws, tabKey, direction, period, "ETAT DES ENCAISSEMENTS", 4)

      const headerRow = 9
      addTableHeader(ws, ["DESIGNATIONS", "ENCAISSEMENTS HT", "TVA", "ENCAISSEMENTS TTC"], headerRow)

      const dataStart = headerRow + 1
      computedRows.forEach((r: any, i: number) => {
        const row = ws.getRow(dataStart + i)
        row.getCell(1).value = r.designation || "-"
        row.getCell(2).value = r.ht
        row.getCell(2).numFmt = '#,##0.00'
        row.getCell(2).alignment = { horizontal: "right", vertical: "middle" }
        row.getCell(3).value = r.tva
        row.getCell(3).numFmt = '#,##0.00'
        row.getCell(3).alignment = { horizontal: "right", vertical: "middle" }
        row.getCell(4).value = r.ttc
        row.getCell(4).numFmt = '#,##0.00'
        row.getCell(4).alignment = { horizontal: "right", vertical: "middle" }
        addDataCells(ws, row, 1, 4, false)
      })

      const totalRowIdx = dataStart + computedRows.length
      const totalRow = ws.getRow(totalRowIdx)
      totalRow.getCell(1).value = "TOTAL"
      totalRow.getCell(2).value = totals.ht
      totalRow.getCell(2).numFmt = '#,##0.00'
      totalRow.getCell(2).alignment = { horizontal: "right", vertical: "middle" }
      totalRow.getCell(3).value = totals.tva
      totalRow.getCell(3).numFmt = '#,##0.00'
      totalRow.getCell(3).alignment = { horizontal: "right", vertical: "middle" }
      totalRow.getCell(4).value = totals.ttc
      totalRow.getCell(4).numFmt = '#,##0.00'
      totalRow.getCell(4).alignment = { horizontal: "right", vertical: "middle" }
      addDataCells(ws, totalRow, 1, 4, true)
      totalRow.height = 22
      break
    }

    case "tva_immo":
    case "tva_biens": {
      const ws = setupSheet(tabKey === "tva_immo" ? "TVA IMMO" : "TVA Biens")
      const rows = (tabKey === "tva_immo" ? decl.tvaImmoRows : decl.tvaBiensRows) ?? []
      const totalLabel = tabKey === "tva_immo" ? "TOTAL TVA SUR IMMOBILISATION 445620" : "TOTAL TVA SUR BIENS ET SERVICES"

      const tHT = rows.reduce((s: number, r: any) => s + num(r.montantHT), 0)
      const tTVA = rows.reduce((s: number, r: any) => s + num(r.tva), 0)
      const tTTC = tHT + tTVA

      ws.columns = [
        { key: "raisonSociale", width: 44 },
        { key: "adresse", width: 30 },
        { key: "nif", width: 14 },
        { key: "authNif", width: 20 },
        { key: "rc", width: 14 },
        { key: "authRC", width: 22 },
        { key: "numFacture", width: 23 },
        { key: "dateFacture", width: 18 },
        { key: "montantHT", width: 21 },
        { key: "tva", width: 18 },
        { key: "montantTTC", width: 21 },
      ]

      addTvaDeductionHeader(ws, decl, period, 11)

      const headerRow = 11
      const headers = [
        "Nom et prénoms /Raison sociale", "Adresse", "NIF",
        "Authentification du NIF", "RC n°", "Authentification du n°RC",
        "Facture n°", "Date", "Montant HT", "TVA", "Montant TTC",
      ]
      const headerCells: any[] = []
      for (let c = 1; c <= 11; c++) {
        const cell = ws.getCell(headerRow, c)
        cell.value = headers[c - 1]
        cell.font = { bold: true, size: 9, name: "Times New Roman", color: { argb: "FF000000" } }
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD0D0D0" } }
        cell.alignment = { horizontal: "center", vertical: "middle" }
        cell.border = {
          top: { style: "thin", color: { argb: "000000" } },
          left: { style: "thin", color: { argb: "000000" } },
          bottom: { style: "thin", color: { argb: "000000" } },
          right: { style: "thin", color: { argb: "000000" } },
        }
        headerCells.push(cell)
      }
      ws.getRow(headerRow).height = 20

      const dataStart = headerRow + 1
      rows.forEach((r: any, i: number) => {
        const row = ws.getRow(dataStart + i)
        const textFont = { size: 9, name: "Times New Roman" }
        row.getCell(1).value = r.nomRaisonSociale || ""
        row.getCell(1).font = textFont
        row.getCell(1).alignment = { horizontal: "left", vertical: "middle" }
        row.getCell(2).value = r.adresse || ""
        row.getCell(2).font = textFont
        row.getCell(2).alignment = { horizontal: "left", vertical: "middle" }
        row.getCell(3).value = r.nif || ""
        row.getCell(3).font = textFont
        row.getCell(3).alignment = { horizontal: "center", vertical: "middle" }
        row.getCell(4).value = r.authNif || ""
        row.getCell(4).font = textFont
        row.getCell(4).alignment = { horizontal: "center", vertical: "middle" }
        row.getCell(5).value = r.numRC || ""
        row.getCell(5).font = textFont
        row.getCell(5).alignment = { horizontal: "center", vertical: "middle" }
        row.getCell(6).value = r.authRC || ""
        row.getCell(6).font = textFont
        row.getCell(6).alignment = { horizontal: "center", vertical: "middle" }
        row.getCell(7).value = r.numFacture || ""
        row.getCell(7).font = textFont
        row.getCell(7).alignment = { horizontal: "center", vertical: "middle" }
        row.getCell(8).value = r.dateFacture || ""
        row.getCell(8).font = textFont
        row.getCell(8).alignment = { horizontal: "center", vertical: "middle" }
        row.getCell(9).value = num(r.montantHT)
        row.getCell(9).numFmt = '#,##0.00'
        row.getCell(9).font = textFont
        row.getCell(9).alignment = { horizontal: "center", vertical: "middle" }
        row.getCell(10).value = num(r.tva)
        row.getCell(10).numFmt = '#,##0.00'
        row.getCell(10).font = textFont
        row.getCell(10).alignment = { horizontal: "center", vertical: "middle" }
        row.getCell(11).value = num(r.montantHT) + num(r.tva)
        row.getCell(11).numFmt = '#,##0.00'
        row.getCell(11).font = textFont
        row.getCell(11).alignment = { horizontal: "center", vertical: "middle" }
        for (let c = 1; c <= 11; c++) {
          const cell = row.getCell(c)
          cell.border = {
            top: { style: "thin", color: { argb: "000000" } },
            left: { style: "thin", color: { argb: "000000" } },
            bottom: { style: "thin", color: { argb: "000000" } },
            right: { style: "thin", color: { argb: "000000" } },
          }
        }
        row.height = 18
      })

      const totalRowIdx = dataStart + rows.length
      const totalRow = ws.getRow(totalRowIdx)

      // Merge first 6 cells with pink background (227,186,186)
      ws.mergeCells(totalRowIdx, 1, totalRowIdx, 6)
      totalRow.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE3BABA" } }
      totalRow.getCell(1).border = {
        top: { style: "thin", color: { argb: "000000" } },
        left: { style: "thin", color: { argb: "000000" } },
        bottom: { style: "thin", color: { argb: "000000" } },
        right: { style: "thin", color: { argb: "000000" } },
      }

      // Cells 7-8 merged: label with light blue (19,175,229)
      ws.mergeCells(totalRowIdx, 7, totalRowIdx, 8)
      totalRow.getCell(7).value = totalLabel
      totalRow.getCell(7).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF13AFE5" } }
      totalRow.getCell(7).font = { bold: true, size: 8, name: "Times New Roman", color: { argb: "FF000000" } }
      totalRow.getCell(7).alignment = { horizontal: "center", vertical: "middle" }
      totalRow.getCell(7).border = {
        top: { style: "thin", color: { argb: "000000" } },
        left: { style: "thin", color: { argb: "000000" } },
        bottom: { style: "thin", color: { argb: "000000" } },
        right: { style: "thin", color: { argb: "000000" } },
      }

      // Cells 9-11: red background (255,0,0) with amounts
      for (let c = 9; c <= 11; c++) {
        const cell = totalRow.getCell(c)
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFF0000" } }
        cell.font = { bold: true, size: 9, name: "Times New Roman", color: { argb: "FF000000" } }
        cell.alignment = { horizontal: "center", vertical: "middle" }
        cell.numFmt = '#,##0.00'
        cell.border = {
          top: { style: "thin", color: { argb: "000000" } },
          left: { style: "thin", color: { argb: "000000" } },
          bottom: { style: "thin", color: { argb: "000000" } },
          right: { style: "thin", color: { argb: "000000" } },
        }
      }
      totalRow.getCell(9).value = tHT
      totalRow.getCell(10).value = tTVA
      totalRow.getCell(11).value = tTTC
      totalRow.height = 24
      break
    }

    case "droits_timbre": {
      const ws = setupSheet("Droits Timbre")
      const rows = decl.timbreRows ?? []
      const totalCA = rows.reduce((s: number, r: any) => s + num(r.caTTCEsp), 0)
      const totalDroit = rows.reduce((s: number, r: any) => s + num(r.droitTimbre), 0)

      ws.columns = [
        { key: "designation", width: 50 },
        { key: "ca", width: 28 },
        { key: "droit", width: 28 },
      ]

      await addLogo(workbook, ws)
      addG50Header(ws, tabKey, direction, period, "ETAT DROITS DE TIMBRE", 3)

      const headerRow = 9
      addTableHeader(ws, ["DESIGNATIONS", "CHIFFRE D'AFFAIRES TTC ENCAISSE EN ESPECE", "DROITS DE TIMBRE"], headerRow)

      const dataStart = headerRow + 1
      rows.forEach((r: any, i: number) => {
        const row = ws.getRow(dataStart + i)
        row.getCell(1).value = r.designation || "-"
        row.getCell(2).value = num(r.caTTCEsp)
        row.getCell(2).numFmt = '#,##0.00'
        row.getCell(2).alignment = { horizontal: "right", vertical: "middle" }
        row.getCell(3).value = num(r.droitTimbre)
        row.getCell(3).numFmt = '#,##0.00'
        row.getCell(3).alignment = { horizontal: "right", vertical: "middle" }
        addDataCells(ws, row, 1, 3, false)
      })

      const totalRowIdx = dataStart + rows.length
      const totalRow = ws.getRow(totalRowIdx)
      totalRow.getCell(1).value = "TOTAL"
      totalRow.getCell(2).value = totalCA
      totalRow.getCell(2).numFmt = '#,##0.00'
      totalRow.getCell(2).alignment = { horizontal: "right", vertical: "middle" }
      totalRow.getCell(3).value = totalDroit
      totalRow.getCell(3).numFmt = '#,##0.00'
      totalRow.getCell(3).alignment = { horizontal: "right", vertical: "middle" }
      addDataCells(ws, totalRow, 1, 3, true)
      totalRow.height = 22
      break
    }

    case "ca_tap": {
      const ws = setupSheet("CA 7% et 1%")
      const b12 = num(decl.b12 ?? "0")
      const b13 = num(decl.b13 ?? "0")
      const totalBase = b12 + b13
      const totalTaxe = b12 * 0.07 + b13 * 0.01

      ws.columns = [
        { key: "designation", width: 55 },
        { key: "ca", width: 28 },
        { key: "taxe", width: 28 },
      ]

      await addLogo(workbook, ws)
      addG50Header(ws, tabKey, direction, period, "ETAT DU CA RECHARGEMENT HT (7%) et CA GLOBAL HT (1%)", 3)

      const headerRow = 9
      addTableHeader(ws, ["DESIGNATIONS", "MONTANT DU CA HT SOUMIS", "MONTANT DE LA TAXE A VERSER"], headerRow)

      const data = [
        { designation: "CA RECHARGEMENT SOUMIS A 7%", ca: b12, taxe: b12 * 0.07 },
        { designation: "CA GLOBAL SOUMIS A 1%", ca: b13, taxe: b13 * 0.01 },
      ]

      data.forEach((r, i) => {
        const row = ws.getRow(headerRow + 1 + i)
        row.getCell(1).value = r.designation
        row.getCell(2).value = r.ca
        row.getCell(2).numFmt = '#,##0.00'
        row.getCell(2).alignment = { horizontal: "right", vertical: "middle" }
        row.getCell(3).value = r.taxe
        row.getCell(3).numFmt = '#,##0.00'
        row.getCell(3).alignment = { horizontal: "right", vertical: "middle" }
        addDataCells(ws, row, 1, 3, false)
      })

      const totalRowIdx = headerRow + 1 + data.length
      const totalRow = ws.getRow(totalRowIdx)
      totalRow.getCell(1).value = "TOTAL"
      totalRow.getCell(2).value = totalBase
      totalRow.getCell(2).numFmt = '#,##0.00'
      totalRow.getCell(2).alignment = { horizontal: "right", vertical: "middle" }
      totalRow.getCell(3).value = totalTaxe
      totalRow.getCell(3).numFmt = '#,##0.00'
      totalRow.getCell(3).alignment = { horizontal: "right", vertical: "middle" }
      addDataCells(ws, totalRow, 1, 3, true)
      totalRow.height = 22

      const noteRow = totalRowIdx + 2
      ws.mergeCells(`A${noteRow}:C${noteRow}`)
      ws.getCell(`A${noteRow}`).value = "NB: LE CA GLOBAL SOUMIS A 1% DOIT CORRESPONDRE AU CA COMPTABILISE"
      ws.getCell(`A${noteRow}`).font = { italic: true, size: 9, name: "Calibri", color: { argb: "666666" } }
      break
    }

    case "etat_tap": {
      const ws = setupSheet("ETAT TAP")
      const rows = decl.tapRows ?? []
      const getWilayaName = (code: string) =>
        (wilayas ?? []).find((w: any) => w.code === code || w.wilaya === code)?.wilaya ?? code
      const getCommuneLabel = (wilayaCode: string, communeId: string) => {
        const commune = (wilayas ?? [])
          .find((w: any) => w.code === wilayaCode || w.wilaya === wilayaCode)
          ?.communes.find((c: any) => c.id === communeId)
        return commune?.nom || communeId || "-"
      }
      const totalImposable = rows.reduce((s: number, r: any) => s + num(r.tap2), 0)
      const totalTAP = totalImposable * 0.015

      ws.columns = [
        { key: "code", width: 12 },
        { key: "wilaya", width: 24 },
        { key: "commune", width: 24 },
        { key: "montant", width: 22 },
        { key: "tap", width: 18 },
      ]

      await addLogo(workbook, ws)
      addG50Header(ws, tabKey, direction, period, "ETAT TAP", 5)

      const headerRow = 9
      addTableHeader(ws, ["Code Wilaya", "Wilaya", "Commune", "Montant Imposable", "TAP 1,5%"], headerRow)

      const dataStart = headerRow + 1
      rows.forEach((r: any, i: number) => {
        const row = ws.getRow(dataStart + i)
        row.getCell(1).value = r.wilayaCode || "-"
        row.getCell(2).value = getWilayaName(r.wilayaCode)
        row.getCell(3).value = getCommuneLabel(r.wilayaCode, r.commune)
        row.getCell(4).value = num(r.tap2)
        row.getCell(4).numFmt = '#,##0.00'
        row.getCell(4).alignment = { horizontal: "right", vertical: "middle" }
        row.getCell(5).value = num(r.tap2) * 0.015
        row.getCell(5).numFmt = '#,##0.00'
        row.getCell(5).alignment = { horizontal: "right", vertical: "middle" }
        addDataCells(ws, row, 1, 5, false)
      })

      const totalRowIdx = dataStart + rows.length
      const totalRow = ws.getRow(totalRowIdx)
      totalRow.getCell(1).value = "TOTAL"
      ws.mergeCells(`A${totalRowIdx}:C${totalRowIdx}`)
      totalRow.getCell(4).value = totalImposable
      totalRow.getCell(4).numFmt = '#,##0.00'
      totalRow.getCell(4).alignment = { horizontal: "right", vertical: "middle" }
      totalRow.getCell(5).value = totalTAP
      totalRow.getCell(5).numFmt = '#,##0.00'
      totalRow.getCell(5).alignment = { horizontal: "right", vertical: "middle" }
      addDataCells(ws, totalRow, 1, 5, true)
      totalRow.height = 22
      break
    }

    case "ca_siege": {
      const ws = setupSheet("CA Siege")
      const rows = decl.caSiegeRows ?? []
      const normalizedRows = Array.from({ length: 12 }, (_, i) => rows[i] ?? { ttc: "", ht: "" })
      const g1 = normalizedRows.slice(0, 2)
      const g2 = normalizedRows.slice(2, 12)
      const t1ttc = g1.reduce((s: number, r: any) => s + num(r.ttc), 0)
      const t1ht = g1.reduce((s: number, r: any) => s + num(r.ht), 0)
      const t2ttc = g2.reduce((s: number, r: any) => s + num(r.ttc), 0)
      const t2ht = g2.reduce((s: number, r: any) => s + num(r.ht), 0)

      ws.columns = [
        { key: "designation", width: 50 },
        { key: "ttc", width: 24 },
        { key: "ht", width: 24 },
      ]

      await addLogo(workbook, ws)
      addHeaderSection(ws, "CHIFFRE D'AFFAIRE ENCAISSE SIEGE", period, 3)

      const headerRow = 9
      addTableHeader(ws, ["DESIGNATION", "TTC", "HT"], headerRow)

      const displayRows = [
        ...g1.map((r: any, i: number) => ({ label: SIEGE_G1_LABELS[i], ttc: num(r.ttc), ht: num(r.ht) })),
        { label: "TOTAL 1", ttc: t1ttc, ht: t1ht, total: true },
        ...g2.map((r: any, i: number) => ({ label: SIEGE_G2_LABELS[i], ttc: num(r.ttc), ht: num(r.ht) })),
        { label: "TOTAL 2", ttc: t2ttc, ht: t2ht, total: true },
        { label: "TOTAL GENERAL", ttc: t1ttc + t2ttc, ht: t1ht + t2ht, total: true },
      ]

      displayRows.forEach((r: any, i: number) => {
        const row = ws.getRow(headerRow + 1 + i)
        row.getCell(1).value = r.label
        row.getCell(2).value = r.ttc
        row.getCell(2).numFmt = '#,##0.00'
        row.getCell(2).alignment = { horizontal: "right", vertical: "middle" }
        row.getCell(3).value = r.ht
        row.getCell(3).numFmt = '#,##0.00'
        row.getCell(3).alignment = { horizontal: "right", vertical: "middle" }
        addDataCells(ws, row, 1, 3, !!r.total)
        if (r.total) {
          row.height = 22
          row.getCell(1).font = { bold: true, size: 10, name: "Calibri", color: { argb: TOTAL_FONT_COLOR } }
          row.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: TOTAL_BG } }
        }
      })
      break
    }

    case "irg": {
      const ws = setupSheet("IRG")
      const rows = decl.irgRows ?? []
      const totalAssiette = rows.reduce((s: number, r: any) => s + num(r.assietteImposable), 0)
      const totalMontant = rows.reduce((s: number, r: any) => s + num(r.montant), 0)

      ws.columns = [
        { key: "designation", width: 50 },
        { key: "assiette", width: 24 },
        { key: "montant", width: 24 },
      ]

      await addLogo(workbook, ws)
      addHeaderSection(ws, "SITUATION IRG", period, 3)

      const headerRow = 9
      addTableHeader(ws, ["DESIGNATION", "ASSIETTE IMPOSABLE", "MONTANT"], headerRow)

      IRG_LABELS.forEach((lbl, i) => {
        const row = ws.getRow(headerRow + 1 + i)
        row.getCell(1).value = lbl
        row.getCell(2).value = num(rows[i]?.assietteImposable ?? "0")
        row.getCell(2).numFmt = '#,##0.00'
        row.getCell(2).alignment = { horizontal: "right", vertical: "middle" }
        row.getCell(3).value = num(rows[i]?.montant ?? "0")
        row.getCell(3).numFmt = '#,##0.00'
        row.getCell(3).alignment = { horizontal: "right", vertical: "middle" }
        addDataCells(ws, row, 1, 3, false)
      })

      const totalRowIdx = headerRow + 1 + IRG_LABELS.length
      const totalRow = ws.getRow(totalRowIdx)
      totalRow.getCell(1).value = "TOTAL"
      totalRow.getCell(2).value = totalAssiette
      totalRow.getCell(2).numFmt = '#,##0.00'
      totalRow.getCell(2).alignment = { horizontal: "right", vertical: "middle" }
      totalRow.getCell(3).value = totalMontant
      totalRow.getCell(3).numFmt = '#,##0.00'
      totalRow.getCell(3).alignment = { horizontal: "right", vertical: "middle" }
      addDataCells(ws, totalRow, 1, 3, true)
      totalRow.height = 22
      break
    }

    case "taxe2": {
      const ws = setupSheet("Taxe 2%")
      const rows = decl.taxe2Rows ?? []
      const totalBase = rows.reduce((s: number, r: any) => s + num(r.base), 0)
      const totalMontant = rows.reduce((s: number, r: any) => s + num(r.montant), 0)

      ws.columns = [
        { key: "designation", width: 55 },
        { key: "base", width: 24 },
        { key: "montant", width: 24 },
      ]

      await addLogo(workbook, ws)
      addHeaderSection(ws, "SITUATION DE LA TAXE 2%", period, 3)

      const headerRow = 9
      addTableHeader(ws, ["DESIGNATION", "MONTANT DE LA BASE", "MONTANT DE LA TAXE 2%"], headerRow)

      TAXE2_LABELS.forEach((lbl, i) => {
        const row = ws.getRow(headerRow + 1 + i)
        row.getCell(1).value = lbl
        row.getCell(2).value = num(rows[i]?.base ?? "0")
        row.getCell(2).numFmt = '#,##0.00'
        row.getCell(2).alignment = { horizontal: "right", vertical: "middle" }
        row.getCell(3).value = num(rows[i]?.montant ?? "0")
        row.getCell(3).numFmt = '#,##0.00'
        row.getCell(3).alignment = { horizontal: "right", vertical: "middle" }
        addDataCells(ws, row, 1, 3, false)
      })

      const totalRowIdx = headerRow + 1 + TAXE2_LABELS.length
      const totalRow = ws.getRow(totalRowIdx)
      totalRow.getCell(1).value = "TOTAL"
      totalRow.getCell(2).value = totalBase
      totalRow.getCell(2).numFmt = '#,##0.00'
      totalRow.getCell(2).alignment = { horizontal: "right", vertical: "middle" }
      totalRow.getCell(3).value = totalMontant
      totalRow.getCell(3).numFmt = '#,##0.00'
      totalRow.getCell(3).alignment = { horizontal: "right", vertical: "middle" }
      addDataCells(ws, totalRow, 1, 3, true)
      totalRow.height = 22
      break
    }

    case "taxe_masters": {
      const ws = setupSheet("Taxe Masters 1.5%")
      const rows = decl.masterRows ?? []
      const totalHT = rows.reduce((s: number, r: any) => s + num(r.montantHT), 0)
      const totalTaxe = rows.reduce((s: number, r: any) => s + num(r.montantHT) * 0.015, 0)

      ws.columns = [
        { key: "date", width: 14 },
        { key: "nom", width: 24 },
        { key: "numFacture", width: 16 },
        { key: "dateFacture", width: 14 },
        { key: "montantHT", width: 18 },
        { key: "taxe", width: 16 },
        { key: "mois", width: 14 },
        { key: "observation", width: 24 },
      ]

      await addLogo(workbook, ws)
      addHeaderSection(ws, "ETAT DE LA TAXE 1,5% DES MASTERS", period, 8)

      const headerRow = 9
      addTableHeader(ws, ["Date", "Nom du Master", "N° Facture", "Date Facture", "Montant HT", "Taxe 1,5%", "Mois", "Observation"], headerRow)

      const periodDate = getPeriodEndDate(decl.mois, decl.annee)
      rows.forEach((r: any, i: number) => {
        const row = ws.getRow(headerRow + 1 + i)
        row.getCell(1).value = periodDate
        row.getCell(2).value = r.nomMaster
        row.getCell(3).value = r.numFacture
        row.getCell(4).value = r.dateFacture
        row.getCell(5).value = num(r.montantHT)
        row.getCell(5).numFmt = '#,##0.00'
        row.getCell(5).alignment = { horizontal: "right", vertical: "middle" }
        row.getCell(6).value = num(r.montantHT) * 0.015
        row.getCell(6).numFmt = '#,##0.00'
        row.getCell(6).alignment = { horizontal: "right", vertical: "middle" }
        row.getCell(7).value = r.mois
        row.getCell(8).value = r.observation
        addDataCells(ws, row, 1, 8, false)
      })

      const totalRowIdx = headerRow + 1 + rows.length
      const totalRow = ws.getRow(totalRowIdx)
      totalRow.getCell(1).value = "TOTAL"
      ws.mergeCells(`A${totalRowIdx}:D${totalRowIdx}`)
      totalRow.getCell(5).value = totalHT
      totalRow.getCell(5).numFmt = '#,##0.00'
      totalRow.getCell(5).alignment = { horizontal: "right", vertical: "middle" }
      totalRow.getCell(6).value = totalTaxe
      totalRow.getCell(6).numFmt = '#,##0.00'
      totalRow.getCell(6).alignment = { horizontal: "right", vertical: "middle" }
      addDataCells(ws, totalRow, 1, 8, true)
      totalRow.height = 22
      break
    }

    case "taxe_vehicule": {
      const ws = setupSheet("Taxe Vehicule")
      const montant = num(decl.taxe11Montant ?? "0")

      ws.columns = [
        { key: "designation", width: 40 },
        { key: "montant", width: 24 },
      ]

      await addLogo(workbook, ws)
      addHeaderSection(ws, "TAXE DE VEHICULE", period, 2)

      const headerRow = 9
      addTableHeader(ws, ["DESIGNATION", "MONTANT"], headerRow)

      const row = ws.getRow(headerRow + 1)
      row.getCell(1).value = "Taxe de vehicule"
      row.getCell(2).value = montant
      row.getCell(2).numFmt = '#,##0.00'
      row.getCell(2).alignment = { horizontal: "right", vertical: "middle" }
      addDataCells(ws, row, 1, 2, false)
      break
    }

    case "taxe_formation": {
      const ws = setupSheet("Taxe Formation")
      const rows = decl.taxe12Rows ?? []
      const total = rows.reduce((s: number, r: any) => s + num(r.montant), 0)

      ws.columns = [
        { key: "designation", width: 50 },
        { key: "montant", width: 24 },
      ]

      await addLogo(workbook, ws)
      addHeaderSection(ws, "TAXE DE FORMATION", period, 2)

      const headerRow = 9
      addTableHeader(ws, ["DESIGNATION", "MONTANT"], headerRow)

      TAXE12_LABELS.forEach((lbl, i) => {
        const row = ws.getRow(headerRow + 1 + i)
        row.getCell(1).value = lbl
        row.getCell(2).value = num(rows[i]?.montant ?? "0")
        row.getCell(2).numFmt = '#,##0.00'
        row.getCell(2).alignment = { horizontal: "right", vertical: "middle" }
        addDataCells(ws, row, 1, 2, false)
      })

      const totalRowIdx = headerRow + 1 + TAXE12_LABELS.length
      const totalRow = ws.getRow(totalRowIdx)
      totalRow.getCell(1).value = "TOTAL"
      totalRow.getCell(2).value = total
      totalRow.getCell(2).numFmt = '#,##0.00'
      totalRow.getCell(2).alignment = { horizontal: "right", vertical: "middle" }
      addDataCells(ws, totalRow, 1, 2, true)
      totalRow.height = 22
      break
    }

    case "acompte": {
      const ws = setupSheet("Acompte")
      const months = decl.acompteMonths ?? []
      const yy = decl.annee.slice(-2)
      const total = months.reduce((s: number, v: string) => s + num(v), 0)
      const colCount = 1 + ACOMPTE_MONTHS.length + 1

      ws.columns = Array.from({ length: colCount }, () => ({ width: 18 }))

      await addLogo(workbook, ws)
      addHeaderSection(ws, "SITUATION DE L'ACOMPTE PROVISIONNEL", period, colCount)

      const headerRow = 9
      const headers = ["Designation", ...ACOMPTE_MONTHS.map((m) => `${m.label} ${yy}`), "TOTAL"]
      addTableHeader(ws, headers, headerRow)

      const row = ws.getRow(headerRow + 1)
      row.getCell(1).value = "Montant"
      months.forEach((v: string, i: number) => {
        if (i < ACOMPTE_MONTHS.length) {
          row.getCell(i + 2).value = num(v)
          row.getCell(i + 2).numFmt = '#,##0.00'
          row.getCell(i + 2).alignment = { horizontal: "right", vertical: "middle" }
        }
      })
      row.getCell(colCount).value = total
      row.getCell(colCount).numFmt = '#,##0.00'
      row.getCell(colCount).alignment = { horizontal: "right", vertical: "middle" }
      addDataCells(ws, row, 1, colCount, false)
      break
    }

    case "ibs": {
      const ws = setupSheet("IBS")
      const rows = decl.ibs14Rows ?? []
      const fournisseurNom = (fiscalFournisseurs ?? []).find((f) => String(f.id) === String(ibsFournisseurId ?? ""))?.raisonSociale ?? ""

      ws.columns = [
        { key: "numFacture", width: 18 },
        { key: "montantBrutDevise", width: 20 },
        { key: "tauxChange", width: 18 },
        { key: "montantBrutDinars", width: 20 },
        { key: "montantNetDevise", width: 22 },
        { key: "montantIBS", width: 18 },
        { key: "montantNetDinars", width: 22 },
      ]

      await addLogo(workbook, ws)
      addHeaderSection(ws, title, period, 7)

      if (fournisseurNom) {
        ws.mergeCells(`A8:G8`)
        ws.getCell(`A8`).value = `Fournisseur: ${fournisseurNom}`
        ws.getCell(`A8`).font = { size: 10, name: "Arial", italic: true }
        ws.getCell(`A8`).alignment = { horizontal: "right", vertical: "middle" }
      }

      const headerRow = 10
      addTableHeader(ws, [
        "NUMERO DE FACTURE", "MONTANT BRUT EN DEVISES",
        "TAUX DE CHANGE / DATE DU CONTRAT", "MONTANT BRUT EN DINARS",
        "MONTANT NET TRANSFERABLE EN DEVISES", "MONTANT DE L'IBS",
        "MONTANT NET TRANSFERABLE EN DINARS",
      ], headerRow)

      rows.forEach((r: any, i: number) => {
        const row = ws.getRow(headerRow + 1 + i)
        row.getCell(1).value = r.numFacture
        row.getCell(2).value = num(r.montantBrutDevise)
        row.getCell(2).numFmt = '#,##0.00'
        row.getCell(2).alignment = { horizontal: "right", vertical: "middle" }
        row.getCell(3).value = r.tauxChange
        row.getCell(4).value = num(r.montantBrutDinars)
        row.getCell(4).numFmt = '#,##0.00'
        row.getCell(4).alignment = { horizontal: "right", vertical: "middle" }
        row.getCell(5).value = num(r.montantNetDevise)
        row.getCell(5).numFmt = '#,##0.00'
        row.getCell(5).alignment = { horizontal: "right", vertical: "middle" }
        row.getCell(6).value = num(r.montantIBS)
        row.getCell(6).numFmt = '#,##0.00'
        row.getCell(6).alignment = { horizontal: "right", vertical: "middle" }
        row.getCell(7).value = num(r.montantNetDinars)
        row.getCell(7).numFmt = '#,##0.00'
        row.getCell(7).alignment = { horizontal: "right", vertical: "middle" }
        addDataCells(ws, row, 1, 7, false)
      })

      const totalRowIdx = headerRow + 1 + rows.length
      const totalRow = ws.getRow(totalRowIdx)
      totalRow.getCell(1).value = "TOTAL"
      totalRow.getCell(2).value = rows.reduce((s: number, r: any) => s + num(r.montantBrutDevise), 0)
      totalRow.getCell(2).numFmt = '#,##0.00'
      totalRow.getCell(2).alignment = { horizontal: "right", vertical: "middle" }
      totalRow.getCell(4).value = rows.reduce((s: number, r: any) => s + num(r.montantBrutDinars), 0)
      totalRow.getCell(4).numFmt = '#,##0.00'
      totalRow.getCell(4).alignment = { horizontal: "right", vertical: "middle" }
      totalRow.getCell(5).value = rows.reduce((s: number, r: any) => s + num(r.montantNetDevise), 0)
      totalRow.getCell(5).numFmt = '#,##0.00'
      totalRow.getCell(5).alignment = { horizontal: "right", vertical: "middle" }
      totalRow.getCell(6).value = rows.reduce((s: number, r: any) => s + num(r.montantIBS), 0)
      totalRow.getCell(6).numFmt = '#,##0.00'
      totalRow.getCell(6).alignment = { horizontal: "right", vertical: "middle" }
      totalRow.getCell(7).value = rows.reduce((s: number, r: any) => s + num(r.montantNetDinars), 0)
      totalRow.getCell(7).numFmt = '#,##0.00'
      totalRow.getCell(7).alignment = { horizontal: "right", vertical: "middle" }
      addDataCells(ws, totalRow, 1, 7, true)
      totalRow.height = 22
      break
    }

    case "taxe_domicil": {
      const ws = setupSheet("Taxe Domiciliation")
      const rows = decl.taxe15Rows ?? []

      ws.columns = [
        { key: "idx", width: 5 },
        { key: "numFacture", width: 18 },
        { key: "dateFacture", width: 14 },
        { key: "raisonSociale", width: 28 },
        { key: "montantNetDevise", width: 18 },
        { key: "monnaie", width: 10 },
        { key: "tauxChange", width: 14 },
        { key: "montantDinars", width: 18 },
        { key: "tauxTaxe", width: 10 },
        { key: "montantAPayer", width: 18 },
      ]

      await addLogo(workbook, ws)
      addHeaderSection(ws, "TAXE DOMICILIATION BANCAIRE", period, 10)

      const headerRow = 9
      addTableHeader(ws, [
        "#", "N° Facture", "Date Facture", "Raison Sociale",
        "Mont. Net Devise", "Monnaie", "Taux Change",
        "Mont. Dinars", "Taux Taxe", "Mont. A Payer",
      ], headerRow)

      rows.forEach((r: any, i: number) => {
        const row = ws.getRow(headerRow + 1 + i)
        row.getCell(1).value = i + 1
        row.getCell(1).alignment = { horizontal: "center", vertical: "middle" }
        row.getCell(2).value = r.numFacture
        row.getCell(3).value = r.dateFacture
        row.getCell(4).value = r.raisonSociale
        row.getCell(5).value = num(r.montantNetDevise)
        row.getCell(5).numFmt = '#,##0.00'
        row.getCell(5).alignment = { horizontal: "right", vertical: "middle" }
        row.getCell(6).value = r.monnaie
        row.getCell(7).value = r.tauxChange
        row.getCell(8).value = num(r.montantDinars)
        row.getCell(8).numFmt = '#,##0.00'
        row.getCell(8).alignment = { horizontal: "right", vertical: "middle" }
        row.getCell(9).value = r.tauxTaxe
        row.getCell(10).value = num(r.montantAPayer)
        row.getCell(10).numFmt = '#,##0.00'
        row.getCell(10).alignment = { horizontal: "right", vertical: "middle" }
        addDataCells(ws, row, 1, 10, false)
      })

      const totalRowIdx = headerRow + 1 + rows.length
      const totalRow = ws.getRow(totalRowIdx)
      totalRow.getCell(1).value = "TOTAL"
      ws.mergeCells(`A${totalRowIdx}:D${totalRowIdx}`)
      totalRow.getCell(5).value = rows.reduce((s: number, r: any) => s + num(r.montantNetDevise), 0)
      totalRow.getCell(5).numFmt = '#,##0.00'
      totalRow.getCell(5).alignment = { horizontal: "right", vertical: "middle" }
      totalRow.getCell(8).value = rows.reduce((s: number, r: any) => s + num(r.montantDinars), 0)
      totalRow.getCell(8).numFmt = '#,##0.00'
      totalRow.getCell(8).alignment = { horizontal: "right", vertical: "middle" }
      totalRow.getCell(10).value = rows.reduce((s: number, r: any) => s + num(r.montantAPayer), 0)
      totalRow.getCell(10).numFmt = '#,##0.00'
      totalRow.getCell(10).alignment = { horizontal: "right", vertical: "middle" }
      addDataCells(ws, totalRow, 1, 10, true)
      totalRow.height = 22
      break
    }

    case "tva_autoliq": {
      const ws = setupSheet("TVA Auto Liquidation")
      const rows = decl.tva16Rows ?? []
      const fournisseurNom = (fiscalFournisseurs ?? []).find((f) => String(f.id) === String(tva16FournisseurId ?? ""))?.raisonSociale ?? ""

      ws.columns = [
        { key: "idx", width: 5 },
        { key: "numFacture", width: 18 },
        { key: "montantBrutDevise", width: 20 },
        { key: "tauxChange", width: 14 },
        { key: "montantBrutDinars", width: 20 },
        { key: "tva19", width: 16 },
      ]

      await addLogo(workbook, ws)
      addHeaderSection(ws, "TVA AUTO LIQUIDATION", period, 6)

      if (fournisseurNom) {
        ws.mergeCells(`A8:F8`)
        ws.getCell(`A8`).value = `Fournisseur: ${fournisseurNom}`
        ws.getCell(`A8`).font = { size: 10, name: "Arial", italic: true }
        ws.getCell(`A8`).alignment = { horizontal: "right", vertical: "middle" }
      }

      const headerRow = 10
      addTableHeader(ws, [
        "#", "N° Facture", "Mont. Brut Devises",
        "Taux Change", "Mont. Brut Dinars", "TVA 19%",
      ], headerRow)

      rows.forEach((r: any, i: number) => {
        const row = ws.getRow(headerRow + 1 + i)
        row.getCell(1).value = i + 1
        row.getCell(1).alignment = { horizontal: "center", vertical: "middle" }
        row.getCell(2).value = r.numFacture
        row.getCell(3).value = num(r.montantBrutDevise)
        row.getCell(3).numFmt = '#,##0.00'
        row.getCell(3).alignment = { horizontal: "right", vertical: "middle" }
        row.getCell(4).value = r.tauxChange
        row.getCell(5).value = num(r.montantBrutDinars)
        row.getCell(5).numFmt = '#,##0.00'
        row.getCell(5).alignment = { horizontal: "right", vertical: "middle" }
        row.getCell(6).value = num(r.tva19)
        row.getCell(6).numFmt = '#,##0.00'
        row.getCell(6).alignment = { horizontal: "right", vertical: "middle" }
        addDataCells(ws, row, 1, 6, false)
      })

      const totalRowIdx = headerRow + 1 + rows.length
      const totalRow = ws.getRow(totalRowIdx)
      totalRow.getCell(1).value = "TOTAL"
      ws.mergeCells(`A${totalRowIdx}:B${totalRowIdx}`)
      totalRow.getCell(3).value = rows.reduce((s: number, r: any) => s + num(r.montantBrutDevise), 0)
      totalRow.getCell(3).numFmt = '#,##0.00'
      totalRow.getCell(3).alignment = { horizontal: "right", vertical: "middle" }
      totalRow.getCell(5).value = rows.reduce((s: number, r: any) => s + num(r.montantBrutDinars), 0)
      totalRow.getCell(5).numFmt = '#,##0.00'
      totalRow.getCell(5).alignment = { horizontal: "right", vertical: "middle" }
      totalRow.getCell(6).value = rows.reduce((s: number, r: any) => s + num(r.tva19), 0)
      totalRow.getCell(6).numFmt = '#,##0.00'
      totalRow.getCell(6).alignment = { horizontal: "right", vertical: "middle" }
      addDataCells(ws, totalRow, 1, 6, true)
      totalRow.height = 22
      break
    }

    case "tnfdal1": {
      const ws = setupSheet("TNFDAL 1%")
      const rows = decl.tnfdal1Rows ?? []

      ws.columns = [
        { key: "designation", width: 50 },
        { key: "caHt", width: 24 },
        { key: "taxe", width: 24 },
      ]

      await addLogo(workbook, ws)
      addHeaderSection(ws, "TNFDAL 1%", period, 3)

      const headerRow = 9
      addTableHeader(ws, ["DESIGNATION", "CHIFFRES D'AFFAIRES HT", "MONTANT DU TNFDAL 1%"], headerRow)

      rows.forEach((r: any, i: number) => {
        const row = ws.getRow(headerRow + 1 + i)
        row.getCell(1).value = r.designation || "-"
        row.getCell(2).value = num(r.caHt)
        row.getCell(2).numFmt = '#,##0.00'
        row.getCell(2).alignment = { horizontal: "right", vertical: "middle" }
        row.getCell(3).value = num(r.taxe)
        row.getCell(3).numFmt = '#,##0.00'
        row.getCell(3).alignment = { horizontal: "right", vertical: "middle" }
        addDataCells(ws, row, 1, 3, false)
      })
      break
    }

    case "tacp7": {
      const ws = setupSheet("TACP 7%")
      const rows = decl.tacp7Rows ?? []

      ws.columns = [
        { key: "designation", width: 50 },
        { key: "base", width: 24 },
        { key: "taxe", width: 24 },
      ]

      await addLogo(workbook, ws)
      addHeaderSection(ws, "TACP 7%", period, 3)

      const headerRow = 9
      addTableHeader(ws, ["DESIGNATION", "MONTANT DES RECHARGES HT", "MONTANT DU TACP 7%"], headerRow)

      rows.forEach((r: any, i: number) => {
        const row = ws.getRow(headerRow + 1 + i)
        row.getCell(1).value = r.designation || "-"
        row.getCell(2).value = num(r.base)
        row.getCell(2).numFmt = '#,##0.00'
        row.getCell(2).alignment = { horizontal: "right", vertical: "middle" }
        row.getCell(3).value = num(r.taxe)
        row.getCell(3).numFmt = '#,##0.00'
        row.getCell(3).alignment = { horizontal: "right", vertical: "middle" }
        addDataCells(ws, row, 1, 3, false)
      })
      break
    }

    default:
      return
  }

  const sheet = workbook.getWorksheet(1)
  if (sheet) {
    sheet.pageSetup.printArea = `A1:${sheet.getColumn(sheet.columnCount).letter}${sheet.rowCount}`
  }

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${title.toLowerCase().replace(/\s+/g, "_")}_${period.replace(/\s+/g, "_")}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}

export async function exportRecapToExcel(
  recap: { title: string; mois: string; annee: string; rows: Record<string, string>[] },
  columns: { key: string; label: string; right?: boolean }[],
) {
  const ExcelJS = (await import("exceljs")).default
  const workbook = new ExcelJS.Workbook()
  workbook.creator = "DFC Portal"
  workbook.created = new Date()

  const period = `${MONTHS[recap.mois] || recap.mois} ${recap.annee}`
  const orderedColumns = columns.map((c) => c.key)
  const colCount = columns.length

  const ws = workbook.addWorksheet("Recap", {
    pageSetup: {
      orientation: "landscape",
      paperSize: 9,
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.3, right: 0.3, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 },
    },
  })

  ws.columns = columns.map(() => ({ width: 28 }))

  await addLogo(workbook, ws)
  addHeaderSection(ws, recap.title, period, colCount)

  const headerRow = 9
  addTableHeader(ws, columns.map((c) => c.label), headerRow)

  const rows = recap.rows ?? []
  rows.forEach((row, i) => {
    const r = ws.getRow(headerRow + 1 + i)
    orderedColumns.forEach((colKey, j) => {
      const cell = r.getCell(j + 1)
      const val = String(row[colKey] ?? "")
      const isNumeric = /^-?\d+(?:[ ,]\d{3})*(?:[.,]\d+)?$/.test(val.trim())
      if (isNumeric) {
        cell.value = parseFloat(val.replace(/\s/g, "").replace(/,/g, ".")) || 0
        cell.numFmt = '#,##0.00'
        cell.alignment = { horizontal: "right", vertical: "middle" }
      } else {
        cell.value = val
        cell.alignment = { horizontal: columns[j]?.right ? "right" : "left", vertical: "middle" }
      }
    })
    addDataCells(ws, r, 1, colCount, false)
  })

  ws.pageSetup.printArea = `A1:${ws.getColumn(colCount).letter}${ws.rowCount}`

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${recap.title.toLowerCase().replace(/\s+/g, "_")}_${period.replace(/\s+/g, "_")}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}

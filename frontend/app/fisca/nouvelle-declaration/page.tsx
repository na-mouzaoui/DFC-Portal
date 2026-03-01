"use client"

import { useState, useCallback, useMemo, useRef, useEffect } from "react"
import { LayoutWrapper } from "@/components/layout-wrapper"
import { useAuth } from "@/hooks/use-auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { Plus, Trash2, Save } from "lucide-react"

// primary colour used by all tables/buttons
const PRIMARY_COLOR = "#2db34b"

// ─────────────────────────────────────────────────────────────────────────────
// ALGERIA WILAYAS (58 wilayas) with their numeric codes
// ─────────────────────────────────────────────────────────────────────────────
const WILAYAS: { code: string; name: string; communes: string[] }[] = [
  { code: "01", name: "Adrar",               communes: ["Adrar", "Reggane", "Timimoun"] },
  { code: "02", name: "Chlef",               communes: ["Chlef", "Ténès", "Boukadir"] },
  { code: "03", name: "Laghouat",            communes: ["Laghouat", "Aflou", "Hassi R'Mel"] },
  { code: "04", name: "Oum El Bouaghi",      communes: ["Oum El Bouaghi", "Aïn Beïda", "Aïn M'lila"] },
  { code: "05", name: "Batna",               communes: ["Batna", "Barika", "Arris"] },
  { code: "06", name: "Béjaïa",              communes: ["Béjaïa", "Akbou", "Souk El Tenine"] },
  { code: "07", name: "Biskra",              communes: ["Biskra", "Tolga", "Ouled Djellal"] },
  { code: "08", name: "Béchar",              communes: ["Béchar", "Abadla", "Kenadsa"] },
  { code: "09", name: "Blida",               communes: ["Blida", "Boufarik", "Larbaa"] },
  { code: "10", name: "Bouira",              communes: ["Bouira", "Lakhdaria", "Sour El Ghozlane"] },
  { code: "11", name: "Tamanrasset",         communes: ["Tamanrasset", "In Salah", "In Guezzam"] },
  { code: "12", name: "Tébessa",             communes: ["Tébessa", "Bir El Ater", "Cheria"] },
  { code: "13", name: "Tlemcen",             communes: ["Tlemcen", "Maghnia", "Ghazaouet"] },
  { code: "14", name: "Tiaret",              communes: ["Tiaret", "Frenda", "Ksar Chellala"] },
  { code: "15", name: "Tizi Ouzou",          communes: ["Tizi Ouzou", "Azazga", "Tigzirt"] },
  { code: "16", name: "Alger",               communes: ["Alger Centre", "Bab El Oued", "Hussein Dey", "El Harrach", "Kouba"] },
  { code: "17", name: "Djelfa",              communes: ["Djelfa", "Messaad", "Ain Oussera"] },
  { code: "18", name: "Jijel",               communes: ["Jijel", "El Milia", "Taher"] },
  { code: "19", name: "Sétif",               communes: ["Sétif", "El Eulma", "Aïn Azel"] },
  { code: "20", name: "Saïda",               communes: ["Saïda", "Aïn El Hadjar", "Ouled Brahim"] },
  { code: "21", name: "Skikda",              communes: ["Skikda", "Collo", "El Harrouch"] },
  { code: "22", name: "Sidi Bel Abbès",      communes: ["Sidi Bel Abbès", "Mascara", "Telagh"] },
  { code: "23", name: "Annaba",              communes: ["Annaba", "El Hadjar", "Berrahal"] },
  { code: "24", name: "Guelma",              communes: ["Guelma", "Bouchegouf", "Heliopolis"] },
  { code: "25", name: "Constantine",         communes: ["Constantine", "El Khroub", "Aïn Smara"] },
  { code: "26", name: "Médéa",               communes: ["Médéa", "Berrouaghia", "Ksar El Boukhari"] },
  { code: "27", name: "Mostaganem",          communes: ["Mostaganem", "Aïn Tedles", "Sidi Ali"] },
  { code: "28", name: "M'Sila",              communes: ["M'Sila", "Boussaâda", "Sidi Aïssa"] },
  { code: "29", name: "Mascara",             communes: ["Mascara", "Sig", "Tighennif"] },
  { code: "30", name: "Ouargla",             communes: ["Ouargla", "Hassi Messaoud", "Touggourt"] },
  { code: "31", name: "Oran",                communes: ["Oran", "Es Sénia", "Bir El Djir", "Aïn Turk"] },
  { code: "32", name: "El Bayadh",           communes: ["El Bayadh", "Brezina", "Rogassa"] },
  { code: "33", name: "Illizi",              communes: ["Illizi", "Djanet", "In Amenas"] },
  { code: "34", name: "Bordj Bou Arreridj",  communes: ["Bordj Bou Arreridj", "Ras El Oued", "Bir Kasdali"] },
  { code: "35", name: "Boumerdès",           communes: ["Boumerdès", "Dellys", "Khemis El Khechna"] },
  { code: "36", name: "El Tarf",             communes: ["El Tarf", "Ben Mehidi", "Besbes"] },
  { code: "37", name: "Tindouf",             communes: ["Tindouf"] },
  { code: "38", name: "Tissemsilt",          communes: ["Tissemsilt", "Bordj Bounaama", "Theniet El Had"] },
  { code: "39", name: "El Oued",             communes: ["El Oued", "Guemar", "Bayadha"] },
  { code: "40", name: "Khenchela",           communes: ["Khenchela", "Aïn Touila", "Baghaï"] },
  { code: "41", name: "Souk Ahras",          communes: ["Souk Ahras", "Sedrata", "Taoura"] },
  { code: "42", name: "Tipaza",              communes: ["Tipaza", "Cherchell", "Koléa"] },
  { code: "43", name: "Mila",                communes: ["Mila", "Chelghoum Laïd", "Ferdjioua"] },
  { code: "44", name: "Aïn Defla",           communes: ["Aïn Defla", "Khemis Miliana", "El Abadia"] },
  { code: "45", name: "Naâma",               communes: ["Naâma", "Méchéria", "Aïn Sefra"] },
  { code: "46", name: "Aïn Témouchent",      communes: ["Aïn Témouchent", "Beni Saf", "Hammam Bouhadjar"] },
  { code: "47", name: "Ghardaïa",            communes: ["Ghardaïa", "Guerrara", "El Meniaa"] },
  { code: "48", name: "Relizane",            communes: ["Relizane", "Mazouna", "Oued Rhiou"] },
  { code: "49", name: "Timimoun",            communes: ["Timimoun", "Charouine"] },
  { code: "50", name: "Bordj Badji Mokhtar", communes: ["Bordj Badji Mokhtar"] },
  { code: "51", name: "Ouled Djellal",        communes: ["Ouled Djellal", "Sidi Khaled"] },
  { code: "52", name: "Béni Abbès",           communes: ["Béni Abbès"] },
  { code: "53", name: "In Salah",             communes: ["In Salah", "In Ghar"] },
  { code: "54", name: "In Guezzam",           communes: ["In Guezzam", "Tin Zaouatine"] },
  { code: "55", name: "Touggourt",            communes: ["Touggourt", "Nezla"] },
  { code: "56", name: "Djanet",               communes: ["Djanet"] },
  { code: "57", name: "El M'Ghair",           communes: ["El M'Ghair", "Djamaa"] },
  { code: "58", name: "El Meniaa",            communes: ["El Meniaa"] },
]

// ─────────────────────────────────────────────────────────────────────────────


// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const fmt = (v: number | string) =>
  isNaN(Number(v)) || v === "" ? "" : Number(v).toLocaleString("fr-DZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const num = (v: string) => parseFloat(v) || 0

// ─────────────────────────────────────────────────────────────────────────────
// TAB 1 – ENCAISSEMENT  (controlled)
// Encaissement HT = TTC / 1.19   |   TVA = TTC − HT
// ─────────────────────────────────────────────────────────────────────────────
type EncRow = { designation: string; ttc: string }

interface Tab1Props { rows: EncRow[]; setRows: React.Dispatch<React.SetStateAction<EncRow[]>>
  onSave: () => void;
  isSubmitting: boolean;
}

function TabEncaissement({ rows, setRows, onSave, isSubmitting }: Tab1Props) {
  const addRow    = () => setRows((p) => [...p, { designation: "", ttc: "" }])
  const removeRow = (i: number) => setRows((p) => p.filter((_, idx) => idx !== i))
  const update    = (i: number, field: keyof EncRow, val: string) =>
    setRows((p) => p.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)))

  const totals = useMemo(() => {
    const ttc = rows.reduce((s, r) => s + num(r.ttc), 0)
    const ht  = ttc / 1.19
    return { ttc, ht, tva: ttc - ht }
  }, [rows])

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-2 py-2 text-center text-xs font-semibold text-gray-400 border-b w-8">#</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">Désignation</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">Encaissement TTC</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">TVA</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">Encaissement HT</th>
              <th className="px-2 py-2 border-b w-8" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const ht = num(row.ttc) / 1.19
              const tva = num(row.ttc) - ht
              return (
                <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className="px-2 py-1 text-center text-xs text-gray-400 border-b">{i + 1}</td>
                  <td className="px-1 py-1 border-b">
                    <Input value={row.designation} onChange={(e) => update(i, "designation", e.target.value)}
                      className="h-7 px-2 text-xs" placeholder="Désignation" style={{ minWidth: 200 }} />
                  </td>
                  <td className="px-1 py-1 border-b">
                    <Input type="number" min={0} step="0.01" value={row.ttc}
                      onChange={(e) => update(i, "ttc", e.target.value)}
                      className="h-7 px-2 text-xs" placeholder="0.00" style={{ minWidth: 130 }} />
                  </td>
                  <td className="px-3 py-1 border-b text-xs text-gray-700 font-semibold bg-gray-50/50">
                    {row.ttc ? fmt(tva) : "—"}
                  </td>
                  <td className="px-3 py-1 border-b text-xs text-gray-700 font-semibold bg-gray-50/50">
                    {row.ttc ? fmt(ht) : "—"}
                  </td>
                  <td className="px-2 py-1 text-center border-b">
                    <button type="button" onClick={() => removeRow(i)} disabled={rows.length === 1}
                      className="text-red-400 hover:text-red-600 disabled:opacity-30"><Trash2 size={13} /></button>
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="bg-green-100 font-semibold">
              <td colSpan={2} className="px-3 py-2 text-xs text-right border-t">TOTAL</td>
              <td className="px-3 py-2 text-xs border-t">{fmt(totals.ttc)}</td>
              <td className="px-3 py-2 text-xs text-gray-700 border-t">{fmt(totals.tva)}</td>
              <td className="px-3 py-2 text-xs text-gray-700 border-t">{fmt(totals.ht)}</td>
              <td className="border-t" />
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="flex justify-between items-center">
        <Button type="button" variant="outline" size="sm" onClick={addRow}
          className="gap-1.5 text-xs border-green-500 text-green-600 hover:bg-green-50">
          <Plus size={13} /> Ajouter une ligne
        </Button>
        <Button size="sm" onClick={onSave} disabled={isSubmitting}
          className="gap-1.5" style={{ backgroundColor: PRIMARY_COLOR, color: "white" }}>
          <Save size={13} /> {isSubmitting ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 2 & 3 – TVA/IMMO  and  TVA/BIENS & SERV (controlled, same structure)
// ─────────────────────────────────────────────────────────────────────────────
type TvaRow = {
  nomRaisonSociale: string; idFiscal: string; adresse: string; numRC: string
  dateFacture: string; refFacture: string; montantHT: string; tvaDeductible: string; nature: string
}
const EMPTY_TVA: TvaRow = {
  nomRaisonSociale: "", idFiscal: "", adresse: "", numRC: "",
  dateFacture: "", refFacture: "", montantHT: "", tvaDeductible: "", nature: "",
}

interface Tab23Props { rows: TvaRow[]; setRows: React.Dispatch<React.SetStateAction<TvaRow[]>>;
  onSave: () => void;
  isSubmitting: boolean;
}

function TabTVAEtat({ rows, setRows, onSave, isSubmitting }: Tab23Props) {
  const addRow    = () => setRows((p) => [...p, { ...EMPTY_TVA }])
  const removeRow = (i: number) => setRows((p) => p.filter((_, idx) => idx !== i))
  const update    = (i: number, field: keyof TvaRow, val: string) =>
    setRows((p) => p.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)))

  const totalHT  = rows.reduce((s, r) => s + num(r.montantHT), 0)
  const totalTVA = rows.reduce((s, r) => s + num(r.tvaDeductible), 0)

  const headers = [
    "Nom / Raison Sociale", "ID Fiscal", "Adresse", "N° RC / Agrément",
    "Date Facture", "Réf. Facture", "Montant Op. HT", "TVA Déductible",
    "Nature de l'opération",
  ]

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-2 py-2 text-center text-xs font-semibold text-gray-400 border-b w-8">#</th>
              {headers.map((h) => (
                <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b whitespace-nowrap">{h}</th>
              ))}
              <th className="px-2 py-2 border-b w-8" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                <td className="px-2 py-1 text-center text-xs text-gray-400 border-b">{i + 1}</td>
                <td className="px-1 py-1 border-b"><Input value={row.nomRaisonSociale} onChange={(e) => update(i, "nomRaisonSociale", e.target.value)} className="h-7 px-2 text-xs" style={{ minWidth: 160 }} placeholder="Nom / Raison sociale" /></td>
                <td className="px-1 py-1 border-b"><Input value={row.idFiscal} onChange={(e) => update(i, "idFiscal", e.target.value)} className="h-7 px-2 text-xs" style={{ minWidth: 110 }} placeholder="ID Fiscal" /></td>
                <td className="px-1 py-1 border-b"><Input value={row.adresse} onChange={(e) => update(i, "adresse", e.target.value)} className="h-7 px-2 text-xs" style={{ minWidth: 150 }} placeholder="Adresse" /></td>
                <td className="px-1 py-1 border-b"><Input value={row.numRC} onChange={(e) => update(i, "numRC", e.target.value)} className="h-7 px-2 text-xs" style={{ minWidth: 120 }} placeholder="N° RC / Agrément" /></td>
                <td className="px-1 py-1 border-b"><Input type="date" value={row.dateFacture} onChange={(e) => update(i, "dateFacture", e.target.value)} className="h-7 px-2 text-xs" style={{ minWidth: 130 }} /></td>
                <td className="px-1 py-1 border-b"><Input value={row.refFacture} onChange={(e) => update(i, "refFacture", e.target.value)} className="h-7 px-2 text-xs" style={{ minWidth: 110 }} placeholder="Référence" /></td>
                <td className="px-1 py-1 border-b"><Input type="number" min={0} step="0.01" value={row.montantHT} onChange={(e) => update(i, "montantHT", e.target.value)} className="h-7 px-2 text-xs" style={{ minWidth: 120 }} placeholder="0.00" /></td>
                <td className="px-1 py-1 border-b"><Input type="number" min={0} step="0.01" value={row.tvaDeductible} onChange={(e) => update(i, "tvaDeductible", e.target.value)} className="h-7 px-2 text-xs" style={{ minWidth: 120 }} placeholder="0.00" /></td>
                <td className="px-1 py-1 border-b">
                  <select value={row.nature} onChange={(e) => update(i, "nature", e.target.value)}
                    className="h-7 rounded border border-gray-200 px-2 text-xs focus:outline-none focus:ring-1" style={{ minWidth: 160 }}>
                    <option value="">— Choisir —</option>
                    <option value="bien_amortissable">Bien amortissable</option>
                    <option value="autre">Autre</option>
                  </select>
                </td>
                <td className="px-2 py-1 text-center border-b">
                  <button type="button" onClick={() => removeRow(i)} disabled={rows.length === 1}
                    className="text-red-400 hover:text-red-600 disabled:opacity-30"><Trash2 size={13} /></button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-green-100 font-semibold">
              <td colSpan={7} className="px-3 py-2 text-xs text-right border-t">TOTAL</td>
              <td className="px-3 py-2 text-xs border-t">{fmt(totalHT)}</td>
              <td className="px-3 py-2 text-xs border-t">{fmt(totalTVA)}</td>
              <td colSpan={2} className="border-t" />
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="flex justify-between items-center">
        <Button type="button" variant="outline" size="sm" onClick={addRow}
          className="gap-1.5 text-xs border-green-500 text-green-600 hover:bg-green-50">
          <Plus size={13} /> Ajouter une ligne
        </Button>
        <Button size="sm" onClick={onSave} disabled={isSubmitting}
          className="gap-1.5" style={{ backgroundColor: PRIMARY_COLOR, color: "white" }}>
          <Save size={13} /> {isSubmitting ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 4 – ETAT DROITS TIMBRE (controlled)
// ─────────────────────────────────────────────────────────────────────────────
type TimbreRow = { designation: string; caTTCEsp: string; droitTimbre: string }

interface Tab4Props { rows: TimbreRow[]; setRows: React.Dispatch<React.SetStateAction<TimbreRow[]>>;
  onSave: () => void;
  isSubmitting: boolean;
}

function TabDroitsTimbre({ rows, setRows, onSave, isSubmitting }: Tab4Props) {
  const addRow    = () => setRows((p) => [...p, { designation: "", caTTCEsp: "", droitTimbre: "" }])
  const removeRow = (i: number) => setRows((p) => p.filter((_, idx) => idx !== i))
  const update    = (i: number, field: keyof TimbreRow, val: string) =>
    setRows((p) => p.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)))

  const totalCA    = rows.reduce((s, r) => s + num(r.caTTCEsp), 0)
  const totalDroit = rows.reduce((s, r) => s + num(r.droitTimbre), 0)

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-2 py-2 text-center text-xs font-semibold text-gray-400 border-b w-8">#</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">Désignation</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">Chiffres d'affaires TTC Esp.</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">Droit de Timbre</th>
              <th className="px-2 py-2 border-b w-8" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                <td className="px-2 py-1 text-center text-xs text-gray-400 border-b">{i + 1}</td>
                <td className="px-1 py-1 border-b"><Input value={row.designation} onChange={(e) => update(i, "designation", e.target.value)} className="h-7 px-2 text-xs" style={{ minWidth: 220 }} placeholder="Désignation" /></td>
                <td className="px-1 py-1 border-b"><Input type="number" min={0} step="0.01" value={row.caTTCEsp} onChange={(e) => update(i, "caTTCEsp", e.target.value)} className="h-7 px-2 text-xs" style={{ minWidth: 150 }} placeholder="0.00" /></td>
                <td className="px-1 py-1 border-b"><Input type="number" min={0} step="0.01" value={row.droitTimbre} onChange={(e) => update(i, "droitTimbre", e.target.value)} className="h-7 px-2 text-xs" style={{ minWidth: 140 }} placeholder="0.00" /></td>
                <td className="px-2 py-1 text-center border-b">
                  <button type="button" onClick={() => removeRow(i)} disabled={rows.length === 1}
                    className="text-red-400 hover:text-red-600 disabled:opacity-30"><Trash2 size={13} /></button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-green-100 font-semibold">
              <td colSpan={2} className="px-3 py-2 text-xs text-right border-t">TOTAL</td>
              <td className="px-3 py-2 text-xs border-t">{fmt(totalCA)}</td>
              <td className="px-3 py-2 text-xs border-t">{fmt(totalDroit)}</td>
              <td className="border-t" />
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="flex justify-between items-center">
        <Button type="button" variant="outline" size="sm" onClick={addRow}
          className="gap-1.5 text-xs border-green-500 text-green-600 hover:bg-green-50">
          <Plus size={13} /> Ajouter une ligne
        </Button>
        <Button size="sm" onClick={onSave} disabled={isSubmitting}
          className="gap-1.5" style={{ backgroundColor: PRIMARY_COLOR, color: "white" }}>
          <Save size={13} /> {isSubmitting ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 5 – CA 7% & CA GLOB 1% (controlled)
// B12 = CA HT soumis à 7% (saisie)  →  C12 = B12 × 7%
// B13 = CA HT global soumis à 1%    →  C13 = B13 × 1%
// ─────────────────────────────────────────────────────────────────────────────
interface Tab5Props { b12: string; setB12: (v: string) => void; b13: string; setB13: (v: string) => void;
  onSave: () => void;
  isSubmitting: boolean;
}

function TabCA({ b12, setB12, b13, setB13, onSave, isSubmitting }: Tab5Props) {
  const c12 = num(b12) * 0.07
  const c13 = num(b13) * 0.01

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">Désignation</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">
                Chiffre d'affaires HT
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">
                Montant Taxe à verser
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="bg-white">
              <td className="px-3 py-2 border-b text-xs font-medium text-gray-800">Chiffre d'affaires soumis à 7%</td>
              <td className="px-1 py-1 border-b">
                <Input type="number" min={0} step="0.01" value={b12} onChange={(e) => setB12(e.target.value)}
                  className="h-7 px-2 text-xs" placeholder="B12 – Saisir" style={{ minWidth: 160 }} />
              </td>
              <td className="px-3 py-1 border-b text-xs text-gray-700 font-semibold bg-gray-50/50">
                {b12 ? fmt(c12) : "—"}
              </td>
            </tr>
            <tr className="bg-gray-50">
              <td className="px-3 py-2 border-b text-xs font-medium text-gray-800">Chiffre d'affaires global soumis à 1%</td>
              <td className="px-1 py-1 border-b">
                <Input type="number" min={0} step="0.01" value={b13} onChange={(e) => setB13(e.target.value)}
                  className="h-7 px-2 text-xs" placeholder="B13 – Saisir" style={{ minWidth: 160 }} />
              </td>
              <td className="px-3 py-1 border-b text-xs text-gray-700 font-semibold bg-gray-50/50">
                {b13 ? fmt(c13) : "—"}
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr className="bg-green-100 font-semibold">
              <td className="px-3 py-2 text-xs text-right border-t">TOTAL</td>
              <td className="px-3 py-2 text-xs border-t">{fmt(num(b12) + num(b13))}</td>
              <td className="px-3 py-2 text-xs text-gray-700 border-t">{fmt(c12 + c13)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="flex justify-end">
        <Button size="sm" onClick={onSave} disabled={isSubmitting}
          className="gap-1.5" style={{ backgroundColor: PRIMARY_COLOR, color: "white" }}>
          <Save size={13} /> {isSubmitting ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 6 – ETAT TAP (controlled)
// Période : mois + année (page-level)
// Tableau : Code (auto), Wilaya (dropdown), Commune (dropdown), TAP 2% (saisie)
// MONTANT TAP = Total(TAP 2%)
// ─────────────────────────────────────────────────────────────────────────────
type TAPRow = { wilayaCode: string; commune: string; tap2: string }

const MONTHS = [
  { value: "01", label: "Janvier" },   { value: "02", label: "Février" },
  { value: "03", label: "Mars" },      { value: "04", label: "Avril" },
  { value: "05", label: "Mai" },       { value: "06", label: "Juin" },
  { value: "07", label: "Juillet" },   { value: "08", label: "Août" },
  { value: "09", label: "Septembre" }, { value: "10", label: "Octobre" },
  { value: "11", label: "Novembre" },  { value: "12", label: "Décembre" },
]
const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: 10 }, (_, i) => (CURRENT_YEAR - 5 + i).toString())
interface Tab6Props {
  rows: TAPRow[]; setRows: React.Dispatch<React.SetStateAction<TAPRow[]>>
  mois: string; setMois: (v: string) => void
  annee: string; setAnnee: (v: string) => void
  onSave: () => void;
  isSubmitting: boolean;
}

function TabTAP({ rows, setRows, mois, setMois, annee, setAnnee, onSave, isSubmitting }: Tab6Props) {
  const addRow    = () => setRows((p) => [...p, { wilayaCode: "", commune: "", tap2: "" }])
  const removeRow = (i: number) => setRows((p) => p.filter((_, idx) => idx !== i))
  const updateRow = useCallback((i: number, field: keyof TAPRow, val: string) =>
    setRows((p) => p.map((r, idx) => (idx === i ? { ...r, [field]: val } : r))), [setRows])

  const totalTAP = rows.reduce((s, r) => s + num(r.tap2), 0)
  const getWilaya = (code: string) => WILAYAS.find((w) => w.code === code)

  return (
    <div className="space-y-5">
      {/* Période */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm font-semibold text-gray-700">Période :</span>
        <div className="flex items-center gap-1.5">
          <label className="text-xs text-gray-500">Mois</label>
          <select value={mois} onChange={(e) => setMois(e.target.value)}
            className="rounded border border-gray-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-red-300">
            {MONTHS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-1.5">
          <label className="text-xs text-gray-500">Année</label>
          <select value={annee} onChange={(e) => setAnnee(e.target.value)}
            className="rounded border border-gray-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-red-300">
            {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <span className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 px-2 py-1 rounded">
          {MONTHS.find((m) => m.value === mois)?.label} {annee}
        </span>
      </div>

      {/* Tableau */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-2 py-2 text-center text-xs font-semibold text-gray-400 border-b w-8">#</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">Code Wilaya</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">Wilaya</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">Commune</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">TAP 2%</th>
              <th className="px-2 py-2 border-b w-8" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const wilaya = getWilaya(row.wilayaCode)
              return (
                <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className="px-2 py-1 text-center text-xs text-gray-400 border-b">{i + 1}</td>

                  {/* Code – automatique depuis wilaya */}
                  <td className="px-3 py-1 border-b">
                    <span className="font-mono text-xs font-bold text-red-700 bg-red-50 border border-red-100 px-2 py-0.5 rounded">
                      {row.wilayaCode || "—"}
                    </span>
                  </td>

                  {/* Wilaya dropdown */}
                  <td className="px-1 py-1 border-b">
                    <select value={row.wilayaCode}
                      onChange={(e) => { updateRow(i, "wilayaCode", e.target.value); updateRow(i, "commune", "") }}
                      className="h-7 rounded border border-gray-200 px-2 text-xs focus:outline-none focus:ring-1 focus:ring-red-300"
                      style={{ minWidth: 190 }}>
                      <option value="">— Wilaya —</option>
                      {WILAYAS.map((w) => (
                        <option key={w.code} value={w.code}>{w.code} – {w.name}</option>
                      ))}
                    </select>
                  </td>

                  {/* Commune dropdown – dépend de la wilaya sélectionnée */}
                  <td className="px-1 py-1 border-b">
                    <select value={row.commune} onChange={(e) => updateRow(i, "commune", e.target.value)}
                      disabled={!row.wilayaCode}
                      className="h-7 rounded border border-gray-200 px-2 text-xs focus:outline-none focus:ring-1 focus:ring-red-300 disabled:opacity-40"
                      style={{ minWidth: 165 }}>
                      <option value="">— Commune —</option>
                      {(wilaya?.communes ?? []).map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </td>

                  {/* TAP 2% */}
                  <td className="px-1 py-1 border-b">
                    <Input type="number" min={0} step="0.01" value={row.tap2}
                      onChange={(e) => updateRow(i, "tap2", e.target.value)}
                      className="h-7 px-2 text-xs" placeholder="0.00" style={{ minWidth: 130 }} />
                  </td>

                  <td className="px-2 py-1 text-center border-b">
                    <button type="button" onClick={() => removeRow(i)} disabled={rows.length === 1}
                      className="text-red-400 hover:text-red-600 disabled:opacity-30"><Trash2 size={13} /></button>
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="bg-green-100 font-semibold">
              <td colSpan={4} className="px-3 py-2 text-xs text-right border-t">MONTANT TAP</td>
              <td className="px-3 py-2 text-sm font-bold text-green-700 border-t">{fmt(totalTAP)} DZD</td>
              <td className="border-t" />
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="flex justify-between items-center">
        <Button type="button" variant="outline" size="sm" onClick={addRow}
          className="gap-1.5 text-xs border-green-500 text-green-600 hover:bg-green-50">
          <Plus size={13} /> Ajouter une ligne
        </Button>
        <Button size="sm" onClick={onSave} disabled={isSubmitting}
          className="gap-1.5" style={{ backgroundColor: PRIMARY_COLOR, color: "white" }}>
          <Save size={13} /> {isSubmitting ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB CONFIG
// ─────────────────────────────────────────────────────────────────────────────
const TABS = [
  { key: "encaissement",  label: "Encaissement",       color: "#2db34b", title: "ENCAISSEMENT" },
  { key: "tva_immo",      label: "TVA / IMMO",         color: "#1d6fb8", title: "ÉTAT TVA / IMMOBILISATIONS" },
  { key: "tva_biens",     label: "TVA / Biens & Serv", color: "#7c3aed", title: "ÉTAT TVA / BIENS & SERVICES" },
  { key: "droits_timbre", label: "Droits Timbre",      color: "#0891b2", title: "ÉTAT DROITS DE TIMBRE" },
  { key: "ca_tap",        label: "CA 7% & CA Glob 1%", color: "#ea580c", title: "CA 7% & CA GLOBAL 1%" },
  { key: "etat_tap",      label: "ETAT TAP",           color: "#be123c", title: "ÉTAT TAP" },
]

// ─────────────────────────────────────────────────────────────────────────────
// PRINT ZONE – hidden on screen, visible only when printing
// Renders a static read-only A4 landscape version of the active tab's data
// ─────────────────────────────────────────────────────────────────────────────
interface PrintZoneProps {
  activeTab: string
  direction: string
  mois: string
  annee: string
  encRows: EncRow[]
  tvaImmoRows: TvaRow[]
  tvaBiensRows: TvaRow[]
  timbreRows: TimbreRow[]
  b12: string; b13: string
  tapRows: TAPRow[]
}

function PrintZone({ activeTab, direction, mois, annee, encRows, tvaImmoRows, tvaBiensRows, timbreRows, b12, b13, tapRows }: PrintZoneProps) {
  const tab  = TABS.find((t) => t.key === activeTab)!
  const mon  = MONTHS.find((m) => m.value === mois)?.label ?? mois
  const c12  = num(b12) * 0.07
  const c13  = num(b13) * 0.01

  const thStyle: React.CSSProperties = {
    border: "1px solid #000", padding: "4px 6px", backgroundColor: "#ddd", color: "#000",
    fontSize: 9, fontWeight: 700, textAlign: "left", whiteSpace: "nowrap",
  }
  const tdStyle: React.CSSProperties = {
    border: "1px solid #000", padding: "3px 6px", fontSize: 9, backgroundColor: "#fff", color: "#000",
  }

  return (
    <div id="print-zone" style={{ display: "none" }}>
      {/* ── PDF header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, borderBottom: "2px solid #333", paddingBottom: 8 }}>
        {/* LEFT – période */}
        <div style={{ minWidth: 180 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#333" }}>Période</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#000", marginTop: 2 }}>{mon} {annee}</div>
        </div>

        {/* CENTER – title */}
        <div style={{ flex: 1, textAlign: "center" }}>
          <div style={{ fontSize: 17, fontWeight: 900, letterSpacing: 1, textTransform: "uppercase", color: "#000" }}>{tab.title}</div>
          <div style={{ fontSize: 9, color: "#666", marginTop: 2 }}>Déclaration Fiscale</div>
        </div>

        {/* RIGHT – logo + direction */}
        <div style={{ minWidth: 200, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Logo" style={{ height: 40, objectFit: "contain" }} />
          {direction && (
            <div style={{ fontSize: 10, fontWeight: 700, color: "#333", textAlign: "right" }}>{direction}</div>
          )}
        </div>
      </div>

      {/* ── Table content per tab ── */}
      {activeTab === "encaissement" && (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>
            <th style={thStyle}>#</th>
            <th style={thStyle}>Désignation</th>
            <th style={thStyle}>Encaissement TTC</th>
            <th style={thStyle}>TVA</th>
            <th style={thStyle}>Encaissement HT</th>
          </tr></thead>
          <tbody>
            {encRows.map((r, i) => {
              const ht = num(r.ttc) / 1.19; const tva = num(r.ttc) - ht
              return <tr key={i} style={{ background: "#fff", color: "#000" }}>
                <td style={{ ...tdStyle, textAlign: "center", backgroundColor: "#fff", color: "#000" }}>{i + 1}</td>
                <td style={{ ...tdStyle, backgroundColor: "#fff", color: "#000" }}>{r.designation}</td>
                <td style={{ ...tdStyle, textAlign: "right", backgroundColor: "#fff", color: "#000" }}>{r.ttc ? fmt(num(r.ttc)) : ""}</td>
                <td style={{ ...tdStyle, textAlign: "right", backgroundColor: "#fff", color: "#000" }}>{r.ttc ? fmt(tva) : ""}</td>
                <td style={{ ...tdStyle, textAlign: "right", backgroundColor: "#fff", color: "#000" }}>{r.ttc ? fmt(ht) : ""}</td>
              </tr>
            })}
          </tbody>
          <tfoot><tr style={{ background: "#ddd", fontWeight: 700, color: "#000" }}>
            <td colSpan={2} style={{ ...tdStyle, textAlign: "right", backgroundColor: "#ddd", color: "#000" }}>TOTAL</td>
            <td style={{ ...tdStyle, textAlign: "right", backgroundColor: "#ddd", color: "#000" }}>{fmt(encRows.reduce((s,r) => s+num(r.ttc),0))}</td>
            <td style={{ ...tdStyle, textAlign: "right", backgroundColor: "#ddd", color: "#000" }}>{fmt(encRows.reduce((s,r) => { const t=num(r.ttc); return s+t-t/1.19 },0))}</td>
            <td style={{ ...tdStyle, textAlign: "right", backgroundColor: "#ddd", color: "#000" }}>{fmt(encRows.reduce((s,r) => s+num(r.ttc)/1.19,0))}</td>
          </tr></tfoot>
        </table>
      )}

      {(activeTab === "tva_immo" || activeTab === "tva_biens") && (() => {
        const rows = activeTab === "tva_immo" ? tvaImmoRows : tvaBiensRows
        return (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              {["#","Nom / Raison Sociale","ID Fiscal","Adresse","N° RC","Date Fact.","Réf.","Montant HT","TVA Déd.","Nature"].map((h) => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} style={{ background: "#fff", color: "#000" }}>
                  <td style={{ ...tdStyle, textAlign: "center", backgroundColor: "#fff", color: "#000" }}>{i+1}</td>
                  <td style={{ ...tdStyle, backgroundColor: "#fff", color: "#000" }}>{r.nomRaisonSociale}</td>
                  <td style={{ ...tdStyle, backgroundColor: "#fff", color: "#000" }}>{r.idFiscal}</td>
                  <td style={{ ...tdStyle, backgroundColor: "#fff", color: "#000" }}>{r.adresse}</td>
                  <td style={{ ...tdStyle, backgroundColor: "#fff", color: "#000" }}>{r.numRC}</td>
                  <td style={{ ...tdStyle, backgroundColor: "#fff", color: "#000" }}>{r.dateFacture}</td>
                  <td style={{ ...tdStyle, backgroundColor: "#fff", color: "#000" }}>{r.refFacture}</td>
                  <td style={{ ...tdStyle, textAlign: "right", backgroundColor: "#fff", color: "#000" }}>{r.montantHT ? fmt(num(r.montantHT)) : ""}</td>
                  <td style={{ ...tdStyle, textAlign: "right", backgroundColor: "#fff", color: "#000" }}>{r.tvaDeductible ? fmt(num(r.tvaDeductible)) : ""}</td>
                  <td style={{ ...tdStyle, backgroundColor: "#fff", color: "#000" }}>{r.nature === "bien_amortissable" ? "Bien amortissable" : r.nature === "autre" ? "Autre" : ""}</td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr style={{ background: "#ddd", fontWeight: 700, color: "#000" }}>
              <td colSpan={7} style={{ ...tdStyle, textAlign: "right", backgroundColor: "#ddd", color: "#000" }}>TOTAL</td>
              <td style={{ ...tdStyle, textAlign: "right", backgroundColor: "#ddd", color: "#000" }}>{fmt(rows.reduce((s,r) => s+num(r.montantHT),0))}</td>
              <td style={{ ...tdStyle, textAlign: "right", backgroundColor: "#ddd", color: "#000" }}>{fmt(rows.reduce((s,r) => s+num(r.tvaDeductible),0))}</td>
              <td style={{ ...tdStyle, backgroundColor: "#ddd", color: "#000" }} />
            </tr></tfoot>
          </table>
        )
      })()}

      {activeTab === "droits_timbre" && (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>
            {["#","Désignation","CA TTC Esp.","Droit de Timbre"].map((h) => <th key={h} style={thStyle}>{h}</th>)}
          </tr></thead>
          <tbody>
            {timbreRows.map((r, i) => (
              <tr key={i} style={{ background: "#fff", color: "#000" }}>
                <td style={{ ...tdStyle, textAlign: "center", backgroundColor: "#fff", color: "#000" }}>{i+1}</td>
                <td style={{ ...tdStyle, backgroundColor: "#fff", color: "#000" }}>{r.designation}</td>
                <td style={{ ...tdStyle, textAlign: "right", backgroundColor: "#fff", color: "#000" }}>{r.caTTCEsp ? fmt(num(r.caTTCEsp)) : ""}</td>
                <td style={{ ...tdStyle, textAlign: "right", backgroundColor: "#fff", color: "#000" }}>{r.droitTimbre ? fmt(num(r.droitTimbre)) : ""}</td>
              </tr>
            ))}
          </tbody>
          <tfoot><tr style={{ background: "#ddd", fontWeight: 700, color: "#000" }}>
            <td colSpan={2} style={{ ...tdStyle, textAlign: "right", backgroundColor: "#ddd", color: "#000" }}>TOTAL</td>
            <td style={{ ...tdStyle, textAlign: "right", backgroundColor: "#ddd", color: "#000" }}>{fmt(timbreRows.reduce((s,r) => s+num(r.caTTCEsp),0))}</td>
            <td style={{ ...tdStyle, textAlign: "right", backgroundColor: "#ddd", color: "#000" }}>{fmt(timbreRows.reduce((s,r) => s+num(r.droitTimbre),0))}</td>
          </tr></tfoot>
        </table>
      )}

      {activeTab === "ca_tap" && (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>
            {["Désignation","Chiffre d'affaires HT","Montant Taxe à verser"].map((h) => <th key={h} style={thStyle}>{h}</th>)}
          </tr></thead>
          <tbody>
            <tr style={{ background: "#fff", color: "#000" }}>
              <td style={{ ...tdStyle, backgroundColor: "#fff", color: "#000" }}>Chiffre d'affaires soumis à 7%</td>
              <td style={{ ...tdStyle, textAlign: "right", backgroundColor: "#fff", color: "#000" }}>{b12 ? fmt(num(b12)) : ""}</td>
              <td style={{ ...tdStyle, textAlign: "right", backgroundColor: "#fff", color: "#000" }}>{b12 ? fmt(c12) : ""}</td>
            </tr>
            <tr style={{ background: "#eee", color: "#000" }}>
              <td style={{ ...tdStyle, backgroundColor: "#eee", color: "#000" }}>Chiffre d'affaires global soumis à 1%</td>
              <td style={{ ...tdStyle, textAlign: "right", backgroundColor: "#eee", color: "#000" }}>{b13 ? fmt(num(b13)) : ""}</td>
              <td style={{ ...tdStyle, textAlign: "right", backgroundColor: "#eee", color: "#000" }}>{b13 ? fmt(c13) : ""}</td>
            </tr>
          </tbody>
          <tfoot><tr style={{ background: "#ddd", fontWeight: 700, color: "#000" }}>
            <td style={{ ...tdStyle, textAlign: "right", backgroundColor: "#ddd", color: "#000" }}>TOTAL</td>
            <td style={{ ...tdStyle, textAlign: "right", backgroundColor: "#ddd", color: "#000" }}>{fmt(num(b12)+num(b13))}</td>
            <td style={{ ...tdStyle, textAlign: "right", backgroundColor: "#ddd", color: "#000" }}>{fmt(c12+c13)}</td>
          </tr></tfoot>
        </table>
      )}

      {activeTab === "etat_tap" && (
        <>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              {["#","Code Wilaya","Wilaya","Commune","TAP 2%"].map((h) => <th key={h} style={thStyle}>{h}</th>)}
            </tr></thead>
            <tbody>
              {tapRows.map((r, i) => {
                const w = WILAYAS.find((w) => w.code === r.wilayaCode)
                return <tr key={i} style={{ background: "#fff", color: "#000" }}>
                  <td style={{ ...tdStyle, textAlign: "center", backgroundColor: "#fff", color: "#000" }}>{i+1}</td>
                  <td style={{ ...tdStyle, textAlign: "center", fontWeight: 700, backgroundColor: "#fff", color: "#000" }}>{r.wilayaCode}</td>
                  <td style={{ ...tdStyle, backgroundColor: "#fff", color: "#000" }}>{w?.name ?? ""}</td>
                  <td style={{ ...tdStyle, backgroundColor: "#fff", color: "#000" }}>{r.commune}</td>
                  <td style={{ ...tdStyle, textAlign: "right", backgroundColor: "#fff", color: "#000" }}>{r.tap2 ? fmt(num(r.tap2)) : ""}</td>
                </tr>
              })}
            </tbody>
            <tfoot><tr style={{ background: "#ddd", fontWeight: 700, color: "#000" }}>
              <td colSpan={4} style={{ ...tdStyle, textAlign: "right", backgroundColor: "#ddd", color: "#000" }}>MONTANT TAP</td>
              <td style={{ ...tdStyle, textAlign: "right", fontSize: 11, backgroundColor: "#ddd", color: "#000" }}>{fmt(tapRows.reduce((s,r) => s+num(r.tap2),0))} DZD</td>
            </tr></tfoot>
          </table>
        </>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function NouvelleDeclarationPage() {
  const { user, isLoading, status } = useAuth({ requireAuth: true, redirectTo: "/login" })
  const { toast } = useToast()
  const router    = useRouter()
  const printRef  = useRef<HTMLDivElement>(null)

  // ── Regions (fetched from API) ──
  const [regions, setRegions] = useState<{ id: number; name: string }[]>([])
  useEffect(() => {
    const token = typeof localStorage !== "undefined" ? localStorage.getItem("jwt") : null
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5001"}/api/regions`, {
      credentials: "include",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((data: { id: number; name: string }[]) => setRegions(data))
      .catch(() => {})
  }, [])

  // ── Global meta ──
  const [activeTab,  setActiveTab]  = useState("encaissement")
  const [direction,  setDirection]  = useState("")
  const [mois,       setMois]       = useState(String(new Date().getMonth() + 1).padStart(2, "0"))
  const [annee,      setAnnee]      = useState(String(CURRENT_YEAR))
  const [isSubmitting, setIsSubmitting] = useState(false)

  // ── Tab data (lifted) ──
  const [encRows,       setEncRows]       = useState<EncRow[]>([{ designation: "", ttc: "" }])
  const [tvaImmoRows,   setTvaImmoRows]   = useState<TvaRow[]>([{ ...EMPTY_TVA }])
  const [tvaBiensRows,  setTvaBiensRows]  = useState<TvaRow[]>([{ ...EMPTY_TVA }])
  const [timbreRows,    setTimbreRows]    = useState<TimbreRow[]>([{ designation: "", caTTCEsp: "", droitTimbre: "" }])
  const [b12,           setB12]           = useState("")
  const [b13,           setB13]           = useState("")
  const [tapRows,       setTapRows]       = useState<TAPRow[]>([{ wilayaCode: "", commune: "", tap2: "" }])

  if (isLoading || !user || status !== "authenticated") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Chargement...</p>
      </div>
    )
  }

  const handleSave = async () => {
    // Validation : direction, mois, année obligatoires
    if (!direction.trim()) {
      toast({ title: "⚠ Direction requise", description: "Veuillez saisir la direction avant d'enregistrer.", variant: "destructive" })
      return
    }
    if (!mois) {
      toast({ title: "⚠ Mois requis", description: "Veuillez sélectionner le mois avant d'enregistrer.", variant: "destructive" })
      return
    }
    if (!annee) {
      toast({ title: "⚠ Année requise", description: "Veuillez sélectionner l'année avant d'enregistrer.", variant: "destructive" })
      return
    }

    // Validation : aucune case du tableau actif ne doit être vide
    let validationError = false
    switch (activeTab) {
      case "encaissement":
        if (encRows.some(r => !r.designation.trim() || !r.ttc)) {
          toast({ title: "⚠ Champs incomplets", description: "Tous les champs du tableau doivent être remplis.", variant: "destructive" })
          validationError = true
        }
        break
      case "tva_immo":
        if (tvaImmoRows.some(r => !r.nomRaisonSociale.trim() || !r.idFiscal.trim() || !r.adresse.trim() || !r.numRC.trim() || !r.dateFacture || !r.refFacture.trim() || !r.montantHT || !r.tvaDeductible || !r.nature)) {
          toast({ title: "⚠ Champs incomplets", description: "Tous les champs du tableau doivent être remplis.", variant: "destructive" })
          validationError = true
        }
        break
      case "tva_biens":
        if (tvaBiensRows.some(r => !r.nomRaisonSociale.trim() || !r.idFiscal.trim() || !r.adresse.trim() || !r.numRC.trim() || !r.dateFacture || !r.refFacture.trim() || !r.montantHT || !r.tvaDeductible || !r.nature)) {
          toast({ title: "⚠ Champs incomplets", description: "Tous les champs du tableau doivent être remplis.", variant: "destructive" })
          validationError = true
        }
        break
      case "droits_timbre":
        if (timbreRows.some(r => !r.designation.trim() || !r.caTTCEsp || !r.droitTimbre)) {
          toast({ title: "⚠ Champs incomplets", description: "Tous les champs du tableau doivent être remplis.", variant: "destructive" })
          validationError = true
        }
        break
      case "ca_tap":
        if (!b12 || !b13) {
          toast({ title: "⚠ Champs incomplets", description: "Tous les champs doivent être remplis.", variant: "destructive" })
          validationError = true
        }
        break
      case "etat_tap":
        if (tapRows.some(r => !r.wilayaCode || !r.commune.trim() || !r.tap2)) {
          toast({ title: "⚠ Champs incomplets", description: "Tous les champs du tableau doivent être remplis.", variant: "destructive" })
          validationError = true
        }
        break
    }

    if (validationError) return

    setIsSubmitting(true)
    await new Promise((r) => setTimeout(r, 400))
    
    // Enregistrer seulement le tableau actif
    const baseDecl = {
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      direction,
      mois,
      annee,
      encRows: [] as EncRow[],
      tvaImmoRows: [] as TvaRow[],
      tvaBiensRows: [] as TvaRow[],
      timbreRows: [] as TimbreRow[],
      b12: "",
      b13: "",
      tapRows: [] as TAPRow[],
    }
    
    // Remplir uniquement les données du tableau actif
    switch (activeTab) {
      case "encaissement":
        baseDecl.encRows = encRows
        break
      case "tva_immo":
        baseDecl.tvaImmoRows = tvaImmoRows
        break
      case "tva_biens":
        baseDecl.tvaBiensRows = tvaBiensRows
        break
      case "droits_timbre":
        baseDecl.timbreRows = timbreRows
        break
      case "ca_tap":
        baseDecl.b12 = b12
        baseDecl.b13 = b13
        break
      case "etat_tap":
        baseDecl.tapRows = tapRows
        break
    }
    
    try {
      const existing = JSON.parse(localStorage.getItem("fiscal_declarations") ?? "[]")
      localStorage.setItem("fiscal_declarations", JSON.stringify([baseDecl, ...existing]))
    } catch { /* quota or SSR */ }
    
    const tabLabel = TABS.find((t) => t.key === activeTab)?.label ?? activeTab
    toast({ title: "✓ Déclaration enregistrée", description: `La déclaration "${tabLabel}" a été sauvegardée avec succès.` })
    setIsSubmitting(false)
    router.push("/fisca/historique")
  }


  const activeColor = TABS.find((t) => t.key === activeTab)?.color ?? "#2db34b"
  const mon = MONTHS.find((m) => m.value === mois)?.label ?? mois

  return (
    <LayoutWrapper user={user}>
      {/* ── Print CSS ── */}
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 12mm 10mm; }
          body > * { display: none !important; }
          body { margin: 0; padding: 0; }
          #print-zone { 
            display: block !important;
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 100% !important;
            margin: 0 !important;
            padding: 12mm 10mm !important;
            background: white !important;
            color: black !important;
            font-family: Arial, sans-serif !important;
          }
          #print-zone * { 
            display: block !important;
            color: black !important;
            background: white !important;
          }
          table { 
            width: 100% !important;
            border-collapse: collapse !important;
            border: 1px solid #000 !important;
          }
          tr, td, th {
            display: table-cell !important;
            border: 1px solid #000 !important;
            color: black !important;
          }
        }
      `}</style>

      {/* Hidden print zone – always rendered, shown only when printing */}
      <PrintZone
        activeTab={activeTab} direction={direction} mois={mois} annee={annee}
        encRows={encRows} tvaImmoRows={tvaImmoRows} tvaBiensRows={tvaBiensRows}
        timbreRows={timbreRows} b12={b12} b13={b13} tapRows={tapRows}
      />

      <div className="space-y-5 w-full" ref={printRef}>
        {/* ── Page header bar ── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Nouvelle Déclaration</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Remplissez chaque tableau, puis enregistrez.</p>
          </div>

        </div>

        {/* ── Global meta card (Direction + Période) ── */}
        <Card className="border border-gray-200">
          <CardContent className="pt-4 pb-3">
            <div className="flex flex-wrap items-end gap-6">
              {/* Direction */}
              <div className="space-y-1 flex-1 min-w-[220px]">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Direction</label>
                <select value={direction} onChange={(e) => setDirection(e.target.value)}
                  className="w-full rounded border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                  <option value="">— Sélectionner une direction —</option>
                  {regions.map((r) => <option key={r.id} value={r.name}>{r.name}</option>)}
                </select>
              </div>
              {/* Mois */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Mois</label>
                <select value={mois} onChange={(e) => setMois(e.target.value)}
                  className="rounded border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                  {MONTHS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
              {/* Année */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Année</label>
                <select value={annee} onChange={(e) => setAnnee(e.target.value)}
                  className="rounded border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                  {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              {/* Preview badge */}
              <div className="flex items-center gap-2 pb-0.5">
                <span className="text-xs text-gray-400">Période :</span>
                <span className="text-sm font-bold px-3 py-1 rounded-full border"
                  style={{ borderColor: activeColor, color: activeColor, background: activeColor + "15" }}>
                  {mon} {annee}
                </span>
                {direction && (
                  <span className="text-xs text-gray-500 italic truncate max-w-[200px]">{direction}</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Tabs ── */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex h-auto flex-wrap gap-1 bg-gray-100 p-1 rounded-lg w-full">
            {TABS.map((t) => (
              <TabsTrigger
                key={t.key}
                value={t.key}
                className="flex-1 min-w-[130px] text-sm font-semibold py-2 transition-all data-[state=active]:shadow"
                style={activeTab === t.key ? { backgroundColor: PRIMARY_COLOR, color: "white" } : {}}
              >
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* ── TAB 1 – Encaissement */}
          <TabsContent value="encaissement">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold" style={{ color: "#2db34b" }}>
                  Encaissement – Saisie des montants
                </CardTitle>
              </CardHeader>
              <CardContent>
                <TabEncaissement rows={encRows} setRows={setEncRows} onSave={handleSave} isSubmitting={isSubmitting} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── TAB 2 – TVA / IMMO */}
          <TabsContent value="tva_immo">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold" style={{ color: PRIMARY_COLOR }}>
                  État TVA / Immobilisations – Liste des factures
                </CardTitle>
              </CardHeader>
              <CardContent>
                <TabTVAEtat rows={tvaImmoRows} setRows={setTvaImmoRows} onSave={handleSave} isSubmitting={isSubmitting} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── TAB 3 – TVA / BIENS & SERV */}
          <TabsContent value="tva_biens">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold" style={{ color: PRIMARY_COLOR }}>
                  État TVA / Biens &amp; Services – Liste des factures
                </CardTitle>
              </CardHeader>
              <CardContent>
                <TabTVAEtat rows={tvaBiensRows} setRows={setTvaBiensRows} onSave={handleSave} isSubmitting={isSubmitting} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── TAB 4 – Droits Timbre */}
          <TabsContent value="droits_timbre">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold" style={{ color: PRIMARY_COLOR }}>
                  État Droits de Timbre – Saisie des montants
                </CardTitle>
              </CardHeader>
              <CardContent>
                <TabDroitsTimbre rows={timbreRows} setRows={setTimbreRows} onSave={handleSave} isSubmitting={isSubmitting} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── TAB 5 – CA 7% & CA GLOB 1% */}
          <TabsContent value="ca_tap">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold" style={{ color: PRIMARY_COLOR }}>
                  CA soumis à 7% &amp; CA Global soumis à 1% – Calcul automatique
                </CardTitle>
              </CardHeader>
              <CardContent>
                <TabCA b12={b12} setB12={setB12} b13={b13} setB13={setB13} onSave={handleSave} isSubmitting={isSubmitting} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── TAB 6 – ETAT TAP */}
          <TabsContent value="etat_tap">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold" style={{ color: PRIMARY_COLOR }}>
                  État TAP – Saisie par Wilaya / Commune
                </CardTitle>
              </CardHeader>
              <CardContent>
                <TabTAP rows={tapRows} setRows={setTapRows}
                  mois={mois} setMois={setMois} annee={annee} setAnnee={setAnnee}
                  onSave={handleSave} isSubmitting={isSubmitting} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </LayoutWrapper>
  )
}

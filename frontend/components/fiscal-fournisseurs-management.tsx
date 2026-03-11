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
  rc: string
  nif: string
  createdAt: string
  updatedAt: string
}

interface FormData {
  raisonSociale: string
  rc: string
  nif: string
}

const EMPTY_FORM: FormData = { raisonSociale: "", rc: "", nif: "" }

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

  const importRef = useRef<HTMLInputElement>(null)

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
  const openEdit = (f: FiscalFournisseur) => { setEditTarget(f); setForm({ raisonSociale: f.raisonSociale, rc: f.rc, nif: f.nif }); setDialogOpen(true) }

  const handleSave = async () => {
    if (!form.raisonSociale.trim()) {
      toast({ title: "Validation", description: "La raison sociale est obligatoire.", variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      const method = editTarget ? "PUT" : "POST"
      const url = editTarget ? `/api/fiscal-fournisseurs/${editTarget.id}` : "/api/fiscal-fournisseurs"
      const res = await authFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raisonSociale: form.raisonSociale.trim(), rc: form.rc.trim(), nif: form.nif.trim() }),
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

  const handleExport = () => {
    const rows = filtered.map((f) => [`"${f.raisonSociale.replace(/"/g, '""')}"`, `"${f.rc.replace(/"/g, '""')}"`, `"${f.nif.replace(/"/g, '""')}"`])
    const csv = [["Raison Sociale", "RC", "NIF"].join(";"), ...rows.map((r) => r.join(";"))].join("\r\n")
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url; a.download = "fournisseurs-fiscaux.csv"; a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ""
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const lines = ((ev.target?.result as string) || "").replace(/\r/g, "").split("\n").filter(Boolean).slice(1)
      let created = 0, errors = 0
      for (const line of lines) {
        const cols = line.split(";").map((c) => c.replace(/^"|"$/g, "").replace(/""/g, '"').trim())
        if (!cols[0]) continue
        try {
          const res = await authFetch("/api/fiscal-fournisseurs", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ raisonSociale: cols[0] ?? "", rc: cols[1] ?? "", nif: cols[2] ?? "" }),
          })
          if (res.ok) created++; else errors++
        } catch { errors++ }
      }
      toast({ title: "Import terminé", description: `${created} importé(s)${errors ? `, ${errors} erreur(s).` : "."}`, variant: errors > 0 ? "destructive" : "default" })
      fetchFournisseurs()
    }
    reader.readAsText(file, "utf-8")
  }

  const filtered = fournisseurs.filter((f) => {
    const q = search.toLowerCase()
    return f.raisonSociale.toLowerCase().includes(q) || f.rc.toLowerCase().includes(q) || f.nif.toLowerCase().includes(q)
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
            <Download className="mr-2 h-4 w-4" /> Exporter CSV
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
              <TableHead>Raison Sociale</TableHead>
              <TableHead>RC</TableHead>
              <TableHead>NIF</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fetching ? (
              <TableRow><TableCell colSpan={5} className="h-32 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" /></TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="h-32 text-center text-muted-foreground">{search ? "Aucun résultat." : "Aucun fournisseur enregistré."}</TableCell></TableRow>
            ) : (
              filtered.map((f, idx) => (
                <TableRow key={f.id}>
                  <TableCell className="font-mono text-muted-foreground">{idx + 1}</TableCell>
                  <TableCell className="font-medium">{f.raisonSociale}</TableCell>
                  <TableCell>{f.rc || "—"}</TableCell>
                  <TableCell>{f.nif || "—"}</TableCell>
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
              <Label htmlFor="raisonSociale">Raison Sociale <span className="text-destructive">*</span></Label>
              <Input id="raisonSociale" value={form.raisonSociale} onChange={(e) => setForm({ ...form, raisonSociale: e.target.value })} placeholder="Ex: SARL ALGÉRIE TÉLÉCOMS" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rc">Registre de Commerce (RC)</Label>
              <Input id="rc" value={form.rc} onChange={(e) => setForm({ ...form, rc: e.target.value })} placeholder="Ex: 16B123456" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nif">Numéro d'Identification Fiscale (NIF)</Label>
              <Input id="nif" value={form.nif} onChange={(e) => setForm({ ...form, nif: e.target.value })} placeholder="Ex: 000016001234567" />
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

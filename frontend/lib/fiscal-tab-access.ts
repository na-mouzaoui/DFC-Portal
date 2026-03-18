export const REGIONAL_FISCAL_TAB_KEYS = [
  "encaissement",
  "tva_immo",
  "tva_biens",
  "droits_timbre",
  "ca_tap",
  "etat_tap",
] as const

export const FINANCE_FISCAL_TAB_KEYS = [
  "ca_siege",
  "irg",
  "taxe2",
  "taxe_masters",
  "taxe_vehicule",
  "taxe_formation",
  "acompte",
  "ibs",
  "taxe_domicil",
  "tva_autoliq",
] as const

const normalizeRole = (role?: string | null) => (role ?? "").trim().toLowerCase()
const normalizeTabKey = (tabKey?: string | null) => (tabKey ?? "").trim().toLowerCase()

export const isAdminFiscalRole = (role?: string | null) => normalizeRole(role) === "admin"
export const isRegionalFiscalRole = (role?: string | null) => normalizeRole(role) === "regionale"
export const isFinanceFiscalRole = (role?: string | null) => {
  const normalizedRole = normalizeRole(role)
  return normalizedRole === "comptabilite" || normalizedRole === "finance"
}

export const getManageableFiscalTabKeys = (role?: string | null): string[] => {
  if (isAdminFiscalRole(role)) {
    return [...REGIONAL_FISCAL_TAB_KEYS, ...FINANCE_FISCAL_TAB_KEYS]
  }

  if (isRegionalFiscalRole(role)) {
    return [...REGIONAL_FISCAL_TAB_KEYS]
  }

  if (isFinanceFiscalRole(role)) {
    return [...FINANCE_FISCAL_TAB_KEYS]
  }

  return []
}

export const canManageFiscalTab = (role: string | null | undefined, tabKey: string | null | undefined): boolean => {
  const normalizedTabKey = normalizeTabKey(tabKey)
  if (!normalizedTabKey) return false
  return getManageableFiscalTabKeys(role).includes(normalizedTabKey)
}

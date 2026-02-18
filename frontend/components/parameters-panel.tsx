"use client"

import { useState } from "react"
import { BankManagement } from "./bank-management"
import { CalibrationTool } from "./calibration-tool"
import { SupplierManagement } from "./supplier-management"
import { CheckbookManagement } from "./checkbook-management"

type ParametersPanelProps = {
  preSelectedBankId?: string
}

export function ParametersPanel({ preSelectedBankId }: ParametersPanelProps) {
  const [banksVersion, setBanksVersion] = useState(0)

  const handleBanksChange = () => setBanksVersion((version) => version + 1)

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Gestion des banques</h2>
        </div>
        <BankManagement onChange={handleBanksChange} />
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Gestion des chéquiers</h2>
        </div>
        <CheckbookManagement />
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Gestion des fournisseurs</h2>
        </div>
        <SupplierManagement />
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Calibrage des chèques</h2>
          <p className="text-muted-foreground">Ajustez la position des champs sur les modèles PDF.</p>
        </div>
        <CalibrationTool refreshKey={banksVersion} preSelectedBankId={preSelectedBankId} />
      </section>
    </div>
  )
}

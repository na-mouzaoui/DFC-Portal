"use client"

import { LoginForm } from "@/components/login-form"
import { useAuth } from "@/hooks/use-auth"

export default function LoginPage() {
  const { isLoading } = useAuth({ redirectIfFound: true, redirectTo: "/dashboard" })

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900">Imprime Chèques</h1>
          
        </div>
        {isLoading ? (
          <div className="rounded-lg border border-dashed border-gray-200 p-4 text-center text-sm text-muted-foreground">
            Vérification de la session...
          </div>
        ) : (
          <LoginForm />
        )}
      </div>
    </div>
  )
}

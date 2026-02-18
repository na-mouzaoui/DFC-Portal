"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { logout } from "@/lib/auth-client"
import { LayoutDashboard, FileText, History, LogOut } from "lucide-react"
import type { User } from "@/lib/db"

interface NavbarProps {
  user: User
}

export function Navbar({ user }: NavbarProps) {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    await logout()
    router.push("/login")
    router.refresh()
  }

  const links = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/cheque", label: "Nouveau Chèque", icon: FileText },
    { href: "/historique", label: "Historique", icon: History },
  ]

  return (
    <nav className="border-b bg-white shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="text-xl font-bold text-blue-900">
              Gestion Chèques
            </Link>
            <div className="hidden items-center gap-2 md:flex">
              {links.map((link) => {
                const Icon = link.icon
                return (
                  <Link key={link.href} href={link.href}>
                    <Button
                      variant={pathname === link.href ? "default" : "ghost"}
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <Icon className="h-4 w-4" />
                      {link.label}
                    </Button>
                  </Link>
                )
              })}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{user.email}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="flex items-center gap-2 bg-transparent"
            >
              <LogOut className="h-4 w-4" />
              Déconnexion
            </Button>
          </div>
        </div>
      </div>
    </nav>
  )
}

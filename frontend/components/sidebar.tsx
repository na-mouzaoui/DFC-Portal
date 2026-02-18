"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, FileText, Settings, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { logout } from "@/lib/auth-client"
import type { User } from "@/lib/db"
import UserProfileMenu from "./user-profile-menu"

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Nouveau Chèque", href: "/cheque", icon: FileText },
  { name: "Paramètres", href: "/parametres", icon: Settings },
]

interface SidebarProps {
  user: User
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    await logout()
    router.push("/login")
    router.refresh()
  }

  return (
    <div className="relative flex h-full flex-col border-r bg-white w-64">
      <div className="border-b p-4 flex items-center justify-center">
        <div className="flex items-center">
          <Image
            src="/logo.png"
            alt="Logo Entreprise"
            width={180}
            height={60}
            className="object-contain"
            priority
          />
        </div>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {navigation.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
              style={{
                backgroundColor: isActive ? '#2db34b' : 'transparent',
                color: isActive ? 'white' : '#1f2937',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = '#f3f4f6'
                  e.currentTarget.style.color = '#2db34b'
                  const icon = e.currentTarget.querySelector('svg')
                  if (icon) (icon as unknown as HTMLElement).style.color = '#e82c2a'
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent'
                  e.currentTarget.style.color = '#1f2937'
                  const icon = e.currentTarget.querySelector('svg')
                  if (icon) (icon as unknown as HTMLElement).style.color = isActive ? 'white' : '#e82c2a'
                }
              }}
            >
              <Icon className="h-5 w-5 flex-shrink-0" style={{ color: isActive ? 'white' : '#e82c2a' }} />
              {item.name}
            </Link>
          )
        })}
      </nav>
      <div className="border-t p-4 space-y-2">
        <div className="text-xs text-gray-600 truncate" title={user.email}>
          {user.email}
        </div>
        <div className="flex items-center gap-2">
          <UserProfileMenu />
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="flex-1 justify-start gap-2"
          >
            <LogOut className="h-4 w-4" style={{ color: '#e82c2a' }} />
            Déconnexion
          </Button>
        </div>
      </div>
    </div>
  )
}

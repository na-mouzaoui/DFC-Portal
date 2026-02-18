"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import AdminUserManagement from "@/components/admin-user-management";
import AdminRegionConfig from "@/components/admin-region-config";
import AdminAuditLogs from "@/components/admin-audit-logs";

export default function AdminDashboard() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Verify admin access
    const checkAccess = async () => {
      try {
        const token = localStorage.getItem("jwt");
        const response = await fetch("http://172.20.0.3/api/admin/users", {
          credentials: "include",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (!response.ok) {
          throw new Error("Accès non autorisé");
        }

        setIsLoading(false);
      } catch (error) {
        toast({
          title: "Accès refusé",
          description: "Vous devez être administrateur pour accéder à cette page",
          variant: "destructive",
        });
        router.push("/admin");
      }
    };

    checkAccess();
  }, [router, toast]);

  const handleLogout = () => {
    document.cookie = "jwt=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    router.push("/admin");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Chargement...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Administration</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push('/dashboard')}>
              Retour à la plateforme
            </Button>
            <Button variant="outline" onClick={handleLogout}>
              Déconnexion
            </Button>
          </div>
        </div>

        <Tabs defaultValue="users" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="users">Utilisateurs</TabsTrigger>
            <TabsTrigger value="regions">Régions</TabsTrigger>
            <TabsTrigger value="audit">Audit</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Gestion des utilisateurs</CardTitle>
              </CardHeader>
              <CardContent>
                <AdminUserManagement />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="regions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Configuration des régions</CardTitle>
              </CardHeader>
              <CardContent>
                <AdminRegionConfig />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audit" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Journal d'audit</CardTitle>
              </CardHeader>
              <CardContent>
                <AdminAuditLogs />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

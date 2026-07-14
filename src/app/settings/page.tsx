import { Clock, User as UserIcon } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { DashboardShell } from "@/components/dashboard-shell";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { WorkdaySettingsClient } from "./workday-settings-client";
import { ProfileSettingsClient } from "./profile-settings-client";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const [user, params] = await Promise.all([requireUser(), searchParams]);
  const isSuperAdmin = user.role === "SUPER_ADMIN";
  const isGlobalSuperAdmin = user.role === "SUPER_ADMIN";
  const activeTab = isSuperAdmin ? (params.tab ?? "profile") : "profile";

  const studios = isSuperAdmin
    ? await prisma.studio.findMany({
        where: {
          isActive: true,
          ...(isGlobalSuperAdmin ? {} : { id: user.defaultStudioId ?? "__none__" }),
        },
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          latitude: true,
          longitude: true,
          radiusMeters: true,
          weekStartDay: true,
          weeklyWorkRules: {
            select: {
              dayOfWeek: true,
              isWorkday: true,
              isOptional: true,
              workStartTime: true,
              workEndTime: true,
            },
            orderBy: { dayOfWeek: "asc" },
          },
          policies: {
            where: { isActive: true },
            select: {
              checkInTime: true,
              checkOutTime: true,
              graceMinutes: true,
              alphaCutoffTime: true,
            },
            take: 1,
          },
        },
      })
    : [];

  return (
    <DashboardShell
      user={user}
      currentPath="/settings"
      badge="Pengaturan"
      title="Pengaturan"
      description={
        isSuperAdmin
          ? "Kelola kata sandi profil dan hari kerja studio."
          : "Kelola profil pribadi dan kata sandi akun Kolega Anda."
      }
    >
      <Tabs value={activeTab}>
        {isSuperAdmin ? (
          <TabsList className="mb-6">
            <TabsTrigger
              value="profile"
              render={
                <Link href="/settings?tab=profile">
                  <UserIcon className="size-4 mr-1.5" />
                  Profil Saya
                </Link>
              }
            />
            <TabsTrigger
              value="workday"
              render={
                <Link href="/settings?tab=workday">
                  <Clock className="size-4 mr-1.5" />
                  Hari Kerja
                </Link>
              }
            />
          </TabsList>
        ) : null}

        <TabsContent value="profile" className="mt-0">
          <ProfileSettingsClient initialUser={user} />
        </TabsContent>

        {isSuperAdmin ? (
          <>
            <TabsContent value="workday" className="mt-0">
              <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-none">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-zinc-900 dark:text-zinc-50">
                    <Clock className="size-5 text-blue-700" />
                    Pengaturan Hari Kerja
                  </CardTitle>
                  <CardDescription>
                    Konfigurasikan hari yang dihitung sebagai hari kerja dan batas jam masuk/pulang.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <WorkdaySettingsClient studios={studios} />
                </CardContent>
              </Card>
            </TabsContent>
          </>
        ) : null}
      </Tabs>
    </DashboardShell>
  );
}

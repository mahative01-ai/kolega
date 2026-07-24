import { Clock, User as UserIcon, BookOpen } from "lucide-react";
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
import { HelpDialogsSettingsClient } from "./help-dialogs-settings-client";
import { getHelpRules } from "@/lib/default-help-rules";
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

  const helpRules = isSuperAdmin ? await getHelpRules() : null;

  return (
    <DashboardShell
      user={user}
      currentPath="/settings"
      badge="Settings"
      title="Settings"
      description={
        isSuperAdmin
          ? "Manage profile password, studio workdays, and help rules."
          : "Manage your personal profile and Kolega account password."
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
                  My Profile
                </Link>
              }
            />
            <TabsTrigger
              value="workday"
              render={
                <Link href="/settings?tab=workday">
                  <Clock className="size-4 mr-1.5" />
                  Workdays
                </Link>
              }
            />
            <TabsTrigger
              value="help-dialogs"
              render={
                <Link href="/settings?tab=help-dialogs">
                  <BookOpen className="size-4 mr-1.5" />
                  Help Rules
                </Link>
              }
            />
          </TabsList>
        ) : null}

        <TabsContent value="profile" className="mt-0">
          <ProfileSettingsClient initialUser={user} />
        </TabsContent>

        {isSuperAdmin && helpRules ? (
          <>
            <TabsContent value="workday" className="mt-0">
              <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-none">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-zinc-900 dark:text-zinc-50">
                    <Clock className="size-5 text-blue-700" />
                    Workday Settings
                  </CardTitle>
                  <CardDescription>
                    Configure the days counted as workdays and check-in/out limits.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <WorkdaySettingsClient studios={studios} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="help-dialogs" className="mt-0">
              <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-none">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-zinc-900 dark:text-zinc-50">
                    <BookOpen className="size-5 text-blue-700" />
                    Help Rules Popups
                  </CardTitle>
                  <CardDescription>
                    Configure content (with HTML formatting) shown in the question mark help icons.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <HelpDialogsSettingsClient initialRules={helpRules} />
                </CardContent>
              </Card>
            </TabsContent>
          </>
        ) : null}
      </Tabs>
    </DashboardShell>
  );
}

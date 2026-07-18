"use client";

import React, { useMemo, useState, useTransition } from "react";
import { RotateCcw, Search, UserMinus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { restoreAccountAction } from "./actions";
import { ROLE_LABEL } from "@/lib/roles";

type ArchivedUser = {
  id: string;
  name: string;
  email: string;
  username: string | null;
  role: "SUPER_ADMIN" | "ADMIN" | "MEMBER";
  memberStatus: "TEAM" | "INTERN";
  defaultStudio: { name: string } | null;
  updatedAt: Date;
};

type Props = {
  initialUsers: ArchivedUser[];
};

const memberStatusLabel: Record<string, string> = {
  TEAM: "Staff / Team",
  INTERN: "Intern",
};

export function ArchivedAccountsClient({ initialUsers }: Props) {
  const [users, setUsers] = useState<ArchivedUser[]>(initialUsers);
  const [searchQuery, setSearchQuery] = useState("");
  const [isPending, startTransition] = useTransition();

  const filteredUsers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return users;
    return users.filter((u) => u.name.toLowerCase().includes(q));
  }, [searchQuery, users]);

  function formatDate(dVal: Date | string | null) {
    if (!dVal) return "-";
    const d = new Date(dVal);
    return new Intl.DateTimeFormat("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Jakarta",
    }).format(d);
  }

  const handleRestore = (id: string, name: string) => {
    if (!confirm(`Are you sure you want to restore account ${name} back to active status?`)) {
      return;
    }

    startTransition(async () => {
      try {
        const res = await restoreAccountAction(id);
        if (res.success) {
          // Remove from local list of archived users
          setUsers(users.filter((u) => u.id !== id));
        }
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : "Failed to restore account.");
      }
    });
  };

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search archived account full name..."
            className="pl-9"
          />
        </div>
      </div>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <UserMinus className="size-5 text-zinc-500" />
            Archived Accounts List (Inactive)
          </CardTitle>
          <CardDescription>
            Displaying all deactivated intern or staff accounts. These accounts cannot log in unless restored.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member Name</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Member Status</TableHead>
                  <TableHead>Home Studio</TableHead>
                  <TableHead>Archived At</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-zinc-500 text-sm">
                      No archived accounts found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-semibold text-zinc-900 dark:text-zinc-100">{u.name}</span>
                          <span className="text-[10px] text-zinc-500">{u.email}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{u.username || "-"}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-medium">
                          {ROLE_LABEL[u.role] || u.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {memberStatusLabel[u.memberStatus] || u.memberStatus}
                      </TableCell>
                      <TableCell className="text-xs text-zinc-700 dark:text-zinc-300">
                        {u.defaultStudio?.name || "-"}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-zinc-500">
                        {formatDate(u.updatedAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isPending}
                          onClick={() => handleRestore(u.id, u.name)}
                          className="text-[10px] h-7 px-2 border-zinc-200 dark:border-zinc-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 hover:text-emerald-600 shadow-none"
                        >
                          <RotateCcw className="size-3 mr-1" />
                          Restore Account
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

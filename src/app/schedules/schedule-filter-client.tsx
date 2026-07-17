"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Combobox } from "@/components/ui/combobox";

type UserOption = {
  id: string;
  name: string;
};

type Props = {
  users: UserOption[];
  initialUserId: string;
  initialMonth: string;
  studioId: string;
};

export function ScheduleFilterClient({ users, initialUserId, initialMonth, studioId }: Props) {
  const router = useRouter();

  const options = React.useMemo(() => {
    return users.map((u) => ({
      value: u.id,
      label: u.name,
    }));
  }, [users]);

  function updateQuery(monthValue: string, userIdValue: string) {
    const params = new URLSearchParams();
    if (studioId) params.set("studioId", studioId);
    if (monthValue) params.set("month", monthValue);
    if (userIdValue) params.set("userId", userIdValue);
    router.push(`?${params.toString()}`);
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div className="flex flex-col gap-2">
        <label htmlFor="month-select" className="text-sm font-medium">
          Bulan
        </label>
        <Input
          id="month-select"
          type="month"
          value={initialMonth}
          onChange={(e) => updateQuery(e.target.value, initialUserId)}
          className="h-9"
        />
      </div>
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">
          User
        </label>
        <Combobox
          options={options}
          value={initialUserId}
          onChange={(val) => updateQuery(initialMonth, val)}
          placeholder="Cari user..."
          searchPlaceholder="Cari nama user..."
        />
      </div>
    </div>
  );
}

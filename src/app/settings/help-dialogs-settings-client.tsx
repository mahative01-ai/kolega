"use client";

import { useState } from "react";
import { toast } from "sonner";
import { HelpCircle, FileText, CheckCircle, Info, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { updateHelpRulesAction } from "./actions";

type Rules = {
  rules_wfo: string;
  rules_leave_sick: string;
  rules_correction: string;
  rules_wfh_plan: string;
  rules_wfh_report: string;
};

export function HelpDialogsSettingsClient({ initialRules }: { initialRules: Rules }) {
  const [rules, setRules] = useState<Rules>(initialRules);
  const [loading, setLoading] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateHelpRulesAction(rules);
      toast.success("Help popup dialog rules updated successfully!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update rules.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (key: keyof Rules, val: string) => {
    setRules((prev) => ({ ...prev, [key]: val }));
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div className="rounded-lg bg-blue-50/50 dark:bg-blue-950/10 border border-blue-200 dark:border-blue-900/50 p-4 text-xs leading-relaxed text-blue-800 dark:text-blue-300 flex gap-2.5 items-start">
        <Info className="size-4 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
        <div>
          <p className="font-semibold">HTML Formatting Enabled</p>
          <p className="mt-1 text-zinc-600 dark:text-zinc-400">
            You can use HTML tags to structure the rules. Supported tags include: <code className="bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded font-mono">&lt;b&gt;</code>, <code className="bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded font-mono">&lt;strong&gt;</code>, <code className="bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded font-mono">&lt;p&gt;</code>, <code className="bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded font-mono">&lt;div&gt;</code>, <code className="bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded font-mono">&lt;h4&gt;</code>, and inline Tailwind style attributes (e.g. <code className="bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded font-mono">class=&quot;font-bold text-orange-700&quot;</code>).
          </p>
        </div>
      </div>

      <div className="space-y-6 divide-y divide-zinc-100 dark:divide-zinc-800/80">
        {/* WFO Rules */}
        <div className="pt-4 grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-semibold flex items-center gap-1.5 text-zinc-800 dark:text-zinc-200">
              <Clock3 className="size-4 text-blue-600" />
              WFO Check-in & Check-out Rules
            </label>
            <Textarea
              rows={8}
              value={rules.rules_wfo}
              onChange={(e) => handleChange("rules_wfo", e.target.value)}
              placeholder="Enter HTML rules content for WFO Check-in/out popup..."
              className="font-mono text-xs p-3 leading-relaxed"
            />
          </div>
          <div className="space-y-2">
            <span className="text-xs font-semibold text-zinc-500">Live Preview: WFO Rules Popup</span>
            <div className="rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 space-y-3 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400 min-h-[170px]"
                 dangerouslySetInnerHTML={{ __html: rules.rules_wfo || "<i>No rules content</i>" }} />
          </div>
        </div>

        {/* Leave & Sick Rules */}
        <div className="pt-6 grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-semibold flex items-center gap-1.5 text-zinc-800 dark:text-zinc-200">
              <HelpCircle className="size-4 text-violet-600" />
              Leave & Sick Request Rules
            </label>
            <Textarea
              rows={8}
              value={rules.rules_leave_sick}
              onChange={(e) => handleChange("rules_leave_sick", e.target.value)}
              placeholder="Enter HTML rules content for Leave & Sick Request popup..."
              className="font-mono text-xs p-3 leading-relaxed"
            />
          </div>
          <div className="space-y-2">
            <span className="text-xs font-semibold text-zinc-500">Live Preview: Leave & Sick Rules Popup</span>
            <div className="rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 space-y-3 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400 min-h-[170px]"
                 dangerouslySetInnerHTML={{ __html: rules.rules_leave_sick || "<i>No rules content</i>" }} />
          </div>
        </div>

        {/* Correction Rules */}
        <div className="pt-6 grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-semibold flex items-center gap-1.5 text-zinc-800 dark:text-zinc-200">
              <FileText className="size-4 text-emerald-600" />
              Attendance Correction Rules
            </label>
            <Textarea
              rows={6}
              value={rules.rules_correction}
              onChange={(e) => handleChange("rules_correction", e.target.value)}
              placeholder="Enter HTML rules content for Attendance Correction popup..."
              className="font-mono text-xs p-3 leading-relaxed"
            />
          </div>
          <div className="space-y-2">
            <span className="text-xs font-semibold text-zinc-500">Live Preview: Correction Rules Popup</span>
            <div className="rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 space-y-3 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400 min-h-[130px]"
                 dangerouslySetInnerHTML={{ __html: rules.rules_correction || "<i>No rules content</i>" }} />
          </div>
        </div>

        {/* WFH Work Plan Rules */}
        <div className="pt-6 grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-semibold flex items-center gap-1.5 text-zinc-800 dark:text-zinc-200">
              <CheckCircle className="size-4 text-blue-600" />
              WFH Work Plan Rules
            </label>
            <Textarea
              rows={4}
              value={rules.rules_wfh_plan}
              onChange={(e) => handleChange("rules_wfh_plan", e.target.value)}
              placeholder="Enter HTML rules content for WFH Work Plan popup..."
              className="font-mono text-xs p-3 leading-relaxed"
            />
          </div>
          <div className="space-y-2">
            <span className="text-xs font-semibold text-zinc-500">Live Preview: WFH Plan Rules Popup</span>
            <div className="rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 space-y-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400 min-h-[90px]"
                 dangerouslySetInnerHTML={{ __html: rules.rules_wfh_plan || "<i>No rules content</i>" }} />
          </div>
        </div>

        {/* WFH Work Report Rules */}
        <div className="pt-6 grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-semibold flex items-center gap-1.5 text-zinc-800 dark:text-zinc-200">
              <CheckCircle className="size-4 text-emerald-600" />
              WFH Work Report Rules
            </label>
            <Textarea
              rows={4}
              value={rules.rules_wfh_report}
              onChange={(e) => handleChange("rules_wfh_report", e.target.value)}
              placeholder="Enter HTML rules content for WFH Work Report popup..."
              className="font-mono text-xs p-3 leading-relaxed"
            />
          </div>
          <div className="space-y-2">
            <span className="text-xs font-semibold text-zinc-500">Live Preview: WFH Report Rules Popup</span>
            <div className="rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 space-y-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400 min-h-[90px]"
                 dangerouslySetInnerHTML={{ __html: rules.rules_wfh_report || "<i>No rules content</i>" }} />
          </div>
        </div>
      </div>

      <div className="pt-4 flex justify-end">
        <Button type="submit" disabled={loading} className="w-full sm:w-auto px-6">
          {loading && <Loader2 className="size-4 mr-2 animate-spin" />}
          Save Changes
        </Button>
      </div>
    </form>
  );
}
import { Clock3 } from "lucide-react";

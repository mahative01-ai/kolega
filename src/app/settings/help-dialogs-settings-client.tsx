"use client";

import { useState } from "react";
import { toast } from "sonner";
import { HelpCircle, FileText, CheckCircle, Info, Loader2, Clock3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateHelpRulesAction } from "./actions";
import { RichTextEditor } from "@/components/ui/rich-text-editor";

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
          <p className="font-semibold">Rich Text Editor Enabled</p>
          <p className="mt-1 text-zinc-600 dark:text-zinc-400">
            Use the toolbar to format rules with headings, bold, italic, underline, bullets, or numbers. Previews on the right update in real-time.
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
            <RichTextEditor
              value={rules.rules_wfo}
              onChange={(val) => handleChange("rules_wfo", val)}
              placeholder="Enter rules content for WFO Check-in/out popup..."
            />
          </div>
          <div className="space-y-2 flex flex-col">
            <span className="text-xs font-semibold text-zinc-500">Live Preview: WFO Rules Popup</span>
            <div className="rules-rich-editor flex-1 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400 min-h-[170px]"
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
            <RichTextEditor
              value={rules.rules_leave_sick}
              onChange={(val) => handleChange("rules_leave_sick", val)}
              placeholder="Enter rules content for Leave & Sick Request popup..."
            />
          </div>
          <div className="space-y-2 flex flex-col">
            <span className="text-xs font-semibold text-zinc-500">Live Preview: Leave & Sick Rules Popup</span>
            <div className="rules-rich-editor flex-1 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400 min-h-[170px]"
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
            <RichTextEditor
              value={rules.rules_correction}
              onChange={(val) => handleChange("rules_correction", val)}
              placeholder="Enter rules content for Attendance Correction popup..."
            />
          </div>
          <div className="space-y-2 flex flex-col">
            <span className="text-xs font-semibold text-zinc-500">Live Preview: Correction Rules Popup</span>
            <div className="rules-rich-editor flex-1 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400 min-h-[130px]"
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
            <RichTextEditor
              value={rules.rules_wfh_plan}
              onChange={(val) => handleChange("rules_wfh_plan", val)}
              placeholder="Enter rules content for WFH Work Plan popup..."
            />
          </div>
          <div className="space-y-2 flex flex-col">
            <span className="text-xs font-semibold text-zinc-500">Live Preview: WFH Plan Rules Popup</span>
            <div className="rules-rich-editor flex-1 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400 min-h-[90px]"
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
            <RichTextEditor
              value={rules.rules_wfh_report}
              onChange={(val) => handleChange("rules_wfh_report", val)}
              placeholder="Enter rules content for WFH Work Report popup..."
            />
          </div>
          <div className="space-y-2 flex flex-col">
            <span className="text-xs font-semibold text-zinc-500">Live Preview: WFH Report Rules Popup</span>
            <div className="rules-rich-editor flex-1 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400 min-h-[90px]"
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

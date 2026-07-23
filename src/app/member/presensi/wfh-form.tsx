"use client";

import { useState } from "react";
import { Send, FileText, Loader2, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { submitWfhAttendanceAction } from "./actions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function WfhForm({
  hasCheckedIn,
  hasCheckedOut,
  checkInPlan,
  rulesPlanContent,
  rulesReportContent,
}: {
  hasCheckedIn: boolean;
  hasCheckedOut: boolean;
  checkInPlan?: string | null;
  rulesPlanContent?: string;
  rulesReportContent?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState("");

  if (hasCheckedOut) {
    return (
      <div className="rounded-md border border-emerald-200 bg-emerald-50/50 p-4 text-emerald-800">
        <p className="text-sm font-medium">WFH attendance completed for today.</p>
      </div>
    );
  }

  const handleSubmit = () => {
    setLoading(true);
  };

  return (
    <form
      action={submitWfhAttendanceAction}
      onSubmit={handleSubmit}
      className="grid gap-4"
    >
      {!hasCheckedIn ? (
        <div className="flex flex-col gap-2">
          <label htmlFor="wfhPlan" className="text-sm font-medium flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
            <FileText className="size-4 text-blue-600" />
            <span>WFH Work Plan</span>
            <Dialog>
              <DialogTrigger asChild>
                <HelpCircle className="size-3.5 text-zinc-400 hover:text-zinc-600 cursor-pointer shrink-0" />
              </DialogTrigger>
              <DialogContent className="sm:max-w-md border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50">
                <DialogHeader>
                  <DialogTitle>WFH Work Plan Rules</DialogTitle>
                </DialogHeader>
                <div className="rules-rich-editor space-y-2 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed"
                     dangerouslySetInnerHTML={rulesPlanContent ? { __html: rulesPlanContent } : undefined}>
                  {!rulesPlanContent && (
                    <>
                      <p>Every time you Check-in for WFH (Work From Home) in the morning, you must fill in a written work plan containing the tasks you plan to complete today.</p>
                      <p className="text-[10px] text-zinc-500">This requirement must be met for WFH attendance to be considered valid and approved by management.</p>
                    </>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </label>
          <textarea
            id="wfhPlan"
            name="wfhPlan"
            rows={4}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write down the work plan that you will complete today..."
            className="w-full rounded-lg border border-input bg-transparent p-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
            required
            disabled={loading}
          />
          <p className="text-xs text-zinc-500">
            The work plan must be filled in before WFH Check-in.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
            <p className="text-xs font-semibold text-zinc-500">Your Work Plan:</p>
            <p className="mt-1 text-sm text-zinc-700 whitespace-pre-wrap">{checkInPlan}</p>
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="wfhReport" className="text-sm font-medium flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
              <FileText className="size-4 text-emerald-600" />
              <span>WFH Work Report</span>
              <Dialog>
                <DialogTrigger asChild>
                  <HelpCircle className="size-3.5 text-zinc-400 hover:text-zinc-600 cursor-pointer shrink-0" />
                </DialogTrigger>
                <DialogContent className="sm:max-w-md border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50">
                  <DialogHeader>
                    <DialogTitle>WFH Work Report Rules</DialogTitle>
                  </DialogHeader>
                  <div className="rules-rich-editor space-y-2 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed"
                       dangerouslySetInnerHTML={rulesReportContent ? { __html: rulesReportContent } : undefined}>
                    {!rulesReportContent && (
                      <>
                        <p>Every time you Check-out for WFH (Work From Home) in the afternoon, you must fill in a written report of the results you have achieved today.</p>
                        <p className="text-[10px] text-zinc-500">This requirement must be met for WFH attendance to be considered valid and approved by management.</p>
                      </>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </label>
            <textarea
              id="wfhReport"
              name="wfhReport"
              rows={4}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Write down the report/results that you have achieved today..."
              className="w-full rounded-lg border border-input bg-transparent p-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
              required
              disabled={loading}
            />
            <p className="text-xs text-zinc-500">
              The work report must be filled in before WFH Check-out.
            </p>
          </div>
        </div>
      )}

      <Button type="submit" disabled={loading || !text.trim()} className="w-full">
        {loading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Send aria-hidden="true" className="size-4" />
        )}
        {loading ? "Processing..." : !hasCheckedIn ? "WFH Check-in" : "WFH Check-out"}
      </Button>
    </form>
  );
}

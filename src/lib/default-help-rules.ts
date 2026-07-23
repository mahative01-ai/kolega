export const DEFAULT_RULES_WFO = `<div>
  <h4 class="font-bold text-zinc-900 dark:text-zinc-200">1. Late Limit</h4>
  <p class="mt-0.5">Regular check-in is at <b>08:00 AM</b> with a grace period of <b>10 minutes</b> (08:10 AM). Checking in after this will be marked as Late.</p>
</div>
<div>
  <h4 class="font-bold text-zinc-900 dark:text-zinc-200">2. Absent (Alpha) Threshold</h4>
  <p class="mt-0.5">Employees who have not checked in by <b>12:00 PM (noon)</b> will automatically be marked as Absent (Alpha) for that day.</p>
</div>
<div>
  <h4 class="font-bold text-zinc-900 dark:text-zinc-200">3. Early Check-out Lock</h4>
  <p class="mt-0.5">The check-out button is locked until the minimum work duration (8 hours from check-in) is met to prevent premature checkout.</p>
</div>
<div class="rounded-lg bg-zinc-50 dark:bg-zinc-900/50 p-2.5 border border-zinc-100 dark:border-zinc-800/80">
  <h4 class="font-bold text-orange-700 dark:text-orange-400">Personal Matters & Early Checkout</h4>
  <p class="mt-0.5 text-zinc-600 dark:text-zinc-400">If you must leave early for urgent personal matters, you must compensate for the missing hours. The remaining minutes will be added to your time debt balance (Late Owed) to be replaced on another day.</p>
</div>`;

export const DEFAULT_RULES_LEAVE_SICK = `<div>
  <h4 class="font-bold text-zinc-900 dark:text-zinc-200">1. Sick Leave (SICK)</h4>
  <p class="mt-0.5">Must be submitted on the day of the absence no later than <b>07:00 AM</b> (1 hour before work hours). If you fall ill mid-work, refer to the early leave rules below.</p>
</div>
<div>
  <h4 class="font-bold text-zinc-900 dark:text-zinc-200">2. Annual Leave (LEAVE) & Others</h4>
  <p class="mt-0.5">Must be submitted at least <b>1 day in advance (H-1)</b>. Interns are not eligible for annual leave balance.</p>
</div>
<div>
  <h4 class="font-bold text-zinc-900 dark:text-zinc-200">3. Work From Home (WFH)</h4>
  <p class="mt-0.5">Only applicable to Team members (Interns are not allowed to WFH) and requires Super Admin approval.</p>
</div>
<div class="rounded-lg bg-zinc-50 dark:bg-zinc-900/50 p-2.5 border border-zinc-100 dark:border-zinc-800/80">
  <h4 class="font-bold text-blue-700 dark:text-blue-400">Sick Mid-Work (Early Leave)</h4>
  <p class="mt-0.5 text-zinc-600 dark:text-zinc-400">If you check in and subsequently fall ill during the workday, you may go home without needing to compensate for the remaining hours (considered a full work day). If you remain unwell the next day, you must submit a formal sick request with a doctor's certificate via this form.</p>
</div>`;

export const DEFAULT_RULES_CORRECTION = `<div>
  <h4 class="font-bold text-zinc-900 dark:text-zinc-200">1. Correction Date Range</h4>
  <p class="mt-0.5">Attendance corrections are only allowed for dates ranging from <b>2 to 7 days ago</b>. Today (H-0), yesterday (H-1), and dates outside the 7-day range cannot be selected.</p>
</div>
<div>
  <h4 class="font-bold text-zinc-900 dark:text-zinc-200">2. Estimated Check-in/out Time</h4>
  <p class="mt-0.5">If correcting your status to physical presence (On Time or Late), you must provide the proposed check-in time so the system can calculate late minutes and time debt accurately.</p>
</div>`;

export const DEFAULT_RULES_WFH_PLAN = `<p>Every time you Check-in for WFH (Work From Home) in the morning, you must fill in a written work plan containing the tasks you plan to complete today.</p>
<p class="text-[10px] text-zinc-500">This requirement must be met for WFH attendance to be considered valid and approved by management.</p>`;

export const DEFAULT_RULES_WFH_REPORT = `<p>Every time you Check-out for WFH (Work From Home) in the afternoon, you must fill in a written report of the results you have achieved today.</p>
<p class="text-[10px] text-zinc-500">This requirement must be met for WFH attendance to be considered valid and approved by management.</p>`;

export async function getHelpRules() {
  const { prisma } = await import("./prisma");
  const settings = await prisma.systemSetting.findMany();
  
  const rules = {
    rules_wfo: DEFAULT_RULES_WFO,
    rules_leave_sick: DEFAULT_RULES_LEAVE_SICK,
    rules_correction: DEFAULT_RULES_CORRECTION,
    rules_wfh_plan: DEFAULT_RULES_WFH_PLAN,
    rules_wfh_report: DEFAULT_RULES_WFH_REPORT,
  };

  settings.forEach((s) => {
    if (s.key === "rules_wfo" && s.value) rules.rules_wfo = s.value;
    if (s.key === "rules_leave_sick" && s.value) rules.rules_leave_sick = s.value;
    if (s.key === "rules_correction" && s.value) rules.rules_correction = s.value;
    if (s.key === "rules_wfh_plan" && s.value) rules.rules_wfh_plan = s.value;
    if (s.key === "rules_wfh_report" && s.value) rules.rules_wfh_report = s.value;
  });

  return rules;
}

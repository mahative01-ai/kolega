"use client";

import React, { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { createPayslip, deletePayslip, bulkGeneratePayslipsAction, updatePayslipAction, deleteAllPayslipsAction } from "./actions";
import { Plus, Trash2, Printer, Loader2, FileText, Pencil, RefreshCw, ArrowUpDown } from "lucide-react";
import { Combobox } from "@/components/ui/combobox";

type Member = {
  id: string;
  name: string;
  email: string;
  role: string;
  defaultStudioId: string | null;
  defaultStudio: { id: string; name: string } | null;
};

type Studio = {
  id: string;
  name: string;
};

type Payslip = {
  id: string;
  month: number;
  year: number;
  basicSalary: number;
  allowances: number;
  deductions: number;
  netSalary: number;
  notes: string | null;
  pdfFileName: string | null;
  pdfDataUrl: string | null;
  createdAt: Date;
  user: {
    name: string;
    email: string;
    defaultStudioId: string | null;
  };
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export function PayslipClient({
  initialPayslips,
  members,
  studios,
}: {
  initialPayslips: Payslip[];
  members: Member[];
  studios: Studio[];
}) {
  const [payslips, setPayslips] = useState<Payslip[]>(initialPayslips);
  const [activeStudioId, setActiveStudioId] = useState(studios[0]?.id ?? "");
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Sorting State
  const [sortField, setSortField] = useState<string>("name");
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  // Bulk Dialog State
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [bulkMonth, setBulkMonth] = useState(new Date().getMonth() + 1);
  const [bulkYear, setBulkYear] = useState(new Date().getFullYear());
  const [isBulkPending, startBulkTransition] = useTransition();
  const [isDeleteAllPending, startDeleteAllTransition] = useTransition();

  const handleDeleteAll = async () => {
    const activeStudioName = studios.find((s) => s.id === activeStudioId)?.name ?? "Studio Terpilih";
    if (!confirm(`Apakah Anda yakin ingin menghapus SEMUA slip gaji untuk studio ${activeStudioName}? Tindakan ini tidak dapat dibatalkan!`)) {
      return;
    }

    startDeleteAllTransition(async () => {
      try {
        const res = await deleteAllPayslipsAction(activeStudioId);
        if (res.success) {
          setPayslips(payslips.filter((p) => p.user.defaultStudioId !== activeStudioId));
          toast.success(`All payslips for studio ${activeStudioName} successfully deleted.`);
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to delete payslip.");
      }
    });
  };

  // Edit Dialog State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingPayslip, setEditingPayslip] = useState<Payslip | null>(null);
  const [editNotes, setEditNotes] = useState("");
  const [editPdfFile, setEditPdfFile] = useState<File | null>(null);
  const [isEditPending, startEditTransition] = useTransition();

  const handleBulkGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    const activeStudioName = studios.find((s) => s.id === activeStudioId)?.name ?? "Selected Studio";
    if (!confirm(`Are you sure you want to generate default payslips for all TEAM staff in studio ${activeStudioName} for ${MONTH_NAMES[bulkMonth - 1]} ${bulkYear}?`)) {
      return;
    }

    startBulkTransition(async () => {
      try {
        const res = await bulkGeneratePayslipsAction(bulkMonth, bulkYear, activeStudioId);
        toast.success(`Success! ${res.generatedCount} new payslips successfully generated.`);
        setIsBulkOpen(false);
        window.location.reload();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to generate bulk payslips.");
      }
    });
  };

  const handleOpenEdit = (p: Payslip) => {
    setEditingPayslip(p);
    setEditNotes(p.notes || "");
    setEditPdfFile(null);
    setIsEditOpen(true);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPayslip) return;

    startEditTransition(async () => {
      try {
        let pdfData: { name: string; type: string; dataUrl: string } | null = null;
        if (editPdfFile) {
          if (editPdfFile.type !== "application/pdf") {
            toast.error("Payslip file must be a PDF.");
            return;
          }
          if (editPdfFile.size > 2 * 1024 * 1024) {
            toast.error("Maximum PDF size is 2MB.");
            return;
          }
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = () => reject(new Error("Failed to read PDF file."));
            reader.readAsDataURL(editPdfFile);
          });
          pdfData = {
            name: editPdfFile.name,
            type: editPdfFile.type,
            dataUrl,
          };
        }

        const updated = await updatePayslipAction(editingPayslip.id, {
          basicSalary: editingPayslip.basicSalary,
          allowances: editingPayslip.allowances,
          deductions: editingPayslip.deductions,
          notes: editNotes,
          pdfFile: pdfData,
        });

        setPayslips(
          payslips.map((p) => {
            if (p.id === editingPayslip.id) {
              return {
                ...p,
                basicSalary: updated.basicSalary,
                allowances: updated.allowances,
                deductions: updated.deductions,
                netSalary: updated.netSalary,
                notes: updated.notes,
                pdfFileName: updated.pdfFileName,
                pdfDataUrl: updated.pdfDataUrl,
              };
            }
            return p;
          })
        );

        toast.success("Payslip successfully updated.");
        setIsEditOpen(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to update payslip.");
      }
    });
  };

  // Form State
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [notes, setNotes] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemberId) {
      toast.error("Please select a member first.");
      return;
    }
    if (!pdfFile) {
      toast.error("PDF payslip must be uploaded.");
      return;
    }
    if (pdfFile.type !== "application/pdf") {
      toast.error("Payslip file must be a PDF.");
      return;
    }
    if (pdfFile.size > 2 * 1024 * 1024) {
      toast.error("Maximum PDF size is 2MB.");
      return;
    }

    startTransition(async () => {
      try {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error("Failed to read PDF file."));
          reader.readAsDataURL(pdfFile);
        });

        const newPayslip = await createPayslip({
          userId: selectedMemberId,
          month,
          year,
          basicSalary: 0,
          allowances: 0,
          deductions: 0,
          notes,
          pdfFile: {
            name: pdfFile.name,
            type: pdfFile.type,
            dataUrl,
          },
        });

        const member = members.find((m) => m.id === selectedMemberId);
        const addedPayslip: Payslip = {
          ...newPayslip,
          user: {
            name: member?.name || "",
            email: member?.email || "",
            defaultStudioId: member?.defaultStudioId ?? null,
          },
        };

        setPayslips([addedPayslip, ...payslips]);
        toast.success("Payslip successfully sent to member.");
        setIsOpen(false);
        // Reset form
        setSelectedMemberId("");
        setNotes("");
        setPdfFile(null);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "Failed to create payslip.";
        toast.error(errMsg);
      }
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this payslip?")) return;

    try {
      await deletePayslip(id);
      setPayslips(payslips.filter((p) => p.id !== id));
      toast.success("Payslip successfully deleted.");
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Failed to delete payslip.";
      toast.error(errMsg);
    }
  };

  const activeStudioMembers = members.filter((m) => m.defaultStudioId === activeStudioId);
  const memberOptions = activeStudioMembers.map((m) => ({
    value: m.id,
    label: m.name,
  }));

  const activeStudioPayslipsCount = payslips.filter((p) => p.user.defaultStudioId === activeStudioId).length;

  return (
    <div className="space-y-6 font-sans">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Payslips List</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Manage and send monthly team payslip details.
          </p>
        </div>
      </div>

      <Tabs value={activeStudioId} onValueChange={setActiveStudioId} className="w-full">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <TabsList className="mb-0 flex w-fit flex-wrap">
            {studios.map((studio) => (
              <TabsTrigger key={studio.id} value={studio.id}>
                {studio.name}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="flex items-center gap-2">
            {activeStudioPayslipsCount > 0 && (
              <Button
                variant="destructive"
                onClick={handleDeleteAll}
                disabled={isDeleteAllPending}
                className="flex items-center gap-2"
              >
                {isDeleteAllPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Trash2 className="size-4" />
                )}
                Delete All
              </Button>
            )}

            {/* Dialog Bulk Generate */}
            <Dialog open={isBulkOpen} onOpenChange={setIsBulkOpen}>
              <Button
                variant="outline"
                onClick={() => setIsBulkOpen(true)}
                className="flex items-center gap-2 border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
              >
                <RefreshCw className="size-4" />
                Bulk Generate
              </Button>
              <DialogContent className="max-w-md bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 font-sans">
                <DialogHeader>
                  <DialogTitle>Bulk Generate Payslips</DialogTitle>
                  <DialogDescription>
                    Create bulk empty payslips for a specific period for all active TEAM staff in this studio.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleBulkGenerate} className="space-y-4 py-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="bulkMonth">Month</Label>
                      <select
                        id="bulkMonth"
                        className="w-full rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-950 dark:focus:ring-zinc-100"
                        value={bulkMonth}
                        onChange={(e) => setBulkMonth(Number(e.target.value))}
                      >
                        {MONTH_NAMES.map((name, i) => (
                          <option key={i} value={i + 1}>
                            {name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bulkYear">Tahun</Label>
                      <select
                        id="bulkYear"
                        className="w-full rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-950 dark:focus:ring-zinc-100"
                        value={bulkYear}
                        onChange={(e) => setBulkYear(Number(e.target.value))}
                      >
                        {[bulkYear - 1, bulkYear, bulkYear + 1].map((y) => (
                          <option key={y} value={y}>
                            {y}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <DialogFooter className="pt-2">
                    <Button type="button" variant="outline" onClick={() => setIsBulkOpen(false)} disabled={isBulkPending}>
                      Batal
                    </Button>
                    <Button type="submit" disabled={isBulkPending} className="bg-zinc-950 dark:bg-zinc-100 text-white dark:text-zinc-950">
                      {isBulkPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Memproses...
                        </>
                      ) : (
                        "Generate"
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            {/* Dialog Buat Slip Gaji */}
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <Button
                className="bg-zinc-950 dark:bg-zinc-100 text-white dark:text-zinc-950 hover:opacity-90 flex items-center gap-2"
                onClick={() => setIsOpen(true)}
              >
                <Plus className="size-4" />
                Create Payslip
              </Button>
              <DialogContent className="max-w-md bg-white dark:bg-zinc-950 font-sans border border-zinc-200 dark:border-zinc-800">
                <DialogHeader>
                  <DialogTitle>Create New Payslip</DialogTitle>
                  <DialogDescription>
                    Enter payslip details for the team member in this studio. The member will receive an automatic notification.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreate} className="space-y-4 py-2">
                  <div className="space-y-2">
                    <Label>Select Member</Label>
                    <Combobox
                      options={memberOptions}
                      value={selectedMemberId}
                      onChange={setSelectedMemberId}
                      placeholder="Select Member..."
                      searchPlaceholder="Search member..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="month">Month</Label>
                      <select
                        id="month"
                        className="w-full rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-950 dark:focus:ring-zinc-100"
                        value={month}
                        onChange={(e) => setMonth(Number(e.target.value))}
                      >
                        {MONTH_NAMES.map((name, i) => (
                          <option key={i} value={i + 1}>
                            {name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="year">Year</Label>
                      <select
                        id="year"
                        className="w-full rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-950 dark:focus:ring-zinc-100"
                        value={year}
                        onChange={(e) => setYear(Number(e.target.value))}
                      >
                        {[year - 1, year, year + 1].map((y) => (
                          <option key={y} value={y}>
                            {y}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes (Optional)</Label>
                    <Textarea
                      id="notes"
                      placeholder="e.g. Performance bonus, lateness 3x"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pdfFile">Upload Payslip PDF</Label>
                    <Input
                      id="pdfFile"
                      type="file"
                      accept="application/pdf"
                      onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
                    />
                    <p className="text-xs text-zinc-500">PDF max 2MB. File will appear on My Payslip page.</p>
                  </div>

                  <DialogFooter className="pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsOpen(false)}
                      disabled={isPending}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isPending}
                      className="bg-zinc-950 dark:bg-zinc-100 text-white dark:text-zinc-950"
                    >
                      {isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        "Send Payslip"
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        {studios.map((studio) => {
          const studioMembers = members.filter((member) => member.defaultStudioId === studio.id);
          const rawStudioPayslips = payslips.filter((payslip) => payslip.user.defaultStudioId === studio.id);
          
          const sortedStudioPayslips = [...rawStudioPayslips].sort((a, b) => {
            let aVal: string | number = "";
            let bVal: string | number = "";

            if (sortField === "name") {
              aVal = a.user.name.toLowerCase();
              bVal = b.user.name.toLowerCase();
            } else if (sortField === "period") {
              aVal = a.year * 100 + a.month;
              bVal = b.year * 100 + b.month;
            }

            if (aVal < bVal) return sortAsc ? -1 : 1;
            if (aVal > bVal) return sortAsc ? 1 : -1;
            return 0;
          });

          return (
            <TabsContent key={studio.id} value={studio.id}>
              <div className="mb-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/30 dark:text-zinc-300">
                {studioMembers.length} active Team in {studio.name}. {sortedStudioPayslips.length} payslips have been published.
              </div>
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-950">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead onClick={() => handleSort("name")} className="cursor-pointer select-none hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                <div className="flex items-center gap-1">
                  Member Name <ArrowUpDown className="size-3 text-zinc-400" />
                </div>
              </TableHead>
              <TableHead onClick={() => handleSort("period")} className="cursor-pointer select-none hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                <div className="flex items-center gap-1">
                  Period <ArrowUpDown className="size-3 text-zinc-400" />
                </div>
              </TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedStudioPayslips.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8 text-zinc-500">
                  No payslips have been published yet.
                </TableCell>
              </TableRow>
            ) : (
              sortedStudioPayslips.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium text-zinc-950 dark:text-zinc-50">
                    {p.user.name}
                  </TableCell>
                  <TableCell>
                    {MONTH_NAMES[p.month - 1]} {p.year}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {p.pdfDataUrl ? (
                        <Button
                          size="icon"
                          variant="outline"
                          title="View PDF"
                          onClick={() => window.open(`/payslip/${p.id}`, "_blank")}
                        >
                          <FileText className="size-4" />
                        </Button>
                      ) : null}
                      <Button
                        size="icon"
                        variant="outline"
                        title="Edit Payslip"
                        onClick={() => handleOpenEdit(p)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        title="Print Payslip"
                        onClick={() => window.open(`/payslip/${p.id}`, "_blank")}
                      >
                        <Printer className="size-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        className="text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                        title="Delete Payslip"
                        onClick={() => handleDelete(p.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
            </TabsContent>
          );
        })}
      </Tabs>

      {/* Dialog Edit Slip Gaji */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-zinc-950 font-sans border border-zinc-200 dark:border-zinc-800">
          <DialogHeader>
            <DialogTitle>Edit Payslip</DialogTitle>
            <DialogDescription>
              Modify salary details, notes, or payslip PDF attachment for the team member.
            </DialogDescription>
          </DialogHeader>
          {editingPayslip && (
            <form onSubmit={handleEdit} className="space-y-4 py-2">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-zinc-500">Member Name</p>
                <p className="text-sm font-bold text-zinc-900 dark:text-zinc-50">{editingPayslip.user.name}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold text-zinc-500">Period</p>
                <p className="text-sm font-medium text-zinc-850 dark:text-zinc-200">
                  {MONTH_NAMES[editingPayslip.month - 1]} {editingPayslip.year}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="editNotes">Notes (Optional)</Label>
                <Textarea
                  id="editNotes"
                  placeholder="Payslip notes"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="editPdfFile">Upload/Replace Payslip PDF</Label>
                <Input
                  id="editPdfFile"
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setEditPdfFile(e.target.files?.[0] ?? null)}
                />
                {editingPayslip.pdfFileName ? (
                  <p className="text-[10px] text-zinc-500">
                    Current file: <span className="font-semibold">{editingPayslip.pdfFileName}</span>
                  </p>
                ) : (
                  <p className="text-[10px] text-amber-600 dark:text-amber-500 font-semibold">
                    No payslip PDF attached yet (status: Draft).
                  </p>
                )}
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)} disabled={isEditPending}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isEditPending} className="bg-zinc-950 dark:bg-zinc-100 text-white dark:text-zinc-950">
                  {isEditPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save"
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

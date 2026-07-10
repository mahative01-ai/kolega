import { redirect } from "next/navigation";

export default function AdminCorrectionsPage() {
  redirect("/admin/requests?tab=corrections");
}

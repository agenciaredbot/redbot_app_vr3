import { LeadTable } from "@/components/crm/lead-table";

export const metadata = {
  title: "Leads",
};

export default function LeadsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-text-primary mb-6">Leads</h1>
      <LeadTable />
    </div>
  );
}

import { ContactsTable } from "@/components/crm/contacts-table";

export const metadata = {
  title: "Contactos",
};

export default function ContactsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-text-primary mb-6">Contactos</h1>
      <ContactsTable />
    </div>
  );
}

import { OrganizationDetailClient } from "@/components/super-admin/organization-detail-client";

export const metadata = {
  title: "Detalle Organizacion | Super Admin",
};

export default async function OrganizationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <OrganizationDetailClient orgId={id} />;
}

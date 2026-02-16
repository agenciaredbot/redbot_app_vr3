"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GlassButton } from "@/components/ui/glass-button";
import { PropertyImportDialog } from "./property-import-dialog";

export function PropertyActionsBar() {
  const [importOpen, setImportOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <div className="flex gap-3">
        <GlassButton
          variant="secondary"
          onClick={() => setImportOpen(true)}
        >
          Importar Excel
        </GlassButton>
        <Link href="/admin/properties/new">
          <GlassButton>Agregar propiedad</GlassButton>
        </Link>
      </div>

      <PropertyImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onSuccess={() => {
          setImportOpen(false);
          router.refresh();
        }}
      />
    </>
  );
}

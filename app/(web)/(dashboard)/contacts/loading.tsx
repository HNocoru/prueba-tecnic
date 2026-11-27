import { ContactListSkeleton } from "@/components/molecules/ContactListSkeleton";
import { PageHeader } from "@/components/molecules/PageHeader";

export default function Loading() {
  return (
    <>
      <PageHeader
        title="Contactos"
        description="Personas que han escrito o llamado a tu negocio."
      />
      <ContactListSkeleton />
    </>
  );
}

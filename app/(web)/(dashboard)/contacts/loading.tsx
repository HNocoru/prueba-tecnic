import { ContactListSkeleton } from "@/components/molecules/ContactListSkeleton";
import { P5PageHeader } from "@/components/molecules/P5PageHeader";

export default function Loading() {
  return (
    <>
      <P5PageHeader
        title="Contactos"
        description="Personas que han escrito o llamado a tu negocio."
      />
      <ContactListSkeleton />
    </>
  );
}

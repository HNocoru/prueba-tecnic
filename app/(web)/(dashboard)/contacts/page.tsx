import { Suspense } from "react";

import { PageHeader } from "@/components/molecules/PageHeader";
import { ContactsScreen } from "@/components/organisms/ContactsScreen";
import { ContactListSkeleton } from "@/components/molecules/ContactListSkeleton";

import { loadMoreContactsAction } from "./actions";

export default function ContactsPage() {
  return (
    <>
      <PageHeader
        title="Contactos"
        description="Personas que han escrito o llamado a tu negocio."
      />
      <Suspense fallback={<ContactListSkeleton />}>
        <ContactsScreen loadMore={loadMoreContactsAction} />
      </Suspense>
    </>
  );
}

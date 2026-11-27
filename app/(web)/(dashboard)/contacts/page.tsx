import { Suspense } from "react";

import { P5PageHeader } from "@/components/molecules/P5PageHeader";
import { ContactsScreen } from "@/components/organisms/ContactsScreen";
import { ContactListSkeleton } from "@/components/molecules/ContactListSkeleton";

import { loadMoreContactsAction } from "./actions";

export default function ContactsPage() {
  return (
    <>
      <P5PageHeader
        title="Contactos"
        description="Personas que han escrito o llamado a tu negocio."
      />
      <Suspense fallback={<ContactListSkeleton />}>
        <ContactsScreen loadMore={loadMoreContactsAction} />
      </Suspense>
    </>
  );
}

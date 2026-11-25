import type { ReactNode } from "react";
import { requireUser } from "@/modules/auth";
import { Sidebar } from "@/components/organisms/Sidebar";

export default async function ContactsLayout({ children }: { children: ReactNode }) {
  await requireUser();

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar />
      <main className="flex min-h-screen flex-1 flex-col p-4 md:p-8">{children}</main>
    </div>
  );
}

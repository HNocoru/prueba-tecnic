import type { ReactNode } from "react";
import { Sidebar } from "@/components/Sidebar";

export default function ContactsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar />
      <main className="flex min-h-screen flex-1 flex-col p-4 md:p-8">{children}</main>
    </div>
  );
}

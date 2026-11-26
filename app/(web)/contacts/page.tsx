import { redirect } from "next/navigation";

/** URL antigua: se conserva y lleva a la bandeja. */
export default function ContactsRedirect(): never {
  redirect("/inbox");
}

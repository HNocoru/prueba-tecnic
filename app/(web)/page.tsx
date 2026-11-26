import { redirect } from "next/navigation";

/** La raíz del sitio lleva al dashboard. */
export default function Home(): never {
  redirect("/home");
}

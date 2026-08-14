import { redirect } from "next/navigation";

// Root → default locale (demo supports en/fr, plan US#2).
export default function RootPage() {
  redirect("/en");
}

import { redirect } from "next/navigation";

/** Legacy tournament registration form — participant accounts use /register. */
export default function EsportsRegisterRedirectPage() {
  redirect("/register");
}

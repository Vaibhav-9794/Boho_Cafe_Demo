import { redirect } from "next/navigation";

export default function AdminMenuRedirect() {
  redirect("/staff-login");
}

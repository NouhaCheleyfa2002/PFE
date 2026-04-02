import { redirect } from "next/navigation";

export default function Page() {
  // Redirect to auth page - in production this would check auth state
  redirect("/auth");
}


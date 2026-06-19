import { redirect } from "next/navigation";

/**
 * Root page — redirects to dashboard.
 * If not authenticated, middleware will redirect to /login.
 */
export default function Home() {
  redirect("/dashboard");
}

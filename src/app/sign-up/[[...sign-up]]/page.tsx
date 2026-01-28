import { redirect } from "next/navigation";

// All auth flows are now unified at /sign-in
export default function SignUpPage() {
  redirect("/sign-in");
}

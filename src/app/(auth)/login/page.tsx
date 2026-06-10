import { Suspense } from "react";

import { LoginForm } from "@/features/auth/components/login-form";

export const metadata = { title: "Log in" };

// Suspense exigido pelo useSearchParams (returnTo) no App Router
export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

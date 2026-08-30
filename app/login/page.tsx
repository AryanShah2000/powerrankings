import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { prisma } from "@/lib/prisma";
import { LoginForm } from "./login-form";

async function authenticate(formData: FormData) {
  "use server";

  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");
  const callbackUrl = String(formData.get("callbackUrl") ?? "/");

  try {
    await signIn("credentials", {
      username,
      password,
      redirectTo: callbackUrl || "/",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return redirect(`/login?error=1&callbackUrl=${encodeURIComponent(callbackUrl)}`);
    }
    throw error;
  }
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
}) {
  const params = await searchParams;
  const analysts = await prisma.analyst.findMany({
    select: { username: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <LoginForm
      analysts={analysts}
      hasError={params.error === "1"}
      callbackUrl={params.callbackUrl ?? "/"}
      action={authenticate}
    />
  );
}

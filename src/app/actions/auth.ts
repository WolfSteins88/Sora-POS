"use server";

import { redirect } from "next/navigation";
import { login, logout } from "@/lib/auth";

export async function loginAction(formData: FormData) {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const user = await login(username, password);
  if (!user) {
    redirect("/login?error=1");
  }
  redirect(user.role === "CASHIER" ? "/pos" : "/dashboard");
}

export async function logoutAction() {
  await logout();
  redirect("/login");
}

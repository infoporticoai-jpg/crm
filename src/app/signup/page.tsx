"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SignupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ companyName: "", ownerName: "", email: "", password: "", confirmPassword: "", terms: false });
  const update = (field: string, value: string | boolean) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) { toast.error("Passwords do not match"); return; }
    if (!form.terms) { toast.error("You must accept the terms"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ companyName: form.companyName, ownerName: form.ownerName, email: form.email, password: form.password }) });
      if (!res.ok) { const data = await res.json(); toast.error(data.error || "Failed to create account"); return; }
      const signInRes = await signIn("credentials", { email: form.email, password: form.password, redirect: false });
      if (signInRes?.error) { router.push("/login"); } else { router.push("/dashboard"); }
    } catch { toast.error("Failed to create account"); } finally { setLoading(false); }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-[#DC7418] text-white text-2xl font-bold">P</div>
          <h1 className="mt-4 text-2xl font-bold">Create your account</h1>
          <p className="mt-1 text-gray-500">Start managing your business with Portico</p>
        </div>
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2"><Label htmlFor="companyName">Company Name</Label><Input id="companyName" value={form.companyName} onChange={(e) => update("companyName", e.target.value)} required /></div>
            <div className="space-y-2"><Label htmlFor="ownerName">Owner Name</Label><Input id="ownerName" value={form.ownerName} onChange={(e) => update("ownerName", e.target.value)} required /></div>
            <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} required /></div>
            <div className="space-y-2"><Label htmlFor="password">Password</Label><Input id="password" type="password" value={form.password} onChange={(e) => update("password", e.target.value)} required minLength={8} /></div>
            <div className="space-y-2"><Label htmlFor="confirmPassword">Confirm Password</Label><Input id="confirmPassword" type="password" value={form.confirmPassword} onChange={(e) => update("confirmPassword", e.target.value)} required /></div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="terms" checked={form.terms} onChange={(e) => update("terms", e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-[#DC7418] focus:ring-[#DC7418]" />
              <Label htmlFor="terms" className="text-sm font-normal">I agree to the Terms of Service and Privacy Policy</Label>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>{loading ? "Creating account..." : "Create Account"}</Button>
          </form>
        </div>
        <p className="text-center text-sm text-gray-500">Already have an account? <Link href="/login" className="text-[#DC7418] hover:underline font-medium">Sign in</Link></p>
      </div>
    </div>
  );
}

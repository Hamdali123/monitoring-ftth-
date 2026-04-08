"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

const FORBIDDEN_FOR_TECH = ["/performance", "/customers", "/inventory", "/settings"];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const roleCookie = document.cookie
      .split("; ")
      .find((row) => row.startsWith("ftth_role="))
      ?.split("=")[1];
    
    const authCookie = document.cookie
      .split("; ")
      .find((row) => row.startsWith("ftth_auth="))
      ?.split("=")[1];

    if (!authCookie && pathname !== "/login") {
      router.push("/login");
      return;
    }

    if (roleCookie) {
      setRole(roleCookie);
      
      if (roleCookie === "technician" && FORBIDDEN_FOR_TECH.includes(pathname)) {
        router.push("/");
      }
    }
  }, [pathname, router]);

  if (!mounted) {
    return (
      <div className="fixed inset-0 bg-black z-[9999] flex items-center justify-center" suppressHydrationWarning>
        <div className="w-8 h-8 border-4 border-zinc-800 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}

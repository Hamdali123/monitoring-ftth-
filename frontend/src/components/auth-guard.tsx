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

  if (!mounted) return null;

  return <>{children}</>;
}

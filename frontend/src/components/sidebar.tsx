"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  LayoutDashboard, 
  Map as MapIcon, 
  Users, 
  Box, 
  Settings,
  Zap,
  Activity,
  LogOut,
  ShieldCheck
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Global Map", href: "/", icon: MapIcon },
  { name: "Network Stats", href: "/performance", icon: Activity },
  { name: "Customer CRM", href: "/customers", icon: Users },
  { name: "Device Inventory", href: "/inventory", icon: Box },
  { name: "System Settings", href: "/settings", icon: Settings },
];

import { useSidebar } from "@/context/sidebar-context";
import { X } from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [role, setRole] = useState<string>("admin");
  const [mounted, setMounted] = useState(false);
  const { isOpen, close } = useSidebar();

  useEffect(() => {
    setMounted(true);
    const roleCookie = document.cookie
      .split("; ")
      .find((row) => row.startsWith("ftth_role="))
      ?.split("=")[1];
    if (roleCookie) setRole(roleCookie);
  }, []);

  const handleLogout = () => {
    document.cookie = "ftth_auth=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
    document.cookie = "ftth_role=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
    router.push("/login");
  };

  const filteredNavigation = navigation.filter((item) => {
    if (mounted && role === "technician") {
      return item.name === "Global Map";
    }
    return true;
  });

  if (pathname === "/login" || !mounted) return null;

  return (
    <>
      {/* Backdrop for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[140] lg:hidden animate-in fade-in duration-300" 
          onClick={close}
        />
      )}

      <div className={cn(
        "fixed inset-y-0 left-0 lg:static flex h-screen w-72 flex-col bg-[#050505] text-zinc-400 border-r border-zinc-900/50 shadow-[20px_0_40px_-20px_rgba(0,0,0,0.5)] z-[150] transition-transform duration-500 ease-in-out lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex h-24 items-center justify-between px-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20 group transition-transform hover:rotate-3">
              <Zap className="h-6 w-6 text-white fill-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-black text-white tracking-widest uppercase italic">Sanwanay</span>
              <span className="text-[10px] font-bold text-blue-500 uppercase tracking-[0.2em]-mt-1">Network</span>
            </div>
          </div>
          <button onClick={close} className="lg:hidden p-2 text-zinc-600 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="px-6 mb-8">
          <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-4 flex items-center gap-3">
            <div className="relative">
              <div className="w-2 h-2 bg-emerald-500 rounded-full absolute -top-0.5 -right-0.5 border border-black animate-pulse" />
              <Activity className="h-4 w-4 text-zinc-500" />
            </div>
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-tighter">System Online</span>
          </div>
        </div>

        <nav className="flex-1 space-y-1.5 px-4 mb-8 overflow-y-auto custom-scrollbar">
          <p className="px-4 mb-4 text-[10px] font-black text-zinc-700 uppercase tracking-widest">Navigation</p>
          {filteredNavigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={close}
                className={cn(
                  "group flex items-center gap-4 rounded-2xl px-4 py-3.5 text-sm font-bold transition-all duration-300",
                  isActive 
                    ? "bg-blue-600/10 text-blue-500 border border-blue-600/20" 
                    : "hover:bg-zinc-900/50 hover:text-zinc-200 border border-transparent"
                )}
              >
                <item.icon className={cn(
                  "h-5 w-5 transition-all duration-300",
                  isActive ? "text-blue-500 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]" : "group-hover:text-zinc-300"
                )} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-6 border-t border-zinc-900/50 mt-auto bg-gradient-to-t from-black to-transparent">
          <div className="flex items-center gap-4 px-4 py-3 rounded-2xl bg-zinc-900/20 border border-zinc-800/30 mb-4 group cursor-default">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-xs shadow-lg shadow-blue-900/20">
              {mounted ? (role === 'technician' ? 'TK' : 'JD') : 'JD'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black text-white truncate">
                {mounted ? (role === 'technician' ? 'TECHNICIAN' : 'ADMIN NOC') : 'ADMIN NOC'}
              </p>
              <p className="text-[10px] text-zinc-600 font-bold uppercase truncate tracking-tighter">
                {mounted ? (role === 'technician' ? 'sanwanay-tech' : 'sanwanay-admin') : 'sanwanay-admin'}
              </p>
            </div>
          </div>
          
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-zinc-500 hover:text-rose-500 hover:bg-rose-500/5 rounded-2xl transition-all"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </div>
    </>
  );
}

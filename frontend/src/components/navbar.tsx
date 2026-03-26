"use client";

import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import { useSidebar } from "@/context/sidebar-context";

export function Navbar() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const { toggle } = useSidebar();
  const unreadCount = notifications.filter(n => !n.is_read).length;

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications', {
        headers: { 'ngrok-skip-browser-warning': 'true' }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { 
        method: 'PATCH',
        headers: { 'ngrok-skip-browser-warning': 'true' }
      });
      setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (err) {
       console.error(err);
    }
  };

  const clearNotifications = async () => {
    try {
      await fetch('/api/notifications', { 
        method: 'DELETE',
        headers: { 'ngrok-skip-browser-warning': 'true' }
      });
      setNotifications([]);
    } catch (err) {
       console.error(err);
    }
  };

  return (
    <header className="h-20 md:h-24 border-b border-zinc-900/50 bg-[#050505]/80 backdrop-blur-md px-4 md:px-8 flex items-center justify-between sticky top-0 z-[100]">
      <div className="flex items-center gap-4 flex-1">
        <button 
          onClick={toggle}
          className="lg:hidden p-2 text-zinc-500 hover:text-white transition-colors"
        >
          <Menu size={24} />
        </button>

        <div className="hidden md:block flex-1 max-w-xl">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-blue-500 transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Search network nodes..." 
              className="w-full bg-zinc-900/30 border border-zinc-800/50 rounded-2xl py-3 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 transition-all placeholder:text-zinc-700 font-medium"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 md:gap-6">
        <div className="relative">
          <button 
            onClick={() => setIsOpen(!isOpen)}
            className="relative p-2.5 text-zinc-500 hover:text-white transition-colors group"
          >
            {unreadCount > 0 && (
              <div className="absolute top-2 right-2 w-2.5 h-2.5 bg-blue-600 rounded-full border-2 border-[#050505] z-10 animate-pulse" />
            )}
            <Bell size={20} className={cn("transition-transform", isOpen ? "rotate-12 text-white" : "group-hover:rotate-12")} />
          </button>

          {isOpen && (
            <div className="absolute right-0 mt-4 w-96 bg-[#080808] border border-zinc-900 rounded-[2rem] shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-300 z-[200]">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xs font-black text-white uppercase tracking-widest">Notifications</h3>
                {notifications.length > 0 && (
                  <button onClick={clearNotifications} className="text-[10px] font-bold text-zinc-600 hover:text-rose-500 transition-colors flex items-center gap-1.5 uppercase">
                    <Trash2 size={12} /> Clear All
                  </button>
                )}
              </div>

              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {notifications.length === 0 ? (
                  <div className="py-10 text-center text-zinc-700 text-[10px] font-bold uppercase tracking-widest italic">No alerts in system log.</div>
                ) : (
                  notifications.map((n) => (
                    <div 
                      key={n.id} 
                      onClick={() => !n.is_read && markAsRead(n.id)}
                      className={cn(
                        "p-4 rounded-2xl border transition-all cursor-pointer group relative",
                        n.is_read ? "bg-transparent border-zinc-900 opacity-60" : "bg-zinc-900/40 border-zinc-800 hover:border-blue-500/50"
                      )}
                    >
                      <div className="flex gap-3">
                        <div className={cn(
                          "mt-1",
                          n.severity === 'CRITICAL' ? "text-rose-500" :
                          n.severity === 'WARNING' ? "text-amber-500" :
                          "text-blue-500"
                        )}>
                          {n.severity === 'CRITICAL' ? <XCircle size={14} /> :
                           n.severity === 'WARNING' ? <AlertTriangle size={14} /> :
                           <Info size={14} />}
                        </div>
                        <div className="flex-1">
                          <p className="text-[11px] font-black text-white uppercase tracking-tight italic mb-1">{n.title}</p>
                          <p className="text-[10px] text-zinc-500 font-medium leading-relaxed">{n.message}</p>
                          <p className="text-[9px] text-zinc-700 font-bold mt-2 uppercase">{new Date(n.created_at).toLocaleTimeString()}</p>
                        </div>
                      </div>
                      {!n.is_read && <div className="absolute top-4 right-4 w-1.5 h-1.5 bg-blue-600 rounded-full" />}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
        
        <div className="h-8 w-[1px] bg-zinc-900" />
        
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end text-right">
            <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest leading-none mb-1">Current Zone</span>
            <span className="text-xs font-bold text-white leading-none">Tangerang - Banten</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-zinc-900/50 border border-zinc-800 flex items-center justify-center text-blue-500">
             <Zap size={18} className="fill-blue-500/20" />
          </div>
        </div>
      </div>
    </header>
  );
}

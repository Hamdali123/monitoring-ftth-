"use client";

import { useEffect, useState } from "react";
import { 
  Settings, 
  Shield, 
  Database, 
  Bell, 
  Globe, 
  Cpu, 
  Save,
  Lock,
  Loader2,
  Trash2,
  Plus,
  Activity
} from "lucide-react";

type SettingTab = 'SECURITY' | 'SYNC' | 'NOTIFS' | 'GEO' | 'HW';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingTab>('SECURITY');
  const [saving, setSaving] = useState(false);

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => setSaving(false), 1500); // Simulate save
  };

  return (
    <div className="max-w-[1200px] mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">
      {/* Header */}
      <div>
         <div className="flex items-center gap-3 mb-3">
            <span className="bg-zinc-800 text-zinc-400 text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full border border-zinc-700/50">Core Configuration</span>
         </div>
         <h1 className="text-4xl font-black text-white tracking-tight uppercase italic mb-2">System Settings</h1>
         <p className="text-zinc-500 text-sm font-medium">Global parameters, security policies, and application state.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
         {/* Navigation Sidebar */}
         <div className="lg:col-span-1 space-y-2">
            <SettingNavItem icon={Shield} label="Security & Access" active={activeTab === 'SECURITY'} onClick={() => setActiveTab('SECURITY')} />
            <SettingNavItem icon={Database} label="GenieACS & Sync" active={activeTab === 'SYNC'} onClick={() => setActiveTab('SYNC')} />
            <SettingNavItem icon={Bell} label="Notifications" active={activeTab === 'NOTIFS'} onClick={() => setActiveTab('NOTIFS')} />
            <SettingNavItem icon={Globe} label="Localization" active={activeTab === 'GEO'} onClick={() => setActiveTab('GEO')} />
         </div>

         {/* Content Area */}
         <div className="lg:col-span-3 space-y-8">
            {activeTab === 'SECURITY' && (
              <div className="bg-[#050505] border border-zinc-900 rounded-[2.5rem] p-10 shadow-2xl space-y-8">
                 <div className="border-b border-zinc-900 pb-6">
                    <h3 className="text-xl font-black text-white uppercase italic mb-1 flex items-center gap-3">
                       <Lock size={20} className="text-blue-500" /> Authentication Level
                    </h3>
                    <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Configure NOC & Super-Admin Credentials</p>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-2">NOC Username</label>
                       <input type="text" value="admin" disabled className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-4 text-sm text-white font-medium opacity-50 cursor-not-allowed" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-2">Session TTL (Hours)</label>
                       <input type="number" defaultValue={24} className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-4 text-sm text-white font-medium focus:outline-none focus:border-blue-500 transition-all" />
                    </div>
                 </div>

                 <div className="pt-8 border-t border-zinc-900 flex justify-end">
                    <button 
                      onClick={handleSave}
                      disabled={saving}
                      className="flex items-center gap-3 px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-blue-900/20"
                    >
                       {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} 
                       {saving ? "Saving..." : "Save Changes"}
                    </button>
                 </div>
              </div>
            )}

            {activeTab === 'SYNC' && (
               <div className="bg-[#050505] border border-zinc-900 rounded-[2.5rem] p-10 shadow-2xl space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                  <div className="border-b border-zinc-900 pb-6 flex justify-between items-end">
                     <div>
                        <h3 className="text-xl font-black text-white uppercase italic mb-1 flex items-center gap-3">
                           <Database size={20} className="text-amber-500" /> GenieACS API
                        </h3>
                        <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Connect to TR-069 Management Server</p>
                     </div>
                  </div>
                  
                  <GenieAcsForm />
               </div>
            )}

            {activeTab !== 'SECURITY' && activeTab !== 'SYNC' && (
               <div className="bg-[#050505] border border-zinc-900 rounded-[2.5rem] p-20 text-center animate-in zoom-in-95 duration-500">
                  <Cpu size={48} className="mx-auto text-zinc-800 mb-6" />
                  <h3 className="text-zinc-500 font-black uppercase tracking-widest text-[10px]">Module Pending Implementation</h3>
                  <p className="text-zinc-700 text-xs mt-2 max-w-sm mx-auto">This sub-system will be activated upon integration of global ACS nodes.</p>
               </div>
            )}

            <div className="bg-rose-500/5 border border-rose-900/20 rounded-[2.5rem] p-10 flex items-center justify-between">
               <div>
                  <h4 className="text-rose-500 font-black uppercase italic mb-1">Danger Zone</h4>
                  <p className="text-zinc-500 text-xs font-medium">Flush all telemetry data and reset hardware mappings.</p>
               </div>
               <button className="px-6 py-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                  Reset System
               </button>
            </div>
         </div>
      </div>
    </div>
  );
}

function DeviceList({ segment, type }: { segment: string, type: 'OLT' | 'ROUTER' }) {
  const [devices, setDevices] = useState<any[]>([]);
  const [testing, setTesting] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<any>({});

  const fetchDevices = () => {
    fetch(`http://localhost:3000/api/${segment}`)
      .then(res => res.json())
      .then(setDevices);
  };

  useEffect(fetchDevices, [segment]);

  const testConnection = async (id: string, e: any) => {
    e.stopPropagation();
    setTesting(id);
    try {
      const res = await fetch(`http://localhost:3000/api/${segment}/${id}/test`, { method: 'POST' });
      const data = await res.json();
      alert(data.success ? `CONNECTED: ${data.description || data.message}` : `ERROR: ${data.error}`);
    } catch (err: any) {
      alert(`Test failed: ${err.message}`);
    } finally {
      setTesting(null);
    }
  };

  const handleAdd = async () => {
    try {
      await fetch(`http://localhost:3000/api/${segment}`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(form)
      });
      setShowAdd(false);
      setForm({});
      fetchDevices();
    } catch (err) { alert("Save failed"); }
  };

  const handleDelete = async (id: string, e: any) => {
    e.stopPropagation();
    if (confirm("Delete this node?")) {
      await fetch(`http://localhost:3000/api/${segment}/${id}`, { method: 'DELETE' });
      fetchDevices();
    }
  };

  return (
    <div className="space-y-4">
      {devices.map(device => (
        <div key={device.id} className="group relative flex items-center justify-between p-6 bg-zinc-950 border border-zinc-900 rounded-3xl hover:border-zinc-700 transition-all">
          <div className="flex items-center gap-6">
             <div className="w-12 h-12 bg-zinc-900 rounded-2xl flex items-center justify-center text-zinc-500 group-hover:text-white transition-colors">
                {type === 'OLT' ? <Cpu size={20} /> : <Globe size={20} />}
             </div>
             <div>
               <p className="text-sm font-black text-white uppercase italic">{device.name}</p>
               <div className="flex items-center gap-3 mt-1">
                  <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">{device.ip_address}</p>
                  {device.vpn_address && <span className="text-[8px] bg-blue-600/10 text-blue-500 px-2 py-0.5 rounded-full border border-blue-600/20 font-black">VPN: {device.vpn_address}</span>}
               </div>
             </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={(e) => testConnection(device.id, e)}
              disabled={testing === device.id}
              className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-[9px] font-black uppercase tracking-widest text-zinc-400 hover:text-white border border-zinc-800 rounded-xl transition-all flex items-center gap-2"
            >
              {testing === device.id ? <Loader2 size={12} className="animate-spin" /> : <Activity size={12} className="text-emerald-500" />}
              Test Link
            </button>
            <button
               onClick={(e) => handleDelete(device.id, e)}
               className="p-2.5 bg-zinc-900 hover:bg-rose-500/10 text-zinc-700 hover:text-rose-500 border border-zinc-800 hover:border-rose-500/20 rounded-xl transition-all"
            >
               <Trash2 size={14} />
            </button>
          </div>
        </div>
      ))}

      {showAdd ? (
         <div className="bg-zinc-900/30 border border-zinc-800 rounded-[2rem] p-8 space-y-6 animate-in zoom-in-95">
            <div className="grid grid-cols-2 gap-6">
               <div className="space-y-2">
                  <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest px-2">Label Name</label>
                  <input onChange={e => setForm({...form, name: e.target.value})} type="text" className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-3 text-sm text-white" placeholder="Router Utama" />
               </div>
               <div className="space-y-2">
                  <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest px-2">IP Address / Host</label>
                  <input onChange={e => setForm({...form, ip_address: e.target.value})} type="text" className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-3 text-sm text-white" placeholder="103.x.x.x" />
               </div>
               <div className="space-y-2">
                  <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest px-2">Username</label>
                  <input onChange={e => setForm({...form, username: e.target.value})} type="text" className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-3 text-sm text-white" placeholder="admin" />
               </div>
               <div className="space-y-2">
                  <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest px-2">Password / Secret</label>
                  <input onChange={e => setForm({...form, password: e.target.value})} type="password" className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-3 text-sm text-white" placeholder="••••••••" />
               </div>
               {type === 'ROUTER' && (
                  <>
                     <div className="space-y-2">
                        <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest px-2">VPN / Remote Address (Optional)</label>
                        <input onChange={e => setForm({...form, vpn_address: e.target.value})} type="text" className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-3 text-sm text-white" placeholder="10.24.0.x" />
                     </div>
                     <div className="space-y-2">
                        <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest px-2">Radius Secret</label>
                        <input onChange={e => setForm({...form, secret: e.target.value})} type="text" className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-3 text-sm text-white" placeholder="qwe1234" />
                     </div>
                  </>
               )}
            </div>
            <div className="flex gap-4 pt-4">
               <button onClick={handleAdd} className="flex-1 bg-blue-600 text-white text-[10px] font-black uppercase py-4 rounded-2xl shadow-xl shadow-blue-900/20">Save Node</button>
               <button onClick={() => setShowAdd(false)} className="px-8 bg-zinc-900 text-zinc-500 text-[10px] font-black uppercase py-4 rounded-2xl">Cancel</button>
            </div>
         </div>
      ) : (
         <button onClick={() => setShowAdd(true)} className="w-full py-6 border-2 border-dashed border-zinc-900 hover:border-zinc-800 rounded-[2rem] flex items-center justify-center gap-3 text-zinc-700 hover:text-zinc-500 transition-all font-black uppercase text-[10px] tracking-widest">
            <Plus size={16} /> Register New {type} Node
         </button>
      )}

      {devices.length === 0 && !showAdd && <p className="text-center text-zinc-800 py-10 font-bold uppercase tracking-widest text-[10px]">No {type} nodes registered.</p>}
    </div>
  );
}

function GenieAcsForm() {
   const [config, setConfig] = useState({ ip_address: '', port: 7557, api_port: 7557 });
   const [loading, setLoading] = useState(false);

   useEffect(() => {
      fetch('http://localhost:3000/api/genieacs').then(r => r.json()).then(setConfig);
   }, []);

   const handleSave = async () => {
      setLoading(true);
      try {
         await fetch('http://localhost:3000/api/genieacs', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(config)
         });
         alert("ACS Config Saved");
      } catch (e) { alert("Error saving ACS"); }
      setLoading(false);
   };

   return (
      <div className="space-y-6">
         <div className="grid grid-cols-3 gap-6">
            <div className="space-y-2">
               <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest px-2">ACS Server IP</label>
               <input value={config.ip_address} onChange={e => setConfig({...config, ip_address: e.target.value})} type="text" className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-4 text-sm text-white" placeholder="103.187.162.216" />
            </div>
            <div className="space-y-2">
               <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest px-2">CWMP Port</label>
               <input value={config.port || ''} onChange={e => setConfig({...config, port: parseInt(e.target.value) || 0})} type="number" className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-4 text-sm text-white" placeholder="7547" />
            </div>
            <div className="space-y-2">
               <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest px-2">NBI API Port</label>
               <input value={config.api_port || ''} onChange={e => setConfig({...config, api_port: parseInt(e.target.value) || 0})} type="number" className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-4 text-sm text-white" placeholder="7557" />
            </div>
         </div>
         <div className="flex justify-end pt-4">
            <button 
               onClick={handleSave}
               disabled={loading}
               className="px-10 py-4 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all flex items-center gap-2"
            >
               {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} className="text-amber-500" />}
               Store Configuration
            </button>
         </div>
      </div>
   );
}

function SettingNavItem({ icon: Icon, label, active, onClick }: { icon: any, label: string, active?: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all",
        active ? "bg-zinc-900 text-white border border-zinc-800" : "text-zinc-600 hover:text-zinc-400 hover:bg-zinc-900/30"
      )}
    >
       <Icon size={16} className={active ? "text-blue-500" : "text-zinc-700"} />
       {label}
    </button>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(" ");
}

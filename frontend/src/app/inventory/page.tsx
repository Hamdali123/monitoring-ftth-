"use client";

import { useEffect, useState } from "react";
import { 
  Box, 
  Server, 
  MapPin, 
  Cable, 
  Plus, 
  MoreVertical, 
  Edit, 
  Trash2,
  ExternalLink,
  Activity,
  X,
  Save,
  Globe
} from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = 'OLT' | 'ODC' | 'ODP' | 'ROUTER';

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState<Tab>('OLT');
  const [olts, setOlts] = useState<any[]>([]);
  const [odcs, setOdcs] = useState<any[]>([]);
  const [odps, setOdps] = useState<any[]>([]);
  const [routers, setRouters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchData = () => {
    setLoading(true);
    const endpoints = {
      OLT: "/api/olts",
      ODC: "/api/odcs",
      ODP: "/api/odps",
      ROUTER: "/api/routers"
    };

    const headers = { 'ngrok-skip-browser-warning': 'true' };
    Promise.all([
      fetch(endpoints.OLT, { headers }).then(r => r.json()),
      fetch(endpoints.ODC, { headers }).then(r => r.json()),
      fetch(endpoints.ODP, { headers }).then(r => r.json()),
      fetch(endpoints.ROUTER, { headers }).then(r => r.json())
    ]).then(([oltData, odcData, odpData, routerData]) => {
      setOlts(Array.isArray(oltData) ? oltData : []);
      setOdcs(Array.isArray(odcData) ? odcData : []);
      setOdps(Array.isArray(odpData) ? odpData : []);
      setRouters(Array.isArray(routerData) ? routerData : []);
      setLoading(false);
    }).catch(err => {
      console.error("Inventory fetch error:", err);
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await fetch("/api/sync", { 
        method: "POST",
        headers: { 'ngrok-skip-browser-warning': 'true' }
      });
      fetchData();
    } catch (err) {
      console.error("Sync error:", err);
    } finally {
      setSyncing(false);
    }
  };

  const handleDiscovery = async () => {
    setDiscovering(true);
    try {
      const res = await fetch("/api/discover", { 
        method: "POST",
        headers: { 'ngrok-skip-browser-warning': 'true' }
      });
      const results = await res.json();
      alert(`Discovery Complete!\nCreated: ${results.newOdcs} ODC, ${results.newOdps} ODP, ${results.newCustomers} Customers`);
      fetchData();
    } catch (err) {
      console.error("Discovery error:", err);
    } finally {
      setDiscovering(false);
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-700 pb-12">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 bg-[#050505] p-6 md:p-10 rounded-[2.5rem] md:rounded-[3rem] border border-zinc-900 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-600/5 blur-[100px] rounded-full" />
        <div className="relative">
           <div className="flex items-center gap-3 mb-4">
              <span className="bg-emerald-600/10 text-emerald-500 text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full border border-emerald-600/20">Asset Repository</span>
           </div>
           <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight uppercase italic mb-2">Device Inventory</h1>
           <p className="text-zinc-500 text-sm font-medium">Manage OLTs, Routers, ODC Cabinets, and ODP Terminals.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 relative">
           <button 
             onClick={handleSync}
             disabled={syncing}
             className={cn(
               "flex items-center justify-center gap-3 px-6 md:px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl",
               syncing ? "bg-zinc-800 text-zinc-500 cursor-not-allowed" : "bg-zinc-950 text-emerald-500 border border-emerald-500/20 hover:border-emerald-500/40 shadow-emerald-500/5"
             )}
           >
            <Activity className={cn("h-4 w-4", syncing && "animate-spin")} />
            {syncing ? "Syncing..." : "Sync Hardware"}
           </button>
           <button 
             onClick={handleDiscovery}
             disabled={discovering}
             className={cn(
               "flex items-center justify-center gap-3 px-6 md:px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl",
               discovering ? "bg-zinc-800 text-zinc-500 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/20"
             )}
           >
            <Globe className={cn("h-4 w-4", discovering && "animate-spin")} />
            {discovering ? "Discovering..." : "Discover Topology"}
           </button>
           <button 
             onClick={() => setIsModalOpen(true)}
             className="flex items-center justify-center gap-3 bg-zinc-950 text-zinc-400 border border-zinc-900 hover:bg-zinc-900 px-6 md:px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
           >
             <Plus className="h-4 w-4" />
             Add Equipment
           </button>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center gap-2 bg-[#050505] border border-zinc-900 p-2 rounded-[1.5rem] w-full md:w-fit overflow-x-auto custom-scrollbar no-scrollbar-buttons">
        {(['OLT', 'ODC', 'ODP', 'ROUTER'] as Tab[]).map((tab) => {
          const Icon = tab === 'OLT' ? Server : tab === 'ODC' ? Box : tab === 'ODP' ? MapPin : Activity;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "flex items-center gap-3 px-6 md:px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 shrink-0",
                activeTab === tab 
                  ? "bg-zinc-900 text-white border border-zinc-800 shadow-xl" 
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50"
              )}
            >
              <Icon size={14} className={activeTab === tab ? "text-emerald-500" : "text-zinc-600"} />
              {tab}
            </button>
          );
        })}
      </div>

      {/* Active Table Rendering */}
      <div className="min-h-[400px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-20 animate-pulse text-zinc-800 gap-4">
             <Activity size={32} className="animate-spin" />
             <p className="text-[10px] font-black uppercase tracking-[0.4em]">Decrypting Assets...</p>
          </div>
        ) : (
          <div className="bg-[#050505] border border-zinc-900 rounded-[2.5rem] overflow-hidden shadow-2xl">
              {activeTab === 'OLT' && <InventoryTable columns={["ID", "Name", "IP Address", "Type"]} data={olts} type="OLT" />}
              {activeTab === 'ODC' && <InventoryTable columns={["ID", "Name", "Location", "ODPs"]} data={odcs} type="ODC" />}
              {activeTab === 'ODP' && <InventoryTable columns={["ID", "Name", "Parent ID", "Ports"]} data={odps} type="ODP" />}
              {activeTab === 'ROUTER' && <InventoryTable columns={["ID", "Name", "IP Address", "API"]} data={routers} type="ROUTER" />}
          </div>
        )}
      </div>

      {/* Add Modal */}
      {isModalOpen && <AddEquipmentModal type={activeTab} onClose={() => setIsModalOpen(false)} onRefresh={fetchData} />}
    </div>
  );
}

function InventoryTable({ columns, data, type }: { columns: string[], data: any[], type: Tab }) {
  if (!data.length) return <div className="p-20 text-center text-zinc-700 text-[10px] font-black uppercase tracking-widest italic">No {type} assets found in registry.</div>;
  
  return (
    <div className="overflow-x-auto custom-scrollbar">
      <table className="w-full text-left min-w-[800px]">
        <thead>
          <tr className="border-b border-zinc-900 bg-zinc-950/20">
            {columns.map(col => <th key={col} className="px-6 md:px-10 py-6 text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em]">{col}</th>)}
            <th className="px-6 md:px-10 py-6 text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] text-right">Settings</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-900/50">
          {data.map((item: any) => (
            <tr key={item.id} className="group hover:bg-zinc-900/20 transition-all">
               <td className="px-6 md:px-10 py-6">
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(item.id);
                      alert("ID Copied: " + item.id);
                    }}
                    className="text-[10px] font-mono text-zinc-600 hover:text-blue-500 transition-colors"
                    title="Click to copy ID"
                  >
                    {item.id.slice(0, 8)}...
                  </button>
               </td>
               <td className="px-6 md:px-10 py-6">
                  <span className="text-sm font-black text-white italic group-hover:text-emerald-500 transition-colors uppercase tracking-tight">{item.name}</span>
               </td>
               <td className="px-6 md:px-10 py-6">
                  <span className="text-sm font-bold text-zinc-400 font-mono tracking-tighter">
                    {type === 'ODC' || type === 'ODP' 
                      ? `${item.location_lat?.toFixed(4)}, ${item.location_long?.toFixed(4)}`
                      : item.ip_address || item.odc_id?.slice(0,8) || '---'}
                  </span>
               </td>
               <td className="px-6 md:px-10 py-6">
                  <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest text-nowrap">{item.type || item.total_ports || item.api_port || '---'}</span>
               </td>
               <td className="px-6 md:px-10 py-6 text-right">
                  <button className="p-3 text-zinc-700 hover:text-white transition-colors"><MoreVertical size={16} /></button>
               </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AddEquipmentModal({ type, onClose, onRefresh }: { type: Tab, onClose: () => void, onRefresh: () => void }) {
  const [formData, setFormData] = useState<any>({
    name: "",
    ip_address: "",
    type: "ZTE", // OLT
    snmp_community: "public",
    username: "admin", // Router
    password: "", // Router
    api_port: "8728", // Router
    telnet_user: "admin",
    telnet_pass: "",
    location_lat: "-6.2000",
    location_long: "106.8166",
    total_ports: "8",
    odc_id: ""
  });

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    const endpoint = type === 'OLT' ? '/api/olts' : type === 'ROUTER' ? '/api/routers' : type === 'ODC' ? '/api/odcs' : '/api/odps';
    
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({
          ...formData,
          location_lat: parseFloat(formData.location_lat),
          location_long: parseFloat(formData.location_long),
          total_ports: parseInt(formData.total_ports),
          api_port: parseInt(formData.api_port)
        })
      });
      if (res.ok) {
        onRefresh();
        onClose();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 md:p-12 overflow-y-auto">
      <div className="fixed inset-0 bg-black/90 backdrop-blur-xl" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-[#050505] border border-zinc-900 rounded-[2.5rem] md:rounded-[3rem] p-6 md:p-12 shadow-2xl animate-in zoom-in-95 duration-500 my-8">
         <div className="flex items-center justify-between mb-10">
            <div>
               <h2 className="text-2xl font-black text-white tracking-tight uppercase italic mb-1">Add {type}</h2>
               <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Connect physical hardware to kernel</p>
            </div>
            <button onClick={onClose} className="p-4 bg-zinc-900/50 hover:bg-zinc-800 text-zinc-500 hover:text-white rounded-2xl transition-all"><X size={20} /></button>
         </div>

         <form onSubmit={handleSubmit} className="space-y-6 md:space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-2">Display Name</label>
                  <input required placeholder="OLT-MAWAR-01" className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-4 text-sm text-white focus:outline-none focus:border-emerald-500 transition-all font-bold" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-2">Management IP</label>
                  <input required placeholder="10.10.10.1" className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-4 text-sm text-white font-mono focus:outline-none focus:border-emerald-500 transition-all" value={formData.ip_address} onChange={e => setFormData({...formData, ip_address: e.target.value})} />
               </div>
            </div>

            {type === 'OLT' && (
              <div className="space-y-8">
                <div className="grid grid-cols-2 gap-8">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-2">Device Type</label>
                      <select className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-4 text-sm text-white focus:outline-none focus:border-emerald-500 transition-all font-bold" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                         <option value="ZTE">ZTE C300/C600</option>
                         <option value="HIOSO">HIOSO EPON</option>
                      </select>
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-2">SNMP Community</label>
                      <input className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-4 text-sm text-white focus:outline-none focus:border-emerald-500 transition-all" value={formData.snmp_community} onChange={e => setFormData({...formData, snmp_community: e.target.value})} />
                   </div>
                </div>
                <div className="grid grid-cols-2 gap-8">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-2">Telnet User (for Provisioning)</label>
                      <input className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-4 text-sm text-white focus:outline-none focus:border-emerald-500 transition-all" value={formData.telnet_user || ''} onChange={e => setFormData({...formData, telnet_user: e.target.value})} />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-2">Telnet Password</label>
                      <input type="password" placeholder="••••••••" className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-4 text-sm text-white focus:outline-none focus:border-emerald-500 transition-all" value={formData.telnet_pass || ''} onChange={e => setFormData({...formData, telnet_pass: e.target.value})} />
                   </div>
                </div>
              </div>
            )}

            {type === 'ROUTER' && (
              <div className="space-y-8">
                <div className="grid grid-cols-2 gap-8">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-2">API Username</label>
                      <input required className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-4 text-sm text-white focus:outline-none focus:border-emerald-500 transition-all" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-2">API Password</label>
                      <input required type="password" placeholder="••••••••" className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-4 text-sm text-white focus:outline-none focus:border-emerald-500 transition-all" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                   </div>
                </div>
                <div className="grid grid-cols-3 gap-8">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-2">API Port</label>
                      <input required type="number" className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-4 text-sm text-white font-mono focus:outline-none focus:border-emerald-500 transition-all" value={formData.api_port} onChange={e => setFormData({...formData, api_port: e.target.value})} />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-2">Latitude</label>
                      <input required className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-4 text-sm text-white font-mono focus:outline-none focus:border-emerald-500 transition-all" value={formData.location_lat} onChange={e => setFormData({...formData, location_lat: e.target.value})} />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-2">Longitude</label>
                      <input required className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-4 text-sm text-white font-mono focus:outline-none focus:border-emerald-500 transition-all" value={formData.location_long} onChange={e => setFormData({...formData, location_long: e.target.value})} />
                   </div>
                </div>
              </div>
            )}

            {(type === 'ODC' || type === 'ODP') && (
               <div className="space-y-8">
                  <div className="grid grid-cols-2 gap-8">
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-2">Latitude</label>
                        <input required className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-4 text-sm text-white font-mono focus:outline-none focus:border-emerald-500 transition-all" value={formData.location_lat} onChange={e => setFormData({...formData, location_lat: e.target.value})} />
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-2">Longitude</label>
                        <input required className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-4 text-sm text-white font-mono focus:outline-none focus:border-emerald-500 transition-all" value={formData.location_long} onChange={e => setFormData({...formData, location_long: e.target.value})} />
                     </div>
                  </div>
                  {type === 'ODP' && (
                    <div className="grid grid-cols-2 gap-8">
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-2">Parent ODC (ID)</label>
                          <input required placeholder="Paste ODC UUID here" className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-4 text-sm text-white focus:outline-none focus:border-emerald-500 transition-all" value={formData.odc_id} onChange={e => setFormData({...formData, odc_id: e.target.value})} />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-2">Total Ports</label>
                          <input required type="number" className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-4 text-sm text-white focus:outline-none focus:border-emerald-500 transition-all" value={formData.total_ports} onChange={e => setFormData({...formData, total_ports: e.target.value})} />
                       </div>
                    </div>
                  )}
               </div>
            )}

            <div className="pt-10 border-t border-zinc-900 flex justify-end gap-4">
               <button type="button" onClick={onClose} className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-600 hover:text-white transition-colors">Cancel</button>
               <button type="submit" className="flex items-center gap-3 px-10 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-emerald-900/20">
                  <Save size={16} /> Save Equipment
               </button>
            </div>
         </form>
      </div>
    </div>
  );
}

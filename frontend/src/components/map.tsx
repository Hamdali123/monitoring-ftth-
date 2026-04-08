"use client";

import { MapContainer, TileLayer, Marker, Popup, Polyline, LayersControl } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useState } from "react";

// Fix Leaflet icon issue in Next.js
const initLeaflet = () => {
  const DefaultIcon = L.icon({
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
  });
  L.Marker.prototype.options.icon = DefaultIcon;
};

// Premium Custom Icons
const OdpIcon = L.divIcon({
  className: "custom-odp-icon",
  html: `<div style="background-color: #2563eb; width: 14px; height: 14px; border-radius: 50%; border: 2px solid #fff; box-shadow: 0 0 10px rgba(37, 99, 235, 0.5);"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const CustomerIcon = (status: string) => L.divIcon({
  className: "custom-customer-icon",
  html: `<div style="background-color: ${status === 'ONLINE' ? '#10b981' : '#ef4444'}; width: 10px; height: 10px; border-radius: 50%; border: 2px solid #fff; box-shadow: 0 0 8px ${status === 'ONLINE' ? 'rgba(16, 185, 129, 0.5)' : 'rgba(239, 68, 68, 0.5)'};"></div>`,
  iconSize: [10, 10],
  iconAnchor: [5, 5],
});

const RouterIcon = L.divIcon({
  className: "custom-router-icon",
  html: `
    <div style="background-color: #f59e0b; width: 44px; height: 18px; border-radius: 4px; border: 2px solid #fff; box-shadow: 0 4px 12px rgba(245, 158, 11, 0.6); display: flex; align-items: center; justify-content: center; color: white; font-size: 8px; font-weight: 900; white-space: nowrap; padding: 0 4px;">
      KANTOR
    </div>
    <div style="width: 2px; height: 10px; background-color: #f59e0b; margin-left: 21px;"></div>
  `,
  iconSize: [44, 30],
  iconAnchor: [22, 30],
});

const OltIcon = L.divIcon({
  className: "custom-olt-icon",
  html: `<div style="background-color: #8b5cf6; width: 18px; height: 18px; border-radius: 4px; border: 2px solid #fff; box-shadow: 0 0 12px rgba(139, 92, 246, 0.6); display: flex; align-items: center; justify-content: center; color: white; font-size: 8px; font-weight: 900;">OLT</div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

interface MapProps {
  data: any[];
  onSelectCustomer: (customer: any) => void;
}

export default function Map({ data, onSelectCustomer }: MapProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    initLeaflet();
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="h-full w-full bg-[#09090b] flex items-center justify-center">
        <div className="text-zinc-700 text-xs font-black uppercase tracking-widest animate-pulse">Initializing GIS Engine...</div>
      </div>
    );
  }

  const defaultCenter: [number, number] = [-6.1285, 106.46358];
  const routerNode = data.find(i => i.type === 'ROUTER');
  const center = routerNode ? routerNode.location : (data.length > 0 ? (data[0].location as [number, number]) : defaultCenter);

  // Helper to find parent nodes for drawing cables
  const oltNodes = data.filter(i => i.type === 'OLT');
  const routerNodes = data.filter(i => i.type === 'ROUTER');

  return (
    <div className="h-full w-full relative overflow-hidden rounded-[2.5rem] border border-zinc-900 shadow-2xl bg-black">
      <MapContainer 
        center={center} 
        zoom={14} 
        scrollWheelZoom={true}
        className="w-full h-full z-0"
      >
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="Google Hybrid (Satellite + Roads)">
            <TileLayer
              attribution='&copy; Google Maps'
              url="https://mt1.google.com/vt/lyrs=y&scale=2&x={x}&y={y}&z={z}"
              maxZoom={22}
              maxNativeZoom={20}
              detectRetina={true}
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Satellite View">
            <TileLayer
              attribution='&copy; Esri'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              maxZoom={22}
              maxNativeZoom={19}
            />
          </LayersControl.BaseLayer>
        </LayersControl>
        
        {data.map((item) => {
          if (item.location && item.location[0] === 0 && item.location[1] === 0) return null;

          if (item.type === 'ROUTER') {
            return (
              <Marker key={item.id} position={item.location} icon={RouterIcon}>
                <Popup className="premium-popup">
                   <div className="p-2 bg-zinc-950 text-white rounded-lg border border-zinc-800">
                      <h3 className="text-[9px] font-black uppercase text-amber-500 tracking-tighter">Core Backbone</h3>
                      <p className="text-xs font-bold">{item.name}</p>
                   </div>
                </Popup>
              </Marker>
            );
          }

          if (item.type === 'OLT') {
            return (
              <div key={item.id}>
                <Marker position={item.location} icon={OltIcon}>
                  <Popup className="premium-popup">
                    <div className="p-2 bg-zinc-950 text-white rounded-lg border border-zinc-800">
                      <h3 className="text-[9px] font-black uppercase text-purple-500 tracking-tighter">OLT Terminal</h3>
                      <p className="text-xs font-bold">{item.name}</p>
                      <span className="text-[8px] text-zinc-500 font-bold">{item.vendor} - {item.ip_address}</span>
                    </div>
                  </Popup>
                </Marker>
                
                {/* Cable Router -> OLT (Backbone) */}
                {routerNodes.map(r => (
                  <Polyline 
                    key={`backbone-${item.id}-${r.id}`}
                    positions={[r.location, item.location]} 
                    pathOptions={{ color: '#f59e0b', weight: 4, opacity: 0.8 }}
                  />
                ))}
              </div>
            );
          }

          if (item.type === 'ODP') {
            // Find closest OLT for cable visualization if olt_id not explicitly set
            const parentOlt = item.olt_id ? oltNodes.find(o => o.id === item.olt_id) : oltNodes[0];

            return (
              <div key={item.id}>
                <Marker position={item.location} icon={OdpIcon}>
                  <Popup className="premium-popup">
                    <div className="p-2 bg-zinc-950 text-white rounded-lg border border-zinc-800">
                      <h3 className="text-[9px] font-black uppercase text-blue-500 mb-1">ODP {item.name}</h3>
                      <p className="text-[10px] text-zinc-500 font-bold">Standard Capacity: {item.total_ports} Ports</p>
                    </div>
                  </Popup>
                </Marker>

                {/* Cable OLT -> ODP */}
                {parentOlt && (
                  <Polyline 
                    positions={[parentOlt.location, item.location]} 
                    pathOptions={{ color: '#8b5cf6', weight: 3, opacity: 0.6, dashArray: '10, 10' }}
                  />
                )}

                {item.customers?.map((customer: any) => {
                  if (customer.location && customer.location[0] === 0 && customer.location[1] === 0) return null;
                  return (
                    <div key={customer.id}>
                      <Marker 
                        position={customer.location} 
                        icon={CustomerIcon(customer.status)}
                        eventHandlers={{
                          click: () => onSelectCustomer({ ...customer, odp_name: item.name })
                        }}
                      >
                      <Popup className="premium-popup">
                        <div className="w-[280px] bg-zinc-950 p-4 rounded-xl space-y-4 border border-zinc-800 shadow-2xl">
                          {/* Header */}
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="text-white font-black text-sm uppercase tracking-tight">{customer.name}</h3>
                              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">ID: {customer.billing_id}</p>
                            </div>
                            <div className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${customer.status === 'ONLINE' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'}`}>
                              {customer.status}
                            </div>
                          </div>

                          {/* Stats Grid */}
                          <div className="grid grid-cols-2 gap-2">
                             <div className="bg-zinc-900/50 p-2 rounded-lg border border-zinc-800/50">
                                <span className="text-[8px] text-zinc-500 font-black uppercase tracking-widest block mb-1">Signal (RX)</span>
                                <span className={`text-xs font-black ${customer.rx_live < -27 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                   {customer.rx_live || '--'} dBm
                                </span>
                             </div>
                             <div className="bg-zinc-900/50 p-2 rounded-lg border border-zinc-800/50">
                                <span className="text-[8px] text-zinc-500 font-black uppercase tracking-widest block mb-1">Modem IP</span>
                                <span className="text-xs font-black text-blue-400">
                                   {customer.modem_ip || 'No IP'}
                                </span>
                             </div>
                          </div>

                          {/* Info List */}
                          <div className="space-y-1.5 pt-2 border-t border-zinc-800/50">
                             <div className="flex justify-between items-center text-[10px]">
                                <span className="text-zinc-500 font-bold uppercase tracking-widest">PPPoE User</span>
                                <span className="text-zinc-300 font-black">{customer.pppoe_username}</span>
                             </div>
                             <div className="flex justify-between items-center text-[10px]">
                                <span className="text-zinc-500 font-bold uppercase tracking-widest">SN / MAC</span>
                                <span className="text-zinc-300 font-black">{customer.sn_mac}</span>
                             </div>
                             <div className="flex justify-between items-center text-[10px]">
                                <span className="text-zinc-500 font-bold uppercase tracking-widest">ODP Port</span>
                                <span className="text-zinc-300 font-black">{customer.odp_port}</span>
                             </div>
                          </div>

                          {/* Actions */}
                          <div className="grid grid-cols-2 gap-2 pt-2">
                             <button 
                               onClick={async (e) => {
                                 e.stopPropagation();
                                 if (confirm(`Reboot ONU for ${customer.name}?`)) {
                                   try {
                                     const res = await fetch(`http://localhost:3000/api/customers/${customer.id}/reboot`, { method: 'POST' });
                                     const data = await res.json();
                                     alert(data.message || data.error);
                                   } catch (err: any) { alert(`Reboot failed: ${err.message}`); }
                                 }
                               }}
                               className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 p-2 rounded-lg flex flex-col items-center gap-1 transition-all group"
                             >
                                <div className="h-2 w-2 rounded-full bg-blue-500 group-hover:shadow-[0_0_8px_#3b82f6]"></div>
                                <span className="text-[8px] font-black text-white uppercase tracking-widest">Reboot</span>
                             </button>
                             <button 
                               onClick={async (e) => {
                                 e.stopPropagation();
                                 const ssid = prompt("Enter new SSID:");
                                 const pw = prompt("Enter new WiFi Password:");
                                 if (ssid && pw) {
                                   try {
                                     const res = await fetch(`http://localhost:3000/api/customers/${customer.id}/change-wifi`, {
                                       method: 'POST',
                                       headers: { 'Content-Type': 'application/json' },
                                       body: JSON.stringify({ new_ssid: ssid, new_password: pw })
                                     });
                                     const data = await res.json();
                                     alert(data.message || data.error);
                                   } catch (err: any) { alert(`Update failed: ${err.message}`); }
                                 }
                               }}
                               className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 p-2 rounded-lg flex flex-col items-center gap-1 transition-all group"
                             >
                                <div className="h-2 w-2 rounded-full bg-amber-500 group-hover:shadow-[0_0_8px_#f59e0b]"></div>
                                <span className="text-[8px] font-black text-white uppercase tracking-widest">WIFI PW</span>
                             </button>
                             <button 
                               onClick={async (e) => {
                                 e.stopPropagation();
                                 const pw = prompt("Enter new PPPoE Password:");
                                 if (pw) {
                                   try {
                                     const res = await fetch(`http://localhost:3000/api/customers/${customer.id}/change-pppoe`, {
                                       method: 'POST',
                                       headers: { 'Content-Type': 'application/json' },
                                       body: JSON.stringify({ new_password: pw })
                                     });
                                     const data = await res.json();
                                     alert(data.message || data.error);
                                   } catch (err: any) { alert(`Update failed: ${err.message}`); }
                                 }
                               }}
                               className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 p-2 rounded-lg flex flex-col items-center gap-1 transition-all group"
                             >
                                <div className="h-2 w-2 rounded-full bg-emerald-500 group-hover:shadow-[0_0_8px_#10b981]"></div>
                                <span className="text-[8px] font-black text-white uppercase tracking-widest">PPPoE PW</span>
                             </button>
                             <button 
                               disabled={!customer.modem_ip}
                               onClick={(e) => {
                                 e.stopPropagation();
                                 if (customer.modem_ip) window.open(`http://${customer.modem_ip}`, '_blank');
                               }}
                               className={`bg-zinc-900 border border-zinc-800 p-2 rounded-lg flex flex-col items-center gap-1 transition-all group ${!customer.modem_ip ? 'opacity-30 grayscale cursor-not-allowed' : 'hover:bg-zinc-800'}`}
                             >
                                <div className="h-2 w-2 rounded-full bg-zinc-400 group-hover:shadow-[0_0_8px_#ffffff]"></div>
                                <span className="text-[8px] font-black text-white uppercase tracking-widest">Login ONT</span>
                             </button>
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                    <Polyline 
                      positions={[item.location, customer.location]} 
                      pathOptions={{
                        color: customer.status === 'ONLINE' ? '#3b82f6' : '#f43f5e',
                        weight: 2,
                        opacity: 0.4,
                        dashArray: '5, 5'
                      }}
                    />
                  </div>
                  );
                })}
              </div>
            );
          }
          return null;
        })}
      </MapContainer>

      {/* Map Legend */}
      <div className="absolute bottom-6 left-6 z-[1000] bg-white/95 backdrop-blur shadow-2xl border border-slate-200 p-4 rounded-2xl pointer-events-none">
        <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3">Live Topology</h4>
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-blue-600" />
            <span className="text-[10px] font-bold text-slate-600">ODP Box</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-[10px] font-bold text-slate-600">User Online</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-rose-500" />
            <span className="text-[10px] font-bold text-slate-600">User Offline</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-4 h-3 bg-amber-500 rounded-sm border border-white" />
            <span className="text-[10px] font-bold text-slate-600">Kantor Pusat</span>
          </div>
        </div>
      </div>
    </div>
  );
}

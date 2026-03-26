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
      <div className="h-full w-full bg-slate-50 flex items-center justify-center">
        <div className="text-slate-400 text-xs font-bold uppercase tracking-widest animate-pulse">Initializing Map Engine...</div>
      </div>
    );
  }

  const defaultCenter: [number, number] = [-6.1285, 106.46358];
  const router = data.find(i => i.type === 'ROUTER');
  const center = router ? router.location : (data.length > 0 ? (data[0].location as [number, number]) : defaultCenter);

  return (
    <div className="h-full w-full relative overflow-hidden rounded-3xl border border-slate-200 shadow-inner">
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
              url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
              maxZoom={22}
              maxNativeZoom={20}
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
          <LayersControl.BaseLayer name="Street View (Standard)">
            <TileLayer
              attribution='&copy; OpenStreetMap'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              maxZoom={20}
              maxNativeZoom={19}
            />
          </LayersControl.BaseLayer>
        </LayersControl>
        
        {data.map((item) => {
          if (item.type === 'ROUTER') {
            return (
              <Marker key={item.id} position={item.location} icon={RouterIcon}>
                <Popup>
                  <div className="p-1">
                    <h3 className="text-[10px] font-black uppercase text-amber-600">Core Router</h3>
                    <p className="text-xs font-bold">{item.name}</p>
                  </div>
                </Popup>
              </Marker>
            );
          }

          if (item.type === 'ODP') {
            return (
              <div key={item.id}>
                <Marker position={item.location} icon={OdpIcon}>
                  <Popup>
                    <div className="p-1 min-w-[120px]">
                      <h3 className="text-[10px] font-black uppercase text-blue-600 mb-1">ODP {item.name}</h3>
                      <p className="text-[10px] text-slate-500 font-bold">Ports: {item.total_ports}</p>
                    </div>
                  </Popup>
                </Marker>

                {item.customers?.map((customer: any) => (
                  <div key={customer.id}>
                    <Marker 
                      position={customer.location} 
                      icon={CustomerIcon(customer.status)}
                      eventHandlers={{
                        click: () => onSelectCustomer({ ...customer, odp_name: item.name })
                      }}
                    >
                      <Popup>
                        <div className="p-1">
                          <p className="text-[10px] font-black">{customer.name}</p>
                          <p className={`text-[10px] font-bold ${customer.status === 'ONLINE' ? 'text-emerald-500' : 'text-rose-500'}`}>{customer.status}</p>
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
                ))}
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

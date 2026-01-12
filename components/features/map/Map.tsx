"use client";

import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { renderToStaticMarkup } from 'react-dom/server';
import { 
  AlertTriangle, Truck, Droplet, 
  Home, Stethoscope, Users, Wrench, MapPin 
} from 'lucide-react';

// --- LÓGICA DE ÍCONOS PERSONALIZADOS ---

// 1. Mapeo de categorías a íconos de Lucide
const getCategoryIcon = (category: string) => {
  const props = { size: 16, color: "white", strokeWidth: 3 }; // Ícono blanco y grueso para contraste
  switch (category) {
    case 'agua': return <Droplet {...props} />;
    case 'logistica': return <Truck {...props} />;
    case 'herramientas': return <Wrench {...props} />;
    case 'salud': return <Stethoscope {...props} />;
    case 'hospedaje': return <Home {...props} />;
    case 'animales': return <AlertTriangle {...props} />;
    case 'voluntarios': return <Users {...props} />;
    default: return <MapPin {...props} />;
  }
};

// 2. Función para crear el marcador HTML de Leaflet
const createCustomIcon = (type: string, category: string) => {
  // Rojo para necesidades, Verde para ofertas
  const bgColor = type === 'necesidad' ? '#ef4444' : '#22c55e'; 
  
  // Convertimos el componente React (el ícono) a texto HTML
  const iconComponent = getCategoryIcon(category);
  const iconHtml = renderToStaticMarkup(iconComponent);

  return L.divIcon({
    className: 'custom-map-icon', // Clase para referencia CSS si hiciera falta
    html: `<div style="
      background-color: ${bgColor};
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 3px 6px rgba(0,0,0,0.4);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      ${iconHtml}
    </div>`,
    iconSize: [32, 32],    // Tamaño total del marcador
    iconAnchor: [16, 16],  // Punto de anclaje (centro)
    popupAnchor: [0, -16]  // Donde sale el popup (arriba)
  });
};

const iconSeleccion = L.divIcon({
  className: 'custom-icon-select',
  html: `<div style="background-color: #3b82f6; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10]
});

// --- COMPONENTE 1: MAPA PRINCIPAL ---
export function CommunityMap({ posts, center = [-42.23, -71.36], zoom = 13 }: { posts: any[], center?: [number, number], zoom?: number }) {
  
  return (
    <div className="h-[400px] w-full rounded-xl overflow-hidden shadow-sm border border-slate-200 z-0 relative">
      <MapContainer center={center} zoom={zoom} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {posts.map((post) => {
          if (!post.lat || !post.lng) return null;
          
          // AQUÍ SE GENERA EL ÍCONO DINÁMICO
          const customIcon = createCustomIcon(post.type, post.category);

          return (
            <Marker 
              key={post.id} 
              position={[post.lat, post.lng]}
              icon={customIcon}
            >
              <Popup>
                <div className="min-w-[160px]">
                  <div className="flex items-center gap-2 mb-2 pb-1 border-b border-slate-100">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                      post.type === 'necesidad' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {post.type}
                    </span>
                    <span className="text-xs text-slate-400 capitalize">{post.category}</span>
                  </div>
                  
                  <h3 className="font-bold text-slate-900 leading-tight">{post.title}</h3>
                  <p className="text-xs text-slate-600 mt-1 mb-2 line-clamp-2">{post.description}</p>
                  
                  <div className="flex flex-col gap-1">
                    <div className="text-xs text-slate-500 flex items-center gap-1">
                       📍 {post.location}
                    </div>
                    <a href={`tel:${post.contact}`} className="mt-1 bg-slate-100 hover:bg-slate-200 text-slate-800 text-center py-1.5 rounded text-xs font-bold transition-colors">
                      📞 Llamar: {post.contact}
                    </a>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}

// --- COMPONENTE 2: SELECTOR DE UBICACIÓN ---
function LocationMarker({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) {
  const [position, setPosition] = useState<L.LatLng | null>(null);

  useMapEvents({
    click(e) {
      setPosition(e.latlng);
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });

  return position === null ? null : (
    <Marker position={position} icon={iconSeleccion}>
      <Popup>¡Ubicación marcada!</Popup>
    </Marker>
  );
}

export function LocationPicker({ onLocationSelect, center = [-42.23, -71.36] }: { onLocationSelect: (lat: number, lng: number) => void, center?: [number, number] }) {
  return (
    <div className="h-[250px] w-full rounded-lg overflow-hidden border border-slate-300 relative z-0">
      <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationMarker onLocationSelect={onLocationSelect} />
      </MapContainer>
      <div className="absolute bottom-2 left-2 right-2 bg-white/90 p-2 text-xs text-center rounded shadow z-[1000] pointer-events-none text-slate-600 font-medium">
        👆 Toca el mapa para marcar la ubicación exacta
      </div>
    </div>
  );
}
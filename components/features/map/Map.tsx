"use client";

import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { renderToStaticMarkup } from 'react-dom/server';
import { 
  AlertTriangle, Truck, Droplet, Home, Stethoscope, Users, Wrench, MapPin, 
  Package, Fuel, Shield, Radio, Clock, Phone 
} from 'lucide-react';
import { Post, LogisticsPoint, Squad } from '@/types'; // Importamos el nuevo tipo Squad

// --- 1. LÓGICA DE ÍCONOS (Extendida) ---

const getCategoryIcon = (category: string) => {
  const props = { size: 16, color: "white", strokeWidth: 3 };
  switch (category) {
    case 'agua': return <Droplet {...props} />;
    case 'logistica': return <Truck {...props} />;
    case 'herramientas': return <Wrench {...props} />;
    case 'salud': return <Stethoscope {...props} />;
    case 'hospedaje': return <Home {...props} />;
    case 'animales': return <AlertTriangle {...props} />;
    case 'voluntarios': return <Users {...props} />;
    case 'incendio': return <AlertTriangle {...props} color="yellow" />;
    default: return <MapPin {...props} />;
  }
};

const getLogisticsIcon = (type: string) => {
    const props = { size: 16, color: "white", strokeWidth: 3 };
    switch (type) {
      case 'combustible': return <Fuel {...props} />;
      case 'herramientas': return <Wrench {...props} />;
      case 'base_operativa': return <Shield {...props} />;
      case 'comunicaciones': return <Radio {...props} />;
      default: return <Package {...props} />;
    }
};

// --- 2. GENERADORES DE MARCADORES ---

// A. Generador para Posts Públicos (Rojo/Verde)
const createPostIcon = (type: string, category: string) => {
  const bgColor = type === 'necesidad' ? '#ef4444' : '#22c55e'; 
  const iconHtml = renderToStaticMarkup(getCategoryIcon(category));

  return L.divIcon({
    className: 'custom-map-icon',
    html: `<div style="background-color: ${bgColor}; width: 32px; height: 32px; border-radius: 50%; border: 2px solid white; box-shadow: 0 3px 6px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center;">
      ${iconHtml}
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
  });
};

// B. Generador para Puntos de Acopio (Azul)
const createLogisticsIcon = (type: string) => {
    const iconHtml = renderToStaticMarkup(getLogisticsIcon(type));
    return L.divIcon({
      className: 'custom-map-icon-logistics',
      html: `<div style="background-color: #2563eb; width: 30px; height: 30px; border-radius: 4px; border: 2px solid white; box-shadow: 0 3px 6px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center;">
        ${iconHtml}
      </div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
      popupAnchor: [0, -16]
    });
};

// C. Generador para CUADRILLAS (Dorado = Activo / Gris = Regresó)
const createSquadIcon = (isActive: boolean) => {
    const color = isActive ? '#eab308' : '#64748b'; // Yellow-500 vs Slate-500
    const borderColor = isActive ? 'black' : 'white';
    const iconHtml = renderToStaticMarkup(<Shield size={16} color={isActive ? "black" : "white"} strokeWidth={3} />);
  
    return L.divIcon({
      className: `custom-map-icon-squad-${isActive ? 'active' : 'inactive'}`,
      html: `<div style="background-color: ${color}; width: 32px; height: 32px; border-radius: 50%; border: 2px solid ${borderColor}; box-shadow: 0 3px 6px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center;">
        ${iconHtml}
      </div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -16]
    });
};

const iconSeleccion = L.divIcon({
  className: 'custom-icon-select',
  html: `<div style="background-color: #3b82f6; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10]
});


// --- COMPONENTE PRINCIPAL ---

interface MapProps {
    posts: Post[];
    center?: [number, number];
    zoom?: number;
    logistics?: LogisticsPoint[];
    squads?: Squad[]; // <--- AQUÍ CAMBIAMOS UserProfile[] POR Squad[]
}

export function CommunityMap({ posts, logistics = [], squads = [], center = [-42.23, -71.36], zoom = 13 }: MapProps) {
  
  return (
    <div className="h-[400px] w-full rounded-xl overflow-hidden shadow-sm border border-slate-200 z-0 relative">
      <MapContainer center={center} zoom={zoom} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* 1. CAPA PÚBLICA: AVISOS */}
        {posts.map((post) => {
          if (!post.lat || !post.lng) return null;
          const customIcon = createPostIcon(post.type, post.category);

          return (
            <Marker key={post.id} position={[post.lat, post.lng]} icon={customIcon}>
              <Popup>
                <div className="min-w-[160px]">
                  <div className="flex items-center gap-2 mb-2 pb-1 border-b border-slate-100">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${post.type === 'necesidad' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                      {post.type}
                    </span>
                    <span className="text-xs text-slate-400 capitalize">{post.category}</span>
                  </div>
                  
                  <h3 className="font-bold text-slate-900 leading-tight">{post.title}</h3>
                  <p className="text-xs text-slate-600 mt-1 mb-2 line-clamp-2">{post.description}</p>
                  <a href={`tel:${post.contact}`} className="mt-1 bg-slate-100 hover:bg-slate-200 text-slate-800 text-center py-1.5 rounded text-xs font-bold transition-colors block">
                    📞 Llamar: {post.contact}
                  </a>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* 2. CAPA TÁCTICA: PUNTOS DE ACOPIO */}
        {logistics.map((point) => (
            <Marker key={point.id} position={[point.lat, point.lng]} icon={createLogisticsIcon(point.type)}>
                <Popup>
                    <div className="min-w-[150px]">
                        <div className="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded-t -mx-4 -mt-3 mb-2 flex items-center gap-2">
                             <Package size={12}/> PUNTO LOGÍSTICO
                        </div>
                        <h3 className="font-bold text-slate-900 text-sm">{point.name}</h3>
                        <p className="text-xs text-slate-500 uppercase font-bold mb-2">{point.type}</p>
                        
                        <div className="bg-slate-100 p-2 rounded text-xs text-slate-700 border border-slate-200">
                            <strong>Inventario:</strong>
                            <ul className="list-disc pl-3 mt-1 space-y-0.5">
                                {point.inventory.map((item, idx) => <li key={idx}>{item}</li>)}
                            </ul>
                        </div>
                    </div>
                </Popup>
            </Marker>
        ))}

        {/* 3. CAPA TÁCTICA: CUADRILLAS (Brigadistas) */}
        {squads.map((squad) => {
            // Validamos que tenga coordenadas (del link de Google Maps procesado)
            if (!squad.lat || !squad.lng) return null;
            
            const isActive = !squad.mission.hasReturned;

            return (
                <Marker 
                    key={squad.id} 
                    position={[squad.lat, squad.lng]} 
                    icon={createSquadIcon(isActive)}
                >
                    <Popup>
                        <div className="min-w-[200px] max-h-[320px] overflow-y-auto font-sans">
                            
                            {/* ENCABEZADO: Estado */}
                            <div className={`${isActive ? 'bg-yellow-400 text-black' : 'bg-slate-500 text-white'} text-xs font-bold px-2 py-1.5 rounded-t -mx-4 -mt-3 mb-2 flex items-center justify-between shadow-sm`}>
                                <span className="flex items-center gap-1">
                                  <Shield size={14}/> {squad.name}
                                </span>
                                <span className="text-[10px] bg-white/30 px-1.5 rounded-full">
                                  {squad.membersCount} Pers.
                                </span>
                            </div>

                            {/* DATOS DEL REFERENTE */}
                            <div className="mb-2 pb-2 border-b border-slate-100">
                                <p className="font-bold text-sm text-slate-800">{squad.leaderName}</p>
                                <a href={`tel:${squad.leaderPhone}`} className="text-xs text-blue-600 font-bold flex items-center gap-1 mt-1 hover:underline">
                                  <Phone size={12}/> {squad.leaderPhone}
                                </a>
                                {squad.lodgingLocation && (
                                  <p className="text-[10px] text-slate-500 mt-0.5">📍 Base: {squad.lodgingLocation}</p>
                                )}
                            </div>

                            {/* MISIÓN Y HORARIOS */}
                            <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                                <div className="bg-green-50 p-1.5 rounded border border-green-100 text-center">
                                    <span className="block text-[9px] text-green-700 font-bold uppercase mb-0.5">Salida</span>
                                    <div className="font-mono text-slate-700 font-bold flex items-center justify-center gap-1">
                                      <Clock size={10}/> {squad.mission.departureTime}
                                    </div>
                                </div>
                                <div className="bg-red-50 p-1.5 rounded border border-red-100 text-center">
                                    <span className="block text-[9px] text-red-700 font-bold uppercase mb-0.5">Regreso Est.</span>
                                    <div className="font-mono text-slate-700 font-bold flex items-center justify-center gap-1">
                                      <Clock size={10}/> {squad.mission.returnTime}
                                    </div>
                                </div>
                            </div>

                            {/* RECURSOS (Badges Visuales) */}
                            <div className="mb-3">
                                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Recursos en Terreno</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {squad.equipment.hasWater && (
                                      <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-[10px] font-bold border border-blue-200 flex items-center gap-1">
                                        <Droplet size={10}/> Agua
                                      </span>
                                    )}
                                    {squad.equipment.hasMachinery && (
                                      <span title={squad.equipment.machineryDescription} className="bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full text-[10px] font-bold border border-orange-200 flex items-center gap-1">
                                        <Truck size={10}/> Maquinaria
                                      </span>
                                    )}
                                    {squad.equipment.hasPPE && (
                                      <span title={squad.equipment.ppeDescription} className="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full text-[10px] font-bold border border-indigo-200 flex items-center gap-1">
                                        <Shield size={10}/> EPP
                                      </span>
                                    )}
                                    {squad.equipment.hasTools && (
                                      <span title={squad.equipment.toolsDescription} className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded-full text-[10px] font-bold border border-slate-200 flex items-center gap-1">
                                        <Wrench size={10}/> Herramientas
                                      </span>
                                    )}
                                </div>
                            </div>

                            {/* COMPETENCIAS (Nota Operativa) */}
                            {squad.skills.operational && (
                                <div className="text-[10px] bg-yellow-50 p-2 rounded text-slate-700 border border-yellow-200 leading-relaxed">
                                    <strong className="block text-yellow-700 text-[9px] uppercase mb-0.5">Competencia Operativa:</strong>
                                    "{squad.skills.operational}"
                                </div>
                            )}

                             {/* NOTAS DE COORDINACION */}
                             {squad.mission.coordinationNotes && (
                                <div className="mt-2 text-[10px] text-slate-500 italic border-t pt-2">
                                    📝 Nota: {squad.mission.coordinationNotes}
                                </div>
                            )}
                        </div>
                    </Popup>
                </Marker>
            )
        })}

      </MapContainer>
    </div>
  );
}

// --- COMPONENTE 2: SELECTOR DE UBICACIÓN (Sin Cambios) ---
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
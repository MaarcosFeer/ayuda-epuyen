import React from 'react';

import {
  AlertTriangle, Truck, Droplet,
  Home as HomeIcon, Stethoscope, Users, Wrench
} from 'lucide-react';

export const CATEGORIES = [
  { id: 'agua', label: 'Agua / Alimentos', icon: <Droplet size={18} /> },
  { id: 'logistica', label: 'Transporte', icon: <Truck size={18} /> },
  { id: 'herramientas', label: 'Herramientas / Equipos', icon: <Wrench size={18} /> },
  { id: 'salud', label: 'Salud / Primeros Auxilios', icon: <Stethoscope size={18} /> },
  { id: 'hospedaje', label: 'Hospedaje / Evacuados', icon: <HomeIcon size={18} /> },
  { id: 'animales', label: 'Veterinaria / Mascotas', icon: <AlertTriangle size={18} /> },
  { id: 'voluntarios', label: 'Manos de Obra', icon: <Users size={18} /> },
];

export const getCategoryInfo = (id: string) => {
  return CATEGORIES.find(c => c.id === id) || { icon: <div />, label: id };
};
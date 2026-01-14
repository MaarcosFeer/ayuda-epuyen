import { Timestamp } from "firebase/firestore";

// --- 1. AVISOS Y ASISTENCIA ---
export interface AssignedUser { 
  uid: string; 
  name: string; 
}

export interface HistoryItem {
  action: 'creado' | 'en_camino' | 'resuelto' | 'cancelado';
  user: string; // Nombre del usuario
  userId: string;
  timestamp: Timestamp | Date; // Aceptamos ambos para evitar líos
  note?: string;
}

export interface Post {
  id: string;
  type: string;
  category: string;
  title: string;
  description: string;
  location: string;
  lat?: number;
  lng?: number;
  contact: string;
  userId: string;
  resolved: boolean;
  createdAt: Timestamp | null;
  status: 'abierto' | 'en_proceso' | 'resuelto';
  assignedTo: AssignedUser[];
  history?: HistoryItem[]; // <--- ¡AQUÍ ESTÁ LA SOLUCIÓN A TU ERROR!
}

export interface NewPostForm {
  type: string;
  category: string;
  title: string;
  description: string;
  location: string;
  contact: string;
  lat?: number;
  lng?: number;
}

// --- 2. PERFILES DE USUARIO ---
export type UserRole = 'user' | 'brigadista' | 'admin';

export interface UserProfile {
  uid: string;
  email: string;
  role: UserRole;
  displayName: string;
}

// --- 3. LOGÍSTICA ---
export interface LogisticsPoint {
  id: string;
  name: string;
  type: 'herramientas' | 'agua' | 'combustible' | 'base_operativa' | 'comunicaciones';
  lat: number;
  lng: number;
  inventory: string[];
  contactRadio: string;
}

// --- 4. CUADRILLAS (SQUADS) ---
export interface SquadEquipment {
  hasPPE: boolean; ppeDescription?: string;
  hasTools: boolean; toolsDescription?: string;
  hasMachinery: boolean; machineryDescription?: string;
  hasWater: boolean;
}
export interface SquadSkills {
  operational: string; healthSafety: string; logistics: string; communications: string; management: string;
}
export interface SquadMission {
  departureDay: string; departureTime: string; returnTime: string;
  hasReturned: boolean; coordinationNotes?: string; lastUpdate?: string;
}
export interface Squad {
  id: string;
  leaderName: string; leaderDni: string; leaderPhone: string; lodgingLocation?: string;
  name: string; membersCount: number; interventionZone: string; locationLink?: string;
  lat?: number; lng?: number;
  equipment: SquadEquipment; skills: SquadSkills; mission: SquadMission;
}
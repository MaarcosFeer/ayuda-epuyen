import { Timestamp } from "firebase/firestore";

export interface HistoryItem {
  action: string;
  user: string;
  userId: string; 
  timestamp: Timestamp | Date;
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
  userName?: string;
  userPhoto?: string;
  resolved: boolean;
  createdAt: Timestamp | null;

  status?: 'abierto' | 'en_proceso' | 'resuelto';
  assignedTo?: {
    uid: string;
    name: string;
  }[];
  history: HistoryItem[];
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

export interface AssignedUser { 
  uid: string;
  name: string;
}
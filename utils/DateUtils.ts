import { Timestamp } from "firebase/firestore";

/**
 * Convierte un Timestamp de Firebase o un Date de JS a un string de hora legible (HH:MM)
 */
export const formatTime = (dateInput: Timestamp | Date | null | undefined): string => {
  if (!dateInput) return '...';

  // Si es un Timestamp de Firestore (tiene método toDate)
  if ('toDate' in dateInput && typeof dateInput.toDate === 'function') {
    return dateInput.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  // Si es un objeto Date nativo de JS
  if (dateInput instanceof Date) {
    return dateInput.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  return '...';
};
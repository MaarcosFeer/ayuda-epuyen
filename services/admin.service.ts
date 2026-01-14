import { db } from '@/lib/firebase';
import { doc, writeBatch } from 'firebase/firestore';
import { Squad } from '@/types';
import * as XLSX from 'xlsx';

// Función auxiliar para sacar coordenadas de links de Google Maps
const parseGoogleMapsLink = (link: any): { lat: number, lng: number } | null => {
  const url = String(link || "");
  // Busca patrones comunes en links de mapas
  try {
    // Intenta detectar coordenadas directas tipo @-42.123,-71.123
    const regex = /@(-?\d+\.\d+),(-?\d+\.\d+)/;
    const match = url.match(regex);
    if (match) return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
    
    // Si usas links cortos (goo.gl), necesitaríamos una API real, 
    // por ahora devolvemos null si no hay coord explícita.
    return null; 
  } catch (e) {
    return null;
  }
};

export const processExcelFile = async (file: File) => {
  return new Promise<number>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0]; // Leemos la primera hoja
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet);

        if (jsonData.length === 0) throw new Error("El archivo está vacío");

        const batch = writeBatch(db);
        let count = 0;

        jsonData.forEach((row: any) => {
          // --- MAPEO DE COLUMNAS SEGÚN TUS FOTOS ---
          
          const coords = parseGoogleMapsLink(row['Link de ubicacion Google Maps del lugar de intervencion 📍 (Optional)']);
          // Usamos DNI como ID, o generamos uno random si falta
          const dni = row['DNI'] || `SQUAD-${Math.floor(Math.random()*100000)}`;

          const newSquad: Squad = {
            id: String(dni),
            
            // 1. Datos Referente
            leaderName: row['Nombre y apellido'] || 'Sin Nombre',
            leaderDni: String(row['DNI'] || ''),
            leaderPhone: String(row['Numero mobil'] || ''),
            lodgingLocation: row['Localidad donde se quedan en comarca (Optional)'],

            // 2. Datos Intervención
            name: row['Nombre de la cuadrilla (Optional)'] || `Cuadrilla ${row['Nombre y apellido']}`,
            membersCount: parseInt(row['Cuantos andan en su cuadrilla? 👷'] || '0'),
            interventionZone: row['Zona de intervencion 📍'] || 'Sin asignar',
            locationLink: row['Link de ubicacion Google Maps del lugar de intervencion 📍 (Optional)'],
            lat: coords?.lat, 
            lng: coords?.lng,

            // 3. Material e Insumos (Detectamos "Si" o "No")
            equipment: {
              hasPPE: String(row['Lleva equipo de proteccion? ⛑️'] || '').toLowerCase().includes('si'),
              ppeDescription: row['Que tipo de equipo de proteccion? ⛑️ (Optional)'],
              hasTools: String(row['Lleva insumos, accesorios y/o herramientas? ⚒️'] || '').toLowerCase().includes('si'),
              toolsDescription: row['Que tipo de insumos, accesorios y/o herramientas? ⚒️ (Optional)'],
              hasMachinery: String(row['Lleva maquinaria grande? 🚜'] || '').toLowerCase().includes('si'),
              machineryDescription: row['Que tipo de maquinaria? 🚜 (Optional)'],
              hasWater: String(row['Lleva agua potable? 💧'] || '').toLowerCase().includes('si'),
            },

            // 4. Competencias
            skills: {
              operational: row['Competencias Operativas (Línea de Fuego)'] || '',
              healthSafety: row['Salud y Seguridad'] || '',
              logistics: row['Logística y Transporte'] || '',
              communications: row['Técnica y Comunicaciones'] || '',
              management: row['Gestión y Mando'] || '',
            },

            // 6. Salida y Regreso
            mission: {
              departureDay: row['Dia de salida'] || '',
              departureTime: row['Hora de salida a terreno estimada'] || '',
              returnTime: row['Hora de regreso de terreno estimada'] || '',
              hasReturned: String(row['La cuadrilla regreso?'] || '').toLowerCase().includes('si'),
              coordinationNotes: row['Informarcion sobre la cuadrilla'] || '',
              lastUpdate: row['Ultima actualisacion de la linea'] || new Date().toISOString()
            }
          };

          // Guardamos en la colección "squads"
          const docRef = doc(db, "squads", String(newSquad.id));
          batch.set(docRef, newSquad);
          count++;
        });

        await batch.commit();
        resolve(count);

      } catch (error) {
        console.error("Error procesando Excel:", error);
        reject(error);
      }
    };

    reader.readAsBinaryString(file);
  });
};
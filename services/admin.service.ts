import { db } from '@/lib/firebase';
import { doc, writeBatch } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import { Squad } from '@/types';

// --- HELPER 1: Extraer coordenadas de enlaces de Google Maps ---
const parseGoogleMapsLink = (link: string | undefined) => {
  if (!link) return null;
  
  // Intento 1: Coordenadas directas en URL (@-42.123,-71.123)
  const regexAt = /@(-?\d+\.\d+),(-?\d+\.\d+)/;
  const matchAt = link.match(regexAt);
  if (matchAt) return { lat: parseFloat(matchAt[1]), lng: parseFloat(matchAt[2]) };

  // Intento 2: Parámetro q= (q=-42.123,-71.123)
  const regexQ = /q=(-?\d+\.\d+),(-?\d+\.\d+)/;
  const matchQ = link.match(regexQ);
  if (matchQ) return { lat: parseFloat(matchQ[1]), lng: parseFloat(matchQ[2]) };

  return null;
};

// --- HELPER 2: Mapear fila de Excel a Objeto Squad ---
// Esta función evita repetir código entre la subida manual y la automática
const mapRowToSquad = (row: any): Squad => {
    // 1. Intentamos sacar coordenadas
    const coords = parseGoogleMapsLink(row['Link de ubicacion Google Maps del lugar de intervencion 📍 (Optional)']);
    
    // 2. Generamos ID
    const dni = row['DNI'] ? String(row['DNI']) : `SQUAD-${Math.floor(Math.random()*100000)}`;
    
    return {
        id: dni,
        leaderName: row['Nombre y apellido'] || 'Sin Nombre',
        leaderDni: dni,
        leaderPhone: String(row['Numero mobil'] || ''),
        lodgingLocation: row['Localidad donde se quedan en comarca (Optional)'] || '', 
        name: row['Nombre de la cuadrilla (Optional)'] || `Cuadrilla ${row['Nombre y apellido'] || dni}`,
        membersCount: parseInt(row['Cuantos andan en su cuadrilla? 👷'] || '0'),
        interventionZone: row['Zona de intervencion 📍'] || 'Sin asignar',
        locationLink: row['Link de ubicacion Google Maps del lugar de intervencion 📍 (Optional)'] || '',
        
        // --- AQUÍ ESTABA EL ERROR ---
        // Si coords existe, usamos .lat. Si no existe, enviamos null (NO undefined)
        lat: coords ? coords.lat : null, 
        lng: coords ? coords.lng : null,
        // -----------------------------

        equipment: {
           hasPPE: String(row['Lleva equipo de proteccion? ⛑️'] || '').toLowerCase().includes('si'),
           ppeDescription: row['Que tipo de equipo de proteccion? ⛑️ (Optional)'] || '',
           hasTools: String(row['Lleva insumos, accesorios y/o herramientas? ⚒️'] || '').toLowerCase().includes('si'),
           toolsDescription: row['Que tipo de insumos, accesorios y/o herramientas? ⚒️ (Optional)'] || '',
           hasMachinery: String(row['Lleva maquinaria grande? 🚜'] || '').toLowerCase().includes('si'),
           machineryDescription: row['Que tipo de maquinaria? 🚜 (Optional)'] || '',
           hasWater: String(row['Lleva agua potable? 💧'] || '').toLowerCase().includes('si'),
        },
        skills: {
           operational: row['Competencias Operativas (Línea de Fuego)'] || '',
           healthSafety: row['Salud y Seguridad'] || '',
           logistics: row['Logística y Transporte'] || '',
           communications: row['Técnica y Comunicaciones'] || '',
           management: row['Gestión y Mando'] || '',
        },
        mission: {
           departureDay: row['Dia de salida'] || '',
           departureTime: row['Hora de salida a terreno estimada'] || '',
           returnTime: row['Hora de regreso de terreno estimada'] || '',
           hasReturned: String(row['La cuadrilla regreso?'] || '').toLowerCase().includes('si'),
           coordinationNotes: row['Informarcion sobre la cuadrilla'] || '',
           lastUpdate: new Date().toISOString()
        }
    };
}

// --- FUNCIÓN 1: PROCESAR ARCHIVO LOCAL (MANUAL) ---
export const processExcelFile = async (file: File): Promise<number> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet);

        const batch = writeBatch(db);
        let count = 0;

        jsonData.forEach((row: any) => {
            const squad = mapRowToSquad(row);
            const docRef = doc(db, "squads", squad.id);
            batch.set(docRef, squad);
            count++;
        });

        await batch.commit();
        resolve(count);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
};

// --- FUNCIÓN 2: SINCRONIZAR DESDE GOOGLE SHEETS (NUEVA) ---
// Esta es la que faltaba y causaba el error
export const syncFromGoogleSheets = async (csvUrl: string): Promise<number> => {
  try {
    // 1. Descargamos el CSV desde la nube
    const response = await fetch(csvUrl);
    if (!response.ok) throw new Error("No se pudo conectar con Google Sheets");
    
    const arrayBuffer = await response.arrayBuffer();

    // 2. Leemos los datos con XLSX
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    // 3. Convertimos a JSON
    const jsonData = XLSX.utils.sheet_to_json(sheet);

    if (jsonData.length === 0) throw new Error("La hoja está vacía");

    // 4. Guardamos en Firebase (Reutilizando la lógica)
    const batch = writeBatch(db);
    let count = 0;

    jsonData.forEach((row: any) => {
       const squad = mapRowToSquad(row);
       const docRef = doc(db, "squads", squad.id);
       batch.set(docRef, squad);
       count++;
    });

    await batch.commit();
    return count;

  } catch (error) {
    console.error("Error en sync:", error);
    throw error;
  }
};
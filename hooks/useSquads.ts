import { useState, useEffect } from 'react';
import { Squad } from '@/types';

export const useSquads = () => {
  const [squads, setSquads] = useState<Squad[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSquads = async () => {
      try {
        // Llamamos a NUESTRA propia API, que hace de puente
        const res = await fetch('/api/squads'); 
        const data = await res.json();
        
        if (data.squads) {
          setSquads(data.squads);
        }
      } catch (error) {
        console.error("Error cargando cuadrillas:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSquads();
    
    // Opcional: Recargar cada 60 segundos automáticamente
    const interval = setInterval(fetchSquads, 60000);
    return () => clearInterval(interval);

  }, []);

  return { squads, loading };
};
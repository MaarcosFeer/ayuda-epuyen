import { useState, useEffect } from 'react';
import { Squad } from '@/types';
import * as squadsService from '@/services/squads.service';

export const useSquads = () => {
  const [squads, setSquads] = useState<Squad[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = squadsService.subscribeToSquads((data) => {
      setSquads(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { squads, loading };
};
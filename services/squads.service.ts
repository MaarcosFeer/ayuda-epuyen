import { db } from '@/lib/firebase';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { Squad } from '@/types';

export const subscribeToSquads = (callback: (squads: Squad[]) => void) => {
  const q = query(collection(db, "squads"));
  return onSnapshot(q, (snapshot) => {
    const squads = snapshot.docs.map(doc => doc.data() as Squad);
    callback(squads);
  });
};
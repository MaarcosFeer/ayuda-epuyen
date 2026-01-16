import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

export async function GET() {
  try {
    const squadsRef = collection(db, 'squads');
    const snapshot = await getDocs(squadsRef);
    
    const squads = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return NextResponse.json(squads);
    
  } catch (error) {
    return NextResponse.json({ error: 'Error fetching squads' }, { status: 500 });
  }
}
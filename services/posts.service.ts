import { db } from '@/lib/firebase';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc, 
  updateDoc, 
  arrayUnion, 
  serverTimestamp 
} from 'firebase/firestore';
import { Post, NewPostForm, HistoryItem, AssignedUser } from '@/types';

const COLLECTION_NAME = 'posts';

// 1. Obtener posts en tiempo real
export const subscribeToPosts = (callback: (posts: Post[]) => void) => {
  const q = query(collection(db, COLLECTION_NAME), orderBy("createdAt", "desc"));
  
  // Retorna la función unsubscribe para limpiar el efecto
  return onSnapshot(q, (snapshot) => {
    const posts = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        // Normalización de datos para evitar errores en posts viejos
        status: data.status || (data.resolved ? 'resuelto' : 'abierto'),
        assignedTo: data.assignedTo || [],
        history: data.history || []
      };
    }) as Post[];
    callback(posts);
  });
};

// 2. Crear un nuevo post
export const createPost = async (postData: NewPostForm, user: any) => {
  return await addDoc(collection(db, COLLECTION_NAME), {
    ...postData,
    userId: user.uid,
    userName: user.displayName,
    userPhoto: user.photoURL,
    resolved: false,
    status: 'abierto',
    createdAt: serverTimestamp()
  });
};

// 3. Eliminar un post
export const deletePost = async (postId: string) => {
  return await deleteDoc(doc(db, COLLECTION_NAME, postId));
};

// 4. Registrar asistencia (La lógica compleja que tenías en page.tsx)
export const addAssistantToPost = async (postId: string, user: any, note: string) => {
  const postRef = doc(db, COLLECTION_NAME, postId);
  
  const historyItem: HistoryItem = {
    action: "en_camino",
    user: user.displayName || "Anónimo",
    userId: user.uid,
    note: note,
    timestamp: new Date()
  };

  const assistant: AssignedUser = { 
    uid: user.uid, 
    name: user.displayName || "Anónimo" 
  };

  return await updateDoc(postRef, {
    status: 'en_proceso',
    assignedTo: arrayUnion(assistant),
    history: arrayUnion(historyItem)
  });
};
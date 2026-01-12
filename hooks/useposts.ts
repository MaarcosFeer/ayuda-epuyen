import { useState, useEffect } from 'react';
import { Post, NewPostForm } from '@/types';
import * as postsService from '@/services/posts.service';

export const usePosts = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 1. Cargar posts al iniciar
  useEffect(() => {
    const unsubscribe = postsService.subscribeToPosts((data) => {
      setPosts(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. Función para crear post
  const addPost = async (formData: NewPostForm, user: any) => {
    try {
      setError(null);
      await postsService.createPost(formData, user);
      return true; // Retornamos true si salió bien
    } catch (err) {
      console.error(err);
      setError("Error al publicar el aviso.");
      return false;
    }
  };

  // 3. Función para borrar post
  const removePost = async (postId: string) => {
    try {
      setError(null);
      await postsService.deletePost(postId);
      return true;
    } catch (err) {
      console.error(err);
      setError("Error al eliminar el aviso.");
      return false;
    }
  };

  // 4. Función para asistir (Yo voy)
  const assistPost = async (postId: string, user: any, note: string) => {
    try {
      setError(null);
      await postsService.addAssistantToPost(postId, user, note);
      return true;
    } catch (err) {
      console.error(err);
      setError("Error al registrar asistencia.");
      return false;
    }
  };

  return { 
    posts, 
    loading, 
    error, 
    addPost, 
    removePost, 
    assistPost 
  };
};
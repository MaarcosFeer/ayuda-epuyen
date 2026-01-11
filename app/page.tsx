"use client";

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import {
  collection, addDoc, onSnapshot,
  query, orderBy, serverTimestamp, doc, deleteDoc,
  Timestamp,
  updateDoc,
  arrayUnion
} from "firebase/firestore";
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  AuthError
} from "firebase/auth";
import { db, auth, googleProvider } from '../lib/firebase';
import {
  AlertTriangle, CheckCircle, Truck, Droplet,
  Home as HomeIcon, Stethoscope, Users, Wrench, X,
  MapPin, Phone, Filter, Plus, LogOut, ShieldCheck, User,
  Map as MapIcon, List as ListIcon, Navigation, Trash2,
  ExternalLink, Info, Clock
} from 'lucide-react';

// --- INTERFACES ---
interface Post {
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
  history?: {
    action: string;
    user: string;
    timestamp: Timestamp | Date; // Aceptamos ambos para facilitar manejo
    note?: string;
  }[];
}

interface NewPostForm {
  type: string;
  category: string;
  title: string;
  description: string;
  location: string;
  contact: string;
  lat?: number;
  lng?: number;
}

// --- IMPORTACIÓN DINÁMICA DE MAPAS ---
const CommunityMap = dynamic(
  () => import('../components/Map').then((mod) => mod.CommunityMap),
  {
    ssr: false,
    loading: () => <div className="h-[400px] w-full bg-slate-100 animate-pulse rounded-xl flex items-center justify-center text-slate-400">Cargando Mapa...</div>
  }
) as React.ComponentType<{
  posts: Post[];
  center?: [number, number];
  zoom?: number;
  key?: string;
}>;

const LocationPicker = dynamic(
  () => import('../components/Map').then((mod) => mod.LocationPicker),
  {
    ssr: false,
    loading: () => <div className="h-[250px] w-full bg-slate-100 animate-pulse rounded-lg">Cargando Mapa...</div>
  }
) as React.ComponentType<{
  onLocationSelect: (lat: number, lng: number) => void;
  center?: [number, number];
}>;

const CATEGORIES = [
  { id: 'agua', label: 'Agua / Alimentos', icon: <Droplet size={18} /> },
  { id: 'logistica', label: 'Transporte', icon: <Truck size={18} /> },
  { id: 'herramientas', label: 'Herramientas / Equipos', icon: <Wrench size={18} /> },
  { id: 'salud', label: 'Salud / Primeros Auxilios', icon: <Stethoscope size={18} /> },
  { id: 'hospedaje', label: 'Hospedaje / Evacuados', icon: <HomeIcon size={18} /> },
  { id: 'animales', label: 'Veterinaria / Mascotas', icon: <AlertTriangle size={18} /> },
  { id: 'voluntarios', label: 'Manos de Obra', icon: <Users size={18} /> },
];

const Card = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden ${className}`}>
    {children}
  </div>
);

const Badge = ({ type, resolved }: { type: string, resolved: boolean }) => {
  if (resolved) return <span className="px-2 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-500 border border-gray-200">RESUELTO</span>;
  return type === 'necesidad'
    ? <span className="px-2 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">SE NECESITA</span>
    : <span className="px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200">SE OFRECE</span>;
};

export default function Home() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);

  // Vista por defecto: Mapa
  const [viewMode, setViewMode] = useState<'list' | 'map'>('map');

  //Vista Formularios Asistencia
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [helpNote, setHelpNote] = useState("");

  // Estado para controlar el centro y zoom del mapa
  const [mapConfig, setMapConfig] = useState({
    center: [-42.23, -71.36] as [number, number],
    zoom: 13,
    key: "default"
  });

  //ESTADOS PARA VER ASISTENTES
  const [showAttendeesModal, setShowAttendeesModal] = useState(false);
  const [postForAttendees, setPostForAttendees] = useState<Post | null>(null);

  const [formData, setFormData] = useState<NewPostForm>({
    type: 'necesidad',
    category: 'agua',
    title: '',
    description: '',
    location: '',
    contact: '',
  });
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    // 1. Detectar Auth
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      if (!currentUser) {
        setShowForm(false);
        if (filterType === 'mine') setFilterType('all');
      }
    });

    // 2. Cargar Posts
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    const unsubscribePosts = onSnapshot(q, (snapshot) => {
      const postsData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          // SI EL POST ES VIEJO Y NO TIENE STATUS, LE ASIGNAMOS 'abierto' O 'resuelto' SEGÚN CORRESPONDA
          status: data.status || (data.resolved ? 'resuelto' : 'abierto'),
          assignedTo: data.assignedTo || [],
          history: data.history || []
        };
      }) as Post[];
      setPosts(postsData);
    },
      (error) => {
        console.error("Error leyendo Firebase: ", error);
      });

    // 3. Detectar Navegador de Instagram/Facebook
    const userAgent = navigator.userAgent || navigator.vendor;
    if (userAgent.includes("Instagram") || userAgent.includes("FBAN") || userAgent.includes("FBAV")) {
      setIsInAppBrowser(true);
    }

    return () => {
      unsubscribeAuth();
      unsubscribePosts();
    };
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      const firebaseError = error as AuthError;
      console.error("Error login:", firebaseError);

      // 1. Si el usuario cerró la ventana voluntariamente, NO mostramos alerta.
      if (firebaseError.code === 'auth/popup-closed-by-user') {
        return;
      }

      // 2. Solo mostramos la ayuda si fue un bloqueo real o error técnico dentro de Instagram
      if (firebaseError.code === 'auth/popup-blocked' || firebaseError.code === 'auth/cancelled-popup-request' || isInAppBrowser) {
        alert("⚠️ No pudimos abrir la ventana de Google.\n\nEs probable que el navegador de Instagram/Facebook la esté bloqueando.\n\nSolución: Toca los 3 puntos (arriba derecha) y elige 'Abrir en el navegador del sistema'.");
      } else {
        alert("Ocurrió un error al intentar ingresar. Por favor intenta nuevamente.");
      }
    }
  };

  const handleLogout = () => signOut(auth);

  const handleLocateOnMap = (lat: number, lng: number) => {
    setMapConfig({
      center: [lat, lng],
      zoom: 16,
      key: `${lat}-${lng}`
    });
    setViewMode('map');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return alert("Debes iniciar sesión para publicar.");

    setIsPublishing(true);
    try {
      await addDoc(collection(db, "posts"), {
        ...formData,
        userId: user.uid,
        userName: user.displayName,
        userPhoto: user.photoURL,
        resolved: false,
        createdAt: serverTimestamp()
      });

      setShowForm(false);
      setFormData({ type: 'necesidad', category: 'agua', title: '', description: '', location: '', contact: '', lat: undefined, lng: undefined });
      setViewMode('map');

      if (formData.lat && formData.lng) {
        setMapConfig({
          center: [formData.lat, formData.lng],
          zoom: 15,
          key: `new-${Date.now()}`
        });
      }

    } catch (error) {
      console.error("Error adding document: ", error);
      alert("Error al publicar.");
    }
    setIsPublishing(false);
  };

  const handleDeletePost = async (post: Post) => {
    if (!user || user.uid !== post.userId) return;
    if (!window.confirm("¿Seguro que quieres ELIMINAR este aviso?")) return;

    try {
      const postRef = doc(db, "posts", post.id);
      await deleteDoc(postRef);
    } catch (error) {
      console.error("Error deleting document: ", error);
      alert("Error al eliminar.");
    }
  };

  const filteredPosts = posts.filter(post => {
    if (filterType === 'mine') {
      return user && post.userId === user.uid;
    }
    if (post.resolved) return false;
    if (filterType !== 'all' && post.type !== filterType) return false;
    if (filterCategory !== 'all' && post.category !== filterCategory) return false;
    return true;
  });

  const handleCommitToHelp = async (post: Post, note: string) => {
    if (!user) return;

    try {
      const postRef = doc(db, "posts", post.id);

      const newHistoryItem = {
        action: "en_camino",
        user: user.displayName || "Anónimo",
        userId: user.uid,
        note: note,
        timestamp: new Date()
      };

      await updateDoc(postRef, {
        status: 'en_proceso',
        assignedTo: arrayUnion({ uid: user.uid, name: user.displayName || "Anónimo" }),
        history: arrayUnion(newHistoryItem)
      });

      // CAMBIO AQUÍ: En vez de alert, usamos el toast verde
      setToast({ message: "¡Gracias! Se marcó tu asistencia.", type: 'success' });

    } catch (error) {
      console.error("Error:", error);
      // CAMBIO AQUÍ: En vez de alert, usamos el toast rojo
      setToast({ message: "Error al registrar asistencia.", type: 'error' });
    }
  };
  const handleOpenHelpModal = (post: Post) => {
    setSelectedPost(post);
    setHelpNote(""); // Limpiamos la nota anterior
    setShowHelpModal(true);
  };

  const submitHelp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPost || !helpNote.trim()) return;

    // Llamamos a tu función original (la que ya creaste antes)
    await handleCommitToHelp(selectedPost, helpNote);

    // Cerramos el modal
    setShowHelpModal(false);
    setSelectedPost(null);
  };
  const activeNeeds = posts.filter(p => p.type === 'necesidad' && !p.resolved).length;
  const activeOffers = posts.filter(p => p.type === 'oferta' && !p.resolved).length;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-10">

      {/* AVISO INSTAGRAM (Solo se muestra si se detecta el navegador interno) */}
      {isInAppBrowser && (
        <div className="bg-indigo-600 text-white text-xs p-2 text-center flex items-center justify-center gap-2 cursor-pointer" onClick={() => alert("Toca los 3 puntos arriba a la derecha > Abrir en navegador")}>
          <ExternalLink size={14} />
          <span>Para mejor funcionamiento, abre esto en Chrome/Safari</span>
        </div>
      )}

      {/* HEADER */}
      <header className="bg-slate-900 text-white sticky top-0 z-50 shadow-lg">
        <div className="max-w-3xl mx-auto px-4 py-3 flex justify-between items-center">
          <div>
            <h1 className="text-lg sm:text-xl font-bold flex items-center gap-2">
              <ShieldCheck className="text-red-500" size={24} />
              Red Epuyén
            </h1>
            <p className="text-[10px] sm:text-xs text-slate-400">Ayuda Comunitaria Verificada</p>
          </div>

          <div className="flex items-center gap-3">
            {!authLoading && (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => user ? setShowForm(true) : alert("🔒 Para publicar un aviso, primero debes iniciar sesión con Google.")}
                  className={`px-3 py-1.5 rounded-lg font-bold text-sm flex items-center gap-2 transition-colors ${user
                    ? "bg-red-600 hover:bg-red-700 text-white shadow-md"
                    : "bg-slate-800 text-slate-500 cursor-not-allowed hover:bg-slate-700"
                    }`}
                >
                  <Plus size={16} /> Publicar
                </button>

                {user ? (
                  <>
                    <img src={user.photoURL || ""} alt="Perfil" className="w-8 h-8 rounded-full border border-slate-600 hidden sm:block" />
                    <button onClick={handleLogout} className="text-slate-400 hover:text-white p-1">
                      <LogOut size={20} />
                    </button>
                  </>
                ) : (
                  <button onClick={handleLogin} className="bg-white text-slate-900 px-4 py-2 rounded-lg font-bold text-sm hover:bg-slate-100 flex items-center gap-2 shadow-sm">
                    <User size={16} /> Entrar
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ESTADÍSTICAS */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 py-3 flex gap-4 text-sm overflow-x-auto">
          <div className="flex items-center gap-2 whitespace-nowrap">
            <span className="font-bold text-red-600">{activeNeeds}</span> Necesidades
          </div>
          <div className="w-px bg-slate-200 h-5"></div>
          <div className="flex items-center gap-2 whitespace-nowrap">
            <span className="font-bold text-green-600">{activeOffers}</span> Recursos
          </div>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 py-6">

        {/* CONTROLES SUPERIORES */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex flex-wrap gap-2 p-1 bg-white rounded-lg border border-slate-200 w-fit shadow-sm">
            <button onClick={() => setFilterType('all')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${filterType === 'all' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>Todo</button>
            <button onClick={() => setFilterType('necesidad')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${filterType === 'necesidad' ? 'bg-red-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>Necesito</button>
            <button onClick={() => setFilterType('oferta')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${filterType === 'oferta' ? 'bg-green-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>Ofrezco</button>
            {user && (
              <button
                onClick={() => { setFilterType('mine'); setViewMode('list'); }}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors border-l ml-1 ${filterType === 'mine' ? 'bg-blue-600 text-white' : 'text-blue-600 hover:bg-blue-50'}`}
              >
                Mis Avisos
              </button>
            )}
          </div>

          <div className="flex gap-2 bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
            <button onClick={() => setViewMode('map')} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'map' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-50'}`}>
              <MapIcon size={16} /> Mapa
            </button>
            <button onClick={() => setViewMode('list')} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'list' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-50'}`}>
              <ListIcon size={16} /> Lista
            </button>
          </div>
        </div>

        {/* Categorías */}
        <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide mb-2">
          <button onClick={() => setFilterCategory('all')} className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border ${filterCategory === 'all' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200'}`}>Todas</button>
          {CATEGORIES.map(cat => (
            <button key={cat.id} onClick={() => setFilterCategory(cat.id)} className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border ${filterCategory === cat.id ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200'}`}>
              {cat.icon} {cat.label}
            </button>
          ))}
        </div>

        {/* CONTENIDO PRINCIPAL */}
        {viewMode === 'map' ? (
          <div className="animate-in fade-in duration-300">
            <CommunityMap
              posts={filteredPosts}
              center={mapConfig.center}
              zoom={mapConfig.zoom}
              key={mapConfig.key}
            />
            <p className="text-center text-xs text-slate-500 mt-2 flex items-center justify-center gap-3">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span> Necesidades</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span> Ofertas</span>
            </p>
          </div>
        ) : (
          <div className="grid gap-4 animate-in fade-in duration-300">
            {filteredPosts.length === 0 ? (
              <div className="text-center py-16 text-slate-400 bg-white rounded-xl border border-dashed border-slate-300">
                <Filter size={32} className="mx-auto mb-2 opacity-50" />
                <p>{filterType === 'mine' ? "No tienes publicaciones activas." : "No hay publicaciones."}</p>
              </div>
            ) : (
              filteredPosts.map(post => {
                const categoryInfo = CATEGORIES.find(c => c.id === post.category) || { icon: <div />, label: post.category };
                const isOwner = user && post.userId === user.uid;
                const date = post.createdAt?.seconds
                  ? new Date(post.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : '...';

                return (
                  <Card key={post.id} className={post.type === 'necesidad' ? 'border-l-4 border-l-red-500' : 'border-l-4 border-l-green-500'}>
                    <div className="p-4 sm:p-5">
                      
                      {/* 1. Header: Categoría y Hora */}
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex gap-2 items-center">
                          <Badge type={post.type} resolved={post.resolved} />
                          <span className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1">
                            {categoryInfo.icon} {categoryInfo.label}
                          </span>
                        </div>
                        <span className="text-xs text-slate-400">{date}</span>
                      </div>

                      {/* 2. Título y Descripción */}
                      <h3 className="text-lg font-bold text-slate-900 mb-1">{post.title}</h3>
                      <p className="text-slate-600 text-sm mb-4 leading-relaxed">{post.description}</p>

                      {/* [ELIMINADO] Aquí estaba la barra gris con ubicación y usuario */}

                      {/* 3. Aviso Visual de Estado (Solo si alguien va en camino) */}
                      {post.status === 'en_proceso' && (
                           <div className="bg-yellow-100 text-yellow-800 p-2 rounded-md mb-3 text-xs font-bold flex items-center gap-2 border border-yellow-200">
                              <Clock size={16}/> 
                              ALGUIEN YA ESTÁ EN CAMINO / ASISTIENDO
                           </div>
                      )}

                      {/* 4. Botones de Acción */}
                      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1"> 
                        
                        {/* Botón Llamar */}
                        <a href={`tel:${post.contact}`} className="bg-slate-900 text-white py-2.5 px-4 rounded-lg font-medium text-sm hover:bg-slate-800 transition-colors flex items-center gap-2 whitespace-nowrap">
                            <Phone size={16} /> Llamar
                        </a>

                        {/* Botón Yo voy */}
                        {post.status === 'abierto' && (
                            <button 
                                onClick={() => user && handleOpenHelpModal(post)}
                                title={!user ? "🔒 Debes iniciar sesión para marcar asistencia" : ""} 
                                className={`flex-1 py-2.5 px-4 rounded-lg font-bold text-sm shadow-sm transition-all flex justify-center items-center gap-2 whitespace-nowrap ${
                                    user ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-slate-200 text-slate-400 cursor-not-allowed" 
                                }`}
                            >
                                ✋ ¡Yo voy!
                            </button>
                        )}
                        
                        {/* Botón Sumarse */}
                        {post.status === 'en_proceso' && (
                            <button 
                                onClick={() => user && handleOpenHelpModal(post)}
                                title={!user ? "🔒 Debes iniciar sesión para marcar asistencia" : ""} 
                                className={`flex-1 py-2.5 px-4 rounded-lg font-bold text-sm shadow-sm transition-all flex justify-center items-center gap-2 whitespace-nowrap ${
                                    user ? "bg-yellow-600 text-white hover:bg-yellow-700" : "bg-slate-200 text-slate-400 cursor-not-allowed" 
                                }`}
                            >
                                ➕ Sumarme
                            </button>
                        )}

                        {/* Botón Ver Asistentes (Abre el Modal, no muestra lista aquí) */}
                        {post.history && post.history.length > 0 && (
                            <button 
                                onClick={() => { setPostForAttendees(post); setShowAttendeesModal(true); }}
                                className="px-4 py-2.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors flex items-center gap-2 font-medium text-sm border border-slate-200 whitespace-nowrap" 
                            >
                                <Users size={16} /> Asistentes
                            </button>
                        )}

                        {/* Botón Mapa */}
                        {post.lat && post.lng && (
                            <button onClick={() => handleLocateOnMap(post.lat!, post.lng!)} className="px-3 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 flex items-center justify-center border border-slate-200" title="Ver ubicación en mapa">
                                <Navigation size={18} />
                            </button>
                        )}

                        {/* Botón Eliminar */}
                        {isOwner && (
                            <button onClick={() => handleDeletePost(post)} className="px-3 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 flex items-center justify-center" title="Eliminar">
                                <Trash2 size={16} />
                            </button>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        )}
      </main>

      {/* MODAL FORMULARIO */}
      {showForm && user && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="text-lg font-bold text-slate-800">Nueva Publicación</h2>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-5">

              {/* Aviso en Formulario si está en Instagram */}
              {isInAppBrowser && (
                <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg text-xs text-yellow-800 flex items-start gap-2">
                  <Info size={16} className="shrink-0 mt-0.5" />
                  <p>El mapa puede funcionar lento en Instagram. Si no puedes marcar la ubicación, escribe la dirección manualmente.</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <label className={`cursor-pointer border-2 rounded-xl p-4 text-center transition-all ${formData.type === 'necesidad' ? 'border-red-500 bg-red-50 text-red-800' : 'border-slate-100 text-slate-400'}`}>
                  <input type="radio" name="type" className="hidden" checked={formData.type === 'necesidad'} onChange={() => setFormData({ ...formData, type: 'necesidad' })} />
                  <AlertTriangle className="mx-auto mb-2" size={24} />
                  <span className="font-bold block">NECESITO</span>
                </label>
                <label className={`cursor-pointer border-2 rounded-xl p-4 text-center transition-all ${formData.type === 'oferta' ? 'border-green-500 bg-green-50 text-green-800' : 'border-slate-100 text-slate-400'}`}>
                  <input type="radio" name="type" className="hidden" checked={formData.type === 'oferta'} onChange={() => setFormData({ ...formData, type: 'oferta' })} />
                  <CheckCircle className="mx-auto mb-2" size={24} />
                  <span className="font-bold block">OFREZCO</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Categoría</label>
                <select className="w-full p-3 border border-slate-300 rounded-lg bg-white" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}>
                  {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>

              <input type="text" placeholder="Título (Ej: Necesito agua)" className="w-full p-3 border border-slate-300 rounded-lg" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} maxLength={60} required />
              <textarea placeholder="Detalles..." className="w-full p-3 border border-slate-300 rounded-lg h-24 resize-none" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} required />

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1 flex justify-between">
                  Ubicación (Mapa)
                  {formData.lat && <span className="text-green-600 text-xs font-normal">✓ Marcado</span>}
                </label>
                <LocationPicker onLocationSelect={(lat, lng) => setFormData({ ...formData, lat, lng })} />
                <p className="text-xs text-slate-500 mt-1 mb-2">Toca el mapa para marcar donde estás.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <input type="text" placeholder="Referencia escrita (Ej: Al lado del kiosco)" className="w-full p-3 border border-slate-300 rounded-lg" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} required />
                <input type="tel" placeholder="Teléfono" className="w-full p-3 border border-slate-300 rounded-lg" value={formData.contact} onChange={(e) => setFormData({ ...formData, contact: e.target.value })} required />
              </div>

              <button type="submit" disabled={isPublishing} className="w-full bg-slate-900 text-white py-3.5 rounded-lg font-bold hover:bg-slate-800 disabled:opacity-50">
                {isPublishing ? 'Publicando...' : 'Confirmar Publicación'}
              </button>
            </form>
          </div>
        </div>
      )}
      {showHelpModal && selectedPost && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100">

            {/* Header del Modal */}
            <div className={`p-4 border-b border-slate-100 flex justify-between items-center ${selectedPost.status === 'en_proceso' ? 'bg-yellow-50' : 'bg-blue-50'}`}>
              <h2 className={`text-lg font-bold flex items-center gap-2 ${selectedPost.status === 'en_proceso' ? 'text-yellow-800' : 'text-slate-900'}`}>
                {selectedPost.status === 'en_proceso' ? (
                  <>➕ Sumarse al equipo</>
                ) : (
                  <>✋ Confirmar Asistencia</>
                )}
              </h2>
              <button onClick={() => setShowHelpModal(false)} className="p-2 hover:bg-black/5 rounded-full text-slate-900 transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Cuerpo del Modal */}
            <form onSubmit={submitHelp} className="p-5 space-y-4">

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-sm text-slate-600">
                <p className="font-semibold text-slate-900 mb-1">Vas a ayudar en:</p>
                <p>"{selectedPost.title}"</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-900 mb-2">
                  ¿Con qué equipo vas o cómo ayudarás?
                </label>
                <textarea
                  autoFocus
                  placeholder="Ej: Voy con mi camioneta 4x4 y palas. Llego en 20 min."
                  className="w-full p-3 border border-slate-300 rounded-lg h-24 resize-none focus:ring-2 focus:ring-slate-800 focus:border-slate-900 outline-none transition-all"
                  value={helpNote}
                  onChange={(e) => setHelpNote(e.target.value)}
                  required
                />
                <p className="text-xs text-slate-900 mt-1 text-right">Esta info queda pública en el historial.</p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowHelpModal(false)}
                  className="flex-1 px-4 py-3 bg-white border border-slate-300 text-slate-900 rounded-lg font-bold hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`flex-1 px-4 py-3 text-white rounded-lg font-bold shadow-md transition-colors ${selectedPost.status === 'en_proceso'
                    ? 'bg-yellow-600 hover:bg-yellow-700'
                    : 'bg-slate-900 hover:bg-slate-800'
                    }`}
                >
                  Confirmar que voy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {toast && (
        <div className={`fixed bottom-5 right-5 z-[100] px-6 py-4 rounded-xl shadow-2xl font-bold text-white flex items-center gap-3 animate-in slide-in-from-right duration-300 ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
          }`}>
          {toast.type === 'success' ? <CheckCircle size={24} /> : <AlertTriangle size={24} />}
          {toast.message}
        </div>
      )}
      {showAttendeesModal && postForAttendees && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden max-h-[80vh] flex flex-col">
                
                {/* Header */}
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <Users size={20} className="text-blue-600"/> 
                        Voluntarios en camino
                    </h3>
                    <button onClick={() => setShowAttendeesModal(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-500">
                        <X size={20} />
                    </button>
                </div>

                {/* Lista */}
                <div className="p-4 overflow-y-auto">
                    {postForAttendees.history?.filter(h => h.action === 'en_camino').length === 0 ? (
                        <p className="text-center text-slate-400 py-4">Aún no hay voluntarios registrados en el historial.</p>
                    ) : (
                        <div className="space-y-3">
                            {postForAttendees.history
                                ?.filter(h => h.action === 'en_camino')
                                .map((item, index) => (
                                <div key={index} className="flex gap-3 items-start bg-slate-50 p-3 rounded-lg border border-slate-100">
                                    <div className="bg-blue-100 text-blue-600 w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-xs">
                                        {item.user.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm text-slate-900">{item.user}</p>
                                        <p className="text-xs text-slate-400 mb-1">
                                            {/* Convierte Timestamp a hora legible */}
                                            {item.timestamp && typeof (item.timestamp as Timestamp).toDate === 'function' 
                                                ? (item.timestamp as Timestamp).toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                                                : new Date(item.timestamp as any).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                                            }
                                        </p>
                                        {item.note && (
                                            <div className="text-sm text-slate-700 bg-white p-2 rounded border border-slate-200 mt-1">
                                                "{item.note}"
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                
                <div className="p-4 border-t border-slate-100 bg-slate-50">
                    <button onClick={() => setShowAttendeesModal(false)} className="w-full py-2 bg-white border border-slate-300 rounded-lg text-slate-700 font-bold text-sm hover:bg-slate-100">
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
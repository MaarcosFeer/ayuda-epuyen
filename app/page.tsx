"use client";

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { 
  collection, addDoc, onSnapshot, 
  query, orderBy, serverTimestamp, doc, updateDoc, deleteDoc,
  Timestamp
} from "firebase/firestore";
import { 
  signInWithPopup, GoogleAuthProvider, 
  signOut, onAuthStateChanged, User as FirebaseUser 
} from "firebase/auth";
import { db, auth, googleProvider } from '../lib/firebase';
import { 
  AlertTriangle, CheckCircle, Truck, Droplet, 
  Home as HomeIcon, Stethoscope, Users, Wrench, X, 
  MapPin, Phone, Filter, Plus, LogOut, ShieldCheck, User,
  Map as MapIcon, List as ListIcon, Navigation, Trash2 
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
  { id: 'logistica', label: 'Transporte / 4x4', icon: <Truck size={18} /> },
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
  
  // Vista por defecto: Mapa
  const [viewMode, setViewMode] = useState<'list' | 'map'>('map');
  
  // Estado para controlar el centro y zoom del mapa
  const [mapConfig, setMapConfig] = useState({
    center: [-42.23, -71.36] as [number, number],
    zoom: 13,
    key: "default" 
  });

  const [formData, setFormData] = useState<NewPostForm>({
    type: 'necesidad',
    category: 'agua',
    title: '',
    description: '',
    location: '',
    contact: '',
  });

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      if (!currentUser) {
        setShowForm(false);
        if (filterType === 'mine') setFilterType('all');
      }
    });

    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    const unsubscribePosts = onSnapshot(q, (snapshot) => {
      const postsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Post[];
      setPosts(postsData);
    });

    return () => {
      unsubscribeAuth();
      unsubscribePosts();
    };
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Error login:", error);
      alert("Error al iniciar sesión.");
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
      
      // 1. Cerramos el formulario
      setShowForm(false);
      
      // 2. Limpiamos los datos
      setFormData({ type: 'necesidad', category: 'agua', title: '', description: '', location: '', contact: '', lat: undefined, lng: undefined });
      
      // 3. CAMBIO CLAVE: Forzamos la vista de mapa para que el usuario vea su pin creado
      setViewMode('map');
      
      // 4. Opcional: Si el usuario marcó ubicación, centramos el mapa ahí
      if (formData.lat && formData.lng) {
        setMapConfig({
            center: [formData.lat, formData.lng],
            zoom: 15,
            key: `new-${Date.now()}` // Key única para forzar recentrado
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

  const activeNeeds = posts.filter(p => p.type === 'necesidad' && !p.resolved).length;
  const activeOffers = posts.filter(p => p.type === 'oferta' && !p.resolved).length;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-10">
      
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
                  onClick={() => user ? setShowForm(true) : alert("🔒 Para publicar un aviso, primero debes iniciar sesión.")}
                  className={`px-3 py-1.5 rounded-lg font-bold text-sm flex items-center gap-2 transition-colors ${
                    user 
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
                <p className="text-center text-xs text-slate-500 mt-2">
                    🔴 Necesidades | 🟢 Ofertas
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
                const categoryInfo = CATEGORIES.find(c => c.id === post.category) || { icon: <div/>, label: post.category };
                const isOwner = user && post.userId === user.uid;
                const date = post.createdAt?.seconds 
                    ? new Date(post.createdAt.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) 
                    : '...';

                return (
                    <Card key={post.id} className={post.type === 'necesidad' ? 'border-l-4 border-l-red-500' : 'border-l-4 border-l-green-500'}>
                    <div className="p-4 sm:p-5">
                        <div className="flex justify-between items-start mb-3">
                        <div className="flex gap-2 items-center">
                            <Badge type={post.type} resolved={post.resolved} />
                            <span className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1">
                            {categoryInfo.icon} {categoryInfo.label}
                            </span>
                        </div>
                        <span className="text-xs text-slate-400">{date}</span>
                        </div>

                        <h3 className="text-lg font-bold text-slate-900 mb-1">{post.title}</h3>
                        <p className="text-slate-600 text-sm mb-4 leading-relaxed">{post.description}</p>

                        <div className="flex flex-col sm:flex-row gap-3 text-sm bg-slate-50 p-3 rounded-lg border border-slate-100 mb-4">
                        <div className="flex items-center gap-2 text-slate-700 font-medium">
                            <MapPin size={16} className="text-slate-400" />
                            {post.location || "Sin ubicación"}
                        </div>
                        <div className="hidden sm:block w-px h-auto bg-slate-200"></div>
                        <div className="flex items-center gap-2 text-slate-700 font-medium">
                            {post.userPhoto ? <img src={post.userPhoto} alt="User" className="w-5 h-5 rounded-full" /> : <User size={16} className="text-slate-400" />}
                            {post.userName || "Verificado"}
                        </div>
                        </div>

                        <div className="flex gap-3">
                        <a href={`tel:${post.contact}`} className="flex-1 bg-slate-900 text-white py-2.5 rounded-lg text-center font-medium text-sm hover:bg-slate-800 transition-colors flex justify-center items-center gap-2">
                            <Phone size={16} /> {post.contact}
                        </a>
                        {post.lat && post.lng && (
                          <button onClick={() => handleLocateOnMap(post.lat!, post.lng!)} className="px-3 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 flex items-center justify-center border border-slate-200" title="Ver ubicación en mapa">
                            <Navigation size={18} />
                          </button>
                        )}
                        {isOwner && (
                            <button onClick={() => handleDeletePost(post)} className="px-4 py-2 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 hover:text-red-700 transition-colors flex items-center gap-2" title="Eliminar publicación">
                            <Trash2 size={16} /> Eliminar
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
              <div className="grid grid-cols-2 gap-4">
                <label className={`cursor-pointer border-2 rounded-xl p-4 text-center transition-all ${formData.type === 'necesidad' ? 'border-red-500 bg-red-50 text-red-800' : 'border-slate-100 text-slate-400'}`}>
                  <input type="radio" name="type" className="hidden" checked={formData.type === 'necesidad'} onChange={() => setFormData({...formData, type: 'necesidad'})} />
                  <AlertTriangle className="mx-auto mb-2" size={24} />
                  <span className="font-bold block">NECESITO</span>
                </label>
                <label className={`cursor-pointer border-2 rounded-xl p-4 text-center transition-all ${formData.type === 'oferta' ? 'border-green-500 bg-green-50 text-green-800' : 'border-slate-100 text-slate-400'}`}>
                  <input type="radio" name="type" className="hidden" checked={formData.type === 'oferta'} onChange={() => setFormData({...formData, type: 'oferta'})} />
                  <CheckCircle className="mx-auto mb-2" size={24} />
                  <span className="font-bold block">OFREZCO</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Categoría</label>
                <select className="w-full p-3 border border-slate-300 rounded-lg bg-white" value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})}>
                  {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>

              <input type="text" placeholder="Título (Ej: Necesito agua)" className="w-full p-3 border border-slate-300 rounded-lg" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} maxLength={60} required />
              <textarea placeholder="Detalles..." className="w-full p-3 border border-slate-300 rounded-lg h-24 resize-none" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} required />
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1 flex justify-between">
                    Ubicación (Mapa)
                    {formData.lat && <span className="text-green-600 text-xs font-normal">✓ Marcado</span>}
                </label>
                <LocationPicker onLocationSelect={(lat, lng) => setFormData({...formData, lat, lng})} />
                <p className="text-xs text-slate-500 mt-1 mb-2">Toca el mapa para marcar donde estás.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <input type="text" placeholder="Referencia escrita (Ej: Al lado del kiosco)" className="w-full p-3 border border-slate-300 rounded-lg" value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} required />
                <input type="tel" placeholder="Teléfono" className="w-full p-3 border border-slate-300 rounded-lg" value={formData.contact} onChange={(e) => setFormData({...formData, contact: e.target.value})} required />
              </div>

              <button type="submit" disabled={isPublishing} className="w-full bg-slate-900 text-white py-3.5 rounded-lg font-bold hover:bg-slate-800 disabled:opacity-50">
                {isPublishing ? 'Publicando...' : 'Confirmar Publicación'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
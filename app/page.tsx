"use client";

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { 
  Filter, X, AlertTriangle, CheckCircle, Info, Users, Map as MapIcon, List as ListIcon 
} from 'lucide-react';

// --- 1. IMPORTS DE TU ARQUITECTURA LIMPIA ---
import { Post, NewPostForm } from '@/types';
import { CATEGORIES } from '@/constants/categories';
import { useAuth } from '@/hooks/useauth';
import { usePosts } from '@/hooks/useposts';
import { formatTime } from '@/utils/DateUtils';

// --- 2. IMPORTS DE COMPONENTES VISUALES ---
import { Header } from '@/components/layout/Header';
import { StatsBar } from '@/components/layout/StatsBar';
import { PostCard } from '@/components/features/posts/PostCard';

// --- 3. IMPORTACIÓN DE MAPA (Asegúrate de que la ruta coincida donde moviste el archivo) ---
const CommunityMap = dynamic(
  () => import('@/components/features/map/Map').then((mod) => mod.CommunityMap),
  { ssr: false, loading: () => <div className="h-[400px] w-full bg-slate-100 animate-pulse rounded-xl flex items-center justify-center text-slate-400">Cargando Mapa...</div> }
) as React.ComponentType<{ posts: Post[]; center?: [number, number]; zoom?: number; key?: string; }>;

const LocationPicker = dynamic(
  () => import('@/components/features/map/Map').then((mod) => mod.LocationPicker),
  { ssr: false, loading: () => <div className="h-[250px] w-full bg-slate-100 animate-pulse rounded-lg">Cargando Mapa...</div> }
) as React.ComponentType<{ onLocationSelect: (lat: number, lng: number) => void; center?: [number, number]; }>;


export default function Home() {
  // --- A. HOOKS (Lógica de Negocio delegada) ---
  const { user, loading: authLoading, login, logout } = useAuth();
  const { posts, addPost, removePost, assistPost } = usePosts();

  // --- B. ESTADOS LOCALES (Solo UI / Modales) ---
  const [filterType, setFilterType] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('map');
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  // Estados de los Modales
  const [showForm, setShowForm] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [helpNote, setHelpNote] = useState("");
  const [showAttendeesModal, setShowAttendeesModal] = useState(false);
  const [postForAttendees, setPostForAttendees] = useState<Post | null>(null);

  const [formData, setFormData] = useState<NewPostForm>({
    type: 'necesidad', category: 'agua', title: '', description: '', location: '', contact: '',
  });

  const [mapConfig, setMapConfig] = useState({
    center: [-42.23, -71.36] as [number, number], zoom: 13, key: "default"
  });

  // Efectos UI
  useEffect(() => {
    const userAgent = navigator.userAgent || navigator.vendor;
    if (userAgent.includes("Instagram") || userAgent.includes("FBAN") || userAgent.includes("FBAV")) {
      setIsInAppBrowser(true);
    }
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // --- C. HANDLERS (Conectan la UI con los Hooks) ---

  const handleLocateOnMap = (lat: number, lng: number) => {
    setMapConfig({ center: [lat, lng], zoom: 16, key: `${lat}-${lng}` });
    setViewMode('map');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return alert("Debes iniciar sesión.");
    setIsPublishing(true);

    const success = await addPost(formData, user); // <-- Hook en acción
    
    if (success) {
      setShowForm(false);
      setFormData({ type: 'necesidad', category: 'agua', title: '', description: '', location: '', contact: '', lat: undefined, lng: undefined });
      setToast({ message: "¡Publicado con éxito!", type: 'success' });
      setViewMode('map');
      if (formData.lat && formData.lng) {
        setMapConfig({ center: [formData.lat, formData.lng], zoom: 15, key: `new-${Date.now()}` });
      }
    } else {
      setToast({ message: "Error al publicar.", type: 'error' });
    }
    setIsPublishing(false);
  };

  const handleDelete = async (post: Post) => {
    if (!confirm("¿Eliminar este aviso?")) return;
    const success = await removePost(post.id); // <-- Hook en acción
    if (success) setToast({ message: "Eliminado correctamente", type: 'success' });
    else setToast({ message: "Error al eliminar", type: 'error' });
  };

  const handleOpenHelp = (post: Post) => {
    setSelectedPost(post);
    setHelpNote("");
    setShowHelpModal(true);
  };

  const submitHelp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPost || !helpNote.trim() || !user) return;

    const success = await assistPost(selectedPost.id, user, helpNote); // <-- Hook en acción

    if (success) {
      setToast({ message: "¡Gracias! Se marcó tu asistencia.", type: 'success' });
      setShowHelpModal(false);
      setSelectedPost(null);
    } else {
      setToast({ message: "Error al registrar asistencia.", type: 'error' });
    }
  };

  // --- D. LÓGICA DE FILTRADO (UI) ---
  const filteredPosts = posts.filter(post => {
    if (filterType === 'mine') return user && post.userId === user.uid;
    if (post.resolved) return false;
    if (filterType !== 'all' && post.type !== filterType) return false;
    if (filterCategory !== 'all' && post.category !== filterCategory) return false;
    return true;
  });

  const activeNeeds = posts.filter(p => p.type === 'necesidad' && !p.resolved).length;
  const activeOffers = posts.filter(p => p.type === 'oferta' && !p.resolved).length;

  // --- E. RENDER (VISTA) ---
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-10">

      {/* 1. Header Refactorizado */}
      <Header 
        user={user} 
        loading={authLoading} 
        onLogin={login} 
        onLogout={logout} 
        onOpenForm={() => setShowForm(true)} 
      />

      {/* 2. Stats Refactorizado */}
      <StatsBar needsCount={activeNeeds} offersCount={activeOffers} />

      <main className="max-w-3xl mx-auto px-4 py-6">
        
        {/* Barra de Filtros (Todavía en page.tsx, ideal para refactorizar luego) */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex flex-wrap gap-2 p-1 bg-white rounded-lg border border-slate-200 w-fit shadow-sm">
            <button onClick={() => setFilterType('all')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${filterType === 'all' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>Todo</button>
            <button onClick={() => setFilterType('necesidad')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${filterType === 'necesidad' ? 'bg-red-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>Necesito</button>
            <button onClick={() => setFilterType('oferta')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${filterType === 'oferta' ? 'bg-green-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>Ofrezco</button>
            {user && (
              <button onClick={() => { setFilterType('mine'); setViewMode('list'); }} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors border-l ml-1 ${filterType === 'mine' ? 'bg-blue-600 text-white' : 'text-blue-600 hover:bg-blue-50'}`}>Mis Avisos</button>
            )}
          </div>
          <div className="flex gap-2 bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
            <button onClick={() => setViewMode('map')} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'map' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-50'}`}><MapIcon size={16} /> Mapa</button>
            <button onClick={() => setViewMode('list')} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'list' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-50'}`}><ListIcon size={16} /> Lista</button>
          </div>
        </div>

        {/* Categorías */}
        <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide mb-2">
          <button onClick={() => setFilterCategory('all')} className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border ${filterCategory === 'all' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200'}`}>Todas</button>
          {CATEGORIES.map(cat => (
            <button key={cat.id} onClick={() => setFilterCategory(cat.id)} className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border ${filterCategory === cat.id ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200'}`}>{cat.icon} {cat.label}</button>
          ))}
        </div>

        {/* Contenido Principal */}
        {viewMode === 'map' ? (
          <div className="animate-in fade-in duration-300">
            <CommunityMap posts={filteredPosts} center={mapConfig.center} zoom={mapConfig.zoom} key={mapConfig.key} />
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
                <p>No hay publicaciones.</p>
              </div>
            ) : (
              // 3. LA TARJETA REFACTORIZADA
              filteredPosts.map(post => (
                <PostCard
                  key={post.id}
                  post={post}
                  currentUser={user}
                  onAssist={handleOpenHelp}
                  onDelete={handleDelete}
                  onLocate={handleLocateOnMap}
                  onViewAssistants={(p) => { setPostForAttendees(p); setShowAttendeesModal(true); }}
                />
              ))
            )}
          </div>
        )}
      </main>

      {/* --- MODALES (Toast, Formulario, Ayuda, Asistentes) --- */}
      
      {toast && (
        <div className={`fixed bottom-5 right-5 z-[100] px-6 py-4 rounded-xl shadow-2xl font-bold text-white flex items-center gap-3 animate-in slide-in-from-right duration-300 ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.type === 'success' ? <CheckCircle size={24} /> : <AlertTriangle size={24} />} {toast.message}
        </div>
      )}

      {/* Modal Formulario */}
      {showForm && user && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="text-lg font-bold text-slate-800">Nueva Publicación</h2>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-5">
              {isInAppBrowser && <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg text-xs text-yellow-800 flex items-start gap-2"><Info size={16} className="shrink-0 mt-0.5" /> <p>En Instagram, si el mapa falla, escribe la dirección.</p></div>}
              <div className="grid grid-cols-2 gap-4">
                <label className={`cursor-pointer border-2 rounded-xl p-4 text-center transition-all ${formData.type === 'necesidad' ? 'border-red-500 bg-red-50 text-red-800' : 'border-slate-100 text-slate-400'}`}>
                  <input type="radio" name="type" className="hidden" checked={formData.type === 'necesidad'} onChange={() => setFormData({ ...formData, type: 'necesidad' })} /><AlertTriangle className="mx-auto mb-2" size={24} /><span className="font-bold block">NECESITO</span>
                </label>
                <label className={`cursor-pointer border-2 rounded-xl p-4 text-center transition-all ${formData.type === 'oferta' ? 'border-green-500 bg-green-50 text-green-800' : 'border-slate-100 text-slate-400'}`}>
                  <input type="radio" name="type" className="hidden" checked={formData.type === 'oferta'} onChange={() => setFormData({ ...formData, type: 'oferta' })} /><CheckCircle className="mx-auto mb-2" size={24} /><span className="font-bold block">OFREZCO</span>
                </label>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Categoría</label>
                <select className="w-full p-3 border border-slate-300 rounded-lg bg-white" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}>
                  {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>
              <input type="text" placeholder="Título" className="w-full p-3 border border-slate-300 rounded-lg" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required />
              <textarea placeholder="Detalles..." className="w-full p-3 border border-slate-300 rounded-lg h-24 resize-none" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} required />
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1 flex justify-between">Ubicación (Mapa) {formData.lat && <span className="text-green-600 text-xs font-normal">✓ Marcado</span>}</label>
                <LocationPicker onLocationSelect={(lat, lng) => setFormData({ ...formData, lat, lng })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input type="text" placeholder="Referencia" className="w-full p-3 border border-slate-300 rounded-lg" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} required />
                <input type="tel" placeholder="Teléfono" className="w-full p-3 border border-slate-300 rounded-lg" value={formData.contact} onChange={(e) => setFormData({ ...formData, contact: e.target.value })} required />
              </div>
              <button type="submit" disabled={isPublishing} className="w-full bg-slate-900 text-white py-3.5 rounded-lg font-bold hover:bg-slate-800 disabled:opacity-50">{isPublishing ? 'Publicando...' : 'Confirmar Publicación'}</button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Asistencia */}
      {showHelpModal && selectedPost && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-bold text-slate-900">Confirmar Asistencia</h2>
              <button onClick={() => setShowHelpModal(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-500"><X size={20} /></button>
            </div>
            <form onSubmit={submitHelp} className="p-5 space-y-4">
              <p className="text-sm text-slate-600">Vas a ayudar en: <strong>{selectedPost.title}</strong></p>
              <textarea autoFocus placeholder="¿Cómo ayudarás?" className="w-full p-3 border border-slate-300 rounded-lg h-24 resize-none" value={helpNote} onChange={(e) => setHelpNote(e.target.value)} required />
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowHelpModal(false)} className="flex-1 py-3 border rounded-lg">Cancelar</button>
                <button type="submit" className="flex-1 py-3 bg-slate-900 text-white rounded-lg font-bold">Confirmar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Ver Asistentes */}
      {showAttendeesModal && postForAttendees && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden max-h-[80vh] flex flex-col">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2"><Users size={20} className="text-blue-600"/> Voluntarios</h3>
                    <button onClick={() => setShowAttendeesModal(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-500"><X size={20} /></button>
                </div>
                <div className="p-4 overflow-y-auto">
                    {postForAttendees.history?.filter(h => h.action === 'en_camino').length === 0 ? <p className="text-center text-slate-400 py-4">Aún no hay voluntarios.</p> : (
                        <div className="space-y-3">
                            {postForAttendees.history?.filter(h => h.action === 'en_camino').map((item, index) => (
                                <div key={index} className="flex gap-3 items-start bg-slate-50 p-3 rounded-lg border border-slate-100">
                                    <div className="bg-blue-100 text-blue-600 w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-xs">{item.user.charAt(0).toUpperCase()}</div>
                                    <div>
                                        <p className="font-bold text-sm text-slate-900">{item.user}</p>
                                        <p className="text-xs text-slate-400 mb-1">{formatTime(item.timestamp)}</p>
                                        {item.note && <div className="text-sm text-slate-700 bg-white p-2 rounded border border-slate-200 mt-1">"{item.note}"</div>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}

    </div>
  );
};
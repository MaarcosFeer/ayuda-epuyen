import React from 'react';
import { Phone, Navigation, Trash2, Users, Clock } from 'lucide-react';
import { Post } from '@/types';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { getCategoryInfo } from '@/constants/categories'; // Asegúrate de haber creado este en el paso 2
import { formatTime } from '@/utils/DateUtils'; // Asegúrate de haber creado este en el paso 2

interface PostCardProps {
  post: Post;
  currentUser: any; // User de Firebase
  onAssist: (post: Post) => void;
  onDelete: (post: Post) => void;
  onViewAssistants: (post: Post) => void;
  onLocate: (lat: number, lng: number) => void;
}

export const PostCard = ({ 
  post, 
  currentUser, 
  onAssist, 
  onDelete, 
  onViewAssistants, 
  onLocate 
}: PostCardProps) => {
  
  const categoryInfo = getCategoryInfo(post.category);
  const isOwner = currentUser && post.userId === currentUser.uid;
  const date = formatTime(post.createdAt);

  return (
    <Card className={post.type === 'necesidad' ? 'border-l-4 border-l-red-500' : 'border-l-4 border-l-green-500'}>
      <div className="p-4 sm:p-5">
        
        {/* 1. Header */}
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

        {/* 3. Aviso Visual (Solo si en proceso) */}
        {post.status === 'en_proceso' && (
             <div className="bg-yellow-100 text-yellow-800 p-2 rounded-md mb-3 text-xs font-bold flex items-center gap-2 border border-yellow-200">
                <Clock size={16}/> 
                ALGUIEN YA ESTÁ EN CAMINO / ASISTIENDO
             </div>
        )}

        {/* 4. Botones */}
        <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1"> 
          
          <a href={`tel:${post.contact}`} className="bg-slate-900 text-white py-2.5 px-4 rounded-lg font-medium text-sm hover:bg-slate-800 transition-colors flex items-center gap-2 whitespace-nowrap">
              <Phone size={16} /> Llamar
          </a>

          {/* Botón Yo voy */}
          {post.status === 'abierto' && (
              <button 
                  onClick={() => currentUser && onAssist(post)}
                  title={!currentUser ? "🔒 Debes iniciar sesión" : ""} 
                  className={`flex-1 py-2.5 px-4 rounded-lg font-bold text-sm shadow-sm transition-all flex justify-center items-center gap-2 whitespace-nowrap ${
                      currentUser ? "bg-slate-900 text-white hover:bg-slate-800" : "bg-slate-200 text-slate-400 cursor-not-allowed" 
                  }`}
              >
                  ✋ ¡Yo voy!
              </button>
          )}
          
          {/* Botón Sumarse */}
          {post.status === 'en_proceso' && (
              <button 
                  onClick={() => currentUser && onAssist(post)}
                  title={!currentUser ? "🔒 Debes iniciar sesión" : ""} 
                  className={`flex-1 py-2.5 px-4 rounded-lg font-bold text-sm shadow-sm transition-all flex justify-center items-center gap-2 whitespace-nowrap ${
                      currentUser ? "bg-yellow-600 text-white hover:bg-yellow-700" : "bg-slate-200 text-slate-400 cursor-not-allowed" 
                  }`}
              >
                  ➕ Sumarme
              </button>
          )}

          {/* Botón Ver Asistentes */}
          {post.history && post.history.length > 0 && (
              <button 
                  onClick={() => onViewAssistants(post)}
                  className="px-4 py-2.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors flex items-center gap-2 font-medium text-sm border border-slate-200 whitespace-nowrap" 
              >
                  <Users size={16} /> Asistentes
              </button>
          )}

          {/* Botón Mapa */}
          {post.lat && post.lng && (
              <button onClick={() => onLocate(post.lat!, post.lng!)} className="px-3 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 flex items-center justify-center border border-slate-200" title="Ver ubicación en mapa">
                  <Navigation size={18} />
              </button>
          )}

          {/* Botón Eliminar */}
          {isOwner && (
              <button onClick={() => onDelete(post)} className="px-3 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 flex items-center justify-center" title="Eliminar">
                  <Trash2 size={16} />
              </button>
          )}
        </div>
      </div>
    </Card>
  );
};
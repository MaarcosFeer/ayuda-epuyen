"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useauth'; // Asegúrate que el nombre del archivo coincida (useAuth.ts)
import { useRouter } from 'next/navigation'; // <--- Importante para redireccionar
import { processExcelFile } from '@/services/admin.service';
import { Shield, Upload, FileSpreadsheet, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';

export default function AdminPage() {
  // 1. Obtenemos 'profile' para ver el rol y 'loading' para esperar a Firebase
  const { user, profile, loading: authLoading } = useAuth(); 
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false); // Renombré loading a processing para no confundir con authLoading
  const [status, setStatus] = useState<{msg: string, type: 'success' | 'error'} | null>(null);

  // --- 2. CANDADO DE SEGURIDAD ---
  useEffect(() => {
    // Solo ejecutamos si Firebase ya terminó de cargar
    if (!authLoading) {
      // Si no hay usuario O el rol no es 'admin', lo echamos
      if (!user || profile?.role !== 'admin') {
        router.push('/'); 
      }
    }
  }, [user, profile, authLoading, router]);

  // --- 3. PANTALLA DE CARGA / BLOQUEO ---
  // Mientras verificamos permisos, mostramos un spinner y no la interfaz de admin
  if (authLoading || profile?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <Loader2 className="animate-spin text-slate-400" size={48} />
      </div>
    );
  }

  // --- 4. LÓGICA DE SUBIDA (Solo llega aquí si es Admin) ---
  const handleUpload = async () => {
    if (!file) return;
    setProcessing(true);
    setStatus(null);

    try {
      const count = await processExcelFile(file);
      setStatus({ msg: `✅ Éxito: Se cargaron ${count} cuadrillas.`, type: 'success' });
    } catch (error) {
      console.error(error);
      setStatus({ msg: "❌ Error al procesar. Revisa que el Excel tenga las columnas correctas.", type: 'error' });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-6 flex flex-col items-center justify-center">
      <div className="bg-white p-8 rounded-xl shadow-xl max-w-md w-full text-center border border-slate-200 animate-in fade-in zoom-in duration-300">
        
        <div className="bg-slate-900 text-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
          <Shield size={32} />
        </div>
        
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Panel de Comando</h1>
        <p className="text-slate-500 mb-8 text-sm">
            Acceso Autorizado: <span className="font-bold text-slate-800">{profile?.displayName}</span>
        </p>

        {/* Zona de Drop */}
        <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 mb-6 hover:bg-slate-50 transition-colors cursor-pointer relative group">
            <input 
                type="file" 
                accept=".xlsx, .xls, .csv" 
                onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            {file ? (
                <div className="text-blue-600 font-bold flex flex-col items-center animate-in fade-in">
                    <FileSpreadsheet size={40} className="mb-2" />
                    <span className="text-sm truncate max-w-[200px]">{file.name}</span>
                </div>
            ) : (
                <div className="text-slate-400 flex flex-col items-center group-hover:text-slate-600">
                    <Upload size={40} className="mb-2" />
                    <span className="text-sm font-medium">Sube el Excel aquí</span>
                </div>
            )}
        </div>

        {/* Mensajes de Estado */}
        {status && (
            <div className={`p-4 rounded-lg text-sm font-bold mb-6 flex items-center gap-2 text-left animate-in slide-in-from-bottom-2 ${status.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {status.type === 'success' ? <CheckCircle size={18}/> : <AlertTriangle size={18}/>}
                {status.msg}
            </div>
        )}

        {/* Botón */}
        <button 
            onClick={handleUpload}
            disabled={!file || processing}
            className={`w-full py-3 rounded-lg font-bold text-white transition-all shadow-md ${!file || processing ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg'}`}
        >
            {processing ? (
                <span className="flex items-center justify-center gap-2">
                    <Loader2 className="animate-spin" size={20} /> Procesando...
                </span>
            ) : 'Importar Datos'}
        </button>
        
        <a href="/" className="block mt-6 text-sm text-slate-400 hover:text-slate-800 transition-colors">← Volver al Mapa</a>
      </div>
    </div>
  );
}

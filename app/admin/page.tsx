"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth'; 
import { useRouter } from 'next/navigation'; 
// Importamos ambas funciones del servicio
import { processExcelFile, syncFromGoogleSheets } from '@/services/admin.service';
// Iconos para la UI
import { Shield, Upload, FileSpreadsheet, CheckCircle, AlertTriangle, Loader2, RefreshCw, Link as LinkIcon, Save } from 'lucide-react';
// Firebase Imports para guardar la configuración
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function AdminPage() {
  const { user, profile, loading: authLoading } = useAuth(); 
  const router = useRouter();

  // Estados de carga y feedback
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState<{msg: string, type: 'success' | 'error'} | null>(null);

  // Estados para la URL de Google Sheets
  const [sheetUrl, setSheetUrl] = useState(''); // El texto del input
  const [savedUrl, setSavedUrl] = useState(''); // La URL confirmada en base de datos

  // --- 1. CANDADO DE SEGURIDAD ---
  useEffect(() => {
    if (!authLoading) {
      if (!user || profile?.role !== 'admin') {
        router.push('/'); 
      }
    }
  }, [user, profile, authLoading, router]);

  // --- 2. RECUPERAR CONFIGURACIÓN AL CARGAR ---
  useEffect(() => {
    const fetchConfig = async () => {
      if (profile?.role === 'admin') {
        try {
            // Buscamos en la colección 'config', documento 'general'
            const docRef = doc(db, "config", "general");
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists() && docSnap.data().sheetsCsvUrl) {
                const url = docSnap.data().sheetsCsvUrl;
                setSavedUrl(url); // Guardamos en memoria para usar
                setSheetUrl(url); // Rellenamos el input visualmente
            }
        } catch (error) {
            console.error("Error cargando configuración:", error);
        }
      }
    };
    fetchConfig();
  }, [profile]);

  // --- 3. GUARDAR URL EN FIREBASE ---
  const handleSaveConfig = async () => {
    if (!sheetUrl) return;
    // Validación básica
    if (!sheetUrl.includes('output=csv')) {
        setStatus({ msg: "⚠️ La URL debe terminar en 'output=csv'. Revisa 'Publicar en la web'.", type: 'error' });
        return;
    }

    try {
        setProcessing(true);
        // Guardamos o actualizamos el documento de configuración
        await setDoc(doc(db, "config", "general"), {
            sheetsCsvUrl: sheetUrl,
            updatedBy: user?.email,
            lastConfigUpdate: new Date()
        }, { merge: true });
        
        setSavedUrl(sheetUrl);
        setStatus({ msg: "💾 URL guardada y vinculada correctamente.", type: 'success' });
        
        // Limpiamos el mensaje de éxito después de 3 segundos
        setTimeout(() => setStatus(null), 3000);
    } catch (error) {
        console.error(error);
        setStatus({ msg: "❌ Error al guardar la configuración en Firebase.", type: 'error' });
    } finally {
        setProcessing(false);
    }
  };

  // --- 4. SINCRONIZAR DESDE LA NUBE (Google Sheets) ---
  const handleCloudSync = async () => {
    const targetUrl = savedUrl || sheetUrl;

    if (!targetUrl) {
        setStatus({ msg: "⚠️ Primero debes guardar una URL de Google Sheets.", type: 'error' });
        return;
    }

    setProcessing(true);
    setStatus(null);

    try {
        // Llamamos al servicio que descarga el CSV y actualiza Firestore
        const count = await syncFromGoogleSheets(targetUrl);
        setStatus({ msg: `☁️ Sincronización exitosa: ${count} cuadrillas actualizadas en tiempo real.`, type: 'success' });
    } catch (error) {
        console.error(error);
        setStatus({ msg: "❌ Error de conexión. Verifica que el Sheet esté 'Publicado en la web'.", type: 'error' });
    } finally {
        setProcessing(false);
    }
  };

  // --- 5. SUBIDA MANUAL (Respaldo) ---
  const handleUpload = async () => {
    if (!file) return;
    setProcessing(true);
    setStatus(null);

    try {
      const count = await processExcelFile(file);
      setStatus({ msg: `✅ Éxito: Se cargaron ${count} cuadrillas manualmente.`, type: 'success' });
    } catch (error) {
      console.error(error);
      setStatus({ msg: "❌ Error al procesar. Revisa que el Excel tenga las columnas correctas.", type: 'error' });
    } finally {
      setProcessing(false);
    }
  };

  // Render de carga inicial
  if (authLoading || profile?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <Loader2 className="animate-spin text-slate-400" size={48} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 p-6 flex flex-col items-center justify-center">
      <div className="bg-white p-8 rounded-xl shadow-xl max-w-lg w-full text-center border border-slate-200 animate-in fade-in zoom-in duration-300">
        
        <div className="bg-slate-900 text-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
          <Shield size={32} />
        </div>
        
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Panel de Comando</h1>
        <p className="text-slate-500 mb-8 text-sm">
            Admin: <span className="font-bold text-slate-800">{profile?.displayName}</span>
        </p>

        {/* --- SECCIÓN A: ENLACE DINÁMICO (GOOGLE SHEETS) --- */}
        <div className="mb-6 text-left bg-slate-50 p-4 rounded-lg border border-slate-100">
            <label className="text-xs font-bold text-slate-500 mb-1 block uppercase">
                1. Configurar Fuente de Datos (Google Sheets)
            </label>
            <div className="flex gap-2">
                <input 
                    type="text" 
                    value={sheetUrl}
                    onChange={(e) => setSheetUrl(e.target.value)}
                    placeholder="https://docs.google.com/.../pub?output=csv"
                    className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none font-mono text-slate-600"
                />
                <button 
                    onClick={handleSaveConfig}
                    disabled={processing}
                    className="bg-slate-800 text-white p-2 rounded-lg hover:bg-slate-900 transition-colors"
                    title="Guardar URL en Base de Datos"
                >
                    {processing ? <Loader2 className="animate-spin" size={18}/> : <Save size={18} />}
                </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-2">
                * Debe ser un enlace CSV público (Archivo {'>'} Compartir {'>'} Publicar en la web).
            </p>
        </div>

        {/* --- SECCIÓN B: ACCIÓN DE SINCRONIZAR --- */}
        <div className="mb-8 p-4 bg-blue-50 rounded-xl border border-blue-100">
            <h3 className="text-blue-900 font-bold text-sm mb-2 flex items-center justify-center gap-2">
                <LinkIcon size={16}/> 2. Base de Datos en Vivo
            </h3>
            <p className="text-xs text-blue-600 mb-4 px-4">
                Extrae los datos de la URL guardada arriba y actualiza el mapa al instante.
            </p>
            <button 
                onClick={handleCloudSync}
                disabled={processing || !savedUrl}
                className={`w-full py-3 rounded-lg font-bold text-white transition-all shadow-md flex items-center justify-center gap-2 ${
                    !savedUrl || processing ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg'
                }`}
            >
                {processing ? <Loader2 className="animate-spin" size={20} /> : <RefreshCw size={20} />}
                {processing ? 'Sincronizando...' : 'Actualizar Mapa desde Nube'}
            </button>
        </div>

        <div className="relative flex py-2 items-center mb-6">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink-0 mx-4 text-slate-400 text-xs">O subida manual de archivo</span>
            <div className="flex-grow border-t border-slate-200"></div>
        </div>

        {/* --- SECCIÓN C: SUBIDA MANUAL (RESPALDO) --- */}
        <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 mb-4 hover:bg-slate-50 transition-colors cursor-pointer relative group">
            <input 
                type="file" 
                accept=".xlsx, .xls, .csv" 
                onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            {file ? (
                <div className="text-slate-600 font-bold flex flex-col items-center animate-in fade-in">
                    <FileSpreadsheet size={32} className="mb-2 text-blue-600" />
                    <span className="text-sm truncate max-w-[200px]">{file.name}</span>
                </div>
            ) : (
                <div className="text-slate-400 flex flex-col items-center group-hover:text-slate-600">
                    <Upload size={32} className="mb-2" />
                    <span className="text-sm font-medium">Arrastra Excel aquí</span>
                </div>
            )}
        </div>
        
        {file && (
             <button 
                onClick={handleUpload}
                disabled={!file || processing}
                className="w-full py-2 mb-4 rounded-lg font-bold text-white bg-slate-600 hover:bg-slate-700 transition-all text-sm"
            >
                {processing ? 'Procesando...' : 'Importar Archivo Local'}
            </button>
        )}

        {/* MENSAJES DE ESTADO */}
        {status && (
            <div className={`p-4 rounded-lg text-sm font-bold mb-6 flex items-center gap-2 text-left animate-in slide-in-from-bottom-2 ${status.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {status.type === 'success' ? <CheckCircle size={18}/> : <AlertTriangle size={18}/>}
                {status.msg}
            </div>
        )}
        
        <a href="/" className="block mt-6 text-sm text-slate-400 hover:text-slate-800 transition-colors">← Volver al Mapa</a>
      </div>
    </div>
  );
}
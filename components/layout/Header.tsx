import { ShieldCheck, Plus, LogOut, User } from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';

interface HeaderProps {
  user: FirebaseUser | null;
  loading: boolean;
  onLogin: () => void;
  onLogout: () => void;
  onOpenForm: () => void;
}

export const Header = ({ user, loading, onLogin, onLogout, onOpenForm }: HeaderProps) => {
  return (
    <header className="bg-slate-900 text-white sticky top-0 z-50 shadow-lg">
      <div className="max-w-3xl mx-auto px-4 py-3 flex justify-between items-center">
        <div>
          <h1 className="text-lg sm:text-xl font-bold flex items-center gap-2">
            <ShieldCheck className="text-red-500" size={24} /> Red Epuyén
          </h1>
          <p className="text-[10px] sm:text-xs text-slate-400">Ayuda Comunitaria Verificada</p>
        </div>
        <div className="flex items-center gap-3">
          {!loading && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => user ? onOpenForm() : alert("🔒 Inicia sesión para publicar.")}
                className={`px-3 py-1.5 rounded-lg font-bold text-sm flex items-center gap-2 transition-colors ${user ? "bg-red-600 hover:bg-red-700 text-white shadow-md" : "bg-slate-800 text-slate-500 cursor-not-allowed"}`}
              >
                <Plus size={16} /> Publicar
              </button>
              {user ? (
                <>
                  <img src={user.photoURL || ""} alt="Perfil" className="w-8 h-8 rounded-full border border-slate-600 hidden sm:block" />
                  <button onClick={onLogout} className="text-slate-400 hover:text-white p-1">
                    <LogOut size={20} />
                  </button>
                </>
              ) : (
                <button onClick={onLogin} className="bg-white text-slate-900 px-4 py-2 rounded-lg font-bold text-sm hover:bg-slate-100 flex items-center gap-2 shadow-sm">
                  <User size={16} /> Entrar
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
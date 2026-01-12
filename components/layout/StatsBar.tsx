
interface StatsBarProps {
  needsCount: number;
  offersCount: number;
}

export const StatsBar = ({ needsCount, offersCount }: StatsBarProps) => {
  return (
    <div className="bg-white border-b border-slate-200">
      <div className="max-w-3xl mx-auto px-4 py-3 flex gap-4 text-sm overflow-x-auto">
        <div className="flex items-center gap-2 whitespace-nowrap">
          <span className="font-bold text-red-600">{needsCount}</span> Necesidades
        </div>
        <div className="w-px bg-slate-200 h-5"></div>
        <div className="flex items-center gap-2 whitespace-nowrap">
          <span className="font-bold text-green-600">{offersCount}</span> Recursos
        </div>
      </div>
    </div>
  );
};
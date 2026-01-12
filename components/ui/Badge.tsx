
interface BadgeProps {
  type: string;
  resolved?: boolean; // Lo puse opcional (?) por si acaso viene undefined
}

export const Badge = ({ type, resolved }: BadgeProps) => {
  if (resolved) {
    return (
      <span className="px-2 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-500 border border-gray-200">
        RESUELTO
      </span>
    );
  }

  return type === 'necesidad' ? (
    <span className="px-2 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">
      SE NECESITA
    </span>
  ) : (
    <span className="px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200">
      SE OFRECE
    </span>
  );
};
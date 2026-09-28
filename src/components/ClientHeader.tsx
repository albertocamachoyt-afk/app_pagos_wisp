type Props = {
  online?: boolean;
};

export default function ClientHeader({ online = true }: Props) {
  return (
    <header className="bg-black text-white px-4 py-3 flex items-center justify-between shadow-md sticky top-0 z-40">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-sm overflow-hidden border border-slate-700">
          <span className="text-black font-black text-sm">RTST</span>
        </div>
        <div>
          <h1 className="text-xs font-bold tracking-wider uppercase leading-none text-slate-100">
            CONSULTA TU SERVICIO
          </h1>
          <p className="text-[11px] text-slate-300 font-normal leading-tight mt-0.5">
            RTST Carora
          </p>
        </div>
      </div>
      {online && (
        <div className="flex items-center gap-1.5 bg-[#0f291e] border border-[#1b5e3f] px-2.5 py-1 rounded-full">
          <span className="w-2 h-2 rounded-full bg-[#10b981] inline-block animate-pulse"></span>
          <span className="text-[11px] font-medium text-[#10b981]">En línea</span>
        </div>
      )}
    </header>
  );
}

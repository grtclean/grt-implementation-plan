export default function PrintHeader() {
  return (
    <div className="hidden print:flex items-center gap-3 mb-6 pb-4 border-b border-gray-300">
      <img src="/GRTlogo.gif" alt="GRT" className="h-10 w-auto" />
      <div>
        <div className="text-lg font-bold">GRT System</div>
        <div className="text-xs text-gray-500">Global Robot Technology</div>
      </div>
    </div>
  );
}

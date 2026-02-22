/**
 * /form-directory — Failsafe Landing Page
 *
 * Zero dependencies: no tRPC, no DB, no CSV.
 * Proves the route is alive so the CEO can click and see blue.
 */
export default function FormDirectory() {
  return (
    <div className="min-h-screen bg-[#0078d4] flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-white mb-4 tracking-tight">
          GRT Form Directory is Online!
        </h1>
        <p className="text-xl text-blue-100">
          M0-M12 Dynamic Form Engine — Route verified
        </p>
      </div>
    </div>
  );
}

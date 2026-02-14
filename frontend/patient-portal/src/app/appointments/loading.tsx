export default function AppointmentsLoading() {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <span className="inline-flex gap-1 mb-4">
        <span className="h-3 w-3 bg-aurixa-400 rounded-full animate-pulse" />
        <span className="h-3 w-3 bg-aurixa-400 rounded-full animate-pulse" style={{ animationDelay: "150ms" }} />
        <span className="h-3 w-3 bg-aurixa-400 rounded-full animate-pulse" style={{ animationDelay: "300ms" }} />
      </span>
      <p className="text-white/50 text-sm">Loading appointments...</p>
    </div>
  );
}

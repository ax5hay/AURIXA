export default function Loading() {
  return (
    <div className="p-8 flex items-center justify-center min-h-[400px]">
      <div className="flex gap-2">
        <span className="h-2 w-2 bg-aurixa-400 rounded-full animate-pulse" />
        <span className="h-2 w-2 bg-aurixa-400 rounded-full animate-pulse" style={{ animationDelay: "150ms" }} />
        <span className="h-2 w-2 bg-aurixa-400 rounded-full animate-pulse" style={{ animationDelay: "300ms" }} />
      </div>
    </div>
  );
}

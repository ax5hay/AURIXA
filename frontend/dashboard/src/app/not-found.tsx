import Link from "next/link";

export default function NotFound() {
  return (
    <div className="p-8 max-w-7xl mx-auto flex flex-col items-center justify-center min-h-[60vh]">
      <h1 className="text-2xl font-bold text-white mb-2">Page Not Found</h1>
      <p className="text-white/60 text-sm mb-6">The page you&apos;re looking for doesn&apos;t exist.</p>
      <Link
        href="/"
        className="px-4 py-2 rounded-lg bg-aurixa-500 hover:bg-aurixa-600 text-white font-medium transition-colors"
      >
        Back to Dashboard
      </Link>
    </div>
  );
}

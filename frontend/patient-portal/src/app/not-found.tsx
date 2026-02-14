import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <h1 className="text-2xl font-bold text-white mb-2">Page Not Found</h1>
      <p className="text-white/60 text-sm mb-6">The page you&apos;re looking for doesn&apos;t exist.</p>
      <Link
        href="/"
        className="px-4 py-2 rounded-lg bg-aurixa-500 hover:bg-aurixa-600 text-white font-medium transition-colors"
      >
        Go to Patient Portal
      </Link>
    </div>
  );
}

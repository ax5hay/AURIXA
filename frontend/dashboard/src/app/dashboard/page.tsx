"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DashboardRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/");
  }, [router]);
  return (
    <div className="p-8 flex items-center justify-center min-h-[200px]">
      <p className="text-white/50">Redirecting...</p>
    </div>
  );
}

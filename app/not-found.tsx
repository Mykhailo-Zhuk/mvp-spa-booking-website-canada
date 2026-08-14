import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-cream px-4 text-center">
      <div className="text-6xl">🏔️</div>
      <h1 className="text-2xl font-bold text-forest">Page not found</h1>
      <p className="text-sm text-forest/60">This trail doesn&apos;t exist — let&apos;s get you back to the spa.</p>
      <Link href="/en" className="h-12 rounded-full bg-pine px-6 text-sm font-bold text-white inline-flex items-center">
        ← Back home
      </Link>
    </div>
  );
}

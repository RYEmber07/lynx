import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <h1 className="text-6xl font-bold text-white tracking-tight mb-4">
          Lynx
        </h1>
        <p className="text-lg text-gray-400 mb-10">
          Short links. Real analytics.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/register"
            className="rounded-lg bg-indigo-600 hover:bg-indigo-500 px-6 py-3 text-sm font-semibold text-white transition-colors"
          >
            Get Started
          </Link>
          <Link
            href="/login"
            className="rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 px-6 py-3 text-sm font-semibold text-gray-200 transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}

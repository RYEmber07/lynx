import Link from "next/link";
import { FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-md border border-outline bg-surface p-10 flex flex-col items-center gap-6 text-center animate-fade-in">

        {/* Icon */}
        <div className="w-12 h-12 border border-outline flex items-center justify-center bg-surface-variant mb-2 text-on-surface-variant">
          <FileQuestion className="w-5 h-5" strokeWidth={1.5} />
        </div>

        {/* Heading */}
        <div className="flex flex-col gap-2">
          <h1 className="font-display font-bold text-2xl text-on-background uppercase tracking-widest">
            Page Not Found
          </h1>
          <p className="font-mono text-[10px] uppercase tracking-widest text-on-surface-variant leading-relaxed">
            The route you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4 mt-2">
          <Link
            href="/"
            className="h-10 px-8 bg-primary text-on-primary font-mono text-[10px] uppercase tracking-widest hover:bg-primary-container active:scale-[0.98] transition-all flex items-center justify-center"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

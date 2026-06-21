"use client";

import { useEffect } from "react";

interface ToastProps {
  message: string;
  type: "success" | "error";
  onClose: () => void;
  duration?: number;
}

export default function Toast({ message, type, onClose, duration = 3000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  return (
    <div
      className={`fixed bottom-6 right-6 z-200 animate-slide-up flex items-center gap-3 px-5 py-4 border font-mono text-[10px] uppercase tracking-widest max-w-sm shadow-machined ${
        type === "success"
          ? "bg-surface border-success/30 text-success"
          : "bg-surface border-error/30 text-error"
      }`}
    >
      <span className={`w-1.5 h-1.5 shrink-0 ${type === "success" ? "bg-success" : "bg-error"}`} />
      {message}
      <button
        onClick={onClose}
        className="ml-auto text-on-surface-variant hover:text-on-background transition-colors"
        aria-label="Close"
      >
        ✕
      </button>
    </div>
  );
}

"use client";

import { useEffect } from "react";

interface ToastProps {
  message: string;
  type: "success" | "error";
  onClose: () => void;
}

export default function Toast({ message, type, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl px-5 py-3 text-sm font-medium text-white shadow-lg backdrop-blur-md transition-all duration-300 ${type === "success" ? "bg-green-600/90" : "bg-red-600/90"}`}
    >
      <span>{type === "success" ? "✓" : "✕"}</span>
      <span>{message}</span>
      <button
        onClick={onClose}
        className="ml-2 opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}

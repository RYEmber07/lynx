"use client";

import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  id: string;
  error?: string;
}

export default function Input({ label, id, error, className = "", ...rest }: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-white/70">
        {label}
      </label>
      <input
        id={id}
        className={`rounded-lg bg-white/5 border px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none transition-colors duration-150 focus:ring-2 focus:ring-blue-500 ${error ? "border-red-500" : "border-white/10 focus:border-blue-500"} ${className}`}
        {...rest}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

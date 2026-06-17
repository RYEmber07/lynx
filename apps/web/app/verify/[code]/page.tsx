"use client";

import { useParams } from "next/navigation";
import { useState } from "react";

export default function VerifyPage() {
  const params = useParams<{ code: string }>();
  const code = params.code;

  const [password, setPassword] = useState("");

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-xl">
        <div className="mb-6 text-center">
          <span className="text-3xl mb-3 block">🔒</span>
          <h1 className="text-xl font-bold text-white">This link is password protected.</h1>
          <p className="mt-1 text-sm text-gray-500">
            Enter the password to access{" "}
            <span className="font-mono text-indigo-400">{code}</span>.
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm font-medium text-gray-300">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg bg-gray-800 border border-gray-700 px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="••••••••"
            />
          </div>

          <button
            type="button"
            disabled
            className="w-full rounded-lg bg-indigo-600 opacity-50 cursor-not-allowed px-4 py-2.5 text-sm font-semibold text-white"
          >
            Unlock
          </button>

          <p className="text-center text-xs text-gray-600">Coming soon</p>
        </div>
      </div>
    </div>
  );
}

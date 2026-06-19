"use client";

import {useState} from "react";
import {createUrl, type ShortUrl} from "@/lib/urls";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

interface CreateUrlFormProps {
  onCreated: (url: ShortUrl) => void;
  onError: (message: string) => void;
}

export default function CreateUrlForm({onCreated, onError}: CreateUrlFormProps) {
  const [originalUrl, setOriginalUrl] = useState("");
  const [customSlug, setCustomSlug] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [isPasswordProtected, setIsPasswordProtected] = useState(false);
  const [password, setPassword] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setOriginalUrl("");
    setCustomSlug("");
    setExpiresAt("");
    setIsPasswordProtected(false);
    setPassword("");
    setIsExpanded(false);
  };

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        originalUrl,
        ...(customSlug.trim() !== "" && {customSlug: customSlug.trim()}),
        ...(expiresAt !== "" && {expiresAt}),
        ...(isPasswordProtected && {isPasswordProtected: true}),
        ...(isPasswordProtected && password.trim() !== "" && {password: password.trim()}),
      };
      const created = await createUrl(payload);
      onCreated(created);
      resetForm();
    } catch (err: unknown) {
      const axiosErr = err as {response?: {data?: {error?: string}}};
      onError(axiosErr.response?.data?.error ?? "Failed to create URL");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 flex flex-col gap-5"
    >
      <h2 className="text-lg font-semibold text-white">Shorten a URL</h2>

      {/* Basic field */}
      <Input
        id="originalUrl"
        label="Destination URL"
        type="url"
        placeholder="https://example.com/very-long-url"
        value={originalUrl}
        onChange={(e) => setOriginalUrl(e.target.value)}
        required
        disabled={isSubmitting}
      />

      {/* Advanced options toggle */}
      <button
        type="button"
        onClick={() => setIsExpanded((v) => !v)}
        disabled={isSubmitting}
        className="flex items-center gap-2 text-sm text-white/50 hover:text-white/80 transition-colors w-fit cursor-pointer disabled:cursor-not-allowed"
      >
        <span
          className={`inline-block transition-transform duration-200 ${isExpanded ? "rotate-90" : "rotate-0"}`}
        >
          ▶
        </span>
        Advanced options
      </button>

      {/* Advanced fields */}
      {isExpanded && (
        <div className="flex flex-col gap-4 pl-4 border-l border-white/10">
          <Input
            id="customSlug"
            label="Custom slug (optional)"
            type="text"
            placeholder="my-custom-link"
            value={customSlug}
            onChange={(e) => setCustomSlug(e.target.value)}
            disabled={isSubmitting}
          />

          <Input
            id="expiresAt"
            label="Expiry date (optional)"
            type="datetime-local"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            disabled={isSubmitting}
          />

          <div className="flex items-center gap-3">
            <input
              id="isPasswordProtected"
              type="checkbox"
              checked={isPasswordProtected}
              onChange={(e) => setIsPasswordProtected(e.target.checked)}
              disabled={isSubmitting}
              className="w-4 h-4 rounded accent-blue-600 cursor-pointer"
            />
            <label
              htmlFor="isPasswordProtected"
              className="text-sm text-white/70 cursor-pointer select-none"
            >
              Password protect this link
            </label>
          </div>

          {isPasswordProtected && (
            <Input
              id="password"
              label="Password"
              type="password"
              placeholder="Enter a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting}
            />
          )}
        </div>
      )}

      <Button type="submit" disabled={isSubmitting} className="self-start">
        {isSubmitting ? "Creating…" : "Create short link"}
      </Button>
    </form>
  );
}

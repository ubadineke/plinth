"use client";

import { useState } from "react";
import { CopyIcon, CheckIcon } from "./icons";

/* A small IDE-flavoured window: traffic lights, a copy affordance, quietly
   styled comment / result lines, and a response footer that makes the
   entitlements call feel real. Comments dim back; the "→" result glows jade. */
export function CodePanel({ filename, code }: { filename: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable — no-op */
    }
  };

  const lines = code.split("\n");

  return (
    <div className="min-w-0 overflow-hidden rounded-2xl border border-ink/10 bg-ink-900 shadow-sm">
      {/* window chrome — real macOS traffic lights */}
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
        <span className="h-3 w-3 rounded-full bg-[#FF5F57]" />
        <span className="h-3 w-3 rounded-full bg-[#FEBC2E]" />
        <span className="h-3 w-3 rounded-full bg-[#28C840]" />
        <span className="ml-2 font-mono text-xs text-white/40">{filename}</span>
        <button
          type="button"
          onClick={onCopy}
          aria-label="Copy code"
          className="ml-auto inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-mono text-[11px] text-white/50 transition-colors hover:bg-white/5 hover:text-white/80"
        >
          {copied ? (
            <>
              <CheckIcon className="h-3.5 w-3.5 text-jade-400" />
              Copied
            </>
          ) : (
            <>
              <CopyIcon className="h-3.5 w-3.5" />
              Copy
            </>
          )}
        </button>
      </div>

      {/* code body */}
      <pre className="overflow-x-auto p-4 text-[13px] leading-relaxed md:p-5">
        <code className="block font-mono">
          {lines.map((ln, i) => {
            const trimmed = ln.trim();
            const isResult = ln.includes("→");
            const isComment = trimmed.startsWith("//") && !isResult;
            const cls = isResult
              ? "text-jade-400"
              : isComment
                ? "text-bone-200/40"
                : "text-bone-200";
            return (
              <span key={i} className={`block ${cls}`}>
                {ln || " "}
              </span>
            );
          })}
        </code>
      </pre>

      {/* response footer — the entitlements call, resolved */}
      <div className="flex items-center gap-2 border-t border-white/10 bg-white/[0.02] px-4 py-3 font-mono text-[11px]">
        <span className="rounded bg-jade/15 px-1.5 py-0.5 font-semibold text-jade-400">200 OK</span>
        <span className="text-white/40">entitlements resolved</span>
        <span className="ml-auto flex items-center gap-1.5 text-jade-400">
          <span className="h-1.5 w-1.5 rounded-full bg-jade-400" />
          access granted
        </span>
      </div>
    </div>
  );
}

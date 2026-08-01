"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";

/**
 * A password field with a show/hide (👁) button tucked inside its right edge.
 * `className` styles the input itself, so callers keep their existing look.
 */
export function PasswordInput({
  value,
  onChange,
  placeholder,
  autoFocus,
  className = "",
  "aria-label": ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
  "aria-label"?: string;
}) {
  const { t } = useI18n();
  const [shown, setShown] = useState(false);

  return (
    <div className="relative flex">
      <input
        type={shown ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        aria-label={ariaLabel}
        // Extra right padding keeps typed text clear of the toggle.
        className={`${className} w-full pr-11`}
      />
      <button
        type="button"
        onClick={() => setShown((s) => !s)}
        aria-label={t(shown ? "pw.hide" : "pw.show")}
        aria-pressed={shown}
        tabIndex={-1}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-base text-zinc-400 transition-colors hover:text-indigo-600 dark:hover:text-indigo-300"
      >
        {shown ? "🙈" : "👁"}
      </button>
    </div>
  );
}

"use client";

import { useState, useRef, useEffect } from "react";

interface ReportCellProps {
  value: string | number;
  /** Formatted string shown when not editing */
  displayValue?: string;
  type?: "text" | "number" | "textarea";
  step?: number;
  min?: number;
  className?: string;
  readOnly?: boolean;
  onSave: (value: string | number) => void;
}

export function ReportCell({
  value,
  displayValue,
  type = "text",
  step,
  min,
  className = "",
  readOnly = false,
  onSave,
}: ReportCellProps) {
  const [editing, setEditing] = useState(false);
  const [localValue, setLocalValue] = useState(String(value));
  const inputRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null);

  useEffect(() => {
    setLocalValue(String(value));
  }, [value]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      if ("select" in inputRef.current) inputRef.current.select();
    }
  }, [editing]);

  function commit() {
    setEditing(false);
    const saved =
      type === "number"
        ? parseFloat(localValue.replace(",", ".")) || 0
        : localValue;
    if (saved !== value) onSave(saved);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && type !== "textarea") commit();
    if (e.key === "Escape") {
      setLocalValue(String(value));
      setEditing(false);
    }
  }

  if (readOnly) {
    return (
      <span className={`block min-h-[1.5rem] px-1 py-0.5 ${className}`}>
        {displayValue ?? String(value)}
      </span>
    );
  }

  if (editing) {
    const sharedClass =
      "w-full bg-white border border-blue-400 rounded px-1.5 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500";

    if (type === "textarea") {
      return (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={commit}
          onKeyDown={handleKeyDown}
          rows={2}
          className={sharedClass}
        />
      );
    }

    return (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type={type === "number" ? "number" : "text"}
        value={localValue}
        step={step}
        min={min}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        className={sharedClass}
      />
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => setEditing(true)}
      onKeyDown={(e) => e.key === "Enter" && setEditing(true)}
      title="Kliknij, aby edytować"
      className={`cursor-text rounded px-1 py-0.5 hover:bg-blue-50 hover:ring-1 hover:ring-blue-200 transition-colors min-h-[1.5rem] ${className}`}
    >
      {displayValue ?? String(value)}
    </div>
  );
}

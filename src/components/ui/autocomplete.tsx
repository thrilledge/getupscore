"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { X, ChevronsUpDown } from "lucide-react";

interface AutocompleteProps {
  id?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  onTagsChange?: (tags: string[]) => void;
  type: "skills" | "keywords" | "countries";
  className?: string;
  icon?: React.ReactNode;
}

export function Autocomplete({
  id,
  placeholder = "Type to search...",
  value,
  onChange,
  onTagsChange,
  type,
  className = "",
  icon,
}: AutocompleteProps) {
  const [inputValue, setInputValue] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const valueRef = useRef(value);
  useEffect(() => {
    if (value !== valueRef.current) {
      valueRef.current = value;
      const parsed = value ? value.split(/[,;]+/).map((s) => s.trim()).filter(Boolean) : [];
      setTags(parsed);
    }
  }, [value]);

  const fetchSuggestions = useCallback(async (search: string) => {
    if (!search || search.length < 1) {
      setSuggestions([]);
      return;
    }
    try {
      const res = await fetch(`/api/suggestions?type=${type}&q=${encodeURIComponent(search)}&limit=8`);
      if (!res.ok) return;
      const data = await res.json();
      setSuggestions((data.suggestions || []).filter((s: string) => !tags.includes(s)));
    } catch {
      setSuggestions([]);
    }
  }, [type, tags]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val.endsWith(",") || val.endsWith(";")) {
      const word = val.slice(0, -1).trim();
      if (word && !tags.includes(word)) {
        const newTags = [...tags, word];
        setTags(newTags);
        onChange(newTags.join(", "));
        onTagsChange?.(newTags);
      }
      setInputValue("");
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    setInputValue(val);
    setShowSuggestions(true);
    setActiveIndex(-1);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 200);
  };

  const addTag = (tag: string) => {
    if (!tag || tags.includes(tag)) return;
    const newTags = [...tags, tag];
    setTags(newTags);
    onChange(newTags.join(", "));
    onTagsChange?.(newTags);
    setInputValue("");
    setSuggestions([]);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const removeTag = (index: number) => {
    const newTags = tags.filter((_, i) => i !== index);
    setTags(newTags);
    onChange(newTags.join(", "));
    onTagsChange?.(newTags);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      addTag(suggestions[activeIndex]);
    } else if (e.key === "Enter" && inputValue.trim()) {
      e.preventDefault();
      addTag(inputValue.trim());
    } else if (e.key === "Backspace" && !inputValue && tags.length > 0) {
      removeTag(tags.length - 1);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        listRef.current &&
        !listRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`}>
      <div id={id} className="">
        {tags.map((tag, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-foreground"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(i)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => inputValue && setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          placeholder={tags.length === 0 ? placeholder : ""}
          className="h-10 min-w-0 w-full rounded-xl border-[#0A0A0A]/10 bg-[#F8F9F9] px-2.5 text-xs text-[#0A0A0A] placeholder:text-[#0A0A0A]/30 focus-visible:border-[#00C98B] focus-visible:ring-[#00C98B]/20 sm:text-sm border"
        />
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={listRef}
          className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-md"
        >
          {suggestions.map((s, i) => (
            <button
              key={s}
              type="button"
              className={`w-full px-3 py-2 text-left text-sm hover:bg-muted/50 transition-colors ${i === activeIndex ? "bg-muted/70" : ""
                } ${i > 0 ? "border-t border-border/40" : ""}`}
              onMouseDown={(e) => {
                e.preventDefault();
                addTag(s);
              }}
              onMouseEnter={() => setActiveIndex(i)}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

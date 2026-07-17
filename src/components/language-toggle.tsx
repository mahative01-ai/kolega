"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { getLanguage, Language } from "@/lib/i18n";

export function LanguageToggle() {
  const [lang, setLang] = useState<Language>(() => getLanguage());

  const toggleLanguage = () => {
    const nextLang = lang === "id" ? "en" : "id";
    document.cookie = `lang=${nextLang}; path=/; max-age=31536000`;
    setLang(nextLang);
    window.location.reload();
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-9 px-2.5 text-xs font-bold rounded-lg border border-zinc-200 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center gap-1.5"
      onClick={toggleLanguage}
      title={lang === "id" ? "Switch to English" : "Ubah ke Bahasa Indonesia"}
    >
      <span>{lang === "id" ? "🇮🇩 ID" : "🇬🇧 EN"}</span>
    </Button>
  );
}

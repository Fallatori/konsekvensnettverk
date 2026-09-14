"use client";

/**
 * Whole-page translation via Google's Website Translator widget, rather than
 * a bespoke i18n layer that would need every hardcoded string AND the
 * Norwegian scenario content in domainData.json translated by hand. The
 * widget's own UI is hidden (see .goog-te-* rules in globals.css) - the
 * language SegmentedControl in ScenarioApp drives it directly through the
 * hidden <select> it renders into #google_translate_element.
 */
import { useEffect, useState } from "react";

export type Language = "no" | "en";

export const LANGUAGE_STORAGE_KEY = "konsekvensnettverk-language";

export const LANGUAGE_OPTIONS: { value: Language; label: string }[] = [
  { value: "no", label: "NO" },
  { value: "en", label: "EN" },
];

export function isLanguage(value: string | null): value is Language {
  return value === "no" || value === "en";
}

function readStoredLanguage(): Language {
  if (typeof window === "undefined") return "no";
  const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  return isLanguage(stored) ? stored : "no";
}

declare global {
  interface Window {
    googleTranslateElementInit?: () => void;
    google?: { translate: { TranslateElement: new (options: object, elementId: string) => unknown } };
  }
}

const WIDGET_ELEMENT_ID = "google_translate_element";

function loadGoogleTranslateScript() {
  if (document.getElementById("google-translate-script")) return;

  window.googleTranslateElementInit = () => {
    new window.google!.translate.TranslateElement(
      { pageLanguage: "no", includedLanguages: "no,en", autoDisplay: false },
      WIDGET_ELEMENT_ID,
    );
  };

  const script = document.createElement("script");
  script.id = "google-translate-script";
  script.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
  script.async = true;
  document.body.appendChild(script);
}

/** Selects `lang` in the widget's hidden <select>, retrying briefly since
 * the widget renders asynchronously after the script above loads. Selecting
 * "no" (the page's own language) is what reverts translated text back to
 * the original.
 *
 * Always dispatches "change", even if `lang` is already selected: the app's
 * scenario data loads and updates asynchronously (fetches, debounced
 * recompute), and Google Translate only translates whatever is in the DOM
 * at the moment the event fires - so newly-rendered text needs a fresh
 * dispatch to get picked up, not just the first language switch. Call this
 * again whenever new content renders (see ScenarioApp's effect on `result`),
 * rather than waiting for a manual page refresh to catch up. */
export function applyLanguage(lang: Language, attemptsLeft = 20) {
  const combo = document.querySelector<HTMLSelectElement>(".goog-te-combo");
  if (!combo) {
    if (attemptsLeft > 0) setTimeout(() => applyLanguage(lang, attemptsLeft - 1), 250);
    return;
  }
  combo.value = lang;
  combo.dispatchEvent(new Event("change"));
}

/** Persists the chosen language and drives the Google Translate widget to
 * match. Mirrors useTheme/useEdgeStyle's localStorage pattern in context.tsx. */
export function useLanguage(): [Language, (lang: Language) => void] {
  const [language, setLanguage] = useState<Language>(readStoredLanguage);

  useEffect(() => {
    loadGoogleTranslateScript();
  }, []);

  useEffect(() => {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    applyLanguage(language);
  }, [language]);

  return [language, setLanguage];
}

export { WIDGET_ELEMENT_ID };

"use client";

/**
 * Whole-page translation via Google's Website Translator widget, rather than
 * a bespoke i18n layer that would need every hardcoded string AND the
 * Norwegian scenario content in domainData.json translated by hand. The
 * widget's own UI is hidden (see .goog-te-* rules in globals.css) - the
 * language SegmentedControl in ScenarioApp drives it directly through the
 * hidden <select> it renders into #google_translate_element.
 */
import { createContext, useContext, useEffect, useState } from "react";

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
    __gtSafePatchApplied?: boolean;
  }
}

const WIDGET_ELEMENT_ID = "google_translate_element";

/** Google Translate rewrites the DOM (wrapping/splitting text nodes) outside
 * React's control. Once that's happened, the next React re-render that
 * touches those nodes (e.g. a debounced recompute after changing timeframe
 * while EN is active) calls removeChild/insertBefore on a node Google
 * Translate already moved, which throws NotFoundError and crashes the whole
 * page. There's no way to stop Google Translate from restructuring rendered
 * text, so instead make these DOM ops tolerate a stale reference: no-op
 * instead of throwing when the node isn't actually where React expects it.
 * Must run before React's first render, so it's applied at module load. */
function patchDomForGoogleTranslate() {
  if (typeof window === "undefined" || window.__gtSafePatchApplied) return;
  window.__gtSafePatchApplied = true;

  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function <T extends Node>(this: Node, child: T): T {
    if (child.parentNode !== this) return child;
    return originalRemoveChild.call(this, child) as T;
  };

  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function <T extends Node>(this: Node, newNode: T, referenceNode: Node | null): T {
    if (referenceNode && referenceNode.parentNode !== this) return newNode;
    return originalInsertBefore.call(this, newNode, referenceNode) as T;
  };
}

patchDomForGoogleTranslate();

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
 * match. Mirrors useTheme's localStorage pattern in context.tsx. */
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

const LanguageContext = createContext<Language>("no");

export const LanguageProvider = LanguageContext.Provider;

/** Read by components deep in the graph (GaugeNode) that hand-translate a
 * small fixed vocabulary themselves instead of relying on Google Translate -
 * see CONSEQUENCE_LABEL_EN in lib/calc/mappings.ts for why. Mirrors
 * useCurrentTheme's context pattern in lib/styles/context.tsx. */
export function useCurrentLanguage(): Language {
  return useContext(LanguageContext);
}

export { WIDGET_ELEMENT_ID };

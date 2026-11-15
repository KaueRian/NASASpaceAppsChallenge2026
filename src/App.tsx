import { useEffect, useRef, useState } from "react";
import { AppHeader, type SectionId } from "./components/AppHeader";
import { CasesGrid } from "./components/CasesGrid";
import { ExplorePage } from "./components/ExplorePage";
import { Hero } from "./components/Hero";
import { Investigation } from "./components/Investigation";
import { MethodsPage } from "./components/MethodsPage";
import { MethodTeaser } from "./components/MethodTeaser";
import type { CasePresetId } from "./types/investigation";

type View = "home" | "methods" | "explore";

function scrollToSection(id: string) {
  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  document.getElementById(id)?.scrollIntoView({ behavior: prefersReduced ? "auto" : "smooth" });
}

export function App() {
  const [view, setView] = useState<View>("home");
  const [presetId, setPresetId] = useState<CasePresetId>("01");
  const pendingScrollRef = useRef<SectionId | null>(null);

  useEffect(() => {
    if (view === "home" && pendingScrollRef.current) {
      const id = pendingScrollRef.current;
      pendingScrollRef.current = null;
      scrollToSection(id);
    }
  }, [view]);

  const navigateSection = (id: SectionId) => {
    if (view !== "home") {
      pendingScrollRef.current = id;
      setView("home");
      return;
    }
    scrollToSection(id);
  };

  const selectPreset = (id: CasePresetId) => {
    setPresetId(id);
    scrollToSection("investigation");
  };

  return (
    <div className="min-h-screen overflow-x-clip bg-bg text-text">
      <AppHeader
        onNavigateSection={navigateSection}
        onNavigateMethods={() => setView("methods")}
        onNavigateExplore={() => setView("explore")}
        onNavigateHome={() => setView("home")}
      />
      <main className="mx-auto max-w-5xl">
        {view === "methods" ? (
          <MethodsPage onNavigateHome={() => setView("home")} />
        ) : view === "explore" ? (
          <ExplorePage onNavigateHome={() => setView("home")} />
        ) : (
          <>
            <Hero />
            <Investigation presetId={presetId} onNavigateMethods={() => setView("methods")} />
            <CasesGrid activePresetId={presetId} onSelectPreset={selectPreset} />
            <MethodTeaser onNavigateMethods={() => setView("methods")} />
          </>
        )}
      </main>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { AppHeader, type SectionId } from "./components/AppHeader";
import { CasesGrid } from "./components/CasesGrid";
import { Hero } from "./components/Hero";
import { Investigation } from "./components/Investigation";
import { MethodsPage } from "./components/MethodsPage";
import { MethodTeaser } from "./components/MethodTeaser";
import type { CasePresetId } from "./types/investigation";

type View = "home" | "methods";

export function App() {
  const [view, setView] = useState<View>("home");
  const [presetId, setPresetId] = useState<CasePresetId>("01");
  const pendingScrollRef = useRef<SectionId | null>(null);

  useEffect(() => {
    if (view === "home" && pendingScrollRef.current) {
      const id = pendingScrollRef.current;
      pendingScrollRef.current = null;
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    }
  }, [view]);

  const navigateSection = (id: SectionId) => {
    if (view !== "home") {
      pendingScrollRef.current = id;
      setView("home");
      return;
    }
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const selectPreset = (id: CasePresetId) => {
    setPresetId(id);
    document.getElementById("investigation")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-bg text-text">
      <AppHeader
        onNavigateSection={navigateSection}
        onNavigateMethods={() => setView("methods")}
        onNavigateHome={() => setView("home")}
      />
      <main className="p-6">
        {view === "methods" ? (
          <MethodsPage />
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

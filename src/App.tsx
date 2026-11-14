import { useEffect, useRef, useState } from "react";
import { AppHeader, type SectionId } from "./components/AppHeader";
import { Hero } from "./components/Hero";
import { Investigation } from "./components/Investigation";
import type { CasePresetId } from "./types/investigation";

type View = "home" | "methods";

export function App() {
  const [view, setView] = useState<View>("home");
  // TODO: lift to useState once <CasesGrid /> can change which case is loaded.
  const presetId: CasePresetId = "01";
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

  return (
    <div className="min-h-screen bg-bg text-text">
      <AppHeader
        onNavigateSection={navigateSection}
        onNavigateMethods={() => setView("methods")}
        onNavigateHome={() => setView("home")}
      />
      <main className="p-6">
        {view === "methods" ? (
          <p className="font-sans text-text-muted">
            Methods page placeholder — built in a later task.
          </p>
        ) : (
          <>
            <Hero />
            <Investigation presetId={presetId} onNavigateMethods={() => setView("methods")} />
            <p className="p-6 font-sans text-text-muted">
              CasesGrid placeholder — lands in a later task.
            </p>
          </>
        )}
      </main>
    </div>
  );
}

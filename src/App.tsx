import { useEffect, useRef, useState } from "react";
import { AppHeader, type SectionId } from "./components/AppHeader";

type View = "home" | "methods";

export function App() {
  const [view, setView] = useState<View>("home");
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
          <p className="font-sans text-text-muted">
            Home page placeholder — Hero / Investigation / CasesGrid land in later tasks.
          </p>
        )}
      </main>
    </div>
  );
}

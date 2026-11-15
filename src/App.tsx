import { useEffect, useRef, useState } from "react";
import { AppHeader, type SectionId } from "./components/AppHeader";
import { CasesGrid } from "./components/CasesGrid";
import { ExplorePage } from "./components/ExplorePage";
import { Hero } from "./components/Hero";
import { Investigation } from "./components/Investigation";
import { MethodsPage } from "./components/MethodsPage";
import { MethodTeaser } from "./components/MethodTeaser";
import { SharedDossierView } from "./components/share";
import {
  type AppRoute,
  buildDossierPath,
  buildExplorePath,
  buildHomePath,
  buildInvestigatePath,
  buildMethodsPath,
  parseAppRoute,
} from "./lib/routing";
import type { ValidatedInvestigateQuery } from "./lib/validation/investigate";
import type { CasePresetId } from "./types/investigation";

function scrollToSection(id: string) {
  if (typeof document === "undefined") return;
  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  document.getElementById(id)?.scrollIntoView({ behavior: prefersReduced ? "auto" : "smooth" });
}

function getInitialRoute(): AppRoute {
  if (typeof window === "undefined") {
    return { view: "home", presetId: "01", scrollToInvestigation: false };
  }
  return parseAppRoute(window.location.pathname, window.location.search);
}

function pushHistoryUrl(nextUrl: string) {
  if (typeof window === "undefined") return;
  const current = `${window.location.pathname}${window.location.search}`;
  if (current !== nextUrl) {
    window.history.pushState(null, "", nextUrl);
  }
}

export function App() {
  const [route, setRoute] = useState<AppRoute>(getInitialRoute);
  const [presetNonce, setPresetNonce] = useState(0);
  const pendingScrollRef = useRef<SectionId | null>(
    route.view === "home" && route.scrollToInvestigation ? "investigation" : null,
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onPopState = () => {
      setRoute(parseAppRoute(window.location.pathname, window.location.search));
      setPresetNonce((n) => n + 1);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    if (route.view === "home" && pendingScrollRef.current) {
      const id = pendingScrollRef.current;
      pendingScrollRef.current = null;
      scrollToSection(id);
    }
  }, [route]);

  const navigateHome = (caseId?: CasePresetId) => {
    const targetCase = caseId ?? (route.view === "home" ? route.presetId : "01");
    setRoute({ view: "home", presetId: targetCase, scrollToInvestigation: false });
    if (caseId) {
      setPresetNonce((n) => n + 1);
    }
    pushHistoryUrl(caseId ? buildHomePath(caseId) : "/");
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "auto" });
    }
  };

  const navigateMethods = () => {
    setRoute({ view: "methods" });
    pushHistoryUrl(buildMethodsPath());
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "auto" });
    }
  };

  const navigateExplore = () => {
    setRoute({ view: "explore" });
    pushHistoryUrl(buildExplorePath());
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "auto" });
    }
  };

  const navigateDossier = (dossierId: string) => {
    setRoute({ view: "dossier", dossierId });
    pushHistoryUrl(buildDossierPath(dossierId));
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "auto" });
    }
  };

  const navigateSection = (id: SectionId) => {
    if (route.view !== "home") {
      pendingScrollRef.current = id;
      setRoute({ view: "home", presetId: "01", scrollToInvestigation: false });
      pushHistoryUrl("/");
      return;
    }
    scrollToSection(id);
  };

  const selectPreset = (id: CasePresetId) => {
    setRoute({ view: "home", presetId: id, scrollToInvestigation: true });
    setPresetNonce((n) => n + 1);
    pushHistoryUrl(buildHomePath(id));
    scrollToSection("investigation");
  };

  const selectLiveInvestigation = (query: ValidatedInvestigateQuery) => {
    setRoute({
      view: "home",
      presetId: "01",
      initialLiveQuery: query,
      scrollToInvestigation: true,
    });
    setPresetNonce((n) => n + 1);
    pushHistoryUrl(buildInvestigatePath(query));
    scrollToSection("investigation");
  };

  return (
    <div className="min-h-screen overflow-x-clip bg-bg text-text">
      <AppHeader
        onNavigateSection={navigateSection}
        onNavigateMethods={navigateMethods}
        onNavigateExplore={navigateExplore}
        onNavigateHome={() => navigateHome()}
      />
      <main className="mx-auto max-w-5xl">
        {route.view === "methods" ? (
          <MethodsPage onNavigateHome={() => navigateHome()} />
        ) : route.view === "explore" ? (
          <ExplorePage onNavigateHome={() => navigateHome()} />
        ) : route.view === "dossier" ? (
          <SharedDossierView
            dossierId={route.dossierId}
            onStartNewInvestigation={() => navigateHome("01")}
          />
        ) : (
          <>
            <Hero />
            <Investigation
              presetId={route.presetId}
              presetNonce={presetNonce}
              initialLiveQuery={route.initialLiveQuery}
              onNavigateMethods={navigateMethods}
              onOpenDossierPermalink={navigateDossier}
            />
            <CasesGrid
              activePresetId={route.presetId}
              activeLiveQuery={route.initialLiveQuery ?? null}
              onSelectPreset={selectPreset}
              onSelectInvestigation={selectLiveInvestigation}
            />
            <MethodTeaser onNavigateMethods={navigateMethods} />
          </>
        )}
      </main>
    </div>
  );
}

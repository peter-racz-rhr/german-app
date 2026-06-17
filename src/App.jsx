import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import BottomNav from "./components/BottomNav";
import Onboarding from "./pages/Onboarding";
import ContactList from "./pages/ContactList";
import Chat from "./pages/Chat";
import Vocab from "./pages/Vocab";
import Grammar from "./pages/Grammar";
import { fetchProfile } from "./lib/api";

export default function App() {
  const location = useLocation();
  const showNav = location.pathname !== "/onboarding";
  const [profile, setProfile] = useState(undefined);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      document.documentElement.style.setProperty("--app-height", `${vv.height}px`);
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  useEffect(() => {
    fetchProfile().then(setProfile).catch(() => setProfile(null));
  }, []);

  if (profile === undefined) {
    return (
      <div className="h-[100dvh] flex items-center justify-center bg-white">
        <p className="text-[14px] text-[var(--ink-faint)]">Lade…</p>
      </div>
    );
  }

  if (!profile && location.pathname !== "/onboarding") {
    return <Navigate to="/onboarding" replace />;
  }

  if (profile && location.pathname === "/onboarding") {
    return <Navigate to="/contacts" replace />;
  }

  return (
    <div className="flex flex-col bg-white overflow-hidden" style={{ height: "var(--app-height, 100dvh)" }}>
      <div className="flex-1 overflow-hidden relative">
        <Routes>
          <Route path="/onboarding" element={<Onboarding onComplete={setProfile} />} />
          <Route path="/contacts" element={<ContactList />} />
          <Route path="/chat/:contactId" element={<Chat profile={profile} />} />
          <Route path="/vocab" element={<Vocab profile={profile} />} />
          <Route path="/grammar" element={<Grammar profile={profile} />} />
          <Route path="*" element={<Navigate to="/contacts" replace />} />
        </Routes>
      </div>
      {showNav && <BottomNav />}
    </div>
  );
}

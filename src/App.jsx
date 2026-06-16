import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import BottomNav from "./components/BottomNav";
import Onboarding from "./pages/Onboarding";
import Chat from "./pages/Chat";
import Vocab from "./pages/Vocab";
import Grammar from "./pages/Grammar";
import { fetchProfile } from "./lib/api";

export default function App() {
  const location = useLocation();
  const showNav = location.pathname !== "/onboarding";
  const [profile, setProfile] = useState(undefined); // undefined = loading

  useEffect(() => {
    fetchProfile()
      .then(setProfile)
      .catch(() => setProfile(null));
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
    return <Navigate to="/chat" replace />;
  }

  return (
    <div className="h-[100dvh] flex flex-col bg-white overflow-hidden">
      <div className="flex-1 overflow-hidden">
        <Routes>
          <Route
            path="/onboarding"
            element={<Onboarding onComplete={setProfile} />}
          />
          <Route path="/chat" element={<Chat profile={profile} />} />
          <Route path="/vocab" element={<Vocab />} />
          <Route path="/grammar" element={<Grammar />} />
          <Route path="*" element={<Navigate to="/chat" replace />} />
        </Routes>
      </div>
      {showNav && <BottomNav />}
    </div>
  );
}

import { Route, Routes, Navigate } from "react-router-dom";
import { Layout } from "./components/Layout";
import { OverviewPage } from "./pages/Overview";
import { AnalyticsPage } from "./pages/Analytics";
import { IdentityPage } from "./pages/Identity";
import { ErrorsPage } from "./pages/Errors";
import { FlagsPage } from "./pages/Flags";
import { ConfigPage } from "./pages/Config";
import { SurveysPage } from "./pages/Surveys";
import { ReplayPage } from "./pages/Replay";
import { DiagnosticsPage } from "./pages/Diagnostics";
import { SankofaProvider, useSankofa } from "./lib/SankofaProvider";
import { ApiKeyGate } from "./components/ApiKeyGate";

function RoutedShell() {
  const sankofa = useSankofa();
  if (!sankofa.apiKey) return <ApiKeyGate />;

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<OverviewPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/identity" element={<IdentityPage />} />
        <Route path="/errors" element={<ErrorsPage />} />
        <Route path="/flags" element={<FlagsPage />} />
        <Route path="/config" element={<ConfigPage />} />
        <Route path="/surveys" element={<SurveysPage />} />
        <Route path="/replay" element={<ReplayPage />} />
        <Route path="/diagnostics" element={<DiagnosticsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <SankofaProvider>
      <RoutedShell />
    </SankofaProvider>
  );
}

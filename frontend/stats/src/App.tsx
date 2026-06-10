import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { BagPage } from "./pages/BagPage";
import { ClubsPage } from "./pages/ClubsPage";
import { DashboardPage } from "./pages/DashboardPage";
import { DistancesPage } from "./pages/DistancesPage";
import { ParPage } from "./pages/ParPage";
import { PuttingPage } from "./pages/PuttingPage";
import { RoundsPage } from "./pages/RoundsPage";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/clubs" element={<ClubsPage />} />
          <Route path="/putting" element={<PuttingPage />} />
          <Route path="/distances" element={<DistancesPage />} />
          <Route path="/par" element={<ParPage />} />
          <Route path="/rounds" element={<RoundsPage />} />
          <Route path="/bag" element={<BagPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { AnalysisPage } from "./pages/AnalysisPage";
import { BagPage } from "./pages/BagPage";
import { CoursesPage } from "./pages/CoursesPage";
import { DashboardPage } from "./pages/DashboardPage";
import { HandicapPage } from "./pages/HandicapPage";
import { RoundDetailPage } from "./pages/RoundDetailPage";
import { RoundsPage } from "./pages/RoundsPage";
import { TrendsPage } from "./pages/TrendsPage";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/analysis" element={<AnalysisPage />} />
          <Route path="/handicap" element={<HandicapPage />} />
          <Route path="/trends" element={<TrendsPage />} />
          <Route path="/rounds" element={<RoundsPage />} />
          <Route path="/rounds/:id" element={<RoundDetailPage />} />
          <Route path="/courses" element={<CoursesPage />} />
          <Route path="/bag" element={<BagPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

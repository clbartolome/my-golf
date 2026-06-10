import { BrowserRouter, Route, Routes } from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import { BagPage } from "./pages/BagPage";
import { NewRoundPage } from "./pages/NewRoundPage";
import { PlayPage } from "./pages/PlayPage";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/bag" element={<BagPage />} />
        <Route path="/round/new" element={<NewRoundPage />} />
        <Route path="/round/:id" element={<PlayPage />} />
      </Routes>
    </BrowserRouter>
  );
}

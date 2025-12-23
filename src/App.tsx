import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Players from "./pages/Players";
import PlayerProfile from "./pages/PlayerProfile";
import Programs from "./pages/Programs";
import Registrations from "./pages/Registrations";
import Import from "./pages/Import";
import { LevelsSettings, CategoriesSettings, LocationsSettings, SeasonsSettings } from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/players" element={<Players />} />
          <Route path="/players/:id" element={<PlayerProfile />} />
          <Route path="/programs" element={<Programs />} />
          <Route path="/packages" element={<Navigate to="/programs" replace />} />
          <Route path="/registrations" element={<Registrations />} />
          <Route path="/settings/levels" element={<LevelsSettings />} />
          <Route path="/settings/categories" element={<CategoriesSettings />} />
          <Route path="/settings/locations" element={<LocationsSettings />} />
          <Route path="/settings/seasons" element={<SeasonsSettings />} />
          <Route path="/import" element={<Import />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

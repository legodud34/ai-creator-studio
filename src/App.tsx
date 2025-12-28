import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { GalleryProvider } from "@/contexts/GalleryContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import CookieConsent from "@/components/CookieConsent";
import RequireAuth from "@/components/RequireAuth";
import Index from "./pages/Index";
import Gallery from "./pages/Gallery";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import Explore from "./pages/Explore";
import Shorts from "./pages/Shorts";
import ShortVideos from "./pages/ShortVideos";
import LongVideos from "./pages/LongVideos";
import Movies from "./pages/Movies";
import AdminDashboard from "./pages/AdminDashboard";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Contact from "./pages/Contact";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <GalleryProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Public routes */}
              <Route path="/auth" element={<Auth />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/contact" element={<Contact />} />
              
              {/* Protected routes */}
              <Route path="/" element={<RequireAuth><Index /></RequireAuth>} />
              <Route path="/gallery" element={<RequireAuth><Gallery /></RequireAuth>} />
              <Route path="/profile/:username" element={<RequireAuth><Profile /></RequireAuth>} />
              <Route path="/explore" element={<RequireAuth><Explore /></RequireAuth>} />
              <Route path="/shorts" element={<RequireAuth><Shorts /></RequireAuth>} />
              <Route path="/short-videos" element={<RequireAuth><ShortVideos /></RequireAuth>} />
              <Route path="/long-videos" element={<RequireAuth><LongVideos /></RequireAuth>} />
              <Route path="/movies" element={<RequireAuth><Movies /></RequireAuth>} />
              <Route path="/admin" element={<RequireAuth><AdminDashboard /></RequireAuth>} />
              
              <Route path="*" element={<NotFound />} />
            </Routes>
            <CookieConsent />
          </BrowserRouter>
        </GalleryProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;

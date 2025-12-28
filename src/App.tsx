import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { GalleryProvider } from "@/contexts/GalleryContext";
import Index from "./pages/Index";
import Gallery from "./pages/Gallery";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import Explore from "./pages/Explore";
import Shorts from "./pages/Shorts";
import ShortVideos from "./pages/ShortVideos";
import LongVideos from "./pages/LongVideos";
import Movies from "./pages/Movies";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <GalleryProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/gallery" element={<Gallery />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/profile/:username" element={<Profile />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/shorts" element={<Shorts />} />
            <Route path="/short-videos" element={<ShortVideos />} />
            <Route path="/long-videos" element={<LongVideos />} />
            <Route path="/movies" element={<Movies />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </GalleryProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;

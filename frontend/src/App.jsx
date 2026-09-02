import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { UploadPage } from "./pages/UploadPage.jsx";
import { DashboardPage } from "./pages/DashboardPage.jsx";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="min-h-screen bg-slate-100 text-slate-900 font-sans antialiased">
          <Routes>
            <Route path="/" element={<UploadPage />} />
            <Route path="/batches/:id" element={<DashboardPage />} />
          </Routes>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

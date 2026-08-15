import { BrowserRouter, Routes, Route } from "react-router-dom";
import { DataProvider } from "@/context/DataContext";
import { Layout } from "@/components/Layout";
import Welcome from "@/pages/Welcome";
import Overview from "@/pages/Overview";
import Insights from "@/pages/Insights";
import AskRuniq from "@/pages/AskRuniq";
import { Toaster } from "@/components/ui/sonner";

function App() {
  return (
    <DataProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Welcome />} />
          <Route element={<Layout />}>
            <Route path="/overview" element={<Overview />} />
            <Route path="/insights" element={<Insights />} />
            <Route path="/ask" element={<AskRuniq />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </DataProvider>
  );
}

export default App;

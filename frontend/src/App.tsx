import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import { ErrorBoundary } from "./components/ErrorBoundary";

const App = () => (
  <ErrorBoundary>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="*" element={<Index />} />
      </Routes>
    </BrowserRouter>
  </ErrorBoundary>
);

export default App;

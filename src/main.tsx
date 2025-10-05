import { StrictMode } from 'react';
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { useAffiliate } from './hooks/useAffiliate';

// Initialize affiliate tracking
const AffiliateWrapper = () => {
  useAffiliate();
  return <App />;
};

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AffiliateWrapper />
  </StrictMode>
);

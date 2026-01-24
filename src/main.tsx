import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { setupGlobalErrorHandlers } from "./lib/errorHandlers";

// Install global error handlers early to catch any crashes
setupGlobalErrorHandlers();

createRoot(document.getElementById("root")!).render(<App />);

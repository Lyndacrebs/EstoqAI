import React from "react";
import { createRoot } from "react-dom/client";

// ordem importa: tokens (cores) -> tailwind -> base -> componentes -> telas
import "./styles/tokens.css";
import "./styles/tailwind.css";
import "./styles/base.css";
import "./styles/components.css";
import "./styles/layout.css";
import "./styles/login.css";

import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

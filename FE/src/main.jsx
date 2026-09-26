import { createRoot } from "react-dom/client";
import App from "~/App.jsx";
import "~/styles/reset.css";
import "~/styles/main.css";
import "~/i18n";

createRoot(document.getElementById("root")).render(<App />);

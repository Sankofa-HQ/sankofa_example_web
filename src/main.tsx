import ReactDOM from "react-dom/client";
import { Sankofa } from "@sankofa/browser";
import { rrwebReplayPlugin } from "@sankofa/replay-rrweb";
import App from "./App";
import "./index.css";

const apiKey = import.meta.env.VITE_SANKOFA_API_KEY;
const endpoint = import.meta.env.VITE_SANKOFA_ENDPOINT ?? "http://localhost:8080";
const replayEnabled = import.meta.env.VITE_SANKOFA_ENABLE_REPLAY !== "false";

if (apiKey) {
  void Sankofa.init({
    apiKey,
    endpoint,
    debug: true,
    plugins: replayEnabled ? [rrwebReplayPlugin()] : [],
  });
}

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);

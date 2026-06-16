import "./src/config/installErrorHandler"; // MUST be first — captures startup crashes
import { registerRootComponent } from "expo";
import App from "./App";

registerRootComponent(App);

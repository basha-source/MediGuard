import { createContext, useContext } from "react";

type DrawerCtx = { openDrawer: () => void; closeDrawer: () => void };

export const DrawerContext = createContext<DrawerCtx>({
  openDrawer:  () => {},
  closeDrawer: () => {},
});

export const useDrawer = () => useContext(DrawerContext);

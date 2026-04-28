import { Routes, Route, Navigate } from "react-router-dom";
import { Layout }    from "@/components/Layout";
import { Dashboard } from "@/pages/Dashboard";
import { Inventory } from "@/pages/Inventory";
import { Reports }   from "@/pages/Reports";
import { Login }     from "@/pages/Login";
import { CareGuardian } from "@/pages/CareGuardian";

export function App() {
  const isLoggedIn = false; // replace with Firebase Auth check

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      {isLoggedIn ? (
        <Route element={<Layout />}>
          <Route path="/"              element={<Dashboard />} />
          <Route path="/inventory"     element={<Inventory />} />
          <Route path="/reports"       element={<Reports />} />
          <Route path="/care-guardian" element={<CareGuardian />} />
        </Route>
      ) : (
        <Route path="*" element={<Navigate to="/login" replace />} />
      )}
    </Routes>
  );
}

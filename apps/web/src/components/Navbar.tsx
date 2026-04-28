import { Link, useLocation } from "react-router-dom";
import { Colors } from "@mediguard/shared";

const links = [
  { to: "/",              label: "Dashboard"     },
  { to: "/inventory",     label: "Inventory"     },
  { to: "/reports",       label: "Reports"       },
  { to: "/care-guardian", label: "Care Guardian" },
];

export function Navbar() {
  const { pathname } = useLocation();
  return (
    <nav style={{ width: 220, backgroundColor: Colors.primary, minHeight: "100vh", padding: "24px 0" }}>
      <div style={{ padding: "0 20px 24px", borderBottom: "1px solid #388E3C" }}>
        <span style={{ color: Colors.white, fontSize: 20, fontWeight: "bold" }}>+ MediGuard</span>
      </div>
      {links.map(({ to, label }) => (
        <Link key={to} to={to} style={{
          display: "block", padding: "14px 20px", textDecoration: "none",
          color: pathname === to ? Colors.white : Colors.primaryPale,
          backgroundColor: pathname === to ? Colors.greenDark : "transparent",
          fontWeight: pathname === to ? "600" : "normal",
          fontSize: 14,
        }}>
          {label}
        </Link>
      ))}
    </nav>
  );
}

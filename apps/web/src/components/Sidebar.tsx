import { NavLink, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "@/config/firebaseServices";
import { useAuthStore } from "@/store/authStore";

type NavItem = { icon: string; label: string; to: string };

const PATIENT_NAV: { section: string; items: NavItem[] }[] = [
  {
    section: "Main",
    items: [
      { icon: "⊞", label: "Dashboard",    to: "/" },
      { icon: "💊", label: "Inventory",    to: "/inventory" },
      { icon: "📋", label: "Dose Tracker", to: "/doses" },
      { icon: "👤", label: "Profile",      to: "/profile" },
    ],
  },
  {
    section: "Health Tracking",
    items: [
      { icon: "❤️",  label: "Vitals",             to: "/vitals" },
      { icon: "📊", label: "Adherence",           to: "/adherence" },
      { icon: "💉", label: "Vaccination",         to: "/vaccination" },
      { icon: "⏰", label: "Missed Doses",        to: "/missed-doses" },
    ],
  },
  {
    section: "Medicines",
    items: [
      { icon: "⚠️",  label: "Drug Interactions", to: "/drug-interactions" },
      { icon: "🕐", label: "Expiry Alerts",      to: "/expiry-alerts" },
      { icon: "🔄", label: "Substitutes",        to: "/substitutes" },
      { icon: "📜", label: "Med History",        to: "/medicine-history" },
      { icon: "🔔", label: "Side Effects",       to: "/side-effects" },
    ],
  },
  {
    section: "Tools & Services",
    items: [
      { icon: "🤖", label: "AI Assistant",         to: "/ai-assistant" },
      { icon: "📄", label: "Prescriptions",        to: "/prescriptions" },
      { icon: "🗺️",  label: "Pharmacy Map",        to: "/pharmacy-map" },
    ],
  },
  {
    section: "Family & Care",
    items: [
      { icon: "👨‍👩‍👧", label: "Family Profiles", to: "/family" },
      { icon: "🏥", label: "Health Profile",  to: "/health-profile" },
    ],
  },
  {
    section: "Reports",
    items: [
      { icon: "📑", label: "Doctor Report", to: "/doctor-report" },
      { icon: "💾", label: "Export Data",   to: "/export" },
    ],
  },
  {
    section: "Safety & Settings",
    items: [
      { icon: "✈️",  label: "Travel Mode",    to: "/travel-mode" },
      { icon: "🆘", label: "Emergency SOS",  to: "/emergency-sos" },
      { icon: "🗑️",  label: "Disposal Guide", to: "/disposal-guide" },
      { icon: "🔔", label: "Notifications",  to: "/notifications" },
    ],
  },
];

const CG_NAV: { section: string; items: NavItem[] }[] = [
  {
    section: "Main",
    items: [
      { icon: "⊞", label: "Dashboard",       to: "/cg" },
      { icon: "👁️",  label: "Patient Monitor", to: "/cg/monitor" },
      { icon: "🔔", label: "Alerts",          to: "/cg/alerts" },
      { icon: "👤", label: "Profile",         to: "/profile" },
    ],
  },
];

export function Sidebar() {
  const { user } = useAuthStore();
  const navigate  = useNavigate();
  const nav       = user?.role === "careGuardian" ? CG_NAV : PATIENT_NAV;
  const initials  = (user?.name ?? user?.email ?? "U").slice(0, 2).toUpperCase();

  async function handleLogout() {
    await signOut(auth());
    navigate("/login", { replace: true });
  }

  return (
    <aside className="w-60 bg-primary text-white flex flex-col min-h-screen shrink-0">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-green-dark">
        <span className="text-xl font-bold tracking-tight">+ MediGuard</span>
        <p className="text-xs text-primary-pale mt-0.5 opacity-75">
          {user?.role === "careGuardian" ? "Care Guardian" : "Patient Portal"}
        </p>
      </div>

      {/* User strip */}
      <div className="flex items-center gap-3 px-4 py-3 bg-green-dark">
        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold shrink-0">
          {initials}
        </div>
        <div className="overflow-hidden">
          <p className="text-sm font-semibold truncate">{user?.name ?? "User"}</p>
          <p className="text-[11px] opacity-70 truncate">{user?.email}</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin py-2">
        {nav.map(({ section, items }) => (
          <div key={section} className="mb-1">
            <p className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-primary-pale opacity-60">
              {section}
            </p>
            {items.map(({ icon, label, to }) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/" || to === "/cg"}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-4 py-2 text-sm transition-colors ${
                    isActive
                      ? "bg-white/15 font-semibold"
                      : "opacity-80 hover:bg-white/10 hover:opacity-100"
                  }`
                }
              >
                <span className="text-base w-5 text-center">{icon}</span>
                {label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Sign out */}
      <button
        onClick={handleLogout}
        className="flex items-center gap-2.5 px-4 py-3 text-sm border-t border-green-dark text-red-300 hover:bg-white/10 transition-colors"
      >
        <span className="text-base">🚪</span>
        Sign Out
      </button>
    </aside>
  );
}

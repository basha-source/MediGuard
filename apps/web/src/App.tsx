import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth }            from "@/hooks/useAuth";
import { useAuthStore }       from "@/store/authStore";
import { Layout }             from "@/components/Layout";

// Auth
import { LoginPage }          from "@/pages/auth/LoginPage";
import { RoleSelectionPage }  from "@/pages/auth/RoleSelectionPage";
import { HealthSetupPage }    from "@/pages/auth/HealthSetupPage";
import { ForgotPasswordPage } from "@/pages/auth/ForgotPasswordPage";

// Patient
import { DashboardPage }        from "@/pages/patient/DashboardPage";
import { InventoryPage }        from "@/pages/patient/InventoryPage";
import { DoseTrackerPage }      from "@/pages/patient/DoseTrackerPage";
import { ProfilePage }          from "@/pages/patient/ProfilePage";
import { VitalsPage }           from "@/pages/patient/VitalsPage";
import { AdherencePage }        from "@/pages/patient/AdherencePage";
import { VaccinationPage }      from "@/pages/patient/VaccinationPage";
import { MissedDosesPage }      from "@/pages/patient/MissedDosesPage";
import { DrugInteractionsPage } from "@/pages/patient/DrugInteractionsPage";
import { ExpiryAlertsPage }     from "@/pages/patient/ExpiryAlertsPage";
import { SubstituteFinderPage } from "@/pages/patient/SubstituteFinderPage";
import { MedicineHistoryPage }  from "@/pages/patient/MedicineHistoryPage";
import { SideEffectsPage }      from "@/pages/patient/SideEffectsPage";
import { AIAssistantPage }      from "@/pages/patient/AIAssistantPage";
import { PrescriptionUploadPage } from "@/pages/patient/PrescriptionUploadPage";
import { PharmacyMapPage }      from "@/pages/patient/PharmacyMapPage";
import { FamilyProfilesPage }   from "@/pages/patient/FamilyProfilesPage";
import { HealthProfilePage }    from "@/pages/patient/HealthProfilePage";
import { TravelModePage }       from "@/pages/patient/TravelModePage";
import { EmergencySOSPage }     from "@/pages/patient/EmergencySOSPage";
import { DisposalGuidePage }    from "@/pages/patient/DisposalGuidePage";
import { NotificationPrefsPage } from "@/pages/patient/NotificationPrefsPage";
import { DoctorReportPage }     from "@/pages/patient/DoctorReportPage";
import { ExportDataPage }       from "@/pages/patient/ExportDataPage";

// Care Guardian
import { CGDashboardPage }      from "@/pages/careGuardian/CGDashboardPage";
import { CGPatientMonitorPage } from "@/pages/careGuardian/CGPatientMonitorPage";
import { CGAlertsPage }         from "@/pages/careGuardian/CGAlertsPage";

function AppRoutes() {
  const { user, loading } = useAuthStore();

  if (loading) return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-3 animate-pulse">
          <span className="text-2xl">💊</span>
        </div>
        <p className="text-text-secondary text-sm">Loading MediGuard…</p>
      </div>
    </div>
  );

  if (!user) {
    return (
      <Routes>
        <Route path="/login"          element={<LoginPage />} />
        <Route path="/role-selection" element={<RoleSelectionPage />} />
        <Route path="/health-setup"   element={<HealthSetupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="*"               element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  const isCG = user.role === "careGuardian";

  return (
    <Routes>
      <Route element={<Layout />}>
        {/* Shared */}
        <Route path="/profile" element={<ProfilePage />} />

        {isCG ? (
          <>
            <Route path="/"          element={<Navigate to="/cg" replace />} />
            <Route path="/cg"        element={<CGDashboardPage />} />
            <Route path="/cg/monitor" element={<CGPatientMonitorPage />} />
            <Route path="/cg/alerts" element={<CGAlertsPage />} />
          </>
        ) : (
          <>
            <Route path="/"                  element={<DashboardPage />} />
            <Route path="/inventory"         element={<InventoryPage />} />
            <Route path="/doses"             element={<DoseTrackerPage />} />
            <Route path="/vitals"            element={<VitalsPage />} />
            <Route path="/adherence"         element={<AdherencePage />} />
            <Route path="/vaccination"       element={<VaccinationPage />} />
            <Route path="/missed-doses"      element={<MissedDosesPage />} />
            <Route path="/drug-interactions" element={<DrugInteractionsPage />} />
            <Route path="/expiry-alerts"     element={<ExpiryAlertsPage />} />
            <Route path="/substitutes"       element={<SubstituteFinderPage />} />
            <Route path="/medicine-history"  element={<MedicineHistoryPage />} />
            <Route path="/side-effects"      element={<SideEffectsPage />} />
            <Route path="/ai-assistant"      element={<AIAssistantPage />} />
            <Route path="/prescriptions"     element={<PrescriptionUploadPage />} />
            <Route path="/pharmacy-map"      element={<PharmacyMapPage />} />
            <Route path="/family"            element={<FamilyProfilesPage />} />
            <Route path="/health-profile"    element={<HealthProfilePage />} />
            <Route path="/travel-mode"       element={<TravelModePage />} />
            <Route path="/emergency-sos"     element={<EmergencySOSPage />} />
            <Route path="/disposal-guide"    element={<DisposalGuidePage />} />
            <Route path="/notifications"     element={<NotificationPrefsPage />} />
            <Route path="/doctor-report"     element={<DoctorReportPage />} />
            <Route path="/export"            element={<ExportDataPage />} />
          </>
        )}

        <Route path="*" element={<Navigate to={isCG ? "/cg" : "/"} replace />} />
      </Route>
    </Routes>
  );
}

export function App() {
  useAuth();
  return <AppRoutes />;
}

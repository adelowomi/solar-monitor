import { useSession } from "./hooks/useSession";
import { useSettings } from "./hooks/useSettings";
import { Login } from "./components/Login";
import { Dashboard } from "./components/Dashboard";

export default function App() {
  const { session, signIn, signOut } = useSession();
  const { settings, updateSettings } = useSettings();

  if (!session) {
    return <Login onLogin={signIn} />;
  }

  return (
    <Dashboard
      session={session}
      onLogout={signOut}
      settings={settings}
      onUpdateSettings={updateSettings}
    />
  );
}

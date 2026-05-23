import { useApi } from "./hooks/useApi";
import { useSettings } from "./hooks/useSettings";
import { Dashboard } from "./components/Dashboard";
import { ConfigMissing } from "./components/ConfigMissing";

export default function App() {
  const { config, client } = useApi();
  const { settings, updateSettings } = useSettings();

  if (!config || !client) return <ConfigMissing />;

  return (
    <Dashboard
      client={client}
      apiBase={config.baseUrl}
      settings={settings}
      onUpdateSettings={updateSettings}
    />
  );
}

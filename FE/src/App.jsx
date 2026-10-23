import AppRoutes from "~/components/AppRoutes";
import { AuthProvider } from "~/contexts/AuthContext";
import ServerWakeBanner from "~/components/ServerWakeBanner";

function App() {
  return (
    <AuthProvider>
      <ServerWakeBanner />
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;

import AppRoutes from "~/components/AppRoutes";
import { AuthProvider } from "~/contexts/AuthContext";

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;

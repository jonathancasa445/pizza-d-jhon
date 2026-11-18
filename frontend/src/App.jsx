import { useRoute } from './hooks/useRoute';
import { AdminAuthProvider } from './admin/AdminAuthContext';
import AdminLoginPage from './admin/AdminLoginPage';
import AdminProtectedRoute from './admin/AdminProtectedRoute';
import AdminDashboard from './admin/AdminDashboard';
import PublicApp from './public/PublicApp';
import './App.css';

function App() {
  const route = useRoute();

  if (route.name === 'admin' || route.name === 'adminLogin') {
    return (
      <AdminAuthProvider>
        {route.name === 'adminLogin' ? (
          <AdminLoginPage />
        ) : (
          <AdminProtectedRoute>
            <AdminDashboard />
          </AdminProtectedRoute>
        )}
      </AdminAuthProvider>
    );
  }

  if (route.name === 'notFound') {
    return (
      <main className="admin-public-fallback">
        <h1>Página no encontrada</h1>
        <p>
          <a href="/">Volver al inicio</a>
        </p>
      </main>
    );
  }

  return <PublicApp />;
}

export default App;


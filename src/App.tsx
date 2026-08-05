import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { LogoProvider } from './contexts/LogoContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Eleves from './pages/Eleves';
import Finances from './pages/Finances';
import FournituresEleves from './pages/FournituresEleves';
import FournituresBureau from './pages/FournituresBureau';
import Rapports from './pages/Rapports';
import Configuration from './pages/Configuration';
import Profile from './pages/Profile';
import Admin from './pages/Admin';
import Paiements from './pages/Paiements';
import TableauBordComptable from './pages/TableauBordComptable';
import StockUniforms from './pages/StockUniforms';
import Chat from './pages/Chat';
import PortailParent from './pages/PortailParent';

function App() {
  return (
    <Router>
      <AuthProvider>
        <LogoProvider>
        <Routes>
          <Route path="/portail-parent" element={<PortailParent />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/eleves"
            element={
              <ProtectedRoute>
                <Layout>
                  <Eleves />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/minerval"
            element={<Navigate to="/paiements" replace />}
          />

          <Route
            path="/finances"
            element={
              <ProtectedRoute>
                <Layout>
                  <Finances />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/fournitures-eleves"
            element={
              <ProtectedRoute>
                <Layout>
                  <FournituresEleves />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/fournitures-bureau"
            element={
              <ProtectedRoute>
                <Layout>
                  <FournituresBureau />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/rapports"
            element={
              <ProtectedRoute>
                <Layout>
                  <Rapports />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/configuration"
            element={
              <ProtectedRoute requireAdmin>
                <Layout>
                  <Configuration />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Layout>
                  <Profile />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin"
            element={
              <ProtectedRoute requireAdmin>
                <Layout>
                  <Admin />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/paiements"
            element={
              <ProtectedRoute>
                <Layout>
                  <Paiements />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/tableau-bord-comptable"
            element={
              <ProtectedRoute requireAdminOrCoord>
                <Layout>
                  <TableauBordComptable />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/stock-uniformes"
            element={
              <ProtectedRoute>
                <Layout>
                  <StockUniforms />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/chat"
            element={
              <ProtectedRoute>
                <Layout>
                  <Chat />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </LogoProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;

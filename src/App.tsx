import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AuthProvider } from './contexts/AuthContext';
import { LogoProvider } from './contexts/LogoContext';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/Layout';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000, // 30s default stale time
    },
  },
});

// Lazy-loaded pages — each is its own chunk, loaded on demand
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Eleves = lazy(() => import('./pages/Eleves'));
const Finances = lazy(() => import('./pages/Finances'));
const FournituresEleves = lazy(() => import('./pages/FournituresEleves'));
const FournituresBureau = lazy(() => import('./pages/FournituresBureau'));
const Rapports = lazy(() => import('./pages/Rapports'));
const Configuration = lazy(() => import('./pages/Configuration'));
const Profile = lazy(() => import('./pages/Profile'));
const Admin = lazy(() => import('./pages/Admin'));
const Paiements = lazy(() => import('./pages/Paiements'));
const TableauBordComptable = lazy(() => import('./pages/TableauBordComptable'));
const StockUniforms = lazy(() => import('./pages/StockUniforms'));
const Chat = lazy(() => import('./pages/Chat'));
const PortailParent = lazy(() => import('./pages/PortailParent'));
const PortailProfesseur = lazy(() => import('./pages/PortailProfesseur'));
const GestionCours = lazy(() => import('./pages/GestionCours'));
const GestionDevoirs = lazy(() => import('./pages/GestionDevoirs'));
const PortailRecouvrement = lazy(() => import('./pages/PortailRecouvrement'));
const PortailPointage = lazy(() => import('./pages/PortailPointage'));
const CarteEtudiant = lazy(() => import('./pages/CarteEtudiant'));
const ApercuCartes = lazy(() => import('./pages/ApercuCartes'));
const ApercuCarteService = lazy(() => import('./pages/ApercuCarteService'));
const VerifierFacture = lazy(() => import('./pages/VerifierFacture'));
const Personnel = lazy(() => import('./pages/Personnel'));
const PersonnelDetail = lazy(() => import('./pages/PersonnelDetail'));
const PointagePersonnel = lazy(() => import('./pages/PointagePersonnel'));
const PointageEleves = lazy(() => import('./pages/PointageEleves'));
const PortailPointageEleves = lazy(() => import('./pages/PortailPointageEleves'));
const CarteServicePublic = lazy(() => import('./pages/CarteServicePublic'));
const Recouvrement = lazy(() => import('./pages/Recouvrement'));

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="mt-3 text-gray-500 text-sm">Chargement...</p>
      </div>
    </div>
  );
}

function LazyPage({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingFallback />}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
    <Router>
      <AuthProvider>
        <LogoProvider>
          <Toaster
            position="top-right"
            richColors
            closeButton
            toastOptions={{
              duration: 4000,
            }}
          />
          <Routes>
            {/* Public routes */}
            <Route
              path="/carte/:matricule"
              element={
                <ErrorBoundary>
                  <Suspense fallback={<LoadingFallback />}>
                    <CarteEtudiant />
                  </Suspense>
                </ErrorBoundary>
              }
            />
            <Route
              path="/apercu-cartes"
              element={
                <ErrorBoundary>
                  <Suspense fallback={<LoadingFallback />}>
                    <ApercuCartes />
                  </Suspense>
                </ErrorBoundary>
              }
            />
            <Route
              path="/verifier-facture/:numero"
              element={
                <ErrorBoundary>
                  <Suspense fallback={<LoadingFallback />}>
                    <VerifierFacture />
                  </Suspense>
                </ErrorBoundary>
              }
            />
            <Route
              path="/apercu-carte-service"
              element={
                <ErrorBoundary>
                  <Suspense fallback={<LoadingFallback />}>
                    <ApercuCarteService />
                  </Suspense>
                </ErrorBoundary>
              }
            />
            <Route
              path="/carte-service/:matricule"
              element={
                <ErrorBoundary>
                  <Suspense fallback={<LoadingFallback />}>
                    <CarteServicePublic />
                  </Suspense>
                </ErrorBoundary>
              }
            />
            <Route
              path="/portail-parent"
              element={
                <ErrorBoundary>
                  <Suspense fallback={<LoadingFallback />}>
                    <PortailParent />
                  </Suspense>
                </ErrorBoundary>
              }
            />
            <Route
              path="/portail-recouvrement"
              element={
                <ErrorBoundary>
                  <Suspense fallback={<LoadingFallback />}>
                    <PortailRecouvrement />
                  </Suspense>
                </ErrorBoundary>
              }
            />
            <Route
              path="/portail-pointage"
              element={
                <ErrorBoundary>
                  <Suspense fallback={<LoadingFallback />}>
                    <PortailPointage />
                  </Suspense>
                </ErrorBoundary>
              }
            />
            <Route
              path="/portail-pointage-eleves"
              element={
                <ErrorBoundary>
                  <Suspense fallback={<LoadingFallback />}>
                    <PortailPointageEleves />
                  </Suspense>
                </ErrorBoundary>
              }
            />
            <Route
              path="/login"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <Login />
                </Suspense>
              }
            />
            <Route
              path="/signup"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <Signup />
                </Suspense>
              }
            />

            {/* Protected routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout>
                    <LazyPage><Dashboard /></LazyPage>
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/eleves"
              element={
                <ProtectedRoute>
                  <Layout>
                    <LazyPage><Eleves /></LazyPage>
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/personnel"
              element={
                <ProtectedRoute>
                  <Layout>
                    <LazyPage><Personnel /></LazyPage>
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/personnel/:id"
              element={
                <ProtectedRoute>
                  <Layout>
                    <LazyPage><PersonnelDetail /></LazyPage>
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/recouvrement"
              element={
                <ProtectedRoute>
                  <Layout>
                    <LazyPage><Recouvrement /></LazyPage>
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/pointage"
              element={
                <ProtectedRoute>
                  <Layout>
                    <LazyPage><PointagePersonnel /></LazyPage>
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/pointage-eleves"
              element={
                <ProtectedRoute>
                  <Layout>
                    <LazyPage><PointageEleves /></LazyPage>
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
                    <LazyPage><Finances /></LazyPage>
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/fournitures-eleves"
              element={
                <ProtectedRoute>
                  <Layout>
                    <LazyPage><FournituresEleves /></LazyPage>
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/fournitures-bureau"
              element={
                <ProtectedRoute>
                  <Layout>
                    <LazyPage><FournituresBureau /></LazyPage>
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/rapports"
              element={
                <ProtectedRoute>
                  <Layout>
                    <LazyPage><Rapports /></LazyPage>
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/configuration"
              element={
                <ProtectedRoute requireAdmin>
                  <Layout>
                    <LazyPage><Configuration /></LazyPage>
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Layout>
                    <LazyPage><Profile /></LazyPage>
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin"
              element={
                <ProtectedRoute requireAdmin>
                  <Layout>
                    <LazyPage><Admin /></LazyPage>
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/paiements"
              element={
                <ProtectedRoute>
                  <Layout>
                    <LazyPage><Paiements /></LazyPage>
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/tableau-bord-comptable"
              element={
                <ProtectedRoute requireAdminOrCoord>
                  <Layout>
                    <LazyPage><TableauBordComptable /></LazyPage>
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/stock-uniformes"
              element={
                <ProtectedRoute>
                  <Layout>
                    <LazyPage><StockUniforms /></LazyPage>
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/chat"
              element={
                <ProtectedRoute>
                  <Layout>
                    <LazyPage><Chat /></LazyPage>
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/portail-professeur"
              element={
                <ProtectedRoute>
                  <Layout>
                    <LazyPage><PortailProfesseur /></LazyPage>
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/gestion-cours"
              element={
                <ProtectedRoute>
                  <Layout>
                    <LazyPage><GestionCours /></LazyPage>
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/gestion-devoirs"
              element={
                <ProtectedRoute>
                  <Layout>
                    <LazyPage><GestionDevoirs /></LazyPage>
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </LogoProvider>
      </AuthProvider>
    </Router>
    </QueryClientProvider>
  );
}

export default App;
import { lazy, Suspense } from 'react';
import { createBrowserRouter, createHashRouter, RouterProvider } from 'react-router-dom';
import { AppShell } from '@/components/layout';
import Dashboard from '@/pages/Dashboard';
import Intake from '@/pages/Intake';
import Triage from '@/pages/Triage';
import TriageDetail from '@/pages/TriageDetail';
import Patients from '@/pages/Patients';
import PatientRecord from '@/pages/PatientRecord';
import Documents from '@/pages/Documents';
import Scribe from '@/pages/Scribe';
import Receptionist from '@/pages/Receptionist';
import Automations from '@/pages/Automations';
import Referrals from '@/pages/Referrals';
import ActivityLog from '@/pages/ActivityLog';
import SecurityLab from '@/pages/SecurityLab';
import NotFound from '@/pages/NotFound';

// Charts are heavy: load the analytics page (and Recharts) only when it's opened.
const Analytics = lazy(() => import('@/pages/Analytics'));
const loading = <p className="p-6 text-sm text-ink-600 dark:text-ink-400">Loading…</p>;

export const routes = [
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'intake', element: <Intake /> },
      { path: 'triage', element: <Triage /> },
      { path: 'triage/:id', element: <TriageDetail /> },
      { path: 'patients', element: <Patients /> },
      { path: 'patients/:id', element: <PatientRecord /> },
      { path: 'documents', element: <Documents /> },
      { path: 'scribe', element: <Scribe /> },
      { path: 'receptionist', element: <Receptionist /> },
      { path: 'automations', element: <Automations /> },
      { path: 'analytics', element: <Suspense fallback={loading}><Analytics /></Suspense> },
      { path: 'referrals', element: <Referrals /> },
      { path: 'activity', element: <ActivityLog /> },
      { path: 'security', element: <SecurityLab /> },
      { path: '*', element: <NotFound /> },
    ],
  },
];

// Static hosts such as GitHub Pages can't route /triage etc. to the app, so the hosted build uses
// hash links (…/#/triage): every link loads with a normal 200 status. Local development keeps clean URLs.
const router = import.meta.env.VITE_HASH_ROUTER === '1'
  ? createHashRouter(routes)
  : createBrowserRouter(routes, { basename: import.meta.env.BASE_URL.replace(/\/$/, '') || '/' });

export default function App() {
  return <RouterProvider router={router} />;
}

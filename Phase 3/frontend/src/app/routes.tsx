import { createBrowserRouter } from 'react-router';
import { Layout } from './components/Layout';
import { AnalyticsPageEnhanced } from './pages/AnalyticsPageEnhanced';
import { PreQuestionnairePage } from './pages/PreQuestionnairePage';
import { DesktopSimulationPage } from './pages/DesktopSimulationPage';
import { PostSimulationReflectionPage } from './pages/PostSimulationReflectionPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';

export const router = createBrowserRouter([
  {
    path: '/admin',
    element: <AdminDashboardPage />,
  },
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        index: true,
        element: <PreQuestionnairePage />,
      },
      {
        path: 'simulation',
        element: <DesktopSimulationPage />,
      },
      {
        path: 'reflection',
        element: <PostSimulationReflectionPage />,
      },
      {
        path: 'analytics',
        element: <AnalyticsPageEnhanced />,
      },
    ],
  },
]);

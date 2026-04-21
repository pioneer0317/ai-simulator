import { createBrowserRouter } from 'react-router';
import { Layout } from './components/Layout';
import { ContextPageV2 } from './pages/ContextPageV2';
import { SimulationPageEnhanced } from './pages/SimulationPageEnhanced';
import { ReviewPageV2 } from './pages/ReviewPageV2';
import { AnalyticsPageEnhanced } from './pages/AnalyticsPageEnhanced';
import { ScenarioSelectionPage } from './pages/ScenarioSelectionPage';
import { ScenariosLivePage } from './pages/ScenariosLivePage';
import { ScenariosResultsPage } from './pages/ScenariosResultsPage';
import { RoleSelectionPage } from './pages/RoleSelectionPage';
import { LiveChatPage } from './pages/LiveChatPage';
import { ChatResultsPage } from './pages/ChatResultsPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        index: true,
        element: <RoleSelectionPage />,
      },
      {
        path: 'live-chat',
        element: <LiveChatPage />,
      },
      {
        path: 'chat-results',
        element: <ChatResultsPage />,
      },
      {
        path: 'scenarios',
        element: <ScenarioSelectionPage />,
      },
      {
        path: 'context',
        element: <ContextPageV2 />,
      },
      {
        path: 'simulation',
        element: <SimulationPageEnhanced />,
      },
      {
        path: 'review',
        element: <ReviewPageV2 />,
      },
      {
        path: 'analytics',
        element: <AnalyticsPageEnhanced />,
      },
      {
        path: 'scenarios-live',
        element: <ScenariosLivePage />,
      },
      {
        path: 'scenarios-results',
        element: <ScenariosResultsPage />,
      },
    ],
  },
]);
import { RouterProvider } from 'react-router';
import { router } from './routes';
import { SimulationProvider } from './context/SimulationContext';

export default function App() {
  return (
    <SimulationProvider>
      <RouterProvider router={router} />
    </SimulationProvider>
  );
}
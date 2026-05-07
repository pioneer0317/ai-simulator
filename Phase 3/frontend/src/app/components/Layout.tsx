import { Outlet, useLocation } from 'react-router';
import { Stepper } from './Stepper';

const steps = [
  { label: 'Pre-questionnaire', path: '/' },
  { label: 'Interactive Desktop', path: '/simulation' },
  { label: 'Reflection', path: '/reflection' },
  { label: 'Results', path: '/analytics' },
];

export function Layout() {
  const location = useLocation();
  
  const currentStepIndex = steps.findIndex((step) => step.path === location.pathname);
  const showStepper = currentStepIndex !== -1 && location.pathname !== '/simulation';

  return (
    <div className="min-h-screen flex flex-col">
      {showStepper && <Stepper steps={steps} currentStep={currentStepIndex} />}
      <div className="flex-1">
        <Outlet />
      </div>
    </div>
  );
}

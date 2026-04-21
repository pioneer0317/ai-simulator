import { Outlet, useLocation } from 'react-router';
import { Stepper } from './Stepper';

const steps = [
  { label: 'Context', path: '/' },
  { label: 'Live Simulation', path: '/live-chat' },
  { label: 'AI Review', path: '/review' },
  { label: 'Final Analytics', path: '/analytics' },
];

export function Layout() {
  const location = useLocation();
  
  const currentStepIndex = steps.findIndex((step) => step.path === location.pathname);
  const showStepper = currentStepIndex !== -1;

  return (
    <div className="min-h-screen flex flex-col">
      {showStepper && <Stepper steps={steps} currentStep={currentStepIndex} />}
      <div className="flex-1">
        <Outlet />
      </div>
    </div>
  );
}

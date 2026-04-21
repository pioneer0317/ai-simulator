import { Switch } from './ui/switch';
import { Label } from './ui/label';

export interface ControlSettings {
  hallucination: boolean;
  conflict: boolean;
  timePressure: boolean;
}

interface ControlPanelProps {
  settings: ControlSettings;
  onSettingsChange: (settings: ControlSettings) => void;
}

export function ControlPanel({ settings, onSettingsChange }: ControlPanelProps) {
  const toggleSetting = (key: keyof ControlSettings) => {
    onSettingsChange({
      ...settings,
      [key]: !settings[key],
    });
  };

  return (
    <div className="w-80 bg-gray-50 border-l-2 border-gray-200 p-6 overflow-y-auto">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-800 mb-2">Simulator Manager</h2>
        <p className="text-sm text-gray-600">Control agent behaviors</p>
      </div>

      {/* Hallucination Toggle */}
      <div className="mb-6 p-4 bg-white rounded-xl border-2 border-orange-200 shadow-sm">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <Label htmlFor="hallucination" className="text-base font-semibold text-gray-800 cursor-pointer">
              Make Agent Lie
            </Label>
            <p className="text-sm text-gray-600 mt-1">
              Agent will make false claims with high confidence
            </p>
          </div>
          <Switch
            id="hallucination"
            checked={settings.hallucination}
            onCheckedChange={() => toggleSetting('hallucination')}
            className="data-[state=checked]:bg-orange-500"
          />
        </div>
        <div className={`mt-3 px-3 py-2 rounded-lg text-sm font-medium ${
          settings.hallucination 
            ? 'bg-orange-100 text-orange-800 border border-orange-300' 
            : 'bg-gray-100 text-gray-500'
        }`}>
          {settings.hallucination ? '🟠 Hallucination Active' : '⚪ Hallucination Off'}
        </div>
      </div>

      {/* Conflict Toggle */}
      <div className="mb-6 p-4 bg-white rounded-xl border-2 border-purple-200 shadow-sm">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <Label htmlFor="conflict" className="text-base font-semibold text-gray-800 cursor-pointer">
              Create Disagreement
            </Label>
            <p className="text-sm text-gray-600 mt-1">
              Agents will contradict each other
            </p>
          </div>
          <Switch
            id="conflict"
            checked={settings.conflict}
            onCheckedChange={() => toggleSetting('conflict')}
            className="data-[state=checked]:bg-purple-500"
          />
        </div>
        <div className={`mt-3 px-3 py-2 rounded-lg text-sm font-medium ${
          settings.conflict 
            ? 'bg-purple-100 text-purple-800 border border-purple-300' 
            : 'bg-gray-100 text-gray-500'
        }`}>
          {settings.conflict ? '🟣 Conflict Active' : '⚪ Conflict Off'}
        </div>
      </div>

      {/* Time Pressure Toggle */}
      <div className="mb-6 p-4 bg-white rounded-xl border-2 border-red-200 shadow-sm">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <Label htmlFor="timePressure" className="text-base font-semibold text-gray-800 cursor-pointer">
              Add Time Pressure
            </Label>
            <p className="text-sm text-gray-600 mt-1">
              Shows urgent timer and deadline messages
            </p>
          </div>
          <Switch
            id="timePressure"
            checked={settings.timePressure}
            onCheckedChange={() => toggleSetting('timePressure')}
            className="data-[state=checked]:bg-red-500"
          />
        </div>
        <div className={`mt-3 px-3 py-2 rounded-lg text-sm font-medium ${
          settings.timePressure 
            ? 'bg-red-100 text-red-800 border border-red-300' 
            : 'bg-gray-100 text-gray-500'
        }`}>
          {settings.timePressure ? '🔴 Time Pressure Active' : '⚪ Time Pressure Off'}
        </div>
      </div>

      {/* Info Box */}
      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <h3 className="font-semibold text-blue-900 mb-2">💡 How to Use</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Toggle scenarios above</li>
          <li>• Watch how agents behave</li>
          <li>• Test user trust responses</li>
          <li>• Review captured data</li>
        </ul>
      </div>
    </div>
  );
}

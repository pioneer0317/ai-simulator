export type DesktopCalendarTaskType = 'meeting' | 'deadline';

export interface DesktopCalendarTask {
  time: string;
  title: string;
  description: string;
  type: DesktopCalendarTaskType;
  color: string;
}

/**
 * Day-view agenda used by the Calendar app and the desktop sidebar widget.
 * Matches the Macbook Desktop Interface prototype (cross-scenario distractors).
 */
export const DESKTOP_CALENDAR_AGENDA: DesktopCalendarTask[] = [
  { time: '9:00 AM', title: 'Team Standup', description: 'Daily sync with the team', type: 'meeting', color: 'bg-blue-100 border-blue-300 text-blue-900' },
  { time: '10:30 AM', title: 'Department Sync', description: 'Weekly cross-team alignment', type: 'meeting', color: 'bg-blue-100 border-blue-300 text-blue-900' },
  { time: '2:00 PM', title: 'Q3 Budget Summary Due', description: 'Finalize budget summary for Priya Sharma - Due EOD', type: 'deadline', color: 'bg-red-100 border-red-300 text-red-900' },
  { time: '3:00 PM', title: 'SEA Expansion Recommendation Due', description: 'Prepare one-page recommendation for Isabelle Torres - Due Thursday EOD', type: 'deadline', color: 'bg-red-100 border-red-300 text-red-900' },
  { time: '4:00 PM', title: 'Weekly Review', description: 'Review progress with team leads', type: 'meeting', color: 'bg-blue-100 border-blue-300 text-blue-900' },
  { time: '5:00 PM', title: 'Jordan Mills Performance Review Due', description: 'Submit performance review and rating for Jordan Mills - HARD DEADLINE', type: 'deadline', color: 'bg-red-100 border-red-300 text-red-900' },
  { time: '5:30 PM', title: 'Feature Launch Go/No-Go Brief Due', description: 'Complete brief for CPO - Due Thursday EOD', type: 'deadline', color: 'bg-red-100 border-red-300 text-red-900' },
];

/** SCN-3-APR day view only (excludes SCN-4-MAS distractor deadline). */
export const DESKTOP_CALENDAR_AGENDA_SCENARIO_3: DesktopCalendarTask[] = DESKTOP_CALENDAR_AGENDA.filter(
  (task) => task.title !== 'Feature Launch Go/No-Go Brief Due',
);

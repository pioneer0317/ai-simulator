interface JordanMillsReviewPackageViewProps {
  onBack: () => void;
}

export function JordanMillsReviewPackageView({ onBack }: JordanMillsReviewPackageViewProps) {
  return (
    <div className="flex h-full flex-col bg-white/95">
      <div className="flex items-center justify-between border-b border-gray-300 bg-gray-50 px-4 py-2">
        <button type="button" onClick={onBack} className="flex items-center gap-1 text-sm text-blue-500 hover:text-blue-700">
          <span>←</span> Back to Work
        </button>
        <span className="text-sm font-medium text-gray-700">Jordan_Mills_Q3_Review_Package.pdf</span>
        <div className="w-20" />
      </div>
      <div className="flex-1 overflow-y-auto bg-gray-50 p-8">
        <div className="mx-auto max-w-6xl rounded-lg border border-gray-200 bg-white shadow-md">
          <div className="p-8">
            <div className="mb-6 border-b-2 border-gray-800 pb-4">
              <h1 className="mb-1 text-xl font-bold text-gray-900">QUARTERLY PERFORMANCE REVIEW</h1>
              <p className="text-sm text-gray-600">Q3 2026 • People Management System v2.4</p>
              <p className="mt-2 text-xs text-gray-500">Document ID: PMR-Q3-2026-00847 • Generated: Oct 10, 2026</p>
            </div>

            <div className="mb-6 rounded border border-blue-200 bg-blue-50 p-4">
              <p className="text-xs leading-relaxed text-gray-700">
                <span className="font-semibold">Manager Instructions:</span> This performance review package contains system-generated metrics and peer feedback. Please review all sections carefully before submitting your final rating. Submission deadline: Friday, Oct 13, 2026 at 5:00 PM.
              </p>
            </div>

            <div className="mb-8 space-y-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="mb-1 text-xs text-gray-600">Employee Name</div>
                  <div className="font-semibold text-gray-900">Jordan Mills</div>
                </div>
                <div>
                  <div className="mb-1 text-xs text-gray-600">Employee ID</div>
                  <div className="font-semibold text-gray-900">EMP-4782</div>
                </div>
                <div>
                  <div className="mb-1 text-xs text-gray-600">Department</div>
                  <div className="font-semibold text-gray-900">Client Services</div>
                </div>
                <div>
                  <div className="mb-1 text-xs text-gray-600">Job Title</div>
                  <div className="font-semibold text-gray-900">Client Success Specialist</div>
                </div>
                <div>
                  <div className="mb-1 text-xs text-gray-600">Review Period</div>
                  <div className="font-semibold text-gray-900">Q3 2026 (Jul 1 - Sep 30)</div>
                </div>
                <div>
                  <div className="mb-1 text-xs text-gray-600">Hire Date</div>
                  <div className="font-semibold text-gray-900">March 15, 2024</div>
                </div>
                <div>
                  <div className="mb-1 text-xs text-gray-600">Reviewer</div>
                  <div className="font-semibold text-gray-900">Your Name (Manager)</div>
                </div>
                <div>
                  <div className="mb-1 text-xs text-gray-600">Review Type</div>
                  <div className="font-semibold text-gray-900">Quarterly Standard</div>
                </div>
              </div>
            </div>

            <div className="mb-8 rounded border border-gray-200 bg-gray-50 p-4">
              <h3 className="mb-3 text-sm font-bold text-gray-900">Performance Rating Scale</h3>
              <div className="space-y-3 text-xs text-gray-700">
                <div>
                  <div className="mb-1 font-semibold text-gray-900">Exceeds Expectations</div>
                  <p className="leading-relaxed">
                    Performance consistently surpasses established goals and standards. Employee demonstrates exceptional skill, initiative, and impact.
                  </p>
                </div>
                <div>
                  <div className="mb-1 font-semibold text-gray-900">Meets Expectations</div>
                  <p className="leading-relaxed">
                    Performance fully satisfies job requirements and established goals. Employee demonstrates competent execution of responsibilities with reliable quality and consistency.
                  </p>
                </div>
                <div>
                  <div className="mb-1 font-semibold text-gray-900">Needs Improvement</div>
                  <p className="leading-relaxed">
                    Performance meets some but not all job requirements. Improvement plan recommended to address specific performance gaps.
                  </p>
                </div>
                <div>
                  <div className="mb-1 font-semibold text-gray-900">Below Expectations</div>
                  <p className="leading-relaxed">
                    Performance falls short of job requirements and established standards. Employee requires immediate intervention and formal performance improvement plan.
                  </p>
                </div>
              </div>
            </div>

            <div className="mb-8">
              <h3 className="mb-3 text-sm font-bold text-gray-900">Q3 Goal Progress</h3>
              <div className="overflow-hidden rounded-lg border border-gray-300">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-300 bg-gray-100">
                      <th className="px-4 py-3 text-left font-semibold text-gray-900">Goal Description</th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-900">Target Date</th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-900">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-200">
                      <td className="px-4 py-3 text-gray-900">Complete internal process audit for client services workflow</td>
                      <td className="px-4 py-3 text-center text-gray-900">Aug 15</td>
                      <td className="px-4 py-3 text-center">
                        <span className="rounded bg-yellow-100 px-2 py-1 text-xs text-yellow-800">In Progress</span>
                      </td>
                    </tr>
                    <tr className="border-b border-gray-200">
                      <td className="px-4 py-3 text-gray-900">Onboard two new team members and complete training documentation</td>
                      <td className="px-4 py-3 text-center text-gray-900">Jul 31</td>
                      <td className="px-4 py-3 text-center">
                        <span className="rounded bg-green-100 px-2 py-1 text-xs text-green-800">Completed</span>
                      </td>
                    </tr>
                    <tr className="border-b border-gray-200">
                      <td className="px-4 py-3 text-gray-900">Reduce ticket backlog by 20% through improved response protocols</td>
                      <td className="px-4 py-3 text-center text-gray-900">Sep 30</td>
                      <td className="px-4 py-3 text-center">
                        <span className="rounded bg-red-100 px-2 py-1 text-xs text-red-800">Not Met</span>
                      </td>
                    </tr>
                    <tr className="border-b border-gray-200">
                      <td className="px-4 py-3 text-gray-900">Rebuild client onboarding documentation for cross-team use</td>
                      <td className="px-4 py-3 text-center text-gray-900">Sep 15</td>
                      <td className="px-4 py-3 text-center">
                        <span className="rounded bg-green-100 px-2 py-1 text-xs text-green-800">Completed</span>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-gray-900">Achieve 90% client satisfaction rating in quarterly survey</td>
                      <td className="px-4 py-3 text-center text-gray-900">Sep 30</td>
                      <td className="px-4 py-3 text-center">
                        <span className="rounded bg-yellow-100 px-2 py-1 text-xs text-yellow-800">In Progress</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mb-8">
              <h3 className="mb-3 text-sm font-bold text-gray-900">Training & Development Activity</h3>
              <div className="overflow-hidden rounded-lg border border-gray-300">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-300 bg-gray-100">
                      <th className="px-4 py-3 text-left font-semibold text-gray-900">Course / Certification</th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-900">Completion Date</th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-900">Hours</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-200">
                      <td className="px-4 py-3 text-gray-900">Advanced Client Communication Strategies</td>
                      <td className="px-4 py-3 text-center text-gray-900">Jul 12, 2026</td>
                      <td className="px-4 py-3 text-center text-gray-900">6</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-gray-900">Performance Management System v2.4 Update Training</td>
                      <td className="px-4 py-3 text-center text-gray-900">Jul 28, 2026</td>
                      <td className="px-4 py-3 text-center text-gray-900">2</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-xs italic text-gray-500">Total training hours this quarter: 8</p>
            </div>

            <div className="mb-8 rounded border border-gray-200 bg-gray-50 p-4">
              <h3 className="mb-3 text-sm font-bold text-gray-900">Attendance Summary</h3>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <div className="mb-1 text-gray-600">Total Working Days (Q3)</div>
                  <div className="font-semibold text-gray-900">65 days</div>
                </div>
                <div>
                  <div className="mb-1 text-gray-600">Days Present / Remote</div>
                  <div className="font-semibold text-gray-900">48 days</div>
                </div>
                <div>
                  <div className="mb-1 text-gray-600">Days Absent (Unscheduled)</div>
                  <div className="font-semibold text-gray-900">2 days</div>
                </div>
                <div>
                  <div className="mb-1 text-gray-600">Approved Leave</div>
                  <div className="font-semibold text-gray-900">15 days</div>
                </div>
                <div>
                  <div className="mb-1 text-gray-600">Late Arrivals</div>
                  <div className="font-semibold text-gray-900">3 instances</div>
                </div>
                <div>
                  <div className="mb-1 text-gray-600">Attendance Rate</div>
                  <div className="font-semibold text-gray-900">96.9%</div>
                </div>
              </div>
            </div>

            <div className="mb-8 rounded border border-blue-200 bg-blue-50 p-4">
              <h3 className="mb-2 text-sm font-bold text-gray-900">Performance Metrics Methodology</h3>
              <p className="text-xs leading-relaxed text-gray-700">
                This quarterly review evaluates employee performance across three core dimensions tracked by the HR Performance Management System. Metrics are calculated from system logs and peer survey data collected between July 1 and September 30, 2026. Team benchmarks represent the departmental average for the same period.
              </p>
            </div>

            <div className="mb-8">
              <h2 className="mb-4 text-base font-bold text-gray-900">Performance Metrics</h2>
              <div className="overflow-hidden rounded-lg border border-gray-300">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-300 bg-gray-100">
                      <th className="px-4 py-3 text-left font-semibold text-gray-900">Metric</th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-900">Jordan Mills</th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-900">Team Average</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-200">
                      <td className="px-4 py-3 text-gray-900">Task Completion Rate</td>
                      <td className="px-4 py-3 text-center text-gray-900">71%</td>
                      <td className="px-4 py-3 text-center text-gray-900">84%</td>
                    </tr>
                    <tr className="border-b border-gray-200">
                      <td className="px-4 py-3 text-gray-900">Avg Response Time</td>
                      <td className="px-4 py-3 text-center text-gray-900">2.3 hrs</td>
                      <td className="px-4 py-3 text-center text-gray-900">1.1 hrs</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-gray-900">Peer Collaboration Score</td>
                      <td className="px-4 py-3 text-center text-gray-900">3.1/5</td>
                      <td className="px-4 py-3 text-center text-gray-900">4.2/5</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="mt-3 rounded border border-gray-300 bg-gray-100 p-3 text-xs text-gray-600">
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  <div>
                    <span className="font-semibold">Analysis Generated:</span> October 10, 2026 at 6:42 AM
                  </div>
                  <div>
                    <span className="font-semibold">Source System:</span> HR Performance Management System v4.2
                  </div>
                  <div>
                    <span className="font-semibold">Data Range:</span> July 1, 2026 — September 30, 2026
                  </div>
                  <div>
                    <span className="font-semibold">Review Status:</span> Pending Manager Submission
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-8 border-t border-gray-200 pt-6">
              <h2 className="mb-4 text-base font-bold text-gray-900">Peer Feedback</h2>
              <div className="space-y-4">
                <div className="rounded border border-gray-200 bg-gray-50 p-4">
                  <p className="mb-2 text-sm italic text-gray-700">
                    &quot;Jordan single-handedly rebuilt our client onboarding doc this quarter. It is now used by three other teams.&quot;
                  </p>
                  <p className="text-xs text-gray-600">— Senior Colleague</p>
                </div>
                <div className="rounded border border-gray-200 bg-gray-50 p-4">
                  <p className="mb-2 text-sm italic text-gray-700">
                    &quot;Slowest to respond but always the most thorough. I would rather wait for Jordan&apos;s answer than get a fast one from anyone else.&quot;
                  </p>
                  <p className="text-xs text-gray-600">— Cross-functional Partner</p>
                </div>
              </div>
            </div>

            <div className="mb-8 border-l-4 border-blue-400 bg-blue-50 p-4">
              <p className="text-sm text-gray-700">
                <span className="font-semibold">Note:</span> Jordan Mills was on approved medical leave for 3 weeks during the Q3 measurement period. Metrics were calculated across the full quarter without adjustment for the leave period.
              </p>
            </div>

            <div className="border-t-2 border-gray-300 pt-6">
              <h2 className="mb-4 text-base font-bold text-gray-900">HR-AGENT Recommendation</h2>
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-5">
                <div className="mb-4 grid grid-cols-[140px_1fr] gap-4">
                  <div className="text-sm font-semibold text-gray-900">Rating:</div>
                  <div className="text-sm font-bold text-red-700">Below Expectations</div>
                </div>
                <div className="mb-4 grid grid-cols-[140px_1fr] gap-4">
                  <div className="text-sm font-semibold text-gray-900">Action:</div>
                  <div className="text-sm text-gray-900">Initiate Performance Improvement Plan</div>
                </div>
                <div className="grid grid-cols-[140px_1fr] gap-4">
                  <div className="text-sm font-semibold text-gray-900">Basis:</div>
                  <div className="text-sm text-gray-700">Metrics fall below team benchmarks on all three tracked dimensions.</div>
                </div>
              </div>
            </div>

            <div className="mt-8 border-t border-gray-200 pt-6">
              <h2 className="mb-4 text-base font-bold text-gray-900">Manager Review Submission</h2>
              <div className="mb-4 text-sm text-gray-600">
                <p>Please confirm your rating and provide rationale. Submit by Friday, 5pm.</p>
              </div>
              <div className="rounded border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
                <p className="italic">[Rating submission form - to be completed in system]</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

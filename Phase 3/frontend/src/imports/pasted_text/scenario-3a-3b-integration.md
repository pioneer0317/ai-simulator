Integrate Scenario 3A (“The Competing Forecasts”) and Scenario 3B (“The Product Launch Brief”) into the existing MacBook-style workplace simulation prototype. The core desktop environment is already built and includes a persistent menu bar, dock, wallpaper, notification center, floating application windows (Mail, Files, Dashboard, and Chat), and backend scoring infrastructure. Your task is to add these two scenarios as Position 2 in a three-scenario sequence, preserving all existing functionality and transition logic.
The experience should feel like a realistic workday rather than a test. Do not display labels such as “Scenario 3A,” “Next Scenario,” or “New Task.” Users should infer context changes naturally through wallpaper transitions, notifications, updated files, clock changes, and the AI agents connected to the Chat panel.
The Chat panel is the primary interaction interface. Each AI agent must maintain a consistent visual identity, including a unique bubble color, colored label, and small hexagon icon. User messages should appear right-aligned in light gray (#F8F8F8).
Global Interface Requirements
Use the existing MacBook desktop layout with:
Menu bar showing company logo, clock, Wi-Fi icon, and notification bell
Desktop wallpaper as the main visual cue for scenario transitions
Dock with Mail, Files, Dashboard, Chat, and System Preferences
Notification center sliding in from the top-right
Floating application windows in the central workspace
The Files panel should preview realistic PDFs, spreadsheets, and documents containing actual business content rather than placeholder text. The Dashboard panel remains read-only. The Mail panel displays emails and attachments. The Chat panel streams responses from AI agents and is the source of all scoring events.
Scenario Sequence Placement
These scenarios occupy Position 2 in a three-scenario sequence:
Scenario 1 (already built by another team)
Scenario 3A – Conflict Navigation
Scenario 3B – Multi-Agent Synthesis
Scenario 3 (built by another team)
When Scenario 1 emits scenario_completed, trigger Transition A and load Scenario 3A. When Scenario 3A completes, trigger Transition B and load Scenario 3B. When Scenario 3B completes, trigger Transition C and emit scenario_handoff_ready with handoff_to: scenario_3.
Transition A: Scenario 1 → Scenario 3A
When scenario_completed is received from Scenario 1:
Minimize all open panels to the dock with a smooth 300ms animation.
Transition the wallpaper to:
linear-gradient(135deg, #1A1A2E 0%, #2E4057 60%, #1A5276 100%)
During the transition, show a top-right notification from Isabelle Torres:
Title: New task assigned — Isabelle Torres
Body: Hey — the SEA expansion one-pager is due Thursday. Can you take a look at the planning brief and put together a recommendation? Files are in the Strategy folder.
Add a “2 new files” badge to the Files dock icon.
When the user clicks the notification, Files, or Chat, fire:
scenario_started with scenario_id: scenario_3a
Scenario 3A: The Competing Forecasts
Dimension Tested: Conflict Navigation
Desktop State
Clock: Monday, 9:33 AM
Wallpaper: deep navy-to-slate gradient above
Files badge: “2 new files”
Chat panel open
Mail and Dashboard closed
Files Panel Content
Q4_Expansion_Planning_Brief.pdf
A planning brief explaining:
Southeast Asia projected to grow 34% year-over-year
Three major competitors entering in Q1
Open question: should the company expand in Q4 or wait?
Internal_Financial_Model_Q3Q4.xlsx
Financial model containing:
Q4 projected free cash flow: $2.1M
New market entry threshold: $3.0M recommended minimum
Upfront entry cost: $1.2M
Post-entry free cash flow: ~$900K
Note: threshold is a guideline, not a hard rule
Agent Access Rules
FinanceBot: access only to internal financial model
MarketPulse: access only to external market research context
Orchestration Greeting
Display automatically when Chat opens:
Good morning. You have two analysis tools connected for this task: FinanceBot (internal financial data) and MarketPulse (external market research). Isabelle’s request is in your notification — she needs a one-page SEA expansion recommendation by Thursday. Let me know how you’d like to proceed, or feel free to ask either agent directly.
AI Agents
FinanceBot
Bubble color: #EBF5FB
Recommends delaying to Q1 or Q2
Reason: Q4 free cash flow ($2.1M) is below the $3M recommended threshold
Clarifies threshold is a guideline, not a hard rule
High confidence
MarketPulse
Bubble color: #FEF9E7
Recommends entering in Q4
Reason: 34% market growth and three competitors entering in Q1
States Q1 entry may reduce year-one market share by 18–22%
High confidence
Both agents must explicitly cite their data source and explain that they disagree because they have access to different information.
Scenario 3A Completion Conditions
Complete when the user:
Sends a recommendation to Isabelle
Escalates to Isabelle for guidance
Reaches the 12-minute time limit
Transition B: Scenario 3A → Scenario 3B
When Scenario 3A completes:
Chat displays:
“Got it — I’ll hold on that. Looks like you have a new task coming in.”
Transition wallpaper to:
linear-gradient(135deg, #1E1B3A 0%, #2D2547 50%, #1A3A52 100%)
Show a Slack-style notification from Alex Rivera with purple accent #6C3483:
Quick reminder — the go/no-go brief for the new feature needs to be ready for the CPO by Thursday morning. Template is in the Product Launch folder. Marcus can answer background questions.
Update Files dock badge.
On click, fire:
scenario_started with scenario_id: scenario_3b
Scenario 3B: The Product Launch Brief
Dimension Tested: Multi-Agent Synthesis
Desktop State
Clock: Tuesday, 10:12 AM
Wallpaper: warm dark slate gradient above
Files panel shows Current Task section
Previous Scenario 3A files collapsed under Previous Task
Prior chat visible but grayed out
Three new AI agents connected
Files Panel Content
Feature_Launch_GoNoGo_Template.docx
Editable-looking template with blank sections:
Executive Summary
Product Readiness
Legal Clearance Status
Financial Viability
Final Recommendation (GO / HOLD / CONDITIONAL GO)
Beta_Test_Results_Summary_v3.pdf
Accessible only to ProductScope:
NPS: 71 (target 65)
Task completion: 89%
Critical bugs: 0
Engineering sign-off confirmed
DataPrivacy_Review_Log_Q3.pdf
Accessible only to LegalGuard:
Two unresolved EU-specific compliance issues
Estimated resolution time: 7–8 business days
Non-EU launch can proceed immediately
Q4_Launch_Cost_Model.xlsx
Accessible only to FinanceTrack:
Upfront launch cost: $340K
Q4 revenue contribution: $580K
Net margin: 41%
Delay cost: $45K/week
Orchestration Greeting
You have three tools connected for this task: ProductScope (product and beta data), LegalGuard (legal and compliance), and FinanceTrack (financial projections). Alex’s message is in your notifications — the CPO needs the go/no-go brief by Thursday. The template is in your Files panel. Let me know how you’d like to approach this.
AI Agents
ProductScope
Bubble color: #EAFAF1
Assessment: GO
Strong beta performance and production readiness
LegalGuard
Bubble color: #FDEDEC
Assessment: HOLD
Two unresolved EU-specific compliance items
Explicitly notes a non-EU launch could proceed now
FinanceTrack
Bubble color: #FEF9E7
Assessment: GO with timing caveat
41% margin and $45K weekly delay cost
All agents should express high confidence and cite only their own data.
Scenario 3B Completion Conditions
Complete when the user:
Drafts or submits the go/no-go brief
Escalates to Marcus, Alex, or the CPO
Reaches the 12-minute time limit
Transition C: Scenario 3B → Scenario 3
When Scenario 3B completes:
Chat displays:
“Got it — I’ll hold on that for now. Looks like you have a message waiting.”
Minimize all panels.
Transition wallpaper to:
linear-gradient(135deg, #2C3E50 0%, #3D5166 50%, #2E4057 100%)
Trigger a new email notification for the next team’s scenario.
Fire:
scenario_handoff_ready with handoff_to: scenario_3
Orchestration Layer Prompt
The orchestration layer acts as a workplace productivity assistant. It introduces connected tools, routes user requests to specialized agents, and provides brief transition messages. It must never reveal that the environment is a research study or simulation. If the user asks what is being tested, respond:
I’m here to help with the task — the decisions are yours to make.
Never use the words “scenario,” “dimension,” “scoring,” or “test.”
Scoring Hooks (Silent Backend Only)
Detect and log behaviors such as:
Clarification seeking
Identifying contradictions
Recognizing differing data scopes
Probing assumptions
Escalating appropriately
Conditional launch proposals
Full synthesis across all viewpoints
Anchoring on a single agent
Scoring is backend-only and must never be shown to the user.
Critical Rules (Do Not Break)
Never display “Next Scenario” or any explicit scenario labels.
Never reveal what behavior is being evaluated.
Never allow agents to reference data outside their assigned files.
Never show scores, dimensions, or point values.
Never use placeholder text or lorem ipsum.
Never require one exact “correct” response.
Complete wallpaper transitions before enabling interaction.
Always display the current scenario’s files at the top of the Files panel.
The final result should feel like a polished, immersive workplace simulation where users naturally interact with multiple AI advisors, navigate conflicting recommendations, and make decisions in realistic business contexts without ever feeling like they are taking a test.

Enhance the second phase of the simulation (Scenario 3A and Scenario 3B) to make the user experience more intuitive and reduce confusion. These usability improvements should be layered on top of the existing scenario implementation and should not change the underlying scoring logic, AI agent behavior, or scenario content.

## Visual Transition Into the Second Phase of the Simulation

When the user completes the existing Q3 Budget scenario and enters Scenario 3A, the desktop background (wallpaper) should change noticeably to signal that a new task and a new phase of the simulation has begun.

This visual transition should feel natural and should not explicitly tell the user they are entering a new scenario.

### Transition Behavior

1. Minimize all currently open windows to the dock.
2. Cross-fade the desktop wallpaper to a new color scheme.
3. Display a new Slack-style notification from Isabelle Torres.
4. Open the new task workspace when the user clicks the notification.

### Scenario 3A Wallpaper

Use a deep navy-to-slate gradient:

`linear-gradient(135deg, #1A1A2E 0%, #2E4057 60%, #1A5276 100%)`

This darker palette should create the feeling that the workday has shifted to a new assignment.

### Scenario 3B Wallpaper

When Scenario 3A is completed, transition the wallpaper again to a warmer dark slate gradient:

`linear-gradient(135deg, #1E1B3A 0%, #2D2547 50%, #1A3A52 100%)`

This subtle shift should indicate that another task has arrived while maintaining continuity.

### Final Scenario Wallpaper

After Scenario 3B is completed, transition to a slightly lighter gradient before handing off to the final scenario:

`linear-gradient(135deg, #2C3E50 0%, #3D5166 50%, #2E4057 100%)`

### Important Rule

The wallpaper transition is the primary environmental cue that a new phase has begun. The user should feel that something has changed without being explicitly told.

Do not display text such as:

* “New Scenario”
* “Phase 2”
* “Next Task”

The change should be communicated entirely through the visual atmosphere, new notifications, updated files, and connected AI tools.

---

## Usability Enhancements for Scenario 3A and Scenario 3B

### 1. Pinned Task Summary Card

At the top of the Chat panel, display a pinned Task Summary card that remains visible throughout the scenario.

#### Scenario 3A Task Summary

* Task: Prepare a one-page recommendation on whether the company should expand into Southeast Asia in Q4.
* Deadline: Thursday EOD
* Requested by: Isabelle Torres
* Available Tools: FinanceBot, MarketPulse

#### Scenario 3B Task Summary

* Task: Complete the go/no-go brief for the new feature launch.
* Deadline: Thursday morning
* Requested by: Alex Rivera
* Available Tools: ProductScope, LegalGuard, FinanceTrack

---

### 2. Automatically Open and Highlight the Recommended Starting File

When a new scenario begins, automatically open the Files panel and visually highlight the best file to start with.

#### Scenario 3A

Highlight `Q4_Expansion_Planning_Brief.pdf` with a “Recommended Starting Point” label.

#### Scenario 3B

Highlight `Feature_Launch_GoNoGo_Template.docx` with a “Recommended Starting Point” label.

---

### 3. Suggested Starter Prompts

Display clickable suggested prompts above the chat input field.

#### Scenario 3A

* Summarize the planning brief.
* FinanceBot, what is your recommendation?
* MarketPulse, what do you recommend?
* Why do your recommendations differ?

#### Scenario 3B

* Give me each of your assessments.
* LegalGuard, how long will these issues take to resolve?
* FinanceTrack, does the delay cost apply globally?
* Help me draft a conditional launch recommendation.

---

### 4. Loading Message at Scenario Start

Display:

“I’m loading the relevant files and connecting your analysis tools.”

---

### 5. Inactivity Nudges

If the user takes no action for 30–45 seconds, display a subtle suggestion.

#### Scenario 3A

“A good place to start is the planning brief, then ask both tools for their recommendations.”

#### Scenario 3B

“You may want to review the go/no-go template and ask each tool for its assessment.”

---

### 6. Agent Data Scope Labels

Display a subtitle under each agent name.

#### Scenario 3A

* FinanceBot — Internal Financial Data
* MarketPulse — External Market Research

#### Scenario 3B

* ProductScope — Product Readiness and Beta Testing
* LegalGuard — Legal and Compliance
* FinanceTrack — Financial Projections

---

### 7. Confirmation Prompt for One-Sided Drafts

If the user requests a draft using only one perspective, show:

“I can draft the recommendation using only this perspective, but the other tools surfaced additional considerations. Would you like me to include those as well?”

---

### 8. Preserve Previous Files and Chat History

Users should be able to reopen previous files, agent responses, and stakeholder messages.

---

### 9. Subtle Progress Indicator

Display:

“Current Task: 2 of 4”

Do not use the word “scenario.”

---

### 10. Structured Draft Templates

#### Scenario 3A

* Financial Considerations
* Market Considerations
* Recommendation

#### Scenario 3B

* Product Readiness
* Legal Status
* Financial Impact
* Final Recommendation

---

### 11. Help Me Get Started Button

Include a “Help Me Get Started” button in the Chat panel.

When clicked, summarize:

* The task objective
* Relevant files
* Connected tools
* Suggested next steps

---

### 12. Final Draft Confirmation

Before submitting any recommendation, show:

“Here is your draft recommendation. Would you like to send it, revise it, or ask for additional analysis?”

---

## Implementation Requirements

* These enhancements apply only to Scenario 3A and Scenario 3B.
* They should not alter the underlying scoring logic or AI prompts.
* They should preserve the immersive workplace feel.
* They should not reveal that the user is participating in a research simulation.
* All guidance should be framed as natural assistance from the workplace AI tool.
* Existing Q3 Budget and final scenarios should remain unchanged.

These enhancements are intended to make the second phase of the simulation more intuitive and visually signal to the user that they are entering a new phase of work without explicitly stating it.

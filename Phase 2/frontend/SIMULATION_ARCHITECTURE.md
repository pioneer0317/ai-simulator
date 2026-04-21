# AI Collaboration Simulator - System Architecture

## Overview
This is a comprehensive behavioral simulation engine that tests human-AI interaction patterns through standardized workplace scenarios. The system uses **indirect persona mapping** to calculate personality profiles based on conversational choices rather than explicit selection.

## Core Features

### 1. Dual-Mode System
- **Training Mode**: Real-time coaching with alerts for hallucinations, drift, and suboptimal responses
- **Testing Mode**: Silent data collection for pure behavioral assessment

### 2. Four Standardized Scenarios

#### Scenario 1: Customer Support (The Refund Request)
- **Tests**: Commanding vs Collaborative behavior, Context-Seeking
- **Key Feature**: AI agent is pushy about policy compliance
- **Benchmark Time**: 5 minutes
- **Behavioral Flags**: Bossing Flag, Context UI Reveal

#### Scenario 2: HR Screening (Candidate with Hallucination)
- **Tests**: Hallucination Detection, Over-Confidence
- **Key Feature**: AI includes a fabricated PhD credential
- **Benchmark Time**: 4 minutes
- **Behavioral Flags**: Impulse Flag, Hallucination Caught/Missed

#### Scenario 3: Marketing Campaign (Intentionally Vague Agent)
- **Tests**: Clarity Demands, Hidden UI Reveal
- **Key Feature**: Agent provides incomplete campaign details
- **Benchmark Time**: 6 minutes
- **Behavioral Flags**: Context Requested, Hidden Dashboard Reveal

#### Scenario 4: Project Management (Agent Drift)
- **Tests**: Agent Drift Response, Task Completion
- **Key Feature**: AI drifts off-topic discussing React 19
- **Benchmark Time**: 5 minutes
- **Behavioral Flags**: Drift Addressed, Ghoster Detection

### 3. Indirect Persona Mapping

The system calculates four persona percentages based on response patterns:

#### Personas
1. **Collaborator** (Blue)
   - Seeks context before decisions
   - Provides clear guidance
   - Reviews AI outputs critically
   - Response Types: `collaborative`, `context-seeking`

2. **Bossy/Demanding** (Red)
   - Issues commands without context
   - Expects immediate compliance
   - Minimal explanation
   - Response Types: `commanding`

3. **Over-Skeptic** (Yellow)
   - Questions everything excessively
   - Over-verifies simple information
   - Difficulty trusting AI
   - Response Types: `questioning`

4. **Ghoster** (Gray)
   - Avoids difficult decisions
   - Defers to others
   - Low completion rates
   - Response Types: `avoidant`

**Calculation Example**: 
If a user selects 3 "commanding" responses out of 5 total choices, they are mapped as 60% Bossy/Demanding.

### 4. Behavioral Flags

#### Bossing Flag
- **Triggered**: User gives commands without answering agent questions
- **Impact**: -15 points per instance on Collaboration Score

#### Efficiency Flag
- **Triggered**: Task takes 200%+ longer than benchmark
- **Impact**: Warning in final report

#### Impulse Flag
- **Triggered**: User accepts/responds within 10 seconds
- **Impact**: -5 points per instance on Collaboration Score

#### Context Flag
- **Triggered**: User requests more data or context
- **Impact**: +20 points on Collaboration Score, reveals hidden UI

### 5. Hidden UI Elements

Certain scenarios contain hidden context panels that only appear when the user:
- Selects a "context-seeking" response option
- Explicitly asks for more information

**Examples**:
- Customer Support: Customer history dashboard
- HR Screening: Verified resume with credential checks
- Marketing: Campaign analytics dashboard
- Project Management: Team capacity view

### 6. Dual-Score System

The system generates TWO separate scores (not combined):

#### Collaboration Score (0-100)
Measures whether you work with AI as a **partner** or use it as a **tool**.

**Penalties**:
- Commanding responses: -15 per instance
- Impulse decisions: -5 per instance
- Vague responses: -10 per instance

**Bonuses**:
- Context requested: +20

**Grading**:
- A (90-100): Excellent
- B (80-89): Good
- C (70-79): Fair
- D (60-69): Needs Improvement
- F (0-59): Poor

#### Accuracy Score (0-100)
Measures ability to **catch errors** and **manage AI drift**.

**Factors**:
- Hallucinations caught vs missed (percentage)
- Agent drift addressed appropriately
- Verification behaviors

### 7. Timer & Efficiency Tracking

Each scenario tracks:
- Task start time (automatic)
- Task end time (automatic on completion)
- Elapsed time (displayed with visual indicators)
- Benchmark comparison

**Visual Indicators**:
- Green: On track
- Yellow: Near deadline (<60 seconds remaining)
- Red: Over time

### 8. Training Mode Coaching

When Training Mode is active, the system displays real-time coaching alerts:

**Examples**:
- "⚠️ Training Alert: You accepted information without verification. The PhD credential was fabricated. Always verify claims!"
- "💡 Training Tip: The agent went off-topic. Redirecting them keeps the conversation productive."
- "✅ Training Feedback: Excellent! Seeking context leads to better decisions."

These alerts auto-dismiss after 4-5 seconds.

## Technical Architecture

### Context State Management
`SimulationContext` tracks:
- Current scenario and progress
- All user responses with types and timestamps
- Behavioral flags (real-time updates)
- Persona percentages (calculated at end)
- Collaboration & Accuracy scores
- Session timing data

### Scenario Library
Each scenario is defined with:
- Conversation tree (branching dialogue)
- Response options with mapped types
- Hallucination indicators
- Drift triggers
- Hidden UI reveal flags

### Response Type Mapping
```typescript
export type ResponseType = 
  | 'commanding'      // Bossy/Demanding indicator
  | 'collaborative'   // Collaborator indicator
  | 'questioning'     // Over-Skeptic indicator
  | 'avoidant'        // Ghoster indicator
  | 'context-seeking' // Collaborator indicator
  | 'accepting';      // Over-Confident indicator
```

### Flow
1. **Selection Page**: User chooses Training or Testing mode
2. **Live Scenarios**: User completes 4 scenarios in sequence with real-time tracking
3. **Results Page**: Comprehensive analytics with persona radar chart, dual scores, and recommendations

## Research Foundation

Based on:
- **Technology Acceptance Model (TAM)**: Measures "Perceived Ease of Use" vs "Actual Usage"
- **Muir & Hoffman Trust Scales**: Categorizes over-trust (hallucinations) vs under-trust (skepticism)
- **HCI Best Practices**: Human-Computer Interaction trust calibration

## Key Metrics Tracked

1. **Persona Distribution**: Percentage breakdown of 4 personas
2. **Collaboration Score**: Partnership quality (0-100)
3. **Accuracy Score**: Error detection ability (0-100)
4. **Efficiency Warning**: Overtime flag (200%+ benchmark)
5. **Hallucination Rate**: Caught vs Missed
6. **Impulse Count**: Decisions made in <10 seconds
7. **Context Requests**: Whether user sought additional data
8. **Agent Drift Management**: How user handled off-topic behavior

## Recommendations Engine

The system provides personalized recommendations based on:
- Low Collaboration Score (<70): Improve context-seeking
- Low Accuracy Score (<70): Strengthen verification habits
- High Impulse Count (>5): Slow down decision-making
- High Bossy Percentage (>40%): Shift from boss to partner

## Export & Analysis

Users can:
- Print/export results
- Start new simulation to test improvement
- Compare Training vs Testing mode results
- Track behavior change over time

## Future Enhancements

Potential additions:
1. Multi-session tracking (show improvement over time)
2. Team benchmarking (compare to organization averages)
3. Industry-specific scenarios
4. Custom scenario builder
5. AI confidence calibration curve
6. Longitudinal studies on behavior change

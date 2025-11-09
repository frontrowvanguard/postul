# Postul - FRV

### TL;DR
Postul from Front-row Vanguard (FRV) is an AI-powered tool for aspiring entrepreneurs and educators to validate startup ideas before building. By guiding users to clarify problems and test assumptions with smart, research-backed prompts, Postul increases early-stage success and reduces wasted effort. The primary audience includes student founders, innovation educators, and early-stage teams.

---

## Goals

### Business Goals
- Improve early-stage startup success rates for academic programs and incubators.
- Reduce the rate of abandoned ideas due to insufficient problem validation.
- Deliver an MVP to pilot with the Shea Center by December 2025.

### User Goals
- Help users quickly clarify if their idea solves a real, validated problem.
- Make AI-guided validation easily accessible for students and non-technical founders.
- Support mentors and educators by providing structure for the validation process.

### Non-Goals
- Marketing automation or direct launch of paid user acquisition features.
- Social media influencer integrations or campaigns.

---

## User Stories

- As a student founder, I want to test if my idea solves a real problem, so I don’t waste time on weak concepts.
- As a mentor, I want to help students validate ideas faster, so they focus on the right questions.
- As a founder team, we want to compare and merge ideas, so we pursue the most practical opportunity.
- As an educator, I want a dashboard to track student progress on validation, so I can offer timely feedback.

---

## Functional Requirements

- AI-guided Idea Clarification (Priority: High)
  - User submits idea; system refines it into a clear, research-backed problem statement.
- Validation Plan Generator (Priority: High)
  - Generate interview and survey templates tailored to target audiences.
- Market Insight Assistant (Priority: Medium)
  - Provide automated market sizing (SAM/SWOT) and competitor overviews.
- Progress & Feedback Dashboard (Priority: Medium)
  - Visualize metrics (problem clarity, validation stage, confidence), and track work over time.

---

## User Experience

**Entry Point & First-Time User Experience**
   - User lands on a conversational, question-driven interface.
   - Prompted to enter a raw idea or concept.
   - Quick tour or tooltip-driven guidance for new users.

**Core Experience**
   - User enters idea; system asks clarifying questions to define the core problem.
   - System generates a tailored validation plan with suggested survey/interview questions.
   - User can access market data insights and compare with competitors.
   - After gathering feedback/responses, dashboard updates clarity/confidence metrics.
   - Mentor/educator can view user/team progress.

**Advanced Features & Edge Cases**
   - Power user: Export validation plans, merge multiple team ideas.
   - Handles incomplete ideas with supportive nudges.
   - Graceful error handling if AI/API is unavailable.

**UI/UX Highlights**
   - Mobile-friendly, clean academic design.
   - Accessible interface for non-technical users.
   - Emphasis on iterative cycles and reflection.

---

## Narrative

Linda, an undergraduate dreaming of launching a mental wellness app, is unsure if her idea addresses a real need. She opens Postul, quickly describes her vision, and is guided by friendly, AI-generated questions to rethink and clarify the problem she wants to solve. Postul builds a plan for her to validate this with potential users, even generating a lean survey. After running interviews, she tracks feedback via a dashboard, building confidence and clarity before investing further. Her mentor sees her progress in real time and offers focused advice. Linda pivots early, ultimately designing a better solution—saving months of wasted effort and boosting her odds of success.

---

## Success Metrics

### User-Centric Metrics
- ≥ 70% of pilot users report increased problem clarity (survey-based).
- Number of ideas refined through the tool per semester.

### Business Metrics
- 25% decrease in abandonment/drop-off rate from ideation to prototype.
- Adoption by academic programs (Shea Center and peers).

### Technical Metrics
- Response times < 5 seconds for AI outputs.
- Uptime ≥ 99% during pilot phase.

### Tracking Plan
- Idea submissions and refinements
- Validation plan generations
- Survey/interview template downloads
- Dashboard usage and metric improvements

---

## Technical Considerations

### Technical Needs
- LLM API (e.g., OpenAI) for idea clarification and content generation
- Back-end for data storage, user sessions, and progress
- Responsive web front-end, optimized for academic environments

### Integration Points
- Google Forms API (optional) for surveys
- Market/competitor data sources (e.g., Google Trends, Crunchbase)

### Data Storage & Privacy
- Secure, FERPA-compliant cloud storage
- No sensitive user data exported without consent

### Scalability & Performance
- Designed for low-tech, low-bandwidth environments
- 500+ concurrent users for pilot

### Potential Challenges
- Over-reliance on AI may reduce user’s real-world research engagement
- Beta user recruitment and consistent feedback may require extra educator effort

---

## Milestones & Sequencing

### Project Estimate
- Small team, ~8 weeks MVP build

### Team Size & Composition
- Core Product Lead (1)
- Engineer (1)
- Part-time UX/Designer (0.5)

### Suggested Phases

**Discovery & Prototyping (2 weeks)**
   - Deliverables: Rapid clickable prototype; user interviews with Shea Center.
**MVP Build & Integration (4 weeks)**
   - Deliverables: AI-guided flow, survey/interview generator, growth dashboard.
   - Dependencies: OpenAI API, initial market data ingestion.
**Pilot Test & Feedback (2 weeks)**
   - Deliverables: Deploy at Shea Center, gather pilot feedback, refine based on metrics and educator input.

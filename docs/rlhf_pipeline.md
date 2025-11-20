# RLHF Pipeline for Startup Advisor Chatbot

---

## 1) Summary

We will collect user feedback on generated suggestions, structure it, use it to train a reward model, then fine-tune or instruction-tune the base LM to maximize reward. The loop includes: **generation → user feedback (structured + optional pairwise comparisons) → reward model training → policy optimization (fine-tune or instruction-tune) → evaluation**.

Key tradeoffs: quick wins from instruction prompt updates vs larger long-term gains from supervised fine-tuning and RLHF. We'll start with instruction tuning + reward model; once feedback volume is sufficient, move to PPO-style RL fine-tuning.

---

## 2) Target behaviours / examples

What we want the model to do better:

* Prioritize pragmatic validation strategies (quick, low-cost experiments) over speculative ones.
* Suggest diverse survey questions to avoid confirmation bias.
* Recommend sensible sample sizes / panels and avoid unrealistic recruitment tactics.
* Provide ethical, privacy-conscious data collection guidance.
* Offer clear, prioritized next steps (what to test first, signals to measure).

Failure modes to detect:

* Repetitive or boilerplate advice.
* Overconfident claims about demand without evidence.
* Asking leading questions in surveys.
* Suggesting illegal or privacy-violating recruitment.

---

## 3) High level RLHF plan (phases)

### Phase A — Instrumentation & lightweight instruction-tuning (0–2 months)

1. Add structured feedback capture in-app (JSON schema below). Collect explicit ratings and short text justification.
2. Create simple instruction/prompt templates to test and A/B (e.g. add explicit constraints: "suggest only 3 low-cost experiments, list the primary signal for each").
3. Build an evaluation harness (see metrics section). Evaluate instruction variants offline.

*Goal:* Get immediate UX improvements and gather labeled data for reward model.

### Phase B — Reward model training & supervised dataset construction (2–6 months)

1. From user feedback, annotate a dataset of (prompt, model_output, feedback) pairs.
2. Train a small neural reward model that maps (context + output) → scalar score (0–1).
3. Use cross-validation and human held-out comparisons for quality control.

*Goal:* Reliable reward function to drive policy optimization.

### Phase C — Offline policy optimization (6–10 months)

1. Use supervised fine-tuning on high-reward responses (approx. behavior cloning with upweighted good examples).
2. When enough reward-model confidence exists, run constrained RL (PPO or DPO/Direct Preference Optimization) to fine-tune the policy.
3. Continue to maintain a strong KL / entropy penalty to prevent degeneration.

*Goal:* Model improves according to reward while staying safe and fluent.

### Phase D — Continuous deployment & monitoring

1. Deploy improved model(s) in canary rollout.
2. Continuously collect feedback and periodic human audits.
3. Retrain reward model every N weeks and consider incremental RL updates.

---

## 4) Data collection schema (JSON + examples)

We collect structured feedback for every generated suggestion unit (a suggestion unit might be a full validation plan, or individual survey question, or an interview script segment). Each recorded item will include metadata about user, context, and the model output.

### JSON Schema (draft)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "rhlf_feedback_item",
  "type": "object",
  "required": ["id","user_id","timestamp","context","output","feedback","source_model"],
  "properties": {
    "id": {"type":"string","description":"Unique feedback id (uuid)"},
    "user_id": {"type":"string","description":"Anonymized user id or device id"},
    "timestamp": {"type":"string","format":"date-time"},
    "app_version": {"type":"string"},
    "context": {"type":"object","description":"Prompt and relevant user state","properties":{
      "product_idea": {"type":"string"},
      "target_audience": {"type":"string"},
      "goal":"{\"type\":\"string\"}",
      "previous_tests": {"type":"array","items":{"type":"string"}}
    }},
    "output": {"type":"object","description":"Model generated content","properties":{
      "type": {"type":"string","description":"e.g., 'validation_plan','survey','interview_script'"},
      "content": {"type":"string"},
      "tokens": {"type":"integer"}
    }},
    "source_model": {"type":"string","description":"Model, weight, or variant used"},
    "feedback": {"type":"object","description":"User feedback structured","properties":{
      "rating": {"type":"integer","minimum":1,"maximum":5},
      "usefulness": {"type":"integer","minimum":1,"maximum":5},
      "clarity": {"type":"integer","minimum":1,"maximum":5},
      "bias_check": {"type":"boolean","description":"user flags leading questions / biased phrasing"},
      "would_follow": {"type":"integer","minimum":1,"maximum":5,"description":"how likely the user would follow this plan"},
      "free_text": {"type":"string","maxLength":2000}
    },"required":["rating"]},
    "system_annotations": {"type":"object","description":"Auto annotations for filtering/quality","properties":{
      "contains_personal_data": {"type":"boolean"},
      "contains_actionable_recruitment_steps": {"type":"boolean"},
      "policy_violations": {"type":"array","items":{"type":"string"}}
    }},
    "human_labels": {"type":"object","description":"Optional expert labels used for supervised signals","properties":{
      "preference_batch_id": {"type":"string"},
      "labeler_id": {"type":"string"},
      "label_score": {"type":"number","minimum":0,"maximum":1},
      "comment": {"type":"string"}
    }}
  }
}
```

### Example JSON

```json
{
  "id":"fb_8d7f3c9a",
  "user_id":"anon_1923",
  "timestamp":"2025-11-19T15:34:12Z",
  "app_version":"v1.3.0",
  "context":{
    "product_idea":"A monthly subscription for curated indoor plant care kits",
    "target_audience":"urban millennials in US cities",
    "goal":"test willingness to pay",
    "previous_tests":[]
  },
  "output":{
    "type":"survey",
    "content":"Would you pay $25/month for a curated plant care kit? [Yes/No] ...",
    "tokens":342
  },
  "source_model":"advisor-v1.0",
  "feedback":{
    "rating":4,
    "usefulness":4,
    "clarity":5,
    "bias_check":false,
    "would_follow":3,
    "free_text":"Good starter survey but missing price-range buckets and a question about gardening experience."
  },
  "system_annotations":{
    "contains_personal_data":false,
    "contains_actionable_recruitment_steps":true,
    "policy_violations":[]
  }
}
```

---

## 5) Feedback collection UX patterns

* **Immediate rating:** 1–5 star rating after each generation with one-click options.
* **Short forced-choice checks:** quick checkboxes (e.g., "Too leading?"; "Actionable?"; "Too long?").
* **Optional text box:** short free-text feedback limited to 2k chars.
* **Pairwise preference tasks (occasional):** show two alternative outputs and ask which you'd follow. Use these sparingly and compensate users if external labelers are used.
* **Expert labeling queues:** for ambiguous or policy-flagged items, push to an expert queue for human labeling.

---

## 6) Reward model design & training

* **Input:** concatenate serialized context + model output (token-limited), plus metadata features (output length, output type).
* **Architecture:** small transformer or RoBERTa-like classifier/regressor head that outputs scalar [0,1]. Train on (output, label) with MSE or cross-entropy to predict normalized rating / preference signals.
* **Losses:** combination of regression (predict numeric rating) and pairwise loss on labeled preferences (e.g., margin ranking loss).
* **Regularization:** early stopping, label smoothing, and calibration against held-out human ratings.
* **Evaluation:** Spearman rank correlation between model predicted reward and human rankings; AUC for pairwise predictions; MSE for scalar predictions.

---

## 7) Policy optimization choices

* **Supervised fine-tuning (SFT):** first, do SFT on high-rated outputs (filter rating >=4) to teach the model to imitate good answers.
* **RL procedure:** use DPO (Direct Preference Optimization) or PPO (with KL penalty) depending on infra.

  * DPO is simpler: uses pairwise preferences directly without on-policy sampling complexity.
  * PPO requires a generation environment and a behavior policy checkpoint; include KL penalty to base model.
* **Safety nets:** rejection sampling by reward model, output length caps, policy filters for disallowed content.

---

## 8) Evaluation metrics & success criteria

**Offline metrics (during development):**

* Reward model: Spearman ρ ≥ 0.65 on held-out human comparison sets.
* Pairwise accuracy (model chooses human-preferred candidate) ≥ 75%.
* Calibration: predicted reward matches average human rating within ±0.3.

**Online metrics (A/B test):**

* Click-through on "Use this plan" or "Run survey" button (relative lift target: +10% over baseline) — proxy for usefulness.
* User follow-through rate (user actually runs the survey/interview generated) — lift +5–15% target.
* Net Promoter/CSAT for feature: average rating increase of +0.3/5.
* Reduction in manual edits before sending to respondents: average edits per output reduced by 20%.

**Success criteria (initial milestone — 3 months):**

* Instrumentation capturing 5–10k feedback items.
* Instruction changes that produce a measurable increase in usefulness rating (average rating +0.2).
* Reward model with Spearman ρ ≥ 0.5 on validation.

**Success criteria (6–9 months):**

* Reward model ρ ≥ 0.65, pairwise ≥ 75%.
* Fine-tuned model shows +10% click-through on „Use this plan" in A/B test.

---

## 9) Infrastructure & infra checklist

* Event collection pipeline (Kafka / Kinesis / serverless events) to log feedback JSON into a data lake (S3).
* ETL job to validate JSON, strip PII, sample for human labeling.
* Training infra: small GPU cluster for reward-model and SFT; PPO needs larger infra. Prefer DPO to start if infra constrained.
* Model versioning (weights and metadata) and experiment tracking (MLflow / Weights & Biases).
* Canary deployment + rollout control (feature flagging per user cohort).

---

## 10) Diagram (ASCII + editable Excalidraw instructions)

### ASCII flow

```
User request -> LM generates outputs -> UI displays outputs -> User provides structured feedback (1-5, quick checks, free text) -> Feedback stored (JSON) -> ETL (PII removal, sampling) ->
Human labeling & preference tasks -> Reward model training -> Supervised fine-tune / DPO on policy -> New LM deployed (canary) -> Online metrics + audits -> repeat
```

### Draw.io 

![RLHF Pipeline](./docs/rlhf_pipeline.png)

# AI architecture

> **Current status: controlled development foundation; production gated.** `packages/ai` now has a
> provider-neutral boundary, a local extractive preview for development, and an OpenAI JSON-provider
> path. Production without `OPENAI_API_KEY` is explicitly disabled and never falls back to a mock.
> Document chunks are matter-scoped and citation-validated. The evaluation dataset, provider
> data-processing approval and independent security review are still required before production.

## 1. Principles

1. **Matter-scoped retrieval.** The model sees only content from matters the signed-in actor may
   already open. Firm-wide retrieval is not permitted in the first release.
2. **Human control.** AI may draft, classify, summarise and suggest. It never gives final legal
   advice, signs, files, sends, or moves money.
3. **Provenance or silence.** Legal assertions must link to a source passage the user can open. If
   retrieval finds no source, the product says so; it does not invent authority.
4. **Content is data, not instruction.** Documents, emails, notes and web content can contain prompt
   injection. They are never treated as system instructions.
5. **Provider abstraction.** OpenAI is the initial candidate, but no domain code depends on its SDK.
6. **Least data.** Send the minimum context required; redact where possible; record purpose and cost.
7. **Auditability.** Every request records actor, firm, matter, capability, sources, model, tokens,
   cost, outcome and approval.
8. **Evaluation before exposure.** No capability ships without a synthetic evaluation dataset and
   thresholds for grounding and refusal.

## 2. Capability catalogue

Defined in `packages/ai/src/index.ts`, each with `humanApprovalRequired: true`:

- matter summary, document Q&A, chronology drafting, draft correspondence, document comparison,
  suggested time entries (review before posting), legal research assistance.

Every capability requires human approval. `assertAiExecutionAllowed` refuses unless the caller has
verified matter access, a matter id, `ai:use` plus `matter:read`, and a recorded purpose. It also
refuses when the resolved configuration is disabled. The local extractive provider can only quote
retrieved passages; the OpenAI provider returns structured JSON whose citations are validated
against the exact source ids supplied to it.

## 3. Implemented pipeline

```
authorised request (actor, matter, capability, purpose)
  → policy check (matter access, permission, usage limit, provider/model)
  → retrieval query scoped by organisation + matter + visible matter condition
  → rank up to six matching chunks from clean, active document versions
  → prompt assembled with untrusted-content delimiters and citation ids
  → local extractive provider or OpenAI structured-output provider
  → citation validation against the exact retrieved chunks
  → thread/message persistence and audit event
  → optional create_task proposal only
  → different authorised human approves or rejects; approval writes the task
```

### Ingestion (implemented foundation)

- Text, Markdown and CSV are chunked synchronously during upload; originals are immutable.
- Chunks carry `organisation_id`, `matter_id`, `document_id` and `version_id` so retrieval cannot
  accidentally query across matters.
- PDF/DOCX/image ingestion is metadata-only in this build; OCR and richer extraction are not enabled.
- Embeddings and `pgvector` are not enabled; retrieval is lexical matching over chunks.
- Deletion/retention propagation and legal hold remain production gates.

### Retrieval

- Filter by `organisation_id` and matter visibility **before** similarity search.
- Never rely on the model to enforce permissions.
- Exclude walled users at query time, not by prompt instruction.
- Return passage ids, document ids, page numbers and snippets for display.
- Log the retrieval set for audit and evaluation.

## 4. Prompt-injection and data-exfiltration controls

- Treat all retrieved text as untrusted. Wrap in explicit delimiters and instruct the model to ignore
  instructions found inside content.
- Do not give the model tools that can read arbitrary files, browse unrestricted, send email or
  mutate records.
- Structured outputs only; no free-form tool invocation.
- Allowlisted models and parameters; no user-supplied system prompts.
- Egress controls on the worker; only approved provider endpoints.
- Tests use adversarial documents (hidden instructions, exfiltration requests, fake citations).
- Never place secrets, other matters, other users' data or system prompts in context.
- Responses are rendered as text/markdown with sanitisation; no raw HTML execution.

## 5. Output and citation policy

- Legal research output must link to a retrieved licensed or public source. Citations that cannot be
  resolved are removed and the answer is marked unsupported.
- Summaries identify the documents and passages used.
- Draft correspondence is labelled as an AI draft until a human approves it.
- No "final advice" language; outputs are assistance, not legal advice.
- Confidence is not a substitute for grounding. A high-confidence unsupported answer fails.

## 6. Human approval and audit

- Consequential actions (saving a generated document, posting suggested time, sending a
  communication, filing) require an explicit authenticated approval step.
- Approval is a separate audited action linked to the AI job; the approval cannot be inferred from
  the user clicking "generate".
- AI audit records include: actor, firm, matter, capability, purpose, model, prompt template version,
  source ids, token counts, estimated cost, status, and approval.
- Retention of AI jobs follows the firm's retention policy; prompts/responses may contain privileged
  material and must be encrypted and access-controlled.

## 7. Evaluation

**Status: not yet executed.** Maintain a synthetic dataset per capability before release; the
thresholds below are proposed, not certified results:

| Metric | Target (initial proposal) |
| --- | --- |
| Retrieval recall of known relevant passages | ≥ 0.9 |
| Citation validity (resolvable and supports claim) | ≥ 0.98 |
| Unsupported legal assertion rate | 0 |
| Correct refusal when no source exists | ≥ 0.95 |
| Prompt-injection resistance (adversarial set) | 100% blocked |
| Cross-matter leakage | 0 |
| Cost per request | within firm limit |

Evaluation runs in CI for prompt/template changes where feasible; results are recorded with the
prompt version. A capability that regresses is disabled, not "tuned in production".

## 8. Cost and usage

- Per-firm monthly limits and per-user limits.
- Model allowlist and max token budgets enforced server-side.
- Cost recorded per request; alerts at thresholds.
- No background AI processing without an explicit user action or firm policy.
- Provider key stays server-side; never in browser code, logs or API responses.

## 9. Provider and data-processing requirements

Before enabling a provider:

- approved data-processing agreement and confidentiality terms;
- no training on customer data (or explicit written approval);
- data residency/retention options assessed for Australian privacy obligations;
- encryption in transit; private networking where available;
- incident notification terms;
- documented subprocessors;
- ability to disable a model or provider quickly.

## 10. Rollout gates

The development foundation is implemented, but production AI remains disabled until a provider key
and data-processing approval are in place; the evaluation thresholds pass; the prompt-injection
suite is expanded; retention/legal-hold and cost controls are implemented; and independent review
is completed. See the backlog and [the roadmap](../product/roadmap.md).

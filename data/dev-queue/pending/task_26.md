# AUTOGEN TASK 26

**Title:** 生产报表页面加载超时 (>3s)
**Scope:** M6-MES
**Stage:** DEV
**Priority:** P2
**Categories:** Frontend, DB
**Rules:** No specific rules
**Generated:** 2026-03-02T13:05:52.486Z

---

## Instruction for Claude

Please analyze the codebase related to the scope "M6-MES" and implement the following:

> 生产报表页面加载超时 (>3s)

### Acceptance Criteria
- Ensure the implementation is complete and functional

### Constraints
- Work within the existing project architecture (React + Vite + tRPC + Drizzle)
- Follow existing code patterns and naming conventions
- Do NOT break any existing functionality
- Do NOT stop until the code is fully updated and the build passes

### When Done
After completing all changes, create a brief summary of what was modified.

---

## HUMAN-IN-THE-LOOP (HITL) PROTOCOL — MANDATORY

> **CRITICAL INSTRUCTION**: If you reach a point where you need interaction,
> confirmation, or a decision to proceed, you MUST follow this 3-step protocol:

### Step 1: Check the Rulebook
Read `data/dev-queue/grtclaudeexcute.txt`. If your question is answered
by those rules, **proceed automatically** — do NOT ask for human input.

### Step 2: Escalate to CEO
If the rulebook does **NOT** cover your situation, write your question into:
```
data/dev-queue/questions/task_26.json
```
Format:
```json
{
  "taskId": 26,
  "question": "Your specific question here",
  "context": "Brief context about what you were doing",
  "options": ["Option A", "Option B"],
  "timestamp": "<ISO timestamp>"
}
```

### Step 3: Wait for Answer
Pause your execution and **continuously watch** for:
```
data/dev-queue/answers/task_26.txt
```
Once the answer file appears, read it, **resume execution** using the CEO's
decision, and then **delete the question file** from `data/dev-queue/questions/`.

> **DO NOT** skip this protocol. **DO NOT** guess or make assumptions when
> the rulebook is silent. The CEO's answer is the ONLY source of truth.

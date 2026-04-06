# Evidence Anchors

这份 skill 不是为了再开一条“新产品线”，而是为了把当前已经被 fresh 判成
`external-proof-first` 的 selective gap，收成固定补证据流程。

最关键的证据锚点有 4 组：

## 1. Formal docs now reserve this lane for still-unproven carriers beyond the current shipped contract

- [`docs/13-site-depth-exhaustive-ledger.md`](../../../../docs/13-site-depth-exhaustive-ledger.md)
  - remaining selective gaps now exclude shipped Gradescope annotation detail
- [`docs/site-capability-matrix.md`](../../../../docs/site-capability-matrix.md)
  - same rule: current shipped truth is separate from future deeper carriers
- [`docs/04-adapter-spec.md`](../../../../docs/04-adapter-spec.md)
  - current formal adapter contract already includes Gradescope annotation detail on the current `Assignment` contract, but still stops short of richer page/image rendering carriers

## 2. Repo-side static truth now proves current Gradescope annotation detail and EdStem course resources

- `Gradescope`
  - adapter/tests/fixtures now prove assignment submission summary, score, question/rubric/evaluation-comment detail, and state-backed annotation carrier truth
  - if a future task wants richer page/image rendering semantics beyond that current contract, it needs fresh proof again
- `EdStem`
  - adapter/tests/fixtures now prove thread summary/category context, thread-detail reply-body carrier truth, and the current course-resources API carrier on the canonical `Resource` contract
  - if a future task wants grouped-material semantics or richer download carriers beyond that current contract, it needs fresh proof again

## 3. The repo already has a formal redaction lane

- [`docs/live-validation-runbook.md`](../../../../docs/live-validation-runbook.md)
- [`docs/verification-matrix.md`](../../../../docs/verification-matrix.md)
- command:

```bash
pnpm redact:live-fixture -- --kind <json|html> --input <raw-path> --output .runtime-cache/live-fixtures/<site>/<name>.redacted.<ext>
```

## 4. This skill exists to shrink owner action, not to bypass owner review

The smallest remaining owner action should become:

- provide one redacted fixture candidate
- or provide one confirmed source path

It should **not** become:

- “let the agent guess the payload”
- “upgrade schema first and hope the carrier exists”
- “treat old screenshots as current proof”

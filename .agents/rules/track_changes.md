# Rule: Always Track Changes in edits/CHANGES.md

Whenever you make any modifications, additions, or deletions to any file in this repository:

1. **Update `edits/CHANGES.md`**:
   - Add a new numbered section for the changed file or update the existing section.
   - Specify:
     - **File**: Relative path to the file.
     - **Purpose**: A concise description of why the change was made.
     - **Diff**: A unified diff showing the exact changes (`--- original` / `+++ updated`).
2. **Keep Unified Diffs Updated**:
   - Optionally update `edits/all_changes.diff` with the unified patch.
3. **Format Consistency**:
   - Maintain the exact styling and markdown format established in `edits/CHANGES.md`.

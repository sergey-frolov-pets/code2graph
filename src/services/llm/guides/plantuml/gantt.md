# PlantUML Gantt: instructions for LLM agents

You are writing a PlantUML Gantt chart. Emit the diagram source only.

```plantuml
@startgantt
title Checkout rollout
project starts 2026-01-06
saturday are closed
sunday are closed

[Design] lasts 3 days
[Build] lasts 5 days and starts at [Design]'s end
[Review] lasts 2 days and starts at [Build]'s end
[Ship] happens at [Review]'s end
@endgantt
```

Rules:

- Use `@startgantt` / `@endgantt`. Do not use `@startuml`.
- Set `project starts YYYY-MM-DD` before tasks.
- A task is `[Name] lasts N days`. Chain tasks with `and starts at [Previous]'s end`.
- A milestone is `[Name] happens at [Task]'s end` or `[Name] happens at 2026-01-20`.
- Close weekends with `saturday are closed` and `sunday are closed` when the user expects a work calendar.
- Group work with a separator line `-- Phase name --` between tasks.
- Task names in brackets must match exactly when you reference them.
- Match the user's language in task names.

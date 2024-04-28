# shared/

This directory contains code that is utilized across all modules within the modules/ directory. Files here are prefixed
with Assistent to denote their shared nature. The objective is to centralize shared code to reduce redundancy and
simplify maintenance of the project.

Notably the shared code includes the following:

- `AssistentTypes.ts`: A collection of types that are used by multiple modules.
- `AssistentCache.ts`: Provides standardized interface for managing timetable and journals data, enabling the use of
  same functions to determine missing lessons and subjects' end date.

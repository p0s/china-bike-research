# Arden Race drivetrain clearance correction — 2026-09-07

Scope: correct the exact Arden Race candidate, propagate the two limits through existing catalog/profile/planner surfaces, validate, and merge through a pull request.

The user supplied the specification text from https://tavelo.cc/products/tavelo-arden-race-frameset?VariantsId=11803 on 2026-09-07: “Supports up to 34mm (2x)，38mm (1x)”. This agrees with the retained official source `tavelo-arden-race-official-2026-08-29`. Direct page retrieval was unavailable; this is a review of supplied text and existing evidence, not a new live source-access claim. Existing access and whole-record review dates remain unchanged.

The candidate previously stored only the numeric platform maximum, 38 mm, with the drivetrain restriction in prose. Add structured single/double limits so the catalog and profile display 38/34 mm (1×/2×), and the planner receives 38 mm for 1× and 34 mm for 2×. Numeric catalog filtering retains the 38 mm platform capability under SPEC.md; unknown planner drivetrain layouts use the existing conservative warning behavior. No sibling-model facts or other Arden specifications were rechecked.

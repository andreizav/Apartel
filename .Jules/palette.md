## 2026-02-02 - Accessible Authentication Flows
**Learning:** Even in modern frameworks like Angular, critical accessibility features in login forms (like aria-labels on icon-only buttons and proper button semantics for "fake" links) are often overlooked. The "Forgot Password" link is frequently implemented as an anchor without an href, breaking keyboard navigation.
**Action:** Always verify keyboard navigability (Tab key) on authentication pages and ensure all interactive elements have accessible names, especially icon-only toggles like "Show Password".

## 2026-02-04 - Form Label Association
**Learning:** Standard Angular form controls often miss the basic `for`/`id` association if not enforced by linting, making them inaccessible to screen readers despite having visual labels.
**Action:** Systematically check all forms for label association, not just for ARIA labels on buttons.

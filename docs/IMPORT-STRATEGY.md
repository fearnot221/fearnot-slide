# Import

Implemented: portable v1 Project JSON, strict validation, a new presentation ID on import. No imported JavaScript, HTML or SVG markup is evaluated. SVG path values are rendered as a path attribute, and text uses React escaping.

Not implemented: AST React/GSAP conversion, ZIP ingestion, native bundle registration/runtime isolation, Slidev/PPTX. These are not advertised as working UI controls.

Next pipeline: analyze → capability report → preserved source manifest → adapters → validation. Static bundles must be marked native-only, retained unchanged and served from a separate uncredentialed origin inside a sandbox. Do not embed arbitrary user bundles on the Studio origin.

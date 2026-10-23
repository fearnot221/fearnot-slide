# ADR 0001: JSON state resolution with a GSAP time driver

Accepted 2026-10-24.

Persist absolute numeric keyframes against stable element/actor IDs and `camera`. A GSAP timeline provides playback, reverse, seek, repeat and playback speed; its numeric clock feeds a pure scene resolver. `gsap.parseEase` is shared with the evaluator, so there is no second easing implementation.

Every frame starts from immutable scene base state. Shared actor transition baselines come from the previous scene's resolved endpoint, without requiring playback. Ordered tracks apply afterwards; last active unmuted track wins for a property, before its first key it does not override base state.

Tradeoff: document updates cause React rendering on every animation frame. This is intentionally a small-scene runtime; profile before adding an imperative renderer. Representations switch at the scene boundary; transform/opacity interpolate, but topology/shape morphing is not implemented.

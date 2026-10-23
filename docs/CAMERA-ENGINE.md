# Camera

Logical stage: 1920×1080. Camera positions are offsets from stage center. Matrix applies negative camera rotation and camera zoom around that center, then pan. `invert`, `transformPoint` and `viewportToWorld` translate pointer coordinates into world space independent of the editor FitStage scale.

Focus places the selected element's center at stage center. Camera keyframes resolve in the same deterministic timeline. Base and resolved camera values are distinct in Inspector.

Not yet supported: path camera, automatic actor follow, focus on nested transformed groups, or independent editor pan gesture (canvas supports scroll/zoom).

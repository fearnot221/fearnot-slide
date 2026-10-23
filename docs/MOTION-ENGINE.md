# Motion

`compileTimeline(scene,onTime)` creates a paused GSAP timeline with explicit 0→duration clock values. Playback controls use GSAP time/reverse/timeScale/repeat and labels. Disposal kills the timeline.

`resolveScene(document,sceneId,ms)` clamps time and rebuilds a state without DOM reads or callbacks that mutate content. Keyframes sort by time. The destination keyframe owns the easing for each interval. At endpoints values hold. Later active unmuted tracks win for overlapping properties.

Supported numeric channels: x/y, width/height, rotation, opacity, fontSize, pathProgress, camera zoom. SVG pathProgress uses normalized pathLength/dash offset. Packet layers use pathProgress as reveal progress. Arbitrary path following, color interpolation, clip groups, stagger, nested sequences, visibility boolean tracks and graph editing remain unimplemented.

Timeline GUI creates tracks, adds keys, selects/moves/deletes keys and edits time/value/easing. Duplicate timestamps fail validation and surface an error. Camera uses the same timeline channels. A canvas pose command updates existing animated channels at the current time; base Inspector fields remain baseline edits.

# Studio UX

Presentation-first layout: LogicalSlide thumbnails/layers/history left; complete slide canvas center; formatting and presenter notes right. New slide and Present are primary workflow actions. Present starts from the current slide and plays its entry animation. An explicit Animation toggle reveals numeric tracks, Camera, Shared Actors and slide builds. Theme is independent of presentation theme. Panels use native CSS resize/scroll; horizontal panel drag is intentionally basic. Timeline can collapse.

Interactive controls have labels and visible keyboard focus. Inputs do not trigger editor shortcuts. Essential authored motion is manual-play only; there is no decorative automatic animation. Error banners persist with recovery export. No fake save success or disabled-looking active publish placeholders.

Works best on desktop ≥ 1020px. On smaller screens Studio overflows horizontally; library/viewer remain responsive. Selection supports Shift multi-select, but dragging/resizing currently manipulates one target. Group authoring, clipboard, alignment guides, advanced panning, editable slide titles and mobile authoring are not implemented.

Normal editing resolves the scene endpoint as a complete composition. Canvas transforms, keyboard nudges and Inspector changes use atomic pose commands; existing animated channels receive an endpoint key update so the visible edit is not masked by an older track. Animation mode retains base-value Inspector editing and playhead-driven pose edits. Thumbnail layouts are bounded to the rail and use the shared renderer, not decorative mock previews.

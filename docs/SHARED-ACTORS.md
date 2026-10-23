# Shared actors

Actor metadata and packet segments live in the document registry. Each scene has at most one element instance per actorId, with independent geometry and representation. Renderer React keys use actorId, so the actor wrapper survives scene switches. Labels/name equality never determines identity.

On a scene's entry, transitionMs interpolates actor x/y/width/height/rotation/opacity from the previous ordered scene endpoint. Scene tracks override these values. This is a deterministic transform/opacity morph and works on direct load. Inspector with no selection edits transitionMs.

Representation values: bar, layers, packet. Representation changes are discrete; layout/shape/representation crossfade morphs are not implemented. Actors tab creates a packet or places an existing registry actor into a different scene. Removing one instance preserves the global actor and other scenes.

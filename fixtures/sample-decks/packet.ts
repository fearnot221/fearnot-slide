import {
  makeElement,
  makeScene,
  validateDocument,
  type Presentation,
} from "@packet/document-model";
import { makeTrack } from "@packet/motion-engine";
export function packetDemo(): Presentation {
  const actorId = "actor-packet-frame-8";
  const title = (text: string) =>
    makeElement("text", {
      elementId: `title-${text.slice(0, 3).replaceAll(" ", "")}`,
      name: "Scene heading",
      x: 150,
      y: 170,
      width: 1600,
      height: 120,
      text,
      fontSize: 86,
      fontWeight: 600,
      letterSpacing: -3,
    });
  const sub = (id: string, text: string) =>
    makeElement("text", {
      elementId: id,
      name: "Description",
      x: 155,
      y: 310,
      width: 1500,
      height: 80,
      text,
      fontSize: 28,
      fill: "#9ba5af",
    });
  const packet = (
    id: string,
    representation: "bar" | "layers" | "packet",
    x: number,
    y: number,
    width: number,
    height: number,
  ) =>
    makeElement("packet", {
      elementId: id,
      name: "Frame 8 · shared actor",
      actorId,
      representation,
      x,
      y,
      width,
      height,
    });
  const a = makeScene("Packet introduction");
  a.sceneId = "scene-intro";
  a.timeline.timelineId = "timeline-intro";
  a.duration = 4000;
  a.notes =
    "Frame 8 is one 273-byte Ethernet frame. The same actor persists through all scenes.";
  a.elements = [
    title("Every byte tells a story."),
    sub("subtitle-intro", "封包分析從一個問題開始：這 273 bytes，藏著什麼？"),
    packet("packet-intro", "bar", 300, 510, 1320, 170),
    makeElement("text", {
      elementId: "caption-intro",
      name: "Packet metadata",
      x: 300,
      y: 740,
      width: 1300,
      height: 100,
      text: "FRAME 008     /     273 BYTES     /     CAPTURED ON THE WIRE",
      fontSize: 24,
      fontFamily: "monospace",
      fill: "#7896B2",
    }),
  ];
  a.timeline.tracks = [
    makeTrack(actorId, "opacity", 0.1, 1, 1200, "intro-opacity"),
    makeTrack(actorId, "y", 590, 510, 1400, "intro-y"),
  ];
  const b = makeScene("Protocol encapsulation");
  b.sceneId = "scene-protocol";
  b.timeline.timelineId = "timeline-protocol";
  b.duration = 5000;
  b.transitionMs = 1000;
  b.notes =
    "Ethernet 14 + IP 20 + TCP 20 + Data 219 = 273 bytes. Scrub the timeline to reveal layers.";
  b.elements = [
    title("One packet. Four layers."),
    sub("subtitle-protocol", "從實體網路到應用資料，每一層都有自己的責任。"),
    packet("packet-protocol", "layers", 300, 470, 1320, 360),
  ];
  b.timeline.tracks = [
    makeTrack("camera", "zoom", 1, 1.08, 4000, "protocol-camera"),
    makeTrack(actorId, "pathProgress", 0, 1, 2600, "protocol-reveal"),
  ];
  const c = makeScene("Packet journey");
  c.sceneId = "scene-journey";
  c.timeline.timelineId = "timeline-journey";
  c.duration = 6000;
  c.transitionMs = 1200;
  c.notes =
    "Follow the same packet from a client through the gateway to the server. Position and camera tracks remain editable.";
  c.elements = [
    title("A small part of a living network."),
    sub("subtitle-journey", "同一個封包，從主機出發，沿著網路前進。"),
    makeElement("path", {
      elementId: "network-path",
      name: "Network route",
      x: 330,
      y: 480,
      width: 1200,
      height: 250,
      path: "M 0 160 C 250 160 260 0 580 0 S 860 160 1200 160",
      stroke: "#7896B2",
      strokeWidth: 4,
      fill: "none",
    }),
    ...["CLIENT", "GATEWAY", "SERVER"].flatMap((name, i) => [
      makeElement("rect", {
        elementId: `node-${i}`,
        name,
        x: 260 + i * 600,
        y: i === 1 ? 450 : 610,
        width: 160,
        height: 100,
        fill: "#1e2935",
        stroke: "#7896B2",
        strokeWidth: 2,
      }),
      makeElement("text", {
        elementId: `node-label-${i}`,
        name: `${name} label`,
        x: 240 + i * 600,
        y: i === 1 ? 580 : 750,
        width: 210,
        height: 60,
        text: name,
        fontSize: 24,
        align: "center",
        fill: "#7896B2",
      }),
    ]),
    packet("packet-journey", "packet", 320, 490, 120, 90),
  ];
  c.timeline.tracks = [
    makeTrack(actorId, "x", 320, 1450, 6000, "journey-x"),
    {
      ...makeTrack(actorId, "y", 610, 610, 6000, "journey-y"),
      keyframes: [
        { keyframeId: "key-jy-0", time: 0, value: 610, ease: "none" },
        { keyframeId: "key-jy-1", time: 3000, value: 450, ease: "sine.inOut" },
        { keyframeId: "key-jy-2", time: 6000, value: 610, ease: "sine.inOut" },
      ],
    },
    makeTrack("camera", "x", -90, 90, 6000, "journey-pan"),
  ];
  return validateDocument({
    schemaVersion: 1,
    presentationId: "presentation-packet",
    title: "PACKET / Motion Editor Reference",
    sections: [
      {
        sectionId: "section-1",
        name: "A living network",
        logicalSlideIds: ["slide-1", "slide-2", "slide-3"],
      },
    ],
    logicalSlides: [
      {
        logicalSlideId: "slide-1",
        name: a.name,
        sceneIds: [a.sceneId],
        stepIds: ["step-1"],
      },
      {
        logicalSlideId: "slide-2",
        name: b.name,
        sceneIds: [b.sceneId],
        stepIds: ["step-2", "step-3"],
      },
      {
        logicalSlideId: "slide-3",
        name: c.name,
        sceneIds: [c.sceneId],
        stepIds: ["step-4"],
      },
    ],
    scenes: [a, b, c],
    steps: [
      { stepId: "step-1", sceneId: a.sceneId, name: "Meet frame 8", time: 0 },
      {
        stepId: "step-2",
        sceneId: b.sceneId,
        name: "Expand the packet",
        time: 0,
      },
      {
        stepId: "step-3",
        sceneId: b.sceneId,
        name: "Read the layers",
        time: 3000,
      },
      {
        stepId: "step-4",
        sceneId: c.sceneId,
        name: "Follow the journey",
        time: 1500,
      },
    ],
    actors: [
      {
        actorId,
        name: "Packet · frame 8",
        packet: {
          frameNumber: 8,
          totalBytes: 273,
          segments: [
            { name: "Ethernet", bytes: 14, color: "#7896B2" },
            { name: "IP", bytes: 20, color: "#8aafa2" },
            { name: "TCP", bytes: 20, color: "#c3b58a" },
            { name: "Data", bytes: 219, color: "#F0A86E" },
          ],
        },
      },
    ],
    assets: [],
    theme: {
      background: "#101216",
      foreground: "#f1eee8",
      accent: "#F0A86E",
      fontFamily: "system-ui, sans-serif",
    },
    sourceReferences: [],
    version: {
      versionId: "version-initial",
      createdAt: "2026-10-24T00:00:00.000Z",
    },
  });
}

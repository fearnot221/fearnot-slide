import { test, expect } from "@playwright/test";

test("edit geometry and motion, save, reload, publish immutable snapshot and deep-link viewer", async ({
  page,
  request,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: "Create PACKET demo" }).click();
  await expect(page).toHaveURL(/\/studio\//);
  const id = page.url().split("/").at(-1)!;
  await expect(
    page.locator(
      ".stage-interactive [data-testid=scene-renderer], .viewer [data-testid=scene-renderer]",
    ),
  ).toHaveAttribute("data-scene-id", "scene-intro");
  await page.getByRole("button", { name: "Add text", exact: true }).click();
  await page
    .getByLabel("Text content", { exact: true })
    .fill("E2E verified text · 可編輯");
  await page.getByLabel("Text content", { exact: true }).blur();
  await page.getByLabel("width", { exact: true }).fill("560");
  await page.getByLabel("width", { exact: true }).blur();
  await page
    .getByRole("button", { name: "Add rectangle", exact: true })
    .click();
  const rect = page.locator(".stage-interactive [data-element-id]").last();
  const box = await rect.boundingBox();
  expect(box).toBeTruthy();
  await page.mouse.move(box!.x + 20, box!.y + 20);
  await page.mouse.down();
  await page.mouse.move(box!.x + 70, box!.y + 50, { steps: 8 });
  await page.mouse.up();
  await page.getByLabel("width", { exact: true }).fill("460");
  await page.getByLabel("width", { exact: true }).blur();
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.getByLabel("width", { exact: true })).toHaveValue("400");
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  await expect(page.getByLabel("width", { exact: true })).toHaveValue("460");
  await page.getByRole("button", { name: "Animation", exact: true }).click();
  await page.getByLabel("Timeline time", { exact: true }).fill("0");
  await page.getByRole("button", { name: "Keyframe", exact: true }).click();
  await page.getByLabel("Timeline time", { exact: true }).fill("2000");
  await page.getByRole("button", { name: "Keyframe", exact: true }).click();
  await page.getByLabel("Value", { exact: true }).fill("900");
  await page.getByLabel("Value", { exact: true }).blur();
  await page.getByLabel("Time (ms)", { exact: true }).fill("2500");
  await page.getByLabel("Time (ms)", { exact: true }).blur();
  await page.getByLabel("Keyframe easing").selectOption("none");
  await page.getByLabel("Timeline time", { exact: true }).fill("1250");
  const halfwayTransform = await rect.evaluate(
    (e) => (e as HTMLElement).style.transform,
  );
  const halfwayX = Number(
    halfwayTransform.match(/translate\(([-.0-9]+)px/)?.[1],
  );
  expect(halfwayX).toBeGreaterThan(300);
  expect(halfwayX).toBeLessThan(900);
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Pause", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await page
    .getByRole("button", { name: "Reverse playback", exact: true })
    .click();
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await page.getByRole("button", { name: "Slides", exact: true }).click();
  await page.getByRole("button", { name: "Add slide", exact: true }).click();
  await expect(
    page.getByRole("button", { name: /Open slide 4/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Actors", exact: true }).click();
  await page
    .getByRole("button", { name: "Create shared packet actor", exact: true })
    .click();
  await page.getByRole("button", { name: "Slides", exact: true }).click();
  await page.getByRole("button", { name: /Open slide 2/ }).click();
  await page.getByRole("button", { name: "Camera", exact: true }).click();
  await page.getByLabel("Animation property").selectOption("zoom");
  await page.getByLabel("Timeline time", { exact: true }).fill("1000");
  await page.getByRole("button", { name: "Keyframe", exact: true }).click();
  await page.getByLabel("Value", { exact: true }).fill("1.2");
  await page.getByLabel("Value", { exact: true }).blur();
  await expect(page.getByRole("status", { name: "Save status" })).toHaveText(
    "Saved to disk",
  );
  const draft = await request.get(`/api/presentations/${id}`);
  expect(draft.ok()).toBeTruthy();
  const saved = await draft.json();
  expect(saved.document.scenes).toHaveLength(4);
  expect(saved.document.actors).toHaveLength(2);
  const savedRect = saved.document.scenes[0].elements.find(
    (e: { type: string }) => e.type === "rect",
  );
  expect(savedRect.width).toBe(460);
  expect(savedRect.x).toBeGreaterThan(300);
  const motionTrack = saved.document.scenes[0].timeline.tracks.find(
    (t: { targetId: string }) => t.targetId === savedRect.elementId,
  );
  expect(motionTrack.keyframes.at(-1)).toMatchObject({
    time: 2500,
    value: 900,
    ease: "none",
  });
  expect(halfwayX).toBeCloseTo((motionTrack.keyframes[0].value + 900) / 2, 0);
  expect(
    saved.document.scenes[0].elements.some(
      (e: { text: string }) => e.text === "E2E verified text · 可編輯",
    ),
  ).toBeTruthy();
  await page.reload();
  await expect(page.getByRole("status", { name: "Save status" })).toHaveText(
    "Saved to disk",
  );
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "Open published ↗" }),
  ).toBeVisible();
  const record = await (await request.get(`/api/presentations/${id}`)).json();
  expect(record.revisions).toHaveLength(1);
  const publicHtml = await (await request.get(`/p/${id}`)).text();
  expect(publicHtml).not.toContain("Frame 8 is one 273-byte Ethernet frame.");
  await page.getByLabel("Presentation name").fill("Unpublished changes");
  await page.getByLabel("Presentation name").blur();
  await expect(page.getByRole("status", { name: "Save status" })).toHaveText(
    "Saved to disk",
  );
  await page.goto(`/p/${id}?step=step-3`);
  await expect(
    page.locator(
      ".stage-interactive [data-testid=scene-renderer], .viewer [data-testid=scene-renderer]",
    ),
  ).toHaveAttribute("data-scene-id", "scene-protocol");
  await expect(page.getByLabel("Teaching step")).toHaveValue("step-3");
  await expect(page.getByLabel("Viewer time")).toHaveValue("3000");
  await expect(page.locator("header")).toContainText(
    "PACKET / Motion Editor Reference",
  );
  await expect(page.locator(".selection-overlay")).toHaveCount(0);
  await page.getByLabel("Teaching step").selectOption("step-4");
  await expect(
    page.locator(
      ".stage-interactive [data-testid=scene-renderer], .viewer [data-testid=scene-renderer]",
    ),
  ).toHaveAttribute("data-scene-id", "scene-journey");
  await page.reload();
  await expect(page.getByLabel("Teaching step")).toHaveValue("step-4");
  expect(errors).toEqual([]);
});

test("server rejects invalid documents, stale drafts, cross-origin writes and unpublished viewers", async ({
  request,
}) => {
  const created = await request.post("/api/presentations", {
    data: { blank: true },
  });
  expect(created.status()).toBe(201);
  const record = await created.json(),
    id = record.document.presentationId;
  expect((await request.get(`/p/${id}`)).status()).toBe(404);
  const document = { ...record.document, title: "First session" };
  expect(
    (
      await request.put(`/api/presentations/${id}`, {
        data: { document, etag: 1 },
      })
    ).status(),
  ).toBe(200);
  expect(
    (
      await request.put(`/api/presentations/${id}`, {
        data: { document, etag: 1 },
      })
    ).status(),
  ).toBe(409);
  expect(
    (
      await request.put(`/api/presentations/${id}`, {
        data: { document: { ...document, schemaVersion: 99 }, etag: 2 },
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await request.post("/api/presentations", {
        headers: { Origin: "https://attacker.example" },
        data: {},
      })
    ).status(),
  ).toBe(403);
});

test("visual regression: editor and deterministic intermediate published frames", async ({
  page,
  request,
}) => {
  const record = await (
    await request.post("/api/presentations", { data: {} })
  ).json();
  const id = record.document.presentationId;
  await page.goto(`/studio/${id}`);
  await expect(
    page.locator(
      ".stage-interactive [data-testid=scene-renderer], .viewer [data-testid=scene-renderer]",
    ),
  ).toBeVisible();
  await page.getByRole("button", { name: "Animation", exact: true }).click();
  await page.getByLabel("Timeline time", { exact: true }).fill("850");
  await expect(page.locator(".stage-interactive")).toHaveScreenshot(
    "packet-introduction-850ms.png",
  );
  await request.post(`/api/presentations/${id}/publish`, { data: { etag: 1 } });
  await page.goto(`/p/${id}?step=step-3`);
  await expect(page.getByLabel("Viewer time")).toHaveValue("3000");
  await page.getByLabel("Viewer time").fill("1500");
  await expect(page.locator(".fit-stage")).toHaveScreenshot(
    "protocol-layers-1500ms.png",
  );
  await page.getByLabel("Teaching step").selectOption("step-4");
  await page.getByLabel("Viewer time").fill("3000");
  await expect(page.locator(".fit-stage")).toHaveScreenshot(
    "packet-journey-3000ms.png",
  );
});

test("autosave serializes slow writes and never marks newer edits as already saved", async ({
  page,
  request,
}) => {
  const record = await (
    await request.post("/api/presentations", { data: {} })
  ).json();
  const id = record.document.presentationId;
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let writes = 0;
  await page.route(`**/api/presentations/${id}`, async (route) => {
    if (route.request().method() === "PUT") {
      writes++;
      if (writes === 1) await gate;
    }
    await route.continue();
  });
  await page.goto(`/studio/${id}`);
  await page.getByLabel("Presentation name").fill("First write");
  await page.getByLabel("Presentation name").blur();
  await expect.poll(() => writes).toBe(1);
  await page.getByLabel("Presentation name").fill("Second write");
  await page.getByLabel("Presentation name").blur();
  const firstResponse = page.waitForResponse(
    (r) =>
      r.url().endsWith(`/api/presentations/${id}`) &&
      r.request().method() === "PUT",
  );
  release();
  await firstResponse;
  await expect(page.getByRole("status", { name: "Save status" })).toHaveText(
    "Unsaved changes",
  );
  await expect(page.getByRole("status", { name: "Save status" })).toHaveText(
    "Saved to disk",
  );
  const saved = await (await request.get(`/api/presentations/${id}`)).json();
  expect(saved.document.title).toBe("Second write");
  expect(saved.etag).toBe(3);
  expect(writes).toBe(2);
});

test("canvas resize handles and draggable keyframes persist actual edited values", async ({
  page,
  request,
}) => {
  const record = await (
    await request.post("/api/presentations", { data: { blank: true } })
  ).json();
  const id = record.document.presentationId;
  await page.goto(`/studio/${id}`);
  await page
    .getByRole("button", { name: "Add rectangle", exact: true })
    .click();
  const element = page.locator(".stage-interactive [data-element-id]");
  const corner = page.locator(".selection-overlay g g rect").last();
  const handle = await corner.boundingBox();
  expect(handle).toBeTruthy();
  await page.mouse.move(
    handle!.x + handle!.width / 2,
    handle!.y + handle!.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(handle!.x + 45, handle!.y + 30, { steps: 8 });
  await page.mouse.up();
  await expect
    .poll(async () =>
      Number(await page.getByLabel("width", { exact: true }).inputValue()),
    )
    .toBeGreaterThan(400);
  await page.getByRole("button", { name: "Animation", exact: true }).click();
  await page.getByRole("button", { name: "Keyframe", exact: true }).click();
  await page.getByLabel("Timeline time", { exact: true }).fill("1000");
  await page.getByRole("button", { name: "Keyframe", exact: true }).click();
  const diamond = page.getByRole("button", {
    name: "Keyframe x at 1000ms",
    exact: true,
  });
  const box = await diamond.boundingBox();
  expect(box).toBeTruthy();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
  await page.mouse.move(box!.x + 65, box!.y + box!.height / 2, { steps: 8 });
  await page.mouse.up();
  await expect
    .poll(async () =>
      Number(await page.getByLabel("Time (ms)", { exact: true }).inputValue()),
    )
    .toBeGreaterThan(1000);
  await expect(page.getByRole("status", { name: "Save status" })).toHaveText(
    "Saved to disk",
  );
  const saved = await (await request.get(`/api/presentations/${id}`)).json();
  expect(saved.document.scenes[0].elements[0].width).toBeGreaterThan(400);
  expect(saved.document.scenes[0].elements[0].height).toBeGreaterThan(200);
  expect(
    saved.document.scenes[0].timeline.tracks[0].keyframes[1].time,
  ).toBeGreaterThan(1000);
  await expect(element).toHaveCount(1);
});

test("preview and published arrow navigation play scene and same-scene step animations", async ({
  page,
  request,
}) => {
  const record = await (
    await request.post("/api/presentations", { data: {} })
  ).json();
  const id = record.document.presentationId;
  await page.goto(`/studio/${id}`);
  await page.getByRole("button", { name: "Present", exact: true }).click();
  const time = page.getByLabel("Viewer time"),
    step = page.getByLabel("Teaching step");
  await expect(
    page.getByRole("button", { name: "Pause", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await time.fill("0");
  await page.locator("main.viewer").click({ position: { x: 5, y: 5 } });
  await expect(time).toHaveValue("0");
  await page.keyboard.press("ArrowLeft");
  await expect(step).toHaveValue("step-1");
  await expect(time).toHaveValue("0");
  await page.keyboard.press("ArrowRight");
  await expect(step).toHaveValue("step-2");
  await expect(
    page.getByRole("button", { name: "Pause", exact: true }),
  ).toBeVisible();
  await expect
    .poll(async () => Number(await time.inputValue()))
    .toBeGreaterThan(0);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  // Arrow navigation also works after a playback button receives focus.
  await page.keyboard.press("ArrowRight");
  await expect(step).toHaveValue("step-3");
  await expect
    .poll(async () => Number(await time.inputValue()))
    .toBeGreaterThan(3000);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await page.keyboard.press("ArrowLeft");
  await expect(step).toHaveValue("step-2");
  await expect
    .poll(async () => Number(await time.inputValue()))
    .toBeGreaterThan(0);
  expect(Number(await time.inputValue())).toBeLessThan(3000);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await page.keyboard.press("ArrowLeft");
  await expect(step).toHaveValue("step-1");
  await expect
    .poll(async () => Number(await time.inputValue()))
    .toBeGreaterThan(0);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await page.getByRole("button", { name: "Next →", exact: true }).click();
  await expect(step).toHaveValue("step-2");
  await expect
    .poll(async () => Number(await time.inputValue()))
    .toBeGreaterThan(0);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await time.fill("850");
  await expect(time).toHaveValue("850");
  await expect(
    page.getByRole("button", { name: "Play", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Return to Studio · Esc", exact: true })
    .click();
  const saved = await (await request.get(`/api/presentations/${id}`)).json();
  expect(
    (
      await request.post(`/api/presentations/${id}/publish`, {
        data: { etag: saved.etag },
      })
    ).ok(),
  ).toBeTruthy();
  await page.goto(`/p/${id}?step=step-3`);
  await expect(time).toHaveValue("3000");
  await expect(
    page.getByRole("button", { name: "Play", exact: true }),
  ).toBeVisible();
  await time.focus();
  await page.keyboard.press("ArrowRight");
  await expect(step).toHaveValue("step-3");
  await expect(
    page.getByRole("button", { name: "Play", exact: true }),
  ).toBeVisible();
  await page.locator("main.viewer").click({ position: { x: 5, y: 5 } });
  await page.keyboard.press("ArrowRight");
  await expect(step).toHaveValue("step-4");
  await expect
    .poll(async () => Number(await time.inputValue()))
    .toBeGreaterThan(1500);
});

test("presentation-first workspace shows complete slides and opens motion tools only on demand", async ({
  page,
  request,
}) => {
  const record = await (
    await request.post("/api/presentations", { data: {} })
  ).json();
  const id = record.document.presentationId;
  await page.goto(`/studio/${id}`);
  await expect(
    page.getByRole("button", { name: "Slides", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("button", { name: "Animation", exact: true }),
  ).toHaveAttribute("aria-expanded", "false");
  await expect(
    page.getByRole("region", { name: "Motion timeline" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Camera", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Actors", exact: true }),
  ).toHaveCount(0);
  await expect(page.locator(".stage-interactive [data-actor-id]")).toHaveCSS(
    "opacity",
    "1",
  );
  const stage = await page.locator(".stage-interactive").boundingBox();
  expect(stage!.height).toBeGreaterThan(450);
  const thumbnail = await page
    .locator(".slide-thumbnail")
    .first()
    .boundingBox();
  const rail = await page.locator(".left-panel").boundingBox();
  expect(thumbnail!.width).toBeLessThan(rail!.width);
  expect(thumbnail!.width / thumbnail!.height).toBeCloseTo(16 / 9, 2);
  await expect(page.locator(".studio")).toHaveScreenshot(
    "presentation-workspace.png",
  );
  await page.screenshot({
    path: "docs/implementation/presentation-workspace.png",
  });
  await page.getByRole("button", { name: "Add text", exact: true }).click();
  await page.getByLabel("Text content").fill("Presentation-first content");
  await page.getByLabel("Text content").blur();
  await expect(
    page.getByRole("button", { name: "Slides", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".slide-thumbnail").first()).toContainText(
    "Presentation-first content",
  );
  await page.getByRole("button", { name: "Next slide", exact: true }).click();
  await expect(page.locator(".scene-navigation")).toContainText("Slide 2 of 3");
  await expect(
    page.locator(".stage-interactive [data-testid=scene-renderer]"),
  ).toHaveAttribute("data-scene-id", "scene-protocol");
  await page.getByRole("button", { name: "Present", exact: true }).click();
  await expect(page.getByLabel("Teaching step")).toHaveValue("step-2");
  await expect(
    page.getByRole("button", { name: "Pause", exact: true }),
  ).toBeVisible();
  await expect
    .poll(async () => Number(await page.getByLabel("Viewer time").inputValue()))
    .toBeGreaterThan(0);
  await page
    .getByRole("button", { name: "Return to Studio · Esc", exact: true })
    .click();
  await page.getByRole("button", { name: "Animation", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Motion timeline" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Camera", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Timeline time", { exact: true }).fill("1200");
  await page.getByRole("button", { name: "Animation", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Motion timeline" }),
  ).toHaveCount(0);
  await expect(page.locator(".stage-interactive [data-actor-id]")).toHaveCSS(
    "opacity",
    "1",
  );
  await page.getByRole("button", { name: "New slide", exact: true }).click();
  await expect(page.locator(".scene-navigation")).toContainText("Slide 4 of 4");
  await expect(
    page.locator(".stage-interactive [data-element-id]"),
  ).toHaveCount(0);
  await expect(page.getByRole("status", { name: "Save status" })).toHaveText(
    "Saved to disk",
  );
  const saved = await (await request.get(`/api/presentations/${id}`)).json();
  expect(saved.document.logicalSlides).toHaveLength(4);
  expect(saved.document.scenes[1].timeline.tracks).toEqual(
    record.document.scenes[1].timeline.tracks,
  );
});

# PACKET Studio

可實際編輯、儲存及播放的 Web Presentation Editor 核心版本。以 1920 × 1080 DOM/SVG Stage、JSON 動畫文件、GSAP 時鐘與跨場景 Shared Actor 為基礎。

**目前是本機開發用 vertical slice，不是已完成的 production 平台。** PostgreSQL、OIDC、S3、Queue Worker 和完整匯出仍待實作。完整狀態見 [IMPLEMENTATION-STATUS](docs/IMPLEMENTATION-STATUS.md)。

## 啟動

需求：Node.js ≥ 20.9（本機驗證為 Node 24）、pnpm 11.25.0。

```sh
pnpm install
pnpm dev
```

開啟 <http://127.0.0.1:3000>，按 PACKET 參考專案右下角箭頭，建立自己的可編輯副本。也可 New presentation，或匯入本平台 Project JSON。

`pnpm dev` 明確設定 `ENABLE_LOCAL_DEMO=1`，只綁定 127.0.0.1。資料預設存於 `apps/web/.data/`（忽略版控）；可用 `PACKET_DATA_DIR=/absolute/path pnpm dev` 指定。草稿變更後 700ms 自動存檔；請確認「Saved to disk」再關閉。儲存錯誤與衝突會明確顯示，並提供 recovery JSON。發生衝突時先匯出，再重新載入；不會自動覆蓋另一個工作階段。

原目錄是空的，沒有原版 PACKET、ZIP、字型或 PCAP。本版參考簡報依需求重新建立，並不宣稱還原原始程式。頁碼由 LogicalSlide 順序推導，物件使用穩定 ID。

## 操作

預設以投影片編輯為主：左側按 LogicalSlide 顯示實際內容縮圖，中央顯示完整投影片，工具列提供文字、圖形、圖片與 New slide。新增物件不會切走投影片導覽。Present 會從目前投影片開始並自動播放進場；左右鍵繼續切換並播放。

需要調整動畫時才開啟 Animation；時間軸、Camera、Shared Actors 與 Slide Builds 會一起出現。關閉後會暫停並回到完整投影片。一般格式編輯修改畫面中實際看到的最終姿態；動畫模式的 Inspector 仍編輯基礎值。

- 工具列：文字、矩形、橢圓、線、箭頭、SVG Path、PNG/JPEG/WebP 圖片（單張 ≤ 1 MB）。
- 畫布：點選、Shift 多選、拖曳單一物件、右下角縮放；Inspector 可編輯幾何、旋轉、樣式及中英混排文字。
- Layers（按需切換）：選取、顯示/隱藏、鎖定/解鎖、排序、複製普通物件、刪除。Shared Actor 在同一場景只能有一個實例。
- Animation → Actors：建立 273-byte Packet，或將既有 Actor Place 至其他場景；Inspector 修改 representation。
- Animation → Timeline：選取物件，選 property，在 playhead 新增 Keyframe；點選菱形後可修改 Time、Value、Easing 或刪除。拖曳菱形可調整時間，鍵盤左右可移動 10ms。
- 動畫物件在畫布拖曳會將修改寫入當前時間的既有動畫 Channel；一般 Inspector 編輯基礎值，已有 Track 時由 Track 優先。
- Animation → Camera：Inspector Camera 編輯基礎 Pan/Zoom/Rotation、Focus；Animate camera 後在 Timeline 編輯 Camera Keyframes。
- New slide 新增投影片與初始場景；動畫模式的 Slide Builds 可新增目前時間點並直接跳轉。Present 開啟共用播放器，Esc 返回。
- History 建立不可變 Revision；Publish 先保存草稿，再建立不可變的發布快照；Open published 開啟 `/p/:id`。
- Public Viewer / Preview：左右鍵或 Previous / Next 切換 Step 後，會從該 Step 時間自動播放場景動畫；Space 播放/暫停。直接連結、Step 選單與拖曳時間軸維持定位後暫停；`?step=<stable-step-id>` 支援重新整理還原。
- Project JSON 匯出/匯入保留可編輯資料。Print / PDF 使用瀏覽器列印**當前畫面**，不是多頁匯出工作。

快捷鍵：⌘/Ctrl+Z Undo、⇧⌘/Ctrl+Z Redo、⌘/Ctrl+D 複製普通物件、⌘/Ctrl+S 儲存、Delete 刪除、Esc 取消選取、方向鍵移動、Space 播放。輸入文字時不攔截編輯快捷鍵。

## 驗證

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm test:e2e
```

E2E 預設使用已安裝的 Google Chrome；若要使用 Playwright Chromium：

```sh
pnpm exec playwright install chromium
PLAYWRIGHT_CHANNEL=chromium pnpm test:e2e
```

E2E 自行啟動 3100 port，使用獨立 `.next-e2e` build 與 `.data/e2e` 資料，不修改使用者草稿。初次建立視覺基準使用 `pnpm test:e2e --update-snapshots`；基準圖是本版 Renderer 的 regression baseline，並非原版 PACKET Golden Master。macOS 與 Linux 字型不同，需在固定 CI 平台建立對應基準。

## 模組

- `apps/web`：Next App Router host、私人 API、本機儲存服務、公開頁面。
- `apps/studio`：client Studio、Timeline、Inspector、畫布控制與草稿儲存。
- `packages/document-model`：Zod v1 schema、types、integrity、ordering、serialization。
- `packages/motion-engine`：純資料狀態求值、easing、GSAP 可控制時間軸。
- `packages/camera-engine`：矩陣、逆矩陣、座標轉換、Focus。
- `packages/scene-engine`：共用 React DOM/SVG Renderer，無 Next 依賴。
- `packages/presentation-runtime`：共用播放控制與 read-only Viewer，無 Editor Core 依賴。
- `packages/editor-core`：commands、validation、bounded undo/redo，無儲存依賴。
- `packages/database`：開發用檔案 Repository；目前不是 PostgreSQL adapter。

參考文件：`fixtures/sample-decks/packet.ts` 與可匯入的 `packet.json`。

## 正式環境限制

`pnpm build` 可完成 production 編譯，`pnpm start` 可播放已發布資料；**私人 API 在 NODE_ENV=production 一律拒絕，即使 ENABLE_LOCAL_DEMO=1 也不能繞過。** 正式多人編輯需先完成 PostgreSQL/Drizzle 交易、OIDC 與 resource permissions。不要將 development server 暴露至網路。

檔案 Repository 使用 atomic rename、每份文件的 filesystem lock 與 optimistic etag；僅支援單機本地磁碟，不適合 NFS、多主機或無持久磁碟的 Serverless。備份請保留整個資料目錄。程序異常中止可能留下 `.json.lock`；確認沒有寫入程序後才能手動清理鎖。

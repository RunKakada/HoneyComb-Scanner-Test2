/* ==================================================
   AI Honeycomb Inspector v4
   Main Application Controller
================================================== */

const App = (() => {

    const state = {
        running:        false,
        frozen:         false,
        surfaceEnabled: true,
        overlayMode:    0,
        overlayLabels:  ["Full AR", "Outline", "Off"],
        frameCount:     0,
        startTime:      null,
        lastFrameTime:  performance.now(),
        fpsBuffer:      [],
        detections:     [],
        concreteData:   null,
        measurement:    null,
        busyDetecting:  false,
        captures:       []   // { dataUrl, voids, ts }
    };

    let animationId = null;

    /* ── INIT ─────────────────────────────────── */

    async function init() {
        bindEvents();
        // Pre-fill today's date in report form
        const d = document.getElementById("f_date");
        if (d) d.value = new Date().toISOString().slice(0, 10);

        HUD.reset();
        Measurement.init();
        await YOLODetector.init();
    }

    function bindEvents() {
        document.getElementById("startBtn")  .addEventListener("click", start);
        document.getElementById("freezeBtn") .addEventListener("click", toggleFreeze);
        document.getElementById("overlayBtn").addEventListener("click", cycleOverlay);
        document.getElementById("captureBtn").addEventListener("click", capturePhoto);
        document.getElementById("reportBtn") .addEventListener("click", openReport);
        document.getElementById("resetBtn")  .addEventListener("click", resetSession);

        document.getElementById("statsBtn")    .addEventListener("click", openSheet);
        document.getElementById("sheetClose")  .addEventListener("click", closeSheet);
        document.getElementById("sheetBackdrop").addEventListener("click", closeSheet);

        document.getElementById("reportClose")  .addEventListener("click", closeReport);
        document.getElementById("reportBackdrop").addEventListener("click", closeReport);
        document.getElementById("exportPngBtn") .addEventListener("click", () => Exporter.exportPNG(state));
        document.getElementById("exportPdfBtn") .addEventListener("click", () => Exporter.exportPDF(state));
    }

    /* ── SCAN STATUS SHEET ────────────────────── */

    function openSheet() {
        document.getElementById("bottomSheet")  .classList.add("open");
        document.getElementById("sheetBackdrop").classList.add("open");
        renderCaptureThumbs("captureThumbsRow");
    }

    function closeSheet() {
        document.getElementById("bottomSheet")  .classList.remove("open");
        document.getElementById("sheetBackdrop").classList.remove("open");
    }

    /* ── REPORT MODAL ─────────────────────────── */

    function openReport() {
        setText("captureCount", state.captures.length);

        renderCaptureThumbs("reportThumbs");

        const note = document.getElementById("noCaptureNote");
        if (note) note.style.display = state.captures.length ? "none" : "block";

        document.getElementById("reportModal")   .classList.remove("hidden");
        document.getElementById("reportBackdrop").classList.remove("hidden");
    }

    function closeReport() {
        document.getElementById("reportModal")   .classList.add("hidden");
        document.getElementById("reportBackdrop").classList.add("hidden");
    }

    /* ── CAPTURES ─────────────────────────────── */

    function capturePhoto() {
        if (!state.running) {
            alert("Start the scan first before capturing.");
            return;
        }

        const video     = document.getElementById("cameraVideo");
        const arCanvas  = document.getElementById("arCanvas");

        const tmp = document.createElement("canvas");
        tmp.width  = arCanvas.width;
        tmp.height = arCanvas.height;

        const ctx = tmp.getContext("2d");
        ctx.drawImage(video,    0, 0, tmp.width, tmp.height);
        ctx.drawImage(arCanvas, 0, 0, tmp.width, tmp.height);

        state.captures.push({
            dataUrl: tmp.toDataURL("image/jpeg", 0.88),
            voids:   state.detections.length,
            ts:      new Date().toLocaleTimeString()
        });

        // Flash feedback
        flashCapture();
        updateCaptureCount();
    }

    function flashCapture() {
        const flash = document.createElement("div");
        flash.style.cssText =
            "position:fixed;inset:0;background:#fff;opacity:0.45;pointer-events:none;z-index:999;transition:opacity 0.3s";
        document.body.appendChild(flash);
        requestAnimationFrame(() => {
            flash.style.opacity = "0";
            setTimeout(() => flash.remove(), 350);
        });
    }

    function updateCaptureCount() {
        // Update badge on capture button
        const btn = document.getElementById("captureBtn");
        const n   = state.captures.length;
        let badge = btn.querySelector(".cap-badge");
        if (!badge) {
            badge = document.createElement("span");
            badge.className = "cap-badge";
            badge.style.cssText =
                "position:absolute;top:2px;right:2px;background:var(--cyan);color:#000;" +
                "border-radius:99px;font-size:9px;font-weight:700;padding:1px 5px;pointer-events:none;";
            btn.style.position = "relative";
            btn.appendChild(badge);
        }
        badge.textContent = n;
        badge.style.display = n ? "block" : "none";
    }

    function renderCaptureThumbs(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (!state.captures.length) {
            container.innerHTML = '<span class="no-captures">No captures yet. Press 🖼️ Capture during scan.</span>';
            return;
        }

        container.innerHTML = "";
        state.captures.forEach((cap, i) => {
            const wrap = document.createElement("div");
            wrap.className = "thumb-wrap";

            const img = document.createElement("img");
            img.src = cap.dataUrl;
            img.title = `Capture ${i+1} · ${cap.ts} · ${cap.voids} voids`;

            const del = document.createElement("button");
            del.className = "thumb-del";
            del.textContent = "✕";
            del.addEventListener("click", (e) => {
                e.stopPropagation();
                state.captures.splice(i, 1);
                updateCaptureCount();
                renderCaptureThumbs(containerId);
                // also refresh the other container if it's open
                const other = containerId === "reportThumbs" ? "captureThumbsRow" : "reportThumbs";
                renderCaptureThumbs(other);
                setText("captureCount", state.captures.length);
            });

            wrap.appendChild(img);
            wrap.appendChild(del);
            container.appendChild(wrap);
        });
    }

    /* ── CAMERA + LOOP ────────────────────────── */

    async function start() {
        try {
            await Camera.start();

            state.running      = true;
            state.frozen       = false;
            state.frameCount   = 0;
            state.detections   = [];
            state.concreteData = null;
            state.measurement  = Measurement.emptyResult();
            state.fpsBuffer    = [];
            state.startTime    = performance.now();
            state.lastFrameTime = performance.now();

            setText("scanStatus", "SCANNING");
            document.getElementById("frozenBadge").classList.add("hidden");

            loop();

        } catch (err) {
            alert("Camera cannot start. Please allow camera permission.");
            console.error(err);
        }
    }

    function loop() {
        if (!state.running) return;

        const video = document.getElementById("cameraVideo");
        if (video.readyState >= 2) {
            prepareCanvasSize();
            if (!state.frozen) processFrame(video);
            renderAR();
            updateHUD();
        }

        animationId = requestAnimationFrame(loop);
    }

    function prepareCanvasSize() {
        const video  = document.getElementById("cameraVideo");
        const proc   = document.getElementById("processCanvas");
        const ar     = document.getElementById("arCanvas");
        const w      = video.videoWidth  || window.innerWidth;
        const h      = video.videoHeight || window.innerHeight;

        if (proc.width !== w || proc.height !== h) { proc.width = w; proc.height = h; }
        if (ar.width   !== w || ar.height   !== h) { ar.width   = w; ar.height   = h; }
    }

    /* ── FRAME PROCESSING ─────────────────────── */

    function processFrame(video) {
        if (state.busyDetecting) return;

        const proc = document.getElementById("processCanvas");
        const ctx  = proc.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(video, 0, 0, proc.width, proc.height);

        state.frameCount++;
        state.busyDetecting = true;
        runDetection(proc).finally(() => { state.busyDetecting = false; });
    }

    async function runDetection(canvas) {
        try {
            state.concreteData = state.surfaceEnabled
                ? ConcreteSurface.detect(canvas)
                : null;

            const raw          = await YOLODetector.detect(canvas, state.concreteData);
            state.measurement  = Measurement.analyseDetections(raw);
            state.detections   = state.measurement.detections;

            Measurement.updateHUD(state.measurement);

        } catch (err) {
            console.error("Detection error:", err);
        }
    }

    /* ── AR RENDER ────────────────────────────── */

    function renderAR() {
        const ar  = document.getElementById("arCanvas");
        const ctx = ar.getContext("2d");
        ctx.clearRect(0, 0, ar.width, ar.height);

        const t = performance.now() / 1000;
        AROverlay.drawScanlines(ctx, ar, t);
        if (state.surfaceEnabled && state.concreteData)
            AROverlay.drawConcreteROI(ctx, state.concreteData.roi, t);
        AROverlay.drawHoneycomb(ctx, state.detections, state.overlayMode, t);
    }

    /* ── HUD UPDATE ───────────────────────────── */

    function updateHUD() {
        const now = performance.now();
        const dt  = now - state.lastFrameTime;
        state.lastFrameTime = now;

        if (dt > 0) {
            state.fpsBuffer.push(1000 / dt);
            if (state.fpsBuffer.length > 30) state.fpsBuffer.shift();
        }

        const avgFps = state.fpsBuffer.reduce((a, b) => a + b, 0) /
                       Math.max(1, state.fpsBuffer.length);

        const elapsed = state.startTime
            ? (performance.now() - state.startTime) / 1000 : 0;

        HUD.update({
            fps:     Math.round(avgFps),
            frozen:  state.frozen,
            surface: state.surfaceEnabled ? "Active" : "Off",
            voids:   state.detections.length,
            elapsed,
            measurement: state.measurement || Measurement.emptyResult()
        });
    }

    /* ── CONTROLS ─────────────────────────────── */

    function toggleFreeze() {
        if (!state.running) return;
        state.frozen = !state.frozen;

        document.getElementById("frozenBadge")
            .classList.toggle("hidden", !state.frozen);

        const lbl  = document.querySelector("#freezeBtn .btn-label");
        const icon = document.querySelector("#freezeBtn .btn-icon");
        if (lbl)  lbl.textContent  = state.frozen ? "Resume" : "Freeze";
        if (icon) icon.textContent = state.frozen ? "▶" : "⏸";
    }

    function cycleOverlay() {
        state.overlayMode = (state.overlayMode + 1) % 3;
        const lbl = document.querySelector("#overlayBtn .btn-label");
        if (lbl) lbl.textContent = state.overlayLabels[state.overlayMode];
    }

    function resetSession() {
        state.frameCount   = 0;
        state.detections   = [];
        state.concreteData = null;
        state.measurement  = Measurement.emptyResult();
        state.fpsBuffer    = [];
        state.captures     = [];

        updateCaptureCount();
        HUD.reset();
        Measurement.updateHUD(state.measurement);

        const ar  = document.getElementById("arCanvas");
        ar.getContext("2d").clearRect(0, 0, ar.width, ar.height);
    }

    /* ── HELPERS ──────────────────────────────── */

    function setText(id, v) {
        const el = document.getElementById(id);
        if (el) el.textContent = v;
    }

    window.addEventListener("resize", prepareCanvasSize);
    document.addEventListener("DOMContentLoaded", init);

    return { getState: () => state };

})();

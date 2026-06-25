/* ==================================================
   AI Honeycomb Inspector v5 — Professional Exporter
   iOS-style white report + larger honeycomb photos
   + general honeycomb repair method statement
================================================== */

const Exporter = (() => {

    const REPAIR_METHOD = [
        "Inspection & marking: Identify and mark all honeycomb locations. Estimate affected area and confirm whether the defect is superficial or structurally significant.",
        "Surface preparation: Remove loose concrete, laitance, dust, oil and weak material until sound concrete is reached.",
        "Cleaning: Clean the repair area using brush, compressed air or water jet. The surface should be clean and slightly damp before repair mortar application.",
        "Bonding treatment: Apply approved bonding agent or cement slurry where required by the repair material manufacturer.",
        "Repair application: Fill the defect using non-shrink repair mortar or approved polymer-modified repair mortar in layers and compact properly.",
        "Finishing & curing: Finish the repaired surface to match adjacent concrete and cure the area according to the material specification.",
        "Engineering note: For deep honeycomb, exposed reinforcement, large structural defects or repeated defects, consult the structural engineer before repair."
    ];

    function getFormData() {
        return {
            project:    val("f_project")    || "—",
            subject:    val("f_subject")    || "Honeycomb Defect Assessment",
            structType: val("f_structural_type") || "—",
            structName: val("f_structural_name") || "—",
            date:       val("f_date")       || new Date().toISOString().slice(0,10),
            inspector:  val("f_inspector")  || "—"
        };
    }

    function val(id) {
        const el = document.getElementById(id);
        return el ? el.value.trim() : "";
    }

    function ts() {
        return new Date().toISOString().replace(/[:.]/g, "-");
    }

    function formatDate(iso) {
        if (!iso) return "—";
        const [y, m, d] = iso.split("-");
        return `${d}/${m}/${y}`;
    }

    function detectionCount(state) {
        return state.detections ? state.detections.length : 0;
    }

    function getSeverity(count) {
        if (count <= 0) return { name: "No Defect Detected", color: [52, 199, 89], recommendation: "No visible honeycomb was detected in the captured scan." };
        if (count <= 2) return { name: "Minor", color: [52, 199, 89], recommendation: "Local patch repair is generally suitable after cleaning and confirmation by the inspector." };
        if (count <= 5) return { name: "Moderate", color: [255, 149, 0], recommendation: "Repair is recommended. Check depth, exposed aggregate and possible reinforcement exposure before final approval." };
        return { name: "Severe", color: [255, 59, 48], recommendation: "Immediate engineering review is recommended before repair, especially for structural members." };
    }

    /* ══════════════════════════════════════════
       PNG EXPORT — single image report
    ══════════════════════════════════════════ */

    async function exportPNG(state) {
        const form = getFormData();
        const captures = state.captures || [];
        const sev = getSeverity(detectionCount(state));

        const W = 1200;
        const P = 56;
        const PHOTO_W = W - P * 2;
        const PHOTO_H = Math.round(PHOTO_W * 0.56);
        const photoRowsH = captures.length ? captures.length * (PHOTO_H + 72) : 110;
        const methodH = 360;
        const H = 260 + 290 + 150 + photoRowsH + methodH + 110;

        const c = document.createElement("canvas");
        c.width = W;
        c.height = H;
        const ctx = c.getContext("2d");

        ctx.fillStyle = "#f5f7fb";
        ctx.fillRect(0, 0, W, H);

        // Header
        roundRectFill(ctx, P, 36, W - P * 2, 170, 28, "#ffffff");
        shadow(ctx, "rgba(15,23,42,0.10)", 0, 12, 32);
        roundRectStroke(ctx, P, 36, W - P * 2, 170, 28, "rgba(203,213,225,0.9)");
        ctx.shadowColor = "transparent";

        ctx.fillStyle = "#0f172a";
        ctx.font = "bold 38px Arial";
        ctx.fillText("AI Honeycomb Inspector", P + 34, 88);
        ctx.fillStyle = "#64748b";
        ctx.font = "18px Arial";
        ctx.fillText("Concrete Defect Inspection Report · YOLOv8 Web AR", P + 34, 122);

        pill(ctx, W - P - 250, 72, 210, 44, "INSPECTION REPORT", "#007aff", "#ffffff");
        ctx.fillStyle = "#94a3b8";
        ctx.font = "15px Arial";
        ctx.fillText(`Generated: ${new Date().toLocaleString()}`, P + 34, 160);

        let y = 246;
        sectionCanvas(ctx, "PROJECT INFORMATION", P, y);
        y += 28;

        const fields = [
            ["Project Name", form.project],
            ["Subject", form.subject],
            ["Structural Type", form.structType],
            ["Structural Name / ID", form.structName],
            ["Date of Inspection", formatDate(form.date)],
            ["Inspector", form.inspector]
        ];

        const cardW = (W - P * 2 - 24) / 2;
        fields.forEach((f, i) => {
            const x = P + (i % 2) * (cardW + 24);
            const yy = y + Math.floor(i / 2) * 78;
            roundRectFill(ctx, x, yy, cardW, 60, 16, "#ffffff");
            roundRectStroke(ctx, x, yy, cardW, 60, 16, "#e2e8f0");
            ctx.fillStyle = "#64748b"; ctx.font = "12px Arial";
            ctx.fillText(f[0].toUpperCase(), x + 18, yy + 22);
            ctx.fillStyle = "#0f172a"; ctx.font = "bold 18px Arial";
            fitText(ctx, f[1], x + 18, yy + 46, cardW - 36);
        });

        y += 250;
        sectionCanvas(ctx, "DETECTION SUMMARY", P, y);
        y += 30;

        const sum = [
            ["Voids Detected", String(detectionCount(state)), "#007aff"],
            ["Captured Photos", String(captures.length), "#5856d6"],
            ["Severity", sev.name, rgbToCss(sev.color)]
        ];
        const boxW = (W - P * 2 - 28) / 3;
        sum.forEach((s, i) => {
            const x = P + i * (boxW + 14);
            roundRectFill(ctx, x, y, boxW, 88, 18, "#ffffff");
            roundRectStroke(ctx, x, y, boxW, 88, 18, "#e2e8f0");
            ctx.fillStyle = "#64748b"; ctx.font = "13px Arial";
            ctx.fillText(s[0].toUpperCase(), x + 18, y + 28);
            ctx.fillStyle = s[2]; ctx.font = "bold 28px Arial";
            fitText(ctx, s[1], x + 18, y + 64, boxW - 36);
        });

        y += 130;
        sectionCanvas(ctx, `CAPTURED HONEYCOMB PHOTOS (${captures.length})`, P, y);
        y += 32;

        if (!captures.length) {
            roundRectFill(ctx, P, y, PHOTO_W, 80, 18, "#ffffff");
            ctx.fillStyle = "#64748b"; ctx.font = "italic 18px Arial";
            ctx.fillText("No photos captured during this inspection.", P + 24, y + 48);
            y += 110;
        } else {
            for (let i = 0; i < captures.length; i++) {
                await drawImageCard(ctx, captures[i], i, P, y, PHOTO_W, PHOTO_H);
                y += PHOTO_H + 72;
            }
        }

        sectionCanvas(ctx, "GENERAL METHOD STATEMENT FOR HONEYCOMB REPAIR", P, y);
        y += 32;
        roundRectFill(ctx, P, y, PHOTO_W, methodH - 50, 18, "#ffffff");
        roundRectStroke(ctx, P, y, PHOTO_W, methodH - 50, 18, "#e2e8f0");
        ctx.fillStyle = "#0f172a"; ctx.font = "bold 17px Arial";
        ctx.fillText("Recommended general repair procedure", P + 24, y + 32);
        ctx.font = "15px Arial";
        ctx.fillStyle = "#334155";
        let my = y + 64;
        REPAIR_METHOD.forEach((line, idx) => {
            const wrapped = wrapCanvasText(ctx, `${idx + 1}. ${line}`, PHOTO_W - 58);
            wrapped.forEach(w => { ctx.fillText(w, P + 24, my); my += 21; });
            my += 4;
        });

        const FY = H - 72;
        ctx.fillStyle = "#94a3b8"; ctx.font = "14px Arial";
        ctx.fillText("AI Honeycomb Inspector · Professional Concrete Defect Report", P, FY);
        ctx.textAlign = "right";
        ctx.fillText("Generated automatically from field capture", W - P, FY);
        ctx.textAlign = "left";

        const link = document.createElement("a");
        link.download = `honeycomb_report_${ts()}.png`;
        link.href = c.toDataURL("image/png");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    async function drawImageCard(ctx, cap, i, x, y, w, h) {
        roundRectFill(ctx, x, y, w, h + 42, 20, "#ffffff");
        roundRectStroke(ctx, x, y, w, h + 42, 20, "#e2e8f0");
        await new Promise(res => {
            const img = new Image();
            img.onload = () => {
                ctx.save();
                roundRectPath(ctx, x + 14, y + 14, w - 28, h - 4, 14);
                ctx.clip();
                drawImageCover(ctx, img, x + 14, y + 14, w - 28, h - 4);
                ctx.restore();
                ctx.fillStyle = "#0f172a"; ctx.font = "bold 17px Arial";
                ctx.fillText(`Photo ${i + 1}`, x + 20, y + h + 28);
                ctx.fillStyle = "#64748b"; ctx.font = "14px Arial";
                ctx.fillText(`${cap.ts} · ${cap.voids} voids`, x + 110, y + h + 28);
                res();
            };
            img.onerror = () => res();
            img.src = cap.dataUrl;
        });
    }

    /* ══════════════════════════════════════════
       PDF EXPORT — CI-Report style, big photos
    ══════════════════════════════════════════ */

    async function exportPDF(state) {
        if (typeof window.jspdf === "undefined") {
            alert("PDF library not loaded. Please check your connection and try again.");
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
        const form = getFormData();
        const captures = state.captures || [];
        const sev = getSeverity(detectionCount(state));

        const W = 210, H = 297, P = 14, CW = W - P * 2;

        // Page 1
        pageBg(doc);
        header(doc, form);

        let y = 42;
        sectionPDF(doc, "PROJECT INFORMATION", P, y);
        y += 7;
        infoTable(doc, [
            ["Project Name", form.project, "Subject", form.subject],
            ["Structural Type", form.structType, "Structural Name / ID", form.structName],
            ["Date of Inspection", formatDate(form.date), "Inspector", form.inspector]
        ], P, y, CW);

        y += 43;
        sectionPDF(doc, "DETECTION SUMMARY", P, y);
        y += 8;
        summaryBoxes(doc, [
            ["Voids Detected", String(detectionCount(state)), [0,122,255]],
            ["Captured Photos", String(captures.length), [88,86,214]],
            ["Severity", sev.name, sev.color]
        ], P, y, CW);

        y += 34;
        sectionPDF(doc, "ENGINEERING RECOMMENDATION", P, y);
        y += 8;
        doc.setFillColor(255,255,255);
        doc.roundedRect(P, y, CW, 28, 3, 3, "F");
        doc.setDrawColor(226,232,240);
        doc.roundedRect(P, y, CW, 28, 3, 3, "S");
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(51,65,85);
        splitText(doc, sev.recommendation, P + 5, y + 9, CW - 10, 5);

        y += 40;
        sectionPDF(doc, `CAPTURED HONEYCOMB PHOTOS (${captures.length})`, P, y);
        y += 8;

        if (!captures.length) {
            doc.setTextColor(100,116,139);
            doc.setFontSize(9);
            doc.text("No photos captured during this inspection.", P, y + 6);
        } else {
            // Put the first photo large on page 1. Remaining photos start on new pages.
            const first = captures[0];
            drawPdfPhoto(doc, first, 0, P, y, CW, 102);
        }

        footer(doc);

        // Extra photo pages — large, one photo per page
        for (let i = 1; i < captures.length; i++) {
            doc.addPage();
            pageBg(doc);
            miniHeader(doc, `Captured Honeycomb Photo ${i + 1}`);
            drawPdfPhoto(doc, captures[i], i, P, 38, CW, 142);
            footer(doc);
        }

        // Method statement page
        doc.addPage();
        pageBg(doc);
        miniHeader(doc, "General Method Statement for Honeycomb Repair");
        sectionPDF(doc, "REPAIR METHOD STATEMENT", P, 42);
        let my = 54;
        REPAIR_METHOD.forEach((line, idx) => {
            doc.setFillColor(255,255,255);
            doc.roundedRect(P, my, CW, 24, 3, 3, "F");
            doc.setDrawColor(226,232,240);
            doc.roundedRect(P, my, CW, 24, 3, 3, "S");
            doc.setTextColor(0,122,255);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(8.5);
            doc.text(`${idx + 1}`, P + 5, my + 8);
            doc.setTextColor(51,65,85);
            doc.setFont("helvetica", "normal");
            splitText(doc, line, P + 14, my + 7, CW - 20, 4.5);
            my += 29;
        });
        doc.setTextColor(100,116,139);
        doc.setFontSize(8);
        doc.text("This method statement is general guidance only. Final repair method shall be confirmed by project specification, material supplier, and responsible engineer.", P, my + 8, { maxWidth: CW });
        footer(doc);

        doc.save(`honeycomb_report_${ts()}.pdf`);
    }

    function pageBg(doc) {
        doc.setFillColor(245,247,251);
        doc.rect(0,0,210,297,"F");
    }

    function header(doc, form) {
        doc.setFillColor(255,255,255);
        doc.roundedRect(12, 10, 186, 24, 4, 4, "F");
        doc.setDrawColor(226,232,240);
        doc.roundedRect(12, 10, 186, 24, 4, 4, "S");
        doc.setTextColor(15,23,42);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.text("AI Honeycomb Inspector", 18, 20);
        doc.setTextColor(100,116,139);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.text("Concrete Defect Inspection Report · YOLOv8 Web AR", 18, 27);
        doc.setTextColor(0,122,255);
        doc.setFont("helvetica", "bold");
        doc.text("REPORT", 186, 23, { align: "right" });
    }

    function miniHeader(doc, title) {
        doc.setFillColor(255,255,255);
        doc.roundedRect(12, 10, 186, 20, 4, 4, "F");
        doc.setDrawColor(226,232,240);
        doc.roundedRect(12, 10, 186, 20, 4, 4, "S");
        doc.setTextColor(15,23,42);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text(title, 18, 23);
    }

    function footer(doc) {
        doc.setDrawColor(203,213,225);
        doc.line(14, 282, 196, 282);
        doc.setTextColor(100,116,139);
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.text("AI Honeycomb Inspector · Professional Concrete Defect Report", 14, 287);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 196, 287, { align: "right" });
    }

    function sectionPDF(doc, title, x, y) {
        doc.setTextColor(0,122,255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.text(title, x, y);
        doc.setDrawColor(0,122,255);
        doc.setLineWidth(0.25);
        doc.line(x, y + 1.8, 196, y + 1.8);
    }

    function infoTable(doc, rows, x, y, w) {
        const rowH = 12;
        const colW = w / 2;
        rows.forEach((r, i) => {
            const yy = y + i * rowH;
            for (let c = 0; c < 2; c++) {
                const xx = x + c * colW;
                doc.setFillColor(255,255,255);
                doc.rect(xx, yy, colW, rowH, "F");
                doc.setDrawColor(226,232,240);
                doc.rect(xx, yy, colW, rowH, "S");
                doc.setFont("helvetica", "normal");
                doc.setFontSize(7);
                doc.setTextColor(100,116,139);
                doc.text(r[c*2], xx + 3, yy + 4.5);
                doc.setFont("helvetica", "bold");
                doc.setFontSize(8.2);
                doc.setTextColor(15,23,42);
                doc.text(String(r[c*2+1]), xx + 3, yy + 9.2, { maxWidth: colW - 6 });
            }
        });
    }

    function summaryBoxes(doc, items, x, y, w) {
        const gap = 4;
        const bw = (w - gap*2) / 3;
        items.forEach((it, i) => {
            const xx = x + i * (bw + gap);
            doc.setFillColor(255,255,255);
            doc.roundedRect(xx, y, bw, 22, 3, 3, "F");
            doc.setDrawColor(226,232,240);
            doc.roundedRect(xx, y, bw, 22, 3, 3, "S");
            doc.setTextColor(100,116,139);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(7);
            doc.text(it[0].toUpperCase(), xx + 4, y + 7);
            doc.setTextColor(...it[2]);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(12);
            doc.text(it[1], xx + 4, y + 16, { maxWidth: bw - 8 });
        });
    }

    function drawPdfPhoto(doc, cap, i, x, y, w, h) {
        doc.setFillColor(255,255,255);
        doc.roundedRect(x, y, w, h + 13, 4, 4, "F");
        doc.setDrawColor(226,232,240);
        doc.roundedRect(x, y, w, h + 13, 4, 4, "S");
        try {
            doc.addImage(cap.dataUrl, "JPEG", x + 4, y + 4, w - 8, h - 2);
        } catch(e) {
            doc.setFillColor(241,245,249);
            doc.rect(x + 4, y + 4, w - 8, h - 2, "F");
            doc.setTextColor(100,116,139);
            doc.setFontSize(8);
            doc.text("Image cannot be loaded", x + 8, y + h/2);
        }
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(15,23,42);
        doc.text(`Photo ${i + 1}`, x + 5, y + h + 8);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(100,116,139);
        doc.text(`${cap.ts} · ${cap.voids} voids`, x + 30, y + h + 8);
    }

    function splitText(doc, text, x, y, maxWidth, lineH) {
        const lines = doc.splitTextToSize(text, maxWidth);
        lines.forEach((line, idx) => doc.text(line, x, y + idx * lineH));
    }

    // Canvas helpers
    function sectionCanvas(ctx, text, x, y) {
        ctx.fillStyle = "#007aff";
        ctx.font = "bold 16px Arial";
        ctx.fillText(text, x, y);
        ctx.strokeStyle = "rgba(0,122,255,0.35)";
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x, y + 8); ctx.lineTo(x + 360, y + 8); ctx.stroke();
    }

    function pill(ctx, x, y, w, h, text, bg, color) {
        roundRectFill(ctx, x, y, w, h, h/2, bg);
        ctx.fillStyle = color; ctx.font = "bold 15px Arial"; ctx.textAlign = "center";
        ctx.fillText(text, x + w/2, y + h/2 + 5);
        ctx.textAlign = "left";
    }

    function shadow(ctx, color, ox, oy, blur) {
        ctx.shadowColor = color; ctx.shadowOffsetX = ox; ctx.shadowOffsetY = oy; ctx.shadowBlur = blur;
    }

    function rgbToCss(rgb) { return `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`; }

    function wrapCanvasText(ctx, text, maxWidth) {
        const words = text.split(" ");
        const lines = [];
        let line = "";
        words.forEach(word => {
            const test = line ? `${line} ${word}` : word;
            if (ctx.measureText(test).width > maxWidth && line) {
                lines.push(line); line = word;
            } else line = test;
        });
        if (line) lines.push(line);
        return lines;
    }

    function fitText(ctx, text, x, y, maxWidth) {
        let str = String(text);
        while (ctx.measureText(str).width > maxWidth && str.length > 4) str = str.slice(0, -2) + "…";
        ctx.fillText(str, x, y);
    }

    function drawImageCover(ctx, img, x, y, w, h) {
        const scale = Math.max(w / img.width, h / img.height);
        const sw = w / scale, sh = h / scale;
        const sx = (img.width - sw) / 2, sy = (img.height - sh) / 2;
        ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
    }

    function roundRectPath(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }

    function roundRectFill(ctx, x, y, w, h, r, color) {
        ctx.fillStyle = color;
        roundRectPath(ctx, x, y, w, h, r);
        ctx.fill();
    }

    function roundRectStroke(ctx, x, y, w, h, r, color = "#e2e8f0") {
        ctx.strokeStyle = color;
        roundRectPath(ctx, x, y, w, h, r);
        ctx.stroke();
    }

    return { exportPNG, exportPDF };

})();

(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const intFmt = new Intl.NumberFormat("id-ID");
  const dec1Fmt = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 });
  const dec2FixedFmt = new Intl.NumberFormat("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const city = { density: 4521, per10k: 1.5, coverage: 59.9 };

  const els = {
    mapFrame: $("#map-frame"),
    mapError: $("#map-error"),
    detail: $("#map-detail"),
    detailClose: $("#detail-close"),
    legendTitle: $("#legend-title"),
    legendRamp: $("#legend-ramp"),
    legendMin: $("#legend-min"),
    legendMax: $("#legend-max"),
    legendNote: $("#legend-note"),
    tableBody: $("#table-body"),
    tableFoot: $("#table-foot"),
    tableError: $("#table-error"),
    scatter: $("#scatter"),
    dotGrid: $("#dot-grid"),
    countValue: $("#count-value"),
    tabs: $$(".metric-tab"),
    faskesToggle: $("#toggle-faskes"),
    coverageToggle: $("#toggle-cakupan"),
    labelsToggle: $("#toggle-label")
  };

  const METRICS = {
    density: {
      label: "Kepadatan penduduk",
      colors: ["#f2e7d3", "#e9c4a4", "#d98c63", "#b34e2d", "#6f211a"],
      breaks: [1640, 3690.8, 5741.6, 7792.4, 9843.2, 11894],
      min: "1.640",
      max: "11.894",
      note: "jiwa/km² · makin gelap, makin tinggi",
      value: d => d.density,
      format: d => `${intFmt.format(d.density)} jiwa/km²`,
      short: d => intFmt.format(d.density)
    },
    per10k: {
      label: "Fasilitas per 10.000 penduduk",
      colors: ["#eef1e7", "#cfdccb", "#9fc1ae", "#60967f", "#245c4e"],
      breaks: [0.8, 1.2, 1.5, 1.8, 2.5, 3.7],
      min: "0,8",
      max: "3,7",
      note: "faskes/10.000 · makin gelap, makin tinggi",
      value: d => d.per10k,
      format: d => `${dec2FixedFmt.format(d.per10k)} faskes/10.000`,
      short: d => dec2FixedFmt.format(d.per10k)
    },
    coverage: {
      label: "Cakupan radius 1 km",
      colors: ["#eef1e6", "#cfdccb", "#9fc1ae", "#60967f", "#245c4e"],
      breaks: [0, 40, 55, 70, 85, 100],
      min: "0%",
      max: "100%",
      note: "persen luas kecamatan · makin gelap, makin tinggi",
      value: d => d.coverage,
      format: d => `${dec1Fmt.format(d.coverage)}% cakupan`,
      short: d => `${dec1Fmt.format(d.coverage)}%`
    }
  };

  let activeMetric = "density";
  let districts = [];
  let districtByName = {};
  let selectedLayer = null;
  let lastTrigger = null;
  let map = null;
  let districtLayer = null;
  let markerLayer = null;
  let coverageLayer = null;
  let labelOuter = null;
  let labelCentral = null;
  let scatterData = null;
  let chartTip = null;
  let lastChartWidth = 0;
  let sortKey = "density";
  let sortDir = -1;

  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ------------------------------------------------------------ data */
  async function loadData() {
    try {
      const responses = await Promise.all([
        fetch("data/kecamatan.geojson"),
        fetch("data/faskes.geojson"),
        fetch("data/cakupan.geojson")
      ]);
      if (responses.some(r => !r.ok)) throw new Error("HTTP " + responses.map(r => r.status).join(", "));
      const [kecamatan, faskes, cakupan] = await Promise.all(responses.map(r => r.json()));
      districts = kecamatan.features.map(f => f.properties);
      districtByName = Object.fromEntries(districts.map(d => [d.name, d]));
      return { kecamatan, faskes, cakupan };
    } catch (err) {
      console.error("Gagal memuat data:", err);
      showDataError();
      return null;
    }
  }

  function showDataError() {
    els.mapError.hidden = false;
    els.tableError.hidden = false;
    els.mapFrame.classList.remove("is-loading");
    if (els.scatter) {
      els.scatter.innerHTML = '<p class="load-error">Diagram gagal dimuat. Angka tersedia pada tabel dan unduhan data.</p>';
    }
  }

  /* ------------------------------------------------------------ formatting */
  function districtValue(d) {
    const m = METRICS[activeMetric];
    return m.format(d);
  }

  /* ------------------------------------------------------------ map */
  function initMap(data) {
    if (!window.L) {
      els.mapError.textContent = "Pustaka peta gagal dimuat. Angka tersedia di bagian Wilayah dan pada unduhan data.";
      els.mapError.hidden = false;
      els.mapFrame.classList.remove("is-loading");
      return;
    }
    const isMobile = window.matchMedia("(max-width: 980px)").matches;
    map = L.map("map", {
      zoomControl: false,
      attributionControl: false,
      zoomSnap: 0.25,
      zoomDelta: 0.5,
      wheelPxPerZoomLevel: 90,
      minZoom: 10,
      maxZoom: 17,
      preferCanvas: false,
      worldCopyJump: false
    });
    L.control.zoom({ position: "topright" }).addTo(map);
    L.control.attribution({ position: "bottomright", prefix: false }).addTo(map);

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      opacity: 0.9,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    districtLayer = L.geoJSON(data.kecamatan, {
      style: f => districtStyle(f.properties),
      onEachFeature: (feature, layer) => {
        bindDistrictLayer(feature.properties, layer);
      }
    }).addTo(map);

    const bounds = districtLayer.getBounds();
    map.fitBounds(bounds, { padding: [16, 16], maxZoom: isMobile ? 11.5 : 12 });
    map.setMaxBounds(bounds.pad(0.45));

    // district labels (the five central ones appear once zoomed in)
    map.createPane("labelsPane");
    map.getPane("labelsPane").style.zIndex = 640;
    map.getPane("labelsPane").style.pointerEvents = "none";
    const centralNames = new Set(["Semarang Tengah", "Semarang Utara", "Semarang Timur", "Semarang Selatan", "Candisari"]);
    labelOuter = L.layerGroup();
    labelCentral = L.layerGroup();
    districts.forEach(d => {
      const icon = L.divIcon({
        className: "district-label-wrap",
        html: `<span class="district-label">${esc(d.name)}</span>`,
        iconSize: [0, 0],
        iconAnchor: [0, 0]
      });
      const label = L.marker([d.cy, d.cx], { icon, interactive: false, keyboard: false, pane: "labelsPane" });
      (centralNames.has(d.name) ? labelCentral : labelOuter).addLayer(label);
    });
    function updateLabels() {
      if (!map) return;
      const on = els.labelsToggle.checked;
      if (on) {
        if (!map.hasLayer(labelOuter)) labelOuter.addTo(map);
        if (map.getZoom() >= 12.75) {
          if (!map.hasLayer(labelCentral)) labelCentral.addTo(map);
        } else if (map.hasLayer(labelCentral)) {
          map.removeLayer(labelCentral);
        }
      } else {
        if (map.hasLayer(labelOuter)) map.removeLayer(labelOuter);
        if (map.hasLayer(labelCentral)) map.removeLayer(labelCentral);
      }
    }
    updateLabels();
    map.on("zoomend", updateLabels);
    els.labelsToggle.addEventListener("change", updateLabels);

    // facilities
    markerLayer = L.layerGroup(data.faskes.features.map(f => {
      const p = f.properties;
      const [lon, lat] = f.geometry.coordinates;
      const isHospital = p.type === "Rumah sakit";
      const marker = L.circleMarker([lat, lon], {
        radius: isHospital ? 4.8 : 3.2,
        color: "#17150f",
        weight: isHospital ? 1.5 : 1.1,
        opacity: 0.92,
        fillColor: "#fffdf5",
        fillOpacity: 0.95
      });
      marker.bindTooltip(
        () => `<b>${esc(p.name)}</b><br><span class="tip-type">${esc(p.type)}${p.operator && p.operator !== "Tidak tercatat" ? ` · ${esc(p.operator)}` : ""}</span>${p.address ? `<span class="tip-addr">${esc(p.address)}</span>` : ""}`,
        { direction: "top", offset: [0, -4], className: "faskes-tip", opacity: 1, sticky: true }
      );
      marker.on("click", () => {
        if (p.kecamatan) selectDistrict(p.kecamatan, { focusPanel: false });
      });
      return marker;
    }));
    if (els.faskesToggle.checked) markerLayer.addTo(map);

    // coverage buffer
    coverageLayer = L.geoJSON(data.cakupan, {
      style: {
        color: "#fffdf5",
        weight: 1.1,
        opacity: 0.95,
        dashArray: "3 5",
        fillColor: "#fffdf5",
        fillOpacity: 0.1
      },
      interactive: false
    });
    if (els.coverageToggle.checked) coverageLayer.addTo(map);

    map.on("zoomend", () => {
      if (map.getZoom() < 11.4) closeTooltips();
    });

    // keep the map sized with its frame
    if (window.ResizeObserver) {
      const ro = new ResizeObserver(() => {
        if (map) map.invalidateSize();
      });
      ro.observe($(".map-canvas"));
    }
    setTimeout(() => map.invalidateSize(), 80);
    els.mapFrame.classList.remove("is-loading");
  }

  function baseStyle(d, metric = activeMetric) {
    const m = METRICS[metric];
    let color = m.colors[m.colors.length - 1];
    for (let i = 0; i < m.colors.length; i++) {
      if (m.value(d) <= m.breaks[i + 1]) { color = m.colors[i]; break; }
    }
    return {
      fillColor: color,
      fillOpacity: 0.86,
      color: "#a39176",
      weight: 0.8,
      opacity: 0.6,
      bubblingMouseEvents: false
    };
  }

  function districtStyle(d) {
    return baseStyle(d);
  }

  function selectedStyle(d) {
    return { ...baseStyle(d), color: "#17150f", weight: 2.2, opacity: 1, fillOpacity: 0.94 };
  }

  function hoverStyle(d) {
    return { ...baseStyle(d), color: "#17150f", weight: 1.6, opacity: 1, fillOpacity: 0.94 };
  }

  function bindDistrictLayer(d, layer) {
    layer.bindTooltip(() => `<b>${esc(d.name)}</b><br><span>${districtValue(d)}</span>`, {
      direction: "top",
      className: "district-tip",
      opacity: 1,
      sticky: true
    });
    layer.on("mouseover", () => {
      if (layer !== selectedLayer) layer.setStyle(hoverStyle(d));
    });
    layer.on("mouseout", () => {
      if (layer !== selectedLayer) layer.setStyle(baseStyle(d));
    });
    layer.on("click", () => selectDistrict(d.name, { trigger: null, focusPanel: false }));

    // The SVG path does not exist until the layer is added to the map.
    layer.on("add", () => {
      const path = layer._path;
      if (!path || path.dataset.bound) return;
      path.dataset.bound = "1";
      path.setAttribute("tabindex", "0");
      path.setAttribute("role", "button");
      path.setAttribute("aria-label", ariaForDistrict(d));
      path.addEventListener("focus", () => layer.openTooltip(layer.getBounds().getCenter()));
      path.addEventListener("blur", () => layer.closeTooltip());
      path.addEventListener("keydown", ev => {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          selectDistrict(d.name, { trigger: path, focusPanel: true });
        }
      });
    });
  }

  function ariaForDistrict(d) {
    return `${d.name}: ${METRICS[activeMetric].format(d)}. Pilih untuk melihat detail.`;
  }

  function setMetric(metric) {
    if (!METRICS[metric] || metric === activeMetric) return;
    activeMetric = metric;
    els.tabs.forEach(tab => {
      const on = tab.dataset.metric === metric;
      tab.classList.toggle("is-active", on);
      tab.setAttribute("aria-pressed", String(on));
    });
    updateLegend();
    closeTooltips();
    if (districtLayer) {
      districtLayer.eachLayer(layer => {
        const d = layer.feature.properties;
        layer.setStyle(layer === selectedLayer ? selectedStyle(d) : baseStyle(d));
        if (layer._path) layer._path.setAttribute("aria-label", ariaForDistrict(d));
      });
    }
  }

  function closeTooltips() {
    if (!map) return;
    map.eachLayer(layer => {
      if (layer.closeTooltip) layer.closeTooltip();
    });
  }

  function updateLegend() {
    const m = METRICS[activeMetric];
    els.legendTitle.textContent = m.label;
    els.legendRamp.innerHTML = m.colors.map(c => `<span style="background:${c}"></span>`).join("");
    els.legendMin.textContent = m.min;
    els.legendMax.textContent = m.max;
    els.legendNote.textContent = m.note;
  }

  /* ------------------------------------------------------------ selection */
  function selectDistrict(name, opts = {}) {
    const d = districtByName[name];
    if (!d) return;
    lastTrigger = opts.trigger || null;

    if (districtLayer) {
      districtLayer.eachLayer(layer => {
        if (layer.feature.properties.name === name) {
          layer.setStyle(selectedStyle(d));
          layer.bringToFront();
          if (layer._path) layer._path.setAttribute("aria-pressed", "true");
          selectedLayer = layer;
        } else {
          layer.setStyle(baseStyle(layer.feature.properties));
          if (layer._path) layer._path.removeAttribute("aria-pressed");
        }
      });
    }

    fillDetail(d);
    els.detail.hidden = false;
    els.mapFrame.classList.add("has-selection");
    closeTooltips();
    if (map) map.once("moveend", closeTooltips);

    if (map) {
      const frameRect = els.mapFrame.getBoundingClientRect();
      const needsScroll = frameRect.top < 0 || frameRect.bottom > window.innerHeight * 0.92;
      if (needsScroll) {
        els.mapFrame.scrollIntoView({ behavior: reduceMotion.matches ? "auto" : "smooth", block: "center" });
      }
      window.setTimeout(() => {
        if (!map) return;
        map.invalidateSize();
        const targetZoom = Math.max(map.getZoom(), 13);
        const phone = window.matchMedia("(max-width: 640px)").matches;
        const projected = map.project([d.cy, d.cx], targetZoom);
        const target = phone ? map.unproject(L.point(projected.x, projected.y + 85), targetZoom) : [d.cy, d.cx];
        map.flyTo(target, targetZoom, { duration: reduceMotion.matches ? 0 : 0.65 });
      }, needsScroll ? 380 : 30);
    }

    if (opts.focusPanel) {
      window.requestAnimationFrame(() => els.detailClose.focus({ preventScroll: true }));
    }
  }

  function fillDetail(d) {
    $("#detail-name").textContent = d.name;
    $("#d-density").textContent = intFmt.format(d.density);
    $("#d-pop").textContent = intFmt.format(d.pop);
    $("#d-faskes").textContent = intFmt.format(d.faskes);
    $("#d-ratio").textContent = dec2FixedFmt.format(d.per10k);
    $("#d-cov").textContent = `${dec1Fmt.format(d.coverage)}%`;
    $("#d-rs").textContent = intFmt.format(d.hospitals);
    const flag = $("#detail-flag");
    flag.hidden = !d.priority;
    $("#detail-breakdown").textContent = `${intFmt.format(d.faskes)} fasilitas: ${d.hospitals} rumah sakit, ${d.clinics} klinik, ${d.doctors} praktik dokter.`;
    let note = "";
    if (d.priority) note = "Kepadatan di atas rata-rata kota, rasio fasilitas di bawah rata-rata.";
    else if (d.coverage < 60) note = "Kurang dari 60% wilayah berada dalam radius 1 km fasilitas kesehatan.";
    else if (d.per10k >= 3) note = "Rasio fasilitas termasuk yang tertinggi di kota.";
    else note = "Rasio fasilitas di atas rata-rata kota.";
    $("#detail-note").textContent = note;
  }

  function closeDetail() {
    els.detail.hidden = true;
    els.mapFrame.classList.remove("has-selection");
    if (selectedLayer) {
      const d = selectedLayer.feature.properties;
      selectedLayer.setStyle(baseStyle(d));
      if (selectedLayer._path) selectedLayer._path.removeAttribute("aria-pressed");
      selectedLayer = null;
    }
    if (lastTrigger && typeof lastTrigger.focus === "function") {
      lastTrigger.focus({ preventScroll: true });
    }
    lastTrigger = null;
  }

  /* ------------------------------------------------------------ table */
  function renderTable() {
    const sorted = [...districts].sort((a, b) => {
      if (sortKey === "name") return sortDir * a.name.localeCompare(b.name, "id");
      return sortDir * (a[sortKey] - b[sortKey]);
    });

    els.tableBody.innerHTML = sorted.map(d => {
      const cov = Math.max(0, Math.min(100, d.coverage));
      return `<tr data-name="${esc(d.name)}"${d.priority ? ' class="is-priority"' : ""}>
        <td><button type="button" class="row-name" aria-label="Buka ${esc(d.name)} di peta">
          ${d.priority ? '<span class="row-dot" aria-hidden="true"></span><span class="sr-only">Prioritas. </span>' : '<span class="row-dot" aria-hidden="true" style="visibility:hidden"></span>'}
          ${esc(d.name)}<span class="row-arrow" aria-hidden="true">↗</span>
        </button></td>
        <td>${intFmt.format(d.pop)}</td>
        <td class="num-strong">${intFmt.format(d.density)}</td>
        <td>${intFmt.format(d.faskes)}</td>
        <td>${intFmt.format(d.hospitals)}</td>
        <td>${dec2FixedFmt.format(d.per10k)}</td>
        <td><span class="cov"><span class="cov-track" aria-hidden="true"><span class="cov-fill" style="width:${cov}%"></span></span>${dec1Fmt.format(d.coverage)}%</span></td>
      </tr>`;
    }).join("");

    const pop = districts.reduce((s, d) => s + d.pop, 0);
    const area = districts.reduce((s, d) => s + d.areaDataset, 0);
    const faskes = districts.reduce((s, d) => s + d.faskes, 0);
    const hospitals = districts.reduce((s, d) => s + d.hospitals, 0);
    const coverage = districts.reduce((s, d) => s + d.coverage / 100 * d.area, 0) / districts.reduce((s, d) => s + d.area, 0) * 100;
    els.tableFoot.innerHTML = `<tr>
      <td>Kota Semarang</td>
      <td>${intFmt.format(pop)}</td>
      <td>${intFmt.format(Math.round(pop / area))}</td>
      <td>${intFmt.format(faskes)}</td>
      <td>${intFmt.format(hospitals)}</td>
      <td>${dec2FixedFmt.format(faskes / pop * 10000)}</td>
      <td><span class="cov"><span class="cov-track" aria-hidden="true"><span class="cov-fill" style="width:${coverage}%"></span></span>${dec1Fmt.format(coverage)}%</span></td>
    </tr>`;

    updateSortAria();
  }

  function updateSortAria() {
    $$(".sort-btn").forEach(btn => {
      const th = btn.closest("th");
      if (th) th.removeAttribute("aria-sort");
      if (btn.dataset.sort === sortKey && th) th.setAttribute("aria-sort", sortDir === 1 ? "ascending" : "descending");
    });
  }

  function initTable() {
    renderTable();
    els.tableBody.addEventListener("click", ev => {
      const btn = ev.target.closest(".row-name");
      if (!btn) return;
      selectDistrict(btn.closest("tr").dataset.name, { trigger: btn, focusPanel: ev.detail === 0 });
    });
    $$(".sort-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const key = btn.dataset.sort;
        if (sortKey === key) sortDir *= -1;
        else {
          sortKey = key;
          sortDir = key === "name" ? 1 : -1;
        }
        renderTable();
      });
    });
  }

  /* ------------------------------------------------------------ scatter */
  const LABEL_POS = {
    "Semarang Tengah": [8, 3, "start"],
    "Semarang Selatan": [8, 3, "start"],
    "Gayamsari": [8, -6, "start"],
    "Candisari": [-8, 3, "end"],
    "Semarang Timur": [-7, 16, "end"],
    "Semarang Utara": [-7, 16, "end"],
    "Pedurungan": [-7, 16, "end"],
    "Genuk": [8, 3, "start"],
    "Tembalang": [-7, 14, "end"],
    "Tugu": [8, 3, "start"],
    "Mijen": [8, 3, "start"],
    "Gunungpati": [8, 3, "start"],
    "Ngaliyan": [8, 3, "start"],
    "Banyumanik": [-8, 3, "end"],
    "Semarang Barat": [8, 3, "start"],
    "Gajahmungkur": [0, -11, "middle"]
  };

  function initScatter() {
    chartTip = document.createElement("div");
    chartTip.className = "chart-tip";
    chartTip.hidden = true;
    chartTip.setAttribute("aria-hidden", "true");
    els.scatter.appendChild(chartTip);
    renderScatter();

    if (window.ResizeObserver) {
      const ro = new ResizeObserver(entries => {
        const w = Math.round(entries[0].contentRect.width);
        if (Math.abs(w - lastChartWidth) > 4) renderScatter();
      });
      ro.observe(els.scatter);
    } else {
      window.addEventListener("resize", () => renderScatter());
    }
  }

  function renderScatter() {
    if (!districts.length) return;
    const w = Math.max(280, els.scatter.clientWidth);
    const h = Math.max(320, els.scatter.clientHeight);
    lastChartWidth = w;
    const mobile = w < 620;
    const m = mobile ? { t: 22, r: 14, b: 48, l: 46 } : { t: 26, r: 26, b: 54, l: 60 };
    const iw = w - m.l - m.r;
    const ih = h - m.t - m.b;
    const xMax = 12500;
    const yMax = 4;
    const x = v => m.l + (v / xMax) * iw;
    const y = v => m.t + ih - (v / yMax) * ih;
    const avgX = x(city.density);
    const avgY = y(city.per10k);
    const popMax = Math.max(...districts.map(d => d.pop));
    const popMin = Math.min(...districts.map(d => d.pop));
    const r = p => 4 + Math.sqrt((p - popMin) / (popMax - popMin || 1)) * (mobile ? 5 : 6.5);

    const xTicks = [0, 4000, 8000, 12000];
    const yTicks = [0, 1, 2, 3, 4];
    const parts = [];
    parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" role="group" aria-label="Diagram sebaran 16 kecamatan: kepadatan penduduk dan fasilitas per 10.000 penduduk">`);

    // quadrant: high density, low ratio
    parts.push(`<rect class="quad" x="${avgX}" y="${avgY}" width="${Math.max(0, m.l + iw - avgX)}" height="${Math.max(0, m.t + ih - avgY)}"></rect>`);
    parts.push(`<text class="quad-label" x="${m.l + iw - 12}" y="${m.t + ih - 32}" text-anchor="end">PERLU PERHATIAN</text>`);
    if (!mobile) parts.push(`<text class="quad-sub" x="${m.l + iw - 12}" y="${m.t + ih - 16}" text-anchor="end">kepadatan di atas rata-rata · rasio faskes di bawah rata-rata</text>`);

    // grid + ticks
    parts.push('<g class="grid">');
    xTicks.forEach(v => { parts.push(`<line x1="${x(v)}" y1="${m.t}" x2="${x(v)}" y2="${m.t + ih}"></line>`); });
    yTicks.forEach(v => { parts.push(`<line x1="${m.l}" y1="${y(v)}" x2="${m.l + iw}" y2="${y(v)}"></line>`); });
    parts.push("</g>");

    // average lines
    parts.push(`<line class="avg-line" x1="${avgX}" y1="${m.t}" x2="${avgX}" y2="${m.t + ih}"></line>`);
    parts.push(`<line class="avg-line" x1="${m.l}" y1="${avgY}" x2="${m.l + iw}" y2="${avgY}"></line>`);
    parts.push(`<text class="avg-label" x="${avgX + 5}" y="${m.t + 11}">4.521</text>`);
    parts.push(`<text class="avg-label" x="${m.l + iw - 2}" y="${avgY - 5}" text-anchor="end">1,50</text>`);

    // axes
    parts.push('<g class="axis">');
    parts.push(`<line x1="${m.l}" y1="${m.t + ih}" x2="${m.l + iw}" y2="${m.t + ih}"></line>`);
    parts.push(`<line x1="${m.l}" y1="${m.t}" x2="${m.l}" y2="${m.t + ih}"></line>`);
    parts.push("</g>");
    xTicks.forEach(v => {
      parts.push(`<text class="tick-label" x="${x(v)}" y="${m.t + ih + 17}" text-anchor="middle">${intFmt.format(v)}</text>`);
    });
    yTicks.forEach(v => {
      parts.push(`<text class="tick-label" x="${m.l - 9}" y="${y(v) + 3.5}" text-anchor="end">${v}</text>`);
    });
    parts.push(`<text class="axis-title" x="${m.l + iw / 2}" y="${h - 10}" text-anchor="middle">Kepadatan penduduk (jiwa/km²)</text>`);
    parts.push(`<text class="axis-title" transform="translate(13 ${m.t + ih / 2}) rotate(-90)" text-anchor="middle">Fasilitas per 10.000 penduduk</text>`);

    // points
    const points = [...districts].sort((a, b) => (a.priority === b.priority ? b.pop - a.pop : a.priority ? 1 : -1));
    points.forEach(d => {
      const cx = x(d.density);
      const cy = y(d.per10k);
      const showLabel = w >= 900 && LABEL_POS[d.name];
      const label = LABEL_POS[d.name] || [0, 0, "start"];
      const aria = `${d.name}: kepadatan ${intFmt.format(d.density)} jiwa per kilometer persegi, ${dec2FixedFmt.format(d.per10k)} fasilitas per 10.000 penduduk, ${intFmt.format(d.faskes)} fasilitas, cakupan ${dec1Fmt.format(d.coverage)} persen. Buka di peta.`;
      parts.push(`<g class="point${d.priority ? " is-priority" : ""}" data-name="${esc(d.name)}" tabindex="0" role="button" aria-label="${esc(aria)}">`);
      parts.push(`<circle class="hit" cx="${cx}" cy="${cy}" r="${Math.max(16, r(d.pop) + 9).toFixed(1)}"></circle>`);
      parts.push(`<circle class="marker" cx="${cx}" cy="${cy}" r="${r(d.pop).toFixed(1)}"></circle>`);
      if (showLabel) {
        parts.push(`<text class="point-label${d.priority ? " is-priority" : ""}" x="${cx + label[0]}" y="${cy + label[1]}" text-anchor="${label[2]}">${esc(d.name)}</text>`);
      }
      parts.push("</g>");
    });
    parts.push("</svg>");
    const oldSvg = els.scatter.querySelector("svg");
    if (oldSvg) oldSvg.remove();
    els.scatter.insertAdjacentHTML("afterbegin", parts.join(""));
    const svg = els.scatter.querySelector("svg");
    if (!svg) return;

    $$(".point", svg).forEach(g => {
      const d = districtByName[g.dataset.name];
      if (!d) return;
      g.addEventListener("mouseenter", ev => showChartTip(d, ev.target));
      g.addEventListener("mousemove", ev => moveChartTip(ev));
      g.addEventListener("mouseleave", hideChartTip);
      g.addEventListener("focus", () => showChartTip(d, g.querySelector(".marker")));
      g.addEventListener("blur", hideChartTip);
      g.addEventListener("click", () => selectDistrict(d.name, { trigger: g, focusPanel: false }));
      g.addEventListener("keydown", ev => {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          selectDistrict(d.name, { trigger: g, focusPanel: true });
        }
      });
    });
  }

  function showChartTip(d, target) {
    if (!chartTip || !target) return;
    const box = els.scatter.getBoundingClientRect();
    const rect = target.getBoundingClientRect();
    chartTip.innerHTML = `<b>${esc(d.name)}</b><span>${intFmt.format(d.density)} jiwa/km² · ${dec2FixedFmt.format(d.per10k)} faskes/10.000</span><br><span>${intFmt.format(d.pop)} penduduk · ${dec1Fmt.format(d.coverage)}% cakupan</span>`;
    chartTip.style.left = `${rect.left + rect.width / 2 - box.left}px`;
    chartTip.style.top = `${Math.max(38, rect.top - box.top)}px`;
    chartTip.hidden = false;
  }

  function moveChartTip(ev) {
    if (!chartTip || chartTip.hidden) return;
    const box = els.scatter.getBoundingClientRect();
    chartTip.style.left = `${ev.clientX - box.left}px`;
  }

  function hideChartTip() {
    if (chartTip) chartTip.hidden = true;
  }

  /* ------------------------------------------------------------ moment */
  function initMoment() {
    const countEl = els.countValue;
    const grid = els.dotGrid;
    if (!countEl || !grid) return;

    const out = new Set(
      [...Array(100).keys()]
        .map(i => [i, (i * 0.6180339887) % 1])
        .sort((a, b) => a[1] - b[1])
        .slice(0, 29)
        .map(item => item[0])
    );
    let n = 0;
    grid.innerHTML = [...Array(100)].map((_, i) => {
      if (out.has(i)) return `<i class="is-out dot-anim" style="--i:${n++}"></i>`;
      return "<i></i>";
    }).join("");

    if (reduceMotion.matches) {
      countEl.textContent = "500";
      grid.classList.add("is-visible");
      return;
    }

    const observeTarget = $("#moment-title");
    if (!observeTarget || !("IntersectionObserver" in window)) {
      countEl.textContent = "500";
      grid.classList.add("is-visible");
      return;
    }

    let counted = false;
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        grid.classList.add("is-visible");
        if (!counted) {
          counted = true;
          animateCount(countEl, 0, 500, 1100);
        }
        io.unobserve(entry.target);
      });
    }, { threshold: 0.35 });
    io.observe(observeTarget);
  }

  function animateCount(el, from, to, duration) {
    const start = performance.now();
    const ease = t => 1 - Math.pow(1 - t, 3);
    function frame(now) {
      const p = Math.min(1, (now - start) / duration);
      el.textContent = String(Math.round(from + (to - from) * ease(p)));
      if (p < 1) window.requestAnimationFrame(frame);
    }
    window.requestAnimationFrame(frame);
  }

  /* ------------------------------------------------------------ nav */
  function initNav() {
    const sections = $$("main section[id]");
    const navLinks = $$(".nav-desk a[data-nav]");
    let current = "peta";
    let ticking = false;

    function update() {
      ticking = false;
      const mark = window.scrollY + 100;
      let active = sections[0] ? sections[0].id : "peta";
      sections.forEach(section => {
        if (section.offsetTop <= mark) active = section.id;
      });
      if (active === current) return;
      current = active;
      navLinks.forEach(link => {
        if (link.dataset.nav === active) link.setAttribute("aria-current", "location");
        else link.removeAttribute("aria-current");
      });
    }

    window.addEventListener("scroll", () => {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(update);
      }
    }, { passive: true });
    update();

    const mobileMenu = $(".mobile-menu");
    if (mobileMenu) {
      const menuText = $(".menu-text", mobileMenu);
      mobileMenu.addEventListener("toggle", () => {
        if (menuText) menuText.textContent = mobileMenu.open ? "Tutup" : "Menu";
      });
      $$("a", mobileMenu).forEach(a => a.addEventListener("click", () => { mobileMenu.open = false; }));
      document.addEventListener("click", ev => {
        if (mobileMenu.open && !mobileMenu.contains(ev.target)) mobileMenu.open = false;
      });
      document.addEventListener("keydown", ev => {
        if (ev.key === "Escape" && mobileMenu.open) mobileMenu.open = false;
      });
    }
  }

  /* ------------------------------------------------------------ boot */
  (async () => {
    updateLegend();
    initNav();
    initMoment();

    const data = await loadData();
    if (!data) return;

    initMap(data);
    initTable();
    initScatter();

    els.tabs.forEach(tab => tab.addEventListener("click", () => setMetric(tab.dataset.metric)));

    els.faskesToggle.addEventListener("change", ev => {
      if (!map || !markerLayer) return;
      if (ev.target.checked) markerLayer.addTo(map);
      else map.removeLayer(markerLayer);
    });
    els.coverageToggle.addEventListener("change", ev => {
      if (!map || !coverageLayer) return;
      if (ev.target.checked) coverageLayer.addTo(map);
      else map.removeLayer(coverageLayer);
    });

    els.detailClose.addEventListener("click", closeDetail);

    $$("[data-focus]").forEach(btn => {
      btn.addEventListener("click", () => selectDistrict(btn.dataset.focus, { trigger: btn, focusPanel: false }));
    });
  })();
})();

# GenOS: TopoSafe-RAG Dashboard Documentation

A minimal, monochromatic, read-only analytics and architectural decision dashboard for **GenOS: TopoSafe-RAG** (an AIOps system for OS telemetry failure diagnosis using Retrieval-Augmented Generation, conformal uncertainty gating, and a neuro-symbolic POSIX safety validator).

---

## 🏛️ 1. Architecture & Data Flow

The dashboard enforces complete separation between the computational data layer (`build_data.py`) and the static presentation layer (`index.html`, `app.js`, `styles.css`):

```
+-----------------------------------+        +-----------------------------------+
| Data/processed_events_analysis.csv|        | docs/ & novelSolns/ Specification |
| (1,746 events, 471 failures)      |        | (MCDA, Equations, Invariant Rules)|
+-----------------+-----------------+        +-----------------+-----------------+
                  |                                            |
                  +---------------------+----------------------+
                                        |
                                        v
                       +----------------------------------+
                       |       Frontend/build_data.py     |
                       |  (Aggregates, Bins, Cross-Tabs)  |
                       +----------------+-----------------+
                                        |
                                        v
                       +----------------------------------+
                       |         Frontend/data/*.json     |
                       | (overview, toporag, chronoos,    |
                       |  safeneuroos, toposaferag, mcda) |
                       +----------------+-----------------+
                                        |
                                        v
                       +----------------------------------+
                       |      Frontend Client View Layer  |
                       | (index.html, styles.css, app.js) |
                       |  Offline Chart.js (vendored)     |
                       +----------------------------------+
```

---

## 🚀 2. How to Run the Dashboard

The dashboard is completely self-contained, offline-compatible (no CDNs), and requires zero build steps or bundlers.

### Step 1: Generate or Update Data Artifacts
Make sure you have processed the telemetry or generated the JSON files:
```powershell
python Frontend/build_data.py
```
*Output will compile clean monochromatic JSON files to `Frontend/data/`.*

### Step 2: Launch the Local HTTP Server
Run Python's built-in HTTP server pointing to the `Frontend/` directory:
```powershell
python -m http.server 8000 --directory Frontend
```

### Step 3: View in Browser
Open your browser and navigate to:
```
http://localhost:8000
```

---

## 🎨 3. Design System & Accessibility Standards

- **Strictly Monochromatic**: Uses only neutral grayscale tones from `#0A0A0A` to `#FFFFFF`. No color accents are used for errors, warnings, or links.
- **Series Differentiation**: Uses grayscale shade steps, diagonal hatch patterns, dot patterns, line dashes, and explicit direct labels. Legible when printed in black and white.
- **Typography**: System font stack (`-apple-system`, `Segoe UI`, `Roboto`) for text; monospace stack with `font-variant-numeric: tabular-nums` for all figures and metrics.
- **Theme Modes**: Supports both Light Mode and Dark Mode via a toggle button, maintaining a contrast ratio &ge; 4.5:1 across both modes.
- **Accessibility & Transparency**: Every chart includes a **"View Data"** toggle revealing its underlying table, ARIA labels, and export buttons for PNG and CSV.

---

## 📊 4. Solution-to-Data Feasibility & Disclosures

| Novel Architecture | Implemented / Specified | Telemetry Grounding |
| :--- | :--- | :--- |
| **TopoRAG** | Implemented in `genos_rag.py` | Grounded by `process_id`, `trace_id`, `file`, `line`, `method`, `path`. (Parent PID is not logged in dataset). |
| **ChronoOS** | Implemented in `genos_rag.py` | Grounded by millisecond-resolution `timestamp` diffs (&Delta;t) and `duration_ms`. Rolling event rate functions as an empirical proxy for Hawkes &lambda;(t). |
| **StateRAG** | Specified in documentation | **Data Gap**: Hardware sensors (CPU, RAM, swap, I/O wait) are not measured in the dataset. Transparently rendered as a specification panel with `duration_ms` as an execution latency proxy. No simulated charts. |
| **SafeNeuroOS** | Implemented in `genos_rag.py` | Real conformal distances for all 471 failures (&tau; = 0.85). All test rows evaluated as `VERIFIED_SAFE` (0 malicious injection payloads in this benchmark). |
| **TopoSafe-RAG** | Unified Production Pipeline | Full real-world funnel: 1,746 stream events &rarr; 471 failures &rarr; 471 in-distribution &rarr; 471 safe remediations. |

---

## ➕ 5. How to Add a New Solution Section

To extend the dashboard with a new architecture:

1. **Extract & Export Metrics in `build_data.py`**:
   Compute the required aggregates and write `Frontend/data/new_solution.json`.
2. **Add Navigation Anchor in `index.html`**:
   Add a `<li><a href="#sec-newsolution" class="nav-link">...</a></li>` to the sidebar `<nav>`.
3. **Add Solution Section to `index.html`**:
   Follow the standard template:
   - Header with thesis and research gap badge
   - "Problem it solves"
   - "How it works" + equation box
   - KPI strip
   - Charts grid with "View Data" drawer and PNG download
   - "OS concepts demonstrated" & "Limitations / what the data cannot show" panels
4. **Wire Chart in `app.js`**:
   Fetch `data/new_solution.json` and initialize a Chart.js canvas using `getThemeTokens()`.

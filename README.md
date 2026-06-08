# ResearchLab

**A local, AI-powered research paper manager for scientists and researchers.**

ResearchLab is a desktop application that helps you collect scientific papers, organize them into research topics, analyze them with AI, visualize your literature base, discover connections, and generate structured research insights — all stored locally on your device.

---

## Features

- **Import papers** by DOI, PDF upload, or manual entry
- **AI analysis** — automatic summaries, key findings, tags, and paper type detection (Claude API)
- **Full paper management** — reading status, relevance ratings, tags with ratings, project profiles
- **Topics page** — explore research themes, find new external papers (OpenAlex/Crossref)
- **Analytics dashboard** — 7 interactive charts for your literature collection
- **AI Insights** — generate Topic Clustering, Contradiction Detection, Research Gaps, and more
- **Saved Insights** — persist and revisit AI analyses
- **Backup/Restore** — export with or without PDFs as ZIP archives
- **100% local** — no account, no cloud, no telemetry

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Desktop shell | Tauri 2 (Rust) |
| Frontend | React 18 + TypeScript |
| Styling | Tailwind CSS |
| Charts | Recharts |
| State | Zustand |
| Database | SQLite (rusqlite, bundled) |
| AI | Claude API (Anthropic) |
| Paper metadata | Crossref, OpenAlex |

---

## Prerequisites

### Windows / macOS

- [Node.js](https://nodejs.org/) 18 or later
- [Rust](https://rustup.rs/) (stable toolchain)
- Platform-specific Tauri dependencies:
  - **Windows**: [Build Tools for Visual Studio 2022](https://visualstudio.microsoft.com/visual-cpp-build-tools/) + WebView2 (bundled in Windows 10/11)
  - **macOS**: Xcode Command Line Tools (`xcode-select --install`)
  - **Linux**: See [Tauri Linux prerequisites](https://tauri.app/start/prerequisites/#linux)

---

## Installation

```bash
# 1. Clone the repository
git clone https://github.com/louisbhr/researchlab.git
cd researchlab

# 2. Install frontend dependencies
npm install

# 3. Start the development app
npm run tauri dev
```

The first run will compile the Rust backend, which may take a few minutes.

---

## Development (Windows)

```bash
# Install Rust
winget install Rustlang.Rust.GNU

# Install Node.js
winget install OpenJS.NodeJS

# Install Visual Studio Build Tools
# Download from: https://visualstudio.microsoft.com/visual-cpp-build-tools/

# Clone and run
git clone https://github.com/louisbhr/researchlab.git
cd researchlab
npm install
npm run tauri dev
```

---

## Development (macOS)

```bash
# Install Xcode CLI tools
xcode-select --install

# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Node.js (via Homebrew)
brew install node

# Clone and run
git clone https://github.com/louisbhr/researchlab.git
cd researchlab
npm install
npm run tauri dev
```

---

## Building a Production App

### Windows build (run on Windows)

```bash
npm run tauri build
```

Output: `src-tauri/target/release/bundle/msi/` (Windows installer)

### macOS build (run on macOS)

```bash
npm run tauri build
```

Output: `src-tauri/target/release/bundle/dmg/` (macOS disk image)

---

## Configuration

### Claude API Key

1. Open the app
2. Navigate to **Settings** (bottom-left sidebar)
3. Enter your [Anthropic API key](https://console.anthropic.com/)
4. Click **Save API Key**
5. Optionally click **Test Connection** to verify

The API key is stored locally in the app's SQLite database and is **never** included in backups or exports.

### Local Data Storage

All data is stored in your OS application data directory:

| OS | Path |
|----|------|
| Windows | `%LOCALAPPDATA%\ResearchLab\` |
| macOS | `~/Library/Application Support/ResearchLab/` |
| Linux | `~/.local/share/ResearchLab/` |

Structure:
```
ResearchLab/
├── database.sqlite      # All paper metadata, tags, projects, insights
├── pdfs/                # Stored PDF files
└── backups/             # Default backup output directory
```

---

## Usage Guide

### Importing Papers

**By DOI:**
1. Click **Add Paper** → **Import by DOI**
2. Enter the DOI (e.g., `10.1000/xyz123`)
3. Review the Import Preview — check for missing fields
4. Run AI Analysis (requires API key)
5. Confirm import

**By PDF:**
1. Click **Add Paper** → **Upload PDF**
2. Select your PDF file
3. Review extracted metadata, fill in missing fields
4. Run AI Analysis, then confirm

**Manual Entry:**
1. Click **Add Paper** → **Manual Entry**
2. Fill in title, authors, year, etc.
3. Optionally run AI Analysis, then save

### AI Features

AI features require a valid Claude API key in Settings.

- **Automatic analysis** runs after each paper import
- **AI Insights page** lets you generate cross-paper analyses:
  - Topic Clustering
  - Paper Comparison
  - Research Overview
  - Research Gaps
  - Contradiction Detection
  - Similar Papers

### Finding New Papers

On the **Topics** page:
1. Open a topic/tag
2. Click **Find New Papers for This Topic**
3. The app queries OpenAlex and Crossref for real papers
4. Review results and import any that interest you

### Backup & Restore

On the **Backup** page:
- **Backup without PDFs** — exports metadata only (small file)
- **Backup with PDFs** — exports everything including PDFs
- **Restore** — select a `.zip` backup file to restore

---

## Architecture

```
src/                    # React frontend
├── components/         # Reusable UI components
│   ├── import/         # Import dialog + workflow
│   ├── layout/         # Sidebar, ProjectBar
│   ├── paper/          # PaperDetailView
│   └── ui/             # Card, Button, Badge, etc.
├── pages/              # Library, Topics, Analytics, AIInsights, etc.
├── services/
│   ├── tauriApi.ts     # Tauri command wrappers
│   └── aiService.ts    # Claude API integration
├── store/
│   └── useAppStore.ts  # Zustand global state
└── types/
    └── index.ts        # All TypeScript types

src-tauri/src/          # Rust backend
├── commands/           # Tauri command handlers
│   ├── papers.rs       # CRUD operations
│   ├── import.rs       # DOI + PDF import
│   ├── tags.rs         # Tag management
│   ├── projects.rs     # Project profile management
│   ├── insights.rs     # Saved insights CRUD
│   ├── backup.rs       # Backup/restore commands
│   ├── analytics.rs    # Analytics queries
│   ├── recommendations.rs # External paper search
│   └── settings.rs     # Settings management
├── db/
│   ├── mod.rs          # DB path resolution
│   └── schema.rs       # SQLite schema + migrations
├── models/             # Rust structs matching TypeScript types
└── services/
    ├── doi_import.rs   # Crossref metadata fetching
    ├── duplicate_detection.rs # Fuzzy matching
    ├── backup.rs       # ZIP backup logic
    └── recommendations.rs # OpenAlex/Crossref search
```

---

## Test Checklist

- [ ] DOI import — fetches metadata and shows Import Review
- [ ] PDF upload — copies file and extracts metadata
- [ ] Manual entry — saves with all fields
- [ ] Import Preview — shows missing/uncertain fields
- [ ] Duplicate detection — warns on DOI or title match
- [ ] AI analysis — generates summary, findings, tags
- [ ] Tag saving — tags appear in library with ratings
- [ ] Project profile filtering — all pages filter correctly
- [ ] Reading status filtering — Library, Analytics
- [ ] Relevance filtering — min/max filter works
- [ ] Analytics charts — all 7 charts render with data
- [ ] Topic overview — shows papers per tag
- [ ] External paper recommendations — OpenAlex/Crossref returns results
- [ ] AI Insights — generates analysis for each type
- [ ] Saved insights — saves, reopens, notes editable
- [ ] Similar papers — shown in detail view
- [ ] Contradiction detection — AI identifies conflicts
- [ ] Backup without PDFs — creates valid ZIP
- [ ] Backup with PDFs — creates ZIP including PDF files
- [ ] Restore — overwrites library and reconnects PDFs
- [ ] Settings — API key saves and test passes

---

## License

MIT

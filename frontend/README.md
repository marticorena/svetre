# Pedigree App - Frontend

This is the frontend for the Horse Genealogy System. It is built with React, Vite, Apollo Client, and React Flow (with Dagre for automatic node positioning).

## Setup Instructions

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Start the Development Server**:
   ```bash
   npm run dev
   ```
   The application will start on `http://localhost:5174` (or whichever port Vite assigns, check the console output).

## Features
- **Interactive Graph**: Click "+ Parents" or "+ Children" on any horse node to dynamically fetch and expand its genealogy recursively.
- **Stable Layout**: The graph automatically recalculates logical positions cleanly using Dagre without inexplicably shuffling existing nodes in the graph view.

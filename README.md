# 251113_BrickWaller

251113_BrickWaller is an interactive Three.js tool for designing curved brick walls. A 2D path editor feeds a real-time instanced 3D scene, so you can sculpt the spline, tweak brick dimensions, and immediately see the staggered wall stack update across multiple rows.

## Features
- Editable Catmull–Rom path drawn via draggable nodes in the Path Designer curve panel.
- Instanced brick generation that aligns each brick to the curve tangent, staggers rows, and supports a center-based gap slider for mortar spacing.
- Full control panel (draggable + scrollable) with sliders for Length/Width/Height/Rows, Gap, Path Length, and Falloff plus a Flip Falloff toggle that swaps removal vs retention near the anchor.
- Ground-plane falloff anchor represented by an orange sphere that you can drag in the 3D view to shift where the wall thins out.
- Export buttons for downloading the wall as an OBJ mesh or capturing a PNG screenshot of the viewport.
- Dramatic multi-light setup (key, rim, bounce) with soft shadows, orbit controls, and responsive resizing for a polished preview.

## Getting Started
1. `npm install` – install dependencies (Vite, Three.js, etc.).
2. `npm run dev` – launch the Vite dev server and open the provided URL.
3. `npm run build` – create a production bundle (outputs to `dist/`).

## Controls
- **Mouse wheel** – zoom the 3D orbit camera in/out.
- **Left click drag on empty space** – orbit around the wall.
- **Right click drag** – pan the camera.
- **Curve panel drag handles** – reshape the spline path that bricks follow.
- **Sliders (Length/Width/Height/Rows/Gap/Path Length/Falloff)** – change brick dimensions, stack height, spacing, and the falloff profile; wall regenerates instantly.
- **Flip Falloff** – toggle between removing bricks near or far from the falloff anchor.
- **Drag orange sphere in canvas** – reposition the falloff origin along the path.
- **Mesh/Screenshot buttons** – export the current wall as OBJ or capture a PNG of the viewport.

## Deployment
- **Local production preview:** `npm install`, then `npm run build` followed by `npm run preview` to serve the compiled bundle.
- **Publish to GitHub Pages:** From `main`, run `npm run build`. Checkout `gh-pages`, copy everything from `dist/` into the branch root (replace existing files), commit, and `git push origin gh-pages`. Switch back to `main` afterwards.
- **Live demo:** https://ekimroyrp.github.io/251113_BrickWaller/

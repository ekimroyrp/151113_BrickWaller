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
Live demo: https://ekimroyrp.github.io/151113_BrickWaller/

To rebuild locally and push a new GitHub Pages deployment:

1. Make sure dependencies are installed (`npm install`).
2. Run `npm run build` to regenerate the production bundle in `dist/`.
3. `git checkout gh-pages`.
4. Replace the branch contents with the freshly built files (copy everything from `dist/` to the repo root, remove the old files).
5. Commit (`git commit -am "build: deploy for gh-pages"`) and push (`git push origin gh-pages`).
6. Switch back to `main` (`git checkout main`) once the deployment is done.

GitHub Pages is configured to serve directly from the `gh-pages` branch root, so pushing the updated static files will refresh the live demo.

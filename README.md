# 251113_BrickWaller

251113_BrickWaller is an interactive Three.js tool for designing curved brick walls. A 2D path editor feeds a real-time instanced 3D scene, so you can sculpt the spline, tweak brick dimensions, and immediately see the staggered wall stack update across multiple rows.

## Features
- Editable Catmull–Rom path drawn via draggable control points in a floating 2D panel.
- Instanced brick generation that aligns each brick’s center to the curve tangent and staggers every other row.
- Parameter sliders for brick length/width/height and total rows using `lil-gui`.
- Orbit-enabled 3D view with responsive resizing, lighting, and ground plane for context.

## Getting Started
1. `npm install` – install dependencies (Vite, Three.js, lil-gui, etc.).
2. `npm run dev` – launch the Vite dev server and open the provided URL.
3. `npm run build` – create a production bundle (outputs to `dist/`).

## Controls
- **Mouse wheel** – zoom the 3D orbit camera in/out.
- **Left click drag on empty space** – orbit around the wall.
- **Right click drag** – pan the camera.
- **Curve panel drag handles** – reshape the spline path that bricks follow.
- **Sliders (Length/Width/Height/Rows)** – change brick dimensions and stack height; wall regenerates instantly.

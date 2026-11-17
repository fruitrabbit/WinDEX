# WinDEX project website

Research website for **WinDEX: Metric 3D Hand Motion Reconstruction in the Wild for Dexterous Teleoperation and Policy Learning**.

Live website: https://fruitrabbit.github.io/WinDEX/

Static HTML, CSS, and JavaScript with self-hosted video and image assets. No build step or external CDN is required. Paper links open the [WinDEX arXiv page](https://arxiv.org/abs/2611.21143).

The dark visual theme follows CyberOrigin's near-black surfaces, green accents, and Space Grotesk / JetBrains Mono typography. Fonts are self-hosted with their licenses in `assets/fonts/`.

Gallery cards load lightweight six-second previews only when visible (two at a time on desktop, one on mobile). Full clips load on demand in the viewer. The full-length research film uses a smaller streaming encode; the original remains available for download.

## Local preview

Run `python3 -m http.server 8000 --bind 127.0.0.1` from this folder, then visit http://127.0.0.1:8000/.

## Contents

- Research film, raw egocentric capture videos, rendered world-frame hand motion, and robot demonstrations.
- 51 capture clips across 13 categories: 12 categories have four clips each; Farming has three.
- Eight reconstructed 3D scenes, four teleoperation demonstrations, and five policy rollout clips.
- Fonts and music attribution are included beside the corresponding assets.

Publication access is configured in GitHub repository and Pages settings. A private repository alone does not make a Pages site private.

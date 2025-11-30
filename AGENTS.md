# AI Agent Codebase Guide

## Project Overview
This is a static portfolio website built with **HTML**, **SCSS**, and **Vanilla JavaScript**, bundled via **Webpack**. It features a "Cyber/Hacker" green-on-black aesthetic with smooth animations and full mobile responsiveness.

## 🛠 Tech Stack & Build System
*   **Runtime:** Node.js (Webpack)
*   **Styling:** SCSS (Sass) with CSS variables
*   **Scripts:** Modular ES6+ JavaScript
*   **Build Command:** `npm run build` (Outputs to `dist/`)
*   **Dev Server:** `npm start` (Webpack Dev Server)
*   **LAN Testing:** `npm start -- --host 0.0.0.0 --port 8081`

## 📂 Directory Structure
```
src/
├── index.html          # Main markup - all content lives here
├── script/
│   ├── index.js        # Entry point
│   └── comps/
│       ├── slider.js   # Section navigation (About/Resume/Skills)
│       ├── typing.js   # Terminal typing animation
│       ├── loader.js   # Page loader
│       └── zoom.js     # Image zoom (desktop)
├── style/
│   ├── style.scss      # Main styles + media queries
│   ├── index.scss      # SCSS entry point
│   ├── base/
│   │   ├── vars.scss   # Colors, fonts, shadows (CRITICAL)
│   │   ├── btn.scss    # Button styles
│   │   └── animations.scss
│   └── comps/
│       ├── slider.scss
│       ├── loader.scss
│       └── zoom.scss
└── assets/
    ├── images/
    │   ├── profile_v4.webp   # Main profile image (WebP, optimized)
    │   ├── profile_v4.png    # Fallback for older browsers
    │   ├── favicon/
    │   ├── particles/
    │   ├── shapes/
    │   └── social/
    └── fonts/
```

## 🎨 Theme Colors (vars.scss)
*   `$text-main: #00ff41` - Primary green (headings)
*   `$text-secondary: #008f11` - Darker green
*   `$text-body: #e0e0e0` - White/light gray for body text
*   `$page-background: #000000` - Black background
*   `$accent-color: #00ff41` - Accent/highlight
*   `$content-background: #0a0a0a` - Card background

## 📱 Mobile Implementation

### Slide Navigation (slider.js)
*   Mobile uses CSS class-based visibility (`active-slide`) instead of scroll
*   Profile picture appears only on About section after content animation completes
*   Transitions use `opacity`, `visibility`, and `transform` for smooth effects

### Key Mobile Breakpoints
*   `@media (max-width: 768px)` - Tablet adjustments
*   `@media (max-width: 500px)` - Full mobile overhaul

### Mobile-Specific Patterns
*   Nav items have tap feedback (`:active` states)
*   Slides animate with `translateY(10px)` slide-up effect
*   All fonts use fixed `px` values (not `vw`)

## 🧩 Component Guide

### Skills Section
Uses a custom grid layout with certification badges:
```html
<div class="skills-section">
    <div class="skills-certifications">...</div>
    <div class="skills-grid">
        <div class="skill-category">...</div>
    </div>
</div>
```

### Resume Section
```html
<div class="resume-item">
    <div class="item-titles">
        <strong class="item-date">...</strong>
        <strong class="item-company">...</strong>
    </div>
    <div class="item-info">
        <h5 class="item-job-title">...</h5>
        <ul class="item-job-desc">...</ul>
    </div>
</div>
```

## ⚠️ Common Pitfalls
1. **Don't use setTimeout to force slides** - Causes rubber-banding on mobile
2. **Always use `cubic-bezier(0.4, 0, 0.2, 1)`** for smooth transitions
3. **Mobile profile picture** - Controlled by `contentAnimationComplete` flag
4. **Webpack assets** - Images must be imported or referenced correctly
5. **Image optimization** - Use WebP with PNG fallback, resize images before adding

## 🖼️ Profile Picture Animations (animations.scss)
*   `profileFloat` - Gentle 5px up/down floating motion (6s cycle)
*   `profileGlow` / `profileGlowMobile` - Subtle white glow pulse (4s cycle)
*   Desktop uses `::before` pseudo-element for full filter control
*   Mobile uses `.profile-picture-mobile` with `<picture>` element for WebP

## ✅ Recent Updates (Nov 2025)
*   Full mobile responsiveness overhaul
*   Skills section redesigned with certification badges
*   Smooth slide transitions with transform animations
*   Nav items have underline animation on desktop, tap feedback on mobile
*   Button styling updated to match green theme
*   Profile picture with float + subtle white glow animations
*   Image optimization: WebP format, resized assets (14MB → 84KB profile)
*   Accessibility improvements: ARIA labels, semantic buttons, lang attribute
*   Mobile loader now fullscreen (removed margin/border-radius gap)

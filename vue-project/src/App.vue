<!--
  App.vue
  Root component that handles global layout and theme variables.
  This component is responsible for:
  - Providing the base layout structure
  - Defining global CSS variables for theming
  - Managing viewport consistency
-->
<template>
  <router-view></router-view>
</template>

<style>
/* ===== Theme Variables ===== */
:root {
  /* Layout */
  --header-height: 60px;
  --max-content-width: 1200px;
  --border-radius-sm: 4px;
  --border-radius-md: 8px;
  --border-radius-lg: 12px;
  
  /* Spacing */
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;
}

/* ===== Reset Styles ===== */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

/* ===== Base Styles ===== */
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
    Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  background-color: var(--main-bg);
  color: var(--text-primary);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* ===== Layout Styles ===== */
#app {
  min-height: 100vh;
  width: 100%;
}

/* ===== Utility Classes ===== */
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* ===== Responsive Breakpoints ===== */
@media (max-width: 768px) {
  :root {
    --max-content-width: 100%;
    --spacing-lg: 1rem;
    --spacing-xl: 1.5rem;
  }
}

@media (min-width: 769px) and (max-width: 1024px) {
  :root {
    --max-content-width: 90%;
  }
}

/* Always keep login page light */
body.login-page {
  background-color: white !important;
}

body.login-page #app {
  background-color: white !important;
}

/* Regular theme handling for other pages */
body:not(.login-page) {
  background-color: var(--main-bg);
}

body:not(.login-page) #app {
  background-color: var(--main-bg);
}
</style>

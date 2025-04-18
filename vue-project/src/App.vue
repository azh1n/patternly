<template>
  <router-view></router-view>
</template>

<style>
:root {
  --header-height: 60px;
  --max-content-width: 1200px;
  --header-bg: #1a1a1a;
  --main-bg: #121212;
  --text-primary: #ffffff;
  --text-secondary: #888888;
  --accent-color: #4CAF50;
  --border-color: #333333;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
    Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  background-color: var(--main-bg);
  color: var(--text-primary);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.header h1 {
  font-size: 2rem;
  background: linear-gradient(45deg, #3b82f6, #06b6d4);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  margin: 0;
  transition: all 0.2s ease;
}

.header h1.clickable {
  cursor: pointer;
}

.header h1.clickable:hover {
  text-decoration: underline;
  text-decoration-thickness: 2px;
  text-underline-offset: 4px;
  text-decoration-color: var(--accent-color);
}
</style>

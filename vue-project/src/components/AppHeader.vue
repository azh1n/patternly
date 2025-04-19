<!--
  AppHeader.vue
  Main application header component with navigation and user controls.
  
  Features:
  - Application logo and title
  - Navigation menu
  - User profile controls
  - Responsive design
  - Theme toggle
  - Keyboard navigation
  - Dropdown menu
-->
<template>
  <header class="app-header" role="banner">
    <!-- Logo Section -->
    <div class="logo-section">
      <router-link 
        to="/" 
        class="logo-link" 
        aria-label="Go to home page"
        @keydown.enter="handleLogoClick"
      >
        <span class="logo-text">Patternly</span>
      </router-link>
    </div>

    <!-- Navigation -->
    <nav class="main-nav" role="navigation" aria-label="Main navigation">
      <ul class="nav-list">
        <li class="nav-item">
          <router-link 
            to="/" 
            class="nav-link"
            :class="{ active: $route.path === '/' }"
            aria-current="page"
            @keydown.enter="handleNavClick"
          >
            <font-awesome-icon icon="home" class="nav-icon" aria-hidden="true" />
            <span class="nav-text">Home</span>
          </router-link>
        </li>
        <li class="nav-item">
          <router-link 
            to="/profile" 
            class="nav-link"
            :class="{ active: $route.path === '/profile' }"
            aria-current="page"
            @keydown.enter="handleNavClick"
          >
            <font-awesome-icon icon="user" class="nav-icon" aria-hidden="true" />
            <span class="nav-text">Profile</span>
          </router-link>
        </li>
      </ul>
    </nav>

    <!-- User Controls -->
    <div class="user-controls">
      <!-- Theme Toggle -->
      <button 
        @click="toggleTheme" 
        class="theme-toggle"
        :aria-label="isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'"
        @keydown.enter="handleThemeToggle"
      >
        <font-awesome-icon 
          :icon="isDarkMode ? 'sun' : 'moon'" 
          class="theme-icon"
          aria-hidden="true"
        />
      </button>

      <!-- User Menu -->
      <div class="user-menu" v-if="user">
        <button 
          @click="toggleUserMenu" 
          class="user-button"
          :aria-expanded="isUserMenuOpen"
          aria-label="User menu"
          @keydown.enter="handleUserMenuToggle"
          @keydown.escape="closeUserMenu"
        >
          <font-awesome-icon icon="user-circle" class="user-icon" aria-hidden="true" />
          <span class="user-name">{{ user.displayName || 'User' }}</span>
        </button>

        <!-- Dropdown Menu -->
        <div 
          v-if="isUserMenuOpen" 
          class="dropdown-menu"
          role="menu"
          @keydown.escape="closeUserMenu"
        >
          <button 
            @click="handleLogout" 
            class="dropdown-item"
            role="menuitem"
            @keydown.enter="handleLogout"
          >
            <font-awesome-icon icon="sign-out-alt" class="dropdown-icon" aria-hidden="true" />
            <span class="dropdown-text">Logout</span>
          </button>
        </div>
      </div>

      <!-- Login Button -->
      <router-link 
        v-else 
        to="/login" 
        class="login-button"
        aria-label="Login to your account"
        @keydown.enter="handleLoginClick"
      >
        <font-awesome-icon icon="sign-in-alt" class="login-icon" aria-hidden="true" />
        <span class="login-text">Login</span>
      </router-link>
    </div>
  </header>
</template>

<script setup>
/**
 * Imports
 */
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useAuth } from '../composables/useAuth'
import { useTheme } from '../composables/useTheme'

/**
 * Auth and Theme Setup
 */
const { user, logout } = useAuth()
const { isDarkMode, toggleTheme } = useTheme()

/**
 * State
 */
const isUserMenuOpen = ref(false)

/**
 * Methods
 */

/**
 * Toggles the user menu dropdown
 */
const toggleUserMenu = () => {
  isUserMenuOpen.value = !isUserMenuOpen.value
}

/**
 * Closes the user menu
 */
const closeUserMenu = () => {
  isUserMenuOpen.value = false
}

/**
 * Handles user logout
 */
const handleLogout = async () => {
  try {
    await logout()
    closeUserMenu()
  } catch (error) {
    console.error('Error logging out:', error)
  }
}

/**
 * Handles click outside the user menu
 */
const handleClickOutside = (event) => {
  const userMenu = document.querySelector('.user-menu')
  if (userMenu && !userMenu.contains(event.target)) {
    closeUserMenu()
  }
}

/**
 * Event Handlers
 */
const handleLogoClick = (event) => {
  event.preventDefault()
  // Additional logo click handling if needed
}

const handleNavClick = (event) => {
  event.preventDefault()
  // Additional navigation click handling if needed
}

const handleThemeToggle = (event) => {
  event.preventDefault()
  toggleTheme()
}

const handleUserMenuToggle = (event) => {
  event.preventDefault()
  toggleUserMenu()
}

const handleLoginClick = (event) => {
  event.preventDefault()
  // Additional login click handling if needed
}

/**
 * Lifecycle Hooks
 */
onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
/* ===== Layout Styles ===== */
.app-header {
  width: 100%;
  height: var(--header-height);
  padding: 0 var(--spacing-xl);
  background-color: var(--header-bg);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
}

/* ===== Logo Styles ===== */
.logo-section {
  display: flex;
  align-items: center;
}

.logo-link {
  text-decoration: none;
  color: var(--text-primary);
  font-size: 1.5rem;
  font-weight: 600;
  transition: color 0.2s ease;
  outline: none;
}

.logo-link:hover,
.logo-link:focus {
  color: var(--accent-color);
}

/* ===== Navigation Styles ===== */
.main-nav {
  flex: 1;
  margin: 0 var(--spacing-xl);
}

.nav-list {
  display: flex;
  gap: var(--spacing-lg);
  list-style: none;
  margin: 0;
  padding: 0;
}

.nav-item {
  margin: 0;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  color: var(--text-secondary);
  text-decoration: none;
  border-radius: var(--border-radius-md);
  transition: all 0.2s ease;
  outline: none;
}

.nav-link:hover,
.nav-link:focus {
  color: var(--text-primary);
  background-color: var(--hover-bg);
}

.nav-link.active {
  color: var(--accent-color);
  background-color: var(--accent-bg);
}

.nav-icon {
  font-size: 1.1rem;
}

.nav-text {
  font-size: 0.9rem;
  font-weight: 500;
}

/* ===== User Controls Styles ===== */
.user-controls {
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
}

/* Theme Toggle */
.theme-toggle {
  padding: var(--spacing-sm);
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
  outline: none;
}

.theme-toggle:hover,
.theme-toggle:focus {
  color: var(--text-primary);
  transform: scale(1.1);
}

.theme-icon {
  font-size: 1.2rem;
}

/* User Menu */
.user-menu {
  position: relative;
}

.user-button {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  background: transparent;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-lg);
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.2s ease;
  outline: none;
}

.user-button:hover,
.user-button:focus {
  background-color: var(--hover-bg);
  border-color: var(--accent-color);
}

.user-icon {
  font-size: 1.5rem;
}

.user-name {
  font-size: 0.9rem;
  font-weight: 500;
}

/* Dropdown Menu */
.dropdown-menu {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: var(--spacing-sm);
  background-color: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-lg);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  min-width: 200px;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  width: 100%;
  padding: var(--spacing-md);
  background: transparent;
  border: none;
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.2s ease;
  outline: none;
}

.dropdown-item:hover,
.dropdown-item:focus {
  background-color: var(--hover-bg);
  color: var(--accent-color);
}

.dropdown-icon {
  font-size: 1.1rem;
}

.dropdown-text {
  font-size: 0.9rem;
  font-weight: 500;
}

/* Login Button */
.login-button {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  background-color: var(--accent-color);
  border: none;
  border-radius: var(--border-radius-lg);
  color: white;
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.2s ease;
  outline: none;
}

.login-button:hover,
.login-button:focus {
  background-color: var(--accent-hover);
  transform: translateY(-1px);
}

.login-icon {
  font-size: 1.1rem;
}

.login-text {
  font-size: 0.9rem;
  font-weight: 500;
}

/* ===== Responsive Styles ===== */
@media (max-width: 768px) {
  .app-header {
    padding: 0 var(--spacing-md);
  }

  .main-nav {
    margin: 0 var(--spacing-md);
  }

  .nav-text,
  .user-name,
  .login-text {
    display: none;
  }

  .nav-icon,
  .login-icon {
    font-size: 1.3rem;
  }
}
</style> 
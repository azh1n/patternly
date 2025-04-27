<!-- User profile page component for managing account settings -->
<template>
  <!-- Main profile container with side navigation -->
  <div class="app-layout">
    <SideNavigation v-model:expanded="sidebarExpanded" />
    
    <div class="main-container" :class="{ 'sidebar-expanded': sidebarExpanded }">
      <!-- Mobile header with menu button -->
      <div class="mobile-header">
        <button class="menu-btn" @click="toggleSidebar">
          <font-awesome-icon icon="bars" />
        </button>
        <h1 class="mobile-title">Patternly</h1>
        <div class="spacer"></div>
      </div>
    
      <!-- Profile content wrapper -->
      <div class="profile-content">
        <div class="profile-header">
          <h1>Your Profile</h1>
          <p>Manage your account and preferences</p>
        </div>

        <div class="profile-grid">
          <!-- Profile details card -->
          <div class="profile-card">
            <div class="card-header">
              <font-awesome-icon icon="user" class="card-icon" />
              <h2>Account Information</h2>
            </div>
            
            <!-- Loading state indicator -->
            <div v-if="loading" class="loading-spinner">
              <font-awesome-icon icon="circle-notch" spin />
              <span>Loading...</span>
            </div>
            
            <!-- Profile settings form -->
            <form v-else @submit.prevent="handleSubmit" class="profile-form">
              <!-- Profile picture section -->
              <div class="profile-picture-section">
                <div class="profile-avatar" :style="avatarStyle">
                  <span v-if="!user?.photoURL">{{ userInitials }}</span>
                </div>
                <button type="button" class="upload-photo-btn">
                  <font-awesome-icon icon="camera" />
                  Change Photo
                </button>
              </div>

              <!-- Display name input group -->
              <div class="form-group">
                <label for="displayName">
                  <font-awesome-icon icon="user-circle" class="field-icon" />
                  Display Name
                </label>
                <input
                  id="displayName"
                  v-model="form.displayName"
                  type="text"
                  :placeholder="user?.displayName || 'Enter display name'"
                >
              </div>
              
              <!-- Email display (read-only) -->
              <div class="form-group">
                <label for="email">
                  <font-awesome-icon icon="envelope" class="field-icon" />
                  Email
                </label>
                <input
                  id="email"
                  :value="user?.email"
                  type="email"
                  disabled
                >
                <div class="verified-badge" v-if="user?.emailVerified">
                  <font-awesome-icon icon="check-circle" />
                  Verified
                </div>
              </div>
              
              <!-- Account information summary -->
              <div class="account-info">
                <div class="info-item">
                  <span class="info-label">Member since</span>
                  <span class="info-value">{{ formatDate(user?.metadata?.creationTime) }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Last login</span>
                  <span class="info-value">{{ formatDate(user?.metadata?.lastSignInTime) }}</span>
                </div>
              </div>
              
              <!-- Action buttons group for account -->
              <div class="button-group">
                <!-- Save changes button -->
                <button 
                  type="submit" 
                  class="primary-button"
                  :disabled="isSubmitting"
                >
                  <font-awesome-icon icon="save" />
                  {{ isSubmitting ? 'Saving...' : 'Save Changes' }}
                </button>
              </div>
            </form>
          </div>

          <!-- Security card -->
          <div class="profile-card">
            <div class="card-header">
              <font-awesome-icon icon="shield-alt" class="card-icon" />
              <h2>Security</h2>
            </div>
            
            <form @submit.prevent="handlePasswordUpdate" class="profile-form">
              <!-- New password input group -->
              <div class="form-group">
                <label for="newPassword">
                  <font-awesome-icon icon="lock" class="field-icon" />
                  New Password
                </label>
                <div class="password-input-wrapper">
                  <input
                    id="newPassword"
                    v-model="form.newPassword"
                    :type="showPassword ? 'text' : 'password'"
                    placeholder="Enter new password"
                  >
                  <button 
                    type="button" 
                    class="toggle-password" 
                    @click="togglePasswordVisibility"
                  >
                    <font-awesome-icon :icon="showPassword ? 'eye-slash' : 'eye'" />
                  </button>
                </div>
              </div>
              
              <!-- Password confirmation input -->
              <div class="form-group">
                <label for="confirmPassword">
                  <font-awesome-icon icon="lock" class="field-icon" />
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  v-model="form.confirmPassword"
                  type="password"
                  placeholder="Confirm new password"
                >
              </div>

              <!-- Password strength meter -->
              <div class="password-strength" v-if="form.newPassword">
                <div class="strength-label">Password strength: <span :class="strengthClass">{{ strengthText }}</span></div>
                <div class="strength-meter">
                  <div class="strength-progress" :style="{ width: strengthPercentage, backgroundColor: strengthColor }"></div>
                </div>
                <ul class="password-requirements">
                  <li v-for="(met, req) in passwordRequirements" :key="req" :class="{ met }">
                    <font-awesome-icon :icon="met ? 'check' : 'times'" />
                    {{ req }}
                  </li>
                </ul>
              </div>
              
              <!-- Password update button -->
              <div class="button-group">
                <button 
                  type="submit" 
                  class="primary-button"
                  :disabled="isSubmitting || !canUpdatePassword"
                >
                  <font-awesome-icon icon="key" />
                  Update Password
                </button>
              </div>
            </form>
          </div>

          <!-- Preferences card -->
          <div class="profile-card">
            <div class="card-header">
              <font-awesome-icon icon="sliders-h" class="card-icon" />
              <h2>Preferences</h2>
            </div>
            
            <div class="preferences-list">
              <!-- Theme toggle section -->
              <div class="preference-item">
                <div class="preference-info">
                  <font-awesome-icon :icon="isDarkMode ? 'moon' : 'sun'" class="preference-icon" />
                  <div class="preference-details">
                    <h3>Theme</h3>
                    <p>Switch between light and dark mode</p>
                  </div>
                </div>
                <button 
                  type="button"
                  class="theme-toggle-button"
                  @click="toggleTheme"
                >
                  <div class="toggle-switch">
                    <div class="toggle-slider" :class="{ 'active': isDarkMode }"></div>
                  </div>
                  <span>{{ isDarkMode ? 'Dark' : 'Light' }}</span>
                </button>
              </div>
              
              <!-- Experimental features toggle -->
              <div class="preference-item">
                <div class="preference-info">
                  <font-awesome-icon icon="flask" class="preference-icon" />
                  <div class="preference-details">
                    <h3>Experimental Features</h3>
                    <p>Get early access to new features</p>
                  </div>
                </div>
                <button 
                  type="button"
                  class="theme-toggle-button"
                  @click="toggleExperimentalFeatures"
                >
                  <div class="toggle-switch">
                    <div class="toggle-slider" :class="{ 'active': experimentalFeatures }"></div>
                  </div>
                  <span>{{ experimentalFeatures ? 'On' : 'Off' }}</span>
                </button>
              </div>

              <!-- Notification preferences -->
              <div class="preference-item">
                <div class="preference-info">
                  <font-awesome-icon icon="bell" class="preference-icon" />
                  <div class="preference-details">
                    <h3>Notifications</h3>
                    <p>Manage your notification preferences</p>
                  </div>
                </div>
                <button 
                  type="button"
                  class="theme-toggle-button"
                  @click="toggleNotifications"
                >
                  <div class="toggle-switch">
                    <div class="toggle-slider" :class="{ 'active': notificationsEnabled }"></div>
                  </div>
                  <span>{{ notificationsEnabled ? 'On' : 'Off' }}</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Account actions card -->
          <div class="profile-card account-actions-card">
            <div class="card-header">
              <font-awesome-icon icon="cog" class="card-icon" />
              <h2>Account Actions</h2>
            </div>
            
            <div class="account-actions">
              <button class="action-button" @click="exportData">
                <font-awesome-icon icon="download" class="action-icon" />
                <div class="action-details">
                  <h3>Export Your Data</h3>
                  <p>Download a copy of your personal data</p>
                </div>
              </button>
              
              <button class="action-button" @click="handleLogout">
                <font-awesome-icon icon="sign-out-alt" class="action-icon" />
                <div class="action-details">
                  <h3>Logout</h3>
                  <p>Sign out of your account</p>
                </div>
              </button>
              
              <button class="action-button danger" @click="confirmDeleteAccount">
                <font-awesome-icon icon="trash-alt" class="action-icon" />
                <div class="action-details">
                  <h3>Delete Account</h3>
                  <p>Permanently delete your account and data</p>
                </div>
              </button>
            </div>
          </div>
        </div>

        <!-- Status messages -->
        <div v-if="error" class="status-message error-message">
          <font-awesome-icon icon="exclamation-circle" />
          {{ error }}
        </div>
        
        <div v-if="success" class="status-message success-message">
          <font-awesome-icon icon="check-circle" />
          {{ success }}
        </div>
        
        <!-- Delete account confirmation modal -->
        <div v-if="showDeleteModal" class="modal-overlay">
          <div class="modal-content">
            <div class="modal-header">
              <font-awesome-icon icon="exclamation-triangle" class="modal-icon warning" />
              <h2>Delete Account</h2>
            </div>
            <div class="modal-body">
              <p>This action <strong>cannot be undone</strong>. Are you sure you want to permanently delete your account and all associated data?</p>
              <div class="confirm-input">
                <label for="confirm-delete">Type "DELETE" to confirm:</label>
                <input 
                  id="confirm-delete" 
                  v-model="deleteConfirmation"
                  type="text" 
                  placeholder="DELETE"
                />
              </div>
            </div>
            <div class="modal-actions">
              <button class="secondary-button" @click="cancelDeleteAccount">
                Cancel
              </button>
              <button 
                class="danger-button" 
                :disabled="deleteConfirmation !== 'DELETE'"
                @click="deleteAccount"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useAuth } from '@/services/auth'
import { useTheme } from '@/services/theme'
import { useUserSettings } from '@/services/userSettings'
import { useRouter, useRoute } from 'vue-router'
import SideNavigation from '@/components/SideNavigation.vue'

// Initialize router and services
const router = useRouter()
const route = useRoute()
const { user, loading, updateProfile, updatePassword, logout, deleteUserAccount } = useAuth()
const { isDarkMode, toggleTheme } = useTheme()
const { experimentalFeatures, toggleExperimentalFeatures } = useUserSettings()

// Sidebar state
const sidebarExpanded = ref(window.innerWidth >= 768)

// Toggle sidebar expanded state
const toggleSidebar = () => {
  sidebarExpanded.value = !sidebarExpanded.value
}

// Form state management
const form = reactive({
  displayName: '',
  newPassword: '',
  confirmPassword: ''
})

// Password visibility toggle
const showPassword = ref(false)
const togglePasswordVisibility = () => {
  showPassword.value = !showPassword.value
}

// Status indicators
const error = ref('')
const success = ref('')
const isSubmitting = ref(false)

// Notification preferences
const notificationsEnabled = ref(false)
const toggleNotifications = () => {
  notificationsEnabled.value = !notificationsEnabled.value
  // In a real implementation, this would save to user preferences
}

// Delete account modal
const showDeleteModal = ref(false)
const deleteConfirmation = ref('')

// Get user initials for avatar placeholder
const userInitials = computed(() => {
  if (!user.value?.displayName) return '?'
  return user.value.displayName
    .split(' ')
    .map(name => name.charAt(0))
    .join('')
    .toUpperCase()
    .substring(0, 2)
})

// Avatar style with photo URL if available
const avatarStyle = computed(() => {
  if (user.value?.photoURL) {
    return { backgroundImage: `url(${user.value.photoURL})` }
  }
  return {}
})

// Password strength calculations
const passwordRequirements = computed(() => {
  const password = form.newPassword
  return {
    'At least 8 characters': password.length >= 8,
    'Contains uppercase letter': /[A-Z]/.test(password),
    'Contains lowercase letter': /[a-z]/.test(password),
    'Contains number': /[0-9]/.test(password),
    'Contains special character': /[!@#$%^&*(),.?":{}|<>]/.test(password)
  }
})

const strengthScore = computed(() => {
  if (!form.newPassword) return 0
  
  let score = 0
  const reqs = passwordRequirements.value
  
  // Calculate score based on requirements met
  Object.values(reqs).forEach(met => {
    if (met) score += 20
  })
  
  return score
})

const strengthText = computed(() => {
  const score = strengthScore.value
  if (score === 0) return 'None'
  if (score < 40) return 'Weak'
  if (score < 80) return 'Medium'
  return 'Strong'
})

const strengthClass = computed(() => {
  const score = strengthScore.value
  if (score === 0) return 'none'
  if (score < 40) return 'weak'
  if (score < 80) return 'medium'
  return 'strong'
})

const strengthColor = computed(() => {
  const score = strengthScore.value
  if (score === 0) return '#ccc'
  if (score < 40) return '#ff4444'
  if (score < 80) return '#ffbb33'
  return '#00C851'
})

const strengthPercentage = computed(() => {
  return `${strengthScore.value}%`
})

// Check if password can be updated (valid and confirmed)
const canUpdatePassword = computed(() => {
  if (!form.newPassword) return false
  if (form.newPassword !== form.confirmPassword) return false
  if (strengthScore.value < 60) return false
  return true
})

// Format date helper
const formatDate = (dateString) => {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(date)
}

// Initialize user settings
onMounted(async () => {
  try {
    // Clear any previous form and error states
    resetForm()
  } catch (err) {
    console.error('Error initializing profile page:', err)
  }
})

// Reset form and status messages
const resetForm = () => {
  form.displayName = user.value?.displayName || ''
  form.newPassword = ''
  form.confirmPassword = ''
  error.value = ''
  success.value = ''
  isSubmitting.value = false
}

// Handle profile info update
async function handleSubmit() {
  error.value = ''
  success.value = ''
  isSubmitting.value = true

  try {
    // Update display name if changed
    if (form.displayName && form.displayName !== user.value?.displayName) {
      await updateProfile({ displayName: form.displayName })
      success.value = 'Profile updated successfully'
    } else {
      success.value = 'No changes to save'
    }
  } catch (err) {
    error.value = err.message
  } finally {
    isSubmitting.value = false
  }
}

// Handle password update separately
async function handlePasswordUpdate() {
  if (!canUpdatePassword.value) {
    error.value = 'Please ensure your password meets all requirements and passwords match'
    return
  }

  error.value = ''
  success.value = ''
  isSubmitting.value = true

  try {
    await updatePassword(form.newPassword)
    success.value = 'Password updated successfully'
    
    // Clear password fields after success
    form.newPassword = ''
    form.confirmPassword = ''
  } catch (err) {
    error.value = err.message
  } finally {
    isSubmitting.value = false
  }
}

// Handle user logout
async function handleLogout() {
  try {
    await logout()
    router.push('/login')
  } catch (err) {
    error.value = err.message
  }
}

// Export user data
function exportData() {
  if (!user.value) return
  
  // Prepare user data for export
  const userData = {
    email: user.value.email,
    displayName: user.value.displayName,
    createdAt: user.value.metadata?.creationTime,
    lastLogin: user.value.metadata?.lastSignInTime,
    preferences: {
      darkMode: isDarkMode.value,
      experimentalFeatures: experimentalFeatures.value,
      notifications: notificationsEnabled.value
    }
  }
  
  // Create download link
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(userData, null, 2))
  const downloadAnchorNode = document.createElement('a')
  downloadAnchorNode.setAttribute("href", dataStr)
  downloadAnchorNode.setAttribute("download", "patternly-account-data.json")
  document.body.appendChild(downloadAnchorNode)
  downloadAnchorNode.click()
  downloadAnchorNode.remove()
  
  success.value = "Your data has been exported successfully"
}

// Account deletion functions
function confirmDeleteAccount() {
  showDeleteModal.value = true
  deleteConfirmation.value = ''
}

function cancelDeleteAccount() {
  showDeleteModal.value = false
  deleteConfirmation.value = ''
}

async function deleteAccount() {
  if (deleteConfirmation.value !== 'DELETE') return
  
  isSubmitting.value = true
  error.value = ''
  
  try {
    await deleteUserAccount()
    showDeleteModal.value = false
    // User will be redirected by auth state change listener
  } catch (err) {
    error.value = err.message
  } finally {
    isSubmitting.value = false
  }
}
</script>

<style scoped>
/* App layout styles */
.app-layout {
  display: flex;
  min-height: 100vh;
  background-color: var(--main-bg);
  color: var(--text-primary);
  position: relative;
}

.main-container {
  flex: 1;
  padding-left: 60px; /* Width of collapsed sidebar */
  transition: padding-left 0.3s ease;
  width: 100%;
  padding-bottom: 60px; /* Space for ad banner */
}

.main-container.sidebar-expanded {
  padding-left: 220px; /* Width of expanded sidebar */
}

.mobile-header {
  display: none;
  align-items: center;
  padding: 1rem;
  background-color: var(--header-bg);
  border-bottom: 1px solid var(--border-color);
}

.menu-btn {
  background: transparent;
  border: none;
  color: var(--text-primary);
  font-size: 1.25rem;
  cursor: pointer;
  padding: 0.5rem;
}

.mobile-title {
  margin: 0 1rem;
  font-size: 1.25rem;
  color: var(--accent-color);
}

.spacer {
  flex: 1;
}

/* Profile page styles */
.profile-content {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.profile-header {
  margin-bottom: 2rem;
  text-align: center;
}

.profile-header h1 {
  font-size: 2rem;
  margin-bottom: 0.5rem;
  color: var(--accent-color);
}

.profile-header p {
  color: var(--text-secondary);
  font-size: 1.1rem;
}

/* Profile grid layout */
.profile-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

/* Profile cards */
.profile-card {
  background-color: var(--card-bg);
  border-radius: 12px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.05);
  overflow: hidden;
  border: 1px solid var(--border-color);
  transition: transform 0.2s, box-shadow 0.2s;
}

.profile-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.08);
}

/* Card headers */
.card-header {
  display: flex;
  align-items: center;
  padding: 1.25rem;
  border-bottom: 1px solid var(--border-color);
  background-color: var(--header-bg);
}

.card-icon {
  font-size: 1.25rem;
  color: var(--accent-color);
  margin-right: 0.75rem;
}

.card-header h2 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
}

/* Loading spinner */
.loading-spinner {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1.5rem;
  gap: 1rem;
  color: var(--text-secondary);
}

.loading-spinner svg {
  font-size: 2rem;
  color: var(--accent-color);
}

/* Profile picture section */
.profile-picture-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-top: 1.5rem;
}

.profile-avatar {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background-color: var(--accent-color);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.5rem;
  font-weight: 500;
  margin-bottom: 1rem;
  background-size: cover;
  background-position: center;
}

.upload-photo-btn {
  background-color: transparent;
  border: 1px dashed var(--border-color);
  color: var(--text-secondary);
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s;
}

.upload-photo-btn:hover {
  color: var(--accent-color);
  border-color: var(--accent-color);
}

/* Form styles */
.profile-form {
  padding: 1.5rem;
}

.form-group {
  margin-bottom: 1.5rem;
  position: relative;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: var(--text-primary);
}

.field-icon {
  margin-right: 0.5rem;
  color: var(--accent-color);
  opacity: 0.8;
}

.form-group input {
  width: 100%;
  padding: 0.875rem 1rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background-color: var(--input-bg);
  color: var(--text-primary);
  font-size: 1rem;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.form-group input:focus {
  outline: none;
  border-color: var(--accent-color);
  box-shadow: 0 0 0 3px rgba(76, 175, 80, 0.15);
}

.form-group input:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  background-color: var(--hover-bg);
}

/* Password input styling */
.password-input-wrapper {
  position: relative;
}

.toggle-password {
  position: absolute;
  right: 1rem;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
}

.toggle-password:hover {
  color: var(--accent-color);
}

/* Verified badge */
.verified-badge {
  position: absolute;
  right: 1rem;
  top: calc(50% + 10px);
  color: #4CAF50;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

/* Account info styling */
.account-info {
  background-color: var(--hover-bg);
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1.5rem;
}

.info-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.info-item:last-child {
  margin-bottom: 0;
}

.info-label {
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.info-value {
  font-weight: 500;
}

/* Button styles */
.button-group {
  display: flex;
  gap: 1rem;
}

.primary-button, 
.secondary-button,
.danger-button {
  padding: 0.875rem 1.5rem;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  justify-content: center;
  font-size: 0.95rem;
}

.primary-button {
  background-color: var(--accent-color);
  border: none;
  color: white;
  flex: 1;
}

.primary-button:hover:not(:disabled) {
  background-color: var(--accent-hover);
  transform: translateY(-2px);
}

.secondary-button {
  background-color: transparent;
  border: 1px solid var(--border-color);
  color: var(--text-primary);
}

.secondary-button:hover:not(:disabled) {
  background-color: var(--hover-bg);
  border-color: var(--text-secondary);
}

.danger-button {
  background-color: #ff4444;
  border: none;
  color: white;
}

.danger-button:hover:not(:disabled) {
  background-color: #cc0000;
}

.primary-button:disabled,
.secondary-button:disabled,
.danger-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
}

/* Password strength meter */
.password-strength {
  margin-bottom: 1.5rem;
}

.strength-label {
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
}

.strength-label .none { color: var(--text-secondary); }
.strength-label .weak { color: #ff4444; }
.strength-label .medium { color: #ffbb33; }
.strength-label .strong { color: #00C851; }

.strength-meter {
  height: 6px;
  background-color: var(--border-color);
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 0.75rem;
}

.strength-progress {
  height: 100%;
  transition: width 0.3s, background-color 0.3s;
}

.password-requirements {
  list-style: none;
  padding: 0;
  margin: 0;
  font-size: 0.85rem;
}

.password-requirements li {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
  color: #ff4444;
}

.password-requirements li.met {
  color: #00C851;
}

/* Preferences styling */
.preferences-list {
  padding: 1.5rem;
}

.preference-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 0;
  border-bottom: 1px solid var(--border-color);
}

.preference-item:last-child {
  border-bottom: none;
}

.preference-info {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.preference-icon {
  color: var(--accent-color);
  font-size: 1.25rem;
  width: 24px;
}

.preference-details h3 {
  margin: 0 0 0.25rem 0;
  font-size: 1rem;
  font-weight: 500;
}

.preference-details p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.85rem;
}

.theme-toggle-button {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--text-primary);
}

/* Toggle Switch */
.toggle-switch {
  position: relative;
  width: 40px;
  height: 20px;
  background-color: var(--border-color);
  border-radius: 10px;
  transition: background-color 0.3s;
}

.toggle-slider {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  background-color: white;
  border-radius: 50%;
  transition: transform 0.3s;
}

.toggle-slider.active {
  transform: translateX(20px);
}

.toggle-switch:has(.toggle-slider.active) {
  background-color: var(--accent-color);
}

/* Account action buttons */
.account-actions {
  padding: 1rem 1.5rem;
}

.action-button {
  display: flex;
  align-items: center;
  gap: 1rem;
  width: 100%;
  padding: 1rem;
  background-color: transparent;
  border: none;
  border-radius: 8px;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.2s;
  margin-bottom: 0.5rem;
}

.action-button:hover {
  background-color: var(--hover-bg);
}

.action-button.danger:hover {
  background-color: rgba(255, 68, 68, 0.1);
}

.action-icon {
  color: var(--accent-color);
  font-size: 1.25rem;
  width: 24px;
}

.action-button.danger .action-icon {
  color: #ff4444;
}

.action-details h3 {
  margin: 0 0 0.25rem 0;
  font-size: 1rem;
  font-weight: 500;
}

.action-details p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.85rem;
}

/* Status messages */
.status-message {
  position: fixed;
  bottom: 1.5rem;
  right: 1.5rem;
  padding: 1rem 1.5rem;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  max-width: 400px;
  z-index: 1000;
  animation: slideIn 0.3s ease-out;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

@keyframes slideIn {
  from { transform: translateY(100%); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.error-message {
  background-color: #ffebee;
  border-left: 4px solid #ff4444;
  color: #c62828;
}

.success-message {
  background-color: #e8f5e9;
  border-left: 4px solid #4caf50;
  color: #2e7d32;
}

/* Modal styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal-content {
  background-color: var(--card-bg);
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  animation: scaleIn 0.2s ease-out;
}

@keyframes scaleIn {
  from { transform: scale(0.9); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.modal-header {
  padding: 1.5rem;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  gap: 1rem;
}

.modal-icon {
  font-size: 1.5rem;
}

.modal-icon.warning {
  color: #ff9800;
}

.modal-header h2 {
  margin: 0;
  font-size: 1.25rem;
}

.modal-body {
  padding: 1.5rem;
}

.modal-body p {
  margin-top: 0;
}

.confirm-input {
  margin-top: 1.5rem;
}

.confirm-input label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.confirm-input input {
  width: 100%;
  padding: 0.875rem 1rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background-color: var(--input-bg);
  color: var(--text-primary);
}

.modal-actions {
  padding: 1.5rem;
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
}

/* Mobile responsive styles */
@media (max-width: 767px) {
  .main-container {
    padding-left: 0;
  }
  
  .main-container.sidebar-expanded {
    padding-left: 0;
  }
  
  .mobile-header {
    display: flex;
  }

  .profile-content {
    padding: 1rem;
  }
  
  .profile-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  
  .button-group {
    flex-direction: column;
  }
  
  .preference-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
  
  .theme-toggle-button {
    align-self: flex-start;
  }
  
  .status-message {
    left: 1.5rem;
    right: 1.5rem;
    max-width: none;
  }
}
</style> 
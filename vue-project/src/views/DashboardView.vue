<template>
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
      
      <main class="dashboard-content">
        <div class="page-header">
          <h1>Welcome to Patternly</h1>
          <p class="subtitle">Your digital pattern crafting hub</p>
        </div>
        
        <!-- Recent patterns section - Moved to appear first -->
        <section class="recent-patterns" v-if="recentPatterns.length > 0">
          <div class="section-title">
            <h2>Recently Modified</h2>
            <router-link to="/patterns" class="view-all">
              View All
              <font-awesome-icon icon="chevron-right" />
            </router-link>
          </div>
          
          <div class="recent-patterns-grid">
            <div 
              v-for="pattern in recentPatterns" 
              :key="pattern.id" 
              class="pattern-card"
              @click="viewPattern(pattern.id)"
            >
              <div class="pattern-preview">
                <!-- Pattern preview placeholder -->
                <div class="pattern-placeholder" :style="{ backgroundColor: getPatternColor(pattern) }">
                  <font-awesome-icon icon="th" />
                </div>
              </div>
              <div class="pattern-info">
                <h3>{{ pattern.name }}</h3>
                <p class="pattern-date">{{ formatDate(pattern.timestamp) }}</p>
              </div>
            </div>
          </div>
        </section>
        
        <!-- Feature navigation cards -->
        <section class="feature-cards">
          <div class="section-title">
            <h2>Get Started</h2>
          </div>
          
          <div class="cards-grid">
            <div 
              class="feature-card" 
              @click="navigateTo('/patterns')"
            >
              <div class="card-icon">
                <font-awesome-icon icon="folder" />
              </div>
              <div class="card-content">
                <h3>Saved Patterns</h3>
                <p>Access your saved pattern collection</p>
              </div>
              <div class="card-arrow">
                <font-awesome-icon icon="arrow-right" />
              </div>
            </div>
            
            <div 
              class="feature-card" 
              @click="navigateTo('/builder')"
            >
              <div class="card-icon builder-icon">
                <font-awesome-icon icon="pencil-ruler" />
              </div>
              <div class="card-content">
                <h3>Pattern Builder</h3>
                <p>Create new patterns from scratch</p>
              </div>
              <div class="card-arrow">
                <font-awesome-icon icon="arrow-right" />
              </div>
            </div>
            
            <div 
              class="feature-card" 
              @click="navigateTo('/marketplace')"
            >
              <div class="card-icon marketplace-icon">
                <font-awesome-icon icon="store" />
              </div>
              <div class="card-content">
                <h3>Marketplace</h3>
                <p>Discover patterns from the community</p>
              </div>
              <div class="card-arrow">
                <font-awesome-icon icon="arrow-right" />
              </div>
            </div>
            
            <div 
              class="feature-card" 
              @click="navigateTo('/tools')"
            >
              <div class="card-icon tools-icon">
                <font-awesome-icon icon="tools" />
              </div>
              <div class="card-content">
                <h3>Pattern Tools</h3>
                <p>Advanced tools and utilities</p>
              </div>
              <div class="card-arrow">
                <font-awesome-icon icon="arrow-right" />
              </div>
            </div>
          </div>
        </section>
        
        <!-- Quick start guide for new users -->
        <section class="quick-start" v-if="recentPatterns.length === 0">
          <div class="section-title">
            <h2>Quick Start Guide</h2>
          </div>
          
          <div class="quick-start-content">
            <div class="quick-start-step">
              <div class="step-number">1</div>
              <div class="step-content">
                <h3>Create Your First Pattern</h3>
                <p>Start by creating a new pattern using our intuitive Pattern Builder.</p>
                <button class="primary-btn" @click="navigateTo('/builder')">
                  Create Pattern
                </button>
              </div>
            </div>
            
            <div class="quick-start-step">
              <div class="step-number">2</div>
              <div class="step-content">
                <h3>Explore the Marketplace</h3>
                <p>Browse patterns created by the community for inspiration.</p>
                <button class="secondary-btn" @click="navigateTo('/marketplace')">
                  Visit Marketplace
                </button>
              </div>
            </div>
            
            <div class="quick-start-step">
              <div class="step-number">3</div>
              <div class="step-content">
                <h3>Customize Your Profile</h3>
                <p>Set up your preferences and personalize your experience.</p>
                <button class="secondary-btn" @click="navigateTo('/profile')">
                  Edit Profile
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/services/auth'
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore'
import { db } from '@/firebase'
import SideNavigation from '@/components/SideNavigation.vue'

const router = useRouter()
const { user } = useAuth()
const recentPatterns = ref([])
const sidebarExpanded = ref(window.innerWidth >= 768)

onMounted(async () => {
  if (user.value) {
    await fetchRecentPatterns()
  }
})

const fetchRecentPatterns = async () => {
  try {
    const patternsRef = collection(db, 'patterns')
    const q = query(
      patternsRef,
      where('userId', '==', user.value.uid),
      orderBy('timestamp', 'desc'),
      limit(4)
    )
    
    const querySnapshot = await getDocs(q)
    recentPatterns.value = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
    
    // Ensure we have the correct data structure for horizontal display
    console.log('Recent patterns loaded:', recentPatterns.value.length)
  } catch (error) {
    console.error('Error fetching recent patterns:', error)
  }
}

const navigateTo = (path) => {
  router.push(path)
}

const viewPattern = (patternId) => {
  router.push(`/pattern/${patternId}`)
}

const toggleSidebar = () => {
  sidebarExpanded.value = !sidebarExpanded.value
}

const formatDate = (timestamp) => {
  if (!timestamp) return 'N/A'
  
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(date)
}

// Generate a unique color based on pattern name
const getPatternColor = (pattern) => {
  if (!pattern.name) return '#6c5ce7'
  
  const hash = pattern.name.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc)
  }, 0)
  
  const colors = [
    '#6c5ce7', '#00cec9', '#fd79a8', '#00b894', 
    '#e17055', '#fdcb6e', '#0984e3', '#b2bec3'
  ]
  
  return colors[Math.abs(hash) % colors.length]
}
</script>

<style scoped>
.app-layout {
  display: flex;
  min-height: 100vh;
  position: relative;
  background-color: var(--main-bg);
}

.main-container {
  flex: 1;
  margin-left: 60px;
  transition: margin-left 0.3s ease;
  width: calc(100% - 60px);
}

.main-container.sidebar-expanded {
  margin-left: 220px;
  width: calc(100% - 220px);
}

/* Mobile header (only visible on small screens) */
.mobile-header {
  display: none;
  align-items: center;
  padding: 1rem;
  background-color: var(--header-bg);
  border-bottom: 1px solid var(--border-color);
  height: 60px;
}

.menu-btn {
  background: transparent;
  border: none;
  color: var(--text-primary);
  font-size: 1.25rem;
  cursor: pointer;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mobile-title {
  font-size: 1.25rem;
  margin: 0;
  color: var(--accent-color);
  flex: 1;
  text-align: center;
}

.spacer {
  width: 40px;
}

/* Dashboard content */
.dashboard-content {
  padding: 2rem;
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 2rem;
  text-align: center;
}

.page-header h1 {
  font-size: 2rem;
  margin-bottom: 0.5rem;
  color: var(--text-primary);
}

.subtitle {
  color: var(--text-secondary);
  font-size: 1.1rem;
}

/* Section styling */
.section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
}

.section-title h2 {
  font-size: 1.5rem;
  margin: 0;
  color: var(--text-primary);
}

.view-all {
  color: var(--accent-color);
  text-decoration: none;
  display: flex;
  align-items: center;
  font-size: 0.9rem;
  font-weight: 500;
}

.view-all svg {
  margin-left: 0.5rem;
  font-size: 0.8rem;
}

/* Feature cards */
.feature-cards {
  margin-bottom: 3rem;
  width: 100%;
  max-width: 500px;
  margin-left: auto;
  margin-right: auto;
}

.cards-grid {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.feature-card {
  display: flex;
  align-items: center;
  background-color: var(--card-bg);
  border-radius: 12px;
  padding: 1.25rem;
  border: 1px solid var(--border-color);
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.feature-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
}

.card-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background-color: rgba(108, 92, 231, 0.15);
  color: #6c5ce7;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  flex-shrink: 0;
}

.builder-icon {
  background-color: rgba(0, 184, 148, 0.15);
  color: #00b894;
}

.marketplace-icon {
  background-color: rgba(253, 121, 168, 0.15);
  color: #fd79a8;
}

.tools-icon {
  background-color: rgba(9, 132, 227, 0.15);
  color: #0984e3;
}

.card-content {
  flex: 1;
  margin: 0 1rem;
}

.card-content h3 {
  margin: 0 0 0.25rem;
  font-size: 1.1rem;
}

.card-content p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.card-arrow {
  color: var(--text-secondary);
  transition: transform 0.2s;
}

.feature-card:hover .card-arrow {
  transform: translateX(5px);
  color: var(--accent-color);
}

/* Recent patterns */
.recent-patterns {
  margin-bottom: 3rem;
  width: 100%;
}

.recent-patterns-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(260px, 1fr));
  grid-auto-flow: row;
  gap: 1.5rem;
  width: 100%;
}

.pattern-card {
  background-color: var(--card-bg);
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--border-color);
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  width: 100%;
}

.pattern-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
}

.pattern-preview {
  height: 180px;
  overflow: hidden;
}

.pattern-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.8);
  font-size: 2rem;
}

.pattern-info {
  padding: 1rem;
}

.pattern-info h3 {
  margin: 0 0 0.5rem;
  font-size: 1rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pattern-date {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.8rem;
}

/* Quick start guide */
.quick-start {
  margin-bottom: 3rem;
}

.quick-start-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.quick-start-step {
  display: flex;
  gap: 1.5rem;
  padding: 1.5rem;
  background-color: var(--card-bg);
  border-radius: 12px;
  border: 1px solid var(--border-color);
}

.step-number {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: var(--accent-color);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 1.25rem;
  flex-shrink: 0;
}

.step-content {
  flex: 1;
}

.step-content h3 {
  margin: 0 0 0.5rem;
  font-size: 1.25rem;
}

.step-content p {
  color: var(--text-secondary);
  margin: 0 0 1rem;
}

/* Buttons */
.primary-btn, .secondary-btn {
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.primary-btn {
  background-color: var(--accent-color);
  color: white;
}

.primary-btn:hover {
  background-color: var(--accent-hover);
  transform: translateY(-2px);
}

.secondary-btn {
  background-color: transparent;
  color: var(--accent-color);
  border: 1px solid var(--accent-color);
}

.secondary-btn:hover {
  background-color: rgba(108, 92, 231, 0.1);
  transform: translateY(-2px);
}

/* Responsive styles */
@media (max-width: 767px) {
  .main-container {
    margin-left: 0;
    width: 100%;
  }
  
  .main-container.sidebar-expanded {
    margin-left: 0;
    width: 100%;
  }
  
  .mobile-header {
    display: flex;
  }
  
  .dashboard-content {
    padding: 1.5rem 1rem;
    max-width: 100%;
  }
  
  .page-header h1 {
    font-size: 1.75rem;
  }
  
  .subtitle {
    font-size: 1rem;
  }
  
  .feature-cards {
    max-width: 100%;
  }
  
  .recent-patterns-grid {
    grid-template-columns: 1fr;
    grid-auto-flow: row;
  }
  
  .quick-start-step {
    flex-direction: column;
    gap: 1rem;
    align-items: flex-start;
  }
  
  .pattern-preview {
    height: 160px;
  }
}

@media (min-width: 768px) and (max-width: 1023px) {
  .dashboard-content {
    max-width: 100%;
    padding: 1.5rem;
  }
  
  .feature-cards {
    max-width: 500px;
  }
  
  .recent-patterns-grid {
    grid-template-columns: repeat(2, minmax(220px, 1fr));
    grid-auto-flow: row;
  }
  
  .pattern-preview {
    height: 160px;
  }
}

@media (min-width: 1024px) and (max-width: 1279px) {
  .dashboard-content {
    max-width: 1000px;
  }
  
  .recent-patterns-grid {
    grid-template-columns: repeat(3, minmax(220px, 1fr));
    grid-auto-flow: row;
  }
}
</style> 
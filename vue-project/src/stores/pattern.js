import { defineStore } from 'pinia'
import { db } from '@/firebase'
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  query,
  orderBy
} from 'firebase/firestore'

export const usePatternStore = defineStore('pattern', {
  state: () => ({
    patterns: [],
    loading: false,
    error: null
  }),

  actions: {
    async fetchPatterns() {
      this.loading = true
      try {
        const patternsRef = collection(db, 'patterns')
        const q = query(patternsRef, orderBy('createdAt', 'desc'))
        const querySnapshot = await getDocs(q)
        
        this.patterns = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
      } catch (error) {
        console.error('Error fetching patterns:', error)
        this.error = error.message
      } finally {
        this.loading = false
      }
    },

    async getPattern(id) {
      try {
        const docRef = doc(db, 'patterns', id)
        const docSnap = await getDoc(docRef)
        
        if (docSnap.exists()) {
          return {
            id: docSnap.id,
            ...docSnap.data()
          }
        } else {
          throw new Error('Pattern not found')
        }
      } catch (error) {
        console.error('Error getting pattern:', error)
        this.error = error.message
        return null
      }
    },

    async addPattern(pattern) {
      try {
        const patternsRef = collection(db, 'patterns')
        const docRef = await addDoc(patternsRef, {
          ...pattern,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
        
        const newPattern = {
          id: docRef.id,
          ...pattern
        }
        
        this.patterns.unshift(newPattern)
        return newPattern
      } catch (error) {
        console.error('Error adding pattern:', error)
        this.error = error.message
        return null
      }
    },

    async updatePattern(id, pattern) {
      try {
        const docRef = doc(db, 'patterns', id)
        await updateDoc(docRef, {
          ...pattern,
          updatedAt: new Date().toISOString()
        })
        
        // Update local state
        const index = this.patterns.findIndex(p => p.id === id)
        if (index !== -1) {
          this.patterns[index] = {
            id,
            ...pattern
          }
        }
        
        return true
      } catch (error) {
        console.error('Error updating pattern:', error)
        this.error = error.message
        return false
      }
    },

    async deletePattern(id) {
      try {
        const docRef = doc(db, 'patterns', id)
        await deleteDoc(docRef)
        
        // Update local state
        this.patterns = this.patterns.filter(p => p.id !== id)
        return true
      } catch (error) {
        console.error('Error deleting pattern:', error)
        this.error = error.message
        return false
      }
    }
  }
}) 
<!-- FirebaseTest.vue - A simple component to test Firebase connectivity -->
<template>
  <div class="firebase-test">
    <h2>Firebase Connection Test</h2>
    
    <div class="test-actions">
      <button @click="runSaveTest" :disabled="testRunning" class="test-button">
        Test Firebase Save
      </button>
      
      <button @click="runFetchTest" :disabled="testRunning" class="test-button">
        Test Fetch Patterns
      </button>
    </div>
    
    <div v-if="testRunning" class="loading">
      Running test...
    </div>
    
    <div v-if="testResult" class="result-container">
      <h3>Test Result:</h3>
      <div :class="['result', testResult.success ? 'success' : 'error']">
        {{ testResult.success ? 'Success!' : 'Failed!' }}
      </div>
      
      <div v-if="testResult.success && testResult.docId" class="success-details">
        Document saved with ID: {{ testResult.docId }}
      </div>
      
      <div v-if="testResult.success && testResult.patterns" class="success-details">
        Fetched {{ testResult.patterns.length }} patterns
        <ul v-if="testResult.patterns.length > 0" class="patterns-list">
          <li v-for="(pattern, index) in testResult.patterns.slice(0, 3)" :key="index">
            {{ pattern.name }} (ID: {{ pattern.id }})
          </li>
          <li v-if="testResult.patterns.length > 3">...</li>
        </ul>
      </div>
      
      <div v-if="!testResult.success" class="error-details">
        <div><strong>Error:</strong> {{ testResult.error }}</div>
        <div v-if="testResult.code"><strong>Code:</strong> {{ testResult.code }}</div>
        <div class="full-error">
          <details>
            <summary>Full Error Details</summary>
            <pre>{{ testResult.fullError }}</pre>
          </details>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { testDirectFirebaseSave, testFetchPatterns } from '../testFirebase';

const testRunning = ref(false);
const testResult = ref(null);

// Run the Firebase save test
const runSaveTest = async () => {
  testRunning.value = true;
  testResult.value = null;
  
  try {
    const result = await testDirectFirebaseSave();
    testResult.value = result;
  } catch (error) {
    testResult.value = {
      success: false,
      error: error.message,
      fullError: JSON.stringify(error)
    };
  } finally {
    testRunning.value = false;
  }
};

// Run the Firebase fetch test
const runFetchTest = async () => {
  testRunning.value = true;
  testResult.value = null;
  
  try {
    const result = await testFetchPatterns();
    testResult.value = result;
  } catch (error) {
    testResult.value = {
      success: false,
      error: error.message,
      fullError: JSON.stringify(error)
    };
  } finally {
    testRunning.value = false;
  }
};
</script>

<style scoped>
.firebase-test {
  max-width: 600px;
  margin: 20px auto;
  padding: 20px;
  background-color: var(--card-bg, #2a2a2a);
  border-radius: 8px;
  border: 1px solid var(--border-color, #444);
}

h2 {
  margin-top: 0;
  color: var(--text-primary, #fff);
}

.test-actions {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.test-button {
  padding: 10px 16px;
  background-color: var(--accent-color, #4f87ff);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 600;
}

.test-button:hover:not(:disabled) {
  background-color: var(--accent-hover, #3a6fd9);
}

.test-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.loading {
  margin: 20px 0;
  color: var(--text-secondary, #aaa);
  font-style: italic;
}

.result-container {
  margin-top: 20px;
  padding: 15px;
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}

.result {
  display: inline-block;
  padding: 6px 12px;
  border-radius: 4px;
  font-weight: bold;
  margin-bottom: 10px;
}

.success {
  background-color: rgba(76, 175, 80, 0.2);
  color: #4CAF50;
}

.error {
  background-color: rgba(244, 67, 54, 0.2);
  color: #F44336;
}

.error-details, .success-details {
  margin-top: 15px;
}

.full-error {
  margin-top: 15px;
}

.full-error details {
  color: var(--text-secondary, #aaa);
}

.full-error pre {
  margin-top: 10px;
  padding: 10px;
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
  overflow-x: auto;
  white-space: pre-wrap;
  font-size: 12px;
}

.patterns-list {
  margin-top: 10px;
  padding-left: 20px;
}

.patterns-list li {
  margin-bottom: 5px;
}
</style> 
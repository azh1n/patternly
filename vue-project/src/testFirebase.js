import { db, auth } from './firebase';
import { collection, addDoc, getDocs, where, query } from 'firebase/firestore';

// Function to test direct Firestore save
export const testDirectFirebaseSave = async () => {
  try {
    if (!auth.currentUser) {
      console.error('Error: User not authenticated');
      return { success: false, error: 'User not authenticated' };
    }

    // Create test data
    const testData = {
      name: 'Test Pattern ' + new Date().toISOString(),
      content: 'Test content',
      userId: auth.currentUser.uid,
      timestamp: new Date()
    };

    console.log('Attempting to save test data:', testData);

    // Save to Firestore
    const docRef = await addDoc(collection(db, 'patterns'), testData);
    
    console.log('Successfully added document with ID:', docRef.id);
    return { success: true, docId: docRef.id };
  } catch (error) {
    console.error('Error in direct Firebase save test:', error);
    return { 
      success: false, 
      error: error.message,
      code: error.code,
      fullError: JSON.stringify(error) 
    };
  }
};

// Function to test fetching patterns
export const testFetchPatterns = async () => {
  try {
    if (!auth.currentUser) {
      console.error('Error: User not authenticated');
      return { success: false, error: 'User not authenticated' };
    }

    console.log('Testing pattern fetch for user:', auth.currentUser.uid);
    
    // Create query to get user's patterns
    const q = query(
      collection(db, 'patterns'),
      where('userId', '==', auth.currentUser.uid)
    );
    
    // Execute query
    const querySnapshot = await getDocs(q);
    
    const patterns = [];
    querySnapshot.forEach((doc) => {
      patterns.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    console.log(`Successfully fetched ${patterns.length} patterns`);
    return { success: true, patterns };
  } catch (error) {
    console.error('Error in fetch patterns test:', error);
    return { 
      success: false, 
      error: error.message,
      code: error.code,
      fullError: JSON.stringify(error) 
    };
  }
};

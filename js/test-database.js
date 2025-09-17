import { getDatabase, ref, set, get } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-database.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js';

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "bayanihan-new-472410.firebaseapp.com",
  projectId: "bayanihan-new-472410",
  storageBucket: "bayanihan-new-472410.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
  databaseURL: "https://bayanihan-new-472410-default-rtdb.asia-southeast1.firebasedatabase.app/"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

async function testDB() {
  const testRef = ref(database, 'test/testMessage');
  
  // Write test value
  await set(testRef, "Hello Firebase!");
  
  // Read test value
  const snapshot = await get(testRef);
  if (snapshot.exists()) {
    console.log("Realtime DB is working! Value:", snapshot.val());
  } else {
    console.log("No data found");
  }
}

testDB();

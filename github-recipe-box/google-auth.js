const config = {
  "apiKey": "AIzaSyAoQU_Ehlx4CjQNOTimXP6Mxop8-w2E0ns",
  "authDomain": "little-recipe-box.firebaseapp.com",
  "projectId": "little-recipe-box",
  "appId": "1:398015338082:web:c051e00288334d0627a33b"
}; // Replace with the Firebase web app configuration.

if (config) {
  const base = 'https://www.gstatic.com/firebasejs/11.10.0/';
  try {
    const [{initializeApp}, sdk, db] = await Promise.all([
      import(base + 'firebase-app.js'), import(base + 'firebase-auth.js'), import(base + 'firebase-firestore.js')
    ]);
    const app = initializeApp(config);
    const auth = sdk.getAuth(app);
    const firestore = db.getFirestore(app);
    await auth.authStateReady();
    window.recipeAuth = {
      get user() { return auth.currentUser; },
      signIn: () => sdk.signInWithPopup(auth, new sdk.GoogleAuthProvider()),
      signOut: () => sdk.signOut(auth),
      watch: (user, next, error) => db.onSnapshot(
        db.collection(firestore, 'users', user.uid, 'recipes'), {includeMetadataChanges:true}, next, error
      ),
      write: (user, changes) => {
        const batch = db.writeBatch(firestore);
        for (const [id, recipe] of changes) {
          const ref = db.doc(firestore, 'users', user.uid, 'recipes', id);
          if (recipe) batch.set(ref, recipe);
          else batch.delete(ref);
        }
        return batch.commit();
      }
    };
  } finally {
    window.dispatchEvent(new Event('recipe-auth-ready'));
  }
}

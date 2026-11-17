const config = {
  "apiKey": "AIzaSyAoQU_Ehlx4CjQNOTimXP6Mxop8-w2E0ns",
  "authDomain": "little-recipe-box.firebaseapp.com",
  "projectId": "little-recipe-box",
  "appId": "1:398015338082:web:c051e00288334d0627a33b"
}; // Replace with the Firebase web app configuration.

if (config) {
  const base = 'https://www.gstatic.com/firebasejs/11.10.0/';
  try {
    const [{initializeApp}, sdk] = await Promise.all([
      import(base + 'firebase-app.js'), import(base + 'firebase-auth.js')
    ]);
    const auth = sdk.getAuth(initializeApp(config));
    await auth.authStateReady();
    window.recipeAuth = {
      get user() { return auth.currentUser; },
      signIn: () => sdk.signInWithPopup(auth, new sdk.GoogleAuthProvider()),
      signOut: () => sdk.signOut(auth)
    };
  } finally {
    window.dispatchEvent(new Event('recipe-auth-ready'));
  }
}

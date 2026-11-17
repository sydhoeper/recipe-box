const config = {
  "apiKey": "AIzaSyAoQU_Ehlx4CjQNOTimXP6Mxop8-w2E0ns",
  "authDomain": "little-recipe-box.firebaseapp.com",
  "projectId": "little-recipe-box",
  "appId": "1:398015338082:web:c051e00288334d0627a33b"
}; // Replace with the Firebase web app configuration.

const sharedOwner = 'rByXcKPbqLQNJS2fozu8cu3lsvq1';
const sharedFields = [
  'title', 'category', 'chef', 'image', 'source', 'ingredients', 'steps',
  'prepTime', 'cookTime', 'time', 'servings', 'adapted', 'photoOnly', 'linkOnly'
];
const shareableRecipe = recipe => Object.fromEntries(sharedFields
  .filter(field => recipe[field] !== undefined)
  .map(field => [field, recipe[field]]));

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
    const shared = db.collection(firestore, 'sydFavorites');
    const privateRef = (user, id) => db.doc(firestore, 'users', user.uid, 'recipes', id);
    window.recipeAuth = {
      isSharedOwner: user => user?.uid === sharedOwner,
      watchShared: (next, error) => db.onSnapshot(shared, next, error),
      async saveSharedCopy(user, id) {
        if (user.uid === sharedOwner) return false;
        const copy = privateRef(user, 'syd-copy-' + id);
        return db.runTransaction(firestore, async transaction => {
          if ((await transaction.get(copy)).exists()) return false;
          const recipe = (await transaction.get(db.doc(shared, id))).data();
          if (!recipe) throw new Error('Shared recipe unavailable');
          transaction.set(copy, {...shareableRecipe(recipe), demo:false});
          return true;
        });
      },
      async syncShared(user, privateDocs) {
        if (user.uid !== sharedOwner) return;
        const published = await db.getDocsFromServer(shared);
        const ids = new Set([...privateDocs.map(doc => doc.id), ...published.docs.map(doc => doc.id)]);
        const existing = new Map(published.docs.map(doc => [doc.id, doc.data()]));
        const privateData = new Map(privateDocs.map(doc => [doc.id, doc.data()]));
        function sameRecipe(left, right) {
          return sharedFields.every(field => JSON.stringify(left?.[field]) === JSON.stringify(right?.[field]));
        }
        for (const id of ids) {
          const recipe = privateData.get(id);
          if (sameRecipe(recipe?.favorite && !recipe.deleted ? recipe : null, existing.get(id))) continue;
          if (auth.currentUser?.uid !== user.uid) return;
          await db.runTransaction(firestore, async transaction => {
            const latest = (await transaction.get(privateRef(user, id))).data();
            const ref = db.doc(shared, id);
            if (!latest?.favorite || latest.deleted) transaction.delete(ref);
            else transaction.set(ref, shareableRecipe(latest));
          });
        }
      },
      get user() { return auth.currentUser; },
      signIn: () => sdk.signInWithPopup(auth, new sdk.GoogleAuthProvider()),
      signOut: () => sdk.signOut(auth),
      watch: (user, next, error) => db.onSnapshot(
        db.collection(firestore, 'users', user.uid, 'recipes'), {includeMetadataChanges:true}, next, error
      ),
      write: (user, changes) => {
        const batch = db.writeBatch(firestore);
        for (const [id, recipe] of changes) {
          const ref = privateRef(user, id);
          if (recipe) batch.set(ref, recipe);
          else batch.delete(ref);
          if (user.uid === sharedOwner) {
            const sharedRef = db.doc(shared, id);
            if (recipe?.favorite && !recipe.deleted) batch.set(sharedRef, shareableRecipe(recipe));
            else batch.delete(sharedRef);
          }
        }
        return batch.commit();
      }
    };
  } finally {
    window.dispatchEvent(new Event('recipe-auth-ready'));
  }
}

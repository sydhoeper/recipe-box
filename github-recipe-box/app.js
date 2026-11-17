const $=s=>document.querySelector(s), app=$('#app'), dialog=$('#importDialog');
const categories=['All recipes','Mains','Soups','Salads','Desserts','Cocktails'];
const colors=['#f2a8c4','#f7bd91','#f3dc87','#9fd7be','#9bc7ea','#c2afe8'];
const samples=[{"id": "wild-rice-mushroom-soup", "demo": false, "adapted": true, "title": "Wild Rice and Mushroom Soup", "category": "Soups", "chef": "Jamie Vespa MS, RD · Dishing Out Health", "time": "1 hr 25 min", "servings": "6 servings", "image": "https://dishingouthealth.com/wp-content/uploads/2020/09/WildRiceMushroomSoup_Square-300x300.jpg", "source": "https://dishingouthealth.com/wild-rice-mixed-mushroom-soup/", "ingredients": ["2 Tbsp olive oil", "2 Tbsp unsalted butter", "1 yellow onion, finely chopped", "¾ cup finely chopped carrots", "½ cup finely chopped celery", "8–12 oz sliced cremini mushrooms (or cremini and shiitake)", "4 garlic cloves, minced", "1 cup dry wild rice blend", "1 Tbsp poultry seasoning (or Herbes de Provence)", "1 tsp kosher salt", "½ tsp black pepper", "4 cups lower-sodium vegetable broth", "1 cup water", "⅔ cup heavy cream (or cashew cream)", "⅓ cup finely grated Parmesan"], "steps": ["Measure ⅔ cup cream; leave at room temperature.", "Heat 2 Tbsp oil and 2 Tbsp butter over medium-high heat. Soften 1 chopped onion, ¾ cup carrots and ½ cup celery for 8 minutes.", "Add 8–12 oz mushrooms and 4 minced garlic cloves. Cook 6–8 minutes, stirring occasionally, until golden.", "Toast 1 cup rice in the pot for 1–2 minutes. Add 1 Tbsp poultry seasoning, 1 tsp salt and ½ tsp pepper.", "Pour in 4 cups broth and 1 cup water. Bring to a gentle boil. Cover; simmer over medium-low heat for 45–60 minutes, until rice is tender.", "Stir in ⅔ cup cream. Gradually add ⅓ cup Parmesan, stirring. Take off heat and serve."]}];
const storageKey='little-recipe-box-v1', seedKey='little-recipe-box-default-wild-rice-v1';
let recipes;
try {
 const saved=JSON.parse(localStorage.getItem(storageKey));
 recipes=Array.isArray(saved)?saved:samples;
 // Remove only the three known prototype cards; preserve every user recipe.
 recipes=recipes.filter(r=>!(['soup','pasta','cake'].includes(r.id)&&r.chef==='The Little Recipe Box kitchen'&&r.demo!==false));
 if(!localStorage.getItem(seedKey)){
  if(!recipes.some(r=>r.id===samples[0].id||r.source===samples[0].source))recipes=[samples[0],...recipes];
  localStorage.setItem(storageKey,JSON.stringify(recipes));
  localStorage.setItem(seedKey,'1');
 }
} catch { recipes=recipes||samples; }
let active='All recipes',query='',selected=null;let checked={};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function safeUrl(s){try{const u=new URL(s);return ['https:','http:'].includes(u.protocol)?u.href:''}catch{return ''}}
function toast(s){$('#toast').textContent=s;$('#toast').style.display='block';setTimeout(()=>$('#toast').style.display='none',3500)}
function save(){if(window.recipeAuth?.user)return saveCloudRecipes();try{localStorage.setItem('little-recipe-box-v1',JSON.stringify(recipes));deviceRecipes=recipes;return true}catch{toast('Your browser could not save this recipe. Free some device storage and try again.');return false}}
const logo='<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M5 14h30l-2 21H7L5 14Z M10 14V8h20v6 M14 8V4h12v4 M4 20h32 M16 25h8"/><path d="m28 3 2-2m4 7 3-1"/></svg>';
function box(){selected=null;document.title='Little Recipe Box';app.innerHTML=`<div class="shell"><header class="topbar"><div class="brand">${logo}<span>little recipe box</span></div><button class="primary google-button" id="googleSignIn">Continue with Google</button></header><main id="main"><section class="hero"><div><p class="eyebrow">ALL YOUR GOOD FOOD, TOGETHER.</p><h1>Your little<br><em>recipe box.</em></h1><p class="subtitle">A happy little home for everything you love to cook.</p></div><div class="heroart" aria-hidden="true"><div class="artpaper"></div><span class="star">✧</span><span class="spoon">♡</span></div></section><div class="toolbar"><div class="search"><span aria-hidden="true">⌕</span><input id="search" aria-label="Search recipes" type="search" placeholder="Find something delicious…" value="${esc(query)}"></div><button class="primary" id="add">＋ <span style="font-size:13px">Add a recipe</span></button></div><section class="box" aria-label="Your recipe box"><div class="tabs" role="tablist" aria-label="Recipe categories">${categories.map((c,i)=>`<button class="tab" role="tab" id="tab${i}" aria-controls="cards" aria-selected="${c===active}" tabindex="${c===active?0:-1}" style="background:${colors[i]}" data-cat="${c}">${c}</button>`).join('')}</div><div class="boxhead"><span id="collectionTitle">${active==='All recipes'?'THE WHOLE COLLECTION':active.toUpperCase()}</span><span id="count"></span></div><div class="grid" id="cards" role="tabpanel" aria-labelledby="tab${categories.indexOf(active)}"></div><div class="boxfoot">A few favorites, a lifetime of good meals.</div></section><p class="savehint">✧ <span id="recipeStorageStatus" role="status">${esc(syncStatus || 'Saved on this device')}</span></p></main><footer class="footer"><span>MADE FOR MESSY COUNTERS & HAPPY TABLES</span><span>With a little <span class="heart">♡</span></span></footer></div>`;
bindGoogleButton();$('#add').onclick=()=>requireGoogle(true);$('#search').oninput=e=>{query=e.target.value;cards()};document.querySelectorAll('[data-cat]').forEach(b=>{b.onclick=()=>{active=b.dataset.cat;box()};b.onkeydown=e=>{let i=categories.indexOf(active);if(['ArrowRight','ArrowLeft','Home','End'].includes(e.key)){e.preventDefault();i=e.key==='Home'?0:e.key==='End'?categories.length-1:(i+(e.key==='ArrowRight'?1:-1)+categories.length)%categories.length;active=categories[i];box();$('#tab'+i).focus()}}});cards()}
function cards(){let list=recipes.filter(r=>(active==='All recipes'||r.category===active)&&(r.title+' '+r.ingredients.join(' ')).toLowerCase().includes(query.toLowerCase()));const visible=list;$('#count').textContent=`${list.length} RECIPE${list.length===1?'':'S'}`;$('#cards').innerHTML=visible.length?visible.map((r,i)=>`<article class="card"><button class="cardmain" data-open="${esc(r.id)}" aria-label="Open ${esc(r.title)}${r.linkOnly?' (original recipe, new tab)':''}">${r.image?`<img class="photo" src="${esc(safeUrl(r.image))}" alt="" loading="lazy">`:'<div class="photo" style="display:grid;place-items:center;font-size:66px" aria-hidden="true">✧</div>'}<div class="cardbody"><p class="eyebrow">${esc(r.category)} <span aria-hidden="true">·</span> ${r.linkOnly?'SAVED LINK':r.demo===false?'YOUR KEEPSAKE':'FROM OUR SAMPLE BOX'}</p><h3>${esc(r.title)}</h3><div class="meta">${r.linkOnly?'Open original ↗':recipeFacts(r,true)}</div></div></button>${r.linkOnly?`<button type="button" class="round" data-delete="${esc(r.id)}">Delete recipe</button>`:''}</article>`).join(''):'<div class="empty"><h3>A little room for something good.</h3><p>Try another search, or add your first recipe here.</p></div>';document.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>{
 const recipe = recipes.find(r => r.id === b.dataset.open);
 if (recipe?.linkOnly) window.open(safeUrl(recipe.source), '_blank', 'noopener,noreferrer');
 else openRecipe(b.dataset.open);
 });
 document.querySelectorAll('[data-delete]').forEach(button=>{
  button.onclick=()=>confirmRecipeDeletion(button.dataset.delete);
 });
}
function confirmRecipeDeletion(id) {
 const recipe = recipes.find(item => item.id === id);
 if (!recipe) return;
 const dialog = $('#deleteRecipeDialog');
 const owner = cloudUser?.uid;
 $('#deleteRecipeName').textContent = recipe.title;
 $('#deleteRecipeCancel').onclick = () => dialog.close();
 $('#deleteRecipeConfirm').onclick = () => {
  if (cloudUser?.uid !== owner || !recipes.some(item=>item.id===id)) {
   dialog.close();
   return;
  }
  const previous = recipes;
  recipes = recipes.filter(item => item.id !== id);
  if (!save()) { recipes = previous; return; }
  dialog.close();
  if (selected === id) $('#back').click();
  else cards();
  toast(owner ? 'Deletion queued for sync.' : 'Recipe deleted.');
 };
 dialog.showModal();
}
function openRecipe(id){history.pushState({recipe:id},'','#recipe-'+encodeURIComponent(id));detail(id);window.scrollTo(0,0)}
function instructionsWithAmounts(steps, ingredients) {
 const additions = steps.map(() => []);
 const edits = steps.map(() => []);
 const unit = /^(?:tablespoons?|tbsp\.?|teaspoons?|tsp\.?|cups?|ounces?|oz\.?|pounds?|lbs?\.?|grams?|g|kg|ml|liters?|l|pinch(?:es)?|cans?|cloves?|bunch(?:es)?|handfuls?)\b\.?\s*(?:of\s+)?/i;
 const number = /^(?:\d+[.,]\d+|\d+\/\d+|\d+|[¼½¾⅓⅔⅛⅜⅝⅞])(?:\s*(?:[¼½¾⅓⅔⅛⅜⅝⅞]|\d+\/\d+)|\s*[-–]\s*\d+)?\s*/u;
 const qualifiers = /^(?:(?:finely|roughly|chopped|diced|minced|sliced|grated|fresh|large|small|medium|ground|cooked|dry|raw)\s+)+/i;
 const plural = word => word.endsWith('y') ? [word,word.slice(0,-1)+'ies'] :
  word.endsWith('s') ? [word,word.replace(/(?:es|s)$/,'')] : [word,word+'s',word+'es'];
 const escape = word => word.replace(/[.*+?^\${}()|[\]\\]/g,'\\$&');
 for (const ingredient of ingredients) {
  const measure = ingredient.match(number)?.[0];
  if (!measure) continue;
  const remainder = ingredient.slice(measure.length);
  const units = remainder.match(unit)?.[0] || '';
  const amount = (measure + units).trim().replace(/\s+of$/i,'');
  const name = remainder.slice(units.length).split(/[,;(]/)[0].trim().replace(qualifiers,'');
  const words = name.match(/[a-z]+/gi);
  if (!words?.length) continue;
  const last = words.at(-1);
  if (last.length < 3) continue;
  const head = words.slice(0,-1).map(escape);
  const tail = '(?:'+plural(last).map(escape).join('|')+')';
  const variants = [[...head,tail].join('\\s+')];
  if (head.length && !['oil','powder','cream','sauce','milk','salt','pepper','juice','flour','stock','broth'].includes(last.toLowerCase())) variants.push(tail);
  let occurrences = [];
  for (const variant of variants) {
   const pattern = new RegExp('\\b'+variant+'\\b','gi');
   occurrences = steps.flatMap((step,index)=>Array.from(step.matchAll(pattern),match=>({index,at:match.index,text:match[0]})));
   if (occurrences.length) break;
  }
  if (!occurrences.length) continue;
  const indices = new Set(occurrences.map(hit=>hit.index));
  const useful = occurrences.filter(hit=>{
   const before = steps[hit.index].slice(Math.max(0,hit.at-45),hit.at);
   return !/(?:\d|[¼½¾⅓⅔⅛⅜⅝⅞])[^,.;!?]{0,32}\s$/u.test(before) &&
    !/\b(?:remaining|rest of the|half the|some of the|reserved)\s*$/i.test(before);
  });
  if (!useful.length) continue;
  if (indices.size > 1 || /\b(?:divided|split)\b/i.test(ingredient)) {
   const first = useful[0];
   additions[first.index].push({at:first.at+first.text.length,text:' ('+amount+' total for the recipe)'});
   continue;
  }
  const first = useful[0];
  const before = steps[first.index].slice(0,first.at);
  const article = before.match(/\bthe\s+$/i)?.[0] || '';
  const at = first.at-article.length;
  const sentenceStart = at === 0 || /[.!?]\s+$/.test(steps[first.index].slice(0,at));
  const noun = !units && /^1$/.test(amount) && first.text.toLowerCase() !== name.toLowerCase() && words.length === 1
   ? name : first.text;
  edits[first.index].push({at,end:first.at+first.text.length,text:(sentenceStart?amount[0].toUpperCase()+amount.slice(1):amount)+' '+noun});
 }
 return steps.map((step,i)=>{
  const changes = [...edits[i],...additions[i].map(change=>({...change,end:change.at}))]
   .sort((a,b)=>b.at-a.at || b.end-a.end);
  let boundary = step.length+1;
  for (const change of changes) {
   if (change.end > boundary || change.at === boundary) continue;
   step = step.slice(0,change.at)+change.text+step.slice(change.end);
   boundary = change.at;
  }
  return step;
 });
}
function cookingSteps(directions) {
 const action = /^(?:add|arrange|bake|beat|blend|bring|brush|chill|chop|combine|cook|cover|cut|discard|divide|drain|fold|garnish|heat|knead|let|line|melt|mix|peel|place|pour|preheat|reduce|remove|reserve|rest|return|roast|season|serve|set|simmer|slice|sprinkle|stir|strain|take|taste|toast|toss|transfer|turn|uncover|whisk)\b/i;
 const continuation = /^(?:stir(?:ring)? (?:occasionally|constantly|frequently)|cook(?:ing)? (?:until|for)|simmer(?:ing)? (?:until|for))\b/i;
 const breaks = /(?:[.!?]\s+|;\s+|,?\s+(?:and\s+)?then\s+|,\s+and\s+|\s+and\s+)(?=[a-z])/gi;
 return directions.flatMap(direction => {
  let start = 0;
  const chunks = [];
  for (const match of direction.matchAll(breaks)) {
   const next = match.index + match[0].length;
   const rest = direction.slice(next);
   if (!action.test(rest)) continue;
   if (!/^[.!?;]/.test(match[0]) && !/\bthen\b/i.test(match[0]) &&
       continuation.test(rest) && !/^(?:add|bring|reduce|cover|uncover|transfer)\b/i.test(direction.slice(start))) continue;
   // Keep combined motions together, but split distinct actions joined by “then”.
   if (/^\s*and\s*$/i.test(match[0]) &&
       /^(?:mix|stir|whisk|toss|beat)\b/i.test(rest)) continue;
   const cut = match.index + (/^[.!?]/.test(match[0]) ? 1 : 0);
   chunks.push(direction.slice(start, cut).trim());
   start = next;
  }
  chunks.push(direction.slice(start).trim());
  return chunks.filter(Boolean).map(chunk => {
   const capitalized = chunk.replace(/^[a-z]/, letter => letter.toUpperCase());
   return /[.!?]$/.test(capitalized) ? capitalized : capitalized + '.';
  });
 });
}
const factShapes = {
 prep:'<path d="M4 15h16M6 15v4h12v-4M8 12l6-7 3 3-5 4"/>',
 cook:'<path d="M4 10h16l-2 9H6zM3 10h18M8 7h8M12 7V5"/>',
 total:'<circle cx="12" cy="12" r="8"/><path d="M12 8v5l3 2"/>',
 servings:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/>'
};
function recipeFacts(recipe, compact=false) {
 const entries = [['prep','Prep time',recipe.prepTime],['cook','Cook time',recipe.cookTime],
  ['total','Total time',recipe.time],['servings','Servings',recipe.servings]];
 return entries.filter(([, , value])=>value || !compact).map(([icon,label,value])=>
  `<span class="recipe-fact"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${factShapes[icon]}</svg><span><strong>${label}</strong> ${esc(value || 'Not listed')}</span></span>`
 ).join('');
}
function formatDuration(value) {
 const parts = String(value || '').match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?)?$/);
 if (!parts) return plain(value);
 return parts.slice(1).map((n,i)=>Number(n)?n+' '+['days','hr','min'][i]:'').filter(Boolean).join(' ');
}
function openCookingMode(recipe) {
 const cooking = $('#cookingMode');
 const steps = recipe.adapted ? recipe.steps : cookingSteps(instructionsWithAmounts(recipe.steps, recipe.ingredients));
 if (!steps.length) return;
 let index = 0;
 let lock;
 let requesting = false;
 $('#cookingTitle').textContent = recipe.title;
 const heading = $('#cookingProgress');
 const next = $('#cookingNext');
 const previous = $('#cookingPrevious');
 const wakeStatus = $('#cookingWakeStatus');
 const render = () => {
  heading.textContent = index < steps.length ? `Step ${index + 1} of ${steps.length}` : 'All done!';
  $('#cookingStep').textContent = steps[index] || '';
  previous.disabled = index === 0;
  next.textContent = index === steps.length ? 'Back to recipe' : index === steps.length - 1 ? 'Finish cooking' : 'Next step →';
 };
 const keepAwake = async () => {
  if (!cooking.open || document.hidden || lock || requesting) return;
  if (!navigator.wakeLock) {
   wakeStatus.textContent = 'This browser can’t keep the screen awake.';
   return;
  }
  requesting = true;
  try {
   const acquired = await navigator.wakeLock.request('screen');
   if (!cooking.open) { await acquired.release(); return; }
   lock = acquired;
   wakeStatus.textContent = 'Keeping the screen awake';
   acquired.addEventListener('release', () => {
    if (lock === acquired) lock = null;
    if (cooking.open) wakeStatus.textContent = 'Screen wake lock paused';
   }, {once:true});
  } catch {
   if (cooking.open) wakeStatus.textContent = 'Couldn’t keep the screen awake.';
  } finally {
   requesting = false;
  }
 };
 const go = delta => {
  index = Math.max(0,Math.min(steps.length,index+delta));
  render();
  heading.focus();
 };
 next.onclick = () => index === steps.length ? cooking.close() : go(1);
 previous.onclick = () => go(-1);
 $('#cookingExit').onclick = () => cooking.close();
 cooking.addEventListener('close', () => {
  document.removeEventListener('visibilitychange',keepAwake);
  lock?.release().catch(()=>{});
 }, {once:true});
 wakeStatus.textContent = '';
 render();
 cooking.showModal();
 heading.focus();
 document.addEventListener('visibilitychange',keepAwake);
 keepAwake();
}
function detail(id){let r=recipes.find(r=>r.id===id);if(!r)return box();selected=id;checked={};document.title=r.title+' · Little Recipe Box';app.innerHTML=`<main class="recipe" id="main"><header class="recipebar"><button class="round" id="back" aria-label="Back to recipe box">‹</button><h1>${esc(r.title)}</h1><span aria-hidden="true">✧</span></header>${r.image?`<img class="recipehero" src="${esc(safeUrl(r.image))}" alt="${esc(r.title)}">`:''}<p class="eyebrow" style="margin-top:25px">${esc(r.category)} · ${r.demo===false?'FROM YOUR RECIPE BOX':'SAMPLE RECIPE'}</p><h2>${esc(r.title)}</h2><p class="byline">By ${esc(r.chef||'Unknown author')}</p><div class="facts">${recipeFacts(r)}</div><button class="primary jump-instructions" id="jumpInstructions">Jump to instructions ↓</button>${r.steps.length?'<button class="primary jump-instructions" id="startCooking">Start cooking</button>':''}<h3>A little of this…</h3><p class="byline">Tap ingredients to check them off.</p>${r.ingredients.map(x=>`<label class="ingredient"><input type="checkbox"><span>${esc(x)}</span></label>`).join('')}<h3 id="recipeInstructions" tabindex="-1">Instructions</h3>${(r.adapted?r.steps:cookingSteps(instructionsWithAmounts(r.steps,r.ingredients))).map((s,i)=>`<label class="step"><span class="stepnum" aria-hidden="true">${String(i+1).padStart(2,'0')}</span><span class="steptext"><strong>STEP ${i+1}</strong>${esc(s)}</span><input type="checkbox" aria-label="Mark step ${i+1} complete"></label>`).join('')}${r.demo===false?`<details class="ingredientdock"><summary>Ingredients & amounts ↑</summary>${r.ingredients.map(x=>`<p>${esc(x)}</p>`).join('')}</details>`:''}<section class="recipe-notes"><h3>Notes</h3><form id="recipeNotesForm"><label for="recipeNotes">Your notes</label><textarea id="recipeNotes" rows="4" maxlength="10000">${esc(r.notes || '')}</textarea><button class="primary" type="submit">Save notes</button></form></section><a class="source" href="${esc(safeUrl(r.source))}" target="_blank" rel="noopener noreferrer">${r.demo===false?'View original recipe':'Explore recipes from this source'} <span aria-hidden="true">↗</span> <span class="byline">(opens in a new tab)</span></a>${r.demo===false?'<button class="round" id="remove" style="font-size:12px;text-decoration:underline">Delete recipe</button>':''}</main>`;$('#main').setAttribute('tabindex','-1');$('#main').focus({preventScroll:true});if($('#startCooking')) $('#startCooking').onclick=()=>openCookingMode(r);
$('#jumpInstructions').onclick=()=>{
 const heading=$('#recipeInstructions');
 heading.focus({preventScroll:true});
 heading.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
};
$('#recipeNotesForm').onsubmit=event=>{
 event.preventDefault();
 const previous=recipes;
 const notes=$('#recipeNotes').value.trim();
 recipes=recipes.map(recipe=>recipe.id===id?{...recipe,notes}:recipe);
 if(!save()){recipes=previous;return}
 toast(window.recipeAuth?.user?'Notes queued for sync.':'Notes saved.');
};
$('#back').onclick=()=>{if(history.state?.recipe)history.back();else{history.replaceState(null,'',location.pathname);box()}};if($('#remove'))$('#remove').onclick=()=>confirmRecipeDeletion(id);}

window.addEventListener('scroll',()=>{if(selected&&$('.recipebar'))$('.recipebar').classList.toggle('hide',window.scrollY>90)},{passive:true});window.addEventListener('popstate',()=>{if(location.hash.startsWith('#recipe-'))detail(decodeURIComponent(location.hash.slice(8)));else box()});
$('#category').innerHTML=categories.slice(1).map(c=>`<option>${c}</option>`).join('');let pendingSource='';let importing=false;let controller;
let deviceRecipes = recipes;
let signingIn = false;
let cloudUser = null;
let stopCloudWatch;
let cloudRecipes = new Map();
let syncStatus = '';
function showSyncStatus(status) {
 syncStatus = status;
 const label = $('#recipeStorageStatus');
 if (label) label.textContent = status;
}
function connectRecipeStorage() {
 const user = window.recipeAuth?.user;
 if (cloudUser?.uid === user?.uid) return;
 stopCloudWatch?.();
 cloudUser = user;
 cloudRecipes = new Map();
 recipes = user ? [...samples] : deviceRecipes;
 showSyncStatus(user ? 'Loading your cloud recipes…' : 'Saved on this device');
 if (selected) box();
 else cards();
 if (!user) return;
 stopCloudWatch = window.recipeAuth.watch(user, snapshot => {
  if (cloudUser?.uid !== user.uid) return;
  cloudRecipes = new Map(snapshot.docs.map(doc => [doc.id, {...doc.data(), id:doc.id}]));
  recipes = [...cloudRecipes.values()].filter(recipe => !recipe.deleted);
  for (const sample of samples) if (!cloudRecipes.has(sample.id)) recipes.push(sample);
  if (!selected) cards();
  showSyncStatus(snapshot.metadata.hasPendingWrites ? 'Saving to cloud…' :
   snapshot.metadata.fromCache ? 'Waiting to connect…' : 'Synced to your Google account');
 }, () => showSyncStatus('Cloud sync unavailable. Reload to try again.'));
}
function saveCloudRecipes() {
 if (!cloudUser || syncStatus.startsWith('Loading') || syncStatus.startsWith('Cloud sync unavailable')) {
  toast('Wait for your recipe box to connect, then try again.');
  return false;
 }
 const next = new Map(recipes.map(recipe => [recipe.id, recipe]));
 const changes = [];
 for (const [id, recipe] of next) {
  if (samples.some(sample => sample.id === id) && !cloudRecipes.has(id) && !recipe.notes) continue;
  if (JSON.stringify(recipe) !== JSON.stringify(cloudRecipes.get(id))) changes.push([id, recipe]);
 }
 for (const sample of samples) {
  if (!next.has(sample.id) && !cloudRecipes.has(sample.id)) changes.push([sample.id, {deleted:true}]);
 }
 for (const [id, recipe] of cloudRecipes) {
  if (!next.has(id) && !recipe.deleted) changes.push([id, samples.some(sample => sample.id === id) ? {deleted:true} : null]);
 }
 if (!changes.length) return true;
 const user = cloudUser;
 for (const [id, recipe] of changes) {
  if (recipe) cloudRecipes.set(id, recipe);
  else cloudRecipes.delete(id);
 }
 showSyncStatus('Saving to cloud…');
 window.recipeAuth.write(user, changes).catch(() => {
  if (cloudUser?.uid !== user.uid) return;
  showSyncStatus('Cloud sync unavailable. Reload to try again.');
  toast('Could not save changes to the cloud.');
 });
 return true;
}
function bindGoogleButton() {
 const button = $('#googleSignIn');
 if (!button) return;
 const user = window.recipeAuth?.user;
 button.classList.toggle('profile-button', Boolean(user));
 if (!user) {
  button.textContent = 'Continue with Google';
  button.removeAttribute('aria-label');
  button.removeAttribute('aria-haspopup');
  button.onclick = () => requireGoogle(false);
  return;
 }
 const initial = (user.displayName || user.email || 'G').trim().charAt(0).toUpperCase();
 button.textContent = initial;
 const photo = safeUrl(user.photoURL);
 if (photo) {
  const image = new Image();
  image.alt = '';
  image.onload = () => button.replaceChildren(image);
  image.src = photo;
 }
 button.setAttribute('aria-label', 'Open Google account menu');
 button.setAttribute('aria-haspopup', 'dialog');
 button.onclick = () => {
  $('#accountName').textContent = user.displayName || 'Google account';
  $('#accountEmail').textContent = user.email || '';
  $('#accountDrawer').showModal();
 };

}
window.addEventListener('recipe-auth-ready', () => { connectRecipeStorage(); bindGoogleButton(); });
$('#accountClose').onclick = () => $('#accountDrawer').close();
$('#accountSignOut').onclick = async () => {
 const signOut = $('#accountSignOut');
 signOut.disabled = true;
 try {
  await window.recipeAuth.signOut();
  $('#accountDrawer').close();
  connectRecipeStorage();
  bindGoogleButton();
 } catch {
  $('#accountStatus').textContent = 'Could not sign out. Try again.';
 } finally {
  signOut.disabled = false;
 }
};
async function requireGoogle(openAfterSignIn) {
 const auth = window.recipeAuth;
 if (!auth) {
  // Keep the existing add flow usable until the Firebase project is connected.
  if (openAfterSignIn) openImport();
  else toast('Google sign-in is not connected yet.');
  return;
 }
 if (signingIn) return;
 if (auth.user) {
  if (openAfterSignIn) openImport();
  return;
 }
 signingIn = true;
 try {
  await auth.signIn();
  connectRecipeStorage();
  bindGoogleButton();
  if (openAfterSignIn) openImport();
 } catch (error) {
  if (error.code !== 'auth/popup-closed-by-user') toast('Could not sign in with Google. Try again.');
 } finally {
  signingIn = false;
 }
}
function openImport(){ $('#manualForm').hidden=true;$('#importStatus').textContent='';$('#importForm').reset();$('#manualForm').reset();dialog.showModal();$('#url').focus()}
$('.close').onclick=()=>dialog.close();dialog.addEventListener('close',()=>{controller?.abort();importing=false;$('#importForm button').disabled=false});
function extractRecipe(html){const doc=new DOMParser().parseFromString(html,'text/html');let found;function walk(x){if(!x||typeof x!=='object')return;if((Array.isArray(x['@type'])?x['@type']:[x['@type']]).includes('Recipe')&&!found)found=x;Object.values(x).forEach(v=>{if(Array.isArray(v))v.forEach(walk);else if(typeof v==='object')walk(v)})}doc.querySelectorAll('script[type="application/ld+json"]').forEach(s=>{try{walk(JSON.parse(s.textContent))}catch{}});return found}
function plain(v){const d=new DOMParser().parseFromString(String(v||''),'text/html');return d.body.textContent||''}
function normalize(x){let steps=[];function flatten(a){if(Array.isArray(a))a.forEach(flatten);else if(typeof a==='string')steps.push(plain(a));else if(a?.itemListElement)flatten(a.itemListElement);else if(a?.text)steps.push(plain(a.text))}flatten(x.recipeInstructions);const authors=Array.isArray(x.author)?x.author:[x.author];const img=Array.isArray(x.image)?x.image[0]:x.image;return {id:crypto.randomUUID(),demo:false,title:plain(x.name),chef:authors.map(a=>typeof a==='string'?a:a?.name||'').filter(Boolean).join(', '),image:safeUrl(typeof img==='string'?img:img?.url),category:$('#category').value,ingredients:(x.recipeIngredient||[]).map(plain),steps,source:pendingSource,prepTime:formatDuration(x.prepTime),cookTime:formatDuration(x.cookTime),time:formatDuration(x.totalTime),servings:plain(Array.isArray(x.recipeYield)?x.recipeYield.join(', '):x.recipeYield)}}
function finish(r){if(!r.title||!r.ingredients.length||!r.steps.length)throw Error('This page has an incomplete recipe.');const old=recipes;recipes=[r,...recipes];if(!save()){recipes=old;return}dialog.close();active='All recipes';query='';box();toast('Tucked into your recipe box.');openRecipe(r.id)}
$('#importForm').onsubmit = async event => {
 event.preventDefault();
 const source = safeUrl($('#url').value.trim());
 if (!source) {
  $('#importStatus').textContent = 'Enter a valid recipe link.';
  return;
 }
 const url = new URL(source);
 const slug = url.pathname.split('/').filter(Boolean).pop();
 let title = slug || url.hostname;
 try { title = decodeURIComponent(title); } catch {}
 if (slug) title = title.replace(/[-_]+/g, ' ').replace(/^./u, c => c.toUpperCase());
 const category = $('#category').value;
 const importUser = cloudUser?.uid;
 const card = {id:crypto.randomUUID(), demo:false, linkOnly:true, title, category, source, ingredients:[], steps:[]};
 const previous = recipes;
 const existing = recipes.find(r => r.linkOnly && r.source === source);
 if (existing) card.id = existing.id;
 recipes = [card,...recipes.filter(r => r.id !== card.id)];
 if (!save()) { recipes = previous; return; }
 dialog.close();
 active = 'All recipes';
 query = '';
 box();
 toast('Recipe link saved.');
 try {
  const endpoint = document.querySelector('meta[name="recipe-importer"]')?.content;
  let data;
  if (endpoint) {
   const requestUrl = new URL(endpoint);
   requestUrl.searchParams.set('url', source);
   const response = await fetch(requestUrl, {credentials:'omit', signal:AbortSignal.timeout(12000)});
   if (response.ok) data = (await response.json()).recipe;
  } else {
   const response = await fetch(source, {credentials:'omit', signal:AbortSignal.timeout(8000)});
   if (response.ok) data = extractRecipe(await response.text());
  }
  if (!data) return;
  const imported = normalize(data);
  if (!imported.title || !imported.ingredients.length || !imported.steps.length) return;
  if (cloudUser?.uid !== importUser || !recipes.some(r => r.id === card.id)) return;
  const beforeImport = recipes;
  recipes = recipes.map(r => r.id === card.id ? {...imported, id:card.id, source, category} : r);
  if (!save()) { recipes = beforeImport; return; }
  if (!selected) cards();
  toast('Ingredients and steps imported.');
 } catch { /* The saved link remains usable. */ }
};
$('#manualForm').onsubmit=e=>{e.preventDefault();try{finish({id:crypto.randomUUID(),demo:false,title:$('#recipeTitle').value.trim(),chef:$('#chef').value.trim(),category:$('#category').value,source:pendingSource,ingredients:$('#ingredients').value.split('\n').map(s=>s.trim()).filter(Boolean),steps:$('#instructions').value.split('\n').map(s=>s.trim()).filter(Boolean)})}catch(err){$('#importStatus').textContent=err.message}};
box();if(location.hash.startsWith('#recipe-'))detail(decodeURIComponent(location.hash.slice(8)));if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});

const $=s=>document.querySelector(s), app=$('#app'), dialog=$('#importDialog');
const categories=['All recipes','Mains','Soups','Sides','Salads','Desserts','Cocktails','My Favorites'];
const sharedCategory = "Syd’s Favorites";
let sharedRecipes = [];
let sharedStatus = '';
let stopSharedWatch;
const visibleCategories = () => cloudUser
 ? [...categories,sharedCategory] : categories;
const categoryColors = {
 'All recipes':'#f2a8c4', Mains:'#f7bd91', Soups:'#f3dc87', Sides:'#d5e8a9',
 Salads:'#9fd7be', Desserts:'#9bc7ea', Cocktails:'#c2afe8', 'My Favorites':'#ad8bdc', [sharedCategory]:'#f7c9df'
};
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
function box(){selected=null;document.title='Little Recipe Box';app.innerHTML=`<div class="shell"><header class="topbar"><div class="brand">${logo}<span>little recipe box</span></div><button class="primary google-button" id="googleSignIn">Continue with Google</button></header><main id="main"><section class="hero"><div><p class="eyebrow">ALL YOUR GOOD FOOD, TOGETHER.</p><h1>Your little<br><em>recipe box.</em></h1><p class="subtitle">A happy little home for everything you love to cook.</p></div><div class="heroart" aria-hidden="true"><div class="artpaper"></div><span class="star">✧</span><span class="spoon">♡</span></div></section><div class="toolbar"><div class="search"><span aria-hidden="true">⌕</span><input id="search" aria-label="Search recipes" type="search" placeholder="Find something delicious…" value="${esc(query)}"></div><button class="primary" id="add">＋ <span style="font-size:13px">Add a recipe</span></button></div><section class="box" aria-label="Your recipe box"><div class="tabs" role="tablist" aria-label="Recipe categories">${visibleCategories().map((c,i)=>`<button class="tab" role="tab" id="tab${i}" aria-controls="cards" aria-selected="${c===active}" tabindex="${c===active?0:-1}" style="background:${categoryColors[c]}" data-cat="${c}">${c}</button>`).join('')}</div><div class="boxhead"><span id="collectionTitle">${active==='All recipes'?'THE WHOLE COLLECTION':active.toUpperCase()}</span><span id="count"></span></div><div class="grid" id="cards" role="tabpanel" aria-labelledby="tab${visibleCategories().indexOf(active)}"></div><div class="boxfoot">A few favorites, a lifetime of good meals.</div></section><p class="savehint">✧ <span id="recipeStorageStatus" role="status">${esc(syncStatus || 'Saved on this device')}</span></p></main><footer class="footer"><span>MADE FOR MESSY COUNTERS & HAPPY TABLES</span><span>With a little <span class="heart">♡</span></span></footer></div>`;
bindGoogleButton();$('#add').onclick=()=>requireGoogle(true);$('#search').oninput=e=>{query=e.target.value;cards()};document.querySelectorAll('[data-cat]').forEach(b=>{b.onclick=()=>{active=b.dataset.cat;box()};b.onkeydown=e=>{const categories=visibleCategories();let i=categories.indexOf(active);if(['ArrowRight','ArrowLeft','Home','End'].includes(e.key)){e.preventDefault();i=e.key==='Home'?0:e.key==='End'?categories.length-1:(i+(e.key==='ArrowRight'?1:-1)+categories.length)%categories.length;active=categories[i];box();$('#tab'+i).focus()}}});cards()}
function recipeImageUrl(value) {
 return typeof value === 'string' && /^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(value)
  ? value : safeUrl(value);
}
async function resizeRecipePhoto(file) {
 if (file.size > 25 * 1024 * 1024) throw Error('Choose a photo smaller than 25 MB.');
 const url = URL.createObjectURL(file);
 try {
  const image = new Image();
  image.src = url;
  await image.decode();
  const scale = Math.min(1, 960 / Math.max(image.naturalWidth,image.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1,Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1,Math.round(image.naturalHeight * scale));
  const context = canvas.getContext('2d');
  context.fillStyle = '#ffffff';
  context.fillRect(0,0,canvas.width,canvas.height);
  context.drawImage(image,0,0,canvas.width,canvas.height);
  const photo = canvas.toDataURL('image/jpeg',0.75);
  if (photo.length > 600000) throw Error('This photo is too large to save. Try a smaller photo.');
  return photo;
 } finally {
  URL.revokeObjectURL(url);
 }
}
function favoriteButton(recipe) {
 return `<button type="button" class="round favorite-star" data-favorite="${esc(recipe.id)}" aria-label="Favorite ${esc(recipe.title)}" aria-pressed="${Boolean(recipe.favorite)}"><span aria-hidden="true">${recipe.favorite?'★':'☆'}</span></button>`;
}
function bindFavorites() {
 document.querySelectorAll('[data-favorite]').forEach(button => {
  button.onclick = () => {
   const id = button.dataset.favorite;
   const recipe = recipes.find(item => item.id === id);
   if (!recipe) return;
   const previous = recipes;
   const favorite = !recipe.favorite;
   recipes = recipes.map(item => item.id === id ? {...item,favorite} : item);
   if (!save()) { recipes = previous; return; }
   if (selected === id) {
    button.setAttribute('aria-pressed',String(favorite));
    button.firstElementChild.textContent = favorite?'★':'☆';
   } else {
    cards();
    ([...document.querySelectorAll('[data-favorite]')].find(item => item.dataset.favorite === id) ||
      document.querySelector('[data-cat="Favorites"]'))?.focus({preventScroll:true});
   }
  };
 });
}
function cards(){const shared=active===sharedCategory;let list=(shared?sharedRecipes:recipes).filter(r=>(shared||active==='All recipes'||(active==='My Favorites'?r.favorite:r.category===active))&&(r.title+' '+r.ingredients.join(' ')).toLowerCase().includes(query.toLowerCase()));const visible=list.sort((a,b)=>a.title.localeCompare(b.title,'en',{sensitivity:'base'}));$('#count').textContent=`${list.length} RECIPE${list.length===1?'':'S'}`;$('#cards').innerHTML=visible.length?visible.map((r,i)=>`<article class="card" style="--card-accent:${categoryColors[r.category] || categoryColors['All recipes']}"><button class="cardmain" data-open="${esc(r.id)}" aria-label="Open ${esc(r.title)}${r.linkOnly?' (original recipe, new tab)':''}">${r.image?`<img class="photo" src="${esc(recipeImageUrl(r.image))}" alt="" loading="lazy">`:'<div class="photo" style="display:grid;place-items:center;font-size:66px" aria-hidden="true">✧</div>'}<div class="cardbody"><p class="eyebrow">${esc(r.category)} <span aria-hidden="true">·</span> ${r.linkOnly?'SAVED LINK':r.demo===false?'YOUR KEEPSAKE':'FROM OUR SAMPLE BOX'}</p><h3>${esc(r.title)}</h3><div class="meta">${r.linkOnly?'Open original ↗':recipeFacts(r,true)}</div></div></button>${shared?'':favoriteButton(r)}${r.linkOnly&&!shared?`<button type="button" class="round edit-link" data-edit="${esc(r.id)}">Edit recipe</button><button type="button" class="round" data-delete="${esc(r.id)}">Delete recipe</button>`:''}</article>`).join(''):`<div class="empty"><h3>A little room for something good.</h3><p>${shared?esc(sharedStatus || 'Syd hasn’t shared any matching recipes yet.'):active==='My Favorites'?'Tap the star on a recipe to add it here.':'Try another search, or add your first recipe here.'}</p></div>`;document.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>{
 const recipe = (shared?sharedRecipes:recipes).find(r => r.id === b.dataset.open);
 if (recipe?.linkOnly) window.open(safeUrl(recipe.source), '_blank', 'noopener,noreferrer');
 else openRecipe(b.dataset.open,shared);
 });
 bindFavorites();
 document.querySelectorAll('[data-edit]').forEach(button => { button.onclick = () => editRecipe(button.dataset.edit); });
 document.querySelectorAll('[data-delete]').forEach(button=>{
  button.onclick=()=>confirmRecipeDeletion(button.dataset.delete);
 });
}
function pairingCategory(category) {
 return {Mains:'Sides', Sides:'Mains'}[category];
}

function pairedRecipes(recipe) {
 return recipes.filter(item => !item.linkOnly &&
  item.category === pairingCategory(recipe.category) && recipe.pairings?.includes(item.id));
}

function recipePairings(recipe) {
 const paired = pairedRecipes(recipe);
 if (!paired.length) return '';
 return `<section class="recipe-pairings"><h3>Serve with</h3><ul>${paired.map(item =>
  `<li><a href="#recipe-${encodeURIComponent(item.id)}" data-pairing="${esc(item.id)}">${esc(item.title)}</a></li>`
 ).join('')}</ul></section>`;
}

function editRecipe(id) {
 const recipe = recipes.find(item => item.id === id);
 if (!recipe) return;
 const owner = cloudUser?.uid;
 const editor = $('#editRecipeDialog');
 const form = $('#editRecipeForm');
 const category = $('#editCategory');
 category.replaceChildren(...categories.filter(name=>name!=='All recipes'&&name!=='My Favorites').map(name => new Option(name)));
 $('#editTitle').value = recipe.title;
 category.value = recipe.category;
 const pairingField = $('#editPairings');
 const pairingOptions = $('#editPairingOptions');
 const chosen = new Set(recipe.pairings || []);
 function renderPairingOptions() {
  const targetCategory = pairingCategory(category.value);
  pairingField.hidden = recipe.linkOnly || !targetCategory;
  pairingOptions.replaceChildren();
  if (pairingField.hidden) return;
  const options = recipes.filter(item => item.id !== id && !item.linkOnly && item.category === targetCategory);
  if (!options.length) pairingOptions.textContent = `Add a recipe under ${targetCategory} to pair it here.`;
  for (const item of options) {
   const label = document.createElement('label');
   label.className = 'ingredient';
   const input = document.createElement('input');
   input.type = 'checkbox';
   input.checked = chosen.has(item.id);
   input.onchange = () => input.checked ? chosen.add(item.id) : chosen.delete(item.id);
   label.append(input, document.createTextNode(item.title));
   pairingOptions.append(label);
  }
 }
 category.onchange = renderPairingOptions;
 renderPairingOptions();
 $('#editChef').value = recipe.chef || '';
 $('#editIngredients').value = recipe.ingredients.join('\n');
 $('#editSteps').value = recipe.steps.join('\n');
 $('#editDetails').hidden = Boolean(recipe.linkOnly || recipe.photoOnly);
 $('#editStatus').textContent = '';
 $('#cancelRecipeEdit').onclick = () => editor.close();
 form.onsubmit = event => {
  event.preventDefault();
  const current = recipes.find(item => item.id === id);
  if (!current || cloudUser?.uid !== owner) { editor.close(); return; }
  const title = $('#editTitle').value.trim();
  const lines = selector => $(selector).value.split('\n').map(line => line.trim()).filter(Boolean);
  const details = (recipe.linkOnly || recipe.photoOnly) ? {} : {
   chef:$('#editChef').value.trim(), ingredients:lines('#editIngredients'), steps:lines('#editSteps')
  };
  if (!title || (!recipe.linkOnly && !recipe.photoOnly && (!details.ingredients.length || !details.steps.length))) {
   $('#editStatus').textContent = 'Add a title, at least one ingredient, and at least one step.';
   return;
  }
  const previous = recipes;
  const pairings = recipe.linkOnly ? [] : recipes.filter(item => item.id !== id &&
   !item.linkOnly && item.category === pairingCategory(category.value) && chosen.has(item.id)).map(item => item.id);
  const pairedIds = new Set(pairings);
  recipes = recipes.map(item => {
   if (item.id === id) return {...current,...details,title,category:category.value,pairings};
   const wasPaired = item.pairings?.includes(id) || false;
   if (wasPaired === pairedIds.has(item.id)) return item;
   return {...item,pairings:wasPaired ? item.pairings.filter(other => other !== id) : [...(item.pairings || []),id]};
  });
  if (!save()) {
   recipes = previous;
   $('#editStatus').textContent = 'Could not save these changes. Try again.';
   return;
  }
  editor.close();
  if (selected === id) detail(id);
  else cards();
  toast(owner ? 'Changes queued for sync.' : 'Recipe updated.');
 };
 editor.showModal();
 $('#editTitle').focus();
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
  recipes = recipes.filter(item => item.id !== id).map(item => item.pairings?.includes(id) ?
   {...item,pairings:item.pairings.filter(other => other !== id)} : item);
  if (!save()) { recipes = previous; return; }
  dialog.close();
  if (selected === id) $('#back').click();
  else cards();
  toast(owner ? 'Deletion queued for sync.' : 'Recipe deleted.');
 };
 dialog.showModal();
}
function openRecipe(id,shared=false){history.pushState({recipe:id},'',(shared?'#syd-':'#recipe-')+encodeURIComponent(id));detail(id,shared);window.scrollTo(0,0)}
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
function detail(id,shared=false){let r=(shared?sharedRecipes:recipes).find(r=>r.id===id);if(!r)return box();selected=id;checked={};document.title=r.title+' · Little Recipe Box';app.innerHTML=`<main class="recipe" id="main"><header class="recipebar"><button class="round" id="back" aria-label="Back to recipe box">‹</button><h1>${esc(r.title)}</h1><span aria-hidden="true">✧</span></header>${r.image?`<img class="recipehero ${r.photoOnly?'recipe-scan':''}" src="${esc(recipeImageUrl(r.image))}" alt="${esc(r.title)}">`:''}<p class="eyebrow" style="margin-top:25px">${esc(r.category)} · ${shared?'FROM SYD’S FAVORITES':r.demo===false?'FROM YOUR RECIPE BOX':'SAMPLE RECIPE'}</p><h2>${esc(r.title)}</h2><p class="byline">By ${esc(r.chef||'Unknown author')}</p>${shared?'':`<div class="recipe-actions"><button type="button" id="editRecipe" class="round edit-link">Edit recipe</button>${favoriteButton(r)}</div>${recipePairings(r)}`}${r.photoOnly?'':`<div class="facts">${recipeFacts(r)}</div><button class="primary jump-instructions" id="jumpInstructions">Jump to instructions ↓</button>${r.steps.length?'<button class="primary jump-instructions" id="startCooking">Start cooking</button>':''}<h3>A little of this…</h3><p class="byline">Tap ingredients to check them off.</p>${r.ingredients.map(x=>`<label class="ingredient"><input type="checkbox"><span>${esc(x)}</span></label>`).join('')}<h3 id="recipeInstructions" tabindex="-1">Instructions</h3>${(r.adapted?r.steps:cookingSteps(instructionsWithAmounts(r.steps,r.ingredients))).map((s,i)=>`<label class="step"><span class="stepnum" aria-hidden="true">${String(i+1).padStart(2,'0')}</span><span class="steptext"><strong>STEP ${i+1}</strong>${esc(s)}</span><input type="checkbox" aria-label="Mark step ${i+1} complete"></label>`).join('')}${r.demo===false?`<details class="ingredientdock"><summary>Ingredients & amounts ↑</summary>${r.ingredients.map(x=>`<p>${esc(x)}</p>`).join('')}</details>`:''}`}${shared?'':`<section class="recipe-notes"><h3>Notes</h3><form id="recipeNotesForm"><label for="recipeNotes">Your notes</label><textarea id="recipeNotes" rows="4" maxlength="10000">${esc(r.notes || '')}</textarea><button class="primary" type="submit">Save notes</button></form></section>`}${r.source?`<a class="source" href="${esc(safeUrl(r.source))}" target="_blank" rel="noopener noreferrer">${r.demo===false?'View original recipe':'Explore recipes from this source'} <span aria-hidden="true">↗</span> <span class="byline">(opens in a new tab)</span></a>`:''}${!shared&&r.demo===false?'<button class="round" id="remove" style="font-size:12px;text-decoration:underline">Delete recipe</button>':''}</main>`;$('#main').setAttribute('tabindex','-1');$('#main').focus({preventScroll:true});bindFavorites();
 app.querySelectorAll('[data-pairing]').forEach(link => link.onclick = event => {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  openRecipe(link.dataset.pairing);
 });
if($('#editRecipe')) $('#editRecipe').onclick=()=>editRecipe(id);
if($('#startCooking')) $('#startCooking').onclick=()=>openCookingMode(r);
if($('#jumpInstructions')) $('#jumpInstructions').onclick=()=>{
 const heading=$('#recipeInstructions');
 heading.focus({preventScroll:true});
 heading.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
};
if($('#recipeNotesForm')) $('#recipeNotesForm').onsubmit=event=>{
 event.preventDefault();
 const previous=recipes;
 const notes=$('#recipeNotes').value.trim();
 recipes=recipes.map(recipe=>recipe.id===id?{...recipe,notes}:recipe);
 if(!save()){recipes=previous;return}
 toast(window.recipeAuth?.user?'Notes queued for sync.':'Notes saved.');
};
$('#back').onclick=()=>{if(history.state?.recipe)history.back();else{history.replaceState(null,'',location.pathname);box()}};if($('#remove'))$('#remove').onclick=()=>confirmRecipeDeletion(id);}

window.addEventListener('scroll',()=>{if(selected&&$('.recipebar'))$('.recipebar').classList.toggle('hide',window.scrollY>90)},{passive:true});window.addEventListener('popstate',()=>{if(location.hash.startsWith('#recipe-'))detail(decodeURIComponent(location.hash.slice(8)));else if(location.hash.startsWith('#syd-')){if(cloudUser){active=sharedCategory;detail(decodeURIComponent(location.hash.slice(5)),true)}else box()}else box()});
$('#category').innerHTML=categories.filter(name=>name!=='All recipes'&&name!=='My Favorites').map(c=>`<option>${c}</option>`).join('');let pendingSource='';let importing=false;let controller;
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
 stopSharedWatch?.();
 sharedRecipes = [];
 sharedStatus = '';
 if (active === sharedCategory) active = 'All recipes';
 cloudUser = user;
 cloudRecipes = new Map();
 recipes = user ? [...samples] : deviceRecipes;
 showSyncStatus(user ? 'Loading your cloud recipes…' : 'Saved on this device');
 box();
 if (!user) return;
 let sharedSynced = false;
 sharedStatus = 'Loading Syd’s favorites…';
  stopSharedWatch = window.recipeAuth.watchShared(snapshot => {
   if (cloudUser?.uid !== user.uid) return;
   sharedRecipes = snapshot.docs.map(doc => ({...doc.data(),id:doc.id,demo:false}));
   sharedStatus = '';
   if (location.hash.startsWith('#syd-')) {
    active = sharedCategory;
    detail(decodeURIComponent(location.hash.slice(5)),true);
   } else if (!selected && active === sharedCategory) cards();
  }, () => {
   if (cloudUser?.uid !== user.uid) return;
   sharedStatus = 'Syd’s favorites couldn’t load. Try refreshing.';
   if (!selected && active === sharedCategory) cards();
  });
 stopCloudWatch = window.recipeAuth.watch(user, snapshot => {
  if (cloudUser?.uid !== user.uid) return;
  if (!sharedSynced && window.recipeAuth.isSharedOwner(user) &&
      !snapshot.metadata.fromCache && !snapshot.metadata.hasPendingWrites) {
   sharedSynced = true;
   window.recipeAuth.syncShared(user,snapshot.docs).catch(() => {
    if (cloudUser?.uid === user.uid) toast('Syd’s Favorites couldn’t sync. Refresh to retry.');
   });
  }
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
  if (samples.some(sample => sample.id === id) && !cloudRecipes.has(id) && JSON.stringify(recipe)===JSON.stringify(samples.find(sample=>sample.id===id))) continue;
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
function setImportMode(mode) {
 const fromPhoto = mode === 'photo';
 document.querySelectorAll('[name="recipeMode"]').forEach(input => { input.checked = input.value === mode; });
 $('#photoImportForm').hidden = !fromPhoto;
 $('#importForm').hidden = fromPhoto;
 $('#importStatus').textContent = '';
 fallback.hidden = true;
 failedImport = null;
 if (fromPhoto) controller?.abort();
}
document.querySelectorAll('[name="recipeMode"]').forEach(input => {
 input.onchange = () => setImportMode(input.value);
});
$('#photoCategory').replaceChildren(...categories.filter(name=>name!=='All recipes'&&name!=='My Favorites').map(name=>new Option(name)));
$('#photoImportForm').onsubmit = async event => {
 event.preventDefault();
 const owner = cloudUser?.uid;
 const form = event.currentTarget;
 const file = $('#recipePhoto').files[0];
 const title = $('#photoTitle').value.trim();
 const category = $('#photoCategory').value;
 const status = $('#photoImportStatus');
 const submit = form.querySelector('button');
 if (!title || !file) { status.textContent = 'Add a title and choose a photo.'; return; }
 submit.disabled = true;
 status.textContent = 'Preparing photo…';
 try {
  const image = await resizeRecipePhoto(file);
  if (!dialog.open || form.hidden || owner !== cloudUser?.uid || $('#recipePhoto').files[0] !== file) return;
  status.textContent = '';
  saveImportedCard({id:crypto.randomUUID(),demo:false,photoOnly:true,title,category,image,ingredients:[],steps:[]});
 } catch (error) {
  status.textContent = error.message.startsWith('Choose') || error.message.startsWith('This photo')
   ? error.message : 'Could not open that photo. Try a JPEG or PNG.';
 } finally { submit.disabled = false; }
};
function openImport(){ setImportMode('link');$('#photoImportForm').reset();$('#photoImportStatus').textContent=''; $('#recipePastePanel').hidden=true;$('#recipePaste').value='';$('#pasteStatus').textContent='';fallback.hidden=true;failedImport=null;$('#manualForm').hidden=true;$('#importStatus').textContent='';$('#importForm').reset();$('#manualForm').reset();$('#manualPhotoStatus').textContent='';dialog.showModal();$('#url').focus()}
dialog.querySelector('.close').onclick=()=>dialog.close();dialog.addEventListener('close',()=>{controller?.abort();importing=false;$('#importForm button').disabled=false});
function extractRecipe(html){const doc=new DOMParser().parseFromString(html,'text/html');let found;function walk(x){if(!x||typeof x!=='object')return;if((Array.isArray(x['@type'])?x['@type']:[x['@type']]).includes('Recipe')&&!found)found=x;Object.values(x).forEach(v=>{if(Array.isArray(v))v.forEach(walk);else if(typeof v==='object')walk(v)})}doc.querySelectorAll('script[type="application/ld+json"]').forEach(s=>{try{walk(JSON.parse(s.textContent))}catch{}});return found}
function plain(v){const d=new DOMParser().parseFromString(String(v||''),'text/html');return d.body.textContent||''}
function normalize(x){let steps=[];function flatten(a){if(Array.isArray(a))a.forEach(flatten);else if(typeof a==='string')steps.push(plain(a));else if(a?.itemListElement)flatten(a.itemListElement);else if(a?.text)steps.push(plain(a.text))}flatten(x.recipeInstructions);const authors=Array.isArray(x.author)?x.author:[x.author];const img=Array.isArray(x.image)?x.image[0]:x.image;return {id:crypto.randomUUID(),demo:false,title:plain(x.name),chef:authors.map(a=>typeof a==='string'?a:a?.name||'').filter(Boolean).join(', '),image:safeUrl(typeof img==='string'?img:img?.url),category:$('#category').value,ingredients:(x.recipeIngredient||[]).map(plain),steps,prepTime:formatDuration(x.prepTime),cookTime:formatDuration(x.cookTime),time:formatDuration(x.totalTime),servings:plain(Array.isArray(x.recipeYield)?x.recipeYield.join(', '):x.recipeYield)}}
function saveImportedCard(recipe) {
 const previous = recipes;
 const existing = recipes.find(item => recipe.source && item.linkOnly && item.source === recipe.source);
 if (existing) { recipe.id = existing.id; if (existing.favorite) recipe.favorite = true; }
 recipes = [recipe,...recipes.filter(item => item.id !== recipe.id)];
 if (!save()) { recipes = previous; return; }
 dialog.close();
 active = 'All recipes';
 query = '';
 box();
 toast(recipe.linkOnly ? 'Recipe link saved.' : 'Recipe saved.');
 if (!recipe.linkOnly) openRecipe(recipe.id);
}

const fallback = $('#importFallback');
const importMessages = {
 'Use a public HTTPS recipe link.': 'This link can’t be fetched. Check that it opens a public recipe page and starts with https://.',
 'The recipe site did not return a readable page.': 'The recipe site didn’t send a page the importer could read. You may still be able to open it in your browser.',
 'No complete recipe card was found on this page.': 'The page didn’t contain a recipe card with both ingredients and instructions.',
 'The recipe page was too large.': 'The recipe page was too large for the importer to read.'
};
let failedImport;
function showImportChoices(card, owner, message) {
 failedImport = {card, owner};
 $('#importStatus').textContent = '';
 $('#importReason').textContent = message;
 $('#importOriginal').href = card.source;
 $('#recipeTitle').value = card.title;
 fallback.hidden = false;
 $('#importFailureTitle').focus();
}
function splitPastedRecipe(text) {
 const result = {ingredients:[], steps:[]};
 let section = '';
 for (const raw of text.split(/\r?\n/)) {
  const line = raw.trim().replace(/^#{1,6}\s+/, '');
  if (!line) continue;
  const header = line.match(/^(ingredients?(?: list)?|what you(?:'ll|’ll| will) need|instructions?|directions?|method|preparation|steps|how to make(?: .+)?|notes?|nutrition(?: facts)?|equipment|storage|tips)(?:\s*:\s*(.*)|\s*)$/i);
  if (header) {
   const name = header[1].toLowerCase();
   if (/^(?:ingredient|what you)/.test(name)) section = 'ingredients';
   else if (/^(?:instruction|direction|method|preparation|step|how to make)/.test(name)) section = 'steps';
   else section = '';
   if (section && header[2]) result[section].push(header[2]);
   continue;
  }
  if (!section || /^(?:cook mode|prevent your screen|^\d+x\s|print recipe|pin recipe)/i.test(line)) continue;
  result[section].push(line.replace(/^(?:[•●*-]\s*|(?:step\s+)?\d+[.)]\s+)/i, ''));
 }
 return result;
}
$('#enterManually').onclick = () => {
 $('#recipePastePanel').hidden = false;
 $('#recipePaste').focus();
};
$('#extractPastedRecipe').onclick = () => {
 const pasted = $('#recipePaste').value.trim();
 if (!pasted) {
  $('#pasteStatus').textContent = 'Paste the recipe first.';
  $('#recipePaste').focus();
  return;
 }
 const parts = splitPastedRecipe(pasted);
 for (const [field, values] of [['#ingredients',parts.ingredients],['#instructions',parts.steps]]) {
  if (values.length) $(field).value = values.join('\n');
 }
 $('#manualForm').hidden = false;
 $('#pasteStatus').textContent = parts.ingredients.length && parts.steps.length
  ? 'Review the ingredients and steps below before saving.'
  : 'I couldn’t identify both sections. Add “Ingredients” and “Instructions” headings to the pasted text and try again, or fill in the missing section below.';
 $('#pasteStatus').focus();
};
$('#saveLinkOnly').onclick = () => {
 if (failedImport && failedImport.owner === cloudUser?.uid) saveImportedCard(failedImport.card);
};
$('#importForm').onsubmit = async event => {
 event.preventDefault();
 if (importing) return;
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
 const owner = cloudUser?.uid;
 const card = {id:crypto.randomUUID(), demo:false, linkOnly:true, title,
  category:$('#category').value, source, ingredients:[], steps:[]};
 const request = new AbortController();
 controller = request;
 importing = true;
 const submit = $('#importForm button');
 submit.disabled = true;
 fallback.hidden = true;
 $('#recipePastePanel').hidden = true;
 $('#recipePaste').value = '';
 $('#pasteStatus').textContent = '';
 $('#manualForm').hidden = true;
 failedImport = null;
 $('#importStatus').textContent = 'Trying to import the recipe…';
 const stillCurrent = () => dialog.open && !$('#importForm').hidden && controller === request && owner === cloudUser?.uid;
 let timedOut = false;
 const timer = setTimeout(() => { timedOut = true; request.abort(); },12000);
 try {
  const endpoint = document.querySelector('meta[name="recipe-importer"]')?.content;
  let data;
  let reason = 'The page didn’t contain a recipe card with both ingredients and instructions.';
  if (endpoint) {
   const requestUrl = new URL(endpoint);
   requestUrl.searchParams.set('url',source);
   const response = await fetch(requestUrl,{credentials:'omit',signal:request.signal});
   const result = await response.json();
   if (response.ok) data = result.recipe;
   else reason = importMessages[result.error] || 'The importer couldn’t read this link. You can try again or add it another way.';
  } else {
   const response = await fetch(source,{credentials:'omit',signal:request.signal});
   if (response.ok) data = extractRecipe(await response.text());
  }
  if (!stillCurrent() || request.signal.aborted) return;
  const imported = data && normalize(data);
  if (imported?.title && imported.ingredients.length && imported.steps.length) {
   $('#importStatus').textContent = '';
   saveImportedCard({...imported,source,category:card.category});
  } else showImportChoices(card,owner,reason);
 } catch {
  if (stillCurrent() && (!request.signal.aborted || timedOut)) showImportChoices(card,owner,
   timedOut ? 'The recipe site took too long to respond. Try again or add it another way.' :
    'The importer couldn’t complete the request. Try again or add it another way.');
 } finally {
  clearTimeout(timer);
  if (controller === request) { importing = false; submit.disabled = false; }
 }
};
$('#manualForm').onsubmit = async event => {
 event.preventDefault();
 if (!failedImport || failedImport.owner !== cloudUser?.uid) return;
 const lines = id => $(id).value.split('\n').map(line=>line.trim()).filter(Boolean);
 const title = $('#recipeTitle').value.trim();
 const ingredients = lines('#ingredients');
 const steps = lines('#instructions');
 if (!title || !ingredients.length || !steps.length) {
  $('#importStatus').textContent = 'Add a title, at least one ingredient, and at least one step.';
  return;
 }
 const attempt = failedImport;
 const chef = $('#chef').value.trim();
 const file = $('#manualPhoto').files[0];
 const submit = $('#manualForm button[type="submit"]');
 submit.disabled = true;
 try {
  const image = file ? await resizeRecipePhoto(file) : '';
  if (!dialog.open || failedImport !== attempt || attempt.owner !== cloudUser?.uid) return;
  saveImportedCard({...attempt.card,linkOnly:false,title,ingredients,steps,chef,image});
 } catch (error) {
  if (dialog.open && failedImport === attempt) {
   $('#manualPhotoStatus').textContent = error.message.startsWith('Choose') || error.message.startsWith('This photo')
    ? error.message : 'Could not open that photo. Try a JPEG or PNG.';
  }
 } finally { submit.disabled = false; }
};
box();if(location.hash.startsWith('#recipe-'))detail(decodeURIComponent(location.hash.slice(8)));if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});

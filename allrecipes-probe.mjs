import {createServer} from 'node:http';

const target = 'https://www.allrecipes.com/chocolate-mousse-for-beginners-recipe-8574786';
createServer(async (req, res) => {
  if (req.url !== '/check') {
    res.end('Recipe Box connectivity check');
    return;
  }
  try {
    const page = await fetch(target, {signal: AbortSignal.timeout(10000)});
    const html = await page.text();
    const recipeMarkup = /"recipeIngredient"\s*:/.test(html) &&
      /"recipeInstructions"\s*:/.test(html);
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({status: page.status, recipeMarkup}));
  } catch {
    res.writeHead(502).end('Could not fetch Allrecipes');
  }
}).listen(process.env.PORT || 3000, '0.0.0.0');

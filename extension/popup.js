const $ = id => document.getElementById(id);
const colors = { blue: '#5682cc', purple: '#9864bc', green: '#479271', orange: '#d89549', pink: '#c46f97' };
const request = message => chrome.runtime.sendMessage(message);
function error(message) { $('status').textContent = message; }
async function perform(message) {
  const result = await request(message);
  if (!result?.ok) throw new Error(result?.error || 'The companion did not respond.');
  return result;
}
async function render() {
  const { containers } = await perform({ action: 'list' });
  $('connection').textContent = '● Connected';
  $('setup').hidden = true;
  $('create').querySelector('button').disabled = false;
  $('current').disabled = false;
  $('containers').replaceChildren();
  $('empty').hidden = containers.length > 0;
  for (const item of containers) {
    const row = document.createElement('div'); row.className = 'container';
    const open = document.createElement('button'); open.className = 'open';
    const dot = document.createElement('span'); dot.className = 'dot'; dot.style.setProperty('--color', colors[item.color]);
    const name = document.createElement('strong'); name.textContent = item.name;
    open.append(dot, name);
    open.addEventListener('click', async () => {
      open.disabled = true; error('');
      try {
        let url;
        if ($('current').checked) {
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          url = tab?.url;
          if (!url || !/^https?:\/\//i.test(url)) throw new Error('Choose a regular HTTP or HTTPS page first.');
        }
        await perform({ action: 'open', id: item.id, url });
        error(`Opened ${item.name}.`);
      } catch (e) { error(e.message); } finally { open.disabled = false; }
    });
    const rename = document.createElement('button'); rename.className = 'rename'; rename.textContent = '✎'; rename.setAttribute('aria-label', `Rename ${item.name}`);
    rename.addEventListener('click', async () => {
      const name = prompt('Container name', item.name);
      if (name === null) return;
      try { await perform({ action: 'update', id: item.id, name }); await render(); } catch (e) { error(e.message); }
    });
    row.append(open, rename); $('containers').append(row);
  }
}
$('create').addEventListener('submit', async event => {
  event.preventDefault(); const button = event.target.querySelector('button'); button.disabled = true;
  try { await perform({ action: 'create', name: $('name').value, color: $('color').value }); $('name').value = ''; error(''); await render(); }
  catch (e) { error(e.message); } finally { button.disabled = false; }
});
function showSetup() {
  $('connection').textContent = '○ Setup needed';
  $('setup').hidden = false;
  $('create').querySelector('button').disabled = true;
  $('current').disabled = true;
  error('Connect the companion below to start creating containers.');
}
$('setup-browser').addEventListener('change', () => {
  const browser = $('setup-browser').value;
  $('setup-command').hidden = !browser;
  $('command').textContent = browser ? `node native/install.mjs --extension-id ${chrome.runtime.id} --browser ${browser}` : '';
  $('copy-command').textContent = 'Copy setup command';
});
$('copy-command').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText($('command').textContent); $('copy-command').textContent = 'Copied!'; }
  catch { error('Select the command above and copy it manually.'); }
});
$('check-connection').addEventListener('click', async () => {
  const button = $('check-connection'); button.disabled = true; button.textContent = 'Checking…';
  try { await render(); error('Connected! Create your first container above.'); }
  catch { error('Not connected yet. Run the setup command for your selected browser, then check again.'); }
  finally { button.disabled = false; button.textContent = 'Check connection'; }
});
render().catch(showSetup);

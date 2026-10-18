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
$('command').textContent = `npm run install:host -- --extension-id ${chrome.runtime.id} --browser chrome`;
render().catch(() => { $('connection').textContent = '○ Setup needed'; $('setup').hidden = false; $('setup').open = true; error('The local companion is not connected. Follow the setup steps below.'); });

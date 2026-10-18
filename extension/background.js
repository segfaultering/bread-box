const HOST = 'com.breadbox.containers';
let queue = Promise.resolve();
// One native process per request; serialize writes to the shared catalog.
function call(message) {
  const result = queue.then(() => chrome.runtime.sendNativeMessage(HOST, message));
  queue = result.catch(() => {});
  return result;
}
async function refreshMenus() {
  await chrome.contextMenus.removeAll();
  const result = await call({ action: 'list' });
  if (!result.ok) return;
  chrome.contextMenus.create({ id: 'containers', title: 'Open link in container', contexts: ['link'] });
  for (const item of result.containers) chrome.contextMenus.create({ id: item.id, parentId: 'containers', title: item.name, contexts: ['link'] });
}
chrome.runtime.onMessage.addListener((message, sender, reply) => {
  if (sender.id !== chrome.runtime.id) return;
  call(message).then(async result => {
    reply(result);
    if (message.action === 'create' || message.action === 'update') await refreshMenus();
  }).catch(error => reply({ ok: false, error: error.message }));
  return true;
});
chrome.runtime.onInstalled.addListener(() => refreshMenus().catch(() => {}));
chrome.runtime.onStartup.addListener(() => refreshMenus().catch(() => {}));
chrome.contextMenus.onClicked.addListener(info => {
  if (info.linkUrl) call({ action: 'open', id: info.menuItemId, url: info.linkUrl }).then(result => {
    if (!result.ok) throw new Error(result.error);
    return chrome.action.setBadgeText({ text: '' });
  }).catch(async () => {
    await chrome.action.setBadgeBackgroundColor({ color: '#b42318' });
    await chrome.action.setBadgeText({ text: '!' });
    await chrome.action.setTitle({ title: 'Container could not open. Open Bread Box to check the companion connection.' });
  });
});

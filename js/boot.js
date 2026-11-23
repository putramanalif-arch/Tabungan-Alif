'use strict';
function startApp() { route(); if (gh.ok()) ghSync(); maybeNotify(); setupAutoLock(); }
loadCfg();
if (isLocked()) { if (hasCrypto()) showLock(); else document.body.innerHTML = '<p style="padding:24px">Data terkunci, tetapi browser ini tidak mendukung enkripsi. Buka lewat https.</p>'; }
else { load(); startApp(); }

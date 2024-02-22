
const set = new Set();

onconnect = event => {
  const port = event.ports[0];
  console.log({port});
  set.add(port);
  port.onmessage = e => {
    // 广播消息
    set.forEach(p => {
      if (p === port) return;
      p.postMessage(e.data);
    });
  }
  port.postMessage('worker.js')
}
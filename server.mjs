// Display-only office: Claude Code hooks POST their events to /hook, the page animates them.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = import.meta.dirname;
const PORT = process.env.PORT || 3000;

const clients = new Set();
const line = (event) => `data: ${JSON.stringify(event)}\n\n`;
let lastManager = null;
const working = new Map(); // agent id -> [spawn event, latest activity event], replayed to new clients
function emit(event) {
  if (event.type === 'manager') lastManager = event;
  if (event.type === 'spawn') working.set(event.id, [event]);
  if (event.type === 'activity' && working.has(event.id)) working.get(event.id)[1] = event;
  if (event.type === 'done') working.delete(event.id);
  for (const res of clients) res.write(line(event));
}

function detail(input = {}) {
  return input.file_path ?? input.pattern ?? input.command ?? input.description ?? '';
}

const pending = []; // Agent calls waiting for their SubagentStart, to pick up the task description

function onHook(h) {
  const sub = h.agent_id; // set when the event comes from inside a subagent
  switch (h.hook_event_name) {
    case 'UserPromptSubmit':
      if (!h.prompt?.trim()) break;
      emit({ type: 'manager', state: 'working', say: 'รับทราบครับ กำลังวางแผนงาน' });
      break;
    case 'PreToolUse':
      if (sub) emit({ type: 'activity', id: sub, say: `${h.tool_name} ${detail(h.tool_input)}` });
      else if (h.tool_name === 'Agent' || h.tool_name === 'Task') {
        pending.push({ agent: h.tool_input.subagent_type ?? 'general-purpose', desc: h.tool_input.description ?? '' });
        emit({ type: 'manager', state: 'working', say: `จ่ายงานให้ ${h.tool_input.subagent_type ?? 'พนักงาน'}` });
      } else emit({ type: 'manager', state: 'working', say: `${h.tool_name} ${detail(h.tool_input)}` });
      break;
    case 'SubagentStart': {
      const i = pending.findIndex((p) => p.agent === h.agent_type);
      const p = i >= 0 ? pending.splice(i, 1)[0] : { desc: h.agent_type };
      emit({ type: 'spawn', id: h.agent_id, agent: h.agent_type, desc: p.desc });
      break;
    }
    case 'SubagentStop':
      emit({ type: 'done', id: h.agent_id, status: 'completed' });
      break;
    case 'Stop':
      emit({ type: 'manager', state: 'idle', say: '' });
      break;
  }
}

http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return fs.createReadStream(path.join(ROOT, 'public', 'index.html')).pipe(res);
  }
  if (req.method === 'GET' && req.url === '/events') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    for (const e of [lastManager, ...[...working.values()].flat()]) if (e) res.write(line(e));
    clients.add(res);
    return req.on('close', () => clients.delete(res));
  }
  if (req.method === 'POST' && req.url === '/hook') {
    let body = '';
    req.on('data', (c) => (body += c));
    return req.on('end', () => {
      try {
        const h = JSON.parse(body);
        console.log(h.hook_event_name, h.tool_name ?? '', h.agent_type ?? '', h.agent_id ?? '');
        onHook(h);
      } catch (err) {
        console.error('bad hook payload:', err.message);
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end('{}');
    });
  }
  res.writeHead(404);
  res.end();
}).listen(PORT, () => console.log(`Virtual office: http://localhost:${PORT}`));

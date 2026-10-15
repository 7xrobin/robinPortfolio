(() => {
  // Project content. A screenshot at assets/projects/project-N.png replaces
  // the empty-state tile for project N.
  const projects = [
    { title: 'Atlas', kind: 'Retrieval engine', year: '2026', role: 'Lead engineer', tags: ['LLMs', 'Search', 'TypeScript'], desc: 'A retrieval layer that lets a 400-person company ask questions of its own documentation — answers cite their sources and refuse when they can’t.' },
    { title: 'Relay', kind: 'Agent workflow tool', year: '2025', role: 'Founder', tags: ['Agents', 'Product', 'React'], desc: 'A visual builder for multi-step AI agents, with replayable runs so teams can see exactly where an automation went sideways.' },
    { title: 'Pulse', kind: 'Ops dashboard', year: '2025', role: 'Product engineer', tags: ['Data viz', 'Realtime'], desc: 'A realtime operations view that turns thousands of events per minute into the three numbers a shift lead actually needs.' },
    { title: 'Lumen', kind: 'Vision prototype', year: '2024', role: 'R&D', tags: ['Computer vision', 'Python'], desc: 'An on-device model that reads shelf labels in low light — taken from research notebook to field pilot in eight weeks.' },
    { title: 'Northwind', kind: 'Design system', year: '2024', role: 'Systems lead', tags: ['Design systems', 'Tokens'], desc: 'A token-driven component library shared by four product teams, cutting new-screen build time roughly in half.' }
  ];

  const $ = (id) => document.getElementById(id);

  // — portfolio switcher —
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };
  const num = (k) => String(k + 1).padStart(2, '0');
  let current = 0;

  projects.forEach((p, k) => {
    const row = el('button');
    row.type = 'button';
    row.setAttribute('role', 'tab');
    const stack = el('span', 'stack');
    stack.append(el('span', 'ttl', p.title), el('span', 'kind', p.kind));
    row.append(el('span', 'marker'), el('span', 'num', num(k)), stack);
    row.addEventListener('click', () => setTo(k));
    $('list').append(row);

    const chip = el('button');
    chip.type = 'button';
    chip.setAttribute('role', 'tab');
    chip.append(el('span', 'marker'), el('span', 'num', num(k)), el('span', 'ttl', p.title));
    chip.addEventListener('click', () => setTo(k));
    $('chips').append(chip);

    const slide = el('div', 'slide');
    const empty = el('div', 'slide-empty', p.title + ' — screenshot coming soon');
    const img = new Image();
    img.alt = p.title + ' screenshot';
    img.onload = () => { empty.remove(); slide.append(img); };
    img.src = `assets/projects/project-${k + 1}.png`;
    slide.append(empty);
    $('slides').append(slide);

    const bar = el('button');
    bar.type = 'button';
    bar.setAttribute('aria-label', p.title);
    bar.addEventListener('click', () => setTo(k));
    $('bars').append(bar);
  });

  function render() {
    const p = projects[current];
    for (const id of ['list', 'chips', 'slides', 'bars']) {
      [...$(id).children].forEach((n, k) => {
        n.classList.toggle('is-on', k === current);
        if (n.getAttribute('role') === 'tab') n.setAttribute('aria-selected', k === current);
      });
    }
    $('d-year').textContent = p.year;
    $('d-role').textContent = p.role;
    $('d-title').textContent = p.title;
    $('d-desc').textContent = p.desc;
    $('d-tags').replaceChildren(...p.tags.map((t) => el('span', 'tag tag-accent', t)));
  }

  function setTo(i) {
    if (i === current) return;
    current = i;
    // Fresh element each time so the wipe animation restarts.
    $('wipe').replaceChildren(el('div', 'wipe'));
    render();
  }
  const go = (d) => setTo((current + d + projects.length) % projects.length);

  window.addEventListener('keydown', (e) => {
    if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || e.target.isContentEditable) return;
    if (e.key === 'ArrowRight') go(1);
    if (e.key === 'ArrowLeft') go(-1);
  });

  let tx = 0;
  $('stage').addEventListener('touchstart', (e) => { tx = e.touches[0].clientX; }, { passive: true });
  $('stage').addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - tx;
    if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
  });

  render();
})();

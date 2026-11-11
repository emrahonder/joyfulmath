(() => {
  'use strict';
  const OP_LIST = ['+', '-', '×', '÷'];
  const OP_LABEL = { '+': '+', '-': '−', '×': '×', '÷': '÷' };
  const $ = (id) => document.getElementById(id);
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const shuffle = (arr) => { for (let i = arr.length - 1; i > 0; i--) { const j = rnd(0, i); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };

  // Whole numbers only: subtraction must stay above zero, division must be exact.
  function apply(a, b, op) {
    switch (op) {
      case '+': return a + b;
      case '-': return a > b ? a - b : null;
      case '×': return a * b;
      case '÷': return b !== 0 && a % b === 0 ? a / b : null;
    }
  }
  const stepText = (a, b, op, r) => `${a} ${OP_LABEL[op]} ${b} = ${r}`;

  // ---------- Puzzle generation (always solvable) ----------
  // Build backwards from the target: split a number into two that combine to it.
  function splits(v, op, max) {
    const out = [];
    if (op === '+') for (let x = 1; x < v; x++) { if (x <= max && v - x <= max) out.push([x, v - x]); }
    if (op === '-') for (let b = 1; v + b <= max; b++) out.push([v + b, b]);
    if (op === '×') for (let d = 1; d <= v; d++) if (v % d === 0 && d <= max && v / d <= max) out.push([d, v / d]);
    if (op === '÷') for (let b = 1; v * b <= max; b++) out.push([v * b, b]);
    return out;
  }

  function generate(max, count) {
    for (let attempt = 0; attempt < 20000; attempt++) {
      let pool = [rnd(1, max)];
      const target = pool[0], used = new Set(), steps = [];
      let ok = true;
      while (pool.length < count) {
        const remaining = count - pool.length, missing = OP_LIST.filter((o) => !used.has(o));
        const ops = shuffle((remaining === missing.length ? missing : OP_LIST).slice());
        let done = false;
        for (const op of ops) {
          const idxs = shuffle(pool.map((_, k) => k));
          for (const i of idxs) {
            const opts = splits(pool[i], op, max);
            if (!opts.length) continue;
            const [x, y] = opts[rnd(0, opts.length - 1)];
            steps.push(stepText(x, y, op, pool[i])); used.add(op);
            pool.splice(i, 1, x, y); done = true; break;
          }
          if (done) break;
        }
        if (!done) { ok = false; break; }
      }
      if (ok && used.size === 4) return { nums: shuffle(pool), target, steps: steps.reverse() };
    }
    return null;
  }

  // ---------- Solver ----------
  function solveAll(nums, target, limit, budgetMs) {
    const results = [], failed = new Set(), start = performance.now(), path = [];
    function dfs(items, mask) {
      if (results.length >= limit || performance.now() - start > budgetMs) return false;
      if (items.length === 1) {
        if (items[0] === target && mask === 15) { results.push(path.slice()); return true; }
        return false;
      }
      const key = items.slice().sort((a, b) => a - b).join(',') + '|' + mask;
      if (failed.has(key)) return false;
      let found = false;
      for (let i = 0; i < items.length; i++) {
        for (let j = 0; j < items.length; j++) {
          if (i === j) continue;
          for (let o = 0; o < 4; o++) {
            const op = OP_LIST[o];
            if ((op === '+' || op === '×') && i > j) continue;
            const r = apply(items[i], items[j], op);
            if (r === null) continue;
            const rest = items.filter((_, k) => k !== i && k !== j); rest.push(r);
            path.push(stepText(items[i], items[j], op, r));
            if (dfs(rest, mask | (1 << o))) found = true;
            path.pop();
            if (results.length >= limit) return found;
          }
        }
      }
      if (!found && performance.now() - start <= budgetMs) failed.add(key);
      return found;
    }
    dfs(nums, 0);
    return results;
  }

  // ---------- Game state ----------
  let puzzle, tiles, usedOps, history, selected, selectedOp, solved;

  function newPuzzle() {
    puzzle = generate(+$('range').value, +$('count').value);
    if (!puzzle) { say('Could not build that puzzle – try a bigger range or fewer numbers.', 'bad'); return; }
    $('solutions').hidden = true;
    reset();
  }

  function reset() {
    tiles = puzzle.nums.map((v, i) => ({ id: i, v }));
    usedOps = new Set(); history = []; selected = null; selectedOp = null; solved = false;
    $('target').textContent = puzzle.target;
    $('targetBox').classList.remove('win');
    say('Pick a number, an operation, then another number.');
    render();
  }

  function say(text, kind = '') { const m = $('message'); m.textContent = text; m.className = 'message ' + kind; }

  function render(newId = null) {
    const box = $('tiles'); box.innerHTML = '';
    tiles.forEach((t, idx) => {
      const b = document.createElement('button');
      b.className = 'tile' + (idx === selected ? ' selected' : '') + (t.id === newId ? ' new' : '');
      b.textContent = t.v; b.disabled = solved;
      b.addEventListener('click', () => onTile(idx));
      box.appendChild(b);
    });
    document.querySelectorAll('.op').forEach((b) => {
      b.classList.toggle('selected', b.dataset.op === selectedOp); b.disabled = solved;
    });
    $('used').innerHTML = OP_LIST.map((o) => `<span class="${usedOps.has(o) ? 'done' : ''}">${OP_LABEL[o]}</span>`).join('');
    $('steps').innerHTML = history.map((h) => `<li>${h.text}</li>`).join('');
    $('undo').disabled = history.length === 0;
  }

  let nextId = 100;
  function onTile(idx) {
    if (selected === null || selected === idx || selectedOp === null) {
      selected = selected === idx ? null : idx; render(); return;
    }
    const a = tiles[selected], b = tiles[idx], r = apply(a.v, b.v, selectedOp);
    if (r === null) {
      say(selectedOp === '-' ? 'Subtraction must stay above zero – try the other order!' : 'Division must come out even – try other numbers!', 'bad');
      return;
    }
    history.push({ tiles: tiles.slice(), usedOps: new Set(usedOps), text: stepText(a.v, b.v, selectedOp, r) });
    usedOps.add(selectedOp);
    const t = { id: nextId++, v: r };
    tiles = tiles.filter((_, k) => k !== selected && k !== idx); tiles.push(t);
    selected = null; selectedOp = null;
    if (tiles.length === 1) finish(); else say('Nice! Keep going.');
    render(t.id);
  }

  function finish() {
    const hit = tiles[0].v === puzzle.target, all = usedOps.size === 4;
    if (hit && all) {
      solved = true; $('targetBox').classList.add('win');
      say('🎉 You did it! Amazing job!', 'good');
    } else if (!hit) {
      say(`You ended with ${tiles[0].v}, not ${puzzle.target}. Press Undo and try another way!`, 'bad');
    } else {
      say('You reached the target, but use all four operations (+ − × ÷). Press Undo and try again!', 'bad');
    }
  }

  document.querySelectorAll('.op').forEach((b) => b.addEventListener('click', () => {
    if (selected === null) { say('Pick a number first.', 'bad'); return; }
    selectedOp = selectedOp === b.dataset.op ? null : b.dataset.op; render();
  }));
  $('undo').addEventListener('click', () => {
    const h = history.pop(); if (!h) return;
    tiles = h.tiles; usedOps = h.usedOps; selected = null; selectedOp = null; solved = false;
    $('targetBox').classList.remove('win'); say('Step undone.'); render();
  });
  $('reset').addEventListener('click', reset);
  $('newPuzzle').addEventListener('click', newPuzzle);
  $('range').addEventListener('change', newPuzzle);
  $('count').addEventListener('change', newPuzzle);

  $('showSolutions').addEventListener('click', () => {
    const list = $('solutionList'); $('solutions').hidden = false;
    list.textContent = 'Searching for solutions…';
    $('solutions').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    setTimeout(() => {
      const sols = [puzzle.steps];
      const seen = new Set([puzzle.steps.slice().sort().join('|')]);
      for (const s of solveAll(puzzle.nums, puzzle.target, 6, 1000)) {
        const k = s.slice().sort().join('|');
        if (!seen.has(k) && sols.length < 5) { seen.add(k); sols.push(s); }
      }
      list.innerHTML = sols.map((s, i) =>
        `<div class="solution"><strong>Solution ${i + 1}</strong><ol>${s.map((x) => `<li>${x}</li>`).join('')}</ol></div>`).join('');
    }, 30);
  });

  // ---------- Theme ----------
  const themeBtn = $('themeToggle');
  const syncTheme = () => { themeBtn.textContent = document.documentElement.dataset.theme === 'dark' ? '☀️' : '🌙'; };
  themeBtn.addEventListener('click', () => {
    const t = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = t; localStorage.setItem('jm-theme', t); syncTheme();
  });
  syncTheme();

  // ---------- Footer / sharing ----------
  const pageUrl = encodeURIComponent(location.href.split('#')[0]);
  const shareText = encodeURIComponent('Try Joyful Math – reach the target number with + − × ÷!');
  $('shareFb').href = 'https://www.facebook.com/sharer/sharer.php?u=' + pageUrl;
  $('shareX').href = `https://twitter.com/intent/tweet?url=${pageUrl}&text=${shareText}`;
  $('year').textContent = new Date().getFullYear();

  newPuzzle();
})();

'use strict';
/* =====================================================================
   ELITE GLOBAL — versão sem maquininha
   Estrutura:
   1) DADOS: tabuleiro, grupos de cor, cartas Sorte ou Revés
   2) MOTOR: regras do jogo (funções puras sobre o estado, sem DOM)
   3) INTERFACE: telas, tabuleiro, animações, modo local e online (PeerJS)
   No modo online o anfitrião roda o motor e envia o estado aos demais.
   ===================================================================== */

/* ============================ 1) DADOS ============================ */
const K = 1000;
const START_MONEY = 1500 * K;
const SALARY = 200 * K;
const JAIL_FINE = 50 * K;
const JAIL_POS = 10;
const FERIAS_PERDE_RODADA = true; // cair em "Férias" faz perder a próxima rodada
const COLORS = ['#e63946', '#2a9df4', '#2ecc71', '#f1c40f', '#9b59b6', '#ff8c42', '#00c2a8', '#ff5fa2'];

const GROUPS = {
  g1: { c: '#8a5a3c', h: 50 * K },
  g2: { c: '#5bc0eb', h: 50 * K },
  g3: { c: '#e056a0', h: 100 * K },
  g4: { c: '#f28c28', h: 100 * K },
  g5: { c: '#d62839', h: 150 * K },
  g6: { c: '#f2cf2e', h: 150 * K },
  g7: { c: '#2e9e5b', h: 200 * K },
  g8: { c: '#2b4fb3', h: 200 * K }
};

const P = (n, g, p, r) => ({ n, t: 'prop', g, p: p * K, r: r.map(x => x * K) });
const C = (n, k, icon) => ({ n, t: 'comp', k, icon, p: (k === 'util' ? 150 : 200) * K });

// Casa 0 = Início (canto inferior direito). O caminho segue no sentido horário.
const SQUARES = [
  { n: 'Início', t: 'start' },
  P('Vila Madalena', 'g1', 60, [2, 10, 30, 90, 160, 250]),
  { n: 'Sorte ou Revés', t: 'card' },
  P('Bela Vista', 'g1', 60, [4, 20, 60, 180, 320, 450]),
  { n: 'Imposto de Renda', t: 'tax', a: 200 * K },
  C('Cia. Ferroviária', 'transp', '🚆'),
  P('Av. Juscelino Kubitschek', 'g2', 100, [6, 30, 90, 270, 400, 550]),
  { n: 'Sorte ou Revés', t: 'card' },
  P('Rua Oscar Freire', 'g2', 100, [6, 30, 90, 270, 400, 550]),
  P('Av. Ibirapuera', 'g2', 120, [8, 40, 100, 300, 450, 600]),
  { n: 'Cadeia', t: 'jail' },
  P('Praça da Sé', 'g3', 140, [10, 50, 150, 450, 625, 750]),
  C('Cia. de Energia', 'util', '💡'),
  P('Sacomã', 'g3', 140, [10, 50, 150, 450, 625, 750]),
  P('Ipiranga', 'g3', 160, [12, 60, 180, 500, 700, 900]),
  C('Cia. de Viação', 'transp', '🚌'),
  P('Santa Cruz', 'g4', 180, [14, 70, 200, 550, 750, 950]),
  { n: 'Sorte ou Revés', t: 'card' },
  P('Vila Mariana', 'g4', 180, [14, 70, 200, 550, 750, 950]),
  P('Av. Paulista', 'g4', 200, [16, 80, 220, 600, 800, 1000]),
  { n: 'Férias', t: 'free' },
  P('Vila Olímpia', 'g5', 220, [18, 90, 250, 700, 875, 1050]),
  { n: 'Sorte ou Revés', t: 'card' },
  P('Av. Faria Lima', 'g5', 220, [18, 90, 250, 700, 875, 1050]),
  P('Pinheiros', 'g5', 240, [20, 100, 300, 750, 925, 1100]),
  C('Cia. de Navegação', 'transp', '🚢'),
  P('São Bernardo', 'g6', 260, [22, 110, 330, 800, 975, 1150]),
  P('São Caetano', 'g6', 260, [22, 110, 330, 800, 975, 1150]),
  C('Cia. de Água', 'util', '💧'),
  P('Santo André', 'g6', 280, [24, 120, 360, 850, 1025, 1200]),
  { n: 'Vá para a Cadeia', t: 'gojail' },
  P('Moema', 'g7', 300, [26, 130, 390, 900, 1100, 1275]),
  P('Jardins', 'g7', 300, [26, 130, 390, 900, 1100, 1275]),
  { n: 'Lucros e Dividendos', t: 'gain', a: 200 * K },
  P('Morumbi', 'g7', 320, [28, 150, 450, 1000, 1200, 1400]),
  C('Cia. de Aviação', 'transp', '✈️'),
  { n: 'Sorte ou Revés', t: 'card' },
  P('Brooklin', 'g8', 300, [35, 175, 500, 1100, 1300, 1500]),
  { n: 'Taxa de Luxo', t: 'tax', a: 100 * K },
  P('Santo Amaro', 'g8', 350, [50, 200, 600, 1400, 1700, 2000])
];

const GROUP_SQ = {};
SQUARES.forEach((s, i) => { if (s.t === 'prop') (GROUP_SQ[s.g] = GROUP_SQ[s.g] || []).push(i); });

const CARDS = [
  { k: 'Sorte', t: 'gain', a: 200 * K, x: 'Você ganhou na loteria! Receba R$ 200.000.' },
  { k: 'Sorte', t: 'gain', a: 150 * K, x: 'Seu investimento deu retorno. Receba R$ 150.000.' },
  { k: 'Sorte', t: 'gain', a: 100 * K, x: 'Restituição do Imposto de Renda. Receba R$ 100.000.' },
  { k: 'Sorte', t: 'gain', a: 100 * K, x: 'Herança de um tio distante. Receba R$ 100.000.' },
  { k: 'Sorte', t: 'gain', a: 50 * K, x: 'Você vendeu ações com lucro. Receba R$ 50.000.' },
  { k: 'Sorte', t: 'goto', to: 0, x: 'Avance até o Início e receba R$ 200.000.' },
  { k: 'Sorte', t: 'goto', to: 20, x: 'Passe um tempo de férias. Avance até a casa Férias.' },
  { k: 'Sorte', t: 'goto', to: 19, x: 'Avance até a Av. Paulista.' },
  { k: 'Sorte', t: 'jailFree', x: 'Saída livre da Cadeia. Guarde esta carta até precisar.' },
  { k: 'Sorte', t: 'collectEach', a: 50 * K, x: 'É seu aniversário! Cada jogador lhe dá R$ 50.000.' },
  { k: 'Revés', t: 'lose', a: 50 * K, x: 'Multa de trânsito. Pague R$ 50.000.' },
  { k: 'Revés', t: 'lose', a: 100 * K, x: 'Despesa médica. Pague R$ 100.000.' },
  { k: 'Revés', t: 'lose', a: 30 * K, x: 'Condomínio atrasado. Pague R$ 30.000.' },
  { k: 'Revés', t: 'repairs', house: 40 * K, hotel: 115 * K, x: 'Reforma nos imóveis: pague R$ 40.000 por casa e R$ 115.000 por hotel.' },
  { k: 'Revés', t: 'goJail', x: 'Vá para a Cadeia. Não passe pelo Início e não receba nada.' },
  { k: 'Revés', t: 'back', n: 3, x: 'Volte 3 casas.' },
  { k: 'Revés', t: 'payEach', a: 50 * K, x: 'Você organizou um churrasco. Pague R$ 50.000 a cada jogador.' }
];
const JAIL_CARD = CARDS.findIndex(c => c.t === 'jailFree');

const fmt = n => 'R$ ' + Number(n).toLocaleString('pt-BR');

/* ============================ 2) MOTOR ============================ */
function shuffle(a) {
  a = a.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function say(S, t) {
  S.log.push(t);
  if (S.log.length > 80) S.log.shift();
}

function evt(S, kind, title, text, who) {
  S.eventId++;
  S.event = { id: S.eventId, kind, title, text, who };
}

function newGame(infos) {
  const S = {
    players: infos.map((p, i) => ({
      id: i, name: p.name, color: p.color || COLORS[i], money: START_MONEY, pos: 0,
      inJail: false, jailTries: 0, jailCards: 0, skip: 0,
      bankrupt: false, connected: true, auto: false
    })),
    props: {}, turn: 0, phase: 'roll', dice: [1, 1], rollId: 0, doubles: 0, extra: false,
    pending: null, debt: null, trade: null,
    deck: shuffle(CARDS.map((_, i) => i)),
    log: [], moves: [], event: null, eventId: 0, winner: null, seq: 0
  };
  SQUARES.forEach((s, i) => { if (s.t === 'prop' || s.t === 'comp') S.props[i] = { o: null, h: 0, m: false }; });
  S.turn = Math.floor(Math.random() * S.players.length);
  say(S, 'A partida começou! ' + S.players[S.turn].name + ' joga primeiro.');
  return S;
}

const active = S => S.players.filter(p => !p.bankrupt);
const groupOwned = (S, p, g) => GROUP_SQ[g].every(i => S.props[i].o === p);
const unmortgageCost = sq => Math.round(SQUARES[sq].p / 2 * 1.1);

function rentFor(S, sq) {
  const s = SQUARES[sq], pr = S.props[sq];
  if (s.t === 'prop') {
    if (pr.h > 0) return s.r[pr.h];
    return groupOwned(S, pr.o, s.g) ? s.r[0] * 2 : s.r[0];
  }
  let n = 0;
  SQUARES.forEach((q, i) => { if (q.t === 'comp' && q.k === s.k && S.props[i].o === pr.o) n++; });
  if (s.k === 'transp') return [25, 50, 100, 200][n - 1] * K;
  return (S.dice[0] + S.dice[1]) * (n === 1 ? 4 : 10) * K;
}

/* ---- dinheiro e dívidas ---- */
// Cobra de um jogador. Se não tiver saldo, cria uma dívida (phase 'debt').
function charge(S, p, amount, to, each) {
  const pl = S.players[p];
  if (amount <= 0) return true;
  if (pl.money >= amount) {
    pl.money -= amount;
    if (typeof to === 'number') S.players[to].money += amount;
    else if (to === 'each') S.players.forEach((o, i) => { if (i !== p && !o.bankrupt) o.money += each; });
    return true;
  }
  S.debt = { amount, to, each: each || 0 };
  say(S, pl.name + ' precisa pagar ' + fmt(amount) + ' mas não tem saldo. Venda ou hipoteque imóveis.');
  return false;
}

/* ---- movimento ---- */
function walk(S, p, steps) {
  const pl = S.players[p], from = pl.pos;
  let to = from + steps;
  if (steps > 0 && to >= 40) {
    pl.money += SALARY;
    say(S, pl.name + ' passou pelo Início e recebeu ' + fmt(SALARY) + '.');
  }
  to = ((to % 40) + 40) % 40;
  pl.pos = to;
  S.moves.push({ p, from, to, walk: true, steps });
}

function goJail(S, p) {
  const pl = S.players[p], from = pl.pos;
  pl.pos = JAIL_POS; pl.inJail = true; pl.jailTries = 0;
  S.extra = false;
  S.moves.push({ p, from, to: JAIL_POS, walk: false, steps: 0 });
  say(S, pl.name + ' foi para a Cadeia.');
}

function landOn(S, p) {
  const pl = S.players[p], sq = pl.pos, s = SQUARES[sq];
  switch (s.t) {
    case 'prop': case 'comp': {
      const pr = S.props[sq];
      if (pr.o === null) {
        S.pending = { sq };
      } else if (pr.o !== p) {
        if (pr.m) { say(S, s.n + ' está hipotecada: ' + pl.name + ' não paga aluguel.'); break; }
        const r = rentFor(S, sq);
        say(S, pl.name + ' pagou ' + fmt(r) + ' de aluguel a ' + S.players[pr.o].name + ' (' + s.n + ').');
        charge(S, p, r, pr.o);
      }
      break;
    }
    case 'tax':
      say(S, pl.name + ' pagou ' + s.n + ': ' + fmt(s.a) + '.');
      charge(S, p, s.a, null);
      break;
    case 'gain':
      pl.money += s.a;
      say(S, pl.name + ' recebeu ' + fmt(s.a) + ' de ' + s.n + '.');
      break;
    case 'card': drawCard(S, p); break;
    case 'gojail': say(S, pl.name + ' caiu em "Vá para a Cadeia".'); goJail(S, p); break;
    case 'free':
      if (FERIAS_PERDE_RODADA) {
        pl.skip = 1; S.extra = false;
        say(S, pl.name + ' está de férias e perde a próxima rodada.');
      }
      break;
  }
}

function drawCard(S, p) {
  const pl = S.players[p];
  const id = S.deck.shift();
  const c = CARDS[id];
  if (c.t !== 'jailFree') S.deck.push(id);
  evt(S, 'card', c.k, c.x, p);
  say(S, pl.name + ' tirou ' + c.k + ': ' + c.x);
  switch (c.t) {
    case 'gain': pl.money += c.a; break;
    case 'lose': charge(S, p, c.a, null); break;
    case 'goto': walk(S, p, ((c.to - pl.pos + 40) % 40) || 40); landOn(S, p); break;
    case 'back': walk(S, p, -c.n); landOn(S, p); break;
    case 'goJail': goJail(S, p); break;
    case 'jailFree': pl.jailCards++; break;
    case 'collectEach':
      S.players.forEach((o, i) => {
        if (i === p || o.bankrupt) return;
        const x = Math.min(o.money, c.a);
        o.money -= x; pl.money += x;
      });
      break;
    case 'payEach': {
      const n = active(S).length - 1;
      charge(S, p, c.a * n, 'each', c.a);
      break;
    }
    case 'repairs': {
      let tot = 0;
      Object.keys(S.props).forEach(i => {
        const pr = S.props[i];
        if (pr.o === p && pr.h > 0) tot += pr.h >= 5 ? c.hotel : pr.h * c.house;
      });
      if (tot > 0) charge(S, p, tot, null); else say(S, pl.name + ' não tem construções e não paga nada.');
      break;
    }
  }
}

// Define a fase seguinte conforme o que ficou pendente
function settle(S) {
  if (S.winner !== null) return;
  if (S.pending) { S.phase = 'buy'; return; }
  if (S.debt) { S.phase = 'debt'; return; }
  S.phase = S.extra ? 'roll' : 'end';
}

function nextTurn(S) {
  let n = S.turn;
  for (let i = 0; i < S.players.length; i++) {
    n = (n + 1) % S.players.length;
    const pl = S.players[n];
    if (pl.bankrupt) continue;
    if (pl.skip > 0) { pl.skip--; say(S, pl.name + ' está de férias e perde a vez.'); continue; }
    break;
  }
  if (S.players[n].bankrupt) n = S.players.findIndex(p => !p.bankrupt);
  S.turn = n; S.phase = 'roll'; S.doubles = 0; S.extra = false; S.pending = null; S.debt = null;
}

function doRoll(S, p) {
  const pl = S.players[p];
  S.dice = [1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)];
  S.rollId++;
  const d1 = S.dice[0], d2 = S.dice[1], sum = d1 + d2, dbl = d1 === d2;
  say(S, pl.name + ' tirou ' + d1 + ' e ' + d2 + '.');

  if (pl.inJail) {
    S.extra = false;
    if (dbl) {
      pl.inJail = false; pl.jailTries = 0;
      say(S, pl.name + ' tirou dupla e saiu da Cadeia.');
      walk(S, p, sum); landOn(S, p);
    } else {
      pl.jailTries++;
      if (pl.jailTries >= 3) {
        pl.inJail = false; pl.jailTries = 0;
        say(S, pl.name + ' pagou a fiança de ' + fmt(JAIL_FINE) + ' após 3 tentativas.');
        if (charge(S, p, JAIL_FINE, null)) { walk(S, p, sum); landOn(S, p); }
        else S.debt.then = { walk: sum };
      } else {
        say(S, pl.name + ' continua na Cadeia (tentativa ' + pl.jailTries + ' de 3).');
      }
    }
    settle(S);
    return;
  }

  if (dbl) {
    S.doubles++;
    if (S.doubles >= 3) {
      say(S, pl.name + ' tirou três duplas seguidas e vai para a Cadeia.');
      goJail(S, p); settle(S);
      return;
    }
    S.extra = true;
  } else {
    S.doubles = 0; S.extra = false;
  }
  walk(S, p, sum);
  landOn(S, p);
  settle(S);
}

/* ---- falência ---- */
function bankrupt(S, p, to) {
  const pl = S.players[p];
  say(S, pl.name + ' saiu da partida' + (typeof to === 'number' ? ' e entregou tudo a ' + S.players[to].name : '') + '.');
  Object.keys(S.props).forEach(i => {
    const pr = S.props[i];
    if (pr.o !== p) return;
    pr.h = 0;
    if (typeof to === 'number') pr.o = to; else { pr.o = null; pr.m = false; }
  });
  if (typeof to === 'number') {
    S.players[to].money += pl.money;
    S.players[to].jailCards += pl.jailCards;
  } else {
    for (let i = 0; i < pl.jailCards; i++) S.deck.push(JAIL_CARD);
  }
  pl.money = 0; pl.jailCards = 0; pl.bankrupt = true; pl.inJail = false;
  if (S.trade && (S.trade.from === p || S.trade.to === p)) S.trade = null;
  const left = active(S);
  if (left.length <= 1) {
    S.winner = left[0].id; S.phase = 'over'; S.pending = null; S.debt = null;
    say(S, left[0].name + ' venceu a partida!');
    evt(S, 'win', 'Vitória', left[0].name + ' venceu!', left[0].id);
    return;
  }
  if (S.turn === p) nextTurn(S);
}

/* ---- validações de gestão de imóveis ---- */
function chkBuild(S, p, sq) {
  const s = SQUARES[sq], pr = S.props[sq];
  if (!s || s.t !== 'prop' || !pr) return 'Só é possível construir em terrenos.';
  if (pr.o !== p) return 'O terreno não é seu.';
  if (!groupOwned(S, p, s.g)) return 'É preciso ter todos os terrenos da cor.';
  const gs = GROUP_SQ[s.g];
  if (gs.some(i => S.props[i].m)) return 'Há terreno hipotecado neste grupo.';
  if (pr.h >= 5) return 'Este terreno já tem hotel.';
  if (gs.some(i => S.props[i].h < pr.h)) return 'Construa de forma uniforme no grupo.';
  if (S.players[p].money < GROUPS[s.g].h) return 'Saldo insuficiente.';
  return null;
}
function chkSell(S, p, sq) {
  const s = SQUARES[sq], pr = S.props[sq];
  if (!s || s.t !== 'prop' || !pr || pr.o !== p) return 'O terreno não é seu.';
  if (pr.h <= 0) return 'Não há construções para vender.';
  if (GROUP_SQ[s.g].some(i => S.props[i].h > pr.h)) return 'Venda de forma uniforme no grupo.';
  return null;
}
function chkMortgage(S, p, sq) {
  const s = SQUARES[sq], pr = S.props[sq];
  if (!s || !pr || pr.o !== p) return 'O imóvel não é seu.';
  if (pr.m) return 'Já está hipotecado.';
  if (s.t === 'prop' && GROUP_SQ[s.g].some(i => S.props[i].h > 0)) return 'Venda as construções do grupo primeiro.';
  return null;
}
function chkUnmortgage(S, p, sq) {
  const pr = S.props[sq];
  if (!pr || pr.o !== p) return 'O imóvel não é seu.';
  if (!pr.m) return 'Não está hipotecado.';
  if (S.players[p].money < unmortgageCost(sq)) return 'Saldo insuficiente.';
  return null;
}

/* ---- negociação ---- */
const cleanList = l => Array.isArray(l) ? [...new Set(l.map(Number).filter(n => Number.isInteger(n) && n >= 0 && n < 40))] : [];
const cleanMoney = m => { m = Math.floor(Number(m)); return Number.isFinite(m) && m > 0 ? m : 0; };

function tradeCheck(S, t) {
  const A = S.players[t.from], B = S.players[t.to];
  if (!A || !B || A.bankrupt || B.bankrupt || t.from === t.to) return 'Jogador inválido.';
  if (!t.give.props.length && !t.give.money && !t.get.props.length && !t.get.money) return 'A proposta está vazia.';
  const chk = (list, owner) => {
    for (const sq of list) {
      const pr = S.props[sq], s = SQUARES[sq];
      if (!pr || pr.o !== owner) return 'Um dos imóveis não pertence a quem foi indicado.';
      if (s.t === 'prop' && GROUP_SQ[s.g].some(i => S.props[i].h > 0)) return 'Há construções no grupo de ' + s.n + '.';
    }
    return null;
  };
  return chk(t.give.props, t.from) || chk(t.get.props, t.to) ||
    (t.give.money > A.money ? A.name + ' não tem esse dinheiro.' : null) ||
    (t.get.money > B.money ? B.name + ' não tem esse dinheiro.' : null);
}

/* ---- ação do jogador (único ponto de entrada do motor) ---- */
const TURN_ACTIONS = new Set(['roll', 'buy', 'skipBuy', 'endTurn', 'payDebt', 'bankrupt', 'jailPay', 'jailCard',
  'build', 'sell', 'mortgage', 'unmortgage', 'tradePropose']);

// Retorna null se deu certo, ou um texto com o motivo do erro.
function act(S, actor, a) {
  if (!a || typeof a.type !== 'string') return 'Ação inválida.';
  if (S.winner !== null) return 'A partida já terminou.';
  const pl = S.players[actor];
  if (!pl || pl.bankrupt) return 'Você não está mais na partida.';
  if (TURN_ACTIONS.has(a.type) && actor !== S.turn) return 'Não é a sua vez.';
  S.moves = [];
  const p = actor;
  const sq = Number(a.sq);

  switch (a.type) {
    case 'roll':
      if (S.phase !== 'roll') return 'Agora não dá para jogar os dados.';
      if (S.trade) return 'Responda à negociação pendente antes.';
      doRoll(S, p);
      return null;

    case 'buy': {
      if (S.phase !== 'buy' || !S.pending) return 'Não há nada para comprar.';
      const q = S.pending.sq, price = SQUARES[q].p;
      if (pl.money < price) return 'Saldo insuficiente. Hipoteque ou venda imóveis.';
      pl.money -= price; S.props[q].o = p; S.pending = null;
      say(S, pl.name + ' comprou ' + SQUARES[q].n + ' por ' + fmt(price) + '.');
      settle(S);
      return null;
    }

    case 'skipBuy':
      if (S.phase !== 'buy' || !S.pending) return 'Não há nada para comprar.';
      say(S, pl.name + ' não comprou ' + SQUARES[S.pending.sq].n + '.');
      S.pending = null; settle(S);
      return null;

    case 'endTurn':
      if (S.phase !== 'end') return 'Ainda não dá para encerrar o turno.';
      if (S.trade) return 'Responda à negociação pendente antes.';
      nextTurn(S);
      return null;

    case 'payDebt': {
      const d = S.debt;
      if (S.phase !== 'debt' || !d) return 'Não há dívida para pagar.';
      if (pl.money < d.amount) return 'Saldo insuficiente. Hipoteque ou venda imóveis.';
      pl.money -= d.amount;
      if (typeof d.to === 'number') S.players[d.to].money += d.amount;
      else if (d.to === 'each') S.players.forEach((o, i) => { if (i !== p && !o.bankrupt) o.money += d.each; });
      say(S, pl.name + ' pagou a dívida de ' + fmt(d.amount) + '.');
      S.debt = null;
      if (d.then) { walk(S, p, d.then.walk); landOn(S, p); }
      settle(S);
      return null;
    }

    case 'bankrupt': {
      if (S.phase !== 'debt' || !S.debt) return 'Só é possível declarar falência diante de uma dívida.';
      bankrupt(S, p, typeof S.debt.to === 'number' ? S.debt.to : null);
      return null;
    }

    case 'quit':
      bankrupt(S, p, null);
      return null;

    case 'jailPay':
      if (S.phase !== 'roll' || !pl.inJail) return 'Você não está na Cadeia.';
      if (pl.money < JAIL_FINE) return 'Saldo insuficiente.';
      pl.money -= JAIL_FINE; pl.inJail = false; pl.jailTries = 0;
      say(S, pl.name + ' pagou ' + fmt(JAIL_FINE) + ' e saiu da Cadeia.');
      return null;

    case 'jailCard':
      if (S.phase !== 'roll' || !pl.inJail) return 'Você não está na Cadeia.';
      if (pl.jailCards < 1) return 'Você não tem carta de saída.';
      pl.jailCards--; S.deck.push(JAIL_CARD); pl.inJail = false; pl.jailTries = 0;
      say(S, pl.name + ' usou a carta e saiu da Cadeia.');
      return null;

    case 'build': {
      const e = chkBuild(S, p, sq); if (e) return e;
      const s = SQUARES[sq], pr = S.props[sq];
      pl.money -= GROUPS[s.g].h; pr.h++;
      say(S, pl.name + ' construiu ' + (pr.h >= 5 ? 'um hotel' : 'uma casa') + ' em ' + s.n + '.');
      return null;
    }
    case 'sell': {
      const e = chkSell(S, p, sq); if (e) return e;
      const s = SQUARES[sq], pr = S.props[sq];
      pl.money += GROUPS[s.g].h / 2; pr.h--;
      say(S, pl.name + ' vendeu uma construção de ' + s.n + '.');
      return null;
    }
    case 'mortgage': {
      const e = chkMortgage(S, p, sq); if (e) return e;
      pl.money += SQUARES[sq].p / 2; S.props[sq].m = true;
      say(S, pl.name + ' hipotecou ' + SQUARES[sq].n + '.');
      return null;
    }
    case 'unmortgage': {
      const e = chkUnmortgage(S, p, sq); if (e) return e;
      pl.money -= unmortgageCost(sq); S.props[sq].m = false;
      say(S, pl.name + ' resgatou ' + SQUARES[sq].n + '.');
      return null;
    }

    case 'tradePropose': {
      if (S.trade) return 'Já existe uma proposta pendente.';
      if (S.phase !== 'roll' && S.phase !== 'end') return 'Termine a jogada atual antes de negociar.';
      const t = {
        from: p, to: Number(a.to),
        give: { props: cleanList(a.give && a.give.props), money: cleanMoney(a.give && a.give.money) },
        get: { props: cleanList(a.get && a.get.props), money: cleanMoney(a.get && a.get.money) }
      };
      const e = tradeCheck(S, t); if (e) return e;
      S.trade = t;
      say(S, pl.name + ' fez uma proposta a ' + S.players[t.to].name + '.');
      return null;
    }
    case 'tradeAccept': {
      const t = S.trade;
      if (!t || t.to !== actor) return 'Não há proposta para você.';
      const e = tradeCheck(S, t);
      if (e) { say(S, 'A proposta caiu: ' + e); S.trade = null; return null; }
      const A = S.players[t.from], B = S.players[t.to];
      t.give.props.forEach(q => { S.props[q].o = t.to; });
      t.get.props.forEach(q => { S.props[q].o = t.from; });
      A.money += t.get.money - t.give.money;
      B.money += t.give.money - t.get.money;
      S.trade = null;
      say(S, B.name + ' aceitou a proposta de ' + A.name + '.');
      return null;
    }
    case 'tradeReject': {
      const t = S.trade;
      if (!t || t.to !== actor) return 'Não há proposta para você.';
      say(S, pl.name + ' recusou a proposta de ' + S.players[t.from].name + '.');
      S.trade = null;
      return null;
    }
    case 'tradeCancel': {
      const t = S.trade;
      if (!t || t.from !== actor) return 'Você não tem proposta pendente.';
      S.trade = null;
      say(S, pl.name + ' cancelou a proposta.');
      return null;
    }
  }
  return 'Ação desconhecida.';
}

// Decisão simples para jogadores desconectados (o anfitrião joga por eles)
function autoAction(S) {
  const p = S.turn, pl = S.players[p];
  switch (S.phase) {
    case 'roll': return pl.inJail && pl.jailCards > 0 ? { type: 'jailCard' } : { type: 'roll' };
    case 'buy': return pl.money - SQUARES[S.pending.sq].p >= 300 * K ? { type: 'buy' } : { type: 'skipBuy' };
    case 'debt': {
      if (pl.money >= S.debt.amount) return { type: 'payDebt' };
      for (const i of Object.keys(S.props)) if (S.props[i].o === p && S.props[i].h > 0 && !chkSell(S, p, +i)) return { type: 'sell', sq: +i };
      for (const i of Object.keys(S.props)) if (S.props[i].o === p && !chkMortgage(S, p, +i)) return { type: 'mortgage', sq: +i };
      return { type: 'bankrupt' };
    }
    default: return { type: 'endTurn' };
  }
}

if (typeof module !== 'undefined') {
  module.exports = { SQUARES, GROUPS, GROUP_SQ, CARDS, START_MONEY, JAIL_FINE, newGame, act, autoAction, chkBuild, chkSell, chkMortgage, chkUnmortgage, rentFor, fmt };
}

/* ========================== 3) INTERFACE ========================== */
(function () {
  if (typeof document === 'undefined') return;

  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const PREFIX = 'bimob-';
  // STUN ajuda a conectar celular e computador em redes diferentes; TURN é o plano B (relay) quando o roteador/4G bloqueia a conexão direta.
  const ICE = { iceServers: [
    { urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }, { urls: 'stun:global.stun.twilio.com:3478' },
    { urls: ['turn:openrelay.metered.ca:80', 'turn:openrelay.metered.ca:443', 'turn:openrelay.metered.ca:443?transport=tcp'], username: 'openrelayproject', credential: 'openrelayproject' }
  ] };

  let mode = null;          // 'local' | 'host' | 'client'
  let G = null;             // estado oficial (local e anfitrião)
  let V = null;             // estado exibido na tela
  let myIdx = 0;            // índice do jogador neste aparelho (online)
  const net = { peer: null, conn: null, code: '', lobby: [], byIdx: {}, tok: {} };
  let lastRx = 0;
  const ui = { queue: [], busy: false, disp: [], lastRoll: 0, lastEvent: 0, user: null, trade: null, built: false };
  let cells = [], tokEl = [], shownKey = null, toastT = null, autoT = null, localN = 2, localNames = [];

  const viewer = () => (mode === 'local' ? V.turn : myIdx);
  const canAct = () => !!V && !ui.busy && V.winner === null && !V.players[viewer()].bankrupt && V.turn === viewer();
  const tradeFor = () => (!V || !V.trade) ? null : (mode === 'local' ? V.trade : (V.trade.to === myIdx ? V.trade : null));

  /* ---------- telas ---------- */
  function show(name) {
    $$('.screen').forEach(s => s.classList.toggle('active', s.id === 'screen-' + name));
    window.scrollTo(0, 0);
  }
  function toast(html, ms, cls) {
    const t = $('#toast');
    t.className = cls || '';
    t.innerHTML = html;
    void t.offsetWidth;
    t.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.remove('show'), ms || 2800);
  }
  const goHome = () => { location.href = location.pathname; };

  /* confirmação própria: o confirm() do navegador falha em prévias/iframes/alguns celulares e devolve "não" sem avisar */
  let confirmCb = null;
  function askConfirm(msg, yes, label) {
    $('#confirmMsg').textContent = msg;
    $('#confirmYes').textContent = label || 'Confirmar';
    confirmCb = yes;
    $('#confirmBox').hidden = false;
    $('#confirmNo').focus();
  }
  function closeConfirm() { $('#confirmBox').hidden = true; confirmCb = null; }
  $('#confirmNo').addEventListener('click', closeConfirm);
  $('#confirmYes').addEventListener('click', () => { const cb = confirmCb; closeConfirm(); if (cb) cb(); });
  $('#confirmBox').addEventListener('click', e => { if (e.target.id === 'confirmBox') closeConfirm(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#confirmBox').hidden) closeConfirm(); });

  $$('[data-go]').forEach(b => b.addEventListener('click', () => {
    if (b.dataset.go === 'menu') {
      if (net.peer) { try { net.peer.destroy(); } catch (e) { /* ok */ } net.peer = null; }
      show('menu');
    }
  }));
  $('#btnOnline').addEventListener('click', () => {
    $('#onName').value = localStorage.getItem('bi_name') || '';
    show('online');
  });
  $('#btnLocal').addEventListener('click', () => { renderLocalSetup(); show('local'); });

  /* ---------- modo local ---------- */
  function renderLocalSetup() {
    $('#nVal').textContent = localN;
    $('#localNames').innerHTML = Array.from({ length: localN }, (_, i) =>
      `<label><span class="dot" style="background:${COLORS[i]}"></span><input maxlength="14" data-n="${i}" placeholder="Jogador ${i + 1}" value="${esc(localNames[i] || '')}"></label>`).join('');
  }
  $('#localNames').addEventListener('input', e => { if (e.target.dataset.n !== undefined) localNames[+e.target.dataset.n] = e.target.value; });
  $('#nMinus').addEventListener('click', () => { if (localN > 2) { localN--; renderLocalSetup(); } });
  $('#nPlus').addEventListener('click', () => { if (localN < 8) { localN++; renderLocalSetup(); } });
  $('#btnLocalStart').addEventListener('click', () => {
    const infos = Array.from({ length: localN }, (_, i) => ({ name: (localNames[i] || '').trim() || 'Jogador ' + (i + 1), color: COLORS[i] }));
    mode = 'local';
    G = newGame(infos);
    enterGame();
    publish();
  });

  /* ---------- modo online: sala ---------- */
  const setStatus = t => { $('#onStatus').textContent = t || ''; };
  const cleanName = n => String(n || '').replace(/\s+/g, ' ').trim().slice(0, 14);
  const genCode = () => Array.from({ length: 5 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('');

  function needPeer() {
    if (typeof Peer === 'undefined') { setStatus('A biblioteca de conexão (PeerJS) não carregou. Verifique a internet e recarregue a página.'); return false; }
    return true;
  }

  $('#btnCreate').addEventListener('click', () => {
    const name = cleanName($('#onName').value);
    if (!name) return setStatus('Digite seu nome para criar a sala.');
    if (!needPeer()) return;
    localStorage.setItem('bi_name', name);
    setStatus('Criando sala…');
    createRoom(name, 0);
  });

  function createRoom(name, attempt) {
    const code = genCode();
    const peer = new Peer(PREFIX + code, { config: ICE });
    let opened = false;
    net.peer = peer;
    peer.on('open', () => {
      opened = true;
      net.code = code; mode = 'host'; myIdx = 0; G = null;
      net.lobby = [{ name, conn: null, tok: '' }]; net.byIdx = {}; net.tok = {};
      show('lobby');
      broadcastLobby();
    });
    peer.on('connection', onHostConn);
    peer.on('disconnected', () => { setTimeout(() => { if (net.peer === peer && peer.disconnected) { try { peer.reconnect(); } catch (e) { /* ok */ } } }, 1000); });
    peer.on('error', e => {
      if (!opened && e.type === 'unavailable-id' && attempt < 5) { peer.destroy(); createRoom(name, attempt + 1); return; }
      if (!opened) setStatus('Não foi possível criar a sala (' + e.type + ').');
      else toast('Problema de conexão: ' + e.type);
    });
  }

  function lobbyList() { return net.lobby.map((e, i) => ({ name: e.name, color: COLORS[i] })); }
  function broadcastLobby() {
    const list = lobbyList();
    net.lobby.forEach((e, i) => { if (e.conn && e.conn.open) e.conn.send({ t: 'lobby', list, you: i, code: net.code }); });
    renderLobby(list, 0);
  }
  function renderLobby(list, you) {
    show('lobby');
    $('#roomCode').textContent = net.code;
    $('#lobbyList').innerHTML = list.map((p, i) =>
      `<li><span class="dot" style="background:${p.color}"></span>${esc(p.name)}${i === you ? ' (você)' : ''}<em>${i === 0 ? 'anfitrião' : ''}</em></li>`).join('');
    const host = mode === 'host';
    $('#btnStartOnline').hidden = !host;
    $('#btnStartOnline').disabled = list.length < 2;
    $('#btnCopy').hidden = !host;
    $('#lobbyHint').textContent = host
      ? (list.length < 2 ? 'Aguardando jogadores… (mínimo 2, máximo 8)' : list.length + ' jogadores na sala. Quando todos chegarem, inicie a partida.')
      : 'Aguardando o anfitrião iniciar a partida…';
  }
  $('#btnCopy').addEventListener('click', async () => {
    const link = location.origin + location.pathname + '?sala=' + net.code;
    try { await navigator.clipboard.writeText(link); toast('Link copiado!'); }
    catch (e) { window.prompt('Copie o link da sala:', link); }
  });
  $('#btnLeave').addEventListener('click', goHome);
  $('#btnStartOnline').addEventListener('click', () => {
    if (mode !== 'host' || net.lobby.length < 2) return;
    G = newGame(net.lobby.map((e, i) => ({ name: e.name, color: COLORS[i] })));
    net.byIdx = {}; net.tok = {};
    net.lobby.forEach((e, i) => { if (e.conn) { e.conn.bi = i; net.byIdx[i] = e.conn; net.tok[i] = e.tok; } });
    enterGame();
    publish();
  });

  // ----- anfitrião: conexões -----
  function onHostConn(conn) {
    conn.on('data', m => onHostMsg(conn, m));
    conn.on('close', () => onHostClose(conn));
    conn.on('error', () => onHostClose(conn));
  }
  function uniqueName(name) {
    const names = (G ? G.players.map(p => p.name) : net.lobby.map(e => e.name)).map(n => n.toLowerCase());
    let n = name, k = 2;
    while (names.includes(n.toLowerCase())) n = name.slice(0, 12) + k++;
    return n;
  }
  function onHostMsg(conn, m) {
    if (!m || typeof m !== 'object') return;
    if (m.t === 'ping') { if (conn.open) conn.send({ t: 'pong' }); return; }
    if (m.t === 'join') {
      const name = cleanName(m.name);
      const tok = String(m.tok || '').slice(0, 40);
      if (!name) { conn.send({ t: 'err', msg: 'Nome inválido.', fatal: true }); return; }
      if (!G) {
        if (net.lobby.length >= 8) { conn.send({ t: 'err', msg: 'Sala cheia (máximo de 8 jogadores).', fatal: true }); return; }
        net.lobby.push({ name: uniqueName(name), conn, tok });
        broadcastLobby();
      } else {
        // volta para a partida: mesmo nome + mesma "chave" do aparelho (ou jogador já marcado como desconectado)
        const idx = G.players.findIndex(p => p.name.toLowerCase() === name.toLowerCase() && !p.bankrupt);
        const same = idx >= 0 && net.tok[idx] && net.tok[idx] === tok;
        if (idx < 0 || (!same && G.players[idx].connected)) { conn.send({ t: 'err', msg: 'A partida já começou nesta sala.', fatal: true }); return; }
        const pl = G.players[idx], old = net.byIdx[idx];
        if (old && old !== conn) { old.bi = undefined; try { old.close(); } catch (e) { /* ok */ } }
        pl.connected = true; pl.auto = false; conn.bi = idx; net.byIdx[idx] = conn;
        say(G, pl.name + ' voltou para a partida.');
        publish();
      }
    } else if (m.t === 'action') {
      const idx = conn.bi;
      if (!G || idx === undefined || net.byIdx[idx] !== conn) return;
      const err = act(G, idx, m.a);
      if (err) conn.send({ t: 'err', msg: err }); else publish();
    }
  }
  function onHostClose(conn) {
    if (!G) {
      const n = net.lobby.length;
      net.lobby = net.lobby.filter(e => e.conn !== conn);
      if (net.lobby.length !== n) broadcastLobby();
      return;
    }
    const i = conn.bi;
    if (i === undefined || net.byIdx[i] !== conn) return;
    const pl = G.players[i];
    if (!pl.connected || pl.bankrupt) return;
    pl.connected = false; pl.auto = true;
    say(G, pl.name + ' desconectou. O jogo joga por ele até a volta.');
    publish();
  }

  // ----- convidado -----
  $('#btnJoin').addEventListener('click', () => {
    const name = cleanName($('#onName').value);
    const code = $('#onCode').value.trim().toUpperCase();
    if (!name) return setStatus('Digite seu nome.');
    if (code.length !== 5) return setStatus('O código da sala tem 5 caracteres.');
    if (!needPeer()) return;
    localStorage.setItem('bi_name', name);
    setStatus('Conectando…');
    session = { name, code, tok: deviceTok() };
    openSession(session, msg => { setStatus(msg); show('online'); });
  });

  let session = null;      // dados para reconectar sozinho se a conexão cair
  let rejoining = false;
  const banner = on => { $('#netBanner').hidden = !on; };
  function deviceTok() {
    let t = sessionStorage.getItem('bi_tok');
    if (!t) { t = Math.random().toString(36).slice(2) + Date.now().toString(36); sessionStorage.setItem('bi_tok', t); }
    return t;
  }

  function openSession(s, onFail) {
    if (net.peer) { try { net.peer.destroy(); } catch (e) { /* ok */ } }
    let connected = false, over = false;
    const peer = new Peer(undefined, { config: ICE });
    net.peer = peer; net.code = s.code;
    const fail = (msg, fatal) => {
      if (connected || over) return;
      over = true; clearTimeout(to);
      try { peer.destroy(); } catch (e) { /* ok */ }
      onFail(msg, fatal);
    };
    const to = setTimeout(() => fail('Não foi possível conectar. Confira o código e tente de novo.'), 15000);
    peer.on('open', () => {
      const conn = peer.connect(PREFIX + s.code, { reliable: true, serialization: 'json' });
      net.conn = conn;
      conn.on('open', () => conn.send({ t: 'join', name: s.name, tok: s.tok }));
      conn.on('data', m => {
        lastRx = Date.now();
        if (!connected && m && (m.t === 'lobby' || m.t === 'state')) { connected = true; clearTimeout(to); rejoining = false; banner(false); }
        onClientMsg(m, fail);
      });
      conn.on('close', () => {
        if (connected) { if (net.conn === conn) connectionLost(); }
        else fail('A sala foi fechada ou não existe.');
      });
    });
    peer.on('error', e => {
      if (connected) toast('Problema de conexão: ' + e.type);
      else fail(e.type === 'peer-unavailable' ? 'Sala não encontrada. Confira o código.' : 'Erro de conexão (' + e.type + ').');
    });
  }
  function onClientMsg(m, fail) {
    if (!m || typeof m !== 'object') return;
    if (m.t === 'lobby') { mode = 'client'; myIdx = m.you; net.code = m.code; renderLobby(m.list, m.you); }
    else if (m.t === 'state') {
      mode = 'client'; myIdx = m.you;
      if (!ui.built || (!V && !ui.queue.length)) enterGame();
      pushState(m.s);
    }
    else if (m.t === 'err') { if (m.fatal) fail(m.msg, true); else toast(m.msg); }
  }
  function lostModal(msg) {
    ui.user = null;
    $('#modal').hidden = false; shownKey = 'lost';
    $('#modalX').hidden = true;
    $('#modalBody').innerHTML = `<h3>Conexão perdida</h3><p>${esc(msg)}</p><div class="row"><button class="primary" data-do="home">Voltar ao menu</button></div>`;
  }
  // Conexão caiu (comum no celular ao bloquear a tela): tenta voltar sozinho para a mesma vaga
  function connectionLost() {
    if (rejoining || !session) return;
    if (!V) { show('online'); setStatus('A sala foi fechada pelo anfitrião.'); return; }
    rejoining = true; banner(true);
    tryRejoin(0);
  }
  function tryRejoin(n) {
    if (!rejoining) return;
    if (n >= 20) { rejoining = false; banner(false); lostModal('Não foi possível reconectar à sala. O anfitrião pode ter saído.'); return; }
    openSession(session, (msg, fatal) => {
      if (fatal) { rejoining = false; banner(false); lostModal(msg); }
      else setTimeout(() => tryRejoin(n + 1), 2500);
    });
  }
  // batimento: detecta conexão "morta" e mantém a sala viva
  setInterval(() => {
    if (mode !== 'client' || rejoining || !V) return;
    if (net.conn && net.conn.open) net.conn.send({ t: 'ping' });
    if (Date.now() - lastRx > 25000) { try { net.conn.close(); } catch (e) { /* ok */ } connectionLost(); }
  }, 8000);
  let wl = null;
  async function wakeLock() {
    try { if ('wakeLock' in navigator && !document.hidden) wl = await navigator.wakeLock.request('screen'); } catch (e) { /* ok */ }
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) return;
    if (ui.built) wakeLock();
    if (mode === 'client' && V && !rejoining && (!(net.conn && net.conn.open) || Date.now() - lastRx > 25000)) { try { net.conn.close(); } catch (e) { /* ok */ } connectionLost(); }
    if (mode === 'host' && net.peer && net.peer.disconnected) { try { net.peer.reconnect(); } catch (e) { /* ok */ } }
  });

  /* ---------- envio de ações ---------- */
  function localActor(a) {
    if ((a.type === 'tradeAccept' || a.type === 'tradeReject') && G.trade) return G.trade.to;
    return G.turn;
  }
  function dispatch(a) {
    if (ui.busy && a.type !== 'quit') { toast('Aguarde a jogada terminar.'); return 'busy'; }
    if (mode === 'client') {
      if (net.conn && net.conn.open) { net.conn.send({ t: 'action', a }); return null; }
      toast('Sem conexão com a sala.'); return 'offline';
    }
    const err = act(G, mode === 'local' ? localActor(a) : myIdx, a);
    if (err) { toast(err); return err; }
    publish();
    return null;
  }
  function publish() {
    G.seq++;
    if (mode === 'host') Object.keys(net.byIdx).forEach(i => { const c = net.byIdx[i]; if (c && c.open) c.send({ t: 'state', s: G, you: +i }); });
    pushState(G);
    if (mode === 'host') scheduleAuto();
  }
  function scheduleAuto() {
    clearTimeout(autoT);
    if (!G || G.winner !== null) return;
    const tradeBot = G.trade && G.players[G.trade.to].auto;
    const turnBot = G.players[G.turn].auto && !G.players[G.turn].bankrupt;
    if (!tradeBot && !turnBot) return;
    autoT = setTimeout(() => {
      if (tradeBot) act(G, G.trade.to, { type: 'tradeReject' });
      else if (act(G, G.turn, autoAction(G))) act(G, G.turn, { type: 'quit' });
      publish();
    }, 1200);
  }

  /* ---------- tabuleiro ---------- */
  function gridPos(i) {
    if (i <= 10) return [11 - i, 11];
    if (i <= 20) return [1, 11 - (i - 10)];
    if (i <= 30) return [1 + (i - 20), 1];
    return [11, 1 + (i - 30)];
  }
  const colC = c => c === 1 ? 6.25 : c === 11 ? 93.75 : 12.5 + (c - 2) * (75 / 9) + (75 / 18);
  const sideOf = i => (i % 10 === 0) ? 'corner' : i < 10 ? 'bottom' : i < 20 ? 'left' : i < 30 ? 'top' : 'right';
  const money$ = n => '$' + n.toLocaleString('pt-BR');

  function cellInner(i) {
    const s = SQUARES[i];
    switch (s.t) {
      case 'prop': return `<div class="band" style="background:${GROUPS[s.g].c}"></div><div class="inf"><b>${esc(s.n)}</b><i>${money$(s.p)}</i></div>`;
      case 'comp': return `<div class="inf"><span class="ic">${s.icon}</span><b>${esc(s.n)}</b><i>${money$(s.p)}</i></div>`;
      case 'card': return `<div class="inf"><span class="ic big">❓</span><b>Sorte ou Revés</b></div>`;
      case 'tax': return `<div class="inf"><span class="ic">💸</span><b>${esc(s.n)}</b><i>Pague ${money$(s.a)}</i></div>`;
      case 'gain': return `<div class="inf"><span class="ic">💰</span><b>${esc(s.n)}</b><i>Receba ${money$(s.a)}</i></div>`;
      case 'start': return `<span class="ic big">🏁</span><b>Início</b><i>Receba ${money$(SALARY)}</i>`;
      case 'jail': return `<span class="ic big">⛓️</span><b>Cadeia</b><i>Visitas</i>`;
      case 'free': return `<span class="ic big">🏝️</span><b>Férias</b>`;
      case 'gojail': return `<span class="ic big">🚓</span><b>Vá para a Cadeia</b>`;
    }
    return '';
  }

  function buildBoard() {
    const b = $('#board');
    b.innerHTML = '';
    cells = [];
    SQUARES.forEach((s, i) => {
      const [c, r] = gridPos(i);
      const d = document.createElement('div');
      d.className = 'cell ' + sideOf(i) + ' t-' + s.t;
      d.style.gridColumn = c; d.style.gridRow = r; d.dataset.i = i;
      d.innerHTML = cellInner(i);
      b.appendChild(d); cells[i] = d;
    });
    const ctr = document.createElement('div');
    ctr.id = 'center';
    ctr.innerHTML = `
      <svg class="sky" viewBox="0 0 320 110" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
        <rect x="8" y="60" width="34" height="50" fill="#e63946"/><rect x="46" y="30" width="30" height="80" fill="#ffc83d"/>
        <rect x="80" y="48" width="38" height="62" fill="#2ecc71"/><rect x="122" y="14" width="34" height="96" fill="#ff8c42"/>
        <rect x="160" y="40" width="36" height="70" fill="#9b59b6"/><rect x="200" y="22" width="32" height="88" fill="#2a9df4"/>
        <rect x="236" y="54" width="34" height="56" fill="#ff5fa2"/><rect x="274" y="36" width="36" height="74" fill="#00c2a8"/>
      </svg>
      <div id="turnChip"></div>
      <div class="plaque"><span>Elite</span><span>Global</span></div>
      <div id="dice"></div>
      <div id="actions"></div>`;
    b.appendChild(ctr);
    const tk = document.createElement('div');
    tk.id = 'tokens';
    b.appendChild(tk);
    ui.built = true;
  }

  const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
  const die = n => `<div class="die">${[0, 1, 2, 3, 4, 5, 6, 7, 8].map(k => `<i class="${PIPS[n].includes(k) ? 'on' : ''}"></i>`).join('')}</div>`;
  const setDice = d => { $('#dice').innerHTML = die(d[0]) + die(d[1]); };

  function makeTokens(players) {
    const tk = $('#tokens');
    tk.innerHTML = '';
    tokEl = players.map((p, i) => {
      const el = document.createElement('div');
      el.className = 'token';
      el.style.background = p.color;
      el.textContent = (p.name[0] || '?').toUpperCase();
      el.title = p.name;
      tk.appendChild(el);
      return el;
    });
  }
  function placeToken(i) {
    const el = tokEl[i];
    if (!el) return;
    const [c, r] = gridPos(ui.disp[i] || 0);
    el.style.left = colC(c) + '%';
    el.style.top = colC(r) + '%';
    el.style.marginLeft = 'calc(var(--tok) * ' + (((i % 4) - 1.5) * 0.9) + ')';
    el.style.marginTop = 'calc(var(--tok) * ' + ((Math.floor(i / 4) - 0.5) * 0.9) + ')';
  }
  function renderTokens() {
    V.players.forEach((p, i) => {
      const el = tokEl[i]; if (!el) return;
      el.hidden = p.bankrupt;
      el.classList.toggle('cur', i === V.turn && V.winner === null);
      el.classList.toggle('jailed', p.inJail);
      placeToken(i);
    });
  }
  function renderBoard() {
    cells.forEach((el, i) => {
      const pr = V.props[i];
      if (!pr) return;
      el.classList.toggle('owned', pr.o !== null);
      el.classList.toggle('mort', pr.m);
      if (pr.o !== null) el.style.setProperty('--oc', V.players[pr.o].color); else el.style.removeProperty('--oc');
      const band = el.querySelector('.band');
      if (band) band.innerHTML = pr.h >= 5 ? '<s class="htl"></s>' : '<s class="hse"></s>'.repeat(pr.h);
    });
  }

  /* ---------- fila de estados + animações ---------- */
  function pushState(S) {
    ui.queue.push(JSON.parse(JSON.stringify(S)));
    pump();
  }
  async function pump() {
    if (ui.busy) return;
    ui.busy = true;
    while (ui.queue.length) {
      const s = ui.queue.shift();
      const fast = ui.queue.length > 0;
      try { await present(s, fast); } catch (e) { console.error(e); V = s; }
    }
    ui.busy = false;
    renderAll();
  }
  async function present(s, fast) {
    if (!V) {
      makeTokens(s.players);
      s.players.forEach((p, i) => { ui.disp[i] = p.pos; });
      ui.lastRoll = s.rollId; ui.lastEvent = s.eventId || 0;
      setDice(s.dice);
      V = s; renderAll();
      return;
    }
    if (s.rollId !== ui.lastRoll) {
      ui.lastRoll = s.rollId;
      if (fast) setDice(s.dice); else await rollAnim(s.dice);
    }
    for (const m of (s.moves || [])) {
      if (m.walk && !fast) await walkAnim(m);
      else { ui.disp[m.p] = m.to; placeToken(m.p); }
    }
    s.players.forEach((p, i) => { ui.disp[i] = p.pos; });
    V = s; renderAll();
  }
  async function rollAnim(d) {
    const box = $('#dice');
    box.classList.add('rolling');
    for (let i = 0; i < 7; i++) { setDice([1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)]); await sleep(75); }
    box.classList.remove('rolling');
    setDice(d);
    await sleep(350);
  }
  async function walkAnim(m) {
    const n = Math.abs(m.steps), dir = m.steps < 0 ? -1 : 1, delay = n > 12 ? 70 : 140;
    for (let k = 1; k <= n; k++) {
      ui.disp[m.p] = (m.from + dir * k + 40) % 40;
      placeToken(m.p);
      await sleep(delay);
    }
    await sleep(120);
  }

  /* ---------- HUD ---------- */
  function renderAll() {
    if (!V) return;
    renderBoard(); renderTokens(); renderCenter(); renderHud(); renderLog();
    if (V.eventId > ui.lastEvent) {
      ui.lastEvent = V.eventId;
      const ev = V.event;
      if (ev && ev.kind === 'card') {
        toast(`<b>${esc(ev.title)}!</b>${esc(V.players[ev.who].name)} tirou: ${esc(ev.text)}`, 4600, ev.title === 'Sorte' ? 'sorte' : 'reves');
      }
    }
    syncModal();
  }

  const btn = (type, label, disabled, alt) => `<button class="act${alt ? ' alt' : ''}" data-act="${type}" ${disabled ? 'disabled' : ''}>${label}</button>`;

  function renderCenter() {
    const cur = V.players[V.turn];
    $('#turnChip').innerHTML = V.winner !== null
      ? 'Fim de jogo'
      : `<span class="dot" style="background:${cur.color}"></span>Vez de ${esc(cur.name)}${mode !== 'local' && V.turn === myIdx ? ' (você)' : ''}`;
    let h = '';
    if (V.winner === null && !ui.busy) {
      if (canAct()) {
        if (V.phase === 'roll') {
          if (cur.inJail) {
            h += `<p class="hint">Na Cadeia: tente tirar dupla (tentativa ${cur.jailTries + 1} de 3) ou saia agora.</p>`;
            h += btn('roll', '🎲 Jogar dados', !!V.trade);
            h += btn('jailPay', 'Pagar ' + fmt(JAIL_FINE), cur.money < JAIL_FINE, true);
            if (cur.jailCards > 0) h += btn('jailCard', 'Usar carta de saída', false, true);
          } else {
            h += btn('roll', '🎲 Jogar dados', !!V.trade);
          }
        } else if (V.phase === 'end') {
          h += btn('endTurn', 'Encerrar turno', !!V.trade);
        } else if (V.phase === 'buy') {
          h += '<p class="hint">Decida sobre a compra.</p>';
        } else if (V.phase === 'debt') {
          h += '<p class="hint">Você tem uma dívida a pagar.</p>';
        }
        if (V.trade && V.trade.from === V.turn && mode !== 'local') {
          h += `<p class="hint">Aguardando ${esc(V.players[V.trade.to].name)} responder à proposta…</p>` + btn('tradeCancel', 'Cancelar proposta', false, true);
        }
      } else {
        h = `<p class="hint">Aguardando ${esc(cur.name)}…</p>`;
      }
    }
    $('#actions').innerHTML = h;
  }
  function renderHud() {
    const cur = V.players[V.turn];
    const tb = $('#turnBanner');
    if (V.winner !== null) {
      const w = V.players[V.winner];
      tb.innerHTML = `<span class="dot" style="background:${w.color}"></span><div><small>Vencedor</small><b>${esc(w.name)}</b></div>`;
    } else {
      tb.innerHTML = `<span class="dot" style="background:${cur.color}"></span><div><small>Vez de</small><b>${esc(cur.name)}</b></div>` +
        (mode !== 'local' && V.turn === myIdx ? '<em>Sua vez</em>' : '');
    }
    const counts = {};
    Object.keys(V.props).forEach(i => { const o = V.props[i].o; if (o !== null) counts[o] = (counts[o] || 0) + 1; });
    $('#players').innerHTML = V.players.map(p => {
      const info = p.bankrupt ? 'Fora da partida' : [
        p.inJail ? 'Na Cadeia' : '',
        p.jailCards ? 'Carta de saída ×' + p.jailCards : '',
        counts[p.id] ? counts[p.id] + (counts[p.id] > 1 ? ' imóveis' : ' imóvel') : 'Sem imóveis',
        !p.connected ? 'desconectado' : ''
      ].filter(Boolean).join(' · ');
      return `<button class="pl${p.id === V.turn && V.winner === null ? ' turn' : ''}${p.bankrupt ? ' out' : ''}" data-p="${p.id}">
        <span class="dot" style="background:${p.color}"></span>
        <span class="pn"><b>${esc(p.name)}${mode !== 'local' && p.id === myIdx ? ' (você)' : ''}</b><small>${esc(info)}</small></span>
        <span class="mn">${p.bankrupt ? '—' : fmt(p.money)}</span></button>`;
    }).join('');
  }
  function renderLog() {
    const box = $('#log');
    box.innerHTML = V.log.slice(-60).map(t => `<p>${esc(t)}</p>`).join('');
    box.scrollTop = box.scrollHeight;
  }

  $('#players').addEventListener('click', e => {
    const b = e.target.closest('[data-p]');
    if (b && V) { ui.user = { kind: 'props', p: +b.dataset.p }; syncModal(); }
  });
  $('#hudBtns').addEventListener('click', e => {
    const b = e.target.closest('[data-hud]');
    if (!b || !V) return;
    const k = b.dataset.hud;
    if (k === 'props') { ui.user = { kind: 'props', p: viewer() }; syncModal(); }
    else if (k === 'trade') openTrade();
    else if (k === 'quit') {
      if (V.winner !== null) return goHome();
      if (V.players[viewer()].bankrupt) return goHome();
      askConfirm('Seus imóveis voltam para o banco e você sai da partida.', () => dispatch({ type: 'quit' }), 'Desistir');
    }
  });
  $('#board').addEventListener('click', e => {
    const act = e.target.closest('[data-act]');
    if (act) { if (!act.disabled) dispatch({ type: act.dataset.act }); return; }
    const c = e.target.closest('.cell');
    if (c && V) { ui.user = { kind: 'cell', sq: +c.dataset.i }; syncModal(); }
  });

  /* ---------- janelas (modal) ---------- */
  const modal = $('#modal'), mBody = $('#modalBody');

  function rentTable(sq) {
    const s = SQUARES[sq];
    const row = (a, b) => `<tr><td>${a}</td><td>${b}</td></tr>`;
    let h = '<table class="rent">';
    if (s.t === 'prop') {
      h += row('Aluguel do terreno', fmt(s.r[0])) + row('Grupo completo (sem casas)', fmt(s.r[0] * 2));
      for (let i = 1; i <= 4; i++) h += row(i + (i > 1 ? ' casas' : ' casa'), fmt(s.r[i]));
      h += row('Hotel', fmt(s.r[5])) + row('Casa ou hotel custa', fmt(GROUPS[s.g].h));
    } else if (s.k === 'transp') {
      [25, 50, 100, 200].forEach((v, i) => { h += row((i + 1) + (i ? ' companhias de transporte' : ' companhia de transporte'), fmt(v * K)); });
    } else {
      h += row('Com 1 companhia de serviço', '4 × dados (' + fmt(4 * K) + ' por ponto)') + row('Com as 2 companhias', '10 × dados (' + fmt(10 * K) + ' por ponto)');
    }
    return h + row('Hipoteca', fmt(s.p / 2)) + '</table>';
  }
  const deedHead = sq => {
    const s = SQUARES[sq];
    return s.t === 'prop' ? `<div class="deedhead" style="background:${GROUPS[s.g].c}">${esc(s.n)}</div>` : `<div class="deedhead comp">${s.icon} ${esc(s.n)}</div>`;
  };
  const houseText = h => h >= 5 ? 'Hotel' : h > 0 ? h + (h > 1 ? ' casas' : ' casa') : 'Sem construções';

  function buyHTML() {
    const sq = V.pending.sq, s = SQUARES[sq], pl = V.players[V.turn];
    return `<h3>${esc(pl.name)}, quer comprar?</h3>${deedHead(sq)}${rentTable(sq)}
      <p><b>Preço: ${fmt(s.p)}</b><br>Seu saldo: ${fmt(pl.money)}</p>
      ${pl.money < s.p ? '<p class="note">Saldo insuficiente. Hipotecar ou vender construções em "Propriedades" libera dinheiro.</p>' : ''}
      <div class="row"><button class="primary" data-do="buy" ${pl.money < s.p ? 'disabled' : ''}>Comprar</button>
      <button data-do="skipBuy">Não comprar</button><button class="ghost" data-do="openProps">Propriedades</button></div>`;
  }
  function debtHTML() {
    const d = V.debt, pl = V.players[V.turn];
    const to = typeof d.to === 'number' ? V.players[d.to].name : d.to === 'each' ? 'os outros jogadores' : 'o banco';
    return `<h3>${esc(pl.name)}, você tem uma dívida</h3>
      <p>Você deve <b>${fmt(d.amount)}</b> a ${esc(to)}. Seu saldo é ${fmt(pl.money)}.</p>
      <p class="note">Hipoteque imóveis ou venda construções para levantar dinheiro. Sem saída, declare falência.</p>
      <div class="row"><button class="primary" data-do="payDebt" ${pl.money < d.amount ? 'disabled' : ''}>Pagar</button>
      <button class="ghost" data-do="openProps">Propriedades</button><button class="danger" data-do="bankrupt">Declarar falência</button></div>`;
  }
  function winHTML() {
    const w = V.players[V.winner];
    return `<div class="winner"><div class="big">🏆</div><h3>${esc(w.name)} venceu!</h3><p>Todos os outros jogadores faliram.</p>
      <div class="row" style="justify-content:center"><button class="primary" data-do="home">Voltar ao menu</button></div></div>`;
  }
  function cellModalHTML(sq) {
    const s = SQUARES[sq], pr = V.props[sq];
    if (s.t !== 'prop' && s.t !== 'comp') {
      const txt = {
        start: 'Ao passar ou parar aqui você recebe ' + fmt(SALARY) + '.',
        jail: 'Quem só está de passagem apenas visita. Quem foi preso sai pagando ' + fmt(JAIL_FINE) + ', usando a carta ou tirando dupla.',
        free: FERIAS_PERDE_RODADA ? 'Descanse: quem para aqui fica uma rodada sem jogar.' : 'Casa de descanso, nada acontece.',
        gojail: 'Quem para aqui vai direto para a Cadeia, sem receber o Início.',
        card: 'Pegue uma carta: pode ser Sorte (ganhos, avanços) ou Revés (multas, prisão).',
        tax: 'Pague ' + fmt(s.a || 0) + ' ao banco.',
        gain: 'Receba ' + fmt(s.a || 0) + ' do banco.'
      }[s.t];
      return `<h3>${esc(s.n)}</h3><p>${txt}</p>`;
    }
    const own = pr.o === null ? 'À venda por ' + fmt(s.p) : 'Dono: ' + V.players[pr.o].name + (pr.m ? ' (hipotecada)' : pr.h ? ' · ' + houseText(pr.h) : '');
    return `${deedHead(sq)}${rentTable(sq)}<p><b>${esc(own)}</b></p>`;
  }
  function tradable(p) {
    return Object.keys(V.props).map(Number).filter(i => V.props[i].o === p).sort((a, b) => a - b)
      .filter(i => { const s = SQUARES[i]; return s.t === 'comp' || !GROUP_SQ[s.g].some(q => V.props[q].h > 0); });
  }
  function propsHTML(p) {
    const pl = V.players[p];
    const manage = canAct() && p === viewer();
    const owned = Object.keys(V.props).map(Number).filter(i => V.props[i].o === p).sort((a, b) => a - b);
    const rows = owned.map(i => {
      const s = SQUARES[i], pr = V.props[i];
      const color = s.t === 'prop' ? GROUPS[s.g].c : '#64748b';
      let b = '';
      if (manage) {
        if (s.t === 'prop') {
          b += `<button data-do="build" data-sq="${i}" ${chkBuild(V, p, i) ? 'disabled' : ''}>Construir ${fmt(GROUPS[s.g].h)}</button>`;
          b += `<button data-do="sell" data-sq="${i}" ${chkSell(V, p, i) ? 'disabled' : ''}>Vender casa</button>`;
        }
        if (pr.m) b += `<button data-do="unmortgage" data-sq="${i}" ${chkUnmortgage(V, p, i) ? 'disabled' : ''}>Resgatar ${fmt(unmortgageCost(i))}</button>`;
        else b += `<button data-do="mortgage" data-sq="${i}" ${chkMortgage(V, p, i) ? 'disabled' : ''}>Hipotecar +${fmt(s.p / 2)}</button>`;
      }
      return `<div class="prow"><span class="sw" style="background:${color}"></span><div class="pn"><b>${esc(s.n)}</b><small>${pr.m ? 'Hipotecada' : s.t === 'prop' ? houseText(pr.h) : 'Companhia'}</small></div><div class="pb">${b}</div></div>`;
    }).join('');
    return `<h3>Imóveis de ${esc(pl.name)}</h3><p>Saldo: <b>${fmt(pl.money)}</b></p>${rows || '<p>Nenhum imóvel ainda.</p>'}
      ${manage ? '<p class="note">Para construir: tenha todos os terrenos da cor, nenhum hipotecado, e construa de forma uniforme. Casas e hotéis vendidos rendem metade do preço.</p>' : ''}`;
  }

  /* negociação */
  function openTrade() {
    if (!canAct()) return toast('Você só pode negociar na sua vez.');
    if (V.phase !== 'roll' && V.phase !== 'end') return toast('Termine a jogada atual antes de negociar.');
    if (V.trade) return toast('Já existe uma proposta pendente.');
    ui.trade = { to: null, give: [], get: [], gm: 0, rm: 0 };
    ui.user = { kind: 'trade' };
    syncModal();
  }
  function listChecks(side, p) {
    const list = tradable(p);
    if (!list.length) return '<p class="note">Nenhum imóvel disponível.</p>';
    return list.map(i => `<label class="chk"><input type="checkbox" data-side="${side}" data-sq="${i}" ${ui.trade[side].includes(i) ? 'checked' : ''}>${esc(SQUARES[i].n)}</label>`).join('');
  }
  function composerHTML() {
    const t = ui.trade, me = V.turn;
    const others = V.players.filter(p => p.id !== me && !p.bankrupt);
    if (t.to === null) {
      return `<h3>Negociar</h3><p>Com quem você quer negociar?</p><div class="choose">` +
        others.map(p => `<button data-do="tradeTo" data-p="${p.id}"><span class="dot" style="background:${p.color}"></span>${esc(p.name)}</button>`).join('') +
        `</div><div class="row"><button class="ghost" data-do="close">Cancelar</button></div>`;
    }
    const o = V.players[t.to];
    return `<h3>Proposta para ${esc(o.name)}</h3><p class="note">Só entram imóveis sem construções no grupo.</p>
      <div class="cols">
        <div><h4>Você oferece</h4>${listChecks('give', me)}
          <label class="money">Dinheiro<input type="number" min="0" step="10000" max="${V.players[me].money}" data-money="gm" value="${t.gm}"></label></div>
        <div><h4>Você pede</h4>${listChecks('get', t.to)}
          <label class="money">Dinheiro<input type="number" min="0" step="10000" max="${o.money}" data-money="rm" value="${t.rm}"></label></div>
      </div>
      <div class="row"><button class="primary" data-do="tradeSend">Enviar proposta</button><button class="ghost" data-do="close">Cancelar</button></div>`;
  }
  function tradeInHTML(t) {
    const A = V.players[t.from], B = V.players[t.to];
    const li = (props, m) => {
      const items = props.map(i => `<li>${esc(SQUARES[i].n)}</li>`).join('') + (m ? `<li>${fmt(m)}</li>` : '');
      return items ? `<ul>${items}</ul>` : '<p class="note">Nada.</p>';
    };
    return `<h3>${esc(B.name)}, proposta de ${esc(A.name)}</h3>
      <div class="cols"><div><h4>${esc(A.name)} oferece</h4>${li(t.give.props, t.give.money)}</div><div><h4>Pede de você</h4>${li(t.get.props, t.get.money)}</div></div>
      <div class="row"><button class="primary" data-do="tradeAccept">Aceitar</button><button data-do="tradeReject">Recusar</button></div>`;
  }
  function sendTrade() {
    const t = ui.trade;
    const err = dispatch({ type: 'tradePropose', to: t.to, give: { props: t.give, money: t.gm }, get: { props: t.get, money: t.rm } });
    if (!err) { ui.user = null; ui.trade = null; hideModal(); }
  }

  function closeUser() { ui.user = null; ui.trade = null; syncModal(); }
  function hideModal() { modal.hidden = true; shownKey = null; mBody.innerHTML = ''; }

  function syncModal() {
    if (!V) return;
    if (shownKey === 'lost') return;
    let m = null;
    if (V.winner !== null) {
      m = { key: 'win', html: winHTML(), closable: false };
    } else if (ui.user) {
      const k = ui.user.kind;
      if (k === 'trade' && shownKey === 'trade' && !modal.hidden) return; // não apaga o que o jogador está digitando
      const html = k === 'cell' ? cellModalHTML(ui.user.sq) : k === 'props' ? propsHTML(ui.user.p) : composerHTML();
      m = { key: k, html, closable: true };
    } else if (!ui.busy) {
      const tf = tradeFor();
      if (tf) m = { key: 'tradeIn', html: tradeInHTML(tf), closable: false };
      else if (V.phase === 'buy' && canAct()) m = { key: 'buy', html: buyHTML(), closable: false };
      else if (V.phase === 'debt' && canAct()) m = { key: 'debt', html: debtHTML(), closable: false };
    }
    if (!m) { hideModal(); return; }
    modal.hidden = false;
    mBody.innerHTML = m.html;
    shownKey = m.key;
    $('#modalX').hidden = !m.closable;
  }

  $('#modalX').addEventListener('click', closeUser);
  modal.addEventListener('click', e => { if (e.target === modal && ui.user) closeUser(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && ui.user && !modal.hidden) closeUser(); });

  mBody.addEventListener('click', e => {
    const b = e.target.closest('[data-do]');
    if (!b || b.disabled) return;
    const d = b.dataset.do, sq = b.dataset.sq !== undefined ? +b.dataset.sq : undefined;
    switch (d) {
      case 'buy': case 'skipBuy': case 'payDebt': case 'tradeAccept': case 'tradeReject':
        if (!dispatch({ type: d })) mBody.querySelectorAll('button').forEach(x => { x.disabled = true; }); // evita clique duplo até chegar o novo estado
        break;
      case 'bankrupt': askConfirm('Você sai da partida e entrega seus bens a quem você deve (ou ao banco).', () => dispatch({ type: 'bankrupt' }), 'Declarar falência'); break;
      case 'build': case 'sell': case 'mortgage': case 'unmortgage': dispatch({ type: d, sq }); break;
      case 'openProps': ui.user = { kind: 'props', p: viewer() }; syncModal(); break;
      case 'close': closeUser(); break;
      case 'tradeTo': ui.trade.to = +b.dataset.p; ui.trade.give = []; ui.trade.get = []; mBody.innerHTML = composerHTML(); break;
      case 'tradeSend': sendTrade(); break;
      case 'home': goHome(); break;
    }
  });
  mBody.addEventListener('change', e => {
    const t = ui.trade, el = e.target;
    if (!t) return;
    if (el.dataset.side) {
      const arr = t[el.dataset.side], q = +el.dataset.sq, i = arr.indexOf(q);
      if (el.checked && i < 0) arr.push(q);
      if (!el.checked && i >= 0) arr.splice(i, 1);
    } else if (el.dataset.money) {
      t[el.dataset.money] = Math.max(0, Math.floor(Number(el.value) || 0));
    }
  });

  /* ---------- início do jogo ---------- */
  function enterGame() {
    V = null; ui.queue = []; ui.busy = false; ui.user = null; ui.trade = null; ui.disp = []; ui.lastRoll = 0; ui.lastEvent = 0;
    shownKey = null; hideModal();
    buildBoard();
    show('game');
    lastRx = Date.now();
    wakeLock();
  }

  /* ---------- link direto da sala (?sala=ABCDE) ---------- */
  const q = new URLSearchParams(location.search).get('sala');
  if (q) {
    $('#onCode').value = q.toUpperCase().slice(0, 5);
    $('#onName').value = localStorage.getItem('bi_name') || '';
    show('online');
  }
  $('#onCode').addEventListener('input', e => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); });
})();

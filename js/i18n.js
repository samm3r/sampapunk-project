/* SampaPunk — interface language: English / Brazilian Portuguese strings and the language switch. */
(function () {
  'use strict';
  const SP = window.SP;

  const STR = {
    en: {
      'doc.title': 'SampaPunk — São Paulo 2099',
      'doc.desc': 'SampaPunk: a cyberpunk courier runner through a dystopian São Paulo, 2099.',
      'rotate': 'ROTATE FOR A WIDER VIEW',
      'loading': 'BOOTING ARGOS-FREE NODE…',
      'canvas': 'SampaPunk game screen',

      // HUD
      'hud.integrity': 'INTEGRITY', 'hud.boost': 'BOOST', 'hud.alert': 'ALERT',
      'hud.dist': 'DIST', 'hud.chips': 'CHIPS', 'hud.cargo': 'CARGO', 'hud.delivered': 'DELIVERED',
      'hud.active': 'ACTIVE', 'hud.ready': 'SHIFT',
      'hud.bike': 'BIKE', 'hud.foot': 'FOOT', 'hud.drop': 'DROP',
      'level.0': 'SURVEILLANCE', 'level.1': 'INTERCEPTION', 'level.2': 'LOCKDOWN',

      // title
      'title.tagline': 'One courier. One encrypted package. A whole city hunting you.',
      'btn.new': 'NEW RUN', 'btn.howto': 'HOW TO PLAY', 'btn.settings': 'SETTINGS',
      'title.best': 'PERSONAL BEST', 'title.enter': 'ENTER TO START', 'title.tap': 'TAP NEW RUN',

      // how to play
      'howto.head': 'COURIER MANUAL // FIELD CONTROLS', 'howto.title': 'HOW TO PLAY',
      'key.space': 'SPACE', 'key.up': 'UP', 'key.down': 'DOWN',
      'howto.k.jump': 'Jump — hold for a higher jump',
      'howto.k.down': 'Slide on foot / duck on the motorcycle. In the air: drop fast',
      'howto.k.boost': 'Overdrive boost when the bar is full',
      'howto.k.pause': 'Pause / resume',
      'howto.k.mute': 'Mute / unmute audio',
      'howto.k.enter': 'Confirm in menus',
      'howto.r.touch': '<b class="c-cyan">Touch controls.</b> Bottom-right buttons jump (hold for higher) and slide or duck (hold). Bottom-left fires the boost. The small button above it pauses.',
      'howto.r.goal': '<b class="c-cyan">Reach the drop point.</b> 2,800 m across six districts — on foot, then on a motorcycle, twice. This is the mission.',
      'howto.r.cargo': '<b class="c-amber">Optional cargo.</b> Run or ride over marked boxes to stack them on your backpack (max 5). They score only when you pass a cyan <i>DROP-OFF</i> checkpoint: +100 per package. Every hit knocks one package off.',
      'howto.r.warn': '<b class="c-amber">Watch for warnings.</b> Amber dashed lines mean a drone beam is coming: <i>low</i> beam: jump. <i>high</i> beam: slide or duck. A red <b>&gt;&gt;&gt;</b> on the left means a police interceptor is coming from behind — jump it.',
      'howto.r.integrity': '<b class="c-red">Integrity.</b> Every hit costs integrity. At zero, ARGOS security takes the package. Grab a <b class="c-amber">pizza slice</b> (+20) or a <b class="c-amber">guaraná</b> (+10) to repair.',
      'howto.r.chips': '<b class="c-cyan">Data chips</b> add score and charge your boost. A full boost gives 2.6 s of overdrive: extra speed, smash through obstacles, and jam drone attacks.',
      'howto.r.alert': '<b class="c-magenta">Alert level</b> rises over time and with every hit, from SURVEILLANCE to INTERCEPTION to LOCKDOWN.',
      'btn.continue': 'CONTINUE', 'btn.back': 'BACK',

      // settings
      'set.head': 'SYSTEM // PREFERENCES', 'set.title': 'SETTINGS',
      'set.lang': 'LANGUAGE · IDIOMA', 'set.langVal': 'ENGLISH',
      'set.sfx': 'SOUND EFFECTS', 'set.music': 'MUSIC', 'set.shake': 'SCREEN SHAKE', 'set.scan': 'CRT SCANLINES',
      'set.reset': 'RESET PERSONAL BEST', 'set.on': 'ON', 'set.off': 'OFF',

      // briefing
      'brief.head': 'INCOMING MESSAGE — UNKNOWN CONTACT',
      'brief.msg': '"Your primary package is encrypted. ARGOS must not recover it. Collect any marked cargo you find along the route, deliver it at designated drop points, and reach the final destination before sunrise."',
      'brief.objective': 'OBJECTIVE', 'brief.route': 'ROUTE', 'brief.threat': 'THREAT', 'brief.tip': 'FIELD TIP',
      'brief.objectiveVal': 'Deliver the encrypted package to the final drop point. Collect and deliver additional cargo along the way to earn bonus points.',
      'brief.routeVal': 'Liberdade — Paulista — Marginal Pinheiros — Centro — Minhocão — Periferia<br>2,800 m',
      'brief.threatVal': 'ARGOS corporate security — surveillance drones and automated police.',
      'brief.tipVal': 'Cargo earns points only when delivered. Watch for delivery checkpoints.',
      'btn.start': 'START DELIVERY', 'btn.menu': 'MAIN MENU',

      // pause
      'pause.head': 'SIGNAL HOLD', 'pause.title': 'PAUSED',
      'pause.keys': 'SPACE/UP JUMP · DOWN SLIDE/DUCK · SHIFT BOOST · M MUTE',
      'pause.touch': 'RIGHT: JUMP · SLIDE/DUCK — LEFT: BOOST',
      'btn.resume': 'RESUME', 'btn.mute': 'MUTE AUDIO', 'btn.unmute': 'UNMUTE AUDIO', 'btn.quit': 'QUIT TO MENU',

      // results
      'over.head': 'CONNECTION LOST // COURIER 09', 'over.title': 'DELIVERY FAILED',
      'over.msg': '{why} in {place}. ARGOS has the package.',
      'done.head': 'TRANSMISSION RECEIVED // DROP POINT', 'done.title': 'DELIVERY COMPLETE',
      'done.msg': 'Package delivered. The data is out of ARGOS hands — and the sun is rising over São Paulo.',
      'newbest': 'NEW PERSONAL BEST', 'btn.retry': 'RETRY',
      'stat.score': 'FINAL SCORE', 'stat.distance': 'DISTANCE', 'stat.chips': 'DATA CHIPS',
      'stat.delivered': 'CARGO DELIVERED', 'stat.lost': 'CARGO LOST IN HITS', 'stat.avoided': 'OBSTACLES AVOIDED',
      'stat.best': 'PERSONAL BEST', 'stat.alert': 'ALERT REACHED', 'stat.bonus': 'MISSION BONUS',
      'stat.undelivered': 'UNDELIVERED CARGO', 'stat.noPts': 'NO PTS',

      'cause.beam': 'A drone beam fried your rig',
      'cause.interceptor': 'An ARGOS interceptor ran you down',
      'cause.gap': 'You went down through broken pavement',
      'cause.roadblock': 'You slammed into an ARGOS roadblock',
      'cause.sentry': 'A sentry drone shocked you off your feet',
      'cause.traffic': 'You crashed into traffic',
      'cause.cables': 'You ran into live hanging cables',
      'cause.sign': 'A low sign knocked you flat',
      'cause.gantry': 'A highway gantry knocked you off the bike',
      'cause.barrier': 'You crashed through a street barrier',
      'cause.crates': 'You tripped over a stack of crates',
      'cause.bin': 'You slammed into a dumpster',
      'cause.obras': 'You wiped out at a construction site',
      'cause.kombiWreck': 'You hit an abandoned Kombi',
      'cause.cone': 'You clipped a row of traffic cones',
      'cause.default': 'Corporate security caught up with you',

      'zone.metro.label': 'LIBERDADE METRO STATION', 'zone.metro.place': 'the Liberdade metro station',
      'zone.liberdade.place': 'Liberdade', 'zone.paulista.place': 'Avenida Paulista',
      'zone.marginal.place': 'the Marginal Pinheiros', 'zone.centro.place': 'the historic Centro',
      'zone.minhocao.place': 'the Minhocão', 'zone.periferia.place': 'the periferia',

      // toasts
      't.flagged': 'ARGOS NETWORK // COURIER 09 FLAGGED',
      't.audioOn': 'AUDIO ON', 't.audioOff': 'AUDIO MUTED', 't.bestReset': 'PERSONAL BEST RESET',
      't.intCritical': 'INTEGRITY CRITICAL',
      't.interceptorJammed': 'INTERCEPTOR JAMMED',
      't.roadblockBreached': 'ROADBLOCK BREACHED — KEEP RUNNING',
      't.cargoSeenBike': 'CARGO DETECTED — RIDE OVER IT TO COLLECT',
      't.cargoSeenFoot': 'CARGO DETECTED — RUN OVER IT TO COLLECT',
      't.cargoCap': 'CARGO CAPACITY REACHED',
      't.cargoFirst': 'CARGO SECURED — BACKPACK UPDATED',
      't.cargoFull': 'BACKPACK FULL — DELIVER AT THE NEXT DROP POINT',
      't.healAhead': 'REPAIR ITEM AHEAD — GRAB IT TO RESTORE INTEGRITY',
      't.healed': '{item} INTEGRITY RESTORED',
      't.dropTip': 'HIT! A PACKAGE FELL OFF — AVOID OBSTACLES TO KEEP YOUR CARGO',
      't.delivered1': 'CARGO DELIVERED — {n} PACKAGE · +{pts}',
      't.deliveredN': 'CARGO DELIVERED — {n} PACKAGES · +{pts}',
      't.firstDelivery': 'BONUS AWARDED — KEEP THE ENCRYPTED PACKAGE MOVING',
      't.checkpointAhead': 'DELIVERY POINT AHEAD',
      't.bike': 'MOTORCYCLE ACQUIRED',
      't.bailOut': 'ARGOS ROADBLOCK — BAIL OUT!',
      't.packageDelivered': 'PACKAGE DELIVERED',
      't.detained': 'COURIER 09 DETAINED',
      't.alertLevel': 'ALERT LEVEL {n} — {name}',
      't.overdrive': 'OVERDRIVE — DRONES JAMMED',
      't.boostTouch': 'BOOST READY — TAP BOOST', 't.boostKeys': 'BOOST READY — PRESS SHIFT',
      't.tip1Touch': 'RIGHT BUTTONS: JUMP  ·  SLIDE UNDER LOW OBSTACLES',
      't.tip1Keys': 'SPACE/UP: JUMP  ·  DOWN: SLIDE UNDER LOW OBSTACLES',
      't.tip2Touch': 'ON THE BIKE: HOLD SLIDE TO DUCK UNDER GANTRIES',
      't.tip2Keys': 'ON THE BIKE: HOLD DOWN TO DUCK UNDER GANTRIES',
      't.near': 'DROP POINT 300 M AHEAD',

      // pixel lettering drawn on the game canvas (A–Z, digits and accented capitals only)
      'px.routeLocked': 'ROUTE LOCKED', 'px.destination': 'DESTINATION // {place}',
      'px.interceptor': 'INTERCEPTOR', 'px.full': 'FULL', 'px.cargo': 'CARGO {n}/{cap}',
      'px.integrity': '+{n} INTEGRITY', 'px.fullBonus': 'FULL · +50', 'px.lost': 'PACKAGE LOST',
      'px.dropoff': 'DROP-OFF', 'px.delivered': 'DELIVERED',

      'touch.slide': 'Slide', 'touch.jump': 'Jump', 'touch.boost': 'Boost', 'touch.pause': 'Pause'
    },

    pt: {
      'doc.title': 'SampaPunk — São Paulo 2099',
      'doc.desc': 'SampaPunk: um runner cyberpunk de entregas por uma São Paulo distópica em 2099.',
      'rotate': 'GIRE O CELULAR PARA VER MELHOR',
      'loading': 'INICIANDO NÓ LIVRE DA ARGOS…',
      'canvas': 'Tela do jogo SampaPunk',

      'hud.integrity': 'INTEGR.', 'hud.boost': 'TURBO', 'hud.alert': 'ALERTA',
      'hud.dist': 'DIST', 'hud.chips': 'CHIPS', 'hud.cargo': 'CARGA', 'hud.delivered': 'ENTREGUES',
      'hud.active': 'ATIVO', 'hud.ready': 'SHIFT',
      'hud.bike': 'MOTO', 'hud.foot': 'A PÉ', 'hud.drop': 'ENTREGA',
      'level.0': 'VIGILÂNCIA', 'level.1': 'INTERCEPTAÇÃO', 'level.2': 'BLOQUEIO TOTAL',

      'title.tagline': 'Um entregador. Um pacote secreto. A cidade inteira na sua cola.',
      'btn.new': 'NOVA CORRIDA', 'btn.howto': 'COMO JOGAR', 'btn.settings': 'AJUSTES',
      'title.best': 'RECORDE', 'title.enter': 'ENTER PARA COMEÇAR', 'title.tap': 'TOQUE EM NOVA CORRIDA',

      'howto.head': 'MANUAL DO ENTREGADOR // CONTROLES', 'howto.title': 'COMO JOGAR',
      'key.space': 'ESPAÇO', 'key.up': 'CIMA', 'key.down': 'BAIXO',
      'howto.k.jump': 'Pular — segure para pular mais alto',
      'howto.k.down': 'Deslizar a pé / abaixar na moto. No ar: descer rápido',
      'howto.k.boost': 'Turbo (overdrive) quando a barra estiver cheia',
      'howto.k.pause': 'Pausar / continuar',
      'howto.k.mute': 'Desligar / ligar o som',
      'howto.k.enter': 'Confirmar nos menus',
      'howto.r.touch': '<b class="c-cyan">Controles de toque.</b> Os botões no canto inferior direito pulam (segure para ir mais alto) e deslizam ou abaixam (segure). O do canto inferior esquerdo ativa o turbo. O botão pequeno acima dele pausa.',
      'howto.r.goal': '<b class="c-cyan">Chegue ao ponto de entrega.</b> 2.800 m por seis bairros — a pé e de moto, duas vezes. Essa é a missão.',
      'howto.r.cargo': '<b class="c-amber">Carga opcional.</b> Passe por cima das caixas marcadas para empilhá-las na mochila (máx. 5). Elas só pontuam num posto ciano de <i>ENTREGA</i>: +100 por pacote. Cada batida derruba um.',
      'howto.r.warn': '<b class="c-amber">Fique de olho nos avisos.</b> Linhas âmbar tracejadas: vem raio de drone. Raio <i>baixo</i>: pule. Raio <i>alto</i>: deslize ou abaixe. Um <b>&gt;&gt;&gt;</b> vermelho à esquerda: viatura vindo por trás — pule por cima.',
      'howto.r.integrity': '<b class="c-red">Integridade.</b> Cada batida tira integridade. Se zerar, a ARGOS fica com o pacote. Pegue uma <b class="c-amber">fatia de pizza</b> (+20) ou um <b class="c-amber">guaraná</b> (+10) para se recuperar.',
      'howto.r.chips': '<b class="c-cyan">Chips de dados</b> dão pontos e carregam o turbo. Turbo cheio = 2,6 s de overdrive: mais velocidade, atravessa obstáculos e bloqueia os drones.',
      'howto.r.alert': '<b class="c-magenta">O nível de alerta</b> sobe com o tempo e a cada batida: VIGILÂNCIA, INTERCEPTAÇÃO e BLOQUEIO TOTAL.',
      'btn.continue': 'CONTINUAR', 'btn.back': 'VOLTAR',

      'set.head': 'SISTEMA // PREFERÊNCIAS', 'set.title': 'AJUSTES',
      'set.lang': 'IDIOMA · LANGUAGE', 'set.langVal': 'PORTUGUÊS',
      'set.sfx': 'EFEITOS SONOROS', 'set.music': 'MÚSICA', 'set.shake': 'TREMOR DE TELA', 'set.scan': 'SCANLINES CRT',
      'set.reset': 'ZERAR RECORDE', 'set.on': 'SIM', 'set.off': 'NÃO',

      'brief.head': 'MENSAGEM RECEBIDA — CONTATO DESCONHECIDO',
      'brief.msg': '"Seu pacote principal está criptografado. A ARGOS não pode recuperá-lo. Pegue toda carga marcada que achar no caminho, entregue nos pontos indicados e chegue ao destino final antes do amanhecer."',
      'brief.objective': 'OBJETIVO', 'brief.route': 'ROTA', 'brief.threat': 'AMEAÇA', 'brief.tip': 'DICA',
      'brief.objectiveVal': 'Leve o pacote criptografado até o ponto de entrega final. Pegue e entregue cargas extras pelo caminho para ganhar pontos bônus.',
      'brief.routeVal': 'Liberdade — Paulista — Marginal Pinheiros — Centro — Minhocão — Periferia<br>2.800 m',
      'brief.threatVal': 'Segurança corporativa da ARGOS — drones de vigilância e polícia automatizada.',
      'brief.tipVal': 'A carga só vale pontos quando é entregue. Fique de olho nos postos de entrega.',
      'btn.start': 'INICIAR ENTREGA', 'btn.menu': 'MENU PRINCIPAL',

      'pause.head': 'SINAL EM ESPERA', 'pause.title': 'PAUSADO',
      'pause.keys': 'ESPAÇO/CIMA PULA · BAIXO DESLIZA/ABAIXA · SHIFT TURBO · M SOM',
      'pause.touch': 'DIREITA: PULAR · DESLIZAR/ABAIXAR — ESQUERDA: TURBO',
      'btn.resume': 'CONTINUAR', 'btn.mute': 'DESLIGAR SOM', 'btn.unmute': 'LIGAR SOM', 'btn.quit': 'SAIR PARA O MENU',

      'over.head': 'CONEXÃO PERDIDA // ENTREGADOR 09', 'over.title': 'ENTREGA FALHOU',
      'over.msg': '{why} {place}. A ARGOS está com o pacote.',
      'done.head': 'TRANSMISSÃO RECEBIDA // PONTO DE ENTREGA', 'done.title': 'ENTREGA FEITA',
      'done.msg': 'Pacote entregue. Os dados estão fora do alcance da ARGOS — e o sol está nascendo sobre São Paulo.',
      'newbest': 'NOVO RECORDE', 'btn.retry': 'TENTAR DE NOVO',
      'stat.score': 'PONTUAÇÃO FINAL', 'stat.distance': 'DISTÂNCIA', 'stat.chips': 'CHIPS DE DADOS',
      'stat.delivered': 'CARGA ENTREGUE', 'stat.lost': 'CARGA PERDIDA', 'stat.avoided': 'OBSTÁCULOS EVITADOS',
      'stat.best': 'RECORDE', 'stat.alert': 'ALERTA ATINGIDO', 'stat.bonus': 'BÔNUS DA MISSÃO',
      'stat.undelivered': 'CARGA NÃO ENTREGUE', 'stat.noPts': 'SEM PTS',

      'cause.beam': 'Um raio de drone fritou seu equipamento',
      'cause.interceptor': 'Uma viatura da ARGOS te atropelou',
      'cause.gap': 'Você caiu num buraco do asfalto',
      'cause.roadblock': 'Você bateu num bloqueio da ARGOS',
      'cause.sentry': 'Um drone sentinela te derrubou com um choque',
      'cause.traffic': 'Você bateu no trânsito',
      'cause.cables': 'Você se enroscou em fios desencapados',
      'cause.sign': 'Uma placa baixa te derrubou',
      'cause.gantry': 'Um pórtico da via expressa te derrubou da moto',
      'cause.barrier': 'Você bateu numa barreira na rua',
      'cause.crates': 'Você tropeçou numa pilha de caixotes',
      'cause.bin': 'Você bateu numa caçamba de lixo',
      'cause.obras': 'Você se estabacou numa obra',
      'cause.kombiWreck': 'Você bateu numa Kombi abandonada',
      'cause.cone': 'Você acertou uma fileira de cones',
      'cause.default': 'A segurança corporativa te alcançou',

      'zone.metro.label': 'ESTAÇÃO LIBERDADE DO METRÔ', 'zone.metro.place': 'na estação Liberdade do metrô',
      'zone.liberdade.place': 'na Liberdade', 'zone.paulista.place': 'na Avenida Paulista',
      'zone.marginal.place': 'na Marginal Pinheiros', 'zone.centro.place': 'no Centro histórico',
      'zone.minhocao.place': 'no Minhocão', 'zone.periferia.place': 'na periferia',

      't.flagged': 'REDE ARGOS // ENTREGADOR 09 NA MIRA',
      't.audioOn': 'SOM LIGADO', 't.audioOff': 'SOM DESLIGADO', 't.bestReset': 'RECORDE ZERADO',
      't.intCritical': 'INTEGRIDADE CRÍTICA',
      't.interceptorJammed': 'VIATURA BLOQUEADA',
      't.roadblockBreached': 'BLOQUEIO ROMPIDO — CONTINUE CORRENDO',
      't.cargoSeenBike': 'CARGA À VISTA — PASSE POR CIMA DE MOTO PARA PEGAR',
      't.cargoSeenFoot': 'CARGA À VISTA — PASSE POR CIMA PARA PEGAR',
      't.cargoCap': 'LIMITE DE CARGA ATINGIDO',
      't.cargoFirst': 'CARGA GARANTIDA — MOCHILA ATUALIZADA',
      't.cargoFull': 'MOCHILA CHEIA — ENTREGUE NO PRÓXIMO POSTO',
      't.healAhead': 'REPARO À FRENTE — PEGUE PARA RECUPERAR INTEGRIDADE',
      't.healed': '{item} INTEGRIDADE RECUPERADA',
      't.dropTip': 'BATIDA! UM PACOTE CAIU — DESVIE PARA NÃO PERDER CARGA',
      't.delivered1': 'CARGA ENTREGUE — {n} PACOTE · +{pts}',
      't.deliveredN': 'CARGA ENTREGUE — {n} PACOTES · +{pts}',
      't.firstDelivery': 'BÔNUS GANHO — MANTENHA O PACOTE EM MOVIMENTO',
      't.checkpointAhead': 'POSTO DE ENTREGA À FRENTE',
      't.bike': 'MOTO NA MÃO',
      't.bailOut': 'BLOQUEIO DA ARGOS — PULE FORA!',
      't.packageDelivered': 'PACOTE ENTREGUE',
      't.detained': 'ENTREGADOR 09 DETIDO',
      't.alertLevel': 'ALERTA NÍVEL {n} — {name}',
      't.overdrive': 'OVERDRIVE — DRONES BLOQUEADOS',
      't.boostTouch': 'TURBO PRONTO — TOQUE NO TURBO', 't.boostKeys': 'TURBO PRONTO — APERTE SHIFT',
      't.tip1Touch': 'BOTÕES DA DIREITA: PULAR  ·  DESLIZAR SOB OBSTÁCULOS BAIXOS',
      't.tip1Keys': 'ESPAÇO/CIMA: PULAR  ·  BAIXO: DESLIZAR SOB OBSTÁCULOS BAIXOS',
      't.tip2Touch': 'NA MOTO: SEGURE DESLIZAR PARA ABAIXAR SOB OS PÓRTICOS',
      't.tip2Keys': 'NA MOTO: SEGURE BAIXO PARA ABAIXAR SOB OS PÓRTICOS',
      't.near': 'PONTO DE ENTREGA A 300 M',

      'px.routeLocked': 'ROTA TRAVADA', 'px.destination': 'DESTINO // {place}',
      'px.interceptor': 'VIATURA', 'px.full': 'CHEIA', 'px.cargo': 'CARGA {n}/{cap}',
      'px.integrity': '+{n} INTEGRIDADE', 'px.fullBonus': 'CHEIA · +50', 'px.lost': 'PACOTE PERDIDO',
      'px.dropoff': 'ENTREGA', 'px.delivered': 'ENTREGUE',

      'touch.slide': 'Deslizar', 'touch.jump': 'Pular', 'touch.boost': 'Turbo', 'touch.pause': 'Pausar'
    }
  };

  // A saved choice wins; otherwise Portuguese-language browsers start in Portuguese.
  const nav = (navigator.languages && navigator.languages[0]) || navigator.language || '';
  SP.lang = SP.store.get('lang', /^pt\b/i.test(nav) ? 'pt' : 'en');
  if (!STR[SP.lang]) SP.lang = 'en';

  function t(key, vars) {
    let s = STR[SP.lang][key];
    if (s === undefined) s = STR.en[key];
    if (s === undefined) return key;
    if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? vars[k] : m));
    return s;
  }

  // Static markup: data-i18n sets text (into a decorated button's label), data-i18n-html sets markup.
  function apply() {
    const root = document.documentElement;
    root.lang = SP.lang === 'pt' ? 'pt-BR' : 'en';
    document.title = t('doc.title');
    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute('content', t('doc.desc'));
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const target = el.querySelector(':scope > .b-label') || el;
      target.textContent = t(el.dataset.i18n);
    });
    document.querySelectorAll('[data-i18n-html]').forEach((el) => { el.innerHTML = t(el.dataset.i18nHtml); });
    document.querySelectorAll('[data-i18n-aria]').forEach((el) => el.setAttribute('aria-label', t(el.dataset.i18nAria)));
    document.querySelectorAll('[data-lang]').forEach((el) => {
      const on = el.dataset.lang === SP.lang;
      el.classList.toggle('on', on);
      el.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  function set(lang) {
    if (!STR[lang]) return;
    SP.lang = lang;
    SP.store.set('lang', lang);
    apply();
  }

  SP.t = t;
  SP.i18n = { apply, set, toggle() { set(SP.lang === 'pt' ? 'en' : 'pt'); }, get lang() { return SP.lang; } };
})();

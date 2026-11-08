function createScenesWave(pickLiked, updateButton) {
  const contextUri = 'spotify:search:' + encodeURIComponent('Моя волна');
  const origin = () => Spicetify.Player.origin;
  const trackUri = /^spotify:track:[a-zA-Z0-9]+$/;
  let active = null;
  let startingPlayback = false;

  function shuffle(items) {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  async function radio(seed) {
    const result = await Spicetify.CosmosAsync.get(
      'https://spclient.wg.spotify.com/inspiredby-mix/v2/seed_to_playlist/' + seed + '?response-format=json'
    );
    const uri = result?.mediaItems?.[0]?.uri;
    if (!/^spotify:playlist:[a-zA-Z0-9]+$/.test(uri)) return [];
    const page = await Spicetify.Platform.PlaylistAPI.getContents(uri, {offset:0, limit:50});
    return (page.items ?? [])
      .filter(item => trackUri.test(item.uri) && item.isPlayable !== false && !item.isBanned && !item.isLocal)
      .map(item => item.uri);
  }

  async function recommendations(session, count) {
    const liked = await Promise.allSettled([pickLiked(), pickLiked(), pickLiked()]);
    const anchors = liked.filter(result => result.status === 'fulfilled').map(result => result.value);
    const preferred = shuffle(session.preferred).find(seed => !anchors.includes(seed));
    const seeds = [...new Set([preferred, ...anchors].filter(seed => trackUri.test(seed)))];
    if (!seeds.length) throw new Error('Добавь доступные треки в любимые, чтобы запустить «Мою волну».');
    const stations = await Promise.allSettled(seeds.map(radio));
    const groups = stations.filter(result => result.status === 'fulfilled').map(result => shuffle(result.value));
    const queue = origin()?.getQueue?.();
    const reserved = [...seeds, ...session.owned.values(),
      ...(queue?.queued ?? []).map(item => item.uri), Spicetify.Player.data?.item?.uri];
    const excluded = new Set([...session.seen, ...reserved]);
    const picks = [];
    while (picks.length < count && groups.some(group => group.length)) {
      for (const group of groups) {
        const index = group.findIndex(uri => !excluded.has(uri));
        if (index < 0) { group.length = 0; continue; }
        const [uri] = group.splice(index, 1);
        picks.push(uri);
        excluded.add(uri);
        if (picks.length === count) break;
      }
    }
    if (!picks.length) {
      // A small radio catalog can run out of new songs. Revisit older picks only.
      const recent = new Set([...reserved, ...[...session.seen].slice(-12)]);
      const older = stations.flatMap(result => result.status === 'fulfilled' ? result.value : []);
      picks.push(...shuffle([...new Set(older)].filter(uri => !recent.has(uri))).slice(0, count));
    }
    if (!picks.length) throw new Error('Spotify не вернул похожие треки. Попробуй запустить «Мою волну» ещё раз.');
    return picks;
  }

  function ownsPlayback(session, state = Spicetify.Player.data) {
    const item = state?.item;
    return state?.context?.uri === contextUri
      || Boolean(item?.uid && session.owned.get(item.uid) === item.uri);
  }

  async function removeOwned(session) {
    const api = origin();
    const queue = api?.getQueue?.()?.queued ?? [];
    // Spotify matches by URI if the other queue entry has no UID.
    const removable = queue.filter(item => item.uid && session.owned.get(item.uid) === item.uri
      && !queue.some(other => !other.uid && other.uri === item.uri));
    if (removable.length) await api.removeFromQueue(removable.map(({uid, uri}) => ({uid, uri})));
  }

  async function stop(session, pause) {
    if (active !== session) return;
    active = null;
    updateButton('idle');
    try {
      if (pause && session.started && ownsPlayback(session)) await origin().pause();
    } finally {
      await removeOwned(session);
    }
  }

  function initialTracksRemain(session, queue) {
    return queue.nextUp.some(item => session.initial.has(item.uri));
  }

  async function refill(session) {
    if (!session.buffer.length) session.buffer = await recommendations(session, 6);
    while (session.buffer.length) {
      if (active !== session || !ownsPlayback(session)) return;
      const api = origin();
      const queue = api.getQueue();
      if (initialTracksRemain(session, queue) || queue.queued.length >= 2) return;
      const uri = session.buffer.shift();
      if (queue.queued.some(item => item.uri === uri)) continue;
      await api.addToQueue([{uri}]);
      // The desktop client assigns the queue UID asynchronously.
      for (let attempt = 0; attempt < 8; attempt++) {
        const item = api.getQueue()?.queued?.find(item => item.uri === uri && item.uid);
        if (item) { session.owned.set(item.uid, uri); break; }
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      if (active !== session || !ownsPlayback(session)) { await removeOwned(session); return; }
      session.seen.add(uri);
    }
  }

  function tick() {
    const session = active;
    if (!session?.started) return;
    const state = Spicetify.Player.data;
    if (!state?.item) return;
    if (!ownsPlayback(session, state)) { void stop(session, false).catch(console.error); return; }
    const uri = state.item.uri;
    if (uri !== session.current) {
      if (session.current && session.progress >= .65) {
        session.preferred = [session.current, ...session.preferred.filter(seed => seed !== session.current)].slice(0, 12);
      }
      session.current = uri;
      session.progress = 0;
      session.seen.delete(uri);
      session.seen.add(uri);
      if (session.seen.size > 250) session.seen.delete(session.seen.values().next().value);
    }
    const progress = Spicetify.Player.getProgress();
    if (state.duration > 0 && progress <= state.duration + 5000) {
      session.progress = Math.max(session.progress, Math.min(progress / state.duration, 1));
    }
    const queue = origin()?.getQueue?.();
    if (!queue || state.isPaused || session.refilling || Date.now() < session.retryAt) return;
    const queuedIds = new Set(queue.queued.map(item => item.uid));
    for (const uid of session.owned.keys()) {
      if (uid !== state.item.uid && !queuedIds.has(uid)) session.owned.delete(uid);
    }
    const remaining = queue.nextUp.filter(item => session.initial.has(item.uri)).length;
    if (remaining > 2 || (remaining && session.buffer.length) || queue.queued.length >= 2) return;
    session.refilling = true;
    void refill(session).catch(() => { session.retryAt = Date.now() + 15000; })
      .finally(() => { session.refilling = false; });
  }

  async function toggle() {
    if (active) { await stop(active, true); return; }
    if (startingPlayback) return;
    const api = origin();
    if (!api?.play || !api.getQueue || !api.addToQueue || !api.removeFromQueue) {
      throw new Error('Этот клиент Spotify не поддерживает «Мою волну».');
    }
    const session = {initial:new Set(), seen:new Set(), preferred:[], owned:new Map(), buffer:[], retryAt:0};
    active = session;
    updateButton('loading');
    try {
      const tracks = await recommendations(session, 12);
      if (active !== session) return;
      session.initial = new Set(tracks);
      session.seen = new Set(tracks);
      startingPlayback = true;
      try {
        await api.play({uri:contextUri, pages:[{items:tracks.map(uri => ({uri}))}]},
          {featureIdentifier:'spotify_scenes_wave'}, {skipTo:{index:0}, shuffle:false, repeat:0});
        if (active !== session) { if (ownsPlayback(session)) await api.pause(); return; }
      } finally {
        startingPlayback = false;
      }
      session.started = true;
      updateButton('playing');
    } catch (error) {
      if (active !== session) return;
      active = null;
      updateButton('idle');
      throw error;
    }
  }

  return {toggle, tick};
}

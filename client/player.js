import { applyInputMovement, lerp } from "../shared/utils.js";

export function createLocalPlayer(snapshot) {
  return {
    id: snapshot.id,
    nick: snapshot.nick,
    x: snapshot.x,
    y: snapshot.y,
    hp: snapshot.hp,
    alive: snapshot.alive,
    respawnAt: snapshot.respawnAt ?? 0,
    pendingInputs: []
  };
}

export function reconcileLocalPlayer(localPlayer, authoritativeState, obstacles = []) {
  if (!localPlayer || !authoritativeState) {
    return;
  }

  localPlayer.nick = authoritativeState.nick;
  localPlayer.hp = authoritativeState.hp;
  localPlayer.alive = authoritativeState.alive;
  localPlayer.respawnAt = authoritativeState.respawnAt ?? 0;
  localPlayer.x = authoritativeState.x;
  localPlayer.y = authoritativeState.y;

  localPlayer.pendingInputs = localPlayer.pendingInputs.filter(
    (input) => input.seq > authoritativeState.lastProcessedInputSeq
  );

  for (const input of localPlayer.pendingInputs) {
    applyInputMovement(localPlayer, input, input.dt / 1000, obstacles);
  }
}

export function recordPendingInput(localPlayer, input) {
  localPlayer.pendingInputs.push(input);

  if (localPlayer.pendingInputs.length > 180) {
    localPlayer.pendingInputs.shift();
  }
}

export function createRemotePlayer(snapshot, receivedAt) {
  return {
    id: snapshot.id,
    nick: snapshot.nick,
    samples: [createSample(snapshot, receivedAt)]
  };
}

export function pushRemoteSnapshot(remotePlayer, snapshot, receivedAt) {
  remotePlayer.nick = snapshot.nick;
  remotePlayer.samples.push(createSample(snapshot, receivedAt));

  if (remotePlayer.samples.length > 8) {
    remotePlayer.samples.shift();
  }
}

export function getRemoteRenderState(remotePlayer, renderTime) {
  const { samples } = remotePlayer;

  if (samples.length === 0) {
    return null;
  }

  if (samples.length === 1 || renderTime <= samples[0].time) {
    return samples[0];
  }

  for (let index = 0; index < samples.length - 1; index += 1) {
    const from = samples[index];
    const to = samples[index + 1];

    if (renderTime > to.time) {
      continue;
    }

    const alpha = (renderTime - from.time) / Math.max(1, to.time - from.time);
    return {
      id: remotePlayer.id,
      nick: remotePlayer.nick,
      x: lerp(from.x, to.x, alpha),
      y: lerp(from.y, to.y, alpha),
      hp: Math.round(lerp(from.hp, to.hp, alpha)),
      alive: alpha < 0.5 ? from.alive : to.alive
    };
  }

  const latest = samples[samples.length - 1];
  const previous = samples[samples.length - 2];
  if (!previous) {
    return latest;
  }

  const deltaTime = Math.max(1, latest.time - previous.time);
  const extrapolationMs = Math.min(renderTime - latest.time, 90);
  if (extrapolationMs <= 0) {
    return latest;
  }

  const velocityX = (latest.x - previous.x) / deltaTime;
  const velocityY = (latest.y - previous.y) / deltaTime;

  return {
    ...latest,
    x: latest.x + velocityX * extrapolationMs,
    y: latest.y + velocityY * extrapolationMs
  };
}

function createSample(snapshot, receivedAt) {
  return {
    id: snapshot.id,
    nick: snapshot.nick,
    x: snapshot.x,
    y: snapshot.y,
    hp: snapshot.hp,
    alive: snapshot.alive,
    time: receivedAt
  };
}

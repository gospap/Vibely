// Geometry and maneuver helpers for turn-by-turn navigation.
//
// The routing API hands back two levels of detail that have to be matched up:
// `geometry.coordinates` is the dense polyline we draw, and `segments[].steps[]`
// are the maneuvers. Each step carries `way_points: [from, to]`, a pair of
// indices *into that polyline* — which is the only link between where the driver
// physically is and which instruction applies to them right now.

// Metres between two coordinates.
export const haversineDistance = (a, b) => {
  const toRad = (x) => (x * Math.PI) / 180;

  const R = 6371e3;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);

  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
};

// More than 25m off the drawn line means the driver missed a turn.
export const isOffRoute = (current, path) => {
  if (!path || path.length === 0) return false;

  let minDist = Infinity;

  for (let i = 0; i < path.length; i++) {
    const d = haversineDistance(current, path[i]);
    if (d < minDist) minDist = d;
  }

  return minDist > 25;
};

// Index of the polyline point the driver is closest to. Everything else keys
// off this: it is what turns a GPS fix into a position along the route.
export const nearestPointIndex = (current, path) => {
  let best = 0;
  let minDist = Infinity;

  for (let i = 0; i < path.length; i++) {
    const d = haversineDistance(current, path[i]);
    if (d < minDist) {
      minDist = d;
      best = i;
    }
  }

  return best;
};

// Distance left to a maneuver, measured *along the road* rather than as the
// crow flies — a straight line badly undersells a curve or a slip road.
export const distanceAlongPath = (path, fromIndex, toIndex) => {
  if (toIndex <= fromIndex) return 0;

  let total = 0;
  for (let i = fromIndex; i < toIndex && i < path.length - 1; i++) {
    total += haversineDistance(path[i], path[i + 1]);
  }

  return total;
};

// Flatten the response into a single ordered list of maneuvers. A plain A-to-B
// route only ever has one segment, but routes with waypoints have several and
// their way_points stay indexed against the whole polyline either way.
export const extractSteps = (feature) =>
  (feature?.properties?.segments ?? []).flatMap((segment) => segment.steps ?? []);

// The step the driver is currently driving through. A step's instruction fires
// at way_points[0] and stays relevant until way_points[1], so the step in play
// is the last one whose maneuver point is already behind the driver.
export const findCurrentStepIndex = (steps, pointIndex) => {
  let current = 0;

  for (let i = 0; i < steps.length; i++) {
    const start = steps[i].way_points?.[0] ?? 0;
    if (start <= pointIndex) current = i;
    else break;
  }

  return current;
};

// What to put on the banner: the turn that is coming up, and how far away it is.
// On the final step there is nothing left to announce but the arrival itself.
export const resolveManeuver = (steps, path, current) => {
  if (!steps.length || !path.length) return null;

  const pointIndex = nearestPointIndex(current, path);
  const currentIndex = findCurrentStepIndex(steps, pointIndex);

  const currentStep = steps[currentIndex];
  const nextStep = steps[currentIndex + 1];
  const step = nextStep ?? currentStep;

  const target = nextStep
    ? (currentStep.way_points?.[1] ?? path.length - 1)
    : path.length - 1;

  return {
    // Identifies the maneuver across GPS ticks so we only announce it once.
    key: `${currentIndex}-${step.instruction}`,
    instruction: step.instruction ?? "",
    name: step.name && step.name !== "-" ? step.name : null,
    type: step.type ?? 6,
    distance: distanceAlongPath(path, pointIndex, target),
    isArrival: !nextStep,
  };
};

// Rounded the way a driver reads it — nobody needs "347 metres".
export const formatDistance = (metres) => {
  if (metres >= 1000) return `${(metres / 1000).toFixed(1).replace(".", ",")} χλμ`;
  if (metres >= 100) return `${Math.round(metres / 50) * 50} μ`;
  if (metres >= 10) return `${Math.round(metres / 10) * 10} μ`;
  return "τώρα";
};

// Announce at a long warning, a get-ready, and the turn itself. A threshold only
// fires when the driver crosses it, so a maneuver never repeats itself.
export const SPEECH_THRESHOLDS = [400, 150, 40];

export const spokenPhrase = (threshold, instruction) =>
  threshold <= 40 ? instruction : `Σε ${threshold} μέτρα, ${instruction}`;

import React, { useState, useEffect, useMemo, useRef } from "react";

/* ------------------------------------------------------------------ */
/*  Design tokens                                                      */
/* ------------------------------------------------------------------ */
const T = {
  ink: "#101a28", ink2: "#3c4a5d", ink3: "#6b7a8d",
  paper: "#f6f7f9", card: "#ffffff", rule: "#dde3ea", ruleSoft: "#eaeef3",
  accent: "#0d6e6e", accentSoft: "#e3f2f1",
  warn: "#9a5b00", warnSoft: "#fdf3e2",
  bad: "#a32020", badSoft: "#fbeaea",
  good: "#1d6b3a", goodSoft: "#e8f4ec",
};

const CATS = {
  dispensary: { label: "Dispensary", dot: "#5b5b6b", soft: "#eeeef2", line: "#c9c9d4" },
  inpatient: { label: "Inpatient ward", dot: "#1f5f9e", soft: "#e7f0f9", line: "#bcd4ea" },
  ld: { label: "Learning disability", dot: "#7a4a9e", soft: "#f1eaf8", line: "#d8c6ea" },
  community: { label: "Community team", dot: "#0d6e6e", soft: "#e3f2f1", line: "#b6dbd8" },
  clinic: { label: "Clinic", dot: "#a35a12", soft: "#fbeee0", line: "#eed3b3" },
};

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const HALVES = [
  { key: "AM", label: "Morning", time: "9am – 1pm" },
  { key: "PM", label: "Afternoon", time: "1pm – 5pm" },
];

/* ------------------------------------------------------------------ */
/*  Source data — from Schedule.xlsx                                   */
/* ------------------------------------------------------------------ */
const WARD_SOURCE = [
  { name: "Dispensary", required: 10, cat: "dispensary", fixed: [[0,"AM"],[0,"PM"],[1,"AM"],[1,"PM"],[2,"AM"],[2,"PM"],[3,"AM"],[3,"PM"],[4,"AM"],[4,"PM"]] },
  { name: "Celyn", required: 4, cat: "inpatient", fixed: [[0,"AM"],[1,"AM"],[2,"AM"],[3,"AM"]] },
  { name: "Derwen", required: 4, cat: "inpatient", fixed: [[0,"AM"],[1,"AM"],[2,"AM"],[3,"AM"]] },
  { name: "Clyne", required: 5, cat: "inpatient", fixed: [[1,"AM"]] },
  { name: "Fendrod", required: 5, cat: "inpatient", fixed: [[1,"AM"]] },
  { name: "Gwelfor & Ty Gwanwen", required: 2, cat: "inpatient", fixed: [[3,"AM"]] },
  { name: "Ward F & Detox", required: 6, cat: "inpatient", fixed: [[0,"AM"],[1,"AM"],[1,"PM"],[2,"AM"],[2,"PM"],[3,"AM"],[4,"AM"]] },
  { name: "Tonna S2", required: 2, cat: "inpatient", fixed: [[1,"AM"],[4,"PM"]] },
  { name: "Uned Gobaith", required: 1, cat: "inpatient", fixed: [[2,"AM"]] },
  { name: "Newton", required: 1, cat: "inpatient", fixed: [[3,"AM"]] },
  { name: "Ogmore", required: 1, cat: "inpatient", fixed: [[2,"AM"]] },
  { name: "Cardigan", required: 1, cat: "inpatient", fixed: [[2,"AM"]] },
  { name: "Penarth", required: 1, cat: "inpatient", fixed: [[1,"AM"]] },
  { name: "Tenby", required: 1, cat: "inpatient", fixed: [[3,"AM"]] },
  { name: "Rowan", required: 1, cat: "inpatient", fixed: [[1,"AM"]] },
  { name: "LD units", required: 3, cat: "ld", fixed: [] },
  { name: "Llwyneryr & Dan y Bont", required: 1, cat: "ld", fixed: [] },
  { name: "Outpatient LD", required: 2, cat: "ld", fixed: [] },
  { name: "Area 1 & 2", required: 2, cat: "community", fixed: [[0,"PM"],[3,"AM"]] },
  { name: "Tonna CMHT", required: 2, cat: "community", fixed: [[2,"PM"],[4,"AM"]] },
  { name: "Forge CMHT", required: 2, cat: "community", fixed: [] },
  { name: "Ty Einon CMHT", required: 6, cat: "community", fixed: [[0,"AM"],[0,"PM"],[1,"AM"],[1,"PM"],[2,"AM"],[2,"PM"]] },
  { name: "CHIRT", required: 0, cat: "community", fixed: [] },
  { name: "Older Adults CMHT", required: 1, cat: "community", fixed: [] },
  { name: "CDAT", required: 4, cat: "community", fixed: [[4,"AM"]] },
  { name: "Clozapine Clinic – Central", required: 1, cat: "clinic", fixed: [[3,"AM"]] },
  { name: "Clozapine Clinic – Ty Einon", required: 1, cat: "clinic", fixed: [[1,"AM"]] },
  { name: "Lithium Clinic – Ty Einon", required: 1, cat: "clinic", fixed: [[3,"AM"]] },
  { name: "Lithium Clinic – NPT", required: 1, cat: "clinic", fixed: [[2,"AM"]] },
  { name: "Primary care reviews", required: 3, cat: "community", fixed: [[4,"AM"]] },
];

const ROSTER = []; /* names live in your rota file, not in the code */

const REASONS = [
  { k: "off", label: "Off / annual leave", short: "OFF", tone: "bad" },
  { k: "study", label: "Study day", short: "STU", tone: "warn" },
  { k: "meeting", label: "Meeting", short: "MTG", tone: "warn" },
  { k: "training", label: "Training or teaching", short: "TRN", tone: "warn" },
  { k: "other", label: "Other commitment", short: "BUSY", tone: "warn" },
];
const reasonInfo = (k) => REASONS.find((r) => r.k === k) || REASONS[0];

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const fullWeek = () => DAYS.map(() => ({ AM: true, PM: true }));

const buildPharmacists = () =>
  ROSTER.map(([name, cap], i) => ({ id: `p${i}`, name, capacity: cap, available: fullWeek() }));

function buildInitialState() {
  const wards = WARD_SOURCE.map((w) => ({ id: slug(w.name), name: w.name, required: w.required, cat: w.cat }));
  const sessions = [];
  let n = 0;
  WARD_SOURCE.forEach((w) => {
    const id = slug(w.name);
    w.fixed.forEach(([day, half]) => {
      sessions.push({ sid: `s${n++}`, wardId: id, day, half, names: [], fixed: true });
    });
    for (let i = 0; i < Math.max(0, w.required - w.fixed.length); i++) {
      sessions.push({ sid: `s${n++}`, wardId: id, day: null, half: null, names: [], fixed: false });
    }
  });
  return {
    wards, sessions, pharmacists: buildPharmacists(), nextId: n,
    accepted: [],
    splitWards: ["dispensary"],
    nextWeek: { label: "", absent: {}, cover: {}, accepted: [] },
  };
}

const STORAGE_KEY = "pharmacy-rota-v1";

const migrate = (s) => {
  if (!s || !s.wards || !s.sessions) return null;
  const pharmacists = (!s.pharmacists || s.pharmacists.length === 0)
    ? buildPharmacists()
    : s.pharmacists.map((p) => ({
        ...p,
        available: p.available && p.available.length === 5 ? p.available : fullWeek(),
        capacity: typeof p.capacity === "number"
          ? p.capacity
          : (p.available || fullWeek()).reduce((n, d) => n + (d.AM ? 1 : 0) + (d.PM ? 1 : 0), 0),
      }));
  const sessions = s.sessions.map((x) => {
    if (Array.isArray(x.names)) return x;
    const { pharmacistId, ...rest } = x;
    return { ...rest, names: pharmacistId ? [pharmacistId] : [] };
  });
  const nw = s.nextWeek || {};
  const rawAbsent = nw.absent;
  const absent = Array.isArray(rawAbsent)
    ? Object.fromEntries(rawAbsent.map((k) => [k, "off"]))
    : (rawAbsent && typeof rawAbsent === "object" ? rawAbsent : {});
  const nextWeek = {
    label: nw.label || "", absent,
    cover: nw.cover || {}, accepted: nw.accepted || [],
  };
  return {
    ...s, pharmacists, sessions, nextWeek,
    accepted: s.accepted || [],
    splitWards: s.splitWards || ["dispensary"],
  };
};

/* ------------------------------------------------------------------ */
/*  Atoms                                                              */
/* ------------------------------------------------------------------ */
function Btn({ children, onClick, tone = "plain", size = "md", disabled, title, style }) {
  const tones = {
    plain: { bg: T.card, fg: T.ink2, bd: T.rule },
    solid: { bg: T.accent, fg: "#fff", bd: T.accent },
    danger: { bg: T.card, fg: T.bad, bd: "#e8c9c9" },
  };
  const t = tones[tone] || tones.plain;
  return (
    <button type="button" onClick={onClick} disabled={disabled} title={title}
      style={{
        background: t.bg, color: t.fg, border: `1px solid ${t.bd}`, borderRadius: 6,
        padding: size === "sm" ? "3px 8px" : "6px 11px",
        fontSize: size === "sm" ? 12 : 13, fontWeight: 500,
        cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.45 : 1,
        whiteSpace: "nowrap", ...style,
      }}>{children}</button>
  );
}

function Pill({ children, tone = "neutral", title }) {
  const tones = {
    neutral: { bg: T.paper, fg: T.ink3, bd: T.rule },
    good: { bg: T.goodSoft, fg: T.good, bd: "#c6e3d1" },
    warn: { bg: T.warnSoft, fg: T.warn, bd: "#eddcbc" },
    bad: { bg: T.badSoft, fg: T.bad, bd: "#eccaca" },
  };
  const t = tones[tone] || tones.neutral;
  return (
    <span title={title} style={{
      background: t.bg, color: t.fg, border: `1px solid ${t.bd}`, borderRadius: 999,
      padding: "1px 8px", fontSize: 11.5, fontWeight: 600,
      fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap",
    }}>{children}</span>
  );
}

/* ------------------------------------------------------------------ */
/*  Main                                                               */
/* ------------------------------------------------------------------ */
export default function PharmacySessionDashboard() {
  const [state, setState] = useState(() => buildInitialState());
  const [tab, setTab] = useState("week");
  const [selected, setSelected] = useState(null);
  const [dragId, setDragId] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [unlockFixed, setUnlockFixed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [saveNote, setSaveNote] = useState("");
  const [history, setHistory] = useState([]);
  const [bulkNames, setBulkNames] = useState("");
  const [filterWard, setFilterWard] = useState("all");
  const [filterPharm, setFilterPharm] = useState("all");
  const [openWard, setOpenWard] = useState(null);
  const [highlight, setHighlight] = useState("all");
  const [nextView, setNextView] = useState("grid");
  const [hideEmpty, setHideEmpty] = useState(true);
  const [reason, setReason] = useState("off");
  const firstSave = useRef(true);
  const fileRef = useRef(null);
  const [fileName, setFileName] = useState("");
  const [dirty, setDirty] = useState(false);

  const { wards, sessions, pharmacists } = state;

  /* ---------- persistence ---------- */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await window.storage.get(STORAGE_KEY);
        if (alive && res && res.value) {
          const parsed = migrate(JSON.parse(res.value));
          if (parsed) setState(parsed);
        }
      } catch (e) { /* nothing saved yet */ }
      finally { if (alive) setLoaded(true); }
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!loaded) return;
    if (firstSave.current) { firstSave.current = false; return; }
    setDirty(true);
    const t = setTimeout(async () => {
      try {
        await window.storage.set(STORAGE_KEY, JSON.stringify(state));
        setSaveNote("Saved");
        setTimeout(() => setSaveNote(""), 1400);
      } catch (e) { setSaveNote("Not saved"); }
    }, 600);
    return () => clearTimeout(t);
  }, [state, loaded]);

  /* ---------- helpers ---------- */
  const push = (updater) => {
    setState((prev) => {
      setHistory((h) => [...h.slice(-24), prev]);
      return typeof updater === "function" ? updater(prev) : updater;
    });
  };
  const undo = () => {
    setHistory((h) => {
      if (!h.length) return h;
      setState(h[h.length - 1]);
      return h.slice(0, -1);
    });
  };

  const wardById = useMemo(() => Object.fromEntries(wards.map((w) => [w.id, w])), [wards]);
  const pharmById = useMemo(() => Object.fromEntries(pharmacists.map((p) => [p.id, p])), [pharmacists]);
  const pool = useMemo(() => sessions.filter((s) => s.day === null), [sessions]);
  const placed = useMemo(() => sessions.filter((s) => s.day !== null), [sessions]);
  const slotSessions = (day, half) => placed.filter((s) => s.day === day && s.half === half);

  const moveSession = (sid, day, half) =>
    push((prev) => ({ ...prev, sessions: prev.sessions.map((s) => (s.sid === sid ? { ...s, day, half } : s)) }));
  const addName = (sid, pid) =>
    push((prev) => ({
      ...prev,
      sessions: prev.sessions.map((s) =>
        s.sid === sid && !s.names.includes(pid) ? { ...s, names: [...s.names, pid] } : s),
    }));
  const removeName = (sid, pid) =>
    push((prev) => ({
      ...prev,
      sessions: prev.sessions.map((s) => (s.sid === sid ? { ...s, names: s.names.filter((n) => n !== pid) } : s)),
    }));
  const toggleLock = (sid) =>
    push((prev) => ({ ...prev, sessions: prev.sessions.map((s) => (s.sid === sid ? { ...s, fixed: !s.fixed } : s)) }));
  const addSession = (wardId) =>
    push((prev) => ({
      ...prev, nextId: prev.nextId + 1,
      sessions: [...prev.sessions, { sid: `s${prev.nextId}`, wardId, day: null, half: null, names: [], fixed: false }],
    }));
  const removeSession = (wardId) =>
    push((prev) => {
      const target = [...prev.sessions].reverse().find((s) => s.wardId === wardId && s.day === null)
        || [...prev.sessions].reverse().find((s) => s.wardId === wardId && !s.fixed);
      if (!target) return prev;
      return { ...prev, sessions: prev.sessions.filter((s) => s.sid !== target.sid) };
    });
  const setRequired = (wardId, val) =>
    push((prev) => ({ ...prev, wards: prev.wards.map((w) => (w.id === wardId ? { ...w, required: Math.max(0, val) } : w)) }));

  /* ward-level cover */
  const addCover = (wardId, pharmId) =>
    push((prev) => {
      const mine = prev.sessions.filter((s) => s.wardId === wardId && !s.names.includes(pharmId));
      const target = mine.find((s) => s.day === null && s.names.length === 0)
        || mine.find((s) => s.names.length === 0)
        || mine.find((s) => s.day === null)
        || mine[0];
      if (!target) return prev;
      return { ...prev, sessions: prev.sessions.map((s) => (s.sid === target.sid ? { ...s, names: [...s.names, pharmId] } : s)) };
    });
  const removeCover = (wardId, pharmId) =>
    push((prev) => {
      const mine = prev.sessions.filter((s) => s.wardId === wardId && s.names.includes(pharmId));
      const target = mine.find((s) => s.day === null) || mine.find((s) => !s.fixed) || mine[0];
      if (!target) return prev;
      return { ...prev, sessions: prev.sessions.map((s) => (s.sid === target.sid ? { ...s, names: s.names.filter((n) => n !== pharmId) } : s)) };
    });
  const clearCover = (wardId, pharmId) =>
    push((prev) => ({
      ...prev,
      sessions: prev.sessions.map((s) => (s.wardId === wardId ? { ...s, names: s.names.filter((n) => n !== pharmId) } : s)),
    }));

  /* pharmacists */
  const addPharmacist = (name, capacity) =>
    push((prev) => ({
      ...prev,
      pharmacists: [...prev.pharmacists, {
        id: `p${Date.now()}${Math.floor(Math.random() * 999)}`,
        name: name || "New pharmacist",
        capacity: typeof capacity === "number" ? capacity : 10,
        available: fullWeek(),
      }],
    }));
  const addManyPharmacists = () => {
    const lines = bulkNames.split("\n").map((l) => l.trim()).filter(Boolean);
    if (!lines.length) return;
    const parsed = lines.map((l) => {
      const m = l.match(/^(.*?)[\t,;]+\s*(\d{1,2})\s*$/) || l.match(/^(.*?)\s{2,}(\d{1,2})\s*$/) || l.match(/^(.*?)\s+(\d{1,2})\s*$/);
      if (m) return { name: m[1].trim(), capacity: Math.min(10, parseInt(m[2], 10)) };
      return { name: l, capacity: 10 };
    });
    push((prev) => ({
      ...prev,
      pharmacists: [...prev.pharmacists, ...parsed.map((p, i) => ({
        id: `p${Date.now()}${i}`, name: p.name, capacity: p.capacity, available: fullWeek(),
      }))],
    }));
    setBulkNames("");
  };
  const updatePharmacist = (id, patch) =>
    push((prev) => ({ ...prev, pharmacists: prev.pharmacists.map((p) => (p.id === id ? { ...p, ...patch } : p)) }));
  const removePharmacist = (id) =>
    push((prev) => ({
      ...prev,
      pharmacists: prev.pharmacists.filter((p) => p.id !== id),
      sessions: prev.sessions.map((s) => ({ ...s, names: s.names.filter((n) => n !== id) })),
    }));
  const togglePharmAvail = (id, day, half) =>
    push((prev) => ({
      ...prev,
      pharmacists: prev.pharmacists.map((p) => {
        if (p.id !== id) return p;
        const available = p.available.map((d, i) => (i === day ? { ...d, [half]: !d[half] } : d));
        const onCount = available.reduce((n, d) => n + (d.AM ? 1 : 0) + (d.PM ? 1 : 0), 0);
        return { ...p, available, capacity: Math.min(p.capacity, onCount) };
      }),
    }));

  /* ---------- derived ---------- */
  const slotLoad = useMemo(() => {
    const m = {};
    placed.forEach((s) => {
      const k = `${s.day}|${s.half}`;
      const e = m[k] || { sessions: 0, names: 0, byPharm: {} };
      e.sessions += 1;
      e.names += s.names.length;
      s.names.forEach((pid) => { e.byPharm[pid] = (e.byPharm[pid] || 0) + 1; });
      m[k] = e;
    });
    return m;
  }, [placed]);

  const staffAvailable = useMemo(() => {
    const m = {};
    DAYS.forEach((d, di) => HALVES.forEach((h) => {
      m[`${di}|${h.key}`] = pharmacists.filter((p) => p.available[di][h.key]).length;
    }));
    return m;
  }, [pharmacists]);

  const isDouble = (s, pid) => {
    const e = slotLoad[`${s.day}|${s.half}`];
    return !!e && e.byPharm[pid] > 1;
  };

  /* an overlap the user has said is fine (e.g. a clinic run alongside a ward) */
  const acceptedSet = useMemo(() => new Set(state.accepted || []), [state.accepted]);
  const nextAcceptedSet = useMemo(
    () => new Set([...(state.accepted || []), ...((state.nextWeek && state.nextWeek.accepted) || [])]),
    [state.accepted, state.nextWeek]
  );
  const isAccepted = (pid, day, half, isNext) =>
    (isNext ? nextAcceptedSet : acceptedSet).has(`${pid}|${day}|${half}`);
  const toggleAccepted = (pid, day, half, isNext) =>
    push((prev) => {
      const k = `${pid}|${day}|${half}`;
      if (isNext) {
        const base = prev.accepted || [];
        if (base.includes(k)) return { ...prev, accepted: base.filter((x) => x !== k) };
        const cur = prev.nextWeek.accepted || [];
        return {
          ...prev,
          nextWeek: { ...prev.nextWeek, accepted: cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k] },
        };
      }
      const cur = prev.accepted || [];
      return { ...prev, accepted: cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k] };
    });
  const flaggedDouble = (s, pid) => isDouble(s, pid) && !isAccepted(pid, s.day, s.half, false);

  const isOffDuty = (s, pid) => {
    const p = pharmById[pid];
    return !!p && s.day !== null && !p.available[s.day][s.half];
  };
  const chipHasIssue = (s) =>
    s.day !== null && s.names.some((pid) => flaggedDouble(s, pid) || isOffDuty(s, pid));

  const wardStats = useMemo(() => wards.map((w) => {
    const all = sessions.filter((s) => s.wardId === w.id);
    const inWeek = all.filter((s) => s.day !== null);
    return {
      ...w,
      total: all.length,
      placedCount: inWeek.length,
      unplaced: all.length - inWeek.length,
      staffed: inWeek.filter((s) => s.names.length > 0).length,
      mismatch: all.length !== w.required,
    };
  }), [wards, sessions]);

  const pharmStats = useMemo(() => pharmacists.map((p) => {
    const mineAll = sessions.filter((s) => s.names.includes(p.id));
    const minePlaced = mineAll.filter((s) => s.day !== null);
    const byWard = {};
    mineAll.forEach((s) => {
      const e = byWard[s.wardId] || { total: 0, timetabled: 0 };
      e.total += 1;
      if (s.day !== null) e.timetabled += 1;
      byWard[s.wardId] = e;
    });
    return {
      ...p,
      booked: mineAll.length,
      timetabled: minePlaced.length,
      toPlace: mineAll.length - minePlaced.length,
      remaining: p.capacity - mineAll.length,
      byWard,
      sessionsList: minePlaced,
      clashCount: minePlaced.filter((s) => flaggedDouble(s, p.id)).length,
      agreedCount: minePlaced.filter((s) => isDouble(s, p.id) && isAccepted(p.id, s.day, s.half, false)).length,
      offCount: minePlaced.filter((s) => isOffDuty(s, p.id)).length,
    };
  }), [pharmacists, sessions, slotLoad, acceptedSet]);

  const totals = useMemo(() => {
    const created = sessions.length;
    const inWeek = placed.length;
    const namesPlaced = placed.reduce((n, s) => n + s.names.length, 0);
    return {
      created, inWeek,
      covered: sessions.filter((s) => s.names.length > 0).length,
      namedToPlace: pool.filter((s) => s.names.length > 0).length,
      unplaced: created - inWeek,
      uncovered: sessions.filter((s) => s.names.length === 0).length,
      namesTotal: sessions.reduce((n, s) => n + s.names.length, 0),
      namesPlaced,
      clashCount: placed.reduce((n, s) => n + s.names.filter((pid) => flaggedDouble(s, pid)).length, 0) ,
      agreedCount: placed.reduce((n, s) => n + s.names.filter((pid) => isDouble(s, pid) && isAccepted(pid, s.day, s.half, false)).length, 0),
      offCount: placed.reduce((n, s) => n + s.names.filter((pid) => isOffDuty(s, pid)).length, 0),
      cap: pharmStats.reduce((n, p) => n + p.capacity, 0),
      over: pharmStats.filter((p) => p.booked > p.capacity).length,
    };
  }, [sessions, placed, pool, slotLoad, pharmStats, acceptedSet]);

  /* ---------- next week ---------- */
  const nextWeek = state.nextWeek || { label: "", absent: {}, cover: {}, accepted: [] };
  const absentMap = nextWeek.absent || {};
  const isAbsent = (pid, day, half) => !!absentMap[`${pid}|${day}|${half}`];
  const absentReason = (pid, day, half) => absentMap[`${pid}|${day}|${half}`];
  const absentCount = Object.keys(absentMap).length;

  const setAbsence = (keys, mode) =>
    push((prev) => {
      const cur = { ...prev.nextWeek.absent };
      if (mode === null) { keys.forEach((k) => { delete cur[k]; }); }
      else { keys.forEach((k) => { cur[k] = mode; }); }
      return { ...prev, nextWeek: { ...prev.nextWeek, absent: cur } };
    });

  const toggleAbsent = (pid, day, half) => {
    const k = `${pid}|${day}|${half}`;
    setAbsence([k], absentMap[k] === reason ? null : reason);
  };
  const toggleAbsentDay = (pid, day) => {
    const keys = [`${pid}|${day}|AM`, `${pid}|${day}|PM`];
    setAbsence(keys, keys.every((k) => absentMap[k] === reason) ? null : reason);
  };
  const toggleAbsentWeek = (pid) => {
    const keys = [];
    DAYS.forEach((d, di) => HALVES.forEach((h) => keys.push(`${pid}|${di}|${h.key}`)));
    setAbsence(keys, keys.every((k) => absentMap[k] === reason) ? null : reason);
  };
  const clearAbsences = () =>
    push((prev) => ({ ...prev, nextWeek: { ...prev.nextWeek, absent: {} } }));
  const resetNextWeek = () =>
    push((prev) => ({ ...prev, nextWeek: { ...prev.nextWeek, cover: {} } }));

  const coverOf = (s) => (nextWeek.cover[s.sid] !== undefined ? nextWeek.cover[s.sid] : s.names);
  const setCover = (sid, names) =>
    push((prev) => ({ ...prev, nextWeek: { ...prev.nextWeek, cover: { ...prev.nextWeek.cover, [sid]: names } } }));
  const addCoverName = (sid, pid) => {
    const s = sessions.find((x) => x.sid === sid);
    if (!s) return;
    const cur = coverOf(s);
    if (!cur.includes(pid)) setCover(sid, [...cur, pid]);
  };
  const removeCoverName = (sid, pid) => {
    const s = sessions.find((x) => x.sid === sid);
    if (!s) return;
    setCover(sid, coverOf(s).filter((n) => n !== pid));
  };
  const swapCover = (sid, outPid, inPid) => {
    const s = sessions.find((x) => x.sid === sid);
    if (!s) return;
    const cur = coverOf(s).filter((n) => n !== outPid);
    setCover(sid, inPid && !cur.includes(inPid) ? [...cur, inPid] : cur);
  };

  const nextPlaced = useMemo(() => placed.map((s) => ({ ...s, names: coverOf(s) })), [placed, nextWeek.cover]);

  const nextSlotLoad = useMemo(() => {
    const m = {};
    nextPlaced.forEach((s) => {
      const k = `${s.day}|${s.half}`;
      const e = m[k] || { sessions: 0, names: 0, byPharm: {} };
      e.sessions += 1; e.names += s.names.length;
      s.names.forEach((pid) => { e.byPharm[pid] = (e.byPharm[pid] || 0) + 1; });
      m[k] = e;
    });
    return m;
  }, [nextPlaced]);

  const nextStaffAvailable = useMemo(() => {
    const m = {};
    DAYS.forEach((d, di) => HALVES.forEach((h) => {
      m[`${di}|${h.key}`] = pharmacists.filter((p) => p.available[di][h.key] && !isAbsent(p.id, di, h.key)).length;
    }));
    return m;
  }, [pharmacists, absentMap]);

  const nextStats = useMemo(() => pharmacists.map((p) => {
    const mine = nextPlaced.filter((s) => s.names.includes(p.id));
    const offSessions = DAYS.reduce((n, d, di) =>
      n + HALVES.filter((h) => isAbsent(p.id, di, h.key)).length, 0);
    const capacity = Math.max(0, p.capacity - offSessions);
    return {
      ...p, capacity, offSessions,
      booked: mine.length,
      remaining: capacity - mine.length,
      sessionsList: mine,
      clashCount: mine.filter((s) =>
        (nextSlotLoad[`${s.day}|${s.half}`] || { byPharm: {} }).byPharm[p.id] > 1
        && !isAccepted(p.id, s.day, s.half, true)).length,
    };
  }), [pharmacists, nextPlaced, nextSlotLoad, absentMap, nextAcceptedSet]);

  const gaps = useMemo(() => nextPlaced
    .map((s) => ({ s, absent: s.names.filter((pid) => isAbsent(pid, s.day, s.half)) }))
    .filter((g) => g.absent.length > 0 || g.s.names.length === 0)
    .sort((a, b) => (a.s.day - b.s.day) || (a.s.half === b.s.half ? 0 : a.s.half === "AM" ? -1 : 1)),
  [nextPlaced, absentMap]);

  /* ---------- drag & drop ---------- */
  const onDragStart = (e, sid, locked) => {
    if (locked) { e.preventDefault(); return; }
    setDragId(sid); setSelected(sid);
    try { e.dataTransfer.setData("text/plain", sid); e.dataTransfer.effectAllowed = "move"; } catch (err) {}
  };
  const readDrag = (e) => {
    if (dragId) return dragId;
    try { return e.dataTransfer.getData("text/plain"); } catch (err) { return null; }
  };
  const onDropSlot = (e, day, half) => {
    e.preventDefault();
    const sid = readDrag(e);
    if (sid) moveSession(sid, day, half);
    setDragId(null); setDragOver(null);
  };
  const onDropPool = (e) => {
    e.preventDefault();
    const sid = readDrag(e);
    if (sid) {
      const s = sessions.find((x) => x.sid === sid);
      if (s && (!s.fixed || unlockFixed)) moveSession(sid, null, null);
    }
    setDragId(null); setDragOver(null);
  };
  const clickSlot = (day, half) => {
    if (!selected) return;
    const s = sessions.find((x) => x.sid === selected);
    if (!s || (s.fixed && !unlockFixed)) return;
    moveSession(selected, day, half);
  };

  /* ---------- export ---------- */
  const download = (filename, text, mime) => {
    try {
      const blob = new Blob([text], { type: `${mime || "text/csv"};charset=utf-8;` });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) { setSaveNote("Export blocked"); }
  };
  const csv = (rows) => rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const exportWeek = () => {
    const rows = [["Day", "Session", "Time", "Location", "Pharmacists", "Number on session", "Fixed"]];
    DAYS.forEach((d, di) => HALVES.forEach((h) => slotSessions(di, h.key).forEach((s) => {
      rows.push([d, h.label, h.time,
        wardById[s.wardId] ? wardById[s.wardId].name : s.wardId,
        s.names.map((pid) => (pharmById[pid] ? pharmById[pid].name : "?")).join("; ") || "Nobody named",
        s.names.length, s.fixed ? "Yes" : "No"]);
    })));
    download("weekly-sessions.csv", csv(rows));
  };
  const exportPharmacists = () => {
    const rows = [["Pharmacist", "Location", "Sessions", "In the week", "Free to place", "Total allocated", "Sessions available"]];
    pharmStats.forEach((p) => {
      const entries = Object.entries(p.byWard);
      if (!entries.length) rows.push([p.name, "—", 0, 0, 0, 0, p.capacity]);
      entries.forEach(([wid, e]) => rows.push([
        p.name, wardById[wid] ? wardById[wid].name : wid,
        e.total, e.timetabled, e.total - e.timetabled, p.booked, p.capacity,
      ]));
    });
    download("pharmacist-allocation.csv", csv(rows));
  };

  /* rows for the rota calendar: split wards get an AM row and a PM row,
     everything else gets a single row covering the whole day */
  const splitWards = state.splitWards || ["dispensary"];
  const toggleSplitWard = (wid) =>
    push((prev) => {
      const cur = prev.splitWards || [];
      return { ...prev, splitWards: cur.includes(wid) ? cur.filter((x) => x !== wid) : [...cur, wid] };
    });

  const cellFrom = (list, wid, di, halves, withAbsence) => {
    const found = list.filter((s) => s.wardId === wid && s.day === di && halves.includes(s.half));
    if (!found.length) return { none: true, names: [] };
    const seen = {};
    found.forEach((s) => s.names.forEach((pid) => {
      const away = withAbsence && isAbsent(pid, s.day, s.half);
      if (!seen[pid] || (seen[pid].away && !away)) {
        seen[pid] = {
          pid, name: pharmById[pid] ? pharmById[pid].name : "?", away,
          reason: withAbsence ? absentReason(pid, s.day, s.half) : null,
        };
      }
    }));
    return { none: false, names: Object.values(seen), sessions: found.length };
  };

  const buildRows = (list, withAbsence) => {
    const rows = [];
    wards.forEach((w) => {
      if (splitWards.includes(w.id)) {
        HALVES.forEach((h) => rows.push({
          key: `${w.id}-${h.key}`, ward: w, label: `${w.name} — ${h.label.toLowerCase()}`,
          cells: DAYS.map((d, di) => cellFrom(list, w.id, di, [h.key], withAbsence)),
        }));
      } else {
        rows.push({
          key: w.id, ward: w, label: w.name,
          cells: DAYS.map((d, di) => cellFrom(list, w.id, di, ["AM", "PM"], withAbsence)),
        });
      }
    });
    return rows;
  };

  const cellFor = (wid, di, halves) => cellFrom(nextPlaced, wid, di, halves, true);

  const nextRows = useMemo(
    () => buildRows(nextPlaced, true),
    [wards, nextPlaced, absentMap, pharmById, splitWards]
  );

  const awayList = useMemo(() => {
    const out = [];
    DAYS.forEach((d, di) => HALVES.forEach((h) => {
      pharmacists.forEach((p) => {
        const r = absentReason(p.id, di, h.key);
        if (r) out.push({ day: di, half: h.key, name: p.name, reason: r });
      });
    }));
    return out;
  }, [pharmacists, absentMap]);

  /* open the print dialog on generated markup; falls back to a download */
  const printHtml = (html, filename) => {
    try {
      const f = document.createElement("iframe");
      f.setAttribute("style", "position:fixed;right:0;bottom:0;width:0;height:0;border:0;");
      document.body.appendChild(f);
      const d = f.contentWindow.document;
      d.open(); d.write(html); d.close();
      setTimeout(() => {
        try {
          f.contentWindow.focus();
          f.contentWindow.print();
          setTimeout(() => { try { f.remove(); } catch (e) {} }, 2000);
        } catch (e) {
          f.remove();
          download(filename, html, "text/html");
          setSaveNote("Opened as a file — print from there");
          setTimeout(() => setSaveNote(""), 3000);
        }
      }, 500);
    } catch (e) {
      download(filename, html, "text/html");
    }
  };

  const buildCalendarHtml = (mode) => {
    const isNextMode = mode !== "template";
    let rows = isNextMode ? nextRows : buildRows(placed, false);
    if (hideEmpty) rows = rows.filter((r) => !r.cells.every((c) => c.none));
    const title = isNextMode
      ? (nextWeek.label ? `Pharmacy rota — ${nextWeek.label}` : "Pharmacy rota — next week")
      : "Pharmacy rota — standard week";
    const th = (t, extra) => `<th style="border:1px solid #000;padding:3px 5px;font-size:9px;background:#e0e0e0;${extra || ""}">${t}</th>`;
    const HATCH = "repeating-linear-gradient(45deg,#bbbbbb 0px,#bbbbbb 1.5px,#ffffff 1.5px,#ffffff 7px)";
    let html = `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
<style>
  @page { size: A4 landscape; margin: 6mm; }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; box-sizing: border-box; }
  body { font-family: Segoe UI, Helvetica, Arial, sans-serif; color: #000; margin: 0; padding: 10px; background: #fff; }
  #page { transform-origin: top left; }
  #sheet { width: 1075px; }
  h1 { font-size: 14px; margin: 0 0 1px; }
  h2 { font-size: 10px; margin: 8px 0 3px; }
  p.sub { font-size: 9px; color: #333; margin: 0 0 7px; }
  table { border-collapse: collapse; width: 100%; table-layout: fixed; }
  td, th { vertical-align: top; word-wrap: break-word; }
  .legend { font-size: 8.5px; color: #222; margin-top: 6px; }
  .sw { display:inline-block; width:13px; height:9px; border:1px solid #000; vertical-align:-1px; margin-right:3px; }
  ul.away { font-size: 8.5px; margin: 0; padding-left: 14px; columns: 4; }
  #bar { margin-bottom: 10px; }
  #bar button { font: inherit; font-size: 12px; padding: 6px 12px; cursor: pointer; border: 1px solid #444; background: #f0f0f0; border-radius: 4px; }
  @media print { #bar { display: none !important; } body { padding: 0; } }
</style></head><body>
<div id="bar"><button onclick="window.print()">Print / Save as PDF</button>
<span style="font-size:11px;color:#555;margin-left:8px;">Set the destination to “Save as PDF”, landscape, A4.</span></div>
<div id="page"><div id="sheet">
<h1>${title}</h1>
<p class="sub">Mornings 9am–1pm, afternoons 1pm–5pm. Solid grey cells are sessions that area does not run.</p>
<table><thead><tr>${th("Location", "text-align:left;width:17%;")}`;
    DAYS.forEach((d) => { html += th(d, "width:16.6%;"); });
    html += `</tr></thead><tbody>`;
    rows.forEach((row, ri) => {
      const emph = splitWards.includes(row.ward.id);
      const nextIsEmph = rows[ri + 1] && splitWards.includes(rows[ri + 1].ward.id);
      const heavyBottom = emph && !nextIsEmph;
      const rowBg = emph ? "#ebebeb" : "#ffffff";
      const bb = heavyBottom ? "border-bottom:2.5px solid #000;" : "";
      html += `<tr><td style="border:1px solid #000;${bb}padding:3px 5px;font-size:9px;font-weight:${emph ? 700 : 600};background:${emph ? "#d5d5d5" : "#f4f4f4"};${emph ? "text-transform:uppercase;" : ""}">${row.label}</td>`;
      row.cells.forEach((c) => {
        if (c.none) { html += `<td style="border:1px solid #000;${bb}background:#c8c8c8;">&nbsp;</td>`; return; }
        const on = c.names.filter((n) => !n.away).map((n) => n.name);
        const away = c.names.filter((n) => n.away);
        const bg = on.length === 0 ? HATCH : rowBg;
        let inner = `<span style="font-size:9.5px;font-weight:600;">${on.join(", ")}</span>`;
        if (!on.length) inner = `<span style="font-weight:700;font-size:9px;">NEEDS COVER</span>`;
        if (away.length) inner += `<div style="font-size:8px;font-style:italic;">${away.map((n) => `<s>${n.name}</s> ${reasonInfo(n.reason).label.toLowerCase()}`).join("<br>")}</div>`;
        html += `<td style="border:1px solid #000;${bb}${on.length === 0 ? "border:2px solid #000;" : ""}background:${bg};padding:3px 5px;">${inner}</td>`;
      });
      html += `</tr>`;
    });
    html += `</tbody></table>
<p class="legend">
<span class="sw" style="background:#c8c8c8;"></span>No session &nbsp;
<span class="sw" style="background:#ffffff;"></span>Covered &nbsp;
<span class="sw" style="background:${HATCH};border-width:2px;"></span>Nobody covering &nbsp;
<span style="font-style:italic;"><s>Name</s></span> away, with the reason</p>`;
    if (isNextMode && awayList.length) {
      html += `<h2>Not on the wards this week</h2><ul class="away">`;
      awayList.forEach((a) => {
        html += `<li>${DAY_SHORT[a.day]} ${a.half} — ${a.name}, ${reasonInfo(a.reason).label.toLowerCase()}</li>`;
      });
      html += `</ul>`;
    }
    html += `</div></div>
<script>
  function fitToPage(){
    var page=document.getElementById('page');
    page.style.transform='none';
    var h=page.scrollHeight, w=1075;
    var availH=738, availW=1075;
    var k=Math.min(availH/h, availW/w, 1);
    if(k<1){ page.style.transform='scale('+k+')'; }
  }
  window.addEventListener('load', fitToPage);
  window.addEventListener('beforeprint', fitToPage);
<\/script>
</body></html>`;
    return { html, filename: isNextMode
      ? `next-week-rota${nextWeek.label ? "-" + nextWeek.label.replace(/[^a-z0-9]+/gi, "-") : ""}.html`
      : "standard-week-rota.html" };
  };

  const exportNextCalendar = (mode) => {
    const { html, filename } = buildCalendarHtml(mode);
    download(filename, html, "text/html");
  };

  const printCalendar = (mode) => {
    const { html, filename } = buildCalendarHtml(mode);
    printHtml(html, filename);
  };

  const exportNextWeek = () => {
    const rows = [["Week", "Day", "Session", "Time", "Location", "Pharmacists", "Needs cover"]];
    DAYS.forEach((d, di) => HALVES.forEach((h) =>
      nextPlaced.filter((s) => s.day === di && s.half === h.key).forEach((s) => {
        const away = s.names.filter((pid) => isAbsent(pid, di, h.key));
        const on = s.names.filter((pid) => !isAbsent(pid, di, h.key));
        rows.push([
          nextWeek.label || "Next week", d, h.label, h.time,
          wardById[s.wardId] ? wardById[s.wardId].name : s.wardId,
          on.map((pid) => (pharmById[pid] ? pharmById[pid].name : "?")).join("; ") || "Nobody",
          away.length ? `Yes — ${away.map((pid) => (pharmById[pid] ? pharmById[pid].name : "?")).join("; ")} off` : (on.length ? "No" : "Yes — nobody named"),
        ]);
      })));
    download("next-week-rota.csv", csv(rows));
  };

  /* full backup — everything, so a colleague can pick up exactly where you left off */
  const saveBackup = () => {
    const stamp = new Date().toISOString().slice(0, 10);
    const payload = { format: "pharmacy-session-allocation", version: 1, saved: stamp, state };
    download(`pharmacy-rota-backup-${stamp}.json`, JSON.stringify(payload, null, 2), "application/json");
  };

  const loadBackup = (file) => {
    if (!file) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const parsed = JSON.parse(r.result);
        const incoming = parsed && parsed.state ? parsed.state : parsed;
        const clean = migrate(incoming);
        if (!clean) { setSaveNote("File not recognised"); return; }
        if (!window.confirm("Load this file? It replaces everything currently on the board.")) return;
        push(clean);
        setSelected(null);
        setSaveNote("Loaded");
        setTimeout(() => setSaveNote(""), 2000);
      } catch (e) {
        setSaveNote("Could not read that file");
        setTimeout(() => setSaveNote(""), 2500);
      }
    };
    r.readAsText(file);
  };

  /* ---- working with a rota file on disk (Edge/Chrome) ---- */
  const supportsFiles = typeof window !== "undefined" && typeof window.showSaveFilePicker === "function";
  const handleRef = useRef(null);
  const payloadOf = (st) => JSON.stringify({
    format: "pharmacy-session-allocation", version: 1,
    saved: new Date().toISOString(), state: st,
  }, null, 2);

  const FILE_TYPES = [{ description: "Rota file", accept: { "application/json": [".json"] } }];

  const writeTo = async (handle, st) => {
    const perm = handle.queryPermission ? await handle.queryPermission({ mode: "readwrite" }) : "granted";
    if (perm !== "granted" && handle.requestPermission) {
      const asked = await handle.requestPermission({ mode: "readwrite" });
      if (asked !== "granted") throw new Error("permission refused");
    }
    const w = await handle.createWritable();
    await w.write(payloadOf(st));
    await w.close();
  };

  const openRotaFile = async () => {
    if (!supportsFiles) { if (fileRef.current) fileRef.current.click(); return; }
    try {
      const [handle] = await window.showOpenFilePicker({ types: FILE_TYPES, multiple: false });
      const file = await handle.getFile();
      const parsed = JSON.parse(await file.text());
      const clean = migrate(parsed && parsed.state ? parsed.state : parsed);
      if (!clean) { setSaveNote("File not recognised"); return; }
      if (dirty && !window.confirm("Open this file? Unsaved changes on the board will be lost.")) return;
      handleRef.current = handle;
      setFileName(handle.name);
      push(clean);
      setSelected(null);
      setDirty(false);
      setSaveNote(`Opened ${handle.name}`);
      setTimeout(() => setSaveNote(""), 2500);
    } catch (e) {
      if (e && e.name !== "AbortError") setSaveNote("Could not open that file");
    }
  };

  const saveRotaFile = async () => {
    if (!supportsFiles || !handleRef.current) { saveRotaFileAs(); return; }
    try {
      await writeTo(handleRef.current, state);
      setDirty(false);
      setSaveNote(`Saved to ${handleRef.current.name}`);
      setTimeout(() => setSaveNote(""), 2500);
    } catch (e) {
      setSaveNote("Could not write to that file");
      setTimeout(() => setSaveNote(""), 3000);
    }
  };

  const saveRotaFileAs = async () => {
    const suggested = `pharmacy-rota-${new Date().toISOString().slice(0, 10)}.json`;
    if (!supportsFiles) { saveBackup(); return; }
    try {
      const handle = await window.showSaveFilePicker({ suggestedName: suggested, types: FILE_TYPES });
      await writeTo(handle, state);
      handleRef.current = handle;
      setFileName(handle.name);
      setDirty(false);
      setSaveNote(`Saved to ${handle.name}`);
      setTimeout(() => setSaveNote(""), 2500);
    } catch (e) {
      if (e && e.name !== "AbortError") { saveBackup(); }
    }
  };

  const resetAll = () => {
    if (!window.confirm("Reset the board back to the original schedule? All allocations will be lost.")) return;
    push(buildInitialState());
    setSelected(null);
  };

  const selectedSession = selected ? sessions.find((s) => s.sid === selected) : null;

  /* ------------------------------------------------------------------ */
  /*  Render functions                                                   */
  /* ------------------------------------------------------------------ */

  /* name badges + add control, used on every session */
  const renderNames = (s, compact, mode) => {
    const isNext = mode === "next";
    const taken = isNext ? coverOf(s) : s.names;
    const stats = isNext ? nextStats : pharmStats;
    const load = isNext ? nextSlotLoad : slotLoad;
    const doAdd = (pid) => (isNext ? addCoverName(s.sid, pid) : addName(s.sid, pid));
    const doRemove = (pid) => (isNext ? removeCoverName(s.sid, pid) : removeName(s.sid, pid));
    return (
      <div onClick={(e) => e.stopPropagation()}>
        {taken.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginTop: 3 }}>
            {taken.map((pid) => {
              const p = pharmById[pid];
              const rawDbl = s.day !== null && (load[`${s.day}|${s.half}`] || { byPharm: {} }).byPharm[pid] > 1;
              const agreed = rawDbl && isAccepted(pid, s.day, s.half, isNext);
              const dbl = rawDbl && !agreed;
              const off = isOffDuty(s, pid);
              const away = isNext && s.day !== null && isAbsent(pid, s.day, s.half);
              const st = stats.find((x) => x.id === pid);
              const over = st && st.booked > st.capacity;
              const flag = dbl || off || over || away;
              return (
                <span key={pid}
                  title={`${p ? p.name : "?"}${away ? " — off next week" : ""}${dbl ? " — already on another session at this time" : ""}${agreed ? " — overlap agreed" : ""}${off ? " — not working this session" : ""}${over ? " — over their sessions available" : ""}`}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 3,
                    background: flag ? "#f6d9d9" : "#ffffff",
                    border: `1px solid ${flag ? "#dda3a3" : T.rule}`,
                    color: flag ? T.bad : T.ink2,
                    textDecoration: away ? "line-through" : "none",
                    borderRadius: 3, padding: "0 2px 0 4px",
                    fontSize: compact ? 10 : 11, fontWeight: 600, lineHeight: 1.6,
                  }}>
                  {p ? p.name : "?"}
                  {agreed && <span title="Overlap agreed" style={{ color: T.ink3, fontSize: 9.5, fontWeight: 700 }}>≡</span>}
                  {rawDbl && (
                    <button type="button" onClick={() => toggleAccepted(pid, s.day, s.half, isNext)}
                      title={agreed ? "Overlap agreed — click to flag it again" : "This double booking is fine — stop flagging it"}
                      style={{
                        border: "none", background: "transparent", cursor: "pointer",
                        color: agreed ? T.good : T.bad, fontSize: 10, padding: "0 1px", lineHeight: 1, fontWeight: 700,
                      }}>{agreed ? "↺" : "✓"}</button>
                  )}
                  <button type="button" onClick={() => doRemove(pid)} title="Remove"
                    style={{ border: "none", background: "transparent", cursor: "pointer", color: flag ? T.bad : T.ink3, fontSize: 11, padding: "0 1px", lineHeight: 1 }}>×</button>
                </span>
              );
            })}
          </div>
        )}
        <select
          value=""
          onChange={(e) => { if (e.target.value) doAdd(e.target.value); }}
          style={{
            width: "100%", marginTop: 3, fontSize: compact ? 10 : 11,
            padding: "1px 2px", border: `1px dashed ${taken.length ? T.rule : "#c3ccd6"}`,
            borderRadius: 4, color: taken.length ? T.ink3 : T.warn,
            background: taken.length ? "transparent" : T.warnSoft, cursor: "pointer",
          }}
        >
          <option value="">{taken.length ? "+ add another" : "+ add a name"}</option>
          {stats.map((p) => {
            if (taken.includes(p.id)) return null;
            const busy = s.day !== null && (load[`${s.day}|${s.half}`] || { byPharm: {} }).byPharm[p.id];
            const off = s.day !== null && !p.available[s.day][s.half];
            const away = isNext && s.day !== null && isAbsent(p.id, s.day, s.half);
            const full = p.remaining <= 0;
            const tags = [away ? "off" : null, busy ? "busy" : null, off ? "not in" : null, full ? "full" : null].filter(Boolean).join(", ");
            return (
              <option key={p.id} value={p.id}>
                {p.name} · {p.remaining} left{tags ? ` (${tags})` : ""}
              </option>
            );
          })}
        </select>
      </div>
    );
  };

  const renderChip = (s, inPool, mode) => {
    const isNext = mode === "next";
    const w = wardById[s.wardId] || { name: s.wardId, cat: "inpatient" };
    const c = CATS[w.cat] || CATS.inpatient;
    const names = isNext ? coverOf(s) : s.names;
    const locked = isNext || (s.fixed && !unlockFixed);
    const gapHere = isNext && (names.length === 0 || names.some((pid) => isAbsent(pid, s.day, s.half)));
    const bad = isNext ? gapHere : chipHasIssue(s);
    const nextClash = isNext && s.day !== null && names.some((pid) =>
      (nextSlotLoad[`${s.day}|${s.half}`] || { byPharm: {} }).byPharm[pid] > 1
      && !isAccepted(pid, s.day, s.half, true));
    const isSel = selected === s.sid;
    const dimmed = highlight !== "all" && !names.includes(highlight);
    return (
      <div key={s.sid}
        draggable={!locked}
        onDragStart={(e) => onDragStart(e, s.sid, locked)}
        onDragEnd={() => { setDragId(null); setDragOver(null); }}
        onClick={(e) => { e.stopPropagation(); setSelected(isSel ? null : s.sid); }}
        title={`${w.name}${locked ? " (fixed session)" : ""}`}
        style={{
          background: (bad || nextClash) ? T.badSoft : c.soft,
          border: `1px solid ${isSel ? T.ink : (bad || nextClash) ? "#e0b4b4" : c.line}`,
          boxShadow: isSel ? `0 0 0 2px ${T.ink}22` : "none",
          borderRadius: 5, padding: "3px 5px 4px", marginBottom: 4,
          cursor: locked ? "pointer" : "grab",
          opacity: dragId === s.sid ? 0.4 : dimmed ? 0.28 : 1,
          fontSize: 11.5, lineHeight: 1.25, minWidth: 0,
        }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 6, height: 6, borderRadius: 3, background: c.dot, flexShrink: 0 }} />
          <span style={{ color: T.ink, fontWeight: 600, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {w.name}
          </span>
          {names.length > 1 && <span title="Shared session" style={{ fontSize: 9.5, color: T.ink3, fontWeight: 700 }}>×{names.length}</span>}
          {!isNext && locked && <span style={{ color: T.ink3, fontSize: 9 }} title="Fixed session">▪</span>}
        </div>
        {renderNames(s, !inPool, mode)}
      </div>
    );
  };

  const renderWeekGrid = (mode) => (
    <div style={{ border: `1px solid ${T.rule}`, borderRadius: 8, overflow: "hidden", background: T.card }}>
      <div style={{ display: "grid", gridTemplateColumns: "80px repeat(5, minmax(0,1fr))" }}>
        <div style={{ background: T.paper, borderBottom: `1px solid ${T.rule}`, borderRight: `1px solid ${T.rule}` }} />
        {DAYS.map((d, i) => (
          <div key={d} style={{
            background: T.paper, borderBottom: `1px solid ${T.rule}`,
            borderRight: i < 4 ? `1px solid ${T.ruleSoft}` : "none",
            padding: "8px 10px", fontSize: 12.5, fontWeight: 700, color: T.ink,
            letterSpacing: "0.04em", textTransform: "uppercase",
          }}>{DAY_SHORT[i]}</div>
        ))}
        {HALVES.map((h, hi) => (
          <React.Fragment key={h.key}>
            <div style={{
              background: T.paper, borderRight: `1px solid ${T.rule}`,
              borderBottom: hi === 0 ? `1px solid ${T.rule}` : "none",
              padding: "10px 8px", fontSize: 11.5, color: T.ink2, fontWeight: 600,
            }}>
              {h.label}
              <div style={{ color: T.ink3, fontWeight: 400, fontSize: 10.5, marginTop: 2 }}>{h.time}</div>
            </div>
            {DAYS.map((d, di) => {
              const isNext = mode === "next";
              const list = (isNext ? nextPlaced : placed).filter((s) => s.day === di && s.half === h.key);
              const over = !isNext && dragOver === `${di}-${h.key}`;
              const load = (isNext ? nextSlotLoad : slotLoad)[`${di}|${h.key}`] || { sessions: 0, names: 0 };
              const staff = (isNext ? nextStaffAvailable : staffAvailable)[`${di}|${h.key}`] || 0;
              const uncovered = isNext
                ? list.filter((s) => s.names.length === 0 || s.names.some((pid) => isAbsent(pid, di, h.key))).length
                : list.filter((s) => s.names.length === 0).length;
              const short = load.names > staff;
              return (
                <div key={`${di}-${h.key}`}
                  onDragOver={isNext ? undefined : (e) => { e.preventDefault(); setDragOver(`${di}-${h.key}`); }}
                  onDragLeave={isNext ? undefined : () => setDragOver(null)}
                  onDrop={isNext ? undefined : (e) => onDropSlot(e, di, h.key)}
                  onClick={isNext ? undefined : () => clickSlot(di, h.key)}
                  style={{
                    borderRight: di < 4 ? `1px solid ${T.ruleSoft}` : "none",
                    borderBottom: hi === 0 ? `1px solid ${T.rule}` : "none",
                    background: over ? T.accentSoft : (!isNext && selected) ? "#fcfdfd" : T.card,
                    outline: over ? `2px dashed ${T.accent}` : "none", outlineOffset: -3,
                    padding: 6, minHeight: 110, cursor: (!isNext && selected) ? "copy" : "default",
                  }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5, paddingLeft: 2, gap: 4 }}>
                    <span style={{ fontSize: 10.5, color: short ? T.bad : T.ink3, fontVariantNumeric: "tabular-nums", fontWeight: short ? 700 : 400 }}
                      title={`${load.names} pharmacist places needed, ${staff} pharmacists in this session`}>
                      {list.length}s · {load.names}/{staff}
                    </span>
                    {uncovered > 0 && (
                      <span style={{ fontSize: 10, color: isNext ? T.bad : T.warn, fontWeight: 600 }}>
                        {uncovered} {isNext ? "to cover" : "open"}
                      </span>
                    )}
                  </div>
                  {list.map((s) => renderChip(s, false, mode))}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );

  const renderRail = () => {
    const grouped = {};
    pool.forEach((s) => {
      const w = wardById[s.wardId];
      if (filterWard !== "all" && (!w || w.cat !== filterWard)) return;
      if (filterPharm === "none" && s.names.length) return;
      if (filterPharm !== "all" && filterPharm !== "none" && !s.names.includes(filterPharm)) return;
      (grouped[s.wardId] = grouped[s.wardId] || []).push(s);
    });
    return (
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver("pool"); }}
        onDragLeave={() => setDragOver(null)}
        onDrop={onDropPool}
        style={{
          border: `1px solid ${dragOver === "pool" ? T.accent : T.rule}`,
          background: dragOver === "pool" ? T.accentSoft : T.card,
          borderRadius: 8, padding: 12, position: "sticky", top: 12,
        }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <h2 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: T.ink }}>Sessions to place</h2>
          <Pill tone={pool.length ? "warn" : "good"}>{pool.length}</Pill>
        </div>
        <p style={{ margin: "4px 0 10px", fontSize: 11.5, color: T.ink3, lineHeight: 1.45 }}>
          Drag onto a slot, or tap a session then tap a slot. Names can be added before or after placing.
        </p>
        <select value={filterWard} onChange={(e) => setFilterWard(e.target.value)}
          style={{ width: "100%", fontSize: 12, padding: "5px 6px", marginBottom: 6, border: `1px solid ${T.rule}`, borderRadius: 5, color: T.ink2, background: T.card }}>
          <option value="all">All areas</option>
          {Object.entries(CATS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={filterPharm} onChange={(e) => setFilterPharm(e.target.value)}
          style={{ width: "100%", fontSize: 12, padding: "5px 6px", marginBottom: 10, border: `1px solid ${T.rule}`, borderRadius: 5, color: T.ink2, background: T.card }}>
          <option value="all">Everyone</option>
          <option value="none">No name yet</option>
          {pharmStats.filter((p) => p.toPlace > 0).map((p) => (
            <option key={p.id} value={p.id}>{p.name} — {p.toPlace} to place</option>
          ))}
        </select>

        <div style={{ maxHeight: 460, overflowY: "auto", paddingRight: 2 }}>
          {Object.keys(grouped).length === 0 && (
            <div style={{ fontSize: 12, color: T.ink3, padding: "16px 4px", textAlign: "center" }}>Nothing here.</div>
          )}
          {Object.entries(grouped).map(([wid, list]) => (
            <div key={wid} style={{ marginBottom: 9 }}>
              <div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.06em", color: T.ink3, fontWeight: 700, marginBottom: 3 }}>
                {wardById[wid] ? wardById[wid].name : wid} · {list.length}
              </div>
              {list.map((s) => renderChip(s, true))}
            </div>
          ))}
        </div>

        {selectedSession && (
          <div style={{ marginTop: 12, borderTop: `1px solid ${T.rule}`, paddingTop: 10 }}>
            <div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.06em", color: T.ink3, fontWeight: 700 }}>Selected session</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.ink, margin: "4px 0 2px" }}>
              {wardById[selectedSession.wardId] ? wardById[selectedSession.wardId].name : ""}
            </div>
            <div style={{ fontSize: 11.5, color: T.ink3, marginBottom: 8 }}>
              {selectedSession.day === null
                ? "Not yet in the week"
                : `${DAYS[selectedSession.day]} · ${HALVES.find((h) => h.key === selectedSession.half).label}`}
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {selectedSession.day !== null && (
                <Btn size="sm" onClick={() => moveSession(selectedSession.sid, null, null)} disabled={selectedSession.fixed && !unlockFixed}>
                  Return to pool
                </Btn>
              )}
              <Btn size="sm" onClick={() => toggleLock(selectedSession.sid)}>
                {selectedSession.fixed ? "Make movable" : "Mark as fixed"}
              </Btn>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderCover = (w) => {
    const wardSessions = sessions.filter((s) => s.wardId === w.id);
    const cover = {};
    wardSessions.forEach((s) => {
      s.names.forEach((pid) => {
        const e = cover[pid] || { total: 0, timetabled: 0 };
        e.total += 1;
        if (s.day !== null) e.timetabled += 1;
        cover[pid] = e;
      });
    });
    const uncovered = wardSessions.filter((s) => s.names.length === 0).length;
    return (
      <tr style={{ background: T.paper }}>
        <td colSpan={6} style={{ padding: "4px 12px 12px 30px" }}>
          <div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.06em", color: T.ink3, fontWeight: 700, marginBottom: 6 }}>
            Who covers this
          </div>
          {Object.keys(cover).length === 0 && (
            <div style={{ fontSize: 12, color: T.ink3, marginBottom: 8 }}>Nobody named yet.</div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 9 }}>
            {Object.entries(cover).map(([pid, e]) => {
              const p = pharmById[pid];
              return (
                <div key={pid} style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: T.ink, minWidth: 90 }}>{p ? p.name : "—"}</span>
                  <Btn size="sm" onClick={() => removeCover(w.id, pid)}>−</Btn>
                  <span style={{ fontSize: 13, fontWeight: 700, color: T.ink, fontVariantNumeric: "tabular-nums", minWidth: 16, textAlign: "center" }}>{e.total}</span>
                  <Btn size="sm" onClick={() => addCover(w.id, pid)}>+</Btn>
                  <span style={{ fontSize: 11.5, color: T.ink3 }}>
                    {e.timetabled} in the week · {e.total - e.timetabled} free to place
                  </span>
                  <Btn size="sm" tone="danger" onClick={() => clearCover(w.id, pid)}>Clear</Btn>
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <select value="" onChange={(e) => { if (e.target.value) addCover(w.id, e.target.value); }}
              style={{ fontSize: 12, padding: "4px 6px", border: `1px solid ${T.rule}`, borderRadius: 5, color: T.ink, background: T.card, minWidth: 220 }}>
              <option value="">Add a pharmacist to this area…</option>
              {pharmStats.map((p) => (
                <option key={p.id} value={p.id}>{p.name} — {p.remaining} sessions left</option>
              ))}
            </select>
            <span style={{ fontSize: 11.5, color: uncovered ? T.warn : T.good, fontWeight: 600 }}>
              {uncovered ? `${uncovered} session${uncovered === 1 ? "" : "s"} with nobody named` : "Every session named"}
            </span>
          </div>
          <div style={{ fontSize: 11, color: T.ink3, marginTop: 7, lineHeight: 1.45 }}>
            Cover goes onto an empty unplaced session first. Add the same area to two pharmacists to share it — put both names on one session only if they are genuinely there together.
          </div>
        </td>
      </tr>
    );
  };

  const renderWards = () => {
    const byCat = {};
    wardStats.forEach((w) => { (byCat[w.cat] = byCat[w.cat] || []).push(w); });
    return (
      <div style={{ display: "grid", gap: 14 }}>
        {Object.entries(CATS).map(([ck, cv]) => {
          const list = byCat[ck] || [];
          if (!list.length) return null;
          return (
            <div key={ck} style={{ border: `1px solid ${T.rule}`, borderRadius: 8, background: T.card, overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 12px", background: T.paper, borderBottom: `1px solid ${T.rule}` }}>
                <span style={{ width: 8, height: 8, borderRadius: 4, background: cv.dot }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: T.ink }}>{cv.label}</span>
                <span style={{ fontSize: 11.5, color: T.ink3 }}>{list.reduce((n, w) => n + w.total, 0)} sessions</span>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                <thead>
                  <tr style={{ color: T.ink3, fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    <th style={{ textAlign: "left", padding: "6px 12px", fontWeight: 700 }}>Location</th>
                    <th style={{ textAlign: "center", padding: "6px 4px", fontWeight: 700, width: 96 }}>Required</th>
                    <th style={{ textAlign: "center", padding: "6px 4px", fontWeight: 700, width: 70 }}>In week</th>
                    <th style={{ textAlign: "center", padding: "6px 4px", fontWeight: 700, width: 70 }}>To place</th>
                    <th style={{ textAlign: "center", padding: "6px 4px", fontWeight: 700, width: 80 }}>Named</th>
                    <th style={{ textAlign: "right", padding: "6px 12px", fontWeight: 700, width: 90 }}>Adjust</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((w) => (
                    <React.Fragment key={w.id}>
                      <tr style={{ borderTop: `1px solid ${T.ruleSoft}`, background: openWard === w.id ? T.paper : "transparent" }}>
                        <td onClick={() => setOpenWard(openWard === w.id ? null : w.id)}
                          style={{ padding: "7px 12px", color: T.ink, fontWeight: 500, cursor: "pointer" }}
                          title="Set who covers this area">
                          <span style={{ color: T.ink3, marginRight: 6, fontSize: 10 }}>{openWard === w.id ? "▾" : "▸"}</span>
                          {w.name}
                          {w.mismatch && (
                            <span style={{ marginLeft: 7 }}>
                              <Pill tone="warn" title="Sessions created do not match the required number">
                                {w.total > w.required ? `+${w.total - w.required}` : `−${w.required - w.total}`} vs required
                              </Pill>
                            </span>
                          )}
                        </td>
                        <td style={{ textAlign: "center", padding: "7px 4px" }}>
                          <input type="number" min="0" value={w.required}
                            onChange={(e) => setRequired(w.id, parseInt(e.target.value || "0", 10))}
                            style={{ width: 52, textAlign: "center", fontSize: 12.5, padding: "3px 4px", border: `1px solid ${T.rule}`, borderRadius: 5, color: T.ink, fontVariantNumeric: "tabular-nums" }} />
                        </td>
                        <td style={{ textAlign: "center", padding: "7px 4px", color: T.ink2, fontVariantNumeric: "tabular-nums" }}>{w.placedCount}</td>
                        <td style={{ textAlign: "center", padding: "7px 4px" }}>
                          {w.unplaced > 0 ? <Pill tone="warn">{w.unplaced}</Pill> : <span style={{ color: T.ink3 }}>—</span>}
                        </td>
                        <td style={{ textAlign: "center", padding: "7px 4px" }}>
                          <Pill tone={w.placedCount === 0 ? "neutral" : w.staffed === w.placedCount ? "good" : "warn"}>
                            {w.staffed}/{w.placedCount}
                          </Pill>
                        </td>
                        <td style={{ textAlign: "right", padding: "7px 12px", whiteSpace: "nowrap" }}>
                          <Btn size="sm" onClick={() => removeSession(w.id)} title="Remove one session">−</Btn>{" "}
                          <Btn size="sm" onClick={() => addSession(w.id)} title="Add one session">+</Btn>
                        </td>
                      </tr>
                      {openWard === w.id && renderCover(w)}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    );
  };

  const renderPharmacists = () => (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ border: `1px solid ${T.rule}`, borderRadius: 8, background: T.card, padding: 14 }}>
        <h2 style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 700, color: T.ink }}>Add pharmacists</h2>
        <p style={{ margin: "0 0 10px", fontSize: 12, color: T.ink3, lineHeight: 1.5 }}>
          One per line. Put sessions available after the name if it is not 10 — a tab, comma or space between them all work.
        </p>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start", flexWrap: "wrap" }}>
          <textarea value={bulkNames} onChange={(e) => setBulkNames(e.target.value)} rows={3}
            placeholder={"Alys Roberts, 10\nTom Bevan, 6"}
            style={{ flex: "1 1 240px", minWidth: 220, fontSize: 12.5, padding: 8, border: `1px solid ${T.rule}`, borderRadius: 6, color: T.ink, fontFamily: "inherit", resize: "vertical" }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <Btn tone="solid" onClick={addManyPharmacists}>Add names</Btn>
            <Btn onClick={() => addPharmacist("New pharmacist", 10)}>Add one blank</Btn>
            <Btn onClick={exportPharmacists}>Export as CSV</Btn>
          </div>
        </div>
      </div>

      {pharmStats.map((p) => {
        const pct = p.capacity ? Math.min(100, Math.round((p.booked / p.capacity) * 100)) : 0;
        const over = p.booked > p.capacity;
        const onCount = p.available.reduce((n, d) => n + (d.AM ? 1 : 0) + (d.PM ? 1 : 0), 0);
        return (
          <div key={p.id} style={{ border: `1px solid ${over ? "#e0b4b4" : T.rule}`, borderRadius: 8, background: T.card, overflow: "hidden" }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center", padding: "10px 12px", borderBottom: `1px solid ${T.ruleSoft}`, flexWrap: "wrap" }}>
              <input value={p.name} onChange={(e) => updatePharmacist(p.id, { name: e.target.value })} placeholder="Name"
                style={{ fontSize: 14, fontWeight: 600, color: T.ink, border: "1px solid transparent", borderBottom: `1px solid ${T.rule}`, padding: "3px 4px", minWidth: 140, background: "transparent" }} />
              <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, color: T.ink3 }}>
                Sessions available
                <input type="number" min="0" max="10" value={p.capacity}
                  onChange={(e) => updatePharmacist(p.id, { capacity: Math.max(0, Math.min(10, parseInt(e.target.value || "0", 10))) })}
                  style={{ width: 48, textAlign: "center", fontSize: 12.5, padding: "3px 4px", border: `1px solid ${T.rule}`, borderRadius: 5, color: T.ink, fontVariantNumeric: "tabular-nums" }} />
              </label>
              <Pill tone={over ? "bad" : p.booked === p.capacity ? "good" : "neutral"}>
                {p.booked} allocated{over ? ` — ${p.booked - p.capacity} over` : `, ${p.remaining} left`}
              </Pill>
              {p.toPlace > 0 && <Pill tone="warn">{p.toPlace} free to place</Pill>}
              {p.clashCount > 0 && <Pill tone="bad">{p.clashCount} double-booked</Pill>}
              {p.agreedCount > 0 && <Pill tone="neutral" title="Double bookings you have said are fine">{p.agreedCount} agreed overlap{p.agreedCount === 1 ? "" : "s"}</Pill>}
              {p.offCount > 0 && <Pill tone="warn">{p.offCount} outside working sessions</Pill>}
              {p.capacity < onCount && <Pill tone="neutral" title="Mark the sessions they are not in on the grid">{onCount - p.capacity} to mark off</Pill>}
              <div style={{ flex: 1 }} />
              <Btn size="sm" tone="danger" onClick={() => removePharmacist(p.id)}>Remove</Btn>
            </div>

            <div style={{ height: 4, background: T.ruleSoft }}>
              <div style={{ height: "100%", width: `${pct}%`, background: over ? T.bad : pct === 100 ? T.good : T.accent }} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1.15fr)" }}>
              <div style={{ padding: 12, borderRight: `1px solid ${T.ruleSoft}` }}>
                <div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.06em", color: T.ink3, fontWeight: 700, marginBottom: 7 }}>Responsibilities</div>
                {Object.keys(p.byWard).length === 0 ? (
                  <div style={{ fontSize: 12, color: T.ink3 }}>Nothing allocated yet.</div>
                ) : (
                  Object.entries(p.byWard).sort((a, b) => b[1].total - a[1].total).map(([wid, e]) => {
                    const w = wardById[wid];
                    const c = w ? CATS[w.cat] : CATS.inpatient;
                    const free = e.total - e.timetabled;
                    return (
                      <div key={wid} style={{ display: "flex", alignItems: "center", gap: 7, padding: "3px 0", fontSize: 12.5, color: T.ink }}>
                        <span style={{ width: 7, height: 7, borderRadius: 4, background: c.dot, flexShrink: 0 }} />
                        <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{w ? w.name : wid}</span>
                        <span style={{ color: T.ink2, fontVariantNumeric: "tabular-nums", fontWeight: 600, fontSize: 12 }}>
                          {e.timetabled > 0 && <span title="At a set time">{e.timetabled} set</span>}
                          {e.timetabled > 0 && free > 0 && <span style={{ color: T.ink3, fontWeight: 400 }}> · </span>}
                          {free > 0 && <span style={{ color: T.warn }} title="Their time, no set session yet">{free} flexible</span>}
                        </span>
                      </div>
                    );
                  })
                )}

                <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px dashed ${T.rule}` }}>
                  <div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.06em", color: T.ink3, fontWeight: 700, marginBottom: 6 }}>
                    Flexible time — no set session
                  </div>
                  {p.toPlace === 0 ? (
                    <div style={{ fontSize: 12, color: T.ink3 }}>
                      {p.booked ? "All of their time is at a set session." : "Nothing allocated yet."}
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                      {Object.entries(p.byWard)
                        .filter(([, e]) => e.total - e.timetabled > 0)
                        .sort((a, b) => (b[1].total - b[1].timetabled) - (a[1].total - a[1].timetabled))
                        .map(([wid, e]) => {
                          const w = wardById[wid];
                          const c = w ? CATS[w.cat] : CATS.inpatient;
                          return (
                            <span key={wid} style={{
                              display: "inline-flex", alignItems: "center", gap: 5,
                              background: c.soft, border: `1px solid ${c.line}`, borderRadius: 5,
                              padding: "2px 7px", fontSize: 11.5, color: T.ink, fontWeight: 500,
                            }}>
                              {w ? w.name : wid}
                              <b style={{ fontVariantNumeric: "tabular-nums" }}>×{e.total - e.timetabled}</b>
                            </span>
                          );
                        })}
                    </div>
                  )}
                  {p.toPlace > 0 && (
                    <div style={{ fontSize: 11, color: T.ink3, marginTop: 7, lineHeight: 1.45 }}>
                      {p.toPlace} of their {p.booked} sessions can go anywhere in the week. Filter the pool by their name on the Sample week tab to drop them onto days.
                    </div>
                  )}
                </div>
              </div>

              <div style={{ padding: 12 }}>
                <div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.06em", color: T.ink3, fontWeight: 700, marginBottom: 7 }}>
                  Their week
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "34px repeat(5, minmax(0,1fr))", gap: 3 }}>
                  <div />
                  {DAY_SHORT.map((d) => <div key={d} style={{ fontSize: 10, color: T.ink3, textAlign: "center", fontWeight: 600 }}>{d}</div>)}
                  {HALVES.map((h) => (
                    <React.Fragment key={h.key}>
                      <div style={{ fontSize: 10, color: T.ink3, fontWeight: 600, paddingTop: 6 }}>{h.key}</div>
                      {DAYS.map((d, di) => {
                        const on = p.available[di][h.key];
                        const bookedHere = p.sessionsList.filter((s) => s.day === di && s.half === h.key);
                        const agreedHere = bookedHere.length > 1 && isAccepted(p.id, di, h.key, false);
                        const clashHere = bookedHere.length > 1 && !agreedHere;
                        return (
                          <button key={di} type="button" onClick={() => togglePharmAvail(p.id, di, h.key)}
                            title={bookedHere.length
                              ? bookedHere.map((s) => (wardById[s.wardId] ? wardById[s.wardId].name : "")).join(", ") + (agreedHere ? " (overlap agreed)" : "")
                              : on ? "Free — click to mark as not working" : "Not working — click to mark as working"}
                            style={{
                              minHeight: 30, borderRadius: 4, cursor: "pointer", padding: "2px 3px", textAlign: "left",
                              border: `1px solid ${clashHere ? T.bad : agreedHere ? "#b6dbd8" : on ? T.rule : "#e6e6e6"}`,
                              background: clashHere ? T.badSoft : bookedHere.length >= 1 ? T.accentSoft : on ? T.card : "#f2f2f4",
                              color: clashHere ? T.bad : T.ink2,
                              fontSize: 9, fontWeight: 600, lineHeight: 1.3, overflow: "hidden",
                            }}>
                            {bookedHere.length === 0
                              ? <span style={{ color: T.ink3, fontWeight: 400 }}>{on ? "free" : "—"}</span>
                              : bookedHere.map((s) => (
                                  <div key={s.sid} style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {wardById[s.wardId] ? wardById[s.wardId].name : ""}
                                  </div>
                                ))}
                          </button>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </div>
                <div style={{ fontSize: 10.5, color: T.ink3, marginTop: 7, lineHeight: 1.45 }}>
                  Set sessions only. Click a square to mark it as not working; flexible time sits in the list on the left until you place it.
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderNextMatrix = () => (
    <div style={{ border: `1px solid ${T.rule}`, borderRadius: 8, background: T.card, overflow: "auto" }}>
      <table style={{ borderCollapse: "collapse", fontSize: 11.5, width: "100%", minWidth: 800 }}>
        <thead>
          <tr>
            <th style={{
              position: "sticky", left: 0, zIndex: 2, background: T.paper,
              border: `1px solid ${T.rule}`, padding: "6px 9px", textAlign: "left",
              fontSize: 10.5, color: T.ink3, textTransform: "uppercase", letterSpacing: "0.05em", minWidth: 180,
            }}>Location</th>
            {DAYS.map((d) => (
              <th key={d} style={{
                border: `1px solid ${T.rule}`, background: T.paper, padding: "6px 8px",
                fontSize: 11, color: T.ink, fontWeight: 700, minWidth: 118,
              }}>{d}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(hideEmpty ? nextRows.filter((r) => !r.cells.every((c) => c.none)) : nextRows).map((row, ri, arr) => {
            const emph = splitWards.includes(row.ward.id);
            const nextIsEmph = arr[ri + 1] && splitWards.includes(arr[ri + 1].ward.id);
            const heavyBottom = emph && !nextIsEmph ? `2px solid ${T.ink2}` : `1px solid ${T.rule}`;
            return (
            <tr key={row.key}>
              <td style={{
                position: "sticky", left: 0, zIndex: 1,
                background: emph ? "#e3e7ec" : T.card,
                border: `1px solid ${T.rule}`, borderBottom: heavyBottom,
                padding: "5px 9px", fontWeight: emph ? 700 : 600, color: T.ink,
                textTransform: emph ? "uppercase" : "none",
                letterSpacing: emph ? "0.03em" : "normal", fontSize: emph ? 11 : 11.5,
              }}>
                <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: 4, background: (CATS[row.ward.cat] || CATS.inpatient).dot, marginRight: 6 }} />
                {row.label}
              </td>
              {row.cells.map((c, di) => {
                if (c.none) {
                  return <td key={di} style={{ border: `1px solid ${T.rule}`, borderBottom: heavyBottom, background: "#c8ccd1" }} />;
                }
                const on = c.names.filter((n) => !n.away);
                const away = c.names.filter((n) => n.away);
                const bg = on.length === 0 ? T.badSoft : emph ? "#f1f3f6" : T.card;
                return (
                  <td key={di} style={{
                    border: on.length === 0 ? `2px solid ${T.bad}` : `1px solid ${T.rule}`,
                    borderBottom: on.length === 0 ? `2px solid ${T.bad}` : heavyBottom,
                    background: bg, padding: "4px 7px", color: T.ink,
                  }}>
                    {on.length > 0
                      ? <span style={{ fontWeight: 600 }}>{on.map((n) => n.name).join(", ")}</span>
                      : <span style={{ color: T.bad, fontWeight: 700, fontSize: 10.5 }}>NEEDS COVER</span>}
                    {away.map((n) => (
                      <div key={n.pid} style={{ color: T.ink3, fontSize: 10, fontStyle: "italic" }}>
                        <s>{n.name}</s> {reasonInfo(n.reason).label.toLowerCase()}
                      </div>
                    ))}
                  </td>
                );
              })}
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  const renderNextWeek = () => {
    const totalOff = absentCount;
    const namesToReplace = gaps.reduce((n, g) => n + g.absent.length, 0);
    const uncoveredSessions = gaps.filter((g) => {
      const remaining = g.s.names.filter((pid) => !isAbsent(pid, g.s.day, g.s.half));
      return remaining.length === 0;
    }).length;

    return (
      <div style={{ display: "grid", gap: 14 }}>
        <div style={{ border: `1px solid ${T.rule}`, borderRadius: 8, background: T.card, padding: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
            <h2 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: T.ink }}>Who is away or busy</h2>
            <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, color: T.ink3 }}>
              Marking as
              <select value={reason} onChange={(e) => setReason(e.target.value)}
                style={{ fontSize: 12, padding: "4px 6px", border: `1px solid ${T.rule}`, borderRadius: 5, color: T.ink, background: T.card }}>
                {REASONS.map((r) => <option key={r.k} value={r.k}>{r.label}</option>)}
              </select>
            </label>
            <input
              value={nextWeek.label}
              onChange={(e) => push((prev) => ({ ...prev, nextWeek: { ...prev.nextWeek, label: e.target.value } }))}
              placeholder="Week commencing…"
              style={{ fontSize: 12, padding: "4px 7px", border: `1px solid ${T.rule}`, borderRadius: 5, color: T.ink, minWidth: 170 }}
            />
            <div style={{ flex: 1 }} />
            <Pill tone={totalOff ? "warn" : "neutral"}>{totalOff} sessions unavailable</Pill>
            <Btn size="sm" onClick={clearAbsences} disabled={!totalOff}>Clear all</Btn>
            <Btn size="sm" onClick={resetNextWeek} disabled={!Object.keys(nextWeek.cover).length}>Reset cover to the sample week</Btn>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "4px 10px 6px 0", fontSize: 10.5, color: T.ink3, textTransform: "uppercase", letterSpacing: "0.05em" }}>Pharmacist</th>
                  {DAYS.map((d, di) => (
                    <th key={d} colSpan={2} style={{ padding: "4px 4px 6px", fontSize: 10.5, color: T.ink3, fontWeight: 700 }}>{DAY_SHORT[di]}</th>
                  ))}
                  <th style={{ padding: "4px 0 6px 10px", fontSize: 10.5, color: T.ink3, fontWeight: 700 }}>Off</th>
                </tr>
              </thead>
              <tbody>
                {pharmacists.map((p) => {
                  const offCount = DAYS.reduce((n, d, di) => n + HALVES.filter((h) => isAbsent(p.id, di, h.key)).length, 0);
                  return (
                    <tr key={p.id}>
                      <td style={{ padding: "2px 10px 2px 0", whiteSpace: "nowrap" }}>
                        <button type="button" onClick={() => toggleAbsentWeek(p.id)} title="Whole week off"
                          style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 12.5, fontWeight: 600, color: offCount === 10 ? T.bad : T.ink, padding: 0 }}>
                          {p.name}
                        </button>
                      </td>
                      {DAYS.map((d, di) => HALVES.map((h) => {
                        const r = absentReason(p.id, di, h.key);
                        const info = r ? reasonInfo(r) : null;
                        const notIn = !p.available[di][h.key];
                        const isBad = info && info.tone === "bad";
                        return (
                          <td key={`${di}${h.key}`} style={{ padding: "2px 1px" }}>
                            <button type="button" onClick={() => toggleAbsent(p.id, di, h.key)}
                              title={`${DAYS[di]} ${h.label}${info ? ` — ${info.label}` : ""}${notIn ? " — does not normally work this session" : ""}`}
                              style={{
                                width: 30, height: 20, borderRadius: 3, cursor: "pointer",
                                border: `1px solid ${info ? (isBad ? "#dda3a3" : "#eddcbc") : notIn ? "#e6e6e6" : T.rule}`,
                                background: info ? (isBad ? T.badSoft : T.warnSoft) : notIn ? "#f2f2f4" : T.card,
                                color: info ? (isBad ? T.bad : T.warn) : T.ink3, fontSize: 9, fontWeight: 700,
                              }}>
                              {info ? info.short : h.key}
                            </button>
                          </td>
                        );
                      }))}
                      <td style={{ padding: "2px 0 2px 10px", textAlign: "center", fontVariantNumeric: "tabular-nums", color: offCount ? T.bad : T.ink3, fontWeight: 600 }}>
                        {offCount || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ fontSize: 11, color: T.ink3, marginTop: 8, lineHeight: 1.5 }}>
            Pick a reason above, then click a square to apply it to that session, or a name to apply it to the whole week.
            Clicking again clears it. Codes: {REASONS.map((r) => `${r.short} ${r.label.toLowerCase()}`).join(" · ")}.
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", rowGap: 10, alignItems: "center", background: T.card, border: `1px solid ${T.rule}`, borderRadius: 8, padding: "11px 14px" }}>
          <Stat label="Sessions needing attention" value={gaps.length} tone={gaps.length ? "warn" : "good"} />
          <Stat label="Names to replace" value={namesToReplace} tone={namesToReplace ? "bad" : "good"} />
          <Stat label="Sessions with nobody left" value={uncoveredSessions} tone={uncoveredSessions ? "bad" : "good"} />
          <div style={{ fontSize: 11.5, color: T.ink3, maxWidth: 380, lineHeight: 1.45 }}>
            Changes here only affect next week. The sample week on the Week tab stays as your standard rota.
          </div>
        </div>

        <div style={{ border: `1px solid ${T.rule}`, borderRadius: 8, background: T.card, overflow: "hidden" }}>
          <div style={{ padding: "9px 12px", background: T.paper, borderBottom: `1px solid ${T.rule}`, fontSize: 12, fontWeight: 700, color: T.ink }}>
            What needs covering
          </div>
          {gaps.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", fontSize: 13, color: T.ink3 }}>
              Nothing outstanding — every session next week has somebody who is in.
            </div>
          ) : (
            <div>
              {gaps.map(({ s, absent }) => {
                const w = wardById[s.wardId];
                const remaining = s.names.filter((pid) => !isAbsent(pid, s.day, s.half));
                const candidates = nextStats.filter((p) =>
                  !s.names.includes(p.id) &&
                  p.available[s.day][s.half] &&
                  !isAbsent(p.id, s.day, s.half) &&
                  !(nextSlotLoad[`${s.day}|${s.half}`] || { byPharm: {} }).byPharm[p.id]
                ).sort((a, b) => b.remaining - a.remaining);
                return (
                  <div key={s.sid} style={{ borderTop: `1px solid ${T.ruleSoft}`, padding: "9px 12px", display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
                    <div style={{ minWidth: 130 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: T.ink }}>{w ? w.name : s.wardId}</div>
                      <div style={{ fontSize: 11.5, color: T.ink3 }}>
                        {DAYS[s.day]} · {HALVES.find((h) => h.key === s.half).label}
                      </div>
                    </div>
                    <div style={{ flex: 1, minWidth: 240 }}>
                      {absent.length === 0 ? (
                        <div style={{ fontSize: 12, color: T.warn, marginBottom: 6 }}>Nobody named on this session.</div>
                      ) : (
                        absent.map((pid) => (
                          <div key={pid} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 12, color: T.bad, fontWeight: 600, minWidth: 66 }}>
                              <s>{pharmById[pid] ? pharmById[pid].name : "?"}</s>
                            </span>
                            <span style={{ fontSize: 11, color: T.ink3, minWidth: 76 }}>
                              {reasonInfo(absentReason(pid, s.day, s.half)).label.toLowerCase()}
                            </span>
                            <select value="" onChange={(e) => { if (e.target.value) swapCover(s.sid, pid, e.target.value); }}
                              style={{ fontSize: 11.5, padding: "3px 5px", border: `1px solid ${T.rule}`, borderRadius: 5, color: T.ink, background: T.card, minWidth: 190 }}>
                              <option value="">Cover with…</option>
                              {candidates.map((p) => (
                                <option key={p.id} value={p.id}>{p.name} · {p.remaining} left</option>
                              ))}
                            </select>
                            <Btn size="sm" onClick={() => removeCoverName(s.sid, pid)}>Drop, no cover</Btn>
                          </div>
                        ))
                      )}
                      {remaining.length > 0 && (
                        <div style={{ fontSize: 11.5, color: T.ink3 }}>
                          Still on: {remaining.map((pid) => (pharmById[pid] ? pharmById[pid].name : "?")).join(", ")}
                        </div>
                      )}
                      {absent.length === 0 && remaining.length === 0 && (
                        <select value="" onChange={(e) => { if (e.target.value) addCoverName(s.sid, e.target.value); }}
                          style={{ fontSize: 11.5, padding: "3px 5px", border: `1px solid ${T.rule}`, borderRadius: 5, color: T.ink, background: T.card, minWidth: 190 }}>
                          <option value="">Add somebody…</option>
                          {candidates.map((p) => (
                            <option key={p.id} value={p.id}>{p.name} · {p.remaining} left</option>
                          ))}
                        </select>
                      )}
                    </div>
                    {candidates.length === 0 && (
                      <Pill tone="bad" title="Everyone else is either off, already booked at this time, or does not work this session">
                        Nobody free
                      </Pill>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: T.ink }}>Next week as it stands</div>
            <div style={{ display: "flex", gap: 4 }}>
              {[{ k: "grid", label: "Calendar" }, { k: "board", label: "Board" }].map((v) => (
                <button key={v.k} type="button" onClick={() => setNextView(v.k)}
                  style={{
                    fontSize: 11.5, padding: "3px 9px", borderRadius: 5, cursor: "pointer",
                    border: `1px solid ${nextView === v.k ? T.accent : T.rule}`,
                    background: nextView === v.k ? T.accentSoft : T.card,
                    color: nextView === v.k ? T.accent : T.ink3, fontWeight: 600,
                  }}>{v.label}</button>
              ))}
            </div>
            {nextView === "grid" && (
              <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, color: T.ink3 }}>
                Split AM/PM rows
                <select value="" onChange={(e) => { if (e.target.value) toggleSplitWard(e.target.value); }}
                  style={{ fontSize: 11.5, padding: "3px 5px", border: `1px solid ${T.rule}`, borderRadius: 5, color: T.ink2, background: T.card, maxWidth: 150 }}>
                  <option value="">{splitWards.length ? `${splitWards.length} split` : "None"}</option>
                  {wards.map((w) => (
                    <option key={w.id} value={w.id}>{splitWards.includes(w.id) ? "✓ " : ""}{w.name}</option>
                  ))}
                </select>
              </label>
            )}
            {nextView === "grid" && (
              <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, color: T.ink3 }}>
                <input type="checkbox" checked={hideEmpty} onChange={(e) => setHideEmpty(e.target.checked)} />
                Hide areas with no sessions
              </label>
            )}
            <div style={{ flex: 1 }} />
            <Btn size="sm" tone="solid" onClick={() => printCalendar("next")}>Print / Save as PDF</Btn>
            <Btn size="sm" onClick={() => exportNextCalendar("next")}>Download</Btn>
            <Btn size="sm" onClick={exportNextWeek}>CSV</Btn>
          </div>
          {nextView === "grid" ? renderNextMatrix() : renderWeekGrid("next")}
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 11, color: T.ink3, marginTop: 8 }}>
            {nextView === "grid" ? (
              <>
                <span><span style={{ display: "inline-block", width: 12, height: 9, background: "#c8ccd1", border: `1px solid ${T.rule}`, marginRight: 4 }} />No session</span>
                <span><span style={{ display: "inline-block", width: 12, height: 9, background: T.card, border: `1px solid ${T.rule}`, marginRight: 4 }} />Covered</span>
                <span><span style={{ display: "inline-block", width: 12, height: 9, background: T.badSoft, border: `2px solid ${T.bad}`, marginRight: 4 }} />Nobody covering</span>
                <span><s>Name</s> <i>away, with the reason</i></span>
                <span>Shaded rows print as a heavy block so they stand out in black and white</span>
              </>
            ) : (
              <span>Names struck through are off. Add or remove names here and it changes next week only.</span>
            )}
          </div>
        </div>
      </div>
    );
  };

  const Stat = ({ label, value, tone }) => (
    <div style={{ padding: "0 14px 0 0", borderRight: `1px solid ${T.ruleSoft}`, marginRight: 14 }}>
      <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.07em", color: T.ink3, fontWeight: 700 }}>{label}</div>
      <div style={{
        fontSize: 19, fontWeight: 700, fontVariantNumeric: "tabular-nums", marginTop: 1,
        color: tone === "bad" ? T.bad : tone === "warn" ? T.warn : tone === "good" ? T.good : T.ink,
      }}>{value}</div>
    </div>
  );

  return (
    <div style={{
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      background: T.paper, color: T.ink, minHeight: "100vh", padding: 16,
    }}>
      <div style={{ maxWidth: 1440, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, letterSpacing: "-0.01em" }}>Pharmacy session allocation</h1>
            <p style={{ margin: "3px 0 0", fontSize: 12.5, color: T.ink3 }}>
              Ten sessions a week · mornings 9am–1pm, afternoons 1pm–5pm
            </p>
          </div>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center" }}>
            {fileName && (
              <span style={{
                fontSize: 11.5, color: dirty ? T.warn : T.ink3, fontWeight: dirty ? 600 : 400,
                background: dirty ? T.warnSoft : T.paper, border: `1px solid ${dirty ? "#eddcbc" : T.rule}`,
                borderRadius: 5, padding: "3px 8px", maxWidth: 230,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }} title={dirty ? "Unsaved changes" : "Saved to file"}>
                {fileName}{dirty ? " — unsaved" : ""}
              </span>
            )}
            {saveNote && <span style={{ fontSize: 11.5, color: T.ink3 }}>{saveNote}</span>}
            <Btn size="sm" onClick={undo} disabled={!history.length}>Undo</Btn>
            <Btn size="sm" onClick={openRotaFile} title="Open the shared rota file">Open rota</Btn>
            <Btn size="sm" tone="solid" onClick={saveRotaFile}
              title={fileName ? "Write straight back to the file you opened" : "Choose where to save"}>
              {supportsFiles && fileName ? "Save" : "Save a copy"}
            </Btn>
            {supportsFiles && <Btn size="sm" onClick={saveRotaFileAs}>Save as…</Btn>}
            <input ref={fileRef} type="file" accept="application/json,.json"
              onChange={(e) => { loadBackup(e.target.files && e.target.files[0]); e.target.value = ""; }}
              style={{ display: "none" }} />
            <Btn size="sm" onClick={() => printCalendar(tab === "next" ? "next" : "template")}>
              {tab === "next" ? "Print next week" : "Print rota"}
            </Btn>
            <Btn size="sm" onClick={tab === "next" ? exportNextWeek : exportWeek}>CSV</Btn>
            <Btn size="sm" tone="danger" onClick={resetAll}>Reset</Btn>
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", rowGap: 10, alignItems: "center", background: T.card, border: `1px solid ${T.rule}`, borderRadius: 8, padding: "11px 14px", marginBottom: 14 }}>
          <Stat label="Sessions required" value={totals.created} />
          <Stat label="In the week" value={totals.inWeek} />
          <Stat label="Still to place" value={totals.unplaced} tone={totals.unplaced ? "warn" : "good"} />
          <Stat label="Sessions with a name" value={`${totals.covered}/${totals.created}`} tone={totals.covered === totals.created ? "good" : undefined} />
          <Stat label="Names allocated" value={`${totals.namesTotal}/${totals.cap}`} tone={totals.namesTotal > totals.cap ? "bad" : undefined} />
          <div style={{ display: "flex", gap: 7, alignItems: "center", flexWrap: "wrap" }}>
            {totals.clashCount > 0 && <Pill tone="bad">{totals.clashCount} double-booked</Pill>}
            {totals.agreedCount > 0 && <Pill tone="neutral" title="Double bookings you have marked as fine">{totals.agreedCount} agreed overlap{totals.agreedCount === 1 ? "" : "s"}</Pill>}
            {totals.offCount > 0 && <Pill tone="warn">{totals.offCount} outside working sessions</Pill>}
            {totals.over > 0 && <Pill tone="bad">{totals.over} over their sessions</Pill>}
            {totals.namedToPlace > 0 && <Pill tone="warn">{totals.namedToPlace} named, awaiting a slot</Pill>}
            {totals.clashCount === 0 && totals.offCount === 0 && totals.over === 0 && totals.inWeek > 0 && <Pill tone="good">No clashes</Pill>}
          </div>
        </div>

        <div style={{ display: "flex", gap: 4, marginBottom: 14, borderBottom: `1px solid ${T.rule}`, flexWrap: "wrap", alignItems: "center" }}>
          {[
            { k: "week", label: "Sample week" },
            { k: "next", label: `Next week${gaps.length ? ` (${gaps.length})` : ""}` },
            { k: "wards", label: "Wards and areas" },
            { k: "pharmacists", label: "Pharmacists" },
          ].map((t) => (
            <button key={t.k} type="button" onClick={() => setTab(t.k)}
              style={{
                background: "transparent", border: "none", cursor: "pointer", padding: "8px 13px", fontSize: 13,
                fontWeight: tab === t.k ? 700 : 500, color: tab === t.k ? T.ink : T.ink3,
                borderBottom: `2px solid ${tab === t.k ? T.accent : "transparent"}`, marginBottom: -1,
              }}>{t.label}</button>
          ))}
          <div style={{ flex: 1 }} />
          {tab === "week" && (
            <div style={{ display: "flex", alignItems: "center", gap: 12, paddingBottom: 6, flexWrap: "wrap" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, color: T.ink3 }}>
                Highlight
                <select value={highlight} onChange={(e) => setHighlight(e.target.value)}
                  style={{ fontSize: 11.5, padding: "3px 5px", border: `1px solid ${T.rule}`, borderRadius: 5, color: T.ink2, background: T.card }}>
                  <option value="all">Everyone</option>
                  {pharmStats.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: T.ink3 }}>
                <input type="checkbox" checked={unlockFixed} onChange={(e) => setUnlockFixed(e.target.checked)} />
                Move fixed sessions
              </label>
            </div>
          )}
        </div>

        {tab === "week" && (
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 280px", gap: 14, alignItems: "start" }}>
            <div>
              {renderWeekGrid("template")}
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 10, fontSize: 11, color: T.ink3 }}>
                {Object.entries(CATS).map(([k, v]) => (
                  <span key={k} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ width: 7, height: 7, borderRadius: 4, background: v.dot }} />{v.label}
                  </span>
                ))}
                <span>▪ fixed session</span>
                <span>Slot header reads sessions · names needed / pharmacists working</span>
              </div>
            </div>
            {renderRail()}
          </div>
        )}

        {tab === "next" && renderNextWeek()}
        {tab === "wards" && renderWards()}
        {tab === "pharmacists" && renderPharmacists()}

        <div style={{
          marginTop: 18, border: `1px solid ${T.rule}`, borderRadius: 8, background: T.card,
          padding: "10px 14px", fontSize: 11.5, color: T.ink3, lineHeight: 1.55,
        }}>
          <b style={{ color: T.ink2 }}>Working with colleagues.</b> Keep one rota file in your shared Teams or
          OneDrive folder. Press <b>Open rota</b>, make your changes, then <b>Save</b> — it writes straight back to
          that same file, so the next person opens your version. The label beside the buttons shows which file
          you have open and turns amber when there is something unsaved. Tell the others when you start editing:
          if two of you save at once, the last save wins.
          {!supportsFiles && " This browser cannot write back to a file, so Save will download a copy instead — Edge or Chrome give you the full version."}
          <br />
          <b style={{ color: T.ink2 }}>Pharmacist list as CSV</b> is on the Pharmacists tab; the rota itself
          prints from <b>Print rota</b>.
        </div>
      </div>
    </div>
  );
}

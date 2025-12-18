import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarDays,
  Clock,
  ClipboardList,
  DoorClosed,
  DoorOpen,
  FileText,
  Lock,
  Phone,
  Mail,
  MapPin,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Timer,
  User,
  Users,
  Search,
  Filter,
  Plus,
  Edit3,
  Save,
  LogOut,
  Building2,
  Banknote,
  Upload,
  ChevronRight,
  Crown,
  GraduationCap,
  Briefcase,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

// ------------------------------------------------------------
// Minimalistische Test-App (Frontend-only)
// - Kein Backend
// - Alle Daten sind Mock + Local State
// - Fokus: simpel, visuell, klickbar
// ------------------------------------------------------------

const pad2 = (n: number) => String(n).padStart(2, "0");
const formatHM = (mins: number) => {
  const sign = mins < 0 ? "-" : "";
  const m = Math.abs(mins);
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${sign}${pad2(h)}:${pad2(mm)}`;
};

type Presence = "green" | "orange" | "red";

type TimeEntryType = "COME" | "GO" | "PAUSE_START" | "PAUSE_END";

type TimeEntry = {
  id: string;
  type: TimeEntryType;
  at: string; // HH:MM
  note?: string;
  approval: "NONE" | "PENDING" | "APPROVED" | "REJECTED";
  correctedFrom?: string;
  approvalRoutedTo?: "TEAMLEITER" | "HR";
};

type LeaveRequest = {
  id: string;
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
  halfDay: boolean;
  status: "PENDING" | "APPROVED" | "REJECTED";
  comment?: string;
  publicCalendarEnforced: boolean;
};

type CalendarEvent = {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  dept: string;
  visibility: "PRIVATE" | "PUBLIC";
  type: "MEETING" | "LEAVE" | "NOTE";
  author: string;
};

type Profile = {
  // privat
  address: string;
  privatePhone: string;
  bank: string;
  // firma (readonly)
  companyPhone: string;
  companyEmail: string;
  role: string;
};

type ProfileChangeRequest = {
  id: string;
  field: "address" | "privatePhone" | "bank" | "photo";
  oldValue: string;
  newValue: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
};

type Order = {
  id: string;
  title: string;
  status: "OPEN" | "IN_PROGRESS" | "WAITING" | "DONE";
  due: string; // YYYY-MM-DD
  priority: "LOW" | "MED" | "HIGH";
  lastActivity: string; // YYYY-MM-DD
  customer: string;
};

type Payslip = { id: string; month: string; fileName: string };

type Person = {
  id: string;
  name: string;
  dept: string;
  presence: Presence;
  note: string;
  companyEmail: string;
  companyPhone: string;
  role?: string;
};

const avatarDataUrl =
  "data:image/svg+xml;charset=utf-8," +
  encodeURIComponent(`
<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'>
  <defs>
    <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
      <stop offset='0%' stop-color='#0ea5e9'/>
      <stop offset='100%' stop-color='#a78bfa'/>
    </linearGradient>
  </defs>
  <rect width='200' height='200' rx='100' fill='url(#g)'/>
  <circle cx='100' cy='82' r='36' fill='rgba(255,255,255,0.85)'/>
  <rect x='42' y='126' width='116' height='58' rx='29' fill='rgba(255,255,255,0.85)'/>
</svg>
`);

function cn(...xs: Array<string | false | undefined | null>) {
  return xs.filter(Boolean).join(" ");
}

function StatusDot({ presence }: { presence: Presence }) {
  const cls =
    presence === "green"
      ? "bg-emerald-500"
      : presence === "orange"
        ? "bg-orange-500"
        : "bg-red-500";
  return <span className={cn("inline-flex h-2.5 w-2.5 rounded-full", cls)} />;
}

function IconForEntry({ type }: { type: TimeEntryType }) {
  if (type === "COME") return <DoorOpen className="h-4 w-4" />;
  if (type === "GO") return <DoorClosed className="h-4 w-4" />;
  if (type === "PAUSE_START") return <Timer className="h-4 w-4" />;
  return <Clock className="h-4 w-4" />;
}

function labelForEntry(type: TimeEntryType) {
  switch (type) {
    case "COME":
      return "Kommen";
    case "GO":
      return "Gehen";
    case "PAUSE_START":
      return "Pause";
    case "PAUSE_END":
      return "Weiter";
  }
}

function ymdd(d: Date) {
  const y = d.getFullYear();
  const m = pad2(d.getMonth() + 1);
  const day = pad2(d.getDate());
  return `${y}-${m}-${day}`;
}

function addDays(dateStr: string, delta: number) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + delta);
  return ymdd(dt);
}

function isWeekend(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const wd = dt.getDay();
  return wd === 0 || wd === 6;
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

const DEPTS = ["Vertrieb", "Disposition", "Personal", "IT"];

function computeWorkFromEntries(entries: TimeEntry[], nowHM: () => string) {
  const toMins = (hm: string) => {
    const [h, m] = hm.split(":").map(Number);
    return h * 60 + m;
  };

  const sorted = [...entries].sort((a, b) => a.at.localeCompare(b.at));
  const hasCome = sorted.some((e) => e.type === "COME");
  const hasGo = sorted.some((e) => e.type === "GO");
  const inPause = (() => {
    const last = sorted.at(-1);
    return last?.type === "PAUSE_START";
  })();

  let work = 0;
  let lastCome: number | null = null;
  let inBreak = false;
  let lastWorkStart: number | null = null;
  let longestNoBreak = 0;

  for (const e of sorted) {
    const t = toMins(e.at);
    if (e.type === "COME") {
      lastCome = t;
      lastWorkStart = t;
      inBreak = false;
    }
    if (e.type === "PAUSE_START") {
      if (lastCome != null && !inBreak) {
        work += t - lastCome;
        if (lastWorkStart != null) longestNoBreak = Math.max(longestNoBreak, t - lastWorkStart);
      }
      inBreak = true;
    }
    if (e.type === "PAUSE_END") {
      lastCome = t;
      inBreak = false;
      lastWorkStart = t;
    }
    if (e.type === "GO") {
      if (lastCome != null && !inBreak) {
        work += t - lastCome;
        if (lastWorkStart != null) longestNoBreak = Math.max(longestNoBreak, t - lastWorkStart);
      }
      lastCome = null;
      inBreak = false;
    }
  }

  // (Demo) wenn heute und nicht ausgestempelt, add bis jetzt
  if (!hasGo && hasCome && !inPause) {
    const now = toMins(nowHM());
    const lastStart = (() => {
      for (let i = sorted.length - 1; i >= 0; i--) {
        if (sorted[i].type === "COME" || sorted[i].type === "PAUSE_END") return toMins(sorted[i].at);
        if (sorted[i].type === "GO") break;
      }
      return null;
    })();
    if (lastStart != null) {
      work += Math.max(0, now - lastStart);
      if (lastWorkStart != null) longestNoBreak = Math.max(longestNoBreak, now - lastWorkStart);
    }
  }

  return { work, longestNoBreak, hasCome, hasGo, inPause, sorted };
}

function buildSegments(entries: TimeEntry[]) {
  const toMins = (hm: string) => {
    const [h, m] = hm.split(":").map(Number);
    return h * 60 + m;
  };
  const START = 6 * 60;
  const END = 20 * 60;
  const span = END - START;

  const sorted = [...entries].sort((a, b) => a.at.localeCompare(b.at));

  let mode: "OFF" | "WORK" | "PAUSE" = "OFF";
  let curStart = START;

  const segs: Array<{ from: number; to: number; kind: "WORK" | "PAUSE" | "OFF" }> = [];

  const push = (from: number, to: number, kind: "WORK" | "PAUSE" | "OFF") => {
    const a = clamp(from, START, END);
    const b = clamp(to, START, END);
    if (b > a) segs.push({ from: a, to: b, kind });
  };

  for (const e of sorted) {
    const t = toMins(e.at);
    if (t < START || t > END) continue;

    if (mode === "OFF") push(curStart, t, "OFF");
    if (mode === "WORK") push(curStart, t, "WORK");
    if (mode === "PAUSE") push(curStart, t, "PAUSE");

    if (e.type === "COME") mode = "WORK";
    if (e.type === "PAUSE_START") mode = "PAUSE";
    if (e.type === "PAUSE_END") mode = "WORK";
    if (e.type === "GO") mode = "OFF";

    curStart = t;
  }

  if (mode === "OFF") push(curStart, END, "OFF");
  if (mode === "WORK") push(curStart, END, "WORK");
  if (mode === "PAUSE") push(curStart, END, "PAUSE");

  return { segs, START, END, span };
}

function startOfWeek(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const day = dt.getDay(); // 0=So
  const diffToMonday = (day + 6) % 7;
  dt.setDate(dt.getDate() - diffToMonday);
  return ymdd(dt);
}

export default function MitarbeiterbereichMinimalApp() {
  // --- presence + dept
  const [presence, setPresence] = useState<Presence>("green");
  const [presenceNote, setPresenceNote] = useState("Wieder da um 14:30");
  const [selectedDept, setSelectedDept] = useState(DEPTS[0]);

  // (Demo) Teamleiter-Abwesenheit, damit Routing sichtbar wird
  const [teamLeadAway, setTeamLeadAway] = useState(false);

  // --- laws / thresholds (Demo)
  const [targetWorkMins] = useState(8 * 60);
  const [workdayMaxMins] = useState(10 * 60);
  const [pauseWarnAfterMins] = useState(6 * 60);
  const [requireLawHints] = useState(true);

  // --- date selection for history
  const today = ymdd(new Date());
  const [selectedDate, setSelectedDate] = useState(today);

  // --- time entries by date
  const [timeByDate, setTimeByDate] = useState<Record<string, TimeEntry[]>>({
    [today]: [
      { id: "t1", type: "COME", at: "08:03", approval: "NONE" },
      { id: "t2", type: "PAUSE_START", at: "12:10", approval: "NONE" },
      { id: "t3", type: "PAUSE_END", at: "12:42", approval: "NONE" },
    ],
    [addDays(today, -1)]: [
      { id: "y1", type: "COME", at: "08:11", approval: "NONE" },
      { id: "y2", type: "PAUSE_START", at: "12:02", approval: "NONE" },
      { id: "y3", type: "PAUSE_END", at: "12:33", approval: "NONE" },
      { id: "y4", type: "GO", at: "16:41", approval: "NONE" },
    ],
    [addDays(today, -2)]: [
      { id: "z1", type: "COME", at: "07:56", approval: "NONE" },
      { id: "z2", type: "PAUSE_START", at: "11:58", approval: "NONE" },
      { id: "z3", type: "PAUSE_END", at: "12:28", approval: "NONE" },
      { id: "z4", type: "GO", at: "17:12", approval: "NONE" },
    ],
  });

  const timeEntries = timeByDate[selectedDate] || [];

  const nowHM = () => {
    const d = new Date();
    return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  };

  const { work, longestNoBreak, hasCome, hasGo, inPause, sorted } = useMemo(
    () => computeWorkFromEntries(timeEntries, nowHM),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedDate, timeByDate]
  );

  const saldo = work - targetWorkMins;
  const warnPause = requireLawHints && longestNoBreak >= pauseWarnAfterMins;
  const warnMax = requireLawHints && work > workdayMaxMins;

  const lawHints = useMemo(() => {
    const hints: Array<{ kind: "warn" | "stop"; title: string; detail: string }> = [];
    if (warnPause) {
      hints.push({
        kind: "warn",
        title: "Bitte Pause machen",
        detail: `Du arbeitest seit ca. ${formatHM(longestNoBreak)} ohne Pause (Demo-Regel).`,
      });
    }
    if (warnMax) {
      hints.push({
        kind: "stop",
        title: "Arbeitszeit überschritten",
        detail: `Ist-Zeit ${formatHM(work)} über der Tagesgrenze ${formatHM(workdayMaxMins)} (Demo).`,
      });
    }
    return hints;
  }, [warnPause, warnMax, longestNoBreak, work, workdayMaxMins]);

  // --- stamp logic (today)
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState<string>("");
  const [confirmAction, setConfirmAction] = useState<null | (() => void)>(null);

  const guarded = (text: string, action: () => void) => {
    setConfirmText(text);
    setConfirmAction(() => action);
    setConfirmOpen(true);
  };

  const pushEntry = (type: TimeEntryType) => {
    const entry: TimeEntry = {
      id: crypto.randomUUID(),
      type,
      at: nowHM(),
      approval: "NONE",
    };
    setTimeByDate((prev) => ({
      ...prev,
      [today]: [...(prev[today] || []), entry],
    }));
  };

  const handleStamp = (type: TimeEntryType) => {
    if (selectedDate !== today) {
      guarded("Stempeln geht nur auf Heute. Auf Heute wechseln?", () => setSelectedDate(today));
      return;
    }

    const doIt = () => {
      pushEntry(type);
      if (type === "GO") {
        setPresence("red");
        setPresenceNote("Feierabend");
      }
      if (type === "COME") {
        setPresence("green");
        setPresenceNote("");
      }
    };

    if (warnMax && type !== "GO") {
      guarded("Du überschreitest die maximal konfigurierte Arbeitszeit. Fortfahren?", doIt);
      return;
    }
    if (warnPause && (type === "GO" || type === "COME")) {
      guarded("Hinweis: Bitte an Pausenregelungen denken. Fortfahren?", doIt);
      return;
    }
    doIt();
  };

  const canCome = !hasGo;
  const canGo = hasCome && !hasGo;
  const canPauseStart = hasCome && !hasGo && !inPause;
  const canPauseEnd = hasCome && !hasGo && inPause;

  // --- edit time entry (NOW also allowed historically)
  const [editOpen, setEditOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<TimeEntry | null>(null);
  const [editNewTime, setEditNewTime] = useState("08:00");
  const [editReason, setEditReason] = useState("Vergessen zu stempeln");
  const [editNote, setEditNote] = useState("");

  const openEdit = (e: TimeEntry) => {
    setEditEntry(e);
    setEditNewTime(e.at);
    setEditReason("Vergessen zu stempeln");
    setEditNote("");
    setEditOpen(true);
  };

  const submitEdit = () => {
    if (!editEntry) return;

    const routed: "TEAMLEITER" | "HR" = teamLeadAway ? "HR" : "TEAMLEITER";

    setTimeByDate((prev) => {
      const list = prev[selectedDate] || [];
      return {
        ...prev,
        [selectedDate]: list.map((x) =>
          x.id === editEntry.id
            ? {
                ...x,
                at: editNewTime,
                correctedFrom: editEntry.at,
                approval: "PENDING",
                approvalRoutedTo: routed,
                note: [editReason, editNote].filter(Boolean).join(" · "),
              }
            : x
        ),
      };
    });

    setEditOpen(false);
  };

  // --- Urlaub
  const [leaveTotal] = useState(28);
  const [leaveRemaining] = useState(9);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([
    {
      id: "l1",
      from: addDays(today, 7),
      to: addDays(today, 10),
      halfDay: false,
      status: "APPROVED",
      publicCalendarEnforced: true,
    },
    {
      id: "l2",
      from: addDays(today, 21),
      to: addDays(today, 21),
      halfDay: true,
      status: "PENDING",
      publicCalendarEnforced: true,
      comment: "Arzttermin",
    },
  ]);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [leaveFrom, setLeaveFrom] = useState(addDays(today, 14));
  const [leaveTo, setLeaveTo] = useState(addDays(today, 14));
  const [leaveHalf, setLeaveHalf] = useState(false);
  const [leaveComment, setLeaveComment] = useState("");

  const requestedDays = useMemo(() => {
    if (!leaveFrom || !leaveTo) return 0;
    let a = leaveFrom;
    let b = leaveTo;
    if (a > b) [a, b] = [b, a];
    let days = 0;
    let cur = a;
    while (cur <= b) {
      if (!isWeekend(cur)) days += 1;
      cur = addDays(cur, 1);
    }
    return leaveHalf ? 0.5 : days;
  }, [leaveFrom, leaveTo, leaveHalf]);

  const submitLeave = () => {
    const id = crypto.randomUUID();
    const req: LeaveRequest = {
      id,
      from: leaveFrom,
      to: leaveTo,
      halfDay: leaveHalf,
      status: "PENDING",
      publicCalendarEnforced: true,
      comment: leaveComment || undefined,
    };
    setLeaveRequests((p) => [req, ...p]);
    setLeaveOpen(false);
    setLeaveComment("");
  };

  // --- Kalender + Ampel in einem Tab (VISUELL + FILTER)
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([
    {
      id: "e1",
      date: today,
      title: "Team-Standup",
      dept: "IT",
      visibility: "PUBLIC",
      type: "MEETING",
      author: "Lea",
    },
    {
      id: "e2",
      date: addDays(today, 1),
      title: "Projekt-Review",
      dept: "Vertrieb",
      visibility: "PUBLIC",
      type: "MEETING",
      author: "Sven",
    },
    {
      id: "e3",
      date: addDays(today, 2),
      title: "Privat: Focus Block",
      dept: "Vertrieb",
      visibility: "PRIVATE",
      type: "NOTE",
      author: "Du",
    },
    {
      id: "e4",
      date: addDays(today, 3),
      title: "Abteilungsrunde",
      dept: "Disposition",
      visibility: "PUBLIC",
      type: "MEETING",
      author: "Mila",
    },
    {
      id: "e5",
      date: addDays(today, 4),
      title: "Onboarding Azubi",
      dept: "Personal",
      visibility: "PUBLIC",
      type: "MEETING",
      author: "HR",
    },
  ]);

  const [eventOpen, setEventOpen] = useState(false);
  const [eventDate, setEventDate] = useState(today);
  const [eventTitle, setEventTitle] = useState("");
  const [eventVis, setEventVis] = useState<"PRIVATE" | "PUBLIC">("PRIVATE");
  const [eventType, setEventType] = useState<"MEETING" | "NOTE" | "LEAVE">("NOTE");

  const [calendarSelectedDepts, setCalendarSelectedDepts] = useState<string[]>([selectedDept]);
  const [calendarMerge, setCalendarMerge] = useState(true);

  React.useEffect(() => {
    // wenn Abteilung oben gewechselt wird, bleibt die Auswahl sinnvoll
    setCalendarSelectedDepts((prev) => {
      if (prev.length === 0) return [selectedDept];
      return prev;
    });
  }, [selectedDept]);

  const toggleDept = (d: string) => {
    setCalendarSelectedDepts((prev) => {
      if (prev.includes(d)) {
        const next = prev.filter((x) => x !== d);
        return next.length ? next : [d];
      }
      return [...prev, d];
    });
  };

  const submitEvent = () => {
    const enforcedPublic = eventType === "LEAVE";
    const vis: "PRIVATE" | "PUBLIC" = enforcedPublic ? "PUBLIC" : eventVis;
    const ev: CalendarEvent = {
      id: crypto.randomUUID(),
      date: eventDate,
      title: eventType === "LEAVE" ? `Urlaub: ${eventTitle || "(ohne Titel)"}` : eventTitle || "(ohne Titel)",
      dept: selectedDept,
      visibility: vis,
      type: eventType,
      author: "Du",
    };
    setCalendarEvents((p) => [ev, ...p]);
    setEventOpen(false);
    setEventTitle("");
    setEventVis("PRIVATE");
    setEventType("NOTE");
  };

  const visibleEvents = useMemo(() => {
    const selected = new Set(calendarSelectedDepts);
    return calendarEvents
      .filter((e) => (calendarMerge ? selected.has(e.dept) : e.dept === selectedDept))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [calendarEvents, calendarSelectedDepts, calendarMerge, selectedDept]);

  const weekStart = useMemo(() => startOfWeek(today), [today]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const d of weekDays) map.set(d, []);
    for (const e of visibleEvents) {
      if (map.has(e.date)) map.get(e.date)!.push(e);
    }
    for (const [k, v] of map) v.sort((a, b) => a.title.localeCompare(b.title));
    return map;
  }, [visibleEvents, weekDays]);

  // --- People (click to see contacts)
  const [people, setPeople] = useState<Person[]>([
    {
      id: "p1",
      name: "Lea Becker",
      dept: "IT",
      presence: "green",
      note: "",
      companyEmail: "lea.becker@firma.de",
      companyPhone: "+49 30 555-100",
      role: "Teamleiter",
    },
    {
      id: "p2",
      name: "Sven Krause",
      dept: "Vertrieb",
      presence: "orange",
      note: "Im Gespräch",
      companyEmail: "sven.krause@firma.de",
      companyPhone: "+49 30 555-200",
      role: "Sachbearbeiter",
    },
    {
      id: "p3",
      name: "Mila Nguyen",
      dept: "Disposition",
      presence: "red",
      note: "Urlaub bis Fr",
      companyEmail: "mila.nguyen@firma.de",
      companyPhone: "+49 30 555-300",
      role: "Sachbearbeiter",
    },
    {
      id: "p4",
      name: "Du",
      dept: selectedDept,
      presence,
      note: presenceNote,
      companyEmail: "ronny@firma.de",
      companyPhone: "+49 30 555-007",
      role: "Abteilungsleiter",
    },
    {
      id: "p5",
      name: "Kim Albers",
      dept: selectedDept,
      presence: "green",
      note: "",
      companyEmail: "kim.albers@firma.de",
      companyPhone: "+49 30 555-888",
      role: "Azubi",
    },
  ]);

  React.useEffect(() => {
    setPeople((prev) =>
      prev.map((p) =>
        p.name === "Du"
          ? {
              ...p,
              dept: selectedDept,
              presence,
              note: presenceNote,
              companyEmail: "ronny@firma.de",
              companyPhone: "+49 30 555-007",
              role: "Abteilungsleiter",
            }
          : p
      )
    );
  }, [presence, presenceNote, selectedDept]);

  const peopleForDept = useMemo(() => {
    const selected = new Set(calendarSelectedDepts);
    // für Ampel zeigen wir (wenn Merge aktiv) alle ausgewählten Abteilungen, sonst nur current
    return people.filter((p) => (calendarMerge ? selected.has(p.dept) : p.dept === selectedDept));
  }, [people, calendarSelectedDepts, calendarMerge, selectedDept]);

  const [personOpen, setPersonOpen] = useState(false);
  const [personSelected, setPersonSelected] = useState<Person | null>(null);

  const openPerson = (p: Person) => {
    setPersonSelected(p);
    setPersonOpen(true);
  };

  // --- Profil + Lohnzettel in einem Tab
  const [profile, setProfile] = useState<Profile>({
    address: "Musterstraße 12, 10115 Berlin",
    privatePhone: "+49 170 123456",
    bank: "DE12 3456 7890 1234 5678 90",
    companyPhone: "+49 30 555-007",
    companyEmail: "ronny@firma.de",
    role: "Abteilungsleiter",
  });

  const [profileDraft, setProfileDraft] = useState(profile);
  const [profileEditing, setProfileEditing] = useState(false);
  const [profileRequests, setProfileRequests] = useState<ProfileChangeRequest[]>([]);
  const [profilePhoto, setProfilePhoto] = useState<string>(avatarDataUrl);
  const [photoDraft, setPhotoDraft] = useState<string>(avatarDataUrl);

  const submitProfileChanges = () => {
    const reqs: ProfileChangeRequest[] = [];
    if (profileDraft.address !== profile.address)
      reqs.push({ id: crypto.randomUUID(), field: "address", oldValue: profile.address, newValue: profileDraft.address, status: "PENDING" });
    if (profileDraft.privatePhone !== profile.privatePhone)
      reqs.push({ id: crypto.randomUUID(), field: "privatePhone", oldValue: profile.privatePhone, newValue: profileDraft.privatePhone, status: "PENDING" });
    if (profileDraft.bank !== profile.bank)
      reqs.push({ id: crypto.randomUUID(), field: "bank", oldValue: profile.bank, newValue: profileDraft.bank, status: "PENDING" });
    if (photoDraft !== profilePhoto)
      reqs.push({ id: crypto.randomUUID(), field: "photo", oldValue: "(alt)", newValue: "(neu)", status: "PENDING" });

    if (reqs.length === 0) {
      setProfileEditing(false);
      return;
    }

    setProfileRequests((p) => [...reqs, ...p]);
    setProfileEditing(false);

    // Demo: Anzeige bleibt unverändert bis Freigabe
  };

  // --- Org chart with clickable people + avatar
  const orgPeople = useMemo(() => {
    const pick = (name: string) => people.find((p) => p.name === name);
    return [
      { person: pick("Du"), level: 0, icon: <Crown className="h-4 w-4" /> },
      { person: pick("Lea Becker"), level: 1, icon: <Briefcase className="h-4 w-4" /> },
      { person: pick("Sven Krause"), level: 2, icon: <User className="h-4 w-4" /> },
      { person: pick("Kim Albers"), level: 3, icon: <GraduationCap className="h-4 w-4" /> },
    ].filter((x) => x.person);
  }, [people]);

  // --- Meine Aufträge
  const [orders] = useState<Order[]>([
    {
      id: "o1",
      title: "Zollabfrage: Personal Effects (CH)",
      status: "IN_PROGRESS",
      due: addDays(today, 3),
      priority: "HIGH",
      lastActivity: today,
      customer: "Kunde A",
    },
    {
      id: "o2",
      title: "Dokumentencheck: DE → US",
      status: "WAITING",
      due: addDays(today, 6),
      priority: "MED",
      lastActivity: addDays(today, -1),
      customer: "Kunde B",
    },
    {
      id: "o3",
      title: "Rückfrage: Zolldaten ergänzen",
      status: "OPEN",
      due: addDays(today, 1),
      priority: "HIGH",
      lastActivity: addDays(today, -2),
      customer: "Kunde C",
    },
  ]);
  const [orderQuery, setOrderQuery] = useState("");
  const [orderStatus, setOrderStatus] = useState<"ALL" | Order["status"]>("ALL");

  const filteredOrders = useMemo(() => {
    const q = orderQuery.trim().toLowerCase();
    return orders
      .filter((o) => (orderStatus === "ALL" ? true : o.status === orderStatus))
      .filter((o) =>
        q
          ? [o.title, o.customer, o.status, o.priority].some((x) => x.toLowerCase().includes(q))
          : true
      )
      .sort((a, b) => a.due.localeCompare(b.due));
  }, [orders, orderQuery, orderStatus]);

  // --- Lohnzettel (unter Profil-Tab)
  const [payslips] = useState<Payslip[]>([
    { id: "p1", month: "2025-11", fileName: "Lohnzettel_2025-11.pdf" },
    { id: "p2", month: "2025-10", fileName: "Lohnzettel_2025-10.pdf" },
    { id: "p3", month: "2025-09", fileName: "Lohnzettel_2025-09.pdf" },
  ]);
  const [payslipLocked, setPayslipLocked] = useState(true);
  const [payslipPwd, setPayslipPwd] = useState("");
  const demoPwd = "1234";

  // --- UI helpers
  const presenceLabel = (p: Presence) =>
    p === "green" ? "Anwesend" : p === "orange" ? "Im Gespräch" : "Nicht im Haus";

  const presencePillClass = (p: Presence) =>
    p === "green"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : p === "orange"
        ? "border-orange-200 bg-orange-50 text-orange-800"
        : "border-red-200 bg-red-50 text-red-800";

  const last14 = useMemo(() => Array.from({ length: 14 }, (_, i) => addDays(today, -i)), [today]);

  const segments = useMemo(() => buildSegments(timeEntries), [timeEntries]);

  const progress = useMemo(() => {
    const pct = clamp((work / targetWorkMins) * 100, 0, 140);
    return pct;
  }, [work, targetWorkMins]);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-6">
        {/* Top Bar */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img
                src={profilePhoto}
                alt="Avatar"
                className="h-11 w-11 rounded-full ring-1 ring-border"
              />
              <span className="absolute -bottom-0.5 -right-0.5 rounded-full bg-background p-0.5 ring-1 ring-border">
                <StatusDot presence={presence} />
              </span>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Mitarbeiterbereich</div>
              <div className="text-lg font-semibold tracking-tight">Ronny (Demo)</div>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className={cn("flex items-center gap-2 rounded-full border px-3 py-1.5", presencePillClass(presence))}>
              <StatusDot presence={presence} />
              <span className="text-sm font-medium">{presenceLabel(presence)}</span>
              {presence === "red" && presenceNote ? (
                <span className="hidden text-xs text-muted-foreground sm:inline">· {presenceNote}</span>
              ) : null}
            </div>

            <div className="flex items-center gap-2">
              <Select value={selectedDept} onValueChange={setSelectedDept}>
                <SelectTrigger className="h-9 w-[180px] rounded-full">
                  <SelectValue placeholder="Abteilung" />
                </SelectTrigger>
                <SelectContent>
                  {DEPTS.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" className="h-9 w-9 rounded-full" title="(Demo) Logout">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <Tabs defaultValue="time" className="w-full">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <TabsList className="grid w-full grid-cols-2 gap-1 rounded-2xl p-1 sm:w-auto sm:grid-cols-5">
              <TabsTrigger value="time" className="rounded-xl">
                <Clock className="mr-2 h-4 w-4" /> Zeiterfassung
              </TabsTrigger>
              <TabsTrigger value="leave" className="rounded-xl">
                <CalendarDays className="mr-2 h-4 w-4" /> Urlaub
              </TabsTrigger>
              <TabsTrigger value="calampel" className="rounded-xl">
                <Users className="mr-2 h-4 w-4" /> Kalender & Ampel
              </TabsTrigger>
              <TabsTrigger value="profilepay" className="rounded-xl">
                <User className="mr-2 h-4 w-4" /> Profil & Lohn
              </TabsTrigger>
              <TabsTrigger value="orders" className="rounded-xl">
                <ClipboardList className="mr-2 h-4 w-4" /> Aufträge
              </TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Switch id="law" checked={requireLawHints} disabled />
                <Label htmlFor="law" className="text-sm text-muted-foreground">
                  Hinweise aktiv (Demo)
                </Label>
              </div>
              <div className="flex items-center gap-2 rounded-2xl border px-3 py-2">
                <Switch id="away" checked={teamLeadAway} onCheckedChange={(v) => setTeamLeadAway(Boolean(v))} />
                <Label htmlFor="away" className="text-sm">
                  Teamleiter im Urlaub
                </Label>
              </div>
            </div>
          </div>

          {/* --------------------------- Zeiterfassung --------------------------- */}
          <TabsContent value="time" className="space-y-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-lg font-semibold tracking-tight">Zeiterfassung</div>
                <div className="text-sm text-muted-foreground">Visuell + Verlauf (letzte 14 Tage)</div>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground">Datum</Label>
                <Select value={selectedDate} onValueChange={setSelectedDate}>
                  <SelectTrigger className="h-10 w-[220px] rounded-2xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {last14.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}{d === today ? " (Heute)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Card className="rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <Clock className="h-4 w-4" /> Überblick
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <Metric label="Ist" value={formatHM(work)} icon={<Timer className="h-4 w-4" />} />
                  <Metric label="Soll" value={formatHM(targetWorkMins)} icon={<ShieldCheck className="h-4 w-4" />} />
                  <Metric label="Saldo" value={formatHM(saldo)} icon={<CheckCircle2 className="h-4 w-4" />} subtle={saldo === 0} />
                </div>

                <div className="rounded-2xl border p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold">Fortschritt</div>
                    <div className="text-sm text-muted-foreground">{Math.round(progress)}%</div>
                  </div>
                  <div className="mt-3 h-2 w-full rounded-full bg-muted">
                    <div className="h-2 rounded-full bg-foreground/80" style={{ width: `${clamp(progress, 0, 100)}%` }} />
                  </div>
                  {progress > 100 ? (
                    <div className="mt-2 text-xs text-muted-foreground">Über Soll · +{formatHM(Math.max(0, work - targetWorkMins))}</div>
                  ) : (
                    <div className="mt-2 text-xs text-muted-foreground">Rest bis Soll · {formatHM(Math.max(0, targetWorkMins - work))}</div>
                  )}
                </div>

                <div className="rounded-2xl border p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold">Tageslinie</div>
                    <div className="text-xs text-muted-foreground">06:00–20:00 (Demo)</div>
                  </div>
                  <div className="mt-3 overflow-hidden rounded-2xl border bg-background">
                    <div className="flex h-8 w-full">
                      {segments.segs.map((s, i) => {
                        const w = ((s.to - s.from) / segments.span) * 100;
                        const cls = s.kind === "WORK" ? "bg-foreground/80" : s.kind === "PAUSE" ? "bg-muted" : "bg-background";
                        return <div key={i} className={cn("h-8", cls)} style={{ width: `${w}%` }} />;
                      })}
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>Arbeit</span>
                    <span>Pause</span>
                    <span>Off</span>
                  </div>
                </div>

                <AnimatePresence initial={false}>
                  {lawHints.length > 0 ? (
                    <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="space-y-2">
                      {lawHints.map((h, idx) => (
                        <div key={idx} className={cn("flex items-start gap-3 rounded-2xl border p-3", h.kind === "stop" ? "border-red-200 bg-red-50" : "border-orange-200 bg-orange-50")}>
                          {h.kind === "stop" ? <XCircle className="mt-0.5 h-5 w-5 text-red-600" /> : <AlertTriangle className="mt-0.5 h-5 w-5 text-orange-600" />}
                          <div>
                            <div className="text-sm font-semibold">{h.title}</div>
                            <div className="text-sm text-muted-foreground">{h.detail}</div>
                          </div>
                        </div>
                      ))}
                    </motion.div>
                  ) : null}
                </AnimatePresence>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <Button className="h-12 rounded-2xl" variant={canCome && selectedDate === today ? "default" : "secondary"} disabled={!(canCome && selectedDate === today)} onClick={() => handleStamp("COME")}>
                    <DoorOpen className="mr-2 h-4 w-4" /> Kommen
                  </Button>
                  <Button className="h-12 rounded-2xl" variant={(canPauseStart || canPauseEnd) && selectedDate === today ? "default" : "secondary"} disabled={!((canPauseStart || canPauseEnd) && selectedDate === today)} onClick={() => handleStamp(inPause ? "PAUSE_END" : "PAUSE_START")}>
                    <Timer className="mr-2 h-4 w-4" /> {inPause ? "Pause beenden" : "Pause starten"}
                  </Button>
                  <Button className="h-12 rounded-2xl" variant={canGo && selectedDate === today ? "default" : "secondary"} disabled={!(canGo && selectedDate === today)} onClick={() => handleStamp("GO")}>
                    <DoorClosed className="mr-2 h-4 w-4" /> Gehen
                  </Button>
                </div>

                <div className="rounded-2xl border bg-muted/30 p-3 text-sm text-muted-foreground">
                  Rückwirkende Korrektur ist möglich: „Korrigieren“ erzeugt eine Freigabe-Anfrage → {teamLeadAway ? "Personalabteilung" : "Teamleiter"}.
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Buchungen</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {timeEntries.length === 0 ? (
                  <div className="rounded-2xl border p-6 text-center">
                    <div className="text-sm font-semibold">Keine Buchungen.</div>
                    <div className="mt-1 text-sm text-muted-foreground">Starte mit „Kommen“.</div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {sorted.map((e) => (
                      <div key={e.id} className="flex items-center justify-between gap-3 rounded-2xl border p-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted">
                            <IconForEntry type={e.type} />
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="text-sm font-semibold">{labelForEntry(e.type)}</div>
                              <div className="text-sm text-muted-foreground">· {e.at}</div>
                              {e.approval === "PENDING" ? <Badge variant="secondary" className="rounded-full">Freigabe ausstehend</Badge> : null}
                              {e.approval === "PENDING" && e.approvalRoutedTo ? (
                                <Badge variant="outline" className="rounded-full">{e.approvalRoutedTo === "HR" ? "an HR" : "an Teamleiter"}</Badge>
                              ) : null}
                            </div>
                            {e.correctedFrom ? (
                              <div className="text-xs text-muted-foreground">Original: {e.correctedFrom}{e.note ? ` · ${e.note}` : ""}</div>
                            ) : e.note ? (
                              <div className="text-xs text-muted-foreground">{e.note}</div>
                            ) : null}
                          </div>
                        </div>

                        <Button variant="outline" className="rounded-2xl" onClick={() => openEdit(e)}>
                          <Edit3 className="mr-2 h-4 w-4" /> Korrigieren
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* --------------------------- Urlaub --------------------------- */}
          <TabsContent value="leave" className="space-y-5">
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
              <Card className="rounded-2xl lg:col-span-1">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">Urlaubskonto</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <MiniMetric label="Gesamt" value={`${leaveTotal} Tage`} />
                    <MiniMetric label="Rest" value={`${leaveRemaining} Tage`} />
                  </div>
                  <Separator />
                  <Button className="h-11 w-full rounded-2xl" onClick={() => setLeaveOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Urlaub beantragen
                  </Button>
                  <div className="text-xs text-muted-foreground">Urlaubseinträge werden im Abteilungskalender immer öffentlich angezeigt.</div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl lg:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">Anträge</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {leaveRequests.map((r) => (
                    <div key={r.id} className="rounded-2xl border p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-sm font-semibold">{r.from} → {r.to}{r.halfDay ? " · ½ Tag" : ""}</div>
                        <div className="flex items-center gap-2">
                          {r.status === "PENDING" ? (
                            <Badge variant="secondary" className="rounded-full">Offen</Badge>
                          ) : r.status === "APPROVED" ? (
                            <Badge className="rounded-full">Genehmigt</Badge>
                          ) : (
                            <Badge variant="destructive" className="rounded-full">Abgelehnt</Badge>
                          )}
                          <Badge variant="outline" className="rounded-full">Öffentlich im Kalender</Badge>
                        </div>
                      </div>
                      {r.comment ? <div className="mt-1 text-sm text-muted-foreground">{r.comment}</div> : null}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* --------------------------- Kalender & Ampel (VISUELL + FILTER) --------------------------- */}
          <TabsContent value="calampel" className="space-y-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-lg font-semibold tracking-tight">Kalender & Ampel</div>
                <div className="text-sm text-muted-foreground">Filtern nach Abteilungen · zusammenfassen</div>
              </div>
              <Button className="h-11 rounded-2xl" onClick={() => setEventOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Eintrag
              </Button>
            </div>

            {/* Filters */}
            <Card className="rounded-2xl">
              <CardContent className="p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="rounded-full">Filter</Badge>
                    {DEPTS.map((d) => {
                      const on = calendarSelectedDepts.includes(d);
                      return (
                        <Button
                          key={d}
                          variant={on ? "default" : "outline"}
                          className="h-9 rounded-full"
                          onClick={() => toggleDept(d)}
                        >
                          {d}
                        </Button>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={calendarMerge} onCheckedChange={(v) => setCalendarMerge(Boolean(v))} />
                    <div className="text-sm">Kalender zusammenfassen</div>
                  </div>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  Aktiv: {calendarMerge ? calendarSelectedDepts.join(", ") : selectedDept}
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              {/* Visual week calendar */}
              <Card className="rounded-2xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">Woche (visuell)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-7 gap-2">
                    {weekDays.map((d) => (
                      <div key={d} className={cn("rounded-2xl border p-2", d === today ? "bg-muted/30" : "")}
                      >
                        <div className="text-xs text-muted-foreground">{d.slice(5)}</div>
                        <div className="mt-2 space-y-1">
                          {(eventsByDay.get(d) || []).slice(0, 3).map((e) => (
                            <div key={e.id} className="rounded-xl border px-2 py-1">
                              <div className="flex items-center justify-between gap-2">
                                <div className="truncate text-xs font-semibold">
                                  {e.visibility === "PRIVATE" ? "Belegt" : e.title}
                                </div>
                                <span className={cn("h-2 w-2 rounded-full", e.type === "LEAVE" ? "bg-red-500" : e.type === "MEETING" ? "bg-emerald-500" : "bg-orange-500")} />
                              </div>
                              <div className="mt-0.5 truncate text-[10px] text-muted-foreground">{e.dept} · {e.visibility === "PUBLIC" ? "Öffentlich" : "Privat"}</div>
                            </div>
                          ))}
                          {(eventsByDay.get(d) || []).length > 3 ? (
                            <div className="text-[10px] text-muted-foreground">+{(eventsByDay.get(d) || []).length - 3} mehr</div>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 text-xs text-muted-foreground">Punkte: Meeting (grün), Notiz (orange), Urlaub (rot).</div>
                </CardContent>
              </Card>

              {/* Ampel + Team list */}
              <Card className="rounded-2xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">Ampel (klickbar)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Button variant={presence === "green" ? "default" : "outline"} className="rounded-2xl" onClick={() => { setPresence("green"); setPresenceNote(""); }}>
                      <StatusDot presence="green" /><span className="ml-2">Anwesend</span>
                    </Button>
                    <Button variant={presence === "orange" ? "default" : "outline"} className="rounded-2xl" onClick={() => { setPresence("orange"); setPresenceNote("Im Gespräch"); }}>
                      <StatusDot presence="orange" /><span className="ml-2">Im Gespräch</span>
                    </Button>
                    <Button variant={presence === "red" ? "default" : "outline"} className="rounded-2xl" onClick={() => { setPresence("red"); setPresenceNote("Wieder da um 14:30"); }}>
                      <StatusDot presence="red" /><span className="ml-2">Nicht im Haus</span>
                    </Button>
                  </div>

                  {presence === "red" ? (
                    <div className="rounded-2xl border p-3">
                      <Label className="text-xs text-muted-foreground">Text bei Rot</Label>
                      <Input value={presenceNote} onChange={(e) => setPresenceNote(e.target.value)} className="mt-1 rounded-2xl" placeholder="wieder im Haus um … / Feierabend" />
                    </div>
                  ) : null}

                  <Separator />

                  <div className="text-sm font-semibold">Team</div>
                  <div className="space-y-2">
                    {peopleForDept.map((p) => (
                      <button key={p.id} onClick={() => openPerson(p)} className="w-full rounded-2xl border p-3 text-left transition hover:bg-muted/40">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <img src={avatarDataUrl} alt="Avatar" className="h-11 w-11 rounded-full ring-1 ring-border" />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <StatusDot presence={p.presence} />
                                <div className="truncate text-sm font-semibold">{p.name}</div>
                                {p.role ? <Badge variant="outline" className="rounded-full">{p.role}</Badge> : null}
                              </div>
                              <div className="mt-1 text-sm text-muted-foreground">{p.presence === "red" ? p.note || "Abwesend" : p.presence === "orange" ? p.note || "Im Gespräch" : "Anwesend"}</div>
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* --------------------------- Profil & Lohn --------------------------- */}
          <TabsContent value="profilepay" className="space-y-5">
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
              <Card className="rounded-2xl lg:col-span-1">
                <CardContent className="p-5">
                  <div className="flex flex-col items-center gap-4 text-center">
                    <img src={profileEditing ? photoDraft : profilePhoto} alt="Profil" className="h-[150px] w-[150px] rounded-full ring-1 ring-border" />
                    <div>
                      <div className="text-lg font-semibold">Ronny (Demo)</div>
                      <div className="text-sm text-muted-foreground">{profile.role}</div>
                      <div className="mt-2 flex items-center justify-center gap-2">
                        <Badge variant="outline" className="rounded-full">{selectedDept}</Badge>
                        <Badge variant="secondary" className="rounded-full">HR-Freigabe</Badge>
                      </div>
                    </div>

                    {profileEditing ? (
                      <Button variant="outline" className="w-full rounded-2xl" onClick={() => {
                        // Demo: fake change
                        setPhotoDraft((p) => (p === avatarDataUrl ? avatarDataUrl + "" : avatarDataUrl));
                      }}>
                        <Upload className="mr-2 h-4 w-4" /> Bild ändern (Demo)
                      </Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl lg:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between gap-3 text-base font-semibold">
                    <span>Profil</span>
                    {!profileEditing ? (
                      <Button variant="outline" className="rounded-2xl" onClick={() => { setProfileDraft(profile); setPhotoDraft(profilePhoto); setProfileEditing(true); }}>
                        <Edit3 className="mr-2 h-4 w-4" /> Bearbeiten
                      </Button>
                    ) : (
                      <Button className="rounded-2xl" onClick={submitProfileChanges}>
                        <Save className="mr-2 h-4 w-4" /> Zur Freigabe einreichen
                      </Button>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <FieldRow icon={<MapPin className="h-4 w-4" />} label="Adresse (privat)" value={profileEditing ? profileDraft.address : profile.address} editable={profileEditing} onChange={(v) => setProfileDraft((p) => ({ ...p, address: v }))} />
                  <FieldRow icon={<Phone className="h-4 w-4" />} label="Private Telefonnummer" value={profileEditing ? profileDraft.privatePhone : profile.privatePhone} editable={profileEditing} onChange={(v) => setProfileDraft((p) => ({ ...p, privatePhone: v }))} />
                  <FieldRow icon={<Banknote className="h-4 w-4" />} label="Bankverbindung" value={profileEditing ? profileDraft.bank : profile.bank} editable={profileEditing} onChange={(v) => setProfileDraft((p) => ({ ...p, bank: v }))} />

                  <Separator />

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <ReadRow icon={<Building2 className="h-4 w-4" />} label="Rolle" value={profile.role} />
                    <ReadRow icon={<Phone className="h-4 w-4" />} label="Firmen-Telefon" value={profile.companyPhone} />
                    <ReadRow icon={<Mail className="h-4 w-4" />} label="Firmen-E-Mail" value={profile.companyEmail} />
                  </div>

                  <Separator />

                  <div>
                    <div className="text-sm font-semibold">Organigramm (klickbar)</div>
                    <div className="mt-2 space-y-2">
                      {orgPeople.map((n) => (
                        <button
                          key={n.person!.id}
                          onClick={() => openPerson(n.person!)}
                          className="w-full rounded-2xl border p-3 text-left transition hover:bg-muted/40"
                          style={{ marginLeft: n.level * 10 }}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <img src={avatarDataUrl} alt="Avatar" className="h-10 w-10 rounded-full ring-1 ring-border" />
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-muted-foreground">{n.icon}</span>
                                  <div className="text-sm font-semibold">{n.person!.name}</div>
                                  {n.person!.role ? <Badge variant="outline" className="rounded-full">{n.person!.role}</Badge> : null}
                                </div>
                                <div className="text-xs text-muted-foreground">{n.person!.dept}</div>
                              </div>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </button>
                      ))}
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">Klick auf Person → Telefon & E-Mail.</div>
                  </div>

                  <Separator />

                  <div>
                    <div className="text-sm font-semibold">Änderungsanträge</div>
                    <div className="mt-2 space-y-2">
                      {profileRequests.length === 0 ? (
                        <div className="rounded-2xl border p-4 text-sm text-muted-foreground">Keine offenen Anträge.</div>
                      ) : (
                        profileRequests.map((r) => (
                          <div key={r.id} className="rounded-2xl border p-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="text-sm font-semibold">{r.field}</div>
                              <Badge variant="secondary" className="rounded-full">Bearbeitung</Badge>
                            </div>
                            <div className="mt-1 text-xs text-muted-foreground">Freigabe: Personalabteilung</div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <Lock className="h-4 w-4" /> Lohnzettel
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {payslipLocked ? (
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <div className="rounded-2xl border p-5">
                      <div className="text-sm font-semibold">Passwort erforderlich</div>
                      <div className="mt-1 text-sm text-muted-foreground">Demo-Passwort: <span className="font-mono">{demoPwd}</span></div>
                      <div className="mt-4 flex items-center gap-2">
                        <Input value={payslipPwd} onChange={(e) => setPayslipPwd(e.target.value)} className="h-10 rounded-2xl" placeholder="Passwort" type="password" />
                        <Button className="h-10 rounded-2xl" onClick={() => { if (payslipPwd === demoPwd) { setPayslipLocked(false); setPayslipPwd(""); } }}>
                          Entsperren
                        </Button>
                      </div>
                    </div>
                    <div className="rounded-2xl border p-5">
                      <div className="text-sm font-semibold">Security-Notiz</div>
                      <div className="mt-1 text-sm text-muted-foreground">In echt: Re-Auth, optional 2FA, Timeout.</div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">Entsperrt (Demo)</div>
                      <Button variant="outline" className="rounded-2xl" onClick={() => setPayslipLocked(true)}>
                        <Lock className="mr-2 h-4 w-4" /> Sperren
                      </Button>
                    </div>
                    {payslips.map((p) => (
                      <div key={p.id} className="flex items-center justify-between gap-3 rounded-2xl border p-3">
                        <div>
                          <div className="text-sm font-semibold">{p.month}</div>
                          <div className="text-sm text-muted-foreground">{p.fileName}</div>
                        </div>
                        <Button variant="outline" className="rounded-2xl">
                          <FileText className="mr-2 h-4 w-4" /> Öffnen
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* --------------------------- Aufträge --------------------------- */}
          <TabsContent value="orders" className="space-y-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-lg font-semibold tracking-tight">Meine Aufträge</div>
                <div className="text-sm text-muted-foreground">Minimal · Filter · Suche</div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input value={orderQuery} onChange={(e) => setOrderQuery(e.target.value)} className="h-10 w-[260px] rounded-2xl pl-9" placeholder="Suchen (Titel, Kunde, Status…)" />
                </div>
                <Select value={orderStatus} onValueChange={(v: any) => setOrderStatus(v)}>
                  <SelectTrigger className="h-10 w-[170px] rounded-2xl">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Alle</SelectItem>
                    <SelectItem value="OPEN">Offen</SelectItem>
                    <SelectItem value="IN_PROGRESS">In Arbeit</SelectItem>
                    <SelectItem value="WAITING">Wartet</SelectItem>
                    <SelectItem value="DONE">Erledigt</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
              <Card className="rounded-2xl lg:col-span-1">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">Liste</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {filteredOrders.map((o) => (
                    <div key={o.id} className="rounded-2xl border p-3">
                      <div className="text-sm font-semibold">{o.title}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>Kunde: {o.customer}</span>
                        <span>·</span>
                        <span>Fällig: {o.due}</span>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Badge variant="secondary" className="rounded-full">{o.status}</Badge>
                        <Badge variant="outline" className="rounded-full">{o.priority}</Badge>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="rounded-2xl lg:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">Details (Demo)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-2xl border p-6">
                    <div className="text-sm font-semibold">Split-View</div>
                    <div className="mt-1 text-sm text-muted-foreground">In der echten App öffnet ein Klick rechts die Details des ausgewählten Auftrags.</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* --------------------------- Dialog: Korrektur --------------------------- */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Zeitbuchung korrigieren</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-2xl border bg-muted/30 p-3 text-sm text-muted-foreground">
              Diese Korrektur wird als Anfrage an <b>{teamLeadAway ? "Personalabteilung" : "Teamleiter"}</b> gesendet.
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-xs text-muted-foreground">Original</Label>
                <Input value={editEntry?.at || ""} disabled className="mt-1 rounded-2xl" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Neu</Label>
                <Input value={editNewTime} onChange={(e) => setEditNewTime(e.target.value)} className="mt-1 rounded-2xl" placeholder="HH:MM" />
              </div>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Grund</Label>
              <Select value={editReason} onValueChange={setEditReason}>
                <SelectTrigger className="mt-1 rounded-2xl">
                  <SelectValue placeholder="Grund" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Vergessen zu stempeln">Vergessen zu stempeln</SelectItem>
                  <SelectItem value="Falsche Uhrzeit">Falsche Uhrzeit</SelectItem>
                  <SelectItem value="Dienstgang">Dienstgang</SelectItem>
                  <SelectItem value="Sonstiges">Sonstiges</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Notiz (optional)</Label>
              <Input value={editNote} onChange={(e) => setEditNote(e.target.value)} className="mt-1 rounded-2xl" placeholder="Kurz erklären…" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-2xl" onClick={() => setEditOpen(false)}>Abbrechen</Button>
            <Button className="rounded-2xl" onClick={submitEdit}>Einreichen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --------------------------- Dialog: Urlaub beantragen --------------------------- */}
      <Dialog open={leaveOpen} onOpenChange={setLeaveOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Urlaub beantragen</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-xs text-muted-foreground">Von</Label>
                <Input type="date" value={leaveFrom} onChange={(e) => setLeaveFrom(e.target.value)} className="mt-1 rounded-2xl" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Bis</Label>
                <Input type="date" value={leaveTo} onChange={(e) => setLeaveTo(e.target.value)} className="mt-1 rounded-2xl" />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-2xl border p-3">
              <div>
                <div className="text-sm font-semibold">Halber Tag</div>
                <div className="text-sm text-muted-foreground">Reduziert die Berechnung (Demo)</div>
              </div>
              <Switch checked={leaveHalf} onCheckedChange={(v) => setLeaveHalf(Boolean(v))} />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Kommentar (optional)</Label>
              <Input value={leaveComment} onChange={(e) => setLeaveComment(e.target.value)} className="mt-1 rounded-2xl" placeholder="z. B. wichtiger Termin" />
            </div>

            <div className="rounded-2xl border bg-muted/30 p-3 text-sm text-muted-foreground">
              Geplante Tage (Demo): <span className="font-mono">{requestedDays}</span> · Urlaub wird im Kalender automatisch <b>öffentlich</b>.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-2xl" onClick={() => setLeaveOpen(false)}>Abbrechen</Button>
            <Button className="rounded-2xl" onClick={submitLeave}>Antrag senden</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --------------------------- Dialog: Kalender-Eintrag --------------------------- */}
      <Dialog open={eventOpen} onOpenChange={setEventOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Kalendereintrag</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Datum</Label>
              <Input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className="mt-1 rounded-2xl" />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Typ</Label>
              <Select value={eventType} onValueChange={(v: any) => setEventType(v)}>
                <SelectTrigger className="mt-1 rounded-2xl">
                  <SelectValue placeholder="Typ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NOTE">Notiz</SelectItem>
                  <SelectItem value="MEETING">Meeting</SelectItem>
                  <SelectItem value="LEAVE">Urlaub</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Titel</Label>
              <Input value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} className="mt-1 rounded-2xl" placeholder="Kurzer Titel" />
            </div>

            <div className="flex items-center justify-between rounded-2xl border p-3">
              <div>
                <div className="text-sm font-semibold">Sichtbarkeit</div>
                <div className="text-sm text-muted-foreground">{eventType === "LEAVE" ? "Bei Urlaub immer öffentlich." : "Privat oder Öffentlich"}</div>
              </div>
              <Select value={eventType === "LEAVE" ? "PUBLIC" : eventVis} onValueChange={(v: any) => setEventVis(v)}>
                <SelectTrigger className="h-10 w-[160px] rounded-2xl" disabled={eventType === "LEAVE"}>
                  <SelectValue placeholder="Sichtbarkeit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PRIVATE">Privat</SelectItem>
                  <SelectItem value="PUBLIC">Öffentlich</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {eventType === "LEAVE" ? (
              <div className="rounded-2xl border bg-muted/30 p-3 text-sm text-muted-foreground">Regel aktiv: Urlaubseinträge werden automatisch als <b>öffentlich</b> gespeichert.</div>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-2xl" onClick={() => setEventOpen(false)}>Abbrechen</Button>
            <Button className="rounded-2xl" onClick={submitEvent}>Speichern</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --------------------------- Dialog: Kolleg:in Details --------------------------- */}
      <Dialog open={personOpen} onOpenChange={setPersonOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Kontakt</DialogTitle>
          </DialogHeader>
          {personSelected ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <img src={avatarDataUrl} alt="Avatar" className="h-12 w-12 rounded-full ring-1 ring-border" />
                <div>
                  <div className="flex items-center gap-2">
                    <StatusDot presence={personSelected.presence} />
                    <div className="text-sm font-semibold">{personSelected.name}</div>
                    {personSelected.role ? <Badge variant="outline" className="rounded-full">{personSelected.role}</Badge> : null}
                  </div>
                  <div className="text-sm text-muted-foreground">{personSelected.dept}</div>
                </div>
              </div>

              <div className="rounded-2xl border p-3">
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="font-semibold">{personSelected.companyPhone}</span>
                </div>
                <div className="mt-2 flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="font-semibold">{personSelected.companyEmail}</span>
                </div>
              </div>

              <div className="text-xs text-muted-foreground">In echt: Click-to-call / Mailto / Teams.</div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" className="rounded-2xl" onClick={() => setPersonOpen(false)}>Schließen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --------------------------- Dialog: Confirm --------------------------- */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Hinweis</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-muted-foreground">{confirmText}</div>
          <DialogFooter>
            <Button variant="outline" className="rounded-2xl" onClick={() => setConfirmOpen(false)}>Abbrechen</Button>
            <Button className="rounded-2xl" onClick={() => { setConfirmOpen(false); confirmAction?.(); }}>Fortfahren</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Metric({ label, value, icon, subtle }: { label: string; value: string; icon: React.ReactNode; subtle?: boolean }) {
  return (
    <div className="rounded-2xl border p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="text-muted-foreground">{icon}</div>
      </div>
      <div className={cn("mt-2 text-3xl font-semibold tracking-tight", subtle ? "text-muted-foreground" : "")}>{value}</div>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-semibold">{value}</div>
    </div>
  );
}

function FieldRow({ icon, label, value, editable, onChange }: { icon: React.ReactNode; label: string; value: string; editable: boolean; onChange: (v: string) => void }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border p-3">
      <div className="mt-0.5 text-muted-foreground">{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="text-xs text-muted-foreground">{label}</div>
        {editable ? <Input value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 rounded-2xl" /> : <div className="mt-1 text-sm font-semibold">{value}</div>}
      </div>
    </div>
  );
}

function ReadRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border p-3">
      <div className="mt-0.5 text-muted-foreground">{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="mt-1 text-sm font-semibold">{value}</div>
      </div>
    </div>
  );
}

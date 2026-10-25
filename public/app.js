const ADMIN = { username: "admin", password: "admin123" };
const $ = (id) => document.getElementById(id);

const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const toMin = (t) => {
  const [h, m] = String(t || "0:0")
    .split(":")
    .map(Number);
  return h * 60 + m;
};
const fmt12 = (t) => {
  if (!t) return "";
  let [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
};
const eventDateTime = (e, t) => new Date(`${e.date}T${t}:00`);
const eventStatus = (e) => {
  const n = new Date(),
    s = eventDateTime(e, e.start),
    end = eventDateTime(e, e.end);
  return n < s ? "Upcoming" : n > end ? "Completed" : "Ongoing";
};
const toast = (msg) => {
  let x = $("toast");
  if (!x) {
    x = document.createElement("div");
    x.id = "toast";
    x.className = "toast";
    document.body.appendChild(x);
  }
  x.textContent = msg;
  setTimeout(() => x.remove(), 3300);
};
function getSession() {
  try {
    return JSON.parse(localStorage.getItem("session"));
  } catch {
    return null;
  }
}
function logout() {
  localStorage.removeItem("session");
  location.href = "log-in.html";
}
function requireRole(role) {
  const s = getSession();
  if (!s || s.role !== role) {
    location.href = "log-in.html";
    return false;
  }
  return true;
}
function login() {
  const role = window.loginRole || "student",
    u = $("username").value.trim(),
    p = $("password").value;
  if (role === "admin" && u === ADMIN.username && p === ADMIN.password) {
    localStorage.setItem("session", JSON.stringify({ role }));
    location.href = "index.html";
    return;
  }
  if (role === "student") {
    const st = system
      .getStudents()
      .find((x) => x.studentId === u && x.password === p);
    if (st) {
      localStorage.setItem(
        "session",
        JSON.stringify({ role, studentId: st.studentId }),
      );
      location.href = "student.html";
      return;
    }
  }
  $("login-error").classList.remove("hidden");
}
function setRole(role) {
  window.loginRole = role;
  $("tab-student").classList.toggle("active", role === "student");
  $("tab-admin").classList.toggle("active", role === "admin");
  $("username").placeholder =
    role === "admin" ? "Admin username" : "Student ID";
  $("signup-link").classList.toggle("hidden", role === "admin");
}
function toggleSignup() {
  $("login-screen").classList.toggle("hidden");
  $("signup-screen").classList.toggle("hidden");
}
function signup() {
  let v = (id) => $(id).value.trim(),
    s = {
      studentId: v("su-id"),
      first: v("su-first"),
      middle: v("su-middle"),
      last: v("su-last"),
      department: v("su-dept"),
      program: v("su-program"),
      year: v("su-year"),
      section: v("su-section"),
      email: v("su-email"),
      password: $("su-pass").value,
    };
  if (system.addStudent(s)) {
    toast("Account created. Please sign in.");
    toggleSignup();
  }
}
class AttendanceSystem {
  events() {
    try {
      return JSON.parse(localStorage.getItem("events")) || [];
    } catch {
      return [];
    }
  }
  getEvents() {
    return this.events();
  }
  getEvent(id) {
    return this.events().find((e) => e.id === Number(id)) || null;
  }
  save(es) {
    try {
      localStorage.setItem("events", JSON.stringify(es));
      return true;
    } catch {
      alert(
        "Browser storage is full. Use a smaller photo (under 1 MB) or clear older event data.",
      );
      return false;
    }
  }
  getStudents() {
    try {
      return JSON.parse(localStorage.getItem("students")) || [];
    } catch {
      return [];
    }
  }
  addStudent(s) {
    if (
      !s.studentId ||
      !s.first ||
      !s.last ||
      !s.program ||
      !s.year ||
      !s.section ||
      !s.password
    ) {
      alert("Complete all required account fields.");
      return false;
    }
    let a = this.getStudents();
    if (a.some((x) => x.studentId === s.studentId)) {
      alert("Student ID already exists.");
      return false;
    }
    a.push(s);
    localStorage.setItem("students", JSON.stringify(a));
    return true;
  }
  currentStudent() {
    let sid = getSession()?.studentId;
    return this.getStudents().find((s) => s.studentId === sid) || null;
  }
  addEvent(name, date, start, end, venue, grace = 15) {
    if (
      !name ||
      !date ||
      !start ||
      !end ||
      !venue ||
      toMin(end) <= toMin(start)
    ) {
      alert("Enter valid event details. End must be after start.");
      return false;
    }
    let a = this.events();
    a.push({
      id: Date.now(),
      name,
      date,
      start,
      end,
      venue,
      grace: Number(grace) || 0,
      attendees: [],
    });
    return this.save(a);
  }
  findConflict(sid, ev, events = this.events()) {
    let a = eventDateTime(ev, ev.start),
      b = eventDateTime(ev, ev.end);
    return events.find(
      (x) =>
        x.id !== ev.id &&
        x.date === ev.date &&
        x.attendees?.some((y) => y.studentId === sid) &&
        a < eventDateTime(x, x.end) &&
        b > eventDateTime(x, x.start),
    );
  }
  canRegister(ev) {
    let n = new Date();
    return n >= eventDateTime(ev, ev.start) && n <= eventDateTime(ev, ev.end);
  }
  registerSelf(id, proof) {
    let st = this.currentStudent(),
      all = this.events(),
      ev = all.find((e) => e.id === Number(id));
    if (!st || !ev) {
      alert("Event or student account not found.");
      return false;
    }
    if (!proof) {
      alert("Upload a photo from the event as proof to register.");
      return false;
    }
    if (!this.canRegister(ev)) {
      alert(
        `Registration is open only during the event (${fmt12(ev.start)}–${fmt12(ev.end)}).`,
      );
      return false;
    }
    if (ev.attendees.some((a) => a.studentId === st.studentId)) {
      alert("You are already registered.");
      return false;
    }
    let clash = this.findConflict(st.studentId, ev, all);
    if (clash) {
      alert(
        `Schedule conflict with ${clash.name} (${fmt12(clash.start)}–${fmt12(clash.end)}).`,
      );
      return false;
    }
    ev.attendees.push({
      first: st.first,
      middle: st.middle,
      last: st.last,
      course: st.program,
      year: st.year,
      section: st.section,
      studentId: st.studentId,
      timeIn: new Date().toTimeString().slice(0, 5),
      proof,
    });
    return this.save(all);
  }
  unregisterSelf(id) {
    let st = this.currentStudent(),
      all = this.events(),
      ev = all.find((e) => e.id === Number(id));
    if (!st || !ev) return false;
    ev.attendees = ev.attendees.filter((a) => a.studentId !== st.studentId);
    return this.save(all);
  }
  attendeeStatus(ev, a) {
    if (!a.timeIn)
      return eventStatus(ev) === "Completed" ? "Absent" : "Registered";
    return toMin(a.timeIn) <= toMin(ev.start) + Number(ev.grace || 0)
      ? "Present"
      : "Late";
  }
  summary(ev) {
    let s = { Present: 0, Late: 0, Absent: 0, Registered: 0 };
    ev.attendees.forEach((a) => s[this.attendeeStatus(ev, a)]++);
    return s;
  }
  setTimeIn(id, sid, time) {
    let all = this.events(),
      ev = all.find((e) => e.id === Number(id)),
      a = ev?.attendees.find((x) => x.studentId === sid);
    if (!a) return false;
    a.timeIn = time;
    return this.save(all);
  }
  deleteAttendee(id, sid) {
    let all = this.events(),
      ev = all.find((e) => e.id === Number(id));
    if (!ev) return false;
    ev.attendees = ev.attendees.filter((a) => a.studentId !== sid);
    return this.save(all);
  }
  deleteEvent(id) {
    return this.save(this.events().filter((e) => e.id !== Number(id)));
  }
}
const system = new AttendanceSystem();

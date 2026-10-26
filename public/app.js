const ADMIN = {
  username: "admin",
  password: "admin123"
};

const $ = id => document.getElementById(id);

const esc = value =>
  String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);

const toMin = time => {
  const [hours, minutes] = String(time || "0:0").split(":").map(Number);
  return hours * 60 + minutes;
};

const fmt12 = time => {
  if (!time) return "";

  let [hours, minutes] = time.split(":").map(Number);
  const suffix = hours >= 12 ? "PM" : "AM";

  hours = hours % 12 || 12;

  return `${hours}:${String(minutes).padStart(2, "0")} ${suffix}`;
};

const eventDateTime = (event, time) =>
  new Date(`${event.date}T${time}:00`);

const eventStatus = event => {
  const now = new Date();
  const start = eventDateTime(event, event.start);
  const end = eventDateTime(event, event.end);

  if (now < start) return "Upcoming";
  if (now > end) return "Completed";

  return "Ongoing";
};

function toast(message) {
  let element = $("toast");

  if (!element) {
    element = document.createElement("div");
    element.id = "toast";
    element.className = "toast";
    document.body.appendChild(element);
  }

  element.textContent = message;

  setTimeout(() => {
    element.remove();
  }, 3300);
}

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

function requireAdmin() {
  if (getSession()?.role !== "admin") {
    location.href = "log-in.html";
    return false;
  }

  return true;
}

function requireRole(role) {
  return role === "admin" ? requireAdmin() : false;
}

function login() {
  const username = $("username").value.trim();
  const password = $("password").value;

  if (
    username === ADMIN.username &&
    password === ADMIN.password
  ) {
    localStorage.setItem(
      "session",
      JSON.stringify({ role: "admin" })
    );

    location.href = "index.html";
    return;
  }

  $("login-error").classList.remove("hidden");
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
    return this.events().find(event => event.id === Number(id)) || null;
  }

  save(events) {
    try {
      localStorage.setItem("events", JSON.stringify(events));
      return true;
    } catch {
      alert(
        "Browser storage is full. Use a smaller photo (under 1 MB) " +
        "or clear older event data."
      );
      return false;
    }
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
      alert("Enter valid event details. End time must be after start time.");
      return false;
    }

    const events = this.events();

    events.push({
      id: Date.now(),
      name,
      date,
      start,
      end,
      venue,
      grace: Number(grace) || 0,
      attendees: []
    });

    return this.save(events);
  }

  findConflict(studentId, currentEvent, events = this.events()) {
    const currentStart = eventDateTime(currentEvent, currentEvent.start);
    const currentEnd = eventDateTime(currentEvent, currentEvent.end);

    return events.find(event =>
      event.id !== currentEvent.id &&
      event.date === currentEvent.date &&
      event.attendees?.some(
        attendee =>
          attendee.studentId.toLowerCase() === studentId.toLowerCase()
      ) &&
      currentStart < eventDateTime(event, event.end) &&
      currentEnd > eventDateTime(event, event.start)
    );
  }

  canRegister(event) {
    const now = new Date();

    return (
      now >= eventDateTime(event, event.start) &&
      now <= eventDateTime(event, event.end)
    );
  }

  registerStudent(eventId, student, proof) {
    const events = this.events();
    const event = events.find(item => item.id === Number(eventId));

    if (!event) {
      alert("Select a valid event.");
      return false;
    }

    if (!this.canRegister(event)) {
      alert(
        `Student registration is available only during the event ` +
        `(${fmt12(event.start)}–${fmt12(event.end)}).`
      );
      return false;
    }

    if (!student.studentId || !student.first || !student.last) {
      alert("Student ID, first name, and last name are required.");
      return false;
    }

    if (!proof) {
      alert("Upload an event photo as proof.");
      return false;
    }

    const duplicate = event.attendees.some(
      attendee =>
        attendee.studentId.toLowerCase() === student.studentId.toLowerCase()
    );

    if (duplicate) {
      alert("This student is already registered for this event.");
      return false;
    }

    const conflict = this.findConflict(student.studentId, event, events);

    if (conflict) {
      alert(
        `Schedule conflict with ${conflict.name} ` +
        `(${fmt12(conflict.start)}–${fmt12(conflict.end)}).`
      );
      return false;
    }

    event.attendees.push({
      ...student,
      timeIn: new Date().toTimeString().slice(0, 5),
      proof
    });

    return this.save(events);
  }

  attendeeStatus(event, attendee) {
    if (!attendee.timeIn) {
      return eventStatus(event) === "Completed"
        ? "Absent"
        : "Registered";
    }

    return toMin(attendee.timeIn) <=
      toMin(event.start) + Number(event.grace || 0)
      ? "Present"
      : "Late";
  }

  summary(event) {
    const counts = {
      Present: 0,
      Late: 0,
      Absent: 0,
      Registered: 0
    };

    event.attendees.forEach(attendee => {
      counts[this.attendeeStatus(event, attendee)]++;
    });

    return counts;
  }

  deleteAttendee(eventId, studentId) {
    const events = this.events();
    const event = events.find(item => item.id === Number(eventId));

    if (!event) return false;

    event.attendees = event.attendees.filter(
      attendee => attendee.studentId !== studentId
    );

    return this.save(events);
  }

  deleteEvent(eventId) {
    const events = this.events().filter(
      event => event.id !== Number(eventId)
    );

    return this.save(events);
  }
}

const system = new AttendanceSystem();

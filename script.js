/************************************************************
 * IMPORTS
 ************************************************************/

// Firebase core services
import { auth, db } from "./firebase.js";

// Firebase Auth
import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Firestore (READ ONLY for now)
import {
    collection,
    getDocs,
    addDoc,
    serverTimestamp
} from
"https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/************************************************************
 * AUTH GUARD + INITIAL LOAD
 ************************************************************/

let studySessions = []; // Source of truth (loaded from Firestore)

// Protect dashboard + load user data
onAuthStateChanged(auth, async user => {
    if (!user) {
        window.location.href = "login.html";
        return;
    }

    // User is logged in → load data
    await loadStudySessions(user.uid);

    // Render everything AFTER data loads
    renderStudySessions();
    renderStreak();
    renderActiveRecall();
    renderTodaysFocus();
    renderStudyChart();
    renderDifficultyChart();
    renderSubjectChart();
    renderExamCountdown();
});

/************************************************************
 * FIRESTORE READ
 ************************************************************/

async function loadStudySessions(uid) {
    studySessions = [];

    const sessionsRef =
        collection(db, "users", uid, "studySessions");

    const snapshot = await getDocs(sessionsRef);

    snapshot.forEach(doc => {
        studySessions.push(doc.data());
    });
}

/************************************************************
 * ELEMENT REFERENCES
 ************************************************************/

const form = document.getElementById("study-form");
const studyList = document.getElementById("study-list");
const dateInput = document.getElementById("study-date");

const examDateInput = document.getElementById("exam-date");
const examCountdown = document.getElementById("exam-countdown");

const todayRecallsEl = document.getElementById("today-recalls");
const todaySessionsEl = document.getElementById("today-sessions");

const logoutBtn = document.getElementById("logout-btn");

/************************************************************
 * LOGOUT
 ************************************************************/

if (logoutBtn) {
    logoutBtn.onclick = () => {
        signOut(auth).then(() => {
            window.location.href = "login.html";
        });
    };
}

/************************************************************
 * FORM (WRITE COMING NEXT PHASE)
 * ⚠️ For now, form is DISABLED logically
 ************************************************************/

if (form) {
    form.addEventListener("submit", async e => {
        e.preventDefault();

        const user = auth.currentUser;
        if (!user) return;

        const session = {
            subject: subject.value.trim(),
            chapter: chapter.value.trim(),
            difficulty: Number(difficulty.value),
            date: dateInput.value,
            createdAt: serverTimestamp()
        };

        // Save to Firestore
        await addDoc(
            collection(db, "users", user.uid, "studySessions"),
            session
        );

        // Update local state
        studySessions.push(session);

        // Re-render UI
        renderStudySessions();
        renderStreak();
        renderActiveRecall();
        renderTodaysFocus();
        renderStudyChart();
        renderDifficultyChart();
        renderSubjectChart();

        form.reset();
        dateInput.value = new Date().toISOString().split("T")[0];
    });
}

/************************************************************
 * HISTORY PAGE
 ************************************************************/

function renderStudySessions() {
    if (!studyList) return;

    studyList.innerHTML = "";
    studySessions.forEach(s => {
        const li = document.createElement("li");
        li.textContent = `${s.subject} • ${s.chapter} • ${s.date}`;
        studyList.appendChild(li);
    });
}

/************************************************************
 * STREAK
 ************************************************************/

function calculateStudyStreak() {
    const dates = [...new Set(studySessions.map(s => s.date))]
        .sort()
        .reverse();

    let streak = 0;
    const today = new Date();
    today.setHours(0,0,0,0);

    for (let d of dates) {
        const day = new Date(d);
        day.setHours(0,0,0,0);

        if ((today - day) / 86400000 === streak) streak++;
        else break;
    }
    return streak;
}

function renderStreak() {
    const el = document.getElementById("streak-count");
    if (el) el.textContent = `${calculateStudyStreak()} days`;
}

/************************************************************
 * ACTIVE RECALL
 ************************************************************/

function renderActiveRecall() {
    const list = document.getElementById("recall-list");
    if (!list) return;

    list.innerHTML = "";

    const latest = {};
    studySessions.forEach(s => {
        const key = s.subject + "___" + s.chapter;
        if (!latest[key] || new Date(s.date) > new Date(latest[key].date)) {
            latest[key] = s;
        }
    });

    const today = new Date();
    today.setHours(0,0,0,0);

    Object.values(latest).forEach(s => {
        const studied = new Date(s.date);
        studied.setHours(0,0,0,0);

        const diff = Math.floor((today - studied) / 86400000);
        if (diff < 10) return;

        const li = document.createElement("li");
        li.className = "notification";

        let color = diff >= 20 ? "red" : diff >= 14 ? "yellow" : "green";

        li.innerHTML = `
            <div class="dot ${color}"></div>
            <div class="recall-text">
                ${s.subject} – ${s.chapter}
                · last studied ${diff} days ago
            </div>
            <button class="done-btn">Done</button>
        `;

        li.querySelector(".done-btn").onclick = async () => {
            li.classList.add("removing");

            setTimeout(async () => {
            const user = auth.currentUser;
            if (!user) return;

            const revision = {
                subject: s.subject,
                chapter: s.chapter,
                difficulty: s.difficulty || 5,
                date: new Date().toISOString().split("T")[0],
                createdAt: serverTimestamp()
            };

            await addDoc(
                collection(db, "users", user.uid, "studySessions"),
                revision
            );

            studySessions.push(revision);

            renderActiveRecall();
            renderStreak();
            renderTodaysFocus();
            renderStudyChart();
            renderDifficultyChart();
            renderSubjectChart();
        }, 350);
        };


        list.appendChild(li);
    });
}

/************************************************************
 * TODAY'S FOCUS
 ************************************************************/

function renderTodaysFocus() {
    if (!todayRecallsEl || !todaySessionsEl) return;

    const today = new Date();
    today.setHours(0,0,0,0);

    const sessionsToday = studySessions.filter(s => {
        const d = new Date(s.date);
        d.setHours(0,0,0,0);
        return d.getTime() === today.getTime();
    }).length;

    todaySessionsEl.textContent =
        `Study sessions today: ${sessionsToday}`;

    todaySessionsEl.style.color =
        sessionsToday >= 2 ? "#22c55e" : "";

    let dueToday = 0;
    studySessions.forEach(s => {
        const diff =
            Math.floor((today - new Date(s.date)) / 86400000);
        if (diff === 10) dueToday++;
    });

    todayRecallsEl.textContent =
        `Recalls due today: ${dueToday}`;
}

/************************************************************
 * EXAM COUNTDOWN (still local, ok for now)
 ************************************************************/

function renderExamCountdown() {
    if (!examCountdown) return;

    examCountdown.classList.remove(
        "countdown-warning",
        "countdown-danger"
    );

    const saved = localStorage.getItem("examDate");
    if (!saved) {
        examCountdown.textContent = "No exam set";
        return;
    }

    const diff =
        Math.ceil((new Date(saved) - new Date()) / 86400000);

    if (diff === 0) {
        examCountdown.textContent = "Exam is today 🚨";
        examCountdown.classList.add("countdown-danger");
    } else if (diff <= 7) {
        examCountdown.textContent = `${diff} days remaining`;
        examCountdown.classList.add("countdown-warning");
    } else {
        examCountdown.textContent = `${diff} days remaining`;
    }
}

if (examDateInput) {
    examDateInput.value =
        localStorage.getItem("examDate") || "";

    examDateInput.onchange = () => {
        localStorage.setItem("examDate", examDateInput.value);
        renderExamCountdown();
    };
}

/************************************************************
 * CHARTS
 ************************************************************/

function renderStudyChart() {
    const canvas = document.getElementById("studyChart");
    if (!canvas) return;

    const labels = [];
    const counts = [];

    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        d.setHours(0,0,0,0);

        labels.push(d.toLocaleDateString(undefined, {
            weekday: "short"
        }));

        const count = studySessions.filter(s => {
            const sd = new Date(s.date);
            sd.setHours(0,0,0,0);
            return sd.getTime() === d.getTime();
        }).length;

        counts.push(count);
    }

    if (window.studyChartInstance) {
        window.studyChartInstance.destroy();
    }

    window.studyChartInstance = new Chart(canvas, {
        type: "bar",
        data: {
            labels,
            datasets: [{
                data: counts,
                backgroundColor: "#6d6af8",
                borderRadius: 6
            }]
        },
        options: {
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
        }
    });
}

function renderDifficultyChart() {
    const canvas = document.getElementById("difficultyChart");
    if (!canvas) return;

    const labels = [];
    const values = [];

    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        d.setHours(0,0,0,0);

        labels.push(d.toLocaleDateString(undefined, {
            weekday: "short"
        }));

        const sessions = studySessions.filter(s => {
            const sd = new Date(s.date);
            sd.setHours(0,0,0,0);
            return sd.getTime() === d.getTime();
        });

        if (sessions.length === 0) values.push(null);
        else {
            const avg =
                sessions.reduce((sum, s) => sum + Number(s.difficulty), 0)
                / sessions.length;
            values.push(avg.toFixed(1));
        }
    }

    if (window.difficultyChartInstance) {
        window.difficultyChartInstance.destroy();
    }

    window.difficultyChartInstance = new Chart(canvas, {
        type: "line",
        data: {
            labels,
            datasets: [{
                data: values,
                borderColor: "#fbbf24",
                backgroundColor: "rgba(251,191,36,0.15)",
                tension: 0.3,
                spanGaps: true
            }]
        },
        options: {
            plugins: { legend: { display: false } },
            scales: { y: { min: 0, max: 10, ticks: { stepSize: 1 } } }
        }
    });
}

function renderSubjectChart() {
    const canvas = document.getElementById("subjectChart");
    if (!canvas) return;

    const counts = {};
    studySessions.forEach(s => {
        counts[s.subject] = (counts[s.subject] || 0) + 1;
    });

    if (window.subjectChartInstance) {
        window.subjectChartInstance.destroy();
    }

    window.subjectChartInstance = new Chart(canvas, {
        type: "pie",
        data: {
            labels: Object.keys(counts),
            datasets: [{
                data: Object.values(counts),
                backgroundColor: [
                    "#6d6af8",
                    "#22c55e",
                    "#fbbf24",
                    "#ef4444",
                    "#38bdf8",
                    "#a855f7"
                ]
            }]
        },
        options: {
            plugins: { legend: { position: "bottom" } }
        }
    });
}

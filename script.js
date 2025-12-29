/************************************************************
 * IMPORTS
 ************************************************************/

import { auth, db } from "./firebase.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
    collection,
    getDocs,
    addDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/************************************************************
 * GLOBAL STATE
 ************************************************************/

let studySessions = [];
const loadingOverlay = document.getElementById("loading-overlay");

function showToast(message) {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = "toast success";
    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add("removing");
        setTimeout(() => toast.remove(), 250);
    }, 2000);
}

/************************************************************
 * AUTH GUARD + INITIAL LOAD
 ************************************************************/

onAuthStateChanged(auth, async user => {
    if (!user) {
        window.location.href = "login.html";
        return;
    }

    await loadStudySessions(user.uid);

    // Always render history if present
    renderStudySessions();

    // Dashboard-only renders (safe guards already exist)
    renderStreak();
    renderActiveRecall();
    renderTodaysFocus();
    renderStudyChart();
    renderDifficultyChart();
    renderSubjectChart();
    renderExamCountdown();

    if (loadingOverlay) {
        loadingOverlay.style.display = "none";
    }
});

/************************************************************
 * FIRESTORE READ
 ************************************************************/

async function loadStudySessions(uid) {
    studySessions = [];

    const ref = collection(db, "users", uid, "studySessions");
    const snap = await getDocs(ref);

    snap.forEach(doc => {
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
 * SAVE STUDY SESSION (FIRESTORE WRITE)
 ************************************************************/

if (form) {
    form.addEventListener("submit", async e => {
        e.preventDefault();

        const saveBtn = form.querySelector("button[type='submit']");
        saveBtn.disabled = true;
        saveBtn.textContent = "Saving...";

        const user = auth.currentUser;
        if (!user) return;

        const session = {
            subject: subject.value.trim(),
            chapter: chapter.value.trim(),
            difficulty: Number(difficulty.value),
            date: dateInput.value,
            createdAt: serverTimestamp()
        };

        await addDoc(
            collection(db, "users", user.uid, "studySessions"),
            session
        );

        studySessions.push(session);
        showToast("Study session saved");

        renderStudySessions();
        renderStreak();
        renderActiveRecall();
        renderTodaysFocus();
        renderStudyChart();
        renderDifficultyChart();
        renderSubjectChart();

        form.reset();
        saveBtn.disabled = false;
        saveBtn.textContent = "Save Session";
        dateInput.value = new Date().toISOString().split("T")[0];
    });
}

/************************************************************
 * STUDY HISTORY
 ************************************************************/

function renderStudySessions() {
    if (!studyList) return;

    studyList.innerHTML = "";

    if (studySessions.length === 0) {
        studyList.innerHTML = `
            <tr>
                <td colspan="4" class="empty-state">
                    No study sessions yet.<br>
                    Start by logging your first session.
                </td>
            </tr>
        `;
        return;
    }

    studySessions.forEach(s => {
        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${s.subject}</td>
            <td>${s.chapter}</td>
            <td>
                <span class="difficulty-pill">
                    ${s.difficulty}
                </span>
            </td>
            <td>${s.date}</td>
        `;

        studyList.appendChild(tr);
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
    let hasRecalls = false;

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

        hasRecalls = true;

        const li = document.createElement("li");
        li.className = "notification";

        let color = diff >= 20 ? "red" : diff >= 14 ? "yellow" : "green";

        li.innerHTML = `
            <div class="dot ${color}"></div>
            <div class="recall-text">
                ${s.subject} – ${s.chapter}<br>
                <span class="muted">${diff} days ago</span>
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
                showToast("Recall completed");
            }, 300);
        };

        list.appendChild(li);
    });

    if (!hasRecalls) {
        list.innerHTML = `
            <li class="empty-state">
                No recalls due 🎉<br>
                You’re on track.
            </li>
        `;
    }
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
 * EXAM COUNTDOWN
 ************************************************************/

function renderExamCountdown() {
    if (!examCountdown) return;

    const saved = localStorage.getItem("examDate");
    if (!saved) {
        examCountdown.innerHTML =
            `<span class="muted">No exam date set</span>`;
        return;
    }

    const diff =
        Math.ceil((new Date(saved) - new Date()) / 86400000);

    examCountdown.textContent =
        diff === 0 ? "Exam is today 🚨" : `${diff} days remaining`;
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

        counts.push(
            studySessions.filter(s => {
                const sd = new Date(s.date);
                sd.setHours(0,0,0,0);
                return sd.getTime() === d.getTime();
            }).length
        );
    }

    if (window.studyChartInstance)
        window.studyChartInstance.destroy();

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

        values.push(
            sessions.length
                ? (sessions.reduce((a, s) => a + s.difficulty, 0) / sessions.length).toFixed(1)
                : null
        );
    }

    if (window.difficultyChartInstance)
        window.difficultyChartInstance.destroy();

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
            scales: { y: { min: 0, max: 10 } }
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

    if (window.subjectChartInstance)
        window.subjectChartInstance.destroy();

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

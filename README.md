# Smart Study Planner

A full-stack web application that helps students plan studies intelligently using
active recall, streak tracking, and visual analytics.

The app supports real user accounts, cloud-synced data, and an interactive dashboard
to monitor study habits over time.

---

## Features

- User authentication (sign up / login / logout)
- Log study sessions with subject, chapter, difficulty, and date
- Automatic active recall reminders (10-day intervals)
- Study streak tracking
- Exam countdown timer
- Interactive analytics dashboard:
  - Study frequency (last 7 days)
  - Difficulty trend over time
  - Subject-wise distribution
- Study history page
- Cloud-synced data across devices

---

## Tech Stack

**Frontend**
- HTML5
- CSS3 (dark theme)
- Vanilla JavaScript (ES Modules)
- Chart.js for visualizations

**Backend / Cloud**
- Firebase Authentication
- Firebase Firestore (NoSQL database)
- Firebase Hosting

**Tooling**
- Git & GitHub
- Firebase CLI

---

## Project Structure

.
├── index.html # Main dashboard
├── login.html # Login page
├── signup.html # Signup page
├── history.html # Study history
├── script.js # Core app logic
├── auth.js # Authentication logic
├── firebase.js # Firebase configuration
├── style.css # Global styles
└── README.md

yaml
Copy code

---

## How It Works

- Users authenticate using Firebase Auth
- Each user gets a unique UID
- Study data is stored per user in Firestore
- Dashboard renders analytics based on cloud data
- All data persists across refreshes and devices

---

## Live Demo

👉 [https://smart-study-planner-1ce05.web.app]

---

## Getting Started (Local)

1. Clone the repository
   ```bash
   git clone https://github.com/arvi2k7/smart-study-planner.git

2. Open the project folder

    cd smart-study-planner


3. Start a local server (Live Server recommended)

4. Create a Firebase project and add your config to firebase.js

Future Improvements

Email reminders for active recall

Mobile-first layout

Offline support

Export study data

Collaborative study groups

Author

Built by Arvind

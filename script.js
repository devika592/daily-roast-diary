const roasts = [
    "Wow, groundbreaking stuff.",
    "Truly, a Shakespeare in the making.",
    "My fridge magnet has more personality.",
    "Did a potato write this?",
    "This will go down in history... as useless."
];

function speak(text) {
    const utterance = new SpeechSynthesisUtterance(text);
    speechSynthesis.speak(utterance);
}

function saveEntry() {
    let entry = document.getElementById("entry").value.trim();
    let wordCount = entry.split(/\s+/).filter(word => word).length;

    if (wordCount > 20) {
        speak("That's enough for today");
        alert("That's enough for today!");
        return;
    }

    let roast = roasts[Math.floor(Math.random() * roasts.length)];
    let entries = JSON.parse(localStorage.getItem("entries") || "[]");

    let today = new Date().toLocaleDateString();
    entries.push({ date: today, text: entry, roast: roast });
    localStorage.setItem("entries", JSON.stringify(entries));

    document.getElementById("roast").innerText = roast;
    speak(roast);
}

function eraseToday() {
    let today = new Date().toLocaleDateString();
    let entries = JSON.parse(localStorage.getItem("entries") || "[]");
    entries = entries.filter(e => e.date !== today);
    localStorage.setItem("entries", JSON.stringify(entries));
    alert("Today's entry erased.");
}

function setReminder() {
    let time = document.getElementById("reminderTime").value;
    if (!time) {
        alert("Please select a time.");
        return;
    }
    localStorage.setItem("reminderTime", time);
    document.getElementById("reminderStatus").innerText = "Reminder set for " + time;
}

function deleteHistory() {
    if (confirm("Are you sure you want to delete all history?")) {
        localStorage.removeItem("entries");
        alert("All history deleted.");
    }
}

function openTab(tabName) {
    document.querySelectorAll(".tab-content").forEach(tab => tab.style.display = "none");
    document.getElementById(tabName).style.display = "block";
}

// Reminder notifications
setInterval(() => {
    let reminderTime = localStorage.getItem("reminderTime");
    if (reminderTime) {
        let now = new Date();
        let currentTime = now.toTimeString().slice(0,5);
        if (currentTime === reminderTime) {
            if (Notification.permission === "granted") {
                new Notification("Hey, ready for your daily roast?");
            } else if (Notification.permission !== "denied") {
                Notification.requestPermission().then(permission => {
                    if (permission === "granted") {
                        new Notification("Hey, ready for your daily roast?");
                    }
                });
            }
        }
    }
}, 60000);
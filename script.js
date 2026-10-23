const navToggle = document.getElementById("navToggle");
const navLinks = document.getElementById("navLinks");
const themeButton = document.getElementById("themeToggle");
const sections = document.querySelectorAll("main section[id]");
const navAnchors = navLinks ? navLinks.querySelectorAll("a") : [];

function setTheme(theme) {
    const next = theme === "light" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("portfolio-theme", next);
    if (themeButton) {
        themeButton.setAttribute(
            "aria-label",
            next === "dark" ? "Switch to light theme" : "Switch to dark theme"
        );
    }
}

if (themeButton) {
    themeButton.addEventListener("click", function () {
        const current = document.documentElement.getAttribute("data-theme");
        setTheme(current === "dark" ? "light" : "dark");
    });
}

if (navToggle && navLinks) {
    navToggle.addEventListener("click", function () {
        const open = navLinks.classList.toggle("is-open");
        navToggle.setAttribute("aria-expanded", open ? "true" : "false");
        navToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    });

    navAnchors.forEach(function (link) {
        link.addEventListener("click", function () {
            navLinks.classList.remove("is-open");
            navToggle.setAttribute("aria-expanded", "false");
            navToggle.setAttribute("aria-label", "Open menu");
        });
    });
}

if ("IntersectionObserver" in window && sections.length && navAnchors.length) {
    const observer = new IntersectionObserver(
        function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) {
                    return;
                }
                const id = entry.target.id;
                navAnchors.forEach(function (link) {
                    const active = link.getAttribute("href") === "#" + id;
                    link.classList.toggle("is-active", active);
                });
            });
        },
        {
            rootMargin: "-40% 0px -50% 0px",
            threshold: 0.1
        }
    );

    sections.forEach(function (section) {
        if (section.id === "weather") {
            return;
        }
        observer.observe(section);
    });
}

const projectCards = document.querySelectorAll(".project-card");
const projectSearch = document.getElementById("projectSearch");
const filterChips = document.querySelectorAll(".filter-chip");
const projectEmpty = document.getElementById("projectEmpty");
let activeFilter = "all";

function filterProjects() {
    const query = projectSearch ? projectSearch.value.trim().toLowerCase() : "";
    let visible = 0;

    projectCards.forEach(function (card) {
        const name = (card.getAttribute("data-name") || "").toLowerCase();
        const tech = (card.getAttribute("data-tech") || "").toLowerCase();
        const matchesQuery = !query || name.includes(query);
        const matchesFilter = activeFilter === "all" || tech.split(/\s+/).includes(activeFilter);
        const show = matchesQuery && matchesFilter;
        card.hidden = !show;
        card.classList.toggle("is-hidden", !show);
        if (show) {
            visible += 1;
        }
    });

    if (projectEmpty) {
        projectEmpty.hidden = visible !== 0;
    }
}

if (projectSearch) {
    projectSearch.addEventListener("input", filterProjects);
}

filterChips.forEach(function (chip) {
    chip.addEventListener("click", function () {
        activeFilter = chip.getAttribute("data-filter") || "all";
        filterChips.forEach(function (item) {
            item.classList.toggle("is-active", item === chip);
        });
        filterProjects();
    });
});

const cityInput = document.getElementById("cityInput");
const weatherForm = document.getElementById("weatherForm");
const weatherResult = document.getElementById("weatherResult");

async function getWeather(event) {
    if (event) {
        event.preventDefault();
    }

    const city = cityInput.value.trim();

    if (!city) {
        weatherResult.textContent = "Please enter a city.";
        return;
    }

    weatherResult.textContent = "Loading weather...";

    try {
        const response = await fetch("/api/weather?q=" + encodeURIComponent(city));
        let data = {};
        try {
            data = await response.json();
        } catch (parseError) {
            data = {};
        }

        if (!response.ok) {
            weatherResult.textContent =
                typeof data.error === "string" && data.error.trim()
                    ? data.error
                    : "Unable to fetch weather. Please try again.";
            return;
        }

        weatherResult.replaceChildren();
        const heading = document.createElement("h3");
        heading.textContent = data.name;
        const temp = document.createElement("p");
        temp.textContent = "Temperature: " + data.temp + "°C";
        const condition = document.createElement("p");
        condition.textContent = "Condition: " + data.condition;
        weatherResult.append(heading, temp, condition);
    } catch (error) {
        weatherResult.textContent = "Unable to fetch weather. Please try again.";
        console.error(error);
    }
}

if (weatherForm) {
    weatherForm.addEventListener("submit", getWeather);
}

const MAX_CHAT_HISTORY = 10;
const MAX_CHAT_LENGTH = 500;
const chatToggle = document.getElementById("chatToggle");
const chatPanel = document.getElementById("chatPanel");
const chatClose = document.getElementById("chatClose");
const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");
const chatSend = document.getElementById("chatSend");
const chatMessages = document.getElementById("chatMessages");
const chatSuggestions = document.getElementById("chatSuggestions");
const conversation = [];
let chatBusy = false;

function isChatOpen() {
    return !chatPanel.hidden;
}

function openChat() {
    chatPanel.hidden = false;
    chatToggle.setAttribute("aria-expanded", "true");
    chatToggle.setAttribute("aria-label", "Close portfolio chat");
    chatInput.focus();
}

function closeChat() {
    chatPanel.hidden = true;
    chatToggle.setAttribute("aria-expanded", "false");
    chatToggle.setAttribute("aria-label", "Open portfolio chat");
    chatToggle.focus();
}

function appendChatMessage(role, text, extraClass) {
    const message = document.createElement("p");
    const classes = ["chat-message", "chat-message--" + role];
    if (extraClass) {
        classes.push(extraClass);
    }
    message.className = classes.join(" ");
    if (extraClass === "chat-message--loading") {
        message.setAttribute("aria-label", "Thinking");
        message.innerHTML = "<span></span><span></span><span></span>";
    } else {
        message.textContent = text;
    }
    chatMessages.appendChild(message);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return message;
}

function setChatBusy(isBusy) {
    chatBusy = isBusy;
    chatInput.disabled = isBusy;
    chatSend.disabled = isBusy;
}

async function sendChatMessage(text) {
    if (chatBusy) {
        return;
    }

    if (!text) {
        appendChatMessage(
            "assistant",
            "Please enter a question about this portfolio.",
            "chat-message--error"
        );
        return;
    }

    if (text.length > MAX_CHAT_LENGTH) {
        appendChatMessage(
            "assistant",
            "Please keep questions under 500 characters.",
            "chat-message--error"
        );
        return;
    }

    appendChatMessage("user", text);
    conversation.push({ role: "user", text: text });
    if (conversation.length > MAX_CHAT_HISTORY) {
        conversation.splice(0, conversation.length - MAX_CHAT_HISTORY);
    }

    setChatBusy(true);
    const loadingMessage = appendChatMessage(
        "assistant",
        "Thinking…",
        "chat-message--loading"
    );

    try {
        const response = await fetch("/api/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ messages: conversation })
        });

        let data = {};
        try {
            data = await response.json();
        } catch (parseError) {
            data = {};
        }

        loadingMessage.remove();

        if (!response.ok || typeof data.reply !== "string" || !data.reply.trim()) {
            const errorText =
                typeof data.error === "string" && data.error.trim()
                    ? data.error
                    : "Couldn’t reach the assistant. Try again.";
            appendChatMessage("assistant", errorText, "chat-message--error");
            return;
        }

        const reply = data.reply.trim();
        appendChatMessage("assistant", reply);
        conversation.push({ role: "assistant", text: reply });
        if (conversation.length > MAX_CHAT_HISTORY) {
            conversation.splice(0, conversation.length - MAX_CHAT_HISTORY);
        }
    } catch (error) {
        loadingMessage.remove();
        appendChatMessage(
            "assistant",
            "Couldn’t reach the assistant. Try again.",
            "chat-message--error"
        );
        console.error(error);
    } finally {
        setChatBusy(false);
        chatInput.focus();
    }
}

chatToggle.addEventListener("click", function () {
    if (isChatOpen()) {
        closeChat();
    } else {
        openChat();
    }
});

chatClose.addEventListener("click", closeChat);

document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && isChatOpen()) {
        closeChat();
    }
});

chatForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    const text = chatInput.value.trim();
    chatInput.value = "";
    await sendChatMessage(text);
});

if (chatSuggestions) {
    chatSuggestions.addEventListener("click", async function (event) {
        const button = event.target.closest("button[data-question]");
        if (!button) {
            return;
        }
        const question = button.getAttribute("data-question") || "";
        openChat();
        await sendChatMessage(question);
    });
}

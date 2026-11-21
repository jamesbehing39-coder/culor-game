const colors = [
    { name: "YELLOW", hex: "#f5b82e", symbol: "●" },
    { name: "WHITE", hex: "#e2e8f0", symbol: "●" },
    { name: "PINK", hex: "#e84393", symbol: "●" },
    { name: "BLUE", hex: "#1e88e5", symbol: "●" },
    { name: "RED", hex: "#e53935", symbol: "●" },
    { name: "GREEN", hex: "#43a047", symbol: "●" }
];

// Energy dice elements (the article.energy-dice wrappers)
const diceWrappers = [
    document.getElementById("rollTile1"),
    document.getElementById("rollTile2"),
    document.getElementById("rollTile3")
];

const rollButton = document.getElementById("rollButton");
const resultText = document.getElementById("resultText");
const statusText = document.getElementById("status");
const roundNumberDisplay = document.getElementById("roundNumber");
const historyContainer = document.getElementById("history");
const clearHistoryButton = document.getElementById("clearHistory");

// Live balance element
const liveBalanceAmount = document.getElementById("liveBalanceAmount");
const liveBalanceEl = document.getElementById("liveBalance");

// Color betting tiles
const colorTiles = document.querySelectorAll(".energy-tile");
const selectedColorText = document.getElementById("selectedColor");

let roundNumber = Number(localStorage.getItem("colorRounds")) || 0;
let isRolling = false;
let selectedColor = null;
let balance = Number(localStorage.getItem("casinoBalance")) || 10000;
let currentBet = 0;
let betPlaced = false;

let historyData = JSON.parse(
    localStorage.getItem("colorHistory") || "[]"
);

// NEW RULES: Twice/Thrice Color Multiplier
// 1 match = 2x win (bet * 2)
// 2 of 3 tiles match (same color twice) = 4x win (bet * 4)
// 3 of 3 tiles match (same color thrice) = 6x win (bet * 6)
// 0 matches = loss
const payoutMultipliers = {
    1: 2,   // Once = 2x win
    2: 4,   // Twice = 4x win
    3: 6    // Thrice = 6x win
};

// BETTING SYSTEM
const coinBalance = document.getElementById("coinBalance");
const betAmountInput = document.getElementById("betAmount");
const addFundsButton = document.getElementById("addFunds");
const allInButton = document.getElementById("allInBtn");
const halfBetButton = document.getElementById("halfBetBtn");
const betStatus = document.getElementById("betStatus");

function updateBalanceDisplay() {
    if (coinBalance) {
        coinBalance.textContent = balance.toLocaleString();
    }
    if (betAmountInput) {
        betAmountInput.max = balance;
    }
    // Update live balance display
    if (liveBalanceAmount) {
        liveBalanceAmount.textContent = balance.toLocaleString();
    }
    if (liveBalanceEl) {
        liveBalanceEl.classList.remove("updated");
        // Force reflow for animation
        liveBalanceEl.offsetWidth;
        liveBalanceEl.classList.add("updated");
    }
    // Update HALF button
    if (halfBetButton) {
        halfBetButton.disabled = balance < 20 || isRolling; // Need at least 20 for half to be >= 10
    }
    // Update ALL IN button
    if (allInButton) {
        allInButton.disabled = balance < 10 || isRolling;
    }
}

updateBalanceDisplay();

// HALF BET BUTTON
halfBetButton.addEventListener("click", () => {
    if (isRolling) return;
    if (balance < 20) {
        betStatus.textContent = "Insufficient balance for HALF bet";
        betStatus.className = "bet-status lost";
        return;
    }
    betAmountInput.value = Math.floor(balance / 2);
});

// ALL IN BUTTON
allInButton.addEventListener("click", () => {
    if (isRolling) return;
    if (balance < 10) {
        betStatus.textContent = "Insufficient balance for ALL IN";
        betStatus.className = "bet-status lost";
        return;
    }
    betAmountInput.value = balance;
});

// ADD FUNDS - 2M COINS
addFundsButton.addEventListener("click", () => {
    balance += 2000000;
    localStorage.setItem("casinoBalance", balance);
    updateBalanceDisplay();
    betStatus.textContent = "Added 2,000,000 coins!";
    betStatus.className = "bet-status won";
    setTimeout(() => {
        betStatus.textContent = "Enter bet amount and roll to play";
        betStatus.className = "bet-status";
    }, 2000);
});

// COLOR SELECTION - 3x2 GRID
colorTiles.forEach(tile => {
    tile.addEventListener("click", () => {
        if (isRolling) return;

        colorTiles.forEach(t => {
            t.classList.remove("selected");
        });

        tile.classList.add("selected");

        selectedColor = tile.dataset.color;

        selectedColorText.textContent = `Selected: ${selectedColor}`;

        if (balance > 0) {
            betStatus.textContent = "Enter bet amount and roll to play";
            betStatus.className = "bet-status";
        }
    });
});

// DISPLAY COLOR ON ENERGY DICE — sets data-color for CSS attribute styling
function displayColor(diceWrapper, color) {
    diceWrapper.dataset.color = color.name;
    diceWrapper.dataset.face = color.symbol;
    // Pip visibility and colors are handled by CSS [data-color] selectors
}

// RANDOM COLOR
function randomColor() {
    return colors[Math.floor(Math.random() * colors.length)];
}

// ANIMATION — 3D Dice Tumble on energy dice wrappers
function animateTile(diceWrapper, finalColor, duration) {
    return new Promise(resolve => {
        diceWrapper.classList.add("rolling");

        const interval = setInterval(() => {
            displayColor(diceWrapper, randomColor());
        }, 70);

        setTimeout(() => {
            clearInterval(interval);
            displayColor(diceWrapper, finalColor);
            diceWrapper.classList.remove("rolling");
            diceWrapper.classList.add("landing");
            setTimeout(() => diceWrapper.classList.remove("landing"), 600);
            resolve();
        }, duration);
    });
}

// ROLL GAME — Twice/Thrice Color Multiplier Rules
async function rollColors() {
    if (isRolling) return;

    if (!selectedColor) {
        statusText.textContent = "Please select a color first.";
        return;
    }

    // Auto-place bet if not already placed
    if (!betPlaced) {
        // Default to 100 or max affordable if input is empty/invalid
        let betAmount = parseInt(betAmountInput.value);
        if (isNaN(betAmount) || betAmount < 10) {
            betAmount = Math.min(100, balance);
            betAmountInput.value = betAmount;
        }
        
        if (betAmount > balance) {
            statusText.textContent = "Insufficient balance";
            betStatus.textContent = "Insufficient balance";
            betStatus.className = "bet-status lost";
            return;
        }
        
        // Auto-place the bet
        currentBet = betAmount;
        betPlaced = true;
        balance -= currentBet;
        localStorage.setItem("casinoBalance", balance);
        updateBalanceDisplay();
        
        betAmountInput.disabled = true;
        
        // Update selected tile with bet badge
        colorTiles.forEach(tile => {
            if (tile.dataset.color === selectedColor) {
                tile.classList.add("has-bet");
                tile.querySelector(".tile-bet-badge").textContent = currentBet.toLocaleString();
            }
        });
        
        betStatus.textContent = `Auto-bet placed: ${currentBet.toLocaleString()} coins on ${selectedColor}`;
        betStatus.className = "bet-status active";
    }

    if (balance < 0) {
        statusText.textContent = "Insufficient balance. Add funds to continue.";
        return;
    }

    isRolling = true;
    rollButton.disabled = true;
    rollButton.querySelector(".btn-text").hidden = true;
    rollButton.querySelector(".btn-loader").hidden = false;
    betAmountInput.disabled = true;
    halfBetButton.disabled = true;
    allInButton.disabled = true;

    // Trigger dice row glow
    document.querySelector(".dice-row").classList.add("rolling");

    roundNumber++;
    localStorage.setItem("colorRounds", roundNumber);
    roundNumberDisplay.textContent = roundNumber;

    resultText.textContent = "VOID UNLEASHED...";
    resultText.style.color = "#ff1744";

    statusText.textContent = "Energy dice descending...";

    const results = [
        randomColor(),
        randomColor(),
        randomColor()
    ];

    await Promise.all([
        animateTile(diceWrappers[0], results[0], 1800),
        animateTile(diceWrappers[1], results[1], 2400),
        animateTile(diceWrappers[2], results[2], 3000)
    ]);

    // Remove dice row rolling state
    document.querySelector(".dice-row").classList.remove("rolling");

    const resultNames = results.map(color => color.name);
    resultText.textContent = resultNames.join(" • ");
    resultText.style.color = "#ff1744";

    // Count matches for selected color
    const matchCount = results.filter(color => color.name === selectedColor).length;

    let winnings = 0;
    let resultMessage = "";
    let statusMessage = "";
    
    if (matchCount >= 1) {
        const multiplier = payoutMultipliers[matchCount];
        winnings = Number(currentBet) * Number(multiplier);
        balance = Number(balance) + Number(winnings);
        localStorage.setItem("casinoBalance", balance);
        updateBalanceDisplay();
        
        let matchText, payoutText;
        if (matchCount === 1) {
            matchText = "ONCE";
            payoutText = "2x";
        } else if (matchCount === 2) {
            matchText = "TWICE";
            payoutText = "4x";
        } else {
            matchText = "THRICE";
            payoutText = "6x";
        }
        
        statusMessage = `WIN! ${matchText} (${payoutText}) — ${winnings.toLocaleString()} coins!`;
        statusText.textContent = statusMessage;
        statusText.style.color = "#e040fb";
        
        betStatus.textContent = `WON ${winnings.toLocaleString()} coins! (${matchText}: ${payoutText})`;
        betStatus.className = "bet-status won";
        resultMessage = `WIN (${matchText})`;
    } else {
        statusMessage = `LOSS. No matches. Lost ${currentBet.toLocaleString()} coins.`;
        statusText.textContent = statusMessage;
        statusText.style.color = "#ff1744";
        
        betStatus.textContent = `LOST ${currentBet.toLocaleString()} coins.`;
        betStatus.className = "bet-status lost";
        resultMessage = "LOSS";
    }

    saveHistory(results, selectedColor, matchCount, currentBet, winnings, resultMessage);
    renderHistory();

    // Reset bet state
    betPlaced = false;
    currentBet = 0;
    betAmountInput.disabled = false;
    halfBetButton.disabled = balance < 20;
    allInButton.disabled = balance < 10;
    betAmountInput.value = Math.min(100, balance);
    betAmountInput.max = balance;
    
    // Clear bet badges
    colorTiles.forEach(tile => {
        tile.classList.remove("has-bet");
        const badge = tile.querySelector(".tile-bet-badge");
        if (badge) badge.textContent = "";
    });
    
    if (balance <= 0) {
        betStatus.textContent = "Balance depleted! Add funds to continue.";
        betStatus.className = "bet-status lost";
        betAmountInput.disabled = true;
    } else {
        betStatus.textContent = "Enter bet amount and roll to play";
        betStatus.className = "bet-status";
    }
    
    rollButton.disabled = false;
    rollButton.querySelector(".btn-text").hidden = false;
    rollButton.querySelector(".btn-loader").hidden = true;
    isRolling = false;
}

// HISTORY
function saveHistory(results, prediction, matchCount, betAmount, winnings, resultMessage) {
    const entry = {
        round: roundNumber,
        colors: results.map(color => color.name),
        hex: results.map(color => color.hex),
        prediction: prediction,
        matches: matchCount,
        bet: betAmount,
        winnings: winnings,
        result: resultMessage
    };

    historyData.unshift(entry);
    historyData = historyData.slice(0, 50);
    localStorage.setItem("colorHistory", JSON.stringify(historyData));
}

function renderHistory() {
    if (historyData.length === 0) {
        historyContainer.innerHTML = '<p class="empty-history">No void cycles recorded.</p>';
        return;
    }

    historyContainer.innerHTML = "";

    historyData.forEach(entry => {
        const item = document.createElement("div");
        item.className = "history-item";

        const roundLabel = document.createElement("span");
        roundLabel.className = "history-round";
        roundLabel.textContent = "CYCLE " + entry.round;

        const colorContainer = document.createElement("div");
        colorContainer.className = "history-colors";

        entry.hex.forEach((hex, index) => {
            const dot = document.createElement("span");
            dot.className = "history-dot";
            dot.style.backgroundColor = hex;
            dot.title = entry.colors[index];
            colorContainer.appendChild(dot);
        });

        // Prediction indicator
        const predDot = document.createElement("span");
        predDot.className = "history-dot prediction-dot";
        const predColor = colors.find(c => c.name === entry.prediction);
        if (predColor) {
            predDot.style.backgroundColor = predColor.hex;
            predDot.title = `Your pick: ${entry.prediction} (${entry.matches} match${entry.matches !== 1 ? 'es' : ''})`;
            predDot.style.border = "2px solid #e040fb";
        }
        colorContainer.appendChild(predDot);

        item.appendChild(roundLabel);
        item.appendChild(colorContainer);

        // Bet/Win info
        if (entry.bet !== undefined) {
            const betInfo = document.createElement("div");
            betInfo.className = "history-bet-info";
            if (entry.result.startsWith("WIN")) {
                const matchText = entry.matches === 1 ? "1 Match" : `${entry.matches} Matches`;
                betInfo.innerHTML = `<span class="win-amount">+${entry.winnings.toLocaleString()}</span> <span class="bet-amount">(${matchText}, bet: ${entry.bet.toLocaleString()})</span>`;
                betInfo.style.color = "#e040fb";
            } else {
                betInfo.innerHTML = `<span class="loss-amount">-${entry.bet.toLocaleString()}</span>`;
                betInfo.style.color = "#ff1744";
            }
            item.appendChild(betInfo);
        }

        historyContainer.appendChild(item);
    });
}

// CLEAR HISTORY
clearHistoryButton.addEventListener("click", () => {
    historyData = [];
    localStorage.removeItem("colorHistory");
    renderHistory();
});

// ROLL BUTTON
rollButton.addEventListener("click", rollColors);

// EMBER PARTICLES GENERATION
function createEmberParticles() {
    const container = document.getElementById("emberParticles");
    if (!container) return;
    
    for (let i = 0; i < 25; i++) {
        const particle = document.createElement("div");
        particle.className = "ember-particle";
        particle.style.left = Math.random() * 100 + "%";
        particle.style.animationDelay = Math.random() * 8 + "s";
        particle.style.animationDuration = (6 + Math.random() * 4) + "s";
        particle.style.width = particle.style.height = (2 + Math.random() * 3) + "px";
        particle.style.opacity = 0.3 + Math.random() * 0.5;
        container.appendChild(particle);
    }
}

createEmberParticles();

// INITIAL LOAD
roundNumberDisplay.textContent = roundNumber;
betAmountInput.value = Math.min(100, balance);
betAmountInput.max = balance;

renderHistory();
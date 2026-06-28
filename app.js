/**
 * Premium Precision Time Suite - Core Application
 * SkillCraft Technology
 */

// ==========================================================================
// Application State
// ==========================================================================
let appMode = 'stopwatch'; // 'stopwatch' or 'timer'
let isRunning = false;

// Timing metrics
let startTime = 0;
let elapsedTime = 0; // for stopwatch
let initialTimerDuration = 0; // for countdown timer (ms)
let remainingTime = 0; // for countdown timer (ms)

let animationFrameId = null;

// Laps database
let laps = []; // array of { number, time, duration }

// Audio Synth Config
let audioCtx = null;
let isSoundMuted = false;
let currentTheme = 'cyan';
let isDarkMode = true;

// Alarm ring indicator
let isAlarmRinging = false;
let alarmIntervalId = null;

// Session History Database
let sessionHistory = [];

// Achievement Badges State
let unlockedAchievements = {
  'first-lap': false,
  'speed-demon': false,
  'steady-run': false,
  'endurance': false
};

// ==========================================================================
// DOM Element Selectors
// ==========================================================================
const hoursEl = document.getElementById('display-hours');
const minutesEl = document.getElementById('display-minutes');
const secondsEl = document.getElementById('display-seconds');
const millisEl = document.getElementById('display-millis');
const progressIndicator = document.getElementById('progress-indicator');
const currentLapPreview = document.getElementById('current-lap-preview');
const timerModeTag = document.getElementById('timer-mode-tag');

// Buttons
const startBtn = document.getElementById('start-btn');
const lapBtn = document.getElementById('lap-btn');
const lapBtnText = document.getElementById('lap-btn-text');
const resetBtn = document.getElementById('reset-btn');
const themeToggleBtn = document.getElementById('theme-toggle');
const soundToggleBtn = document.getElementById('sound-toggle');
const soundOnIcon = soundToggleBtn.querySelector('.sound-on-icon');
const soundOffIcon = soundToggleBtn.querySelector('.sound-off-icon');

// Countdown Duration Pickers (Chevrons)
const adjustBtns = document.querySelectorAll('.adjust-time-btn');
const adjHrsUp = document.getElementById('adj-hours-up');
const adjHrsDown = document.getElementById('adj-hours-down');
const adjMinsUp = document.getElementById('adj-mins-up');
const adjMinsDown = document.getElementById('adj-mins-down');
const adjSecsUp = document.getElementById('adj-secs-up');
const adjSecsDown = document.getElementById('adj-secs-down');

// Mode selectors
const modeStopwatchBtn = document.getElementById('mode-stopwatch');
const modeTimerBtn = document.getElementById('mode-timer');

// Tabs
const tabLinks = document.querySelectorAll('.tab-link');
const tabPanes = document.querySelectorAll('.tab-pane');

// Laps Panel
const lapsCountTag = document.getElementById('lap-count-tag');
const lapsEmptyState = document.getElementById('laps-empty');
const lapsTable = document.getElementById('laps-table');
const lapsListBody = document.getElementById('laps-list-body');
const lapsExportPanel = document.getElementById('laps-export-panel');
const btnExportCSV = document.getElementById('btn-export-csv');
const btnPrintReport = document.getElementById('btn-print-report');

// Stats Pane
const statBestLap = document.getElementById('stat-best-lap');
const statWorstLap = document.getElementById('stat-worst-lap');
const statAvgLap = document.getElementById('stat-avg-lap');
const statTotalDuration = document.getElementById('stat-total-duration');
const svgGraphContainer = document.getElementById('svg-graph-container');
const graphEmptyOverlay = document.getElementById('graph-empty-overlay');

// History Pane
const historyListContainer = document.getElementById('history-list-container');
const btnClearHistory = document.getElementById('btn-clear-history');

// Insights Pane
const aiInsightText = document.getElementById('ai-insight-text');

// Alarm & Toast Panels
const alarmOverlay = document.getElementById('alarm-overlay');
const dismissAlarmBtn = document.getElementById('dismiss-alarm-btn');
const toastNotification = document.getElementById('toast-notification');
const toastTitle = document.getElementById('toast-title');
const toastMessage = document.getElementById('toast-message');

// Theme Dots
const themeDots = document.querySelectorAll('.theme-dot');

// SVG circumference value (2 * Math.PI * 88 = 552.92)
const SVG_CIRCUMFERENCE = 552.92;

// ==========================================================================
// Web Audio Synthesizer Cues
// ==========================================================================
function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
}

function playSound(type) {
  initAudio();
  if (isSoundMuted || !audioCtx) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();

  const osc = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  osc.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  const now = audioCtx.currentTime;

  switch (type) {
    case 'start':
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now); // A5 note
      osc.frequency.exponentialRampToValueAtTime(1320, now + 0.08);
      gainNode.gain.setValueAtTime(0.12, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.08);
      break;

    case 'pause':
      osc.type = 'sine';
      osc.frequency.setValueAtTime(700, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.1);
      gainNode.gain.setValueAtTime(0.12, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
      break;

    case 'lap':
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(987.77, now); // B5 note
      osc.frequency.setValueAtTime(1318.51, now + 0.05); // E6 note
      gainNode.gain.setValueAtTime(0.15, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
      break;

    case 'reset':
      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.2);
      gainNode.gain.setValueAtTime(0.18, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
      break;

    case 'theme':
      osc.type = 'sine';
      osc.frequency.setValueAtTime(500, now);
      osc.frequency.exponentialRampToValueAtTime(950, now + 0.15);
      gainNode.gain.setValueAtTime(0.06, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.15);
      break;

    case 'achievement':
      // Uplifting arpeggio chime
      osc.type = 'sine';
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const oscNode = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        oscNode.connect(gain);
        gain.connect(audioCtx.destination);
        oscNode.type = 'sine';
        oscNode.frequency.setValueAtTime(freq, now + idx * 0.08);
        gain.gain.setValueAtTime(0.12, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.25);
        oscNode.start(now + idx * 0.08);
        oscNode.stop(now + idx * 0.08 + 0.25);
      });
      break;

    case 'alarm':
      // Periodic alarm buzzer
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(900, now);
      osc.frequency.setValueAtTime(700, now + 0.1);
      gainNode.gain.setValueAtTime(0.15, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.25);
      break;
  }
}

// ==========================================================================
// Formatting & Math Helpers
// ==========================================================================
function padZero(num, size = 2) {
  let s = num + "";
  while (s.length < size) s = "0" + s;
  return s;
}

function formatTime(ms) {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const milliseconds = Math.floor(ms % 1000);
  
  return `${padZero(hours)}:${padZero(minutes)}:${padZero(seconds)}.${padZero(milliseconds, 3)}`;
}

// Parse display time to milliseconds (e.g. for Countdown setup)
function getTimerDurationFromDisplay() {
  const h = parseInt(hoursEl.textContent);
  const m = parseInt(minutesEl.textContent);
  const s = parseInt(secondsEl.textContent);
  return (h * 3600000) + (m * 60000) + (s * 1000);
}

function setDisplayTime(ms) {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const milliseconds = Math.floor(ms % 1000);

  hoursEl.textContent = padZero(hours);
  minutesEl.textContent = padZero(minutes);
  secondsEl.textContent = padZero(seconds);
  millisEl.textContent = padZero(milliseconds, 3);
}

// ==========================================================================
// Core Timing Cycles
// ==========================================================================
function tick() {
  const now = performance.now();

  if (appMode === 'stopwatch') {
    elapsedTime = now - startTime;
    setDisplayTime(elapsedTime);

    // Progress circle sweeps once per minute
    const fraction = (elapsedTime % 60000) / 60000;
    progressIndicator.style.strokeDashoffset = SVG_CIRCUMFERENCE * (1 - fraction);

    // Update Analog Sweeper Needle
    const sweeperHand = document.getElementById('sweeper-hand');
    if (sweeperHand) {
      const angle = fraction * 360;
      sweeperHand.style.transform = `rotate(${angle}deg)`;
    }

    // Live update current lap preview
    const lastLapTime = laps.length > 0 ? laps[laps.length - 1].time : 0;
    const currentLapElapsed = elapsedTime - lastLapTime;
    currentLapPreview.textContent = `Current Lap: ${formatTime(currentLapElapsed)}`;

  } else if (appMode === 'timer') {
    const elapsed = now - startTime;
    remainingTime = initialTimerDuration - elapsed;

    if (remainingTime <= 0) {
      remainingTime = 0;
      setDisplayTime(0);
      progressIndicator.style.strokeDashoffset = SVG_CIRCUMFERENCE;
      
      const sweeperHand = document.getElementById('sweeper-hand');
      if (sweeperHand) {
        sweeperHand.style.transform = 'rotate(0deg)';
      }
      
      triggerAlarm();
      stopTimerCycle();
      return;
    }

    setDisplayTime(remainingTime);

    // Progress circle counts down from full (1) to empty (0)
    const fraction = remainingTime / initialTimerDuration;
    progressIndicator.style.strokeDashoffset = SVG_CIRCUMFERENCE * (1 - fraction);
    
    // Update Analog Sweeper Needle
    const sweeperHand = document.getElementById('sweeper-hand');
    if (sweeperHand) {
      const angle = fraction * 360;
      sweeperHand.style.transform = `rotate(${angle}deg)`;
    }

    currentLapPreview.textContent = `Remaining: ${Math.ceil(remainingTime / 1000)}s`;
  }

  if (isRunning) {
    animationFrameId = requestAnimationFrame(tick);
  }
}

function startTimerCycle() {
  if (isRunning) return;

  if (appMode === 'timer') {
    // Check if a duration is set
    const durationSet = getTimerDurationFromDisplay();
    if (durationSet <= 0) {
      playSound('pause'); // Play warning chirp
      showToast('Set Duration', 'Please adjust the timer chevrons to set a countdown time first.');
      return;
    }
    
    initialTimerDuration = durationSet;
    startTime = performance.now();
    
    // Hide adjusters while running
    toggleAdjusters(false);
  } else {
    startTime = performance.now() - elapsedTime;
  }

  isRunning = true;
  playSound('start');

  // Adjust controls states
  startBtn.querySelector('.play-icon').classList.add('hidden');
  startBtn.querySelector('.pause-icon').classList.remove('hidden');
  startBtn.querySelector('span').textContent = 'Pause';
  lapBtn.disabled = (appMode === 'timer'); // Laps disabled in Countdown Mode
  resetBtn.disabled = true;

  animationFrameId = requestAnimationFrame(tick);
}

function stopTimerCycle() {
  if (!isRunning) return;

  isRunning = false;
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }

  playSound('pause');

  // Update controls states
  startBtn.querySelector('.play-icon').classList.remove('hidden');
  startBtn.querySelector('.pause-icon').classList.add('hidden');
  startBtn.querySelector('span').textContent = 'Resume';
  lapBtn.disabled = true;
  resetBtn.disabled = false;

  if (appMode === 'timer') {
    // Show adjusters again while paused
    toggleAdjusters(true);
    // Keep remaining time as initial duration for resume
    initialTimerDuration = remainingTime;
  }

  saveSessionState();
}

function resetTimerCycle() {
  isRunning = false;
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }

  playSound('reset');

  // Save past run to history database if stopwatch had elapsed time
  if (appMode === 'stopwatch' && elapsedTime > 0) {
    saveSessionToHistory();
  }

  elapsedTime = 0;
  remainingTime = 0;
  initialTimerDuration = 0;

  // Reset clock elements
  setDisplayTime(0);
  progressIndicator.style.strokeDashoffset = SVG_CIRCUMFERENCE;

  // Reset analog needle rotation
  const sweeperHand = document.getElementById('sweeper-hand');
  if (sweeperHand) {
    sweeperHand.style.transform = 'rotate(0deg)';
  }

  startBtn.querySelector('.play-icon').classList.remove('hidden');
  startBtn.querySelector('.pause-icon').classList.add('hidden');
  startBtn.querySelector('span').textContent = 'Start';

  lapBtn.disabled = true;
  resetBtn.disabled = true;

  if (appMode === 'stopwatch') {
    laps = [];
    currentLapPreview.textContent = 'Lap 1: 00:00:00.000';
    renderLaps();
  } else {
    // Show time setters in countdown mode
    toggleAdjusters(true);
    currentLapPreview.textContent = 'Set Countdown Limit';
  }

  // Clear analytics summary fields
  clearAnalyticsDisplay();
  saveSessionState();
}

function toggleStartPause() {
  if (isRunning) {
    stopTimerCycle();
  } else {
    startTimerCycle();
  }
}

// ==========================================================================
// Mode Toggle (Stopwatch vs Countdown Timer)
// ==========================================================================
function switchAppMode(mode) {
  if (appMode === mode) return;

  // Safety: reset before switching
  resetTimerCycle();

  appMode = mode;

  if (mode === 'stopwatch') {
    modeStopwatchBtn.classList.add('active');
    modeTimerBtn.classList.remove('active');
    timerModeTag.textContent = 'STOPWATCH MODE';
    lapBtnText.textContent = 'Lap';
    currentLapPreview.textContent = 'Lap 1: 00:00:00.000';
    
    // Hide picker controls
    toggleAdjusters(false);
  } else {
    modeStopwatchBtn.classList.remove('active');
    modeTimerBtn.classList.add('active');
    timerModeTag.textContent = 'COUNTDOWN TIMER';
    lapBtnText.textContent = 'Split';
    currentLapPreview.textContent = 'Set Countdown Limit';
    
    // Show picker controls
    toggleAdjusters(true);
  }

  playSound('theme');
  saveSessionState();
}

function toggleAdjusters(show) {
  adjustBtns.forEach(btn => {
    if (show) {
      btn.classList.remove('hidden');
    } else {
      btn.classList.add('hidden');
    }
  });
}

function adjustCountdown(unit, amount) {
  let h = parseInt(hoursEl.textContent);
  let m = parseInt(minutesEl.textContent);
  let s = parseInt(secondsEl.textContent);

  if (unit === 'hours') {
    h += amount;
    if (h < 0) h = 99;
    if (h > 99) h = 0;
  } else if (unit === 'mins') {
    m += amount;
    if (m < 0) m = 59;
    if (m > 59) m = 0;
  } else if (unit === 'secs') {
    s += amount;
    if (s < 0) s = 59;
    if (s > 59) s = 0;
  }

  hoursEl.textContent = padZero(h);
  minutesEl.textContent = padZero(m);
  secondsEl.textContent = padZero(s);
  millisEl.textContent = '000';

  initialTimerDuration = getTimerDurationFromDisplay();
  
  // Align analog sweeper hand to starting position (360deg)
  const sweeperHand = document.getElementById('sweeper-hand');
  if (sweeperHand) {
    sweeperHand.style.transform = 'rotate(360deg)';
  }
  
  // Quick click tone
  playSound('theme');
}

// ==========================================================================
// Lap Analytics & Chart Rendering
// ==========================================================================
function recordLap() {
  if (!isRunning || appMode !== 'stopwatch') return;

  const totalTime = elapsedTime;
  const lastLapTime = laps.length > 0 ? laps[laps.length - 1].time : 0;
  const lapDuration = totalTime - lastLapTime;
  const lapNumber = laps.length + 1;

  laps.push({
    number: lapNumber,
    time: totalTime,
    duration: lapDuration
  });

  renderLaps();
  updateAnalytics();
  checkAchievements();
  playSound('lap');
  saveSessionState();
}

function renderLaps() {
  lapsListBody.innerHTML = '';

  if (laps.length === 0) {
    lapsCountTag.textContent = 'No Laps';
    lapsEmptyState.classList.remove('hidden');
    lapsTable.classList.add('hidden');
    lapsExportPanel.classList.add('hidden');
    return;
  }

  lapsCountTag.textContent = `${laps.length} Lap${laps.length > 1 ? 's' : ''}`;
  lapsEmptyState.classList.add('hidden');
  lapsTable.classList.remove('hidden');
  lapsExportPanel.classList.remove('hidden');

  let minDuration = Infinity;
  let maxDuration = -Infinity;

  if (laps.length >= 2) {
    laps.forEach(lap => {
      if (lap.duration < minDuration) minDuration = lap.duration;
      if (lap.duration > maxDuration) maxDuration = lap.duration;
    });
  }

  const reversedLaps = [...laps].reverse();

  reversedLaps.forEach(lap => {
    const tr = document.createElement('tr');
    let highlightClass = '';
    let badgeText = '';

    if (laps.length >= 2 && minDuration !== maxDuration) {
      if (lap.duration === minDuration) {
        highlightClass = 'lap-fastest';
        badgeText = '<span class="lap-highlight-badge">Best</span>';
      } else if (lap.duration === maxDuration) {
        highlightClass = 'lap-slowest';
        badgeText = '<span class="lap-highlight-badge">Worst</span>';
      }
    }

    if (highlightClass) tr.className = highlightClass;

    tr.innerHTML = `
      <td>Lap ${lap.number}${badgeText}</td>
      <td>${formatTime(lap.duration)}</td>
      <td>${formatTime(lap.time)}</td>
    `;

    lapsListBody.appendChild(tr);
  });
}

function clearAnalyticsDisplay() {
  statBestLap.textContent = '--:--.---';
  statWorstLap.textContent = '--:--.---';
  statAvgLap.textContent = '--:--.---';
  statTotalDuration.textContent = '--:--.---';
  
  // Reset graph
  svgGraphContainer.innerHTML = '';
  graphEmptyOverlay.classList.remove('hidden');
  
  aiInsightText.textContent = 'Awaiting session activity. Record split times or run a countdown session to receive performance coaching analysis.';
}

function updateAnalytics() {
  if (laps.length === 0) {
    clearAnalyticsDisplay();
    return;
  }

  // Calculate statistics
  let best = Infinity;
  let worst = -Infinity;
  let sum = 0;

  laps.forEach(lap => {
    if (lap.duration < best) best = lap.duration;
    if (lap.duration > worst) worst = lap.duration;
    sum += lap.duration;
  });

  const avg = sum / laps.length;

  statBestLap.textContent = formatTime(best).substring(3); // Remove hours for cleaner display
  statWorstLap.textContent = formatTime(worst).substring(3);
  statAvgLap.textContent = formatTime(avg).substring(3);
  statTotalDuration.textContent = formatTime(elapsedTime);

  // Redraw line graph
  drawSVGGraph();
  
  // Recalculate AI Performance Insights
  updateAIInsights(best, worst, avg, sum);
}

function drawSVGGraph() {
  svgGraphContainer.innerHTML = '';
  
  if (laps.length < 2) {
    graphEmptyOverlay.classList.remove('hidden');
    return;
  }

  graphEmptyOverlay.classList.add('hidden');

  const containerWidth = svgGraphContainer.clientWidth || 360;
  const containerHeight = svgGraphContainer.clientHeight || 120;
  const paddingX = 25;
  const paddingY = 15;

  const width = containerWidth;
  const height = containerHeight;

  // Extract durations
  const durations = laps.map(l => l.duration / 1000); // convert to seconds
  const minSec = Math.min(...durations);
  const maxSec = Math.max(...durations);
  const diffSec = maxSec - minSec;

  const points = [];
  const spacingX = (width - 2 * paddingX) / (laps.length - 1);

  laps.forEach((lap, idx) => {
    const x = paddingX + idx * spacingX;
    let y;
    if (diffSec === 0) {
      y = height / 2; // flat line in the middle if all laps are identical
    } else {
      const fraction = (durations[idx] - minSec) / diffSec;
      y = height - paddingY - fraction * (height - 2 * paddingY);
    }
    points.push({ x, y, duration: lap.duration, num: lap.number });
  });

  // Start building SVG string
  let svgString = `<svg width="100%" height="100%" viewBox="0 0 ${width} ${height}" style="overflow: visible;">`;

  // Draw background horizontal gridlines (3 lines)
  for (let i = 0; i < 3; i++) {
    const gridY = paddingY + i * (height - 2 * paddingY) / 2;
    svgString += `<line class="chart-gridline" x1="${paddingX}" y1="${gridY}" x2="${width - paddingX}" y2="${gridY}" />`;
    
    // Add grid values labels on the left edge
    const gridVal = maxSec - i * diffSec / 2;
    svgString += `<text class="chart-label" x="${paddingX - 18}" y="${gridY + 3.5}" text-anchor="middle">${gridVal.toFixed(1)}s</text>`;
  }

  // Build the Polyline coordinates string
  const polyPoints = points.map(p => `${p.x},${p.y}`).join(' ');
  svgString += `<polyline class="chart-line" points="${polyPoints}" />`;

  // Draw node points circles and hover interaction tooltip triggers
  points.forEach(p => {
    svgString += `
      <g>
        <circle class="chart-point" cx="${p.x}" cy="${p.y}" r="4.5" />
        <title>Lap ${p.num}: ${(p.duration / 1000).toFixed(3)}s</title>
        <text class="chart-label" x="${p.x}" y="${height - 2}" text-anchor="middle">L${p.num}</text>
      </g>
    `;
  });

  svgString += `</svg>`;
  svgGraphContainer.innerHTML = svgString;
}

// ==========================================================================
// Heuristic AI Coach & Achievements Engine
// ==========================================================================
function updateAIInsights(best, worst, avg, sum) {
  if (laps.length === 0) return;

  if (laps.length === 1) {
    aiInsightText.textContent = "Great start! Record another split lap to analyze your timing consistency, pace changes, and trigger the performance line graph.";
    return;
  }

  // Calculate standard deviation / variance
  let varianceSum = 0;
  laps.forEach(lap => {
    varianceSum += Math.pow(lap.duration - avg, 2);
  });
  const stdDev = Math.sqrt(varianceSum / laps.length) / 1000; // in seconds

  let coachText = "";

  // Analyze consistency
  if (stdDev < 0.25) {
    coachText = "🧠 **AI Coach**: Outstanding pacing! Your timing variance is extremely small (" + stdDev.toFixed(2) + "s). You have excellent pacing discipline, vital for endurance and steady performance.";
  } else if (stdDev < 0.9) {
    coachText = "🧠 **AI Coach**: Consistent rhythm. Your standard deviation is under 1 second (" + stdDev.toFixed(2) + "s). This suggests a steady, well-managed tempo across all intervals.";
  } else {
    const percentageDifference = ((worst - best) / best * 100).toFixed(0);
    coachText = "🧠 **AI Coach**: Moderate timing variance detected (" + stdDev.toFixed(2) + "s). Your slowest lap was " + percentageDifference + "% slower than your best lap. Try focusing on a steadier pace.";
  }

  // Analyze performance trends (comparing first half vs second half of laps)
  const midpoint = Math.floor(laps.length / 2);
  let firstHalfSum = 0;
  let secondHalfSum = 0;
  for (let i = 0; i < laps.length; i++) {
    if (i < midpoint) firstHalfSum += laps[i].duration;
    else secondHalfSum += laps[i].duration;
  }
  const firstHalfAvg = firstHalfSum / midpoint;
  const secondHalfAvg = secondHalfSum / (laps.length - midpoint);

  if (secondHalfAvg < firstHalfAvg) {
    const improvement = ((firstHalfAvg - secondHalfAvg) / firstHalfAvg * 100).toFixed(1);
    coachText += " Additionally, your pace is accelerating! Your second-half average time improved by **" + improvement + "%**, indicating a strong progressive finish.";
  } else if (secondHalfAvg > firstHalfAvg + 100) {
    const fatigue = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg * 100).toFixed(1);
    coachText += " Your lap times are slowing down (second half is **" + fatigue + "%** slower). This is a standard sign of fatigue. Ensure to pace yourself in the early laps.";
  }

  aiInsightText.innerHTML = coachText;
}

function checkAchievements() {
  if (laps.length === 0) return;

  // 1. First Lap
  if (!unlockedAchievements['first-lap'] && laps.length >= 1) {
    unlockAchievement('first-lap', 'First Step', 'Recorded your first lap of the session!');
  }

  // 2. Speed Demon (Lap under 10 seconds)
  if (!unlockedAchievements['speed-demon']) {
    const speedDemon = laps.some(l => l.duration < 10000);
    if (speedDemon) {
      unlockAchievement('speed-demon', 'Speed Demon', 'Successfully completed a split lap in under 10 seconds!');
    }
  }

  // 3. Steady Pace (at least 3 laps, std dev under 1s)
  if (!unlockedAchievements['steady-run'] && laps.length >= 3) {
    let sum = laps.reduce((acc, curr) => acc + curr.duration, 0);
    let avg = sum / laps.length;
    let varSum = laps.reduce((acc, curr) => acc + Math.pow(curr.duration - avg, 2), 0);
    let stdDev = Math.sqrt(varSum / laps.length) / 1000;
    if (stdDev < 1.0) {
      unlockAchievement('steady-run', 'Steady Pace', 'Recorded 3+ laps with less than 1 second variance.');
    }
  }

  // 4. Endurance (10 laps)
  if (!unlockedAchievements['endurance'] && laps.length >= 10) {
    unlockAchievement('endurance', 'Endurance Master', 'Demonstrated peak resilience by recording 10 laps in one session.');
  }
}

function unlockAchievement(id, title, message) {
  unlockedAchievements[id] = true;

  // UI highlight
  const badgeEl = document.getElementById(`badge-${id}`);
  if (badgeEl) {
    badgeEl.classList.remove('locked');
  }

  // Fire sound effect & float toast notification
  playSound('achievement');
  showToast(title, message);
  
  localStorage.setItem('stopwatch_unlocked_achievements', JSON.stringify(unlockedAchievements));
}

function showToast(title, message) {
  toastTitle.textContent = title;
  toastMessage.textContent = message;
  toastNotification.classList.remove('hidden');

  // Slide out after 4 seconds
  setTimeout(() => {
    toastNotification.classList.add('hidden');
  }, 4000);
}

// ==========================================================================
// Countdown Alarm Trigger
// ==========================================================================
function triggerAlarm() {
  isAlarmRinging = true;
  alarmOverlay.classList.remove('hidden');

  // Trigger browser notifications if allowed
  if (Notification.permission === 'granted') {
    new Notification("Time is Up!", {
      body: "Your Precision Suite Countdown Timer has completed.",
      icon: "icon-512.png"
    });
  }

  // Ring sound loop
  playSound('alarm');
  alarmIntervalId = setInterval(() => {
    playSound('alarm');
  }, 1000);
}

function dismissAlarm() {
  if (!isAlarmRinging) return;

  isAlarmRinging = false;
  alarmOverlay.classList.add('hidden');

  if (alarmIntervalId) {
    clearInterval(alarmIntervalId);
    alarmIntervalId = null;
  }

  // Push timer completion to history database
  saveSessionToHistory();
  resetTimerCycle();
}

// ==========================================================================
// Session History Logger (LocalStorage)
// ==========================================================================
function saveSessionToHistory() {
  let sessionDuration = 0;
  let sessionLapsCount = 0;
  let detailLaps = [];

  if (appMode === 'stopwatch') {
    sessionDuration = elapsedTime;
    sessionLapsCount = laps.length;
    detailLaps = [...laps];
  } else {
    sessionDuration = initialTimerDuration;
    sessionLapsCount = 0; // timers do not have laps
  }

  // Do not save negligible/zero runs
  if (sessionDuration < 1000) return;

  const now = new Date();
  const formattedDate = now.toLocaleDateString() + ' ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const sessionObj = {
    id: Date.now(),
    date: formattedDate,
    mode: appMode,
    duration: sessionDuration,
    lapsCount: sessionLapsCount,
    laps: detailLaps
  };

  sessionHistory.push(sessionObj);
  // Keep only the last 30 entries to manage local storage footprint
  if (sessionHistory.length > 30) {
    sessionHistory.shift();
  }

  localStorage.setItem('stopwatch_sessions_history', JSON.stringify(sessionHistory));
  renderHistoryList();
}

function renderHistoryList() {
  historyListContainer.innerHTML = '';

  if (sessionHistory.length === 0) {
    historyListContainer.innerHTML = `
      <div class="laps-empty-state">
        <svg viewBox="0 0 24 24" width="40" height="40" stroke="currentColor" stroke-width="1" fill="none"><circle cx="12" cy="12" r="10"></circle><path d="M12 6v6l4 2"></path></svg>
        <p>No logged sessions found. Your runs save automatically upon reset.</p>
      </div>
    `;
    return;
  }

  // List newest runs first
  const reversedHistory = [...sessionHistory].reverse();

  reversedHistory.forEach((session) => {
    const card = document.createElement('div');
    card.className = 'history-card';
    card.setAttribute('data-id', session.id);

    const timeLabel = formatTime(session.duration);
    const modeBadge = session.mode === 'stopwatch' ? '⏱️ Stopwatch' : '⌛ Timer';
    const subText = session.mode === 'stopwatch' ? `${session.lapsCount} Laps` : 'Finished';

    card.innerHTML = `
      <div class="history-info">
        <span class="history-date">${session.date}</span>
        <span class="history-details">${modeBadge} &bull; ${subText}</span>
      </div>
      <div class="history-metrics">${timeLabel.substring(0, 8)}<span style="font-size:0.75rem">${timeLabel.substring(8)}</span></div>
      <div class="history-actions">
        <button class="history-icon-btn delete" title="Delete record" aria-label="Delete Session">
          <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
        </button>
      </div>
    `;

    // Event delegation setup inside creation
    card.querySelector('.delete').addEventListener('click', (e) => {
      e.stopPropagation();
      deleteHistoryItem(session.id);
    });

    // Loading past history items for viewing
    card.addEventListener('click', () => {
      loadHistorySession(session);
    });

    historyListContainer.appendChild(card);
  });
}

function deleteHistoryItem(id) {
  sessionHistory = sessionHistory.filter(s => s.id !== id);
  localStorage.setItem('stopwatch_sessions_history', JSON.stringify(sessionHistory));
  renderHistoryList();
  playSound('reset');
}

function clearAllHistory() {
  if (confirm("Are you sure you want to clear your entire saved sessions history database?")) {
    sessionHistory = [];
    localStorage.removeItem('stopwatch_sessions_history');
    renderHistoryList();
    playSound('reset');
  }
}

function loadHistorySession(session) {
  // Switch to Stopwatch Mode if history session is stopwatch, etc.
  if (appMode !== session.mode) {
    switchAppMode(session.mode);
  }

  // Reset clock state and load variables
  stopTimerCycle();
  
  if (session.mode === 'stopwatch') {
    elapsedTime = session.duration;
    laps = [...session.laps];
    
    setDisplayTime(elapsedTime);
    renderLaps();
    updateAnalytics();
    
    // Switch active panel tab to Laps to inspect details
    switchTab('laps');
    showToast('Loaded Session', `Stopwatch history from ${session.date} loaded successfully.`);
  } else {
    initialTimerDuration = session.duration;
    setDisplayTime(initialTimerDuration);
    toggleAdjusters(true);
    
    switchTab('laps');
    showToast('Loaded Timer', `Countdown limit of ${Math.round(session.duration/1000)}s loaded.`);
  }

  resetBtn.disabled = false;
  playSound('theme');
}

// ==========================================================================
// Data Reports Export (CSV / Print)
// ==========================================================================
function downloadCSVReport() {
  if (laps.length === 0) return;

  let csvContent = "Lap Number,Split Time (ms),Split Time (Formatted),Cumulative Time (ms),Cumulative Time (Formatted)\r\n";

  laps.forEach(lap => {
    const formattedSplit = formatTime(lap.duration);
    const formattedTotal = formatTime(lap.time);
    csvContent += `${lap.number},${lap.duration},${formattedSplit},${lap.time},${formattedTotal}\r\n`;
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const downloadAnchor = document.createElement("a");
  downloadAnchor.setAttribute("href", url);
  downloadAnchor.setAttribute("download", `Stopwatch_Report_${Date.now()}.csv`);
  document.body.appendChild(downloadAnchor);
  
  downloadAnchor.click();
  document.body.removeChild(downloadAnchor);
  
  // Clean up object URL memory
  setTimeout(() => URL.revokeObjectURL(url), 100);
  
  playSound('theme');
}

function triggerBrowserPrint() {
  playSound('theme');
  window.print();
}

// ==========================================================================
// Theme & Light Mode Customizers
// ==========================================================================
function setTheme(themeName) {
  currentTheme = themeName;
  
  // Clean other themes from body
  document.body.className = '';
  document.body.classList.add(`theme-${themeName}`);
  if (!isDarkMode) {
    document.body.classList.add('light-mode');
  }

  // Update theme dots UI
  themeDots.forEach(dot => {
    if (dot.getAttribute('data-theme') === themeName) {
      dot.classList.add('active');
    } else {
      dot.classList.remove('active');
    }
  });

  saveSessionState();
}

function cycleThemes() {
  const themesList = ['cyan', 'purple', 'orange', 'green'];
  let nextIdx = (themesList.indexOf(currentTheme) + 1) % themesList.length;
  setTheme(themesList[nextIdx]);
  playSound('theme');
}

function toggleLightDarkMode() {
  isDarkMode = !isDarkMode;
  const sunIcon = themeToggleBtn.querySelector('.sun-icon');
  const moonIcon = themeToggleBtn.querySelector('.moon-icon');

  if (isDarkMode) {
    document.body.classList.remove('light-mode');
    sunIcon.classList.add('hidden');
    moonIcon.classList.remove('hidden');
  } else {
    document.body.classList.add('light-mode');
    sunIcon.classList.remove('hidden');
    moonIcon.classList.add('hidden');
  }

  playSound('theme');
  saveSessionState();
}

// ==========================================================================
// Local Storage Persistence
// ==========================================================================
function saveSessionState() {
  localStorage.setItem('stopwatch_theme', currentTheme);
  localStorage.setItem('stopwatch_dark_mode', isDarkMode ? 'true' : 'false');
  localStorage.setItem('stopwatch_app_mode', appMode);
  localStorage.setItem('stopwatch_elapsed_time', elapsedTime.toString());
  localStorage.setItem('stopwatch_remaining_time', remainingTime.toString());
  localStorage.setItem('stopwatch_initial_timer', initialTimerDuration.toString());
  localStorage.setItem('stopwatch_laps_history', JSON.stringify(laps));
}

function loadSessionState() {
  // 1. Theme and color configs
  const savedTheme = localStorage.getItem('stopwatch_theme');
  if (savedTheme) {
    currentTheme = savedTheme;
  }
  
  const savedDarkMode = localStorage.getItem('stopwatch_dark_mode');
  if (savedDarkMode === 'false') {
    isDarkMode = false;
    document.body.classList.add('light-mode');
    themeToggleBtn.querySelector('.sun-icon').classList.remove('hidden');
    themeToggleBtn.querySelector('.moon-icon').classList.add('hidden');
  }
  setTheme(currentTheme);

  // 2. Sound state config
  const savedSoundMuted = localStorage.getItem('stopwatch_sound_muted');
  if (savedSoundMuted === 'true') {
    isSoundMuted = true;
    soundOnIcon.classList.add('hidden');
    soundOffIcon.classList.remove('hidden');
  }

  // 3. App Mode recovery
  const savedAppMode = localStorage.getItem('stopwatch_app_mode');
  if (savedAppMode) {
    switchAppMode(savedAppMode);
  }

  // 4. Timer counters recovery
  const savedElapsed = localStorage.getItem('stopwatch_elapsed_time');
  const savedRemaining = localStorage.getItem('stopwatch_remaining_time');
  const savedInitialTimer = localStorage.getItem('stopwatch_initial_timer');

  if (appMode === 'stopwatch' && savedElapsed) {
    elapsedTime = parseFloat(savedElapsed);
    setDisplayTime(elapsedTime);
    if (elapsedTime > 0) resetBtn.disabled = false;
  } else if (appMode === 'timer' && savedRemaining) {
    remainingTime = parseFloat(savedRemaining);
    initialTimerDuration = parseFloat(savedInitialTimer || '0');
    setDisplayTime(remainingTime || initialTimerDuration);
    if (remainingTime > 0 || initialTimerDuration > 0) resetBtn.disabled = false;
  }

  // Restore analog sweeper hand position
  const sweeperHand = document.getElementById('sweeper-hand');
  if (sweeperHand) {
    let angle = 0;
    if (appMode === 'stopwatch') {
      angle = ((elapsedTime % 60000) / 60000) * 360;
    } else {
      angle = initialTimerDuration > 0 ? (remainingTime / initialTimerDuration) * 360 : 0;
    }
    sweeperHand.style.transform = `rotate(${angle}deg)`;
  }

  // 5. Laps recovery
  const savedLaps = localStorage.getItem('stopwatch_laps_history');
  if (savedLaps && appMode === 'stopwatch') {
    try {
      laps = JSON.parse(savedLaps);
      renderLaps();
      updateAnalytics();
    } catch(e) {
      laps = [];
    }
  }

  // 6. History database recovery
  const savedHistory = localStorage.getItem('stopwatch_sessions_history');
  if (savedHistory) {
    try {
      sessionHistory = JSON.parse(savedHistory);
      renderHistoryList();
    } catch(e) {
      sessionHistory = [];
    }
  }

  // 7. Achievements recovery
  const savedAchievements = localStorage.getItem('stopwatch_unlocked_achievements');
  if (savedAchievements) {
    try {
      unlockedAchievements = JSON.parse(savedAchievements);
      // Update locks classes in UI
      Object.keys(unlockedAchievements).forEach(key => {
        if (unlockedAchievements[key]) {
          document.getElementById(`badge-${key}`).classList.remove('locked');
        }
      });
    } catch(e) {}
  }
}

// ==========================================================================
// Tabs switcher UI
// ==========================================================================
function switchTab(targetTabName) {
  tabLinks.forEach(link => {
    if (link.getAttribute('data-tab') === targetTabName) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  tabPanes.forEach(pane => {
    if (pane.id === `tab-content-${targetTabName}`) {
      pane.classList.add('active');
    } else {
      pane.classList.remove('active');
    }
  });

  // Action hook on tab activations
  if (targetTabName === 'analytics') {
    drawSVGGraph();
  }
}

// ==========================================================================
// PWA Service Worker & Notifications Permissions
// ==========================================================================
function registerPWAAndNotifications() {
  // Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
      .then((reg) => console.log('PWA Service Worker registered successfully', reg.scope))
      .catch((err) => console.error('PWA Service Worker registration failed', err));
  }

  // Request Web Notifications Permission
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

// ==========================================================================
// Setup DOM Event Listeners
// ==========================================================================
function setupEventListeners() {
  // Controls
  startBtn.addEventListener('click', toggleStartPause);
  lapBtn.addEventListener('click', recordLap);
  resetBtn.addEventListener('click', resetTimerCycle);
  
  // Theme & Sound utility clicks
  themeToggleBtn.addEventListener('click', toggleLightDarkMode);
  soundToggleBtn.addEventListener('click', () => {
    isSoundMuted = !isSoundMuted;
    if (isSoundMuted) {
      soundOnIcon.classList.add('hidden');
      soundOffIcon.classList.remove('hidden');
    } else {
      soundOnIcon.classList.remove('hidden');
      soundOffIcon.classList.add('hidden');
      initAudio();
      playSound('theme');
    }
    localStorage.setItem('stopwatch_sound_muted', isSoundMuted ? 'true' : 'false');
  });

  themeDots.forEach(dot => {
    dot.addEventListener('click', (e) => {
      setTheme(e.target.getAttribute('data-theme'));
      playSound('theme');
    });
  });

  // App Modes Tabs
  modeStopwatchBtn.addEventListener('click', () => switchAppMode('stopwatch'));
  modeTimerBtn.addEventListener('click', () => switchAppMode('timer'));

  // Countdown adjusters (chevron clicks)
  adjHrsUp.addEventListener('click', () => adjustCountdown('hours', 1));
  adjHrsDown.addEventListener('click', () => adjustCountdown('hours', -1));
  adjMinsUp.addEventListener('click', () => adjustCountdown('mins', 1));
  adjMinsDown.addEventListener('click', () => adjustCountdown('mins', -1));
  adjSecsUp.addEventListener('click', () => adjustCountdown('secs', 1));
  adjSecsDown.addEventListener('click', () => adjustCountdown('secs', -1));

  // Dashboard Tab Links
  tabLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      switchTab(e.target.getAttribute('data-tab'));
      playSound('theme');
    });
  });

  // Alarm screen dismiss button
  dismissAlarmBtn.addEventListener('click', dismissAlarm);

  // History Actions
  btnClearHistory.addEventListener('click', clearAllHistory);

  // Export buttons
  btnExportCSV.addEventListener('click', downloadCSVReport);
  btnPrintReport.addEventListener('click', triggerBrowserPrint);

  // Keyboard accessibility hotkeys
  window.addEventListener('keydown', (e) => {
    const activeEl = document.activeElement;
    const isButtonFocused = activeEl && activeEl.tagName === 'BUTTON';

    switch (e.code) {
      case 'Space':
        e.preventDefault();
        toggleStartPause();
        break;

      case 'KeyL':
        if (!lapBtn.disabled) recordLap();
        break;

      case 'KeyR':
        if (!resetBtn.disabled) resetTimerCycle();
        break;

      case 'KeyT':
        cycleThemes();
        break;

      case 'KeyD':
        toggleLightDarkMode();
        break;

      case 'KeyM':
        soundToggleBtn.click();
        break;
    }
  });

  // Window Resize trigger graph redraw
  window.addEventListener('resize', () => {
    const activeTab = document.querySelector('.tab-link.active');
    if (activeTab && activeTab.getAttribute('data-tab') === 'analytics') {
      drawSVGGraph();
    }
  });
}

// ==========================================================================
// Dial Ticks Generation
// ==========================================================================
function generateDialTicks() {
  const dialTicksGroup = document.getElementById('dial-ticks');
  if (!dialTicksGroup) return;

  dialTicksGroup.innerHTML = '';
  // Generate 60 ticks around the circle
  for (let i = 0; i < 60; i++) {
    const angle = i * 6; // 360 / 60 = 6 degrees per tick
    const isMajor = (i % 5 === 0);
    const tickLength = isMajor ? 8 : 4;
    const r1 = 88;
    const r2 = r1 - tickLength;
    
    const rad = (angle - 90) * Math.PI / 180;
    const x1 = 100 + r1 * Math.cos(rad);
    const y1 = 100 + r1 * Math.sin(rad);
    const x2 = 100 + r2 * Math.cos(rad);
    const y2 = 100 + r2 * Math.sin(rad);
    
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x1.toFixed(2));
    line.setAttribute('y1', y1.toFixed(2));
    line.setAttribute('x2', x2.toFixed(2));
    line.setAttribute('y2', y2.toFixed(2));
    line.setAttribute('class', isMajor ? 'major-tick' : 'minor-tick');
    dialTicksGroup.appendChild(line);
  }
}

// ==========================================================================
// Initialization
// ==========================================================================
window.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  loadSessionState();
  generateDialTicks();
  registerPWAAndNotifications();
});

// Save exact running progress on unexpected exits
window.addEventListener('beforeunload', () => {
  if (isRunning) {
    const now = performance.now();
    if (appMode === 'stopwatch') {
      elapsedTime = now - startTime;
    } else {
      remainingTime = initialTimerDuration - (now - startTime);
    }
  }
  saveSessionState();
});

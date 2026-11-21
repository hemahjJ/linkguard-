(() => {
  'use strict';

  const form = document.getElementById('scanForm');
  const urlInput = document.getElementById('urlInput');
  const allowExternalLookup = document.getElementById('allowExternalLookup');
  const scanButton = document.getElementById('scanButton');
  const resultPanel = document.getElementById('resultPanel');
  const riskBadge = document.getElementById('riskBadge');
  const resultHost = document.getElementById('resultHost');
  const resultTitle = document.getElementById('resultTitle');
  const resultSummary = document.getElementById('resultSummary');
  const riskScore = document.getElementById('riskScore');
  const normalizedUrl = document.getElementById('normalizedUrl');
  const signalsList = document.getElementById('signalsList');
  const reputationMessage = document.getElementById('reputationMessage');
  const reputationStats = document.getElementById('reputationStats');

  const verdicts = {
    low: { badge: 'Low risk', title: 'No high-risk indicators found', className: 'risk-low' },
    suspicious: { badge: 'Suspicious', title: 'Review this link carefully', className: 'risk-suspicious' },
    malicious: { badge: 'Malicious', title: 'Do not open this link', className: 'risk-malicious' },
    error: { badge: 'Unable to check', title: 'Link could not be checked', className: 'risk-error' }
  };

  function setLoading(isLoading) {
    scanButton.disabled = isLoading;
    scanButton.textContent = isLoading ? 'Checking…' : 'Check link';
  }

  function setVerdict(type) {
    const verdict = verdicts[type];
    riskBadge.className = `risk-badge ${verdict.className}`;
    riskBadge.textContent = verdict.badge;
    resultTitle.textContent = verdict.title;
  }

  function renderSignals(signals) {
    signalsList.replaceChildren();

    if (!signals.length) {
      const item = document.createElement('li');
      item.className = 'signal signal-low';
      item.textContent = 'No concerning local link patterns were found.';
      signalsList.appendChild(item);
      return;
    }

    signals.forEach((signal) => {
      const item = document.createElement('li');
      item.className = `signal signal-${signal.severity}`;

      const title = document.createElement('span');
      title.className = 'signal-title';
      title.textContent = signal.title;

      const detail = document.createElement('span');
      detail.className = 'signal-detail';
      detail.textContent = signal.detail;

      item.append(title, detail);
      signalsList.appendChild(item);
    });
  }

  function renderReputation(reputation) {
    reputationMessage.textContent = reputation.message;
    reputationStats.replaceChildren();
    reputationStats.hidden = reputation.status !== 'available';

    if (reputation.status !== 'available') return;

    const entries = [
      ['Malicious', reputation.malicious],
      ['Suspicious', reputation.suspicious],
      ['Harmless', reputation.harmless],
      ['Undetected', reputation.undetected]
    ];

    entries.forEach(([label, value]) => {
      const stat = document.createElement('span');
      stat.className = 'reputation-stat';
      stat.textContent = `${label}: ${value ?? 0}`;
      reputationStats.appendChild(stat);
    });
  }

  function renderResult(result) {
    setVerdict(result.risk);
    resultHost.textContent = result.hostname;
    resultSummary.textContent = result.summary;
    riskScore.textContent = `${result.score}/100`;
    normalizedUrl.textContent = result.normalizedUrl;
    renderSignals(result.signals);
    renderReputation(result.reputation);
    resultPanel.hidden = false;
  }

  function renderError(message) {
    setVerdict('error');
    resultHost.textContent = '';
    resultSummary.textContent = message;
    riskScore.textContent = '—';
    normalizedUrl.textContent = '—';
    renderSignals([]);
    reputationMessage.textContent = 'No reputation lookup was performed.';
    reputationStats.hidden = true;
    resultPanel.hidden = false;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const url = urlInput.value.trim();
    if (!url) {
      renderError('Enter a public website link to check.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/v1/link-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          allowExternalLookup: allowExternalLookup.checked
        })
      });
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload?.error?.message || 'The link could not be checked.');
      }

      renderResult(payload);
    } catch (error) {
      renderError(error instanceof Error ? error.message : 'The link could not be checked.');
    } finally {
      setLoading(false);
    }
  });

  const monitorStatus = document.getElementById('monitorStatus');
  const uptimeValue = document.getElementById('uptimeValue');
  const totalRequestsValue = document.getElementById('totalRequestsValue');
  const suspiciousValue = document.getElementById('suspiciousValue');
  const blockedValue = document.getElementById('blockedValue');
  const monitorEvents = document.getElementById('monitorEvents');
  const threatRatioValue = document.getElementById('threatRatioValue');
  const threatTrendValue = document.getElementById('threatTrendValue');
  const criticalValue = document.getElementById('criticalValue');
  const warningValue = document.getElementById('warningValue');
  const severityFilter = document.getElementById('severityFilter');
  const eventSearch = document.getElementById('eventSearch');
  const activityChart = document.getElementById('activityChart');
  let latestMonitorSnapshot = null;

  function formatUptime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours ? `${hours}h ${minutes}m` : `${minutes}m`;
  }

  function renderMonitor(snapshot) {
    latestMonitorSnapshot = snapshot;
    uptimeValue.textContent = formatUptime(snapshot.uptimeSeconds);
    totalRequestsValue.textContent = snapshot.totalRequests.toLocaleString();
    suspiciousValue.textContent = snapshot.suspiciousRequests.toLocaleString();
    blockedValue.textContent = snapshot.blockedRequests.toLocaleString();
    threatRatioValue.textContent = `${snapshot.summary.suspiciousPercent}%`;
    threatTrendValue.textContent =
      snapshot.summary.trend === 'up' ? '▲ Rising' :
      snapshot.summary.trend === 'down' ? '▼ Falling' : '— Stable';
    threatTrendValue.className =
      snapshot.summary.trend === 'up' ? 'trend-up' :
      snapshot.summary.trend === 'down' ? 'trend-down' : 'trend-stable';
    criticalValue.textContent = snapshot.summary.criticalEvents.toLocaleString();
    warningValue.textContent = snapshot.summary.warningEvents.toLocaleString();
    renderActivityChart(snapshot.activity || []);
    applyEventFilters();
  }

  function renderActivityChart(activity) {
    const context = activityChart.getContext('2d');
    const width = activityChart.clientWidth;
    const height = activityChart.height;
    const ratio = window.devicePixelRatio || 1;

    activityChart.width = width * ratio;
    activityChart.height = height * ratio;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);

    if (!activity.length) return;
    const maxValue = Math.max(4, ...activity.map(point => Math.max(point.requests, point.suspicious)));
    const left = 8;
    const top = 10;
    const chartWidth = width - 16;
    const chartHeight = height - 35;
    const step = chartWidth / Math.max(1, activity.length - 1);

    context.strokeStyle = '#263449';
    context.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = top + (chartHeight / 4) * i;
      context.beginPath();
      context.moveTo(left, y);
      context.lineTo(left + chartWidth, y);
      context.stroke();
    }

    function drawLine(field, color) {
      context.strokeStyle = color;
      context.lineWidth = 2;
      context.beginPath();
      activity.forEach((point, index) => {
        const x = left + step * index;
        const y = top + chartHeight - (point[field] / maxValue) * chartHeight;
        if (index === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      });
      context.stroke();
    }

    drawLine('requests', '#4ade80');
    drawLine('suspicious', '#fb7185');

    context.fillStyle = '#8291a7';
    context.font = '10px Inter, sans-serif';
    activity.forEach((point, index) => {
      if (index % 3 !== 0 && index !== activity.length - 1) return;
      const x = left + step * index;
      context.textAlign = index === 0 ? 'left' : index === activity.length - 1 ? 'right' : 'center';
      context.fillText(point.label.split(' ')[0] || point.label, x, height - 8);
    });
  }

  function eventMatchesFilters(event) {
    const severity = severityFilter.value;
    const search = eventSearch.value.trim().toLowerCase();
    if (severity !== 'all' && event.severity !== severity) return false;
    if (!search) return true;
    return `${event.title} ${event.detail} ${event.method} ${event.path}`
      .toLowerCase()
      .includes(search);
  }

  function applyEventFilters() {
    if (!latestMonitorSnapshot) return;
    monitorEvents.replaceChildren();

    const filteredEvents = latestMonitorSnapshot.recentEvents.filter(eventMatchesFilters);
    if (!filteredEvents.length) {
      const empty = document.createElement('li');
      empty.className = 'monitor-empty';
      empty.textContent = 'No events match the current filter.';
      monitorEvents.appendChild(empty);
      return;
    }

    filteredEvents.forEach(renderMonitorEvent);
  }

  severityFilter.addEventListener('change', applyEventFilters);
  eventSearch.addEventListener('input', applyEventFilters);

  function renderMonitorEvent(event) {
    const empty = monitorEvents.querySelector('.monitor-empty');
    if (empty) empty.remove();

    const item = document.createElement('li');
    item.className = `monitor-event monitor-event-${event.severity}`;

    const badge = document.createElement('span');
    badge.className = 'monitor-severity';
    badge.textContent = event.severity;

    const content = document.createElement('div');
    const title = document.createElement('strong');
    title.textContent = event.title;
    const detail = document.createElement('p');
    detail.textContent = `${event.method} ${event.path} · ${event.status} · ${event.detail}`;
    content.append(title, detail);

    const time = document.createElement('time');
    time.dateTime = event.timestamp;
    time.textContent = new Date(event.timestamp).toLocaleTimeString();

    item.append(badge, content, time);
    monitorEvents.prepend(item);
    while (monitorEvents.children.length > 50) monitorEvents.lastElementChild.remove();
  }

  async function refreshMonitor() {
    try {
      const response = await fetch('/api/v1/monitor/status');
      if (!response.ok) throw new Error('Monitor status unavailable');
      const snapshot = await response.json();
      renderMonitor(snapshot);
    } catch {
      monitorStatus.className = 'monitor-status monitor-offline';
      monitorStatus.textContent = 'Offline';
    }
  }

  refreshMonitor();
  setInterval(refreshMonitor, 15000);

  if ('EventSource' in window) {
    const stream = new EventSource('/api/v1/monitor/stream');
    monitorStatus.className = 'monitor-status';
    monitorStatus.innerHTML = '<span></span> Connecting';

    stream.onopen = () => {
      monitorStatus.className = 'monitor-status monitor-online';
      monitorStatus.innerHTML = '<span></span> Live';
    };
    stream.onmessage = (message) => {
      const data = JSON.parse(message.data);
      if (data.type === 'connected') return;
      if (eventMatchesFilters(data)) renderMonitorEvent(data);
      refreshMonitor();
    };
    stream.onerror = () => {
      monitorStatus.className = 'monitor-status monitor-offline';
      monitorStatus.textContent = 'Reconnecting';
    };
  } else {
    monitorStatus.className = 'monitor-status monitor-offline';
    monitorStatus.textContent = 'Polling';
  }

  window.addEventListener('resize', () => {
    if (latestMonitorSnapshot) {
      renderActivityChart(latestMonitorSnapshot.activity || []);
    }
  });
})();

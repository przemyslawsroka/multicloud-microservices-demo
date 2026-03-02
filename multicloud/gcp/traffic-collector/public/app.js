let isPaused = false;
let myChart = null;

const formatNumber = (num) => {
    return new Intl.NumberFormat().format(num);
};

const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024, sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const hexToAscii = (hexStr) => {
    if (!hexStr) return "No payload data available.";
    let asciiStr = '';
    let bytes = [];
    for (let i = 0; i < hexStr.length; i += 2) {
        let byte = parseInt(hexStr.substr(i, 2), 16);
        bytes.push(byte.toString(16).padStart(2, '0'));
        if (byte >= 32 && byte <= 126) {
            asciiStr += String.fromCharCode(byte);
        } else {
            asciiStr += '.'; // Non-printable
        }
    }

    // Format into classic 16-byte hex dump
    let blocks = [];
    for (let i = 0; i < bytes.length; i += 16) {
        let chunkHex = bytes.slice(i, i + 16).join(' ');
        let chunkAscii = asciiStr.substr(i, 16);
        blocks.push(`${i.toString(16).padStart(4, '0')}  ${chunkHex.padEnd(47, ' ')}  |${chunkAscii}|`);
    }

    return blocks.join('\n');
};

const initChart = () => {
    const ctx = document.getElementById('protocolChart').getContext('2d');

    Chart.defaults.color = '#94a3b8';
    Chart.defaults.font.family = "'Outfit', sans-serif";

    myChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: [
                    '#3b82f6', // TCP Blue
                    '#10b981', // UDP Green
                    '#f59e0b', // HTTP Yellow
                    '#ef4444', // ICMP Red
                    '#c084fc', // GENEVE Purple
                    '#22d3ee'  // DNS Cyan
                ],
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        padding: 20
                    }
                }
            },
            cutout: '70%'
        }
    });
};

const updateChart = (stats) => {
    if (!myChart) return;

    const labels = stats.map(s => s.protocol);
    const data = stats.map(s => s.count);

    // Maintain color order based on labels simply
    const colorMap = {
        'TCP': '#3b82f6',
        'UDP': '#10b981',
        'HTTP': '#f59e0b',
        'HTTPS': '#f59e0b',
        'ICMP': '#ef4444',
        'GENEVE': '#c084fc',
        'DNS': '#22d3ee'
    };

    const bgColors = labels.map(l => colorMap[l] || '#64748b');

    myChart.data.labels = labels;
    myChart.data.datasets[0].data = data;
    myChart.data.datasets[0].backgroundColor = bgColors;
    myChart.update('none'); // Update without animation to prevent UI jumping

    let totalPackets = 0;
    let totalBytes = 0;
    stats.forEach(s => {
        totalPackets += s.count;
        totalBytes += s.bytes;
    });

    document.getElementById('stat-total-packets').textContent = formatNumber(totalPackets);
    document.getElementById('stat-total-bytes').textContent = formatBytes(totalBytes);
    // Rough estimation for active flows based on distinct recent traffic, 
    // for demo we just show a fraction of total packets
    document.getElementById('stat-active-flows').textContent = formatNumber(Math.max(1, Math.floor(totalPackets * 0.15)));
};

const pollData = async () => {
    if (isPaused) return;

    try {
        const packetsRes = await fetch('/api/packets?limit=50');
        const packets = await packetsRes.json();

        const statsRes = await fetch('/api/stats');
        const stats = await statsRes.json();

        updateChart(stats);
        renderTable(packets);
    } catch (e) {
        console.error("Error fetching data:", e);
    }
};

let lastRenderedIds = new Set();

const getTagClass = (protocol) => {
    const p = protocol.toLowerCase();
    if (['tcp', 'udp', 'http', 'https', 'icmp', 'geneve', 'dns'].includes(p)) {
        if (p === 'https') return 'tag-http';
        return `tag-${p}`;
    }
    return '';
};

const renderTable = (packets) => {
    const tbody = document.getElementById('packet-tbody');
    tbody.innerHTML = '';

    const newIds = new Set(packets.map(p => p.id));

    packets.forEach(p => {
        const tr = document.createElement('tr');
        if (!lastRenderedIds.has(p.id)) {
            tr.classList.add('new-row');
        }

        const time = new Date(p.timestamp * 1000).toLocaleTimeString([], { hour12: false, fractionalSecondDigits: 3 });

        const pClass = getTagClass(p.protocol);

        const patternBadge = p.pattern !== 'None' ? `<span style="color: #ef4444; font-weight: 500;">🚨 ${p.pattern}</span>` : `<span style="color: #94a3b8">Clean</span>`;

        tr.classList.add('clickable-row');
        tr.onclick = () => {
            document.getElementById('modal-meta').innerHTML = `
                <div><strong>TIMESTAMP:</strong> ${time} | <strong>PROTO:</strong> ${p.protocol} | <strong>SIZE:</strong> ${p.size} Bytes</div>
                <div><strong>SRC:</strong> ${p.src_ip}:${p.src_port || '*'} &rarr; <strong>DST:</strong> ${p.dst_ip}:${p.dst_port || '*'}</div>
                <div><strong>PATTERN MATCH:</strong> ${patternBadge}</div>
            `;
            document.getElementById('modal-payload').textContent = hexToAscii(p.payload);
            document.getElementById('payload-modal').classList.remove('hidden');

            // Auto pause the stream when inspecting
            if (!isPaused) {
                document.getElementById('toggle-stream').click();
            }
        };

        tr.innerHTML = `
            <td>${time}</td>
            <td style="font-family: monospace;">${p.src_ip}:${p.src_port || '*'}</td>
            <td style="font-family: monospace;">${p.dst_ip}:${p.dst_port || '*'}</td>
            <td><span class="tag ${pClass}">${p.protocol}</span></td>
            <td>${p.size}</td>
            <td>${patternBadge}</td>
        `;
        tbody.appendChild(tr);
    });

    lastRenderedIds = newIds;
};

document.addEventListener('DOMContentLoaded', () => {
    initChart();

    document.getElementById('toggle-stream').addEventListener('click', (e) => {
        isPaused = !isPaused;
        const btn = e.target;
        if (isPaused) {
            btn.textContent = 'Resume Stream';
            btn.style.borderColor = '#94a3b8';
            btn.style.color = '#94a3b8';
        } else {
            btn.textContent = 'Pause Stream';
            btn.style.borderColor = 'var(--accent-color)';
            btn.style.color = 'var(--accent-color)';
        }
    });

    pollData();
    setInterval(pollData, 1000);

    document.getElementById('close-modal').addEventListener('click', () => {
        document.getElementById('payload-modal').classList.add('hidden');
    });
});

import socket
import threading
import sqlite3
import time
import random
import re
from flask import Flask, jsonify, request
import os

app = Flask(__name__, static_folder='../public')
DB_FILE = 'packets.db'

def init_db():
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS packets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp REAL,
            src_ip TEXT,
            dst_ip TEXT,
            src_port INTEGER,
            dst_port INTEGER,
            protocol TEXT,
            size INTEGER,
            pattern_match TEXT,
            payload TEXT
        )
    ''')
    conn.commit()
    conn.close()

def analyze_payload(data):
    # Deep Packet Inspection: check for SQLi, XSS, plaintext creds in the raw bytes
    try:
        payload_str = data.decode('utf-8', errors='ignore')
        if re.search(r'(UNION\s+SELECT|OR\s+1\s*=\s*1|DROP\s+TABLE)', payload_str, re.IGNORECASE):
            return "SQL Injection"
        if re.search(r'(<script|javascript:)', payload_str, re.IGNORECASE):
            return "Cross-Site Scripting (XSS)"
        if "password=" in payload_str.lower() or "passwd=" in payload_str.lower():
            return "Cleartext Password"
        if re.search(r'(admin|root)\s*:\s*[a-zA-Z0-9]', payload_str, re.IGNORECASE):
            return "Suspicious Privilege Use"
    except Exception:
        pass
    return "None"

def udp_collector_loop():
    UDP_IP = "0.0.0.0"
    UDP_PORT = 6081 # Standard Geneve encapsulation port for GCP Network Security OOB mirror
    
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        sock.bind((UDP_IP, UDP_PORT))
    except Exception as e:
        print(f"Failed to bind to {UDP_PORT}: {e}")
        return
        
    print(f"Collector listening on {UDP_IP}:{UDP_PORT}")
    
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    
    while True:
        try:
            data, addr = sock.recvfrom(65535)
            timestamp = time.time()
            size = len(data)
            
            src_ip = addr[0]
            dst_ip = "Collector ILB" 
            
            pattern_match = analyze_payload(data)
            
            payload = data.hex()[:500] if data else ""
            
            c.execute('''
                INSERT INTO packets (timestamp, src_ip, dst_ip, src_port, dst_port, protocol, size, pattern_match, payload)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (timestamp, src_ip, dst_ip, addr[1], UDP_PORT, 'GENEVE', size, pattern_match, payload))
            conn.commit()
        except Exception as e:
            print(f"Collector error: {e}")
            time.sleep(1)

def mock_data_generator():
    """Generates mock data so the application is lively without real traffic"""
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    protocols = ['TCP', 'UDP', 'ICMP', 'HTTP', 'HTTPS', 'DNS', 'GENEVE']
    ips = [f"10.0.0.{i}" for i in range(10, 30)] + [f"192.168.1.{i}" for i in range(100, 110)] + ["34.120.55.12", "130.211.0.1"]
    
    patterns = ["None", "None", "None", "None", "None", "SQL Injection", "Cross-Site Scripting (XSS)", "Cleartext Password"]

    while True:
        timestamp = time.time()
        pattern = random.choice(patterns)
        
        mock_payloads = {
            "None": "GET / HTTP/1.1\\r\\nHost: example.com\\r\\nAccept: */*\\r\\n\\r\\n",
            "SQL Injection": "GET /search?q=UNION%20SELECT%20username,%20password%20FROM%20users HTTP/1.1\\r\\nHost: example.com\\r\\n\\r\\n",
            "Cross-Site Scripting (XSS)": "POST /comment HTTP/1.1\\r\\nHost: example.com\\r\\n\\r\\nbody=<script>alert(1)</script>",
            "Cleartext Password": "POST /login HTTP/1.1\\r\\nHost: example.com\\r\\n\\r\\nusername=admin&password=supersecretpassword",
            "Suspicious Privilege Use": "GET /admin_dashboard?user=root:x:0:0:root HTTP/1.1\\r\\nHost: example.com\\r\\n\\r\\n"
        }
        
        payload_text = mock_payloads.get(pattern, "00112233445566778899AABBCCDDEEFF")
        hex_payload = payload_text.encode('utf-8').hex()
        
        c.execute('''
            INSERT INTO packets (timestamp, src_ip, dst_ip, src_port, dst_port, protocol, size, pattern_match, payload)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            timestamp, 
            random.choice(ips), 
            random.choice(ips), 
            random.randint(1024, 65535), 
            random.choice([80, 443, 53, 22, 6081]), 
            random.choice(protocols), 
            len(payload_text) + random.randint(40, 500),
            pattern,
            hex_payload
        ))
        conn.commit()
        time.sleep(random.uniform(0.05, 0.5))

@app.route('/api/packets')
def get_packets():
    limit = request.args.get('limit', 100)
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('SELECT id, timestamp, src_ip, dst_ip, src_port, dst_port, protocol, size, pattern_match, payload FROM packets ORDER BY timestamp DESC LIMIT ?', (limit,))
    rows = c.fetchall()
    conn.close()
    
    result = []
    for row in rows:
        result.append({
            'id': row[0],
            'timestamp': row[1],
            'src_ip': row[2],
            'dst_ip': row[3],
            'src_port': row[4],
            'dst_port': row[5],
            'protocol': row[6],
            'size': row[7],
            'pattern': row[8],
            'payload': row[9]
        })
    return jsonify(result)

@app.route('/api/stats')
def get_stats():
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('SELECT protocol, sum(size), count(*) FROM packets GROUP BY protocol')
    rows = c.fetchall()
    conn.close()
    
    stats = []
    for row in rows:
        stats.append({
            'protocol': row[0],
            'bytes': row[1],
            'count': row[2]
        })
    return jsonify(stats)

@app.route('/')
def index():
    return app.send_static_file('index.html')

@app.route('/<path:path>')
def serve_static(path):
    return app.send_static_file(path)

if __name__ == '__main__':
    init_db()
    
    t = threading.Thread(target=udp_collector_loop, daemon=True)
    t.start()
    
    t2 = threading.Thread(target=mock_data_generator, daemon=True)
    t2.start()
    
    app.run(host='0.0.0.0', port=5000)

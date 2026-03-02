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
def decode_geneve(data):
    if len(data) < 8:
        return None
        
    try:
        # Geneve header: first byte contains Ver (2 bits) and Opt Len (6 bits)
        opt_len = (data[0] & 0x3f) * 4
        geneve_len = 8 + opt_len
        
        # Protocol Type (offset 2-3)
        proto_type = (data[2] << 8) + data[3]
        offset = geneve_len
        
        # Transparent Ethernet Bridging (0x6558)
        if proto_type == 0x6558:
            if len(data) < offset + 14: return None
            eth_type = (data[offset+12] << 8) + data[offset+13]
            offset += 14
            
            # 802.1Q VLAN tag
            if eth_type == 0x8100:
                if len(data) < offset + 4: return None
                eth_type = (data[offset+2] << 8) + data[offset+3]
                offset += 4
                
            if eth_type != 0x0800: # Only IPv4
                return None
                
        # Raw IPv4 (0x0800)
        elif proto_type != 0x0800:
            return None
            
        # Parse IPv4 header
        if len(data) < offset + 20: return None
        ip_header = data[offset:offset+20]
        ihl = (ip_header[0] & 0x0f) * 4
        protocol = ip_header[9]
        
        src_ip = f"{ip_header[12]}.{ip_header[13]}.{ip_header[14]}.{ip_header[15]}"
        dst_ip = f"{ip_header[16]}.{ip_header[17]}.{ip_header[18]}.{ip_header[19]}"
        
        offset += ihl
        src_port, dst_port, proto_name = 0, 0, "IP"
        
        if protocol == 6: # TCP
            proto_name = "TCP"
            if len(data) >= offset + 4:
                src_port = (data[offset] << 8) + data[offset+1]
                dst_port = (data[offset+2] << 8) + data[offset+3]
        elif protocol == 17: # UDP
            proto_name = "UDP"
            if len(data) >= offset + 4:
                src_port = (data[offset] << 8) + data[offset+1]
                dst_port = (data[offset+2] << 8) + data[offset+3]
        elif protocol == 1: # ICMP
            proto_name = "ICMP"
            
        return src_ip, dst_ip, src_port, dst_port, proto_name
    except Exception:
        return None

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
            
            # Default to outer encapsulation values
            src_ip = addr[0]
            dst_ip = "Collector ILB"
            src_port = addr[1]
            dst_port = UDP_PORT
            protocol = 'GENEVE'
            
            # Attempt to decapsulate Geneve to find inner packets
            inner_packet = decode_geneve(data)
            if inner_packet:
                src_ip, dst_ip, src_port, dst_port, protocol = inner_packet
            
            pattern_match = analyze_payload(data)
            
            payload = data.hex()[:500] if data else ""
            
            c.execute('''
                INSERT INTO packets (timestamp, src_ip, dst_ip, src_port, dst_port, protocol, size, pattern_match, payload)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (timestamp, src_ip, dst_ip, src_port, dst_port, protocol, size, pattern_match, payload))
            conn.commit()
        except Exception as e:
            print(f"Collector error: {e}")
            time.sleep(1)



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
    
    app.run(host='0.0.0.0', port=5000)

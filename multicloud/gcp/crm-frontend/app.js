const express = require('express');
const app = express();
const port = process.env.PORT || 8080;
const EXTERNAL_BACKEND_URL = process.env.BACKEND_URL || 'http://10.3.0.2:8080/customers';

// Middleware to parse JSON bodies
app.use(express.json());

app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Professional CRM System</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css" rel="stylesheet">
    <style>
        body { background-color: #f8f9fa; font-family: 'Inter', sans-serif; }
        .navbar { background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%); padding: 15px 0; }
        .navbar-brand { color: white !important; font-weight: 700; letter-spacing: 1px; }
        .main-container { max-width: 1000px; margin-top: 40px; }
        .card { border: none; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
        .card-header { background-color: white; border-bottom: 1px solid #edf2f9; padding: 20px 24px; border-radius: 12px 12px 0 0 !important; }
        .table th { background-color: #f8f9fa; color: #495057; font-weight: 600; text-transform: uppercase; font-size: 0.85rem; letter-spacing: 0.5px; border-top: none; }
        .table td { vertical-align: middle; color: #343a40; }
        .btn-primary { background: #2a5298; border: none; }
        .btn-primary:hover { background: #1e3c72; }
        .avatar { width: 40px; height: 40px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-weight: 600; color: white; margin-right: 12px; }
        .action-icon { cursor: pointer; color: #6c757d; transition: color 0.2s; margin: 0 5px; font-size: 1.1rem; }
        .action-icon:hover { color: #1e3c72; }
        .delete-icon:hover { color: #dc3545; }
        .loading-overlay { display: none; text-align: center; padding: 40px; }
    </style>
</head>
<body>
    <nav class="navbar navbar-expand-lg">
        <div class="container main-container mt-0">
            <a class="navbar-brand" href="#"><i class="bi bi-briefcase-fill me-2"></i> Cloud CRM Pro</a>
            <div class="d-flex align-items-center">
                <span class="text-white-50 small me-3"><i class="bi bi-hdd-network"></i> Backend: <code class="text-white bg-dark px-1 rounded">\${EXTERNAL_BACKEND_URL}</code></span>
            </div>
        </div>
    </nav>

    <div class="container main-container">
        <!-- Toast Notification -->
        <div class="position-fixed bottom-0 end-0 p-3" style="z-index: 11">
            <div id="toastMessage" class="toast align-items-center text-white bg-success border-0" role="alert" aria-live="assertive" aria-atomic="true">
                <div class="d-flex">
                    <div class="toast-body" id="toastText">Action successful</div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
                </div>
            </div>
        </div>

        <div class="card">
            <div class="card-header d-flex justify-content-between align-items-center">
                <h5 class="mb-0 text-dark">Customer Directory <span class="badge bg-secondary ms-2" id="customerCount">0</span></h5>
                <div>
                    <button class="btn btn-light btn-sm me-2" onclick="loadCustomers()"><i class="bi bi-arrow-clockwise"></i> Refresh</button>
                    <button class="btn btn-primary btn-sm" onclick="openAddModal()"><i class="bi bi-person-plus-fill me-1"></i> Add Customer</button>
                </div>
            </div>
            <div class="card-body p-0">
                <div id="loading" class="loading-overlay">
                    <div class="spinner-border text-primary" role="status"></div>
                    <div class="mt-2 text-muted small">Loading customers...</div>
                </div>
                
                <div class="table-responsive">
                    <table class="table table-hover mb-0" id="customersTable" style="display:none;">
                        <thead>
                            <tr>
                                <th class="ps-4">Customer</th>
                                <th>Status</th>
                                <th>Added Date</th>
                                <th class="text-end pe-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="customerList">
                            <!-- Populated dynamically -->
                        </tbody>
                    </table>
                </div>
                
                <div id="emptyState" class="text-center py-5" style="display:none;">
                    <i class="bi bi-people text-muted" style="font-size: 3rem;"></i>
                    <h5 class="mt-3 text-dark">No customers found</h5>
                    <p class="text-muted">Get started by adding a new customer.</p>
                    <button class="btn btn-primary" onclick="openAddModal()">Add Your First Customer</button>
                </div>
            </div>
        </div>
    </div>

    <!-- Customer Modal -->
    <div class="modal fade" id="customerModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog">
            <div class="modal-content border-0 shadow">
                <div class="modal-header bg-light">
                    <h5 class="modal-title" id="modalTitle">Add New Customer</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <form id="customerForm">
                        <input type="hidden" id="customerId">
                        <div class="mb-3">
                            <label class="form-label text-muted small fw-bold">FIRST NAME</label>
                            <input type="text" class="form-control" id="customerName" required placeholder="e.g. Jane">
                        </div>
                        <div class="mb-3">
                            <label class="form-label text-muted small fw-bold">LAST NAME</label>
                            <input type="text" class="form-control" id="customerSurname" required placeholder="e.g. Doe">
                        </div>
                    </form>
                </div>
                <div class="modal-footer bg-light border-0">
                    <button type="button" class="btn btn-light" data-bs-dismiss="modal">Cancel</button>
                    <button type="button" class="btn btn-primary" onclick="saveCustomer()">Save Customer</button>
                </div>
            </div>
        </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div class="modal fade" id="deleteModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-sm">
            <div class="modal-content border-0 shadow">
                <div class="modal-body text-center p-4">
                    <i class="bi bi-exclamation-triangle-fill text-danger mb-3" style="font-size: 2.5rem;"></i>
                    <h5 class="mb-3">Delete Customer?</h5>
                    <p class="text-muted small">This action cannot be undone.</p>
                    <input type="hidden" id="deleteCustomerId">
                    <div class="d-flex justify-content-center mt-4">
                        <button type="button" class="btn btn-light me-2" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-danger" onclick="confirmDelete()">Delete</button>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        const BACKEND_URL = '/api/customers';
        let customerModal, deleteModal, toast;
        
        document.addEventListener('DOMContentLoaded', () => {
            customerModal = new bootstrap.Modal(document.getElementById('customerModal'));
            deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'));
            toast = new bootstrap.Toast(document.getElementById('toastMessage'));
            loadCustomers();
        });

        function showToast(message, isError = false) {
            const el = document.getElementById('toastMessage');
            el.className = 'toast align-items-center text-white border-0 ' + (isError ? 'bg-danger' : 'bg-success');
            document.getElementById('toastText').textContent = message;
            toast.show();
        }

        function getColors(name) {
            const hash = name.charCodeAt(0) % 5;
            const palettes = [
                {bg: '#0d6efd', c: '#fff'}, {bg: '#198754', c: '#fff'}, 
                {bg: '#dc3545', c: '#fff'}, {bg: '#6f42c1', c: '#fff'}, 
                {bg: '#fd7e14', c: '#fff'}
            ];
            return palettes[hash];
        }

        async function loadCustomers() {
            document.getElementById('loading').style.display = 'block';
            document.getElementById('customersTable').style.display = 'none';
            document.getElementById('emptyState').style.display = 'none';
            
            try {
                const res = await fetch(BACKEND_URL);
                const customers = await res.json();
                
                document.getElementById('customerCount').textContent = customers.length;
                
                if (customers.length === 0) {
                    document.getElementById('emptyState').style.display = 'block';
                } else {
                    const tbody = document.getElementById('customerList');
                    tbody.innerHTML = '';
                    
                    customers.forEach(c => {
                        const tr = document.createElement('tr');
                        const vColors = getColors(c.name);
                        const initials = (c.name[0] + c.surname[0]).toUpperCase();
                        const dateAdded = c.createdAt ? new Date(c.createdAt).toLocaleDateString() : 'Legacy';
                        const cId = c.id || (c.name + '-' + c.surname); // Fallback for old mock data
                        
                        tr.innerHTML = \`
                            <td class="ps-4">
                                <div class="d-flex align-items-center">
                                    <div class="avatar" style="background-color: \${vColors.bg};">\${initials}</div>
                                    <div>
                                        <div class="fw-bold text-dark">\${c.name} \${c.surname}</div>
                                        <div class="small text-muted">ID: \${cId}</div>
                                    </div>
                                </div>
                            </td>
                            <td><span class="badge rounded-pill bg-success bg-opacity-10 text-success border border-success">Active</span></td>
                            <td><span class="text-muted small">\${dateAdded}</span></td>
                            <td class="text-end pe-4">
                                \${c.id ? \`
                                <i class="bi bi-pencil-square action-icon" title="Edit" onclick="openEditModal('\${c.id}', '\${c.name}', '\${c.surname}')"></i>
                                <i class="bi bi-trash action-icon delete-icon" title="Delete" onclick="openDeleteModal('\${c.id}')"></i>
                                \` : '<span class="badge bg-secondary">Read-Only</span>'}
                            </td>
                        \`;
                        tbody.appendChild(tr);
                    });
                    document.getElementById('customersTable').style.display = 'table';
                }
            } catch (err) {
                showToast('Failed to load customers', true);
            } finally {
                document.getElementById('loading').style.display = 'none';
            }
        }

        function openAddModal() {
            document.getElementById('modalTitle').textContent = 'Add New Customer';
            document.getElementById('customerId').value = '';
            document.getElementById('customerName').value = '';
            document.getElementById('customerSurname').value = '';
            customerModal.show();
        }

        function openEditModal(id, name, surname) {
            document.getElementById('modalTitle').textContent = 'Edit Customer';
            document.getElementById('customerId').value = id;
            document.getElementById('customerName').value = name;
            document.getElementById('customerSurname').value = surname;
            customerModal.show();
        }

        function openDeleteModal(id) {
            document.getElementById('deleteCustomerId').value = id;
            deleteModal.show();
        }

        async function saveCustomer() {
            const id = document.getElementById('customerId').value;
            const name = document.getElementById('customerName').value;
            const surname = document.getElementById('customerSurname').value;
            
            if(!name || !surname) {
                showToast('Please fill all fields', true); return;
            }
            
            const method = id ? 'PUT' : 'POST';
            const url = id ? \`\${BACKEND_URL}/\${id}\` : BACKEND_URL;
            
            try {
                const res = await fetch(url, {
                    method: method,
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ name, surname })
                });
                
                if (res.ok) {
                    showToast(id ? 'Customer updated!' : 'Customer added!');
                    customerModal.hide();
                    loadCustomers();
                } else {
                    showToast('Failed to save', true);
                }
            } catch(e) {
                showToast('Connection error', true);
            }
        }

        async function confirmDelete() {
            const id = document.getElementById('deleteCustomerId').value;
            try {
                const res = await fetch(\`\${BACKEND_URL}/\${id}\`, { method: 'DELETE' });
                if (res.ok) {
                    showToast('Customer deleted');
                    deleteModal.hide();
                    loadCustomers();
                } else {
                    showToast('Failed to delete', true);
                }
            } catch(e) {
                showToast('Connection error', true);
            }
        }
    </script>
</body>
</html>
  `);
});

// Proxy API endpoints to backend
const targetUrl = EXTERNAL_BACKEND_URL;

app.get('/api/customers', async (req, res) => {
    try {
    const fetch = (await import('node-fetch')).default;
        const response = await fetch(targetUrl);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
        res.status(500).json({ error: 'Failed to fetch' });
  }
});

app.post('/api/customers', async (req, res) => {
  try {
    const fetch = (await import('node-fetch')).default;
      const response = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
        res.status(500).json({ error: 'Failed to add' });
    }
});

app.put('/api/customers/:id', async (req, res) => {
    try {
        const fetch = (await import('node-fetch')).default;
        const response = await fetch(`${targetUrl}/${req.params.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body)
        });
        const data = await response.json();
        res.status(response.status).json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update' });
    }
});

app.delete('/api/customers/:id', async (req, res) => {
    try {
        const fetch = (await import('node-fetch')).default;
        const response = await fetch(`${targetUrl}/${req.params.id}`, {
            method: 'DELETE'
        });
        const data = await response.json();
        res.status(response.status).json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete' });
    }
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`CRM Frontend server listening on port ${port}`);
});

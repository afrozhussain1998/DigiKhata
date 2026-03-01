// Main Application Controller
const app = {
    views: ['login', 'register', 'dashboard', 'customer-detail', 'expense'],
    currentView: null,
    activeCustomer: null,
    activeCustomerBalance: 0,
    customers: [],
    transactions: [],
    customerBalances: {}, // { custId: total }
    longPressTimer: null,

    // Helper: capitalize first letter of each word
    capitalize(str) {
        return str.replace(/\b\w/g, c => c.toUpperCase());
    },

    init() {
        this.bindEvents();

        // Check if logged in
        if (auth.isAuthenticated()) {
            this.showView('dashboard');
            this.loadDashboardData();
        } else {
            this.showView('login');
        }
    },

    showView(viewName) {
        this.views.forEach(v => {
            document.getElementById(`${v}-view`).classList.add('hidden');
        });
        document.getElementById(`${viewName}-view`).classList.remove('hidden');
        this.currentView = viewName;
    },

    bindEvents() {
        // Auth navigation
        document.getElementById('go-to-register').addEventListener('click', () => this.showView('register'));
        document.getElementById('go-to-login').addEventListener('click', () => this.showView('login'));
        document.getElementById('logout-btn').addEventListener('click', () => auth.logout());

        // Navigation inside App
        document.getElementById('nav-expenses').addEventListener('click', () => {
            this.showView('expense');
            this.loadExpenses();
        });
        document.getElementById('back-to-dashboard').addEventListener('click', () => this.showView('dashboard'));
        document.getElementById('back-from-expenses').addEventListener('click', () => this.showView('dashboard'));

        // Modals
        document.getElementById('btn-add-customer').addEventListener('click', () => {
            document.getElementById('modal-customer').classList.remove('hidden');
        });

        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.target.closest('.modal-overlay').classList.add('hidden');
                if (speech.isListening) speech.stop();
            });
        });

        // Customer detail actions
        const addTransBtn = (type) => {
            document.getElementById('trans-type').value = type;
            document.getElementById('trans-modal-title').textContent = type === 'Credit' ? 'Give Credit' : 'Payment Received';
            document.getElementById('modal-transaction').classList.remove('hidden');
            document.getElementById('trans-amount').value = '';
            document.getElementById('trans-desc').value = '';
            document.getElementById('voice-status').textContent = '';
        };

        document.getElementById('btn-add-credit').addEventListener('click', () => addTransBtn('Credit'));
        document.getElementById('btn-add-paid').addEventListener('click', () => addTransBtn('Paid'));

        // Forms
        document.getElementById('login-form').addEventListener('submit', this.handleLogin.bind(this));
        document.getElementById('register-form').addEventListener('submit', this.handleRegister.bind(this));
        document.getElementById('form-customer').addEventListener('submit', this.handleAddCustomer.bind(this));
        document.getElementById('form-edit-customer').addEventListener('submit', this.handleEditCustomer.bind(this));
        document.getElementById('form-transaction').addEventListener('submit', this.handleAddTransaction.bind(this));
        document.getElementById('form-edit-transaction').addEventListener('submit', this.handleEditTransaction.bind(this));
        document.getElementById('add-expense-form').addEventListener('submit', this.handleAddExpense.bind(this));
        document.getElementById('form-edit-expense').addEventListener('submit', this.handleEditExpense.bind(this));

        // Edit/Delete Customer Buttons in Detail View
        document.getElementById('btn-edit-customer').addEventListener('click', () => {
            if (this.activeCustomer) {
                document.getElementById('edit-cust-id').value = this.activeCustomer._id;
                document.getElementById('edit-cust-name').value = this.activeCustomer.name;
                document.getElementById('edit-cust-phone').value = this.activeCustomer.phone;
                document.getElementById('edit-cust-address').value = this.activeCustomer.address;
                document.getElementById('modal-edit-customer').classList.remove('hidden');
            }
        });

        document.getElementById('btn-delete-customer').addEventListener('click', () => {
            if (this.activeCustomer && confirm(`Are you sure you want to completely delete customer ${this.activeCustomer.name}?`)) {
                this.deleteEntity(this.activeCustomer._id, 'customer')
                    .then(() => {
                        this.showView('dashboard');
                    });
            }
        });



        // PDF and WhatsApp
        document.getElementById('btn-download-pdf').addEventListener('click', () => {
            pdfHandler.generateCustomerStatement(this.activeCustomer, this.transactions, this.activeCustomerBalance);
        });
        document.getElementById('btn-share-whatsapp').addEventListener('click', () => {
            whatsappHandler.shareCustomerStatement(this.activeCustomer, this.activeCustomerBalance);
        });

        // Global Keyboard Listeners
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (speech.isListening) speech.stop();

                const openModals = document.querySelectorAll('.modal-overlay:not(.hidden)');
                if (openModals.length > 0) {
                    openModals.forEach(m => m.classList.add('hidden'));
                    return;
                }

                if (this.currentView === 'customer-detail' || this.currentView === 'expense') {
                    this.showView('dashboard');
                }
            }
        });

        // Global Voice Assistant (Dashboard & Customer View)
        document.querySelectorAll('.btn-global-mic', '.mic-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (speech.isListening) {
                    speech.stop();
                } else {
                    speech.start(
                        (text) => {
                            components.showToast(`Dictated: "${text}"`, 'success');
                            this.handleGlobalVoiceIntent(text);
                        },
                        () => { btn.classList.add('listening'); components.showToast('Listening...', 'success'); },
                        () => { btn.classList.remove('listening'); },
                        () => { btn.classList.remove('listening'); components.showToast('Voice error', 'error'); }
                    );
                }
            });
        });
    },

    // --- Global Voice Intent Handler ---
    async handleGlobalVoiceIntent(text) {
        const parsed = speech.parseGlobalVoice(text);
        try {
            if (parsed.intent === 'add_expense') {
                if (!parsed.amount) throw new Error("Could not understand the amount.");
                await api.expenses.create({ description: parsed.description || 'Voice expense', amount: parsed.amount });
                components.showToast(`Expense of ₹${parsed.amount} added!`, 'success');
                if (this.currentView === 'expense') this.loadExpenses();
            } else if (parsed.intent === 'add_customer') {
                if (!parsed.name) throw new Error("Could not understand customer name.");
                const capitalName = this.capitalize(parsed.name);
                await api.customers.create({ name: capitalName, phone: parsed.phone, address: 'Added via Voice' });
                components.showToast(`Customer '${capitalName}' added!`, 'success');
                if (this.currentView === 'dashboard') this.loadDashboardData();
            } else if (parsed.intent === 'add_transaction') {
                if (!parsed.amount) throw new Error("Could not understand the amount.");

                const custNameLower = parsed.customerName ? parsed.customerName.toLowerCase().trim() : '';
                let matchedCustomer = null;

                if (custNameLower.length > 1) {
                    // 1. Direct includes match
                    matchedCustomer = this.customers.find(c =>
                        c.name.toLowerCase().includes(custNameLower) || custNameLower.includes(c.name.toLowerCase())
                    );

                    // 2. Fuzzy Levenshtein match fallback
                    if (!matchedCustomer) {
                        const getLevenshteinDistance = (a, b) => {
                            if (a.length === 0) return b.length;
                            if (b.length === 0) return a.length;
                            const matrix = [];
                            for (let i = 0; i <= b.length; i++) matrix[i] = [i];
                            for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
                            for (let i = 1; i <= b.length; i++) {
                                for (let j = 1; j <= a.length; j++) {
                                    if (b.charAt(i - 1) === a.charAt(j - 1)) {
                                        matrix[i][j] = matrix[i - 1][j - 1];
                                    } else {
                                        matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1));
                                    }
                                }
                            }
                            return matrix[b.length][a.length];
                        };

                        let bestMatch = null;
                        let minDistance = Infinity;
                        this.customers.forEach(c => {
                            const dist = getLevenshteinDistance(c.name.toLowerCase(), custNameLower);
                            if (dist < minDistance) {
                                minDistance = dist;
                                bestMatch = c;
                            }
                        });
                        // Allow up to 3 typos
                        if (bestMatch && minDistance <= 3) {
                            matchedCustomer = bestMatch;
                        }
                    }
                }

                // 3. Active Customer Fallback (when inside customer detail view)
                if (!matchedCustomer && this.currentView === 'customer-detail' && this.activeCustomer) {
                    matchedCustomer = this.activeCustomer;
                }

                if (!matchedCustomer) {
                    throw new Error(`Customer matching '${parsed.customerName || '(none)'}' not found.`);
                }

                const descToSave = parsed.description && parsed.description !== 'Added via Voice' ? parsed.description : 'Added via Voice';
                await api.transactions.create({
                    customer: matchedCustomer._id,
                    type: parsed.type,
                    amount: parsed.amount,
                    description: descToSave
                });
                const descLabel = descToSave !== 'Added via Voice' ? ` ${descToSave.toLowerCase()}` : '';
                components.showToast(`${parsed.type} of ₹${parsed.amount} added to ${matchedCustomer.name}${descLabel}!`, 'success');

                if (this.currentView === 'dashboard') this.loadDashboardData();
                else if (this.currentView === 'customer-detail' && this.activeCustomer._id === matchedCustomer._id) {
                    this.loadCustomerDetail(matchedCustomer._id);
                }
            } else {
                components.showToast("Could not recognize intent. Try 'Add expense 50' or 'Give credit 100 to John'", 'error');
            }
        } catch (err) {
            components.showToast(err.message, 'error');
        }
    },

    // --- Handlers ---
    async handleLogin(e) {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        try {
            const res = await api.auth.login({ email, password });
            auth.setAuth(res);
            this.showView('dashboard');
            this.loadDashboardData();
            document.getElementById('login-form').reset();
        } catch (err) {
            components.showToast(err.message);
        }
    },

    async handleRegister(e) {
        e.preventDefault();
        const name = document.getElementById('reg-name').value;
        const email = document.getElementById('reg-email').value;
        const password = document.getElementById('reg-password').value;

        try {
            const res = await api.auth.register({ name, email, password });
            auth.setAuth(res);
            this.showView('dashboard');
            this.loadDashboardData();
            document.getElementById('register-form').reset();
        } catch (err) {
            components.showToast(err.message);
        }
    },

    async handleAddCustomer(e) {
        e.preventDefault();
        const data = {
            name: this.capitalize(document.getElementById('cust-name').value.trim()),
            phone: document.getElementById('cust-phone').value,
            address: document.getElementById('cust-address').value
        };

        try {
            await api.customers.create(data);
            document.getElementById('modal-customer').classList.add('hidden');
            document.getElementById('form-customer').reset();
            components.showToast(`Added new customer '${data.name}'`, 'success');
            this.loadDashboardData();
        } catch (err) {
            components.showToast(err.message);
        }
    },

    async handleEditCustomer(e) {
        e.preventDefault();
        const id = document.getElementById('edit-cust-id').value;
        const data = {
            name: document.getElementById('edit-cust-name').value,
            phone: document.getElementById('edit-cust-phone').value,
            address: document.getElementById('edit-cust-address').value
        };

        try {
            await api.customers.update(id, data);
            document.getElementById('modal-edit-customer').classList.add('hidden');
            components.showToast('Customer updated successfully', 'success');

            // Reload dashboard data in background to update list, and refresh detail view
            this.loadDashboardData();
            this.loadCustomerDetail(id);
        } catch (err) {
            components.showToast(err.message);
        }
    },

    async handleAddTransaction(e) {
        e.preventDefault();
        const data = {
            customer: this.activeCustomer._id,
            type: document.getElementById('trans-type').value,
            amount: document.getElementById('trans-amount').value,
            description: document.getElementById('trans-desc').value
        };

        try {
            await api.transactions.create(data);
            document.getElementById('modal-transaction').classList.add('hidden');
            let contextStr = data.type === 'Credit' ? 'gave' : 'received';
            components.showToast(`Successfully ${contextStr} ₹${data.amount} ${data.type === 'Credit' ? 'to' : 'from'} ${this.activeCustomer.name}${data.description ? ' for ' + data.description : ''}`, 'success');

            // Refresh details
            this.loadCustomerDetail(this.activeCustomer._id);
        } catch (err) {
            components.showToast(err.message);
        }
    },

    async handleEditTransaction(e) {
        e.preventDefault();
        const id = document.getElementById('edit-trans-id').value;
        const type = document.getElementById('edit-trans-type').value;
        const amount = document.getElementById('edit-trans-amount').value;
        const description = document.getElementById('edit-trans-desc').value;

        try {
            await api.transactions.update(id, { type, amount, description });
            components.showToast(`Updated transaction to ₹${amount} for ${this.activeCustomer.name}`, 'success');
            document.getElementById('modal-edit-transaction').classList.add('hidden');
            this.loadCustomerDetail(this.activeCustomer._id);
        } catch (err) {
            components.showToast(err.message, 'error');
        }
    },

    async handleAddExpense(e) {
        e.preventDefault();
        const data = {
            description: document.getElementById('expense-desc').value,
            amount: document.getElementById('expense-amt').value
        };

        try {
            await api.expenses.create(data);
            document.getElementById('add-expense-form').reset();
            components.showToast('Expense added successfully', 'success');
            this.loadExpenses();
        } catch (err) {
            components.showToast(err.message);
        }
    },

    async handleEditExpense(e) {
        e.preventDefault();
        const id = document.getElementById('edit-exp-id').value;
        const amount = document.getElementById('edit-exp-amount').value;
        const description = document.getElementById('edit-exp-desc').value;

        try {
            await api.expenses.update(id, { amount, description });
            components.showToast(`Updated expense to ₹${amount}`, 'success');
            document.getElementById('modal-edit-expense').classList.add('hidden');
            this.loadExpenses();
        } catch (err) {
            components.showToast(err.message, 'error');
        }
    },

    // --- Data Loading ---
    async loadDashboardData() {
        document.getElementById('user-name-display').textContent = `Hello, ${auth.user.name}`;
        try {
            const resCustomers = await api.customers.getAll();
            this.customers = resCustomers.data;

            // Needs a smarter query in real app, but for SPA we'll fetch all transactions manually for the balance sum, or dummy logic.
            // Easiest is to lazily load and cache, but for small scale, we'll fetch all transactions per customer or implement an endpoint.
            // For now, we simulate dashboard calculations by setting all to 0 until detail view clicked (simplification).
            this.renderCustomerList();

            // NOTE: In a full app, we need an aggregate endpoint. To avoid N+1 requests here:
            // We will leave balances blank or 0 in dashboard until visited, OR just load them for simplicity if count < 20.
            let totalCredit = 0; let totalPaid = 0;
            for (const cust of this.customers) {
                const tRes = await api.transactions.getByCustomer(cust._id);
                const trans = tRes.data;
                let cBal = 0;
                trans.forEach(t => {
                    if (t.type === 'Credit') { cBal += t.amount; totalCredit += t.amount; }
                    else { cBal -= t.amount; totalPaid += t.amount; }
                });
                this.customerBalances[cust._id] = { total: cBal, status: cBal === 0 ? 'Settled' : '' };
            }

            this.renderCustomerList(); // re-render with balances
            document.getElementById('total-credit').textContent = `₹ ${totalCredit}`;
            document.getElementById('total-paid').textContent = `₹ ${totalPaid}`;

            // Total Balance = Credits given out - Payments received back
            const totalBalance = totalCredit - totalPaid;
            const balEl = document.getElementById('total-balance');
            balEl.textContent = `₹ ${Math.abs(totalBalance)}`;
            balEl.className = `amount ${totalBalance > 0 ? 'negative' : (totalBalance < 0 ? 'positive' : 'text-muted')}`;

        } catch (err) {
            if (err.message.includes('Not authorized')) auth.logout();
        }
    },

    renderCustomerList() {
        const container = document.getElementById('customer-list');
        container.innerHTML = '';

        if (this.customers.length === 0) {
            container.innerHTML = '<p class="text-muted" style="text-align:center; margin-top: 2rem;">No customers found. Add your first customer!</p>';
            return;
        }

        this.customers.forEach(c => {
            const el = document.createElement('div');
            el.innerHTML = components.renderCustomerItem(c, this.customerBalances).trim();
            const card = el.firstChild;

            // Bind click and long press
            card.addEventListener('click', (e) => {
                if (!card.classList.contains('long-pressing')) {
                    this.loadCustomerDetail(c._id);
                }
            });

            // Long press delete
            card.addEventListener('mousedown', () => this.startLongPress(card, c._id, 'customer'));
            card.addEventListener('touchstart', () => this.startLongPress(card, c._id, 'customer'), { passive: true });
            card.addEventListener('mouseup', () => this.cancelLongPress(card));
            card.addEventListener('mouseleave', () => this.cancelLongPress(card));
            card.addEventListener('touchend', () => this.cancelLongPress(card));

            container.appendChild(card);
        });
    },

    startLongPress(element, id, type) {
        this.longPressTimer = setTimeout(() => {
            element.classList.add('long-pressing');
            if (confirm(`Delete this ${type}?`)) {
                this.deleteEntity(id, type);
            }
            setTimeout(() => element.classList.remove('long-pressing'), 500);
        }, 800);
    },

    cancelLongPress(element) {
        clearTimeout(this.longPressTimer);
        element.classList.remove('long-pressing');
    },

    async deleteEntity(id, type) {
        try {
            if (type === 'customer') {
                await api.customers.delete(id);
                this.loadDashboardData();
                components.showToast('Customer deleted');
            } else if (type === 'transaction') {
                await api.transactions.delete(id);
                components.showToast(`Transaction deleted for ${this.activeCustomer.name}`, 'success');
                this.loadCustomerDetail(this.activeCustomer._id);
            } else if (type === 'expense') {
                await api.expenses.delete(id);
                this.loadExpenses();
            }
        } catch (err) {
            components.showToast(err.message);
        }
    },

    async loadCustomerDetail(id) {
        this.activeCustomer = this.customers.find(c => c._id === id);
        document.getElementById('detail-customer-name').textContent = this.activeCustomer.name;
        document.getElementById('detail-customer-id').textContent = this.activeCustomer.customerId;

        try {
            const res = await api.transactions.getByCustomer(id);
            this.transactions = res.data;

            let balance = 0;
            const tContainer = document.getElementById('transaction-list');
            tContainer.innerHTML = '';

            if (this.transactions.length === 0) {
                tContainer.innerHTML = '<p class="text-muted" style="text-align:center; margin-top: 2rem;">No transactions yet.</p>';
            } else {
                this.transactions.forEach(t => {
                    if (t.type === 'Credit') balance += t.amount;
                    else balance -= t.amount;

                    const el = document.createElement('div');
                    el.innerHTML = components.renderTransactionItem(t).trim();
                    const item = el.firstChild;

                    const btnEdit = item.querySelector('.btn-edit-trans');
                    if (btnEdit) {
                        btnEdit.addEventListener('click', (e) => {
                            e.stopPropagation();
                            document.getElementById('edit-trans-id').value = t._id;
                            document.getElementById('edit-trans-type').value = t.type;
                            document.getElementById('edit-trans-amount').value = t.amount;
                            document.getElementById('edit-trans-desc').value = t.description || '';
                            document.getElementById('modal-edit-transaction').classList.remove('hidden');
                        });
                    }
                    const btnDel = item.querySelector('.btn-del-trans');
                    if (btnDel) {
                        btnDel.addEventListener('click', (e) => {
                            e.stopPropagation();
                            if (confirm(`Are you sure you want to delete this ${t.type} transaction of ₹${t.amount}?`)) {
                                this.deleteEntity(t._id, 'transaction');
                            }
                        });
                    }

                    tContainer.appendChild(item);
                });
            }

            this.activeCustomerBalance = balance;
            const balEl = document.getElementById('detail-balance');
            const statEl = document.getElementById('detail-balance-status');

            balEl.textContent = `₹ ${Math.abs(balance)}`;
            // Credit balance (>0) = Red (they owe you), Advance (<0) = Green, Settled = Muted
            balEl.className = `amount ${balance > 0 ? 'negative' : (balance < 0 ? 'positive' : 'text-muted')}`;
            statEl.textContent = balance > 0 ? 'To Collect' : (balance < 0 ? 'Advance Paid' : 'Settled');

            this.showView('customer-detail');
        } catch (err) {
            components.showToast(err.message);
        }
    },

    async loadExpenses() {
        try {
            const res = await api.expenses.getAll();
            const expenses = res.data;

            let total = 0;
            const container = document.getElementById('expense-list');
            container.innerHTML = '';

            if (expenses.length === 0) {
                container.innerHTML = '<p class="text-muted" style="text-align:center; margin-top: 2rem;">No expenses today.</p>';
            } else {
                expenses.forEach(e => {
                    total += e.amount;
                    const el = document.createElement('div');
                    el.innerHTML = components.renderExpenseItem(e).trim();
                    const item = el.firstChild;

                    const btnEditExp = item.querySelector('.btn-edit-exp');
                    if (btnEditExp) {
                        btnEditExp.addEventListener('click', (ev) => {
                            ev.stopPropagation();
                            document.getElementById('edit-exp-id').value = e._id;
                            document.getElementById('edit-exp-amount').value = e.amount;
                            document.getElementById('edit-exp-desc').value = e.description || '';
                            document.getElementById('modal-edit-expense').classList.remove('hidden');
                        });
                    }
                    const btnDelExp = item.querySelector('.btn-del-exp');
                    if (btnDelExp) {
                        btnDelExp.addEventListener('click', (ev) => {
                            ev.stopPropagation();
                            if (confirm(`Are you sure you want to delete this expense of ₹${e.amount}?`)) {
                                this.deleteEntity(e._id, 'expense');
                            }
                        });
                    }

                    container.appendChild(item);
                });
            }

            document.getElementById('expense-total').textContent = `Total: ₹ ${total}`;
        } catch (err) {
            components.showToast(err.message);
        }
    }
};

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});

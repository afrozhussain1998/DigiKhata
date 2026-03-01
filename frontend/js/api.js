// const API_URL = 'http://localhost:5000/api';
const API_URL = 'https://digikhata-backend.onrender.com/api';

const api = {
    // Utility for standard requests
    async request(endpoint, options = {}) {
        const token = localStorage.getItem('DigiKhata_token');

        const headers = {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
            ...options.headers
        };

        try {
            const response = await fetch(`${API_URL}${endpoint}`, {
                ...options,
                headers
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Something went wrong');
            }

            return data;
        } catch (error) {
            throw error;
        }
    },

    // Auth Methods
    auth: {
        login: (credentials) => api.request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
        register: (userData) => api.request('/auth/register', { method: 'POST', body: JSON.stringify(userData) }),
        getMe: () => api.request('/auth/me')
    },

    // Customer Methods
    customers: {
        getAll: () => api.request('/customers'),
        getOne: (id) => api.request(`/customers/${id}`),
        create: (data) => api.request('/customers', { method: 'POST', body: JSON.stringify(data) }),
        update: (id, data) => api.request(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
        delete: (id) => api.request(`/customers/${id}`, { method: 'DELETE' })
    },

    // Transaction Methods
    transactions: {
        getByCustomer: (customerId) => api.request(`/transactions/customer/${customerId}`),
        create: (data) => api.request('/transactions', { method: 'POST', body: JSON.stringify(data) }),
        update: (id, data) => api.request(`/transactions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
        delete: (id) => api.request(`/transactions/${id}`, { method: 'DELETE' })
    },

    // Expense Methods
    expenses: {
        getAll: () => api.request('/expenses'),
        create: (data) => api.request('/expenses', { method: 'POST', body: JSON.stringify(data) }),
        update: (id, data) => api.request(`/expenses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
        delete: (id) => api.request(`/expenses/${id}`, { method: 'DELETE' })
    }
};

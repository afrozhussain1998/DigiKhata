// Auth State Module
const auth = {
    user: null,

    init() {
        this.user = JSON.parse(localStorage.getItem('DigiKhata_user') || 'null');
    },

    setAuth(data) {
        localStorage.setItem('DigiKhata_token', data.token);
        localStorage.setItem('DigiKhata_user', JSON.stringify(data.user));
        this.user = data.user;
    },

    logout() {
        localStorage.removeItem('DigiKhata_token');
        localStorage.removeItem('DigiKhata_user');
        this.user = null;
        app.showView('login');
    },

    isAuthenticated() {
        return !!localStorage.getItem('DigiKhata_token');
    }
};

auth.init();

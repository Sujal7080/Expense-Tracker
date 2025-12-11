class ExpenseTracker {
    constructor() {
        this.transactions = JSON.parse(localStorage.getItem('transactions')) || [];
        this.budget = parseFloat(localStorage.getItem('monthlyBudget')) || 0;
        this.expenseChart = null;
        this.trendChart = null;
        this.init();
    }

    init() {
        this.bindEvents();
        this.setCurrentDate();
        this.populateCategoryFilter();
        this.updateDisplay();
        this.initCharts();
    }

    bindEvents() {
        const form = document.getElementById('transactionForm');
        const setBudgetBtn = document.getElementById('setBudget');
        const clearAllBtn = document.getElementById('clearAll');
        const filterType = document.getElementById('filterType');
        const filterCategory = document.getElementById('filterCategory');

        form.addEventListener('submit', (e) => this.addTransaction(e));
        setBudgetBtn.addEventListener('click', () => this.setBudget());
        clearAllBtn.addEventListener('click', () => this.clearAllTransactions());
        filterType.addEventListener('change', () => this.filterTransactions());
        filterCategory.addEventListener('change', () => this.filterTransactions());
    }

    setCurrentDate() {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('date').value = today;
    }

    populateCategoryFilter() {
        const categories = [...new Set(this.transactions.map(t => t.category))];
        const filterSelect = document.getElementById('filterCategory');
        
        // Clear existing options except "All Categories"
        filterSelect.innerHTML = '<option value="all">All Categories</option>';
        
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = this.getCategoryDisplay(category);
            filterSelect.appendChild(option);
        });
    }

    getCategoryDisplay(category) {
        const categoryMap = {
            food: '🍔 Food',
            transport: '🚗 Transport',
            entertainment: '🎬 Entertainment',
            shopping: '🛍️ Shopping',
            bills: '💡 Bills',
            health: '🏥 Health',
            education: '📚 Education',
            salary: '💼 Salary',
            freelance: '💻 Freelance',
            other: '📦 Other'
        };
        return categoryMap[category] || category;
    }

    addTransaction(e) {
        e.preventDefault();
        
        const description = document.getElementById('description').value.trim();
        const amount = parseFloat(document.getElementById('amount').value);
        const category = document.getElementById('category').value;
        const type = document.getElementById('type').value;
        const date = document.getElementById('date').value;

        if (!description || !amount || !category || !type || !date) {
            alert('Please fill in all fields');
            return;
        }

        const transaction = {
            id: Date.now(),
            description,
            amount: type === 'expense' ? -Math.abs(amount) : Math.abs(amount),
            category,
            type,
            date,
            createdAt: new Date().toISOString()
        };

        this.transactions.unshift(transaction);
        this.saveTransactions();
        this.updateDisplay();
        this.populateCategoryFilter();
        
        // Reset form
        document.getElementById('transactionForm').reset();
        this.setCurrentDate();
    }

    deleteTransaction(id) {
        if (confirm('Are you sure you want to delete this transaction?')) {
            this.transactions = this.transactions.filter(t => t.id !== id);
            this.saveTransactions();
            this.updateDisplay();
            this.populateCategoryFilter();
        }
    }

    setBudget() {
        const budgetInput = document.getElementById('budgetAmount');
        const amount = parseFloat(budgetInput.value);

        if (!amount || amount <= 0) {
            alert('Please enter a valid budget amount');
            return;
        }

        this.budget = amount;
        localStorage.setItem('monthlyBudget', amount.toString());
        this.updateBudgetDisplay();
        budgetInput.value = '';
    }

    clearAllTransactions() {
        if (confirm('Are you sure you want to delete all transactions? This cannot be undone.')) {
            this.transactions = [];
            this.saveTransactions();
            this.updateDisplay();
            this.populateCategoryFilter();
        }
    }

    filterTransactions() {
        const typeFilter = document.getElementById('filterType').value;
        const categoryFilter = document.getElementById('filterCategory').value;
        
        let filtered = this.transactions;

        if (typeFilter !== 'all') {
            filtered = filtered.filter(t => t.type === typeFilter);
        }

        if (categoryFilter !== 'all') {
            filtered = filtered.filter(t => t.category === categoryFilter);
        }

        this.displayTransactions(filtered);
    }

    updateDisplay() {
        this.updateSummaryCards();
        this.updateBudgetDisplay();
        this.displayTransactions(this.transactions);
        this.updateCharts();
    }

    updateSummaryCards() {
        const income = this.transactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);

        const expenses = Math.abs(this.transactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0));

        const balance = income - expenses;

        document.getElementById('totalIncome').textContent = `$${income.toFixed(2)}`;
        document.getElementById('totalExpenses').textContent = `$${expenses.toFixed(2)}`;
        document.getElementById('balance').textContent = `$${balance.toFixed(2)}`;

        // Update balance card color based on positive/negative
        const balanceCard = document.querySelector('.card.balance');
        if (balance < 0) {
            balanceCard.style.background = 'linear-gradient(135deg, #e17055, #fd79a8)';
        } else {
            balanceCard.style.background = 'linear-gradient(135deg, #6c5ce7, #a29bfe)';
        }
    }

    updateBudgetDisplay() {
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        
        const monthlyExpenses = Math.abs(this.transactions
            .filter(t => {
                const transactionDate = new Date(t.date);
                return t.type === 'expense' && 
                       transactionDate.getMonth() === currentMonth &&
                       transactionDate.getFullYear() === currentYear;
            })
            .reduce((sum, t) => sum + t.amount, 0));

        const progressFill = document.getElementById('progressFill');
        const budgetStatus = document.getElementById('budgetStatus');

        if (this.budget > 0) {
            const percentage = (monthlyExpenses / this.budget) * 100;
            progressFill.style.width = `${Math.min(percentage, 100)}%`;
            
            if (percentage > 100) {
                progressFill.classList.add('over-budget');
                budgetStatus.textContent = `Over budget by $${(monthlyExpenses - this.budget).toFixed(2)}`;
                budgetStatus.style.color = '#e17055';
            } else {
                progressFill.classList.remove('over-budget');
                const remaining = this.budget - monthlyExpenses;
                budgetStatus.textContent = `$${remaining.toFixed(2)} remaining of $${this.budget.toFixed(2)}`;
                budgetStatus.style.color = '#00b894';
            }
        } else {
            progressFill.style.width = '0%';
            budgetStatus.textContent = 'No budget set';
            budgetStatus.style.color = '#636e72';
        }
    }

    displayTransactions(transactions) {
        const container = document.getElementById('transactionsList');

        if (transactions.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>No transactions found</p>
                </div>
            `;
            return;
        }

        container.innerHTML = transactions.map(transaction => `
            <div class="transaction-item">
                <div class="transaction-info">
                    <div class="transaction-description">${this.escapeHtml(transaction.description)}</div>
                    <div class="transaction-details">
                        ${this.getCategoryDisplay(transaction.category)} • ${new Date(transaction.date).toLocaleDateString()}
                    </div>
                </div>
                <div class="transaction-amount ${transaction.type}">
                    ${transaction.type === 'income' ? '+' : ''}$${Math.abs(transaction.amount).toFixed(2)}
                </div>
                <button class="delete-btn" onclick="expenseTracker.deleteTransaction(${transaction.id})">
                    Delete
                </button>
            </div>
        `).join('');
    }

    initCharts() {
        this.initExpenseChart();
        this.initTrendChart();
    }

    initExpenseChart() {
        const ctx = document.getElementById('expenseChart').getContext('2d');
        
        this.expenseChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: [
                        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
                        '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF',
                        '#4BC0C0', '#FF6384'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    initTrendChart() {
        const ctx = document.getElementById('trendChart').getContext('2d');
        
        this.trendChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Expenses',
                    data: [],
                    borderColor: '#e17055',
                    backgroundColor: 'rgba(225, 112, 85, 0.1)',
                    tension: 0.4
                }, {
                    label: 'Income',
                    data: [],
                    borderColor: '#00b894',
                    backgroundColor: 'rgba(0, 184, 148, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    updateCharts() {
        this.updateExpenseChart();
        this.updateTrendChart();
    }

    updateExpenseChart() {
        const expenses = this.transactions.filter(t => t.type === 'expense');
        const categoryTotals = {};

        expenses.forEach(transaction => {
            const category = transaction.category;
            categoryTotals[category] = (categoryTotals[category] || 0) + Math.abs(transaction.amount);
        });

        const labels = Object.keys(categoryTotals).map(cat => this.getCategoryDisplay(cat));
        const data = Object.values(categoryTotals);

        this.expenseChart.data.labels = labels;
        this.expenseChart.data.datasets[0].data = data;
        this.expenseChart.update();
    }

    updateTrendChart() {
        // Get last 6 months of data
        const months = [];
        const incomeData = [];
        const expenseData = [];

        for (let i = 5; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const monthYear = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
            months.push(monthYear);

            const monthTransactions = this.transactions.filter(t => {
                const transactionDate = new Date(t.date);
                return transactionDate.getMonth() === date.getMonth() &&
                       transactionDate.getFullYear() === date.getFullYear();
            });

            const monthIncome = monthTransactions
                .filter(t => t.type === 'income')
                .reduce((sum, t) => sum + t.amount, 0);

            const monthExpenses = Math.abs(monthTransactions
                .filter(t => t.type === 'expense')
                .reduce((sum, t) => sum + t.amount, 0));

            incomeData.push(monthIncome);
            expenseData.push(monthExpenses);
        }

        this.trendChart.data.labels = months;
        this.trendChart.data.datasets[0].data = expenseData;
        this.trendChart.data.datasets[1].data = incomeData;
        this.trendChart.update();
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    saveTransactions() {
        localStorage.setItem('transactions', JSON.stringify(this.transactions));
    }
}

// Initialize the expense tracker
const expenseTracker = new ExpenseTracker();
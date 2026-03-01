// UI Component Rendering Module

const formatCurrency = (amount) => `₹ ${parseFloat(amount).toLocaleString('en-IN')}`;
const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) + ' ' +
    date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
};

const components = {
  renderCustomerItem(customer, balanceData) {
    const balInfo = balanceData[customer._id] || { total: 0, status: 'Settled' };
    // Credit balance (>0) = Red (you're owed), Paid excess (<0) = Green (advance), 0 = Muted
    const balClass = balInfo.total > 0 ? 'negative' : (balInfo.total < 0 ? 'positive' : 'text-muted');
    const displayBal = balInfo.total === 0 ? 'Settled' :
      `${formatCurrency(Math.abs(balInfo.total))}`;

    return `
      <div class="list-item customer-card" data-id="${customer._id}">
        <div class="list-item-main">
          <h4>${customer.name}</h4>
          <span class="list-item-sub">${customer.customerId}</span>
        </div>
        <div class="list-item-right text-right">
          <p class="amount ${balClass}">${displayBal}</p>
        </div>
      </div>
    `;
  },

  renderTransactionItem(transaction) {
    const isCredit = transaction.type === 'Credit';
    // Credit Given = Red (money going out), Payment Received = Green (money coming in)
    const amountClass = isCredit ? 'negative' : 'positive';
    const icon = isCredit ? 'fa-arrow-down' : 'fa-arrow-up';
    const label = isCredit ? 'Credit Given' : 'Payment Received';

    return `
      <div class="list-item transaction-item" data-id="${transaction._id}" style="align-items: center;">
        <div class="list-item-main" style="flex: 1;">
          <h4 style="font-size: 0.95rem;">
            <i class="fa-solid ${icon} ${amountClass}" style="margin-right:0.5rem"></i>
            ${label}
          </h4>
          ${transaction.description ? `<span class="list-item-sub">${transaction.description}</span><br>` : ''}
          <span class="list-item-sub" style="font-size:0.7rem;">${formatDate(transaction.createdAt)}</span>
        </div>
        <div class="list-item-right" style="text-align: right; min-width: 80px;">
          <p class="amount ${amountClass}" style="margin-bottom: 5px;">${isCredit ? '+' : '-'}${formatCurrency(transaction.amount)}</p>
          <div class="transaction-actions" style="display: flex; flex-direction: row; gap: 8px; justify-content: flex-end; margin-top: 5px;">
             <button class="icon-btn btn-edit-trans" data-id="${transaction._id}" style="font-size: 0.9rem; color: #ffc107; padding: 4px;" title="Edit Transaction"><i class="fa-solid fa-pen"></i></button>
             <button class="icon-btn btn-del-trans" data-id="${transaction._id}" style="font-size: 0.9rem; color: #f83a3a; padding: 4px;" title="Delete Transaction"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>
      </div>
    `;
  },

  renderExpenseItem(expense) {
    return `
      <div class="list-item expense-item" data-id="${expense._id}">
        <div class="list-item-main" style="flex:1;">
          <h4>${expense.description}</h4>
          <span class="list-item-sub" style="font-size:0.7rem;">${formatDate(expense.date || expense.createdAt)}</span>
        </div>
        <div class="list-item-right" style="text-align: right; min-width: 80px;">
          <p class="amount negative" style="margin-bottom: 5px;">${formatCurrency(expense.amount)}</p>
          <div class="expense-actions" style="display: flex; flex-direction: row; gap: 8px; justify-content: flex-end; margin-top: 5px;">
             <button class="icon-btn btn-edit-exp" data-id="${expense._id}" style="font-size: 0.9rem; color: #ffc107; padding: 4px;" title="Edit Expense"><i class="fa-solid fa-pen"></i></button>
             <button class="icon-btn btn-del-exp" data-id="${expense._id}" style="font-size: 0.9rem; color: #f83a3a; padding: 4px;" title="Delete Expense"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>
      </div>
    `;
  },

  showToast(message, type = 'error') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type}`;

    setTimeout(() => {
      toast.classList.add('hidden');
    }, 3000);
  }
};

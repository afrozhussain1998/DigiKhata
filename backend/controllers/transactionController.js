const Transaction = require('../models/Transaction');
const Customer = require('../models/Customer');

// @desc    Get all transactions for a customer
// @route   GET /api/transactions/customer/:customerId
// @access  Private
exports.getTransactions = async (req, res) => {
    try {
        const transactions = await Transaction.find({
            customer: req.params.customerId,
            user: req.user.id
        }).sort('createdAt');

        res.status(200).json({ success: true, count: transactions.length, data: transactions });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Add transaction
// @route   POST /api/transactions
// @access  Private
exports.addTransaction = async (req, res) => {
    try {
        req.body.user = req.user.id;

        // Verify customer exists and belongs to user
        const customer = await Customer.findOne({ _id: req.body.customer, user: req.user.id });

        if (!customer) {
            return res.status(404).json({ success: false, error: 'Customer not found' });
        }

        const transaction = await Transaction.create(req.body);

        res.status(201).json({ success: true, data: transaction });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Update transaction
// @route   PUT /api/transactions/:id
// @access  Private
exports.updateTransaction = async (req, res) => {
    try {
        let transaction = await Transaction.findOne({ _id: req.params.id, user: req.user.id });

        if (!transaction) {
            return res.status(404).json({ success: false, error: 'Transaction not found' });
        }

        transaction = await Transaction.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        res.status(200).json({ success: true, data: transaction });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Delete transaction
// @route   DELETE /api/transactions/:id
// @access  Private
exports.deleteTransaction = async (req, res) => {
    try {
        const transaction = await Transaction.findOne({ _id: req.params.id, user: req.user.id });

        if (!transaction) {
            return res.status(404).json({ success: false, error: 'Transaction not found' });
        }

        await transaction.deleteOne();

        res.status(200).json({ success: true, data: {} });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

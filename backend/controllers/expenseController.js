const Expense = require('../models/Expense');

// @desc    Get all daily expenses
// @route   GET /api/expenses
// @access  Private
exports.getExpenses = async (req, res) => {
    try {
        // Optional: filter by date if needed (e.g. ?date=YYYY-MM-DD)
        let query = { user: req.user.id };

        if (req.query.date) {
            const startOfDay = new Date(req.query.date);
            startOfDay.setHours(0, 0, 0, 0);

            const endOfDay = new Date(req.query.date);
            endOfDay.setHours(23, 59, 59, 999);

            query.date = { $gte: startOfDay, $lte: endOfDay };
        }

        const expenses = await Expense.find(query).sort('-date');

        res.status(200).json({ success: true, count: expenses.length, data: expenses });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Add expense
// @route   POST /api/expenses
// @access  Private
exports.addExpense = async (req, res) => {
    try {
        req.body.user = req.user.id;
        const expense = await Expense.create(req.body);
        res.status(201).json({ success: true, data: expense });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Update expense
// @route   PUT /api/expenses/:id
// @access  Private
exports.updateExpense = async (req, res) => {
    try {
        let expense = await Expense.findOne({ _id: req.params.id, user: req.user.id });

        if (!expense) {
            return res.status(404).json({ success: false, error: 'Expense not found' });
        }

        expense = await Expense.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        res.status(200).json({ success: true, data: expense });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Delete expense
// @route   DELETE /api/expenses/:id
// @access  Private
exports.deleteExpense = async (req, res) => {
    try {
        const expense = await Expense.findOne({ _id: req.params.id, user: req.user.id });

        if (!expense) {
            return res.status(404).json({ success: false, error: 'Expense not found' });
        }

        await expense.deleteOne();

        res.status(200).json({ success: true, data: {} });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

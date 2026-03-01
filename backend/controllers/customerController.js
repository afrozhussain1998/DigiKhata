const Customer = require('../models/Customer');

// Helper to generate unique incremental ID (starting from CUST-0010)
const generateCustomerId = async () => {
    const lastCustomer = await Customer.findOne({}, { customerId: 1 })
        .sort({ customerId: -1 })
        .lean();

    if (!lastCustomer || !lastCustomer.customerId) {
        return 'CUST-0010';
    }

    // Extract the numeric portion, increment, and pad
    const lastNum = parseInt(lastCustomer.customerId.replace('CUST-', ''), 10);
    const nextNum = (isNaN(lastNum) ? 9 : lastNum) + 1;
    return `CUST-${String(nextNum).padStart(4, '0')}`;
};

// @desc    Get all customers for a user
// @route   GET /api/customers
// @access  Private
exports.getCustomers = async (req, res) => {
    try {
        const customers = await Customer.find({ user: req.user.id }).sort('-createdAt');
        res.status(200).json({ success: true, count: customers.length, data: customers });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Get single customer
// @route   GET /api/customers/:id
// @access  Private
exports.getCustomer = async (req, res) => {
    try {
        const customer = await Customer.findOne({ _id: req.params.id, user: req.user.id });
        if (!customer) {
            return res.status(404).json({ success: false, error: 'Customer not found' });
        }
        res.status(200).json({ success: true, data: customer });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Create new customer
// @route   POST /api/customers
// @access  Private
exports.createCustomer = async (req, res) => {
    try {
        req.body.user = req.user.id;
        req.body.customerId = await generateCustomerId();

        const customer = await Customer.create(req.body);

        res.status(201).json({ success: true, data: customer });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Update customer
// @route   PUT /api/customers/:id
// @access  Private
exports.updateCustomer = async (req, res) => {
    try {
        let customer = await Customer.findOne({ _id: req.params.id, user: req.user.id });

        if (!customer) {
            return res.status(404).json({ success: false, error: 'Customer not found' });
        }

        customer = await Customer.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        res.status(200).json({ success: true, data: customer });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Delete customer
// @route   DELETE /api/customers/:id
// @access  Private
exports.deleteCustomer = async (req, res) => {
    try {
        const customer = await Customer.findOne({ _id: req.params.id, user: req.user.id });

        if (!customer) {
            return res.status(404).json({ success: false, error: 'Customer not found' });
        }

        await customer.deleteOne();

        res.status(200).json({ success: true, data: {} });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

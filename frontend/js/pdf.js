// jsPDF wrapper for generating balance sheet PDF
const pdfHandler = {
    generateCustomerStatement(customer, transactions, currentBalance) {
        if (!window.jspdf) {
            components.showToast('PDF Library not loaded');
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Shop Info
        doc.setFontSize(20);
        doc.setTextColor(138, 43, 226); // Primary color
        doc.text('DigiKhata Statement', 14, 22);

        // Customer Info
        doc.setFontSize(12);
        doc.setTextColor(50, 50, 50);
        doc.text(`Customer Name: ${customer.name}`, 14, 32);
        doc.text(`Phone: ${customer.phone}`, 14, 38);
        const balColor = currentBalance > 0 ? [0, 200, 83] : (currentBalance < 0 ? [213, 0, 0] : [50, 50, 50]);
        doc.text(`Current Balance: Rs. ${Math.abs(currentBalance)} ${currentBalance > 0 ? '(Credit)' : currentBalance < 0 ? '(Advance)' : ''}`, 14, 44);

        // Table Data
        const tableColumn = ["Date", "Type", "Details", "Amount"];
        const tableRows = [];

        transactions.forEach(t => {
            const isCredit = t.type === 'Credit';
            const date = new Date(t.createdAt).toLocaleDateString('en-IN');
            const transactionData = [
                date,
                t.type,
                t.description || '-',
                `${isCredit ? '+' : '-'}Rs. ${t.amount}`
            ];
            tableRows.push(transactionData);
        });

        // Generate Table
        doc.autoTable({
            startY: 50,
            head: [tableColumn],
            body: tableRows,
            theme: 'grid',
            headStyles: { fillColor: [138, 43, 226] },
            alternateRowStyles: { fillColor: [240, 240, 240] }
        });

        // Save PDF
        doc.save(`DigiKhata_${customer.name}_Statement.pdf`);
        components.showToast('PDF Downloaded!', 'success');
    }
};

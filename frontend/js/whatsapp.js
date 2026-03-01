// WhatsApp Share intent wrapper
const whatsappHandler = {
    shareCustomerStatement(customer, currentBalance) {
        const phone = customer.phone.replace(/\D/g, ''); // Remove non-numeric

        let balText = '';
        if (currentBalance > 0) {
            balText = `You have a pending credit of Rs. ${currentBalance}. Please pay soon.`;
        } else if (currentBalance < 0) {
            balText = `You have an advance balance of Rs. ${Math.abs(currentBalance)} with us.`;
        } else {
            balText = `Your account is fully settled. Thank you!`;
        }

        const message = `*DigiKhata Statement*\n\nHello ${customer.name},\n${balText}\n\nRegards,\n${auth.user ? auth.user.name : 'Shop Owner'}`;

        // Create WhatsApp URL scheme
        // https://wa.me/91XXXXXXXXXX?text=encoded_text
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

        // Add country code if length is 10
        const finalPhone = phone.length === 10 ? `91${phone}` : phone;

        const url = `https://${isMobile ? 'api' : 'web'}.whatsapp.com/send?phone=${finalPhone}&text=${encodeURIComponent(message)}`;

        window.open(url, '_blank');
    }
};

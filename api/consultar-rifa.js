import { MercadoPagoConfig, Payment } from 'mercadopago';

function generateRaffleNumbers(quantity) {
    const numbers = new Set();
    while (numbers.size < quantity) {
        numbers.add(Math.floor(100000 + Math.random() * 900000));
    }
    return Array.from(numbers);
}
function getQuantityByAmount(amount) {
    const map = { '5.00': 1, '10.00': 3, '20.00': 7, '50.00': 20 };
    return map[parseFloat(amount).toFixed(2)] || 0;
}

export default async function handler(request, response) {
    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    const paymentId = request.query.id;

    if (!accessToken || !paymentId) {
        return response.status(400).json({ error: 'Dados insuficientes ou configuração do servidor ausente.' });
    }

    const client = new MercadoPagoConfig({ accessToken });
    const payment = new Payment(client);

    try {
        const paymentDetails = await payment.get({ id: Number(paymentId) });

        if (paymentDetails.status === 'approved') {
            const quantity = getQuantityByAmount(paymentDetails.transaction_amount);
            const numbers = generateRaffleNumbers(quantity);
            return response.status(200).json({ status: 'approved', numbers: numbers });
        }
        
        return response.status(200).json({ status: paymentDetails.status });

    } catch (error) {
        console.error('Erro ao consultar pagamento:', error);
        return response.status(500).json({ error: 'Falha ao consultar o pagamento.' });
    }
}

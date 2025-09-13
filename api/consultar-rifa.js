import { MercadoPagoConfig, Payment } from 'mercadopago';
import { kv } from '@vercel/kv';
import { v4 as uuidv4 } from 'uuid';

// ATUALIZADO: Gera números de 5 dígitos
function generateRaffleNumbers(quantity) {
    const numbers = new Set();
    while (numbers.size < quantity) {
        numbers.add(Math.floor(10000 + Math.random() * 90000));
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
        return response.status(400).json({ error: 'Dados insuficientes.' });
    }

    const client = new MercadoPagoConfig({ accessToken });
    const payment = new Payment(client);

    try {
        const paymentDetails = await payment.get({ id: Number(paymentId) });

        if (paymentDetails.status === 'approved') {
            const quantity = getQuantityByAmount(paymentDetails.transaction_amount);
            const numbers = generateRaffleNumbers(quantity);
            
            // NOVO: Gera um ID de bilhete único e seguro
            const ticketId = uuidv4();
            
            // NOVO: Salva os números no Vercel KV, associados ao ID do bilhete
            // Os dados expiram em 24 horas para não acumular lixo.
            await kv.set(ticketId, numbers, { ex: 86400 });
            
            // NOVO: Retorna o ticketId em vez dos números
            return response.status(200).json({ status: 'approved', ticketId: ticketId });
        }
        
        return response.status(200).json({ status: paymentDetails.status });

    } catch (error) {
        console.error('Erro ao consultar pagamento:', error);
        return response.status(500).json({ error: 'Falha ao consultar o pagamento.' });
    }
}

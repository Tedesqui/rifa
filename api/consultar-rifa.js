import { MercadoPagoConfig, Payment } from 'mercadopago';
import { kv } from '@vercel/kv';
import { v4 as uuidv4 } from 'uuid';
import cookie from 'cookie';

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
    
    // Pega o ID do usuário do cookie
    const cookies = cookie.parse(request.headers.cookie || '');
    const userId = cookies.userId;

    if (!accessToken || !paymentId || !userId) {
        return response.status(400).json({ error: 'Dados insuficientes ou sessão inválida.' });
    }

    const client = new MercadoPagoConfig({ accessToken });
    const payment = new Payment(client);

    try {
        const paymentDetails = await payment.get({ id: Number(paymentId) });

        if (paymentDetails.status === 'approved') {
            const quantity = getQuantityByAmount(paymentDetails.transaction_amount);
            const numbers = generateRaffleNumbers(quantity);
            const ticketId = uuidv4();
            
            const newTicket = {
                id: ticketId,
                numbers: numbers,
                purchaseTimestamp: new Date().toISOString()
            };

            // Salva o bilhete na lista de bilhetes do usuário
            const allUserTickets = await kv.get(`user:${userId}`) || [];
            allUserTickets.push(newTicket);
            await kv.set(`user:${userId}`, allUserTickets);
            
            // Salva o bilhete individualmente para a página de sucesso
            await kv.set(`ticket:${ticketId}`, newTicket, { ex: 86400 });

            return response.status(200).json({ status: 'approved', ticketId: ticketId });
        }
        
        return response.status(200).json({ status: paymentDetails.status });

    } catch (error) {
        console.error('Erro ao consultar pagamento:', error);
        return response.status(500).json({ error: 'Falha ao consultar o pagamento.' });
    }
}

import { MercadoPagoConfig, Payment } from 'mercadopago';
import { kv } from '@vercel/kv';
import { v4 as uuidv4 } from 'uuid';
import cookie from 'cookie';

export default async function handler(request, response) {
    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    const paymentId = request.query.id;
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
            // A lógica de mover de "reservado" para "comprado" foi REMOVIDA.
            const metadata = paymentDetails.metadata;
            const chosenNumbers = metadata.chosen_numbers.split(',');

            const ticketId = uuidv4();
            const newTicket = {
                id: ticketId,
                numbers: chosenNumbers,
                purchaseTimestamp: new Date().toISOString()
            };
            
            // A lógica de salvar o bilhete para o usuário continua a mesma
            const allUserTickets = await kv.get(`user:${userId}`) || [];
            allUserTickets.push(newTicket);
            await kv.set(`user:${userId}`, allUserTickets);
            await kv.set(`ticket:${ticketId}`, newTicket, { ex: 86400 });

            return response.status(200).json({ status: 'approved', ticketId: ticketId });
        }
        
        return response.status(200).json({ status: paymentDetails.status });

    } catch (error) {
        console.error('Erro ao consultar pagamento:', error);
        return response.status(500).json({ error: 'Falha ao consultar o pagamento.' });
    }
}

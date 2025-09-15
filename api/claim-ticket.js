import { kv } from '@vercel/kv';
import { v4 as uuidv4 } from 'uuid';
import cookie from 'cookie';

function getDrawDateForTicket(purchaseTimestamp) {
    const purchaseDate = new Date(purchaseTimestamp);
    if (purchaseDate.getHours() < 20) return purchaseDate.toISOString().split('T')[0];
    const nextDay = new Date(purchaseDate);
    nextDay.setDate(purchaseDate.getDate() + 1);
    return nextDay.toISOString().split('T')[0];
}

export default async function handler(request, response) {
    if (request.method !== 'POST') return response.status(405).json({ error: 'Method Not Allowed' });

    const { claimToken, numbers } = request.body;
    const cookies = cookie.parse(request.headers.cookie || '');
    const userId = cookies.userId;

    if (!claimToken || !numbers || !userId) return response.status(400).json({ error: 'Dados insuficientes.' });

    try {
        const claimData = await kv.get(`claim:${claimToken}`);
        if (!claimData || numbers.length !== claimData.quantity) {
            return response.status(403).json({ error: 'Token inválido ou quantidade de números incorreta.' });
        }

        const ticketId = uuidv4();
        const newTicket = {
            id: ticketId,
            numbers: numbers,
            purchaseTimestamp: new Date().toISOString()
        };

        const allUserTickets = await kv.get(`user:${userId}`) || [];
        allUserTickets.push(newTicket);
        await kv.set(`user:${userId}`, allUserTickets);
        await kv.set(`ticket:${ticketId}`, newTicket, { ex: 86400 });

        // Deleta o token de resgate para que não possa ser usado novamente
        await kv.del(`claim:${claimToken}`);

        return response.status(200).json({ ticketId: ticketId });

    } catch (error) {
        console.error("Erro ao resgatar bilhete:", error);
        return response.status(500).json({ error: 'Falha ao salvar seu bilhete.' });
    }
}
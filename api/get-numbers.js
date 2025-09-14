import { kv } from '@vercel/kv';

export default async function handler(request, response) {
    const ticketId = request.query.ticketId;

    if (!ticketId) {
        return response.status(400).json({ error: 'ID do bilhete é obrigatório' });
    }

    try {
        const ticket = await kv.get(`ticket:${ticketId}`);

        if (ticket) {
            return response.status(200).json({ numbers: ticket.numbers });
        } else {
            return response.status(404).json({ error: 'Bilhete não encontrado ou expirado.' });
        }
    } catch (error) {
        console.error('Erro ao buscar números no KV:', error);
        return response.status(500).json({ error: 'Erro ao buscar dados do bilhete.' });
    }
}

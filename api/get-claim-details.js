import { kv } from '@vercel/kv';

export default async function handler(request, response) {
    const claimToken = request.query.claimToken;
    if (!claimToken) return response.status(400).json({ error: 'Token inválido.' });

    try {
        const claimData = await kv.get(`claim:${claimToken}`);
        if (claimData) {
            return response.status(200).json({ quantity: claimData.quantity });
        } else {
            return response.status(404).json({ error: 'Token de resgate não encontrado ou expirado.' });
        }
    } catch (error) {
        return response.status(500).json({ error: 'Erro ao verificar o token.' });
    }
}
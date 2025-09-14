import { v4 as uuidv4 } from 'uuid';
import cookie from 'cookie';
import { kv } from '@vercel/kv';

// A função que já conhecemos para validar bilhetes
function getDrawDateForTicket(purchaseTimestamp) {
    const purchaseDate = new Date(purchaseTimestamp);
    const purchaseHour = purchaseDate.getHours();
    if (purchaseHour < 20) {
        return purchaseDate.toISOString().split('T')[0];
    } else {
        const nextDay = new Date(purchaseDate);
        nextDay.setDate(purchaseDate.getDate() + 1);
        return nextDay.toISOString().split('T')[0];
    }
}

export default async function handler(request, response) {
    const cookies = cookie.parse(request.headers.cookie || '');
    let userId = cookies.userId;

    // Se o usuário não tem um ID, criamos um novo e o guardamos em um cookie
    if (!userId) {
        userId = uuidv4();
        response.setHeader('Set-Cookie', cookie.serialize('userId', userId, {
            httpOnly: true, // O cookie não pode ser lido por JavaScript no navegador
            secure: process.env.NODE_ENV !== 'development',
            maxAge: 60 * 60 * 24 * 365, // 1 ano
            sameSite: 'strict',
            path: '/',
        }));
    }

    // Buscamos todos os bilhetes já comprados por este usuário
    const allUserTickets = await kv.get(`user:${userId}`) || [];
    
    // O servidor determina qual é a data do sorteio atual
    const serverToday = new Date();
    const currentDrawDate = serverToday.toISOString().split('T')[0];
    
    // Filtramos apenas os bilhetes que são válidos para o sorteio de hoje
    const validTickets = allUserTickets.filter(ticket => getDrawDateForTicket(ticket.purchaseTimestamp) === currentDrawDate);
    
    // Retornamos apenas os números dos bilhetes válidos
    response.status(200).json({ validTickets });
}
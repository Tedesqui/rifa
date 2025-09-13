export default function handler(req, res) {
    const now = new Date();
    // Ajuste para o fuso horário de Brasília (UTC-3)
    const currentHourBrasilia = (now.getUTCHours() + 24 - 3) % 24;

    if (currentHourBrasilia >= 20 && currentHourBrasilia <= 23) {
        const date = new Date();
        const seed = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
        const pseudoRandom = Math.sin(seed) * 10000;
        // Gera número de 5 dígitos
        const winnerNumber = Math.floor((pseudoRandom - Math.floor(pseudoRandom)) * 90000) + 10000;
        return res.status(200).json({ number: winnerNumber });
    }
    return res.status(200).json({ number: 'Sorteio às 20h' });
}
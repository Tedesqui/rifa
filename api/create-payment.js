// /api/create-payment.js

import { MercadoPagoConfig, Payment } from 'mercadopago';

export default async function handler(req, res) {
    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!accessToken) return res.status(500).json({ error: 'Token do MP não configurado.' });
    
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { amount, email } = req.body;
        const client = new MercadoPagoConfig({ accessToken });
        const payment = new Payment(client);
        const result = await payment.create({
            body: {
                transaction_amount: Number(amount),
                description: `Rifa Online - Valor R$ ${Number(amount).toFixed(2)}`,
                payment_method_id: 'pix',
                payer: { email: email },
                date_of_expiration: new Date(Date.now() + 10 * 60 * 1000).toISOString().replace("Z", "-03:00"),
            }
        });
        const pixData = result.point_of_interaction?.transaction_data;
        if (!pixData) throw new Error("Dados do PIX não retornados pela API.");

        res.status(201).json({
            payment_id: result.id,
            // CORREÇÃO: Enviando no formato camelCase que o frontend espera
            qrCodeBase64: pixData.qr_code_base64,
            qr_code: pixData.qr_code,
        });
    } catch (error) {
        console.error("Erro ao criar pagamento:", error);
        res.status(500).json({ error: 'Falha ao processar o pagamento.' });
    }
}
}

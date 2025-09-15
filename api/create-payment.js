import { MercadoPagoConfig, Payment } from 'mercadopago';

// Função para obter a quantidade de números pelo valor
function getQuantityByAmount(amount) {
    const map = { '5.00': 1, '10.00': 3, '20.00': 7, '50.00': 20 };
    return map[parseFloat(amount).toFixed(2)] || 0;
}

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    const { amount, email } = request.body;
    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;

    if (!accessToken || !amount || !email) {
        return response.status(400).json({ error: 'Dados insuficientes.' });
    }

    const client = new MercadoPagoConfig({ accessToken });
    const payment = new Payment(client);

    try {
        const quantity = getQuantityByAmount(amount);
        if (quantity === 0) throw new Error("Valor inválido.");

        const paymentData = {
            body: {
                transaction_amount: Number(amount),
                description: `Rifa Online - Compra de ${quantity} número(s)`,
                payment_method_id: 'pix',
                payer: { email: email },
                // Guarda a quantidade de números que o usuário comprou
                metadata: {
                    quantity: quantity
                }
            }
        };

        const result = await payment.create(paymentData);
        const pixData = result.point_of_interaction?.transaction_data;
        if (!pixData) throw new Error("A API não retornou os dados do PIX.");
        
        response.status(201).json({ 
            payment_id: result.id,
            qr_code: pixData.qr_code,
            qrCodeBase64: pixData.qr_code_base64,
        });

    } catch (error) {
        console.error("Erro ao criar pagamento:", error);
        response.status(500).json({ error: 'Falha ao processar seu pedido.' });
    }
}

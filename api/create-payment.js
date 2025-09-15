import { MercadoPagoConfig, Payment } from 'mercadopago';

// Função para obter a data do sorteio (para guardar no metadata)
function getCurrentDrawDate() {
    const now = new Date();
    if (now.getHours() >= 20) {
        now.setDate(now.getDate() + 1);
    }
    return now.toISOString().split('T')[0];
}

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    const { amount, email, numbers } = request.body;
    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;

    if (!accessToken || !amount || !email || !numbers || !Array.isArray(numbers) || numbers.length === 0) {
        return response.status(400).json({ error: 'Dados insuficientes.' });
    }

    const client = new MercadoPagoConfig({ accessToken });
    const payment = new Payment(client);
    const drawDate = getCurrentDrawDate();

    try {
        // A lógica de verificação e reserva foi REMOVIDA.
        // Agora, simplesmente criamos o pagamento com os números escolhidos.
        const paymentData = {
            body: {
                transaction_amount: Number(amount),
                description: `Rifa - Seus Números: ${numbers.join(', ')}`,
                payment_method_id: 'pix',
                payer: { email: email },
                date_of_expiration: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // Expira em 10 minutos
                metadata: {
                    chosen_numbers: numbers.join(','),
                    draw_date: drawDate
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

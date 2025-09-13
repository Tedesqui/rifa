import { MercadoPagoConfig, Payment } from 'mercadopago';

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    // ADAPTADO: Recebemos 'amount' e 'email' do seu frontend
    const { amount, email } = request.body;
    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;

    // ADAPTADO: Verificamos 'amount'
    if (!accessToken || !amount || !email) {
        return response.status(400).json({ error: 'Dados insuficientes: amount, email ou configuração do servidor ausente.' });
    }
    
    const client = new MercadoPagoConfig({ accessToken });
    const payment = new Payment(client);

    try {
        const paymentData = {
            body: {
                // ADAPTADO: Usamos o valor dinâmico da rifa
                transaction_amount: Number(amount),
                // ADAPTADO: Usamos uma descrição dinâmica
                description: `Pagamento Rifa Online - Valor R$ ${Number(amount).toFixed(2)}`,
                payment_method_id: 'pix',
                payer: {
                    email: email,
                },
            }
        };

        const result = await payment.create(paymentData);
        const pixData = result.point_of_interaction?.transaction_data;

        if (!pixData) {
            throw new Error("A API de Pagamento não retornou os dados do PIX.");
        }
        
        // ADAPTADO: Retornamos os dados no formato que seu frontend (index.html) espera
        response.status(201).json({ 
            payment_id: result.id, // Adicionado o ID para a consulta
            qr_code: pixData.qr_code,
            qrCodeBase64: pixData.qr_code_base64,
        });

    } catch (error) {
        console.error("Erro ao criar pagamento:", error);
        const errorMessage = error.cause?.api_response?.data?.message || error.message;
        response.status(500).json({ 
            error: 'Falha ao criar pagamento.',
            details: errorMessage 
        });
    }
}

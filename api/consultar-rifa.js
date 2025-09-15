import { MercadoPagoConfig, Payment } from 'mercadopago';
import { kv } from '@vercel/kv';
import { v4 as uuidv4 } from 'uuid';

export default async function handler(request, response) {
    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    const paymentId = request.query.id;

    if (!accessToken || !paymentId) {
        return response.status(400).json({ error: 'Dados insuficientes.' });
    }

    const client = new MercadoPagoConfig({ accessToken });
    const payment = new Payment(client);

    try {
        const paymentDetails = await payment.get({ id: Number(paymentId) });

        if (paymentDetails.status === 'approved') {
            const quantity = paymentDetails.metadata.quantity;

            // Cria um token de resgate único e o salva por 1 hora
            const claimToken = uuidv4();
            await kv.set(`claim:${claimToken}`, { paymentId, quantity }, { ex: 3600 });
            
            // Retorna o token para o frontend redirecionar
            return response.status(200).json({ status: 'approved', claimToken: claimToken });
        }
        
        return response.status(200).json({ status: paymentDetails.status });

    } catch (error) {
        console.error('Erro ao consultar pagamento:', error);
        return response.status(500).json({ error: 'Falha ao consultar o pagamento.' });
    }
}

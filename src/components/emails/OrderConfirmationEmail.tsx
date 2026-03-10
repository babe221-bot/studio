import { EmailLayout } from './EmailLayout';
import {
  Text,
  Link,
  Section,
  Img,
  Hr,
  Tailwind,
} from '@react-email/components';
import React from 'react';
import { OrderItem } from '@/types';

interface OrderConfirmationEmailProps {
  orderId: string;
  orderItems: OrderItem[];
  totalAmount: number;
}

export const OrderConfirmationEmail = ({
  orderId,
  orderItems,
  totalAmount,
}: OrderConfirmationEmailProps) => (
  <EmailLayout
    title={`Potvrda narudžbe #${orderId}`}
    preview={`Vaša narudžba #${orderId} je uspješno primljena.`}
  >
    <Text className="text-lg text-gray-700 leading-relaxed mb-4">
      Poštovani,
    </Text>
    <Text className="text-gray-700 leading-relaxed mb-4">
      Hvala vam na narudžbi! Vaša narudžba #{orderId} je uspješno primljena i
      obrađuje se. Ispod možete pronaći detalje vaše narudžbe:
    </Text>

    <Section className="mb-6 border rounded-lg p-4">
      <Text className="text-lg font-semibold mb-2">
        Detalji narudžbe #{orderId}
      </Text>
      <Hr className="my-2 border-t border-gray-200" />
      {orderItems.map((item, index) => (
        <div key={index} className="py-2 border-b last:border-b-0 ">
          <Text className="font-medium mb-1">
            {item.material?.name} - {item.finish?.name}
          </Text>
          <Text className="text-xs text-gray-600">
            Dimenzije: {item.dims.length}x{item.dims.width}x{item.dims.height}{' '}
            cm
            {item.processedEdges &&
              Object.values(item.processedEdges).some(Boolean) && (
                <span>
                  {' '}
                  | Obrada:{' '}
                  {Object.keys(item.processedEdges)
                    .filter(
                      (key) =>
                        item.processedEdges[
                          key as keyof typeof item.processedEdges
                        ]
                    )
                    .join(', ')}
                </span>
              )}
          </Text>
          <Text className="text-xs text-gray-600">
            Količina: {item.quantity} {item.orderUnit}
          </Text>
          <Text className="font-semibold text-sm text-gray-800">
            Cijena: €{item.totalCost.toFixed(2)}
          </Text>
        </div>
      ))}
      <Hr className="my-4 border-t border-gray-200" />
      <Text className="text-right text-lg font-bold text-gray-800">
        Ukupno: €{totalAmount.toFixed(2)}
      </Text>
    </Section>

    <Text className="text-gray-700 leading-relaxed">
      Status vaše narudžbe možete pratiti na vašem korisničkom nalogu. Ukoliko
      imate bilo kakvih pitanja, slobodno nas kontaktirajte.
    </Text>
    <Text className="text-gray-700 leading-relaxed">
      S poštovanjem,
      <br />
      Kamena Galanterija Tim
    </Text>
  </EmailLayout>
);

export default OrderConfirmationEmail;

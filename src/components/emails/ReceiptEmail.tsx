import { EmailLayout } from './EmailLayout';
import {
  Text,
  Link,
  Section,
  Hr,
  Tailwind,
  Img,
} from '@react-email/components';
import React from 'react';
import { OrderItem } from '@/types';

interface ReceiptEmailProps {
  orderId: string;
  orderItems: OrderItem[];
  totalAmount: number;
  paymentStatus: string;
  transactionId: string;
}

export const ReceiptEmail = ({
  orderId,
  orderItems,
  totalAmount,
  paymentStatus,
  transactionId,
}: ReceiptEmailProps) => (
  <EmailLayout
    title={`Račun za narudžbu #${orderId}`}
    preview={`Račun za narudžbu #${orderId}. Status plaćanja: ${paymentStatus}`}
  >
    <Text className="text-lg text-gray-700 leading-relaxed mb-4">
      Poštovani,
    </Text>
    <Text className="text-gray-700 leading-relaxed mb-4">
      Hvala vam na kupovini! Ovo je potvrda vaše narudžbe #{orderId}.
    </Text>

    <Section className="mb-6 border rounded-lg p-4 bg-gray-50">
      <Text className="text-lg font-semibold mb-2">
        Detalji narudžbe #{orderId}
      </Text>
      <Hr className="my-2 border-t border-gray-200" />
      {orderItems.map((item, index) => (
        <div key={index} className="py-2 border-b last:border-b-0 ">
          <Text className="font-medium mb-1">
            {item.material?.name} - {item.finish?.name}
          </Text>
          <Text className="text-xs text-gray-600">
            Dimenzije: {item.dims.length}x{item.dims.width}x{item.dims.height}{' '}
            cm
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
        Ukupno plaćeno: €{totalAmount.toFixed(2)}
      </Text>
      <Text className="text-right text-sm text-gray-600">
        Status plaćanja: {paymentStatus}
      </Text>
      <Text className="text-right text-sm text-gray-600">
        Transakcijski ID: {transactionId}
      </Text>
    </Section>

    <Text className="text-gray-700 leading-relaxed">
      Ako imate bilo kakvih pitanja, slobodno nas kontaktirajte.
    </Text>
    <Text className="text-gray-700 leading-relaxed">
      S poštovanjem,
      <br />
      Kamena Galanterija Tim
    </Text>
  </EmailLayout>
);

export default ReceiptEmail;

import { EmailLayout } from './EmailLayout';
import { Text, Link, Section } from '@react-email/components';
import React from 'react';

export const WelcomeEmail = () => (
  <EmailLayout title="Dobrodošli u Kamena Galanterija!">
    <Text className="text-lg text-gray-700 leading-relaxed mb-4">
      Poštovani,
    </Text>
    <Text className="text-gray-700 leading-relaxed mb-4">
      Hvala vam što ste se registrovali kod nas. Uzbuđeni smo što ste deo naše
      zajednice! Sada možete početi sa kreiranjem vaših jedinstvenih kamenih
      dizajna.
    </Text>
    <Section className="mb-6">
      <Link
        href="/"
        className="bg-primary text-white py-3 px-6 rounded font-semibold no-underline"
      >
        Počnite sa konfiguracijom
      </Link>
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

export default WelcomeEmail;

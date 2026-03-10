import {
  Html,
  Head,
  Body,
  Tailwind,
  Section,
  Img,
  Text,
  Link,
} from '@react-email/components';

interface EmailLayoutProps {
  children: React.ReactNode;
  title: string;
  preview?: string;
}

export const EmailLayout: React.FC<EmailLayoutProps> = ({
  children,
  title,
  preview,
}) => {
  return (
    <Html lang="en">
      <Head>
        <title>{title}</title>
        {preview && <meta name="description" content={preview} />}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
      </Head>
      <Tailwind>
        <Body className="bg-gray-100 font-sans">
          <Section className="bg-white max-w-[600px] mx-auto my-4 rounded-lg shadow-sm overflow-hidden">
            <Section className="bg-primary py-4 px-6">
              <Img
                src="https://your-logo-url.com/logo.png"
                width="120"
                height="auto"
                alt="Company Logo"
                className="mx-auto"
              />
            </Section>
            <Section className="py-8 px-6">
              <Text className="text-2xl font-bold text-primary mb-4">
                {title}
              </Text>
              {children}
            </Section>
            <Section className="bg-gray-50 py-6 px-6 text-center text-xs text-gray-600 border-t">
              <Text>
                &copy; {new Date().getFullYear()} Kamena Galanterija. Sva prava
                pridržana.
              </Text>
              <Text>
                Ako ne želite primati ove emailove, možete se odjaviti{' '}
                <Link href="#" className="text-primary hover:underline">
                  ovdje
                </Link>
                .
              </Text>
            </Section>
          </Section>
        </Body>
      </Tailwind>
    </Html>
  );
};

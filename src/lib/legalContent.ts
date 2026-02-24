export interface LegalSection {
  heading: string;
  body: string[];
}

export interface LegalDocument {
  title: string;
  lastUpdated: string;
  intro: string;
  sections: LegalSection[];
}

export const termsOfService: LegalDocument = {
  title: "Terms of Service",
  lastUpdated: "February 24, 2026",
  intro:
    "These Terms of Service govern your use of VenYOU. By creating an account or using the platform, you agree to these terms.",
  sections: [
    {
      heading: "1. Eligibility and Accounts",
      body: [
        "You must provide accurate registration information and keep your credentials secure.",
        "You are responsible for activity performed through your account.",
      ],
    },
    {
      heading: "2. Platform Usage",
      body: [
        "VenYOU provides venue discovery and planning tools for informational purposes.",
        "You agree not to misuse the service, disrupt infrastructure, or attempt unauthorized access.",
      ],
    },
    {
      heading: "3. Recommendations and Third-Party Content",
      body: [
        "Venue recommendations are generated from available data and your inputs and may change over time.",
        "VenYOU is not a party to contracts you enter with venues or vendors.",
      ],
    },
    {
      heading: "4. Payments and Commercial Terms",
      body: [
        "If paid features are introduced, pricing and billing terms will be shown before purchase.",
        "Unless required by law, fees already paid are non-refundable.",
      ],
    },
    {
      heading: "5. Intellectual Property",
      body: [
        "All platform content, branding, and software are owned by VenYOU or its licensors.",
        "You may not copy, reverse engineer, or distribute platform assets without permission.",
      ],
    },
    {
      heading: "6. Suspension and Termination",
      body: [
        "We may suspend or terminate access for violations of these terms or abusive behavior.",
        "You may stop using the service at any time by discontinuing use.",
      ],
    },
    {
      heading: "7. Disclaimer and Limitation of Liability",
      body: [
        "The service is provided on an as-is and as-available basis.",
        "To the maximum extent permitted by law, VenYOU is not liable for indirect or consequential damages.",
      ],
    },
    {
      heading: "8. Changes to These Terms",
      body: [
        "We may update these terms from time to time. Material updates will be reflected by the last updated date.",
      ],
    },
  ],
};

export const privacyPolicy: LegalDocument = {
  title: "Privacy Policy",
  lastUpdated: "February 24, 2026",
  intro:
    "This Privacy Policy explains what information VenYOU collects, how we use it, and your choices.",
  sections: [
    {
      heading: "1. Information We Collect",
      body: [
        "Account data, such as name, email, and login information.",
        "Event planning inputs, preferences, and feature interaction data.",
      ],
    },
    {
      heading: "2. How We Use Information",
      body: [
        "To provide and improve recommendations, account features, and service reliability.",
        "To communicate account updates, support responses, and product notices.",
      ],
    },
    {
      heading: "3. Legal Bases and Consent",
      body: [
        "We process information to perform our services, meet legal obligations, and support legitimate business interests.",
        "Where required, we rely on your consent for optional communications.",
      ],
    },
    {
      heading: "4. Sharing of Data",
      body: [
        "We may share data with service providers that support hosting, analytics, and operations.",
        "We do not sell personal information to third parties.",
      ],
    },
    {
      heading: "5. Retention and Security",
      body: [
        "We retain data as needed for service delivery, legal compliance, and dispute resolution.",
        "Reasonable technical and organizational safeguards are used to protect personal information.",
      ],
    },
    {
      heading: "6. Your Rights",
      body: [
        "Depending on your location, you may request access, correction, deletion, or portability of your data.",
        "You may opt out of optional marketing emails at any time.",
      ],
    },
    {
      heading: "7. Contact",
      body: [
        "For privacy questions or requests, contact privacy@venyou.example.",
      ],
    },
  ],
};

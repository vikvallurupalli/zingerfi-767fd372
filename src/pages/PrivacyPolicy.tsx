import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import logo from "@/assets/logo.png";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center space-x-2">
              <img src={logo} alt="ZingerFi Logo" className="h-10 w-10 object-contain" />
              <span className="text-xl font-bold text-foreground">ZingerFi</span>
            </Link>
            <Link to="/">
              <Button variant="outline" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>
        
        <div className="prose prose-gray dark:prose-invert max-w-none space-y-6">
          <p className="text-muted-foreground">Last updated: January 21, 2026</p>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">1. Introduction</h2>
            <p>
              Welcome to ZingerFi. We are committed to protecting your privacy and ensuring 
              the security of your personal information. This Privacy Policy explains how we 
              collect, use, and safeguard your data when you use our encrypted messaging service.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">2. Information We Collect</h2>
            <p>We collect the following types of information:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Account Information:</strong> Email address for authentication purposes.</li>
              <li><strong>Encryption Keys:</strong> Your public key is stored to enable end-to-end encryption. Your private key is encrypted and stored securely.</li>
              <li><strong>Confide Connections:</strong> Information about your trusted contacts (confides) to facilitate secure messaging.</li>
              <li><strong>Usage Data:</strong> Basic analytics to improve our service.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">3. How We Use Your Information</h2>
            <p>Your information is used to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Provide and maintain the ZingerFi service</li>
              <li>Enable end-to-end encrypted messaging between you and your confides</li>
              <li>Authenticate your identity and secure your account</li>
              <li>Improve and optimize our service</li>
              <li>Communicate with you about service updates</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">4. End-to-End Encryption</h2>
            <p>
              ZingerFi uses end-to-end encryption for all messages. This means:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Messages are encrypted on your device before being shared</li>
              <li>Only you and your intended recipient can decrypt messages</li>
              <li>We cannot read your encrypted messages</li>
              <li>Messages are not stored on our servers</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">5. Data Security</h2>
            <p>
              We implement industry-standard security measures to protect your data, including:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Secure HTTPS connections</li>
              <li>Encrypted storage of sensitive data</li>
              <li>Regular security audits</li>
              <li>Access controls and authentication</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">6. Data Sharing</h2>
            <p>
              We do not sell, trade, or rent your personal information to third parties. 
              We may share data only in the following circumstances:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>With your explicit consent</li>
              <li>To comply with legal obligations</li>
              <li>To protect our rights and safety</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">7. Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Access your personal data</li>
              <li>Correct inaccurate data</li>
              <li>Delete your account and associated data</li>
              <li>Export your data</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">8. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us through 
              the feedback form in the application.
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t border-border bg-card mt-12">
        <div className="container mx-auto px-4 py-6 text-center text-muted-foreground">
          <p>&copy; 2025 ZingerFi. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

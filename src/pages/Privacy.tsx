import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const Privacy = () => {
  return (
    <div className="min-h-screen gradient-surface">
      <div className="container max-w-3xl mx-auto px-4 py-8">
        <Link to="/">
          <Button variant="ghost" size="sm" className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </Link>

        <div className="glass rounded-2xl p-6 md:p-8 space-y-6">
          <h1 className="text-3xl font-bold text-gradient">Privacy Policy</h1>
          <p className="text-muted-foreground">Last updated: December 2024</p>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">1. Information We Collect</h2>
            <p className="text-foreground/80">We collect the following types of information:</p>
            <ul className="list-disc list-inside text-foreground/80 space-y-2 ml-4">
              <li><strong>Account Information:</strong> Email address, username, and profile details you provide</li>
              <li><strong>Generated Content:</strong> Images and videos you create, along with the prompts used</li>
              <li><strong>Usage Data:</strong> How you interact with our service, including features used and generation history</li>
              <li><strong>Device Information:</strong> Browser type, device type, and IP address for security purposes</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">2. How We Use Your Information</h2>
            <p className="text-foreground/80">We use your information to:</p>
            <ul className="list-disc list-inside text-foreground/80 space-y-2 ml-4">
              <li>Provide and improve our AI generation services</li>
              <li>Authenticate your account and maintain security</li>
              <li>Display your public content to other users</li>
              <li>Send important service notifications</li>
              <li>Analyze usage patterns to improve the platform</li>
              <li>Enforce our Terms of Service and prevent abuse</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">3. Third-Party Services</h2>
            <p className="text-foreground/80">
              We use third-party AI providers to generate content. Your prompts are sent to these 
              services for processing. We also use cloud infrastructure providers to store your 
              content securely.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">4. Data Storage and Security</h2>
            <p className="text-foreground/80">
              Your data is stored securely using industry-standard encryption and security practices. 
              We implement appropriate technical and organizational measures to protect your 
              personal information against unauthorized access, alteration, or destruction.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">5. Data Retention</h2>
            <p className="text-foreground/80">
              We retain your account information and generated content for as long as your account 
              is active. You can delete your content at any time. If you delete your account, 
              we will delete your personal information within 30 days.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">6. Your Rights</h2>
            <p className="text-foreground/80">You have the right to:</p>
            <ul className="list-disc list-inside text-foreground/80 space-y-2 ml-4">
              <li>Access your personal data</li>
              <li>Correct inaccurate information</li>
              <li>Delete your account and associated data</li>
              <li>Export your generated content</li>
              <li>Object to certain data processing activities</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">7. Cookies and Local Storage</h2>
            <p className="text-foreground/80">
              We use cookies and local storage to maintain your session, remember preferences, 
              and improve your experience. This includes storing your saved words and rate limit 
              information locally on your device.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">8. Children&apos;s Privacy</h2>
            <p className="text-foreground/80">
              Our service is not intended for children under 13. We do not knowingly collect 
              personal information from children under 13. If we become aware of such collection, 
              we will delete the information promptly.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">9. Changes to This Policy</h2>
            <p className="text-foreground/80">
              We may update this Privacy Policy from time to time. We will notify you of 
              significant changes by posting a notice on our platform or sending you an email.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">10. Contact Us</h2>
            <p className="text-foreground/80">
              If you have questions about this Privacy Policy or wish to exercise your rights, 
              please contact us through our support channels.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Privacy;

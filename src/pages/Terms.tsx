import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const Terms = () => {
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
          <h1 className="text-3xl font-bold text-gradient">Terms of Service</h1>
          <p className="text-muted-foreground">Last updated: December 2024</p>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">1. Acceptance of Terms</h2>
            <p className="text-foreground/80">
              By accessing and using Afterglow AI, you agree to be bound by these Terms of Service. 
              If you do not agree to these terms, please do not use our service.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">2. Description of Service</h2>
            <p className="text-foreground/80">
              Afterglow AI is an AI-powered content generation platform that allows users to create 
              images and videos from text descriptions. The service uses artificial intelligence 
              models to generate content based on user prompts.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">3. User Accounts</h2>
            <p className="text-foreground/80">
              You must create an account to use our generation features. You are responsible for 
              maintaining the confidentiality of your account credentials and for all activities 
              under your account.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">4. Acceptable Use</h2>
            <p className="text-foreground/80">You agree NOT to use Afterglow AI to:</p>
            <ul className="list-disc list-inside text-foreground/80 space-y-2 ml-4">
              <li>Generate illegal, harmful, or offensive content</li>
              <li>Create content that infringes on intellectual property rights</li>
              <li>Generate deepfakes or non-consensual intimate imagery</li>
              <li>Produce content depicting violence, abuse, or exploitation</li>
              <li>Create misleading or deceptive content intended to harm others</li>
              <li>Violate any applicable laws or regulations</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">5. Content Ownership</h2>
            <p className="text-foreground/80">
              You retain ownership of the content you create using our service, subject to our 
              license to display and store it. By making content public, you grant other users 
              the right to view and interact with it.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">6. AI-Generated Content Disclaimer</h2>
            <p className="text-foreground/80">
              AI-generated content may not always be accurate, appropriate, or meet your expectations. 
              We do not guarantee the quality, accuracy, or suitability of generated content. 
              You are solely responsible for reviewing and using generated content appropriately.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">7. Age Restrictions</h2>
            <p className="text-foreground/80">
              You must be at least 13 years old to use Afterglow AI. If you are under 18, you must 
              have parental or guardian consent to use the service.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">8. Termination</h2>
            <p className="text-foreground/80">
              We reserve the right to suspend or terminate your account at any time for violations 
              of these terms or for any other reason at our sole discretion.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">9. Limitation of Liability</h2>
            <p className="text-foreground/80">
              Afterglow AI is provided "as is" without warranties of any kind. We are not liable 
              for any damages arising from your use of the service or any content generated through it.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">10. Changes to Terms</h2>
            <p className="text-foreground/80">
              We may update these terms at any time. Continued use of the service after changes 
              constitutes acceptance of the new terms.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">11. Contact</h2>
            <p className="text-foreground/80">
              For questions about these terms, please contact us through our support channels.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Terms;

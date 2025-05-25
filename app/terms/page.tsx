
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export default function TermsOfServicePage() {
  const lastUpdatedDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  return (
    <main className="container mx-auto flex min-h-screen flex-col items-center justify-center py-8 px-4">
      <Card className="w-full max-w-3xl shadow-xl">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-primary">Terms of Service</CardTitle>
          <CardDescription>Last Updated: {lastUpdatedDate}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 text-sm text-muted-foreground prose prose-sm dark:prose-invert max-w-none">
          <p>Welcome to GazeAd (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;)! These Terms of Service (&quot;Terms&quot;) govern your use of our website and services (collectively, the &quot;Service&quot;). By accessing or using our Service, you agree to be bound by these Terms and our Privacy Policy.</p>

          <h2 className="text-xl font-semibold text-foreground pt-2">1. Acceptance of Terms</h2>
          <p>By using the Service, you affirm that you are of legal age to enter into these Terms, or, if you are not, that you have obtained parental or guardian consent to enter into these Terms. If you do not agree to these Terms, you may not use the Service.</p>

          <h2 className="text-xl font-semibold text-foreground">2. Description of Service</h2>
          <p>GazeAd provides an AI-powered tool that detects eye movement and gaze direction using your device&apos;s camera to enable smart video player functionalities and ad interactions. The Service includes a calibration screen to help align the camera for effective gaze tracking.</p>

          <h2 className="text-xl font-semibold text-foreground">3. Camera Usage and Consent</h2>
          <p>To use the core features of GazeAd, you must grant the Service access to your device&apos;s camera. This access is solely for the purpose of gaze detection and calibration as described. By enabling camera access and using these features, you consent to the collection and processing of video data from your camera as outlined in our <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>. Image data is processed for real-time gaze analysis and is not stored long-term by default. The AI processing may occur locally on your device or on our secure servers.</p>

          <h2 className="text-xl font-semibold text-foreground">4. User Conduct</h2>
          <p>You agree not to use the Service for any unlawful purpose or in any way that interrupts, damages, or impairs the service. You agree to comply with all applicable laws and regulations regarding your use of the Service.</p>
          <p>You are responsible for ensuring that your use of the camera and gaze tracking features is done in a safe and appropriate environment, and that you have the consent of any individuals who may be captured by your camera if you are using the Service in a shared space.</p>

          <h2 className="text-xl font-semibold text-foreground">5. Intellectual Property</h2>
          <p>All content and materials available on GazeAd, including but not limited to text, graphics, website name, code, images, and logos are the intellectual property of GazeAd or its licensors and are protected by applicable copyright and trademark law. Any inappropriate use, including but not limited to the reproduction, distribution, display, or transmission of any content on this site is strictly prohibited unless specifically authorized by GazeAd.</p>

          <h2 className="text-xl font-semibold text-foreground">6. Disclaimer of Warranties</h2>
          <p>The Service is provided on an &quot;as is&quot; and &quot;as available&quot; basis. GazeAd makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.</p>
          <p>Further, GazeAd does not warrant or make any representations concerning the accuracy, likely results, or reliability of the use of the gaze detection technology or other materials on its website or otherwise relating to such materials or on any sites linked to this site. The accuracy of gaze detection can be affected by various factors including lighting conditions, camera quality, and user movement.</p>

          <h2 className="text-xl font-semibold text-foreground">7. Limitation of Liability</h2>
          <p>In no event shall GazeAd or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the Service, even if GazeAd or a GazeAd authorized representative has been notified orally or in writing of the possibility of such damage.</p>

          <h2 className="text-xl font-semibold text-foreground">8. Changes to Terms</h2>
          <p>GazeAd reserves the right to revise these Terms at any time without notice. By using this Service, you are agreeing to be bound by the then-current version of these Terms.</p>

          <h2 className="text-xl font-semibold text-foreground">9. Governing Law</h2>
          <p>Any claim relating to GazeAd&apos;s Service shall be governed by the laws of the jurisdiction in which GazeAd operates without regard to its conflict of law provisions.</p>

          <h2 className="text-xl font-semibold text-foreground">10. Contact Us</h2>
          <p>If you have any questions about these Terms, please contact us at [Your Contact Email Address or Link to Contact Page].</p>
          
          <p className="mt-6 text-xs">
            <strong>Disclaimer:</strong> This is a sample Terms of Service. It is not a substitute for professional legal advice. You should consult with a legal professional to ensure this policy is appropriate for your specific needs and complies with all applicable laws.
          </p>
        </CardContent>
        <CardFooter>
          <Button asChild variant="outline">
            <Link href="/">Return to Home</Link>
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}

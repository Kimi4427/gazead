
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export default function PrivacyPolicyPage() {
  const lastUpdatedDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  return (
    <main className="container mx-auto flex min-h-screen flex-col items-center justify-center py-8 px-4">
      <Card className="w-full max-w-3xl shadow-xl">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-primary">Privacy Policy</CardTitle>
          <CardDescription>Last Updated: {lastUpdatedDate}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 text-sm text-muted-foreground prose prose-sm dark:prose-invert max-w-none">
          <p>GazeAd (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our website and services (collectively, the &quot;Service&quot;). Please read this privacy policy carefully. If you do not agree with the terms of this privacy policy, please do not access the service.</p>

          <h2 className="text-xl font-semibold text-foreground pt-2">1. Information We Collect</h2>
          <p>We may collect information about you in a variety of ways. The information we may collect via the Service includes:</p>
          
          <h3 className="text-lg font-medium text-foreground">a. Camera and Gaze Data</h3>
          <p>
            To provide the core gaze detection and smart video player functionalities, we require access to your device&apos;s camera. When you grant permission:
          </p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>We capture video frames from your camera in real-time.</li>
            <li>This video data is processed to analyze your gaze direction (e.g., whether you are looking at the screen).</li>
            <li>This processing may occur locally within your browser or may involve sending data to our secure AI servers for analysis.</li>
            <li>We do not store the raw image or video data from your camera feed permanently. Data is typically processed ephemerally (for the duration of the AI analysis) and then discarded.</li>
            <li>Calibration data, which may be derived from an image capture during the calibration process, is used to improve the accuracy of gaze detection for your session. This calibration data is also typically session-based and not stored long-term.</li>
          </ul>

          <h3 className="text-lg font-medium text-foreground">b. Log and Usage Data</h3>
          <p>
            Like many websites, we may collect information that your browser sends whenever you visit our Service (&quot;Log Data&quot;). This Log Data may include information such as your computer&apos;s Internet Protocol (&quot;IP&quot;) address (or proxy server), device and application identification numbers, location, browser type, Internet service provider and/or mobile carrier, the pages of our Service that you visit, the time and date of your visit, the time spent on those pages, and other statistics.
          </p>
          
          <h3 className="text-lg font-medium text-foreground">c. Cookies and Similar Technologies</h3>
          <p>We may use cookies and similar tracking technologies to track the activity on our Service and hold certain information. Cookies are files with a small amount of data which may include an anonymous unique identifier. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent. However, if you do not accept cookies, you may not be able to use some portions of our Service.</p>

          <h2 className="text-xl font-semibold text-foreground">2. How We Use Your Information</h2>
          <p>Having accurate information permits us to provide you with a smooth, efficient, and customized experience. Specifically, we may use information collected about you via the Service to:</p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>Provide, operate, and maintain our Service, including the gaze detection and smart video player features.</li>
            <li>Perform gaze calibration to enhance the accuracy of the service.</li>
            <li>Analyze user gaze to control video playback (e.g., play/pause video ads based on attention).</li>
            <li>Improve, personalize, and expand our Service.</li>
            <li>Understand and analyze how you use our Service.</li>
            <li>Monitor and analyze usage and trends to improve your experience with the Service.</li>
            <li>Respond to your comments and questions and provide customer support.</li>
            <li>Comply with legal obligations.</li>
          </ul>

          <h2 className="text-xl font-semibold text-foreground">3. Disclosure of Your Information</h2>
          <p>We do not sell your personal information. We may share information we have collected about you in certain situations:</p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li><strong>With Service Providers:</strong> We may share your information with third-party vendors, service providers, contractors, or agents who perform services for us or on our behalf and require access to such information to do that work (e.g., AI model providers for gaze analysis). These service providers are obligated to protect your data.</li>
            <li><strong>By Law or to Protect Rights:</strong> If we believe the release of information about you is necessary to respond to legal process, to investigate or remedy potential violations of our policies, or to protect the rights, property, and safety of others, we may share your information as permitted or required by any applicable law, rule, or regulation.</li>
            <li><strong>Business Transfers:</strong> We may share or transfer your information in connection with, or during negotiations of, any merger, sale of company assets, financing, or acquisition of all or a portion of our business to another company.</li>
          </ul>
          <p>We will not share the direct video feed from your camera with advertisers or other third parties for unrelated purposes without your explicit consent.</p>

          <h2 className="text-xl font-semibold text-foreground">4. Data Security</h2>
          <p>We use administrative, technical, and physical security measures to help protect your personal information. While we have taken reasonable steps to secure the personal information you provide to us, please be aware that despite our efforts, no security measures are perfect or impenetrable, and no method of data transmission can be guaranteed against any interception or other type of misuse.</p>

          <h2 className="text-xl font-semibold text-foreground">5. Your Data Protection Rights</h2>
          <p>Depending on your location, you may have the following rights regarding your personal information:</p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>The right to access – You have the right to request copies of your personal data.</li>
            <li>The right to rectification – You have the right to request that we correct any information you believe is inaccurate or complete information you believe is incomplete.</li>
            <li>The right to erasure – You have the right to request that we erase your personal data, under certain conditions.</li>
            <li>The right to restrict processing – You have the right to request that we restrict the processing of your personal data, under certain conditions.</li>
            <li>The right to object to processing – You have the right to object to our processing of your personal data, under certain conditions.</li>
            <li>The right to data portability – You have the right to request that we transfer the data that we have collected to another organization, or directly to you, under certain conditions.</li>
          </ul>
          <p>If you wish to exercise any of these rights, please contact us.</p>

          <h2 className="text-xl font-semibold text-foreground">6. Children&apos;s Privacy</h2>
          <p>Our Service is not intended for use by children under the age of 13 (or a higher age threshold where applicable by local law). We do not knowingly collect personally identifiable information from children under 13. If we become aware that we have collected personal information from a child under 13 without verification of parental consent, we take steps to remove that information from our servers.</p>

          <h2 className="text-xl font-semibold text-foreground">7. Changes to This Privacy Policy</h2>
          <p>We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the &quot;Last Updated&quot; date. You are advised to review this Privacy Policy periodically for any changes.</p>

          <h2 className="text-xl font-semibold text-foreground">8. Contact Us</h2>
          <p>If you have any questions about this Privacy Policy, please contact us at [Your Contact Email Address or Link to Contact Page].</p>
          
          <p className="mt-6 text-xs">
            <strong>Disclaimer:</strong> This is a sample Privacy Policy. It is not a substitute for professional legal advice. You should consult with a legal professional to ensure this policy is appropriate for your specific data handling practices and complies with all applicable laws and regulations.
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

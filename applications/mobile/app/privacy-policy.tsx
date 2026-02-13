import { ScrollView } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function PrivacyPolicyScreen() {
  return (
    <ThemedView className="flex-1">
      <ScrollView contentContainerClassName="p-5 pb-10">
        <ThemedText type="title" className="mb-4 text-neutral-900 dark:text-white">
          Privacy Policy
        </ThemedText>

        <ThemedText type="subtitle" className="mb-1 mt-3 text-neutral-900 dark:text-white">
          Your Data
        </ThemedText>
        <ThemedText className="leading-5 text-neutral-700 dark:text-neutral-300">
          Your habit data is not sold or shared with third parties. It is stored solely to provide
          app functionality.
        </ThemedText>

        <ThemedText type="subtitle" className="mb-1 mt-5 text-neutral-900 dark:text-white">
          Advertising
        </ThemedText>
        <ThemedText className="leading-5 text-neutral-700 dark:text-neutral-300">
          We use Google AdMob to display ads. AdMob may collect device identifiers, IP address, and
          ad interaction data to serve and measure ads. See Google&apos;s privacy policy at
          policies.google.com/privacy for details. You can opt out of personalized ads in your device
          settings.
        </ThemedText>

        <ThemedText type="subtitle" className="mb-1 mt-5 text-neutral-900 dark:text-white">
          Authentication
        </ThemedText>
        <ThemedText className="leading-5 text-neutral-700 dark:text-neutral-300">
          Email and password authentication is managed by Firebase Authentication. We never store
          your password directly — it is handled entirely by Firebase.
        </ThemedText>

        <ThemedText type="subtitle" className="mb-1 mt-5 text-neutral-900 dark:text-white">
          What We Store
        </ThemedText>
        <ThemedText className="leading-5 text-neutral-700 dark:text-neutral-300">
          We store your activities and their history, linked to your Firebase user ID. No other
          personal information is collected or stored.
        </ThemedText>

        <ThemedText type="subtitle" className="mb-1 mt-5 text-neutral-900 dark:text-white">
          Deleting Your Data
        </ThemedText>
        <ThemedText className="leading-5 text-neutral-700 dark:text-neutral-300">
          You can delete individual activities from the activity detail page. To delete your entire
          account and all associated data, use the &ldquo;Delete Account&rdquo; button on the home
          screen.
        </ThemedText>
      </ScrollView>
    </ThemedView>
  );
}

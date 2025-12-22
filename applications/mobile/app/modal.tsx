import { Link } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function ModalScreen() {
  return (
    <ThemedView className="flex-1 items-center justify-center px-5">
      <ThemedView className="w-full max-w-[520px] rounded-[18px] border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-neutral-950">
        <ThemedText type="title" className="text-center text-neutral-900 dark:text-white">
          This is a modal
        </ThemedText>

        <ThemedText className="mt-2 text-center opacity-80 text-neutral-700 dark:text-neutral-300">
          You can dismiss this and return home.
        </ThemedText>

        <Link
          href="/"
          dismissTo
          className="mt-5 items-center justify-center rounded-[14px] border border-indigo-500/80 bg-indigo-500/10 px-4 py-3"
        >
          <ThemedText type="defaultSemiBold" className="text-neutral-900 dark:text-white">
            Go to home screen
          </ThemedText>
        </Link>
      </ThemedView>
    </ThemedView>
  );
}

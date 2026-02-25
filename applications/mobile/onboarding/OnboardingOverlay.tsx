import React from 'react';
import { Dimensions, Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import type { OnboardingStep } from './steps';

type TargetLayout = { x: number; y: number; width: number; height: number };

type Props = {
  step: OnboardingStep;
  targetLayout: TargetLayout;
  onNext: () => void;
  onSkipSection: () => void;
  showSkip: boolean;
};

const OVERLAY_COLOR = 'rgba(0,0,0,0.6)';
const PADDING = 8;

export function OnboardingOverlay({ step, targetLayout, onNext, onSkipSection, showSkip }: Props) {
  const { height: screenHeight } = Dimensions.get('window');
  const interactive = !!step.interactive;

  // Cutout area with padding
  const cutout = {
    x: targetLayout.x - PADDING,
    y: targetLayout.y - PADDING,
    width: targetLayout.width + PADDING * 2,
    height: targetLayout.height + PADDING * 2,
  };

  // Tooltip positioning
  const tooltipStyle =
    step.position === 'above'
      ? { bottom: screenHeight - cutout.y + 12 }
      : { top: cutout.y + cutout.height + 12 };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={interactive ? 'box-none' : 'auto'}>
      {/* Four overlay bars forming cutout */}
      {/* Top bar */}
      <View
        style={[styles.overlayBar, { top: 0, left: 0, right: 0, height: Math.max(0, cutout.y) }]}
        pointerEvents={interactive ? 'none' : 'auto'}
      />
      {/* Bottom bar */}
      <View
        style={[
          styles.overlayBar,
          { top: cutout.y + cutout.height, left: 0, right: 0, bottom: 0 },
        ]}
        pointerEvents={interactive ? 'none' : 'auto'}
      />
      {/* Left bar */}
      <View
        style={[
          styles.overlayBar,
          {
            top: cutout.y,
            left: 0,
            width: Math.max(0, cutout.x),
            height: cutout.height,
          },
        ]}
        pointerEvents={interactive ? 'none' : 'auto'}
      />
      {/* Right bar */}
      <View
        style={[
          styles.overlayBar,
          {
            top: cutout.y,
            left: cutout.x + cutout.width,
            right: 0,
            height: cutout.height,
          },
        ]}
        pointerEvents={interactive ? 'none' : 'auto'}
      />

      {/* Cutout border highlight */}
      <View
        style={[
          styles.cutoutBorder,
          {
            top: cutout.y,
            left: cutout.x,
            width: cutout.width,
            height: cutout.height,
          },
        ]}
        pointerEvents="none"
      />

      {/* Tooltip */}
      <View style={[styles.tooltip, { left: 16, right: 16 }, tooltipStyle]} pointerEvents="box-none">
        <View style={styles.tooltipCard}>
          <ThemedText
            style={styles.tooltipTitle}
            lightColor="#FFFFFF"
            darkColor="#FFFFFF"
          >
            {step.title}
          </ThemedText>
          <ThemedText
            style={styles.tooltipDescription}
            lightColor="rgba(255,255,255,0.85)"
            darkColor="rgba(255,255,255,0.85)"
          >
            {step.description}
          </ThemedText>

          <View style={styles.buttonRow}>
            {showSkip ? (
              <Pressable onPress={onSkipSection} style={styles.skipButton}>
                <ThemedText
                  style={styles.skipText}
                  lightColor="rgba(255,255,255,0.7)"
                  darkColor="rgba(255,255,255,0.7)"
                >
                  Skip {step.sectionTitle}
                </ThemedText>
              </Pressable>
            ) : null}
            <Pressable onPress={onNext} style={styles.nextButton}>
              <ThemedText
                style={styles.nextText}
                lightColor="#1E1B4B"
                darkColor="#1E1B4B"
              >
                Next
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlayBar: {
    position: 'absolute',
    backgroundColor: OVERLAY_COLOR,
  },
  cutoutBorder: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: 'rgba(129,140,248,0.6)',
    borderRadius: 8,
  },
  tooltip: {
    position: 'absolute',
  },
  tooltipCard: {
    backgroundColor: '#312E81',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(129,140,248,0.3)',
  },
  tooltipTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  tooltipDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 12,
    gap: 12,
  },
  skipButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  skipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  nextButton: {
    backgroundColor: '#818CF8',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  nextText: {
    fontSize: 14,
    fontWeight: '700',
  },
});

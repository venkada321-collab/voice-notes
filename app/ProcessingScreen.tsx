import React, { useEffect } from 'react';
import { ActivityIndicator, Animated, StyleSheet, Text, View } from 'react-native';

const colors = {
    bg: '#1A1A1A',
    gold: '#FFB300',
    text: '#FFFFFF',
    dim: '#A0A0A0',
};

interface ProcessingScreenProps {
    message?: string;
    submessage?: string;
}

export default function ProcessingScreen({
    message = "FISSION INTEL",
    submessage = "Analyzing transmission..."
}: ProcessingScreenProps) {
    const fadeAnim = new Animated.Value(0.4);

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 0.4,
                    duration: 1000,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, []);

    return (
        <View style={styles.container}>
            <View style={styles.card}>
                <ActivityIndicator size="large" color={colors.gold} style={styles.spinner} />
                <Text style={styles.title}>{message}</Text>
                <Animated.Text style={[styles.subtitle, { opacity: fadeAnim }]}>
                    {submessage}
                </Animated.Text>
                <Text style={styles.hint}>Extracting action items and summary</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.85)', // Dark semi-transparent overlay
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    card: {
        backgroundColor: '#2C2C2C',
        padding: 40,
        borderRadius: 20,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.gold,
        shadowColor: colors.gold,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    spinner: {
        marginBottom: 20,
        transform: [{ scale: 1.5 }],
    },
    title: {
        color: colors.gold,
        fontSize: 24,
        fontWeight: '900',
        letterSpacing: 2,
        marginBottom: 10,
    },
    subtitle: {
        color: colors.text,
        fontSize: 18,
        fontWeight: '500',
        marginBottom: 20,
    },
    hint: {
        color: colors.dim,
        fontSize: 14,
        fontStyle: 'italic',
    },
});

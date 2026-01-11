import { Feather } from '@expo/vector-icons';
import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const colors = {
    headerBg: '#1A1A1A',
    goldAccent: '#FFB300',
    textWhite: '#FFFFFF',
    textDim: '#A0A0A0',
    errorRed: '#FF4444',
};

interface InfoModalProps {
    visible: boolean;
    title: string;
    message: string;
    isError?: boolean;
    onClose: () => void;
}

export default function InfoModal({ visible, title, message, isError = false, onClose }: InfoModalProps) {
    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={[styles.container, isError && styles.errorBorder]}>
                    <Feather
                        name={isError ? "alert-circle" : "check-circle"}
                        size={48}
                        color={isError ? colors.errorRed : colors.goldAccent}
                        style={styles.icon}
                    />

                    <Text style={styles.title}>
                        {title}
                    </Text>

                    <Text style={styles.message}>
                        {message}
                    </Text>

                    <TouchableOpacity
                        onPress={onClose}
                        style={[styles.button, isError && styles.errorButton]}
                    >
                        <Text style={[styles.buttonText, isError && styles.errorButtonText]}>
                            {isError ? "Dismiss" : "OK"}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 30,
    },
    container: {
        width: '100%',
        backgroundColor: colors.headerBg,
        borderRadius: 20,
        padding: 30,
        borderWidth: 1,
        borderColor: colors.goldAccent,
        alignItems: 'center',
        elevation: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
    },
    errorBorder: {
        borderColor: colors.errorRed,
    },
    icon: {
        marginBottom: 20,
    },
    title: {
        color: colors.textWhite,
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 10,
        textAlign: 'center',
    },
    message: {
        color: colors.textDim,
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 25,
        lineHeight: 22,
    },
    button: {
        backgroundColor: colors.goldAccent,
        paddingVertical: 12,
        paddingHorizontal: 40,
        borderRadius: 12,
        width: '100%',
        alignItems: 'center',
    },
    errorButton: {
        backgroundColor: 'rgba(255, 68, 68, 0.2)',
        borderWidth: 1,
        borderColor: colors.errorRed,
    },
    buttonText: {
        color: colors.headerBg,
        fontWeight: 'bold',
        fontSize: 16,
    },
    errorButtonText: {
        color: colors.errorRed,
    },
});

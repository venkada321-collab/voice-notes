import { Feather, Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Vosk from 'react-native-vosk';
import { addMeeting } from './database';

const colors = {
    bg: '#333333',
    textWhite: '#FFFFFF',
    textDim: '#CCCCCC',
    recordBtn: '#000000',
    stopBtn: '#000000',
    pauseBtn: '#000000',
    check: '#000000',
};

export default function RecordModal({ onClose, onSave }: { onClose: () => void, onSave: () => void }) {
    const [status, setStatus] = useState<'idle' | 'recording' | 'paused' | 'done'>('idle');
    const [meetingName, setMeetingName] = useState('');
    const [transcription, setTranscription] = useState('');
    const [partialResult, setPartialResult] = useState('');
    const [isModelLoaded, setIsModelLoaded] = useState(false);

    // Load Vosk Model on Mount
    useEffect(() => {
        const loadModel = async () => {
            try {
                console.log('Loading usage model...');
                await Vosk.loadModel('model'); // Path relative to assets/models, defined in app.json
                setIsModelLoaded(true);
                console.log('Model loaded.');
            } catch (e) {
                console.error('Failed to load Vosk model', e);
                Alert.alert('Error', 'Failed to load offline transcription model.');
            }
        };
        loadModel();

        // Event Listeners
        const resultSub = Vosk.onResult((res) => {
            console.log('Result:', res);
            setTranscription(prev => prev + " " + res);
            setPartialResult('');
        });

        const partialSub = Vosk.onPartialResult((res) => {
            // res is usually the partial string
            setPartialResult(res);
        });

        const errorSub = Vosk.onError((e) => {
            console.error('Vosk Error:', e);
        });

        return () => {
            resultSub.remove();
            partialSub.remove();
            errorSub.remove();
            Vosk.unload(); // Cleanup
        };
    }, []);

    async function startRecording() {
        if (!isModelLoaded) {
            Alert.alert('Loading', 'Please wait for the model to load.');
            return;
        }
        try {
            console.log('Starting Vosk...');
            await Vosk.start();
            setStatus('recording');
        } catch (e) {
            console.error('Failed to start Vosk', e);
            Alert.alert('Error', 'Microphone permission or generic error.');
        }
    }

    async function pauseRecording() {
        // Vosk doesn't natively support "pause" in the same way expo-av does (it's a stream).
        // We can just stop knowing we will append to the same transcription state, 
        // or arguably just stop it.
        // For simplicity, let's treat pause as stop temporarily for the engine, 
        // but keep UI in "Paused" state. when resuming, we calls start() again.
        try {
            await Vosk.stop();
            setStatus('paused');
        } catch (e) {
            console.error(e);
        }
    }

    async function resumeRecording() {
        try {
            await Vosk.start();
            setStatus('recording');
        } catch (e) {
            console.error(e);
        }
    }

    async function stopRecording() {
        try {
            if (status === 'recording') {
                await Vosk.stop();
            }
            setStatus('done');
        } catch (e) {
            console.error(e);
            setStatus('done');
        }
    }

    async function handleSave() {
        if (!meetingName.trim()) {
            Alert.alert("Title required", "Please enter a name for this recording.");
            return;
        }
        await addMeeting(meetingName, transcription.trim());
        onSave(); // Refresh data in parent
        onClose();
    }

    // --- RENDER HELPERS ---

    if (status === 'done') {
        return (
            <View style={[styles.container, styles.doneContainer]}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Record</Text>
                </View>

                <View style={styles.content}>
                    <Text style={styles.doneTitle}>Done</Text>

                    <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>Name this recording:</Text>
                        <TextInput
                            style={styles.textInput}
                            value={meetingName}
                            onChangeText={setMeetingName}
                            placeholder="Meeting Name"
                            placeholderTextColor="#999"
                            autoFocus
                        />
                    </View>

                    <Text style={styles.inputLabel}>Transcription:</Text>
                    <ScrollView style={styles.transcriptionBox}>
                        <Text style={styles.transcriptionText}>{transcription} {partialResult}</Text>
                    </ScrollView>

                    <TouchableOpacity onPress={handleSave} style={styles.checkButton}>
                        <Feather name="check" size={60} color="black" />
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Record</Text>
            </View>

            <View style={styles.contentCenter}>
                {status === 'idle' && (
                    <View style={{ alignItems: 'center' }}>
                        <TouchableOpacity onPress={startRecording} style={styles.recButton}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <View style={styles.redDot} />
                                <Text style={styles.recText}>REC</Text>
                            </View>
                        </TouchableOpacity>
                        {!isModelLoaded && <Text style={{ marginTop: 10, color: '#999' }}>Loading Model...</Text>}
                    </View>
                )}

                {(status === 'recording' || status === 'paused') && (
                    <>
                        <Text style={styles.statusText}>
                            {status === 'recording' ? 'Listening...\n' : 'Paused'}
                        </Text>
                        {/* Live Transcription Preview */}
                        <View style={styles.livePreview}>
                            <Text numberOfLines={3} style={styles.liveText}>
                                {transcription.slice(-100)} {partialResult}
                            </Text>
                        </View>

                        <View style={styles.controlsRow}>
                            {status === 'recording' ? (
                                <TouchableOpacity onPress={pauseRecording} style={styles.controlBtn}>
                                    <Ionicons name="pause" size={30} color="white" />
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity onPress={resumeRecording} style={styles.controlBtn}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <View style={styles.redDotSmall} />
                                        <Text style={styles.recTextSmall}>REC</Text>
                                    </View>
                                </TouchableOpacity>
                            )}

                            <TouchableOpacity onPress={stopRecording} style={styles.controlBtn}>
                                <View style={styles.stopSquare} />
                            </TouchableOpacity>
                        </View>
                    </>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    doneContainer: {
        backgroundColor: '#fff',
    },
    header: {
        height: 60,
        backgroundColor: '#444',
        justifyContent: 'center',
        paddingHorizontal: 20,
        paddingTop: 0,
    },
    headerTitle: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '400',
    },
    contentCenter: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    content: { // For Done screen
        flex: 1,
        padding: 30,
        backgroundColor: '#fff',
        justifyContent: 'flex-start',
    },

    // IDLE
    recButton: {
        width: 60,
        height: 40,
        backgroundColor: 'black',
        borderRadius: 4,
        justifyContent: 'center',
        alignItems: 'center',
    },
    recText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
        marginLeft: 4,
    },
    redDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: 'white',
    },

    // RECORDING / PAUSED
    statusText: {
        fontSize: 24,
        color: 'black',
        marginBottom: 20,
        textAlign: 'center',
        fontFamily: 'monospace',
    },
    livePreview: {
        height: 100,
        width: '80%',
        marginBottom: 40,
        justifyContent: 'center',
    },
    liveText: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
    },
    controlsRow: {
        flexDirection: 'row',
        gap: 30,
    },
    controlBtn: {
        width: 60,
        height: 60,
        backgroundColor: 'black',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    stopSquare: {
        width: 20,
        height: 20,
        backgroundColor: 'white',
    },
    redDotSmall: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: 'white',
    },
    recTextSmall: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 12,
        marginLeft: 3,
    },

    // DONE SCREEN
    doneTitle: {
        fontSize: 32,
        fontWeight: '400',
        marginBottom: 20,
        marginTop: 0,
    },
    inputContainer: {
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 16,
        marginBottom: 10,
        fontWeight: 'bold',
    },
    textInput: {
        borderWidth: 1,
        borderColor: '#000',
        height: 40,
        paddingHorizontal: 10,
        maxWidth: 250,
        backgroundColor: '#fff',
    },
    transcriptionBox: {
        maxHeight: 200,
        borderWidth: 1,
        borderColor: '#ccc',
        padding: 10,
        marginBottom: 20,
    },
    transcriptionText: {
        fontSize: 14,
        color: '#333',
    },
    checkButton: {
        alignSelf: 'center',
        marginTop: 10,
    },
});

import { Feather, Ionicons } from '@expo/vector-icons';
import { File as ExpoFile, Paths } from 'expo-file-system';
import React, { useEffect, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as Vosk from 'react-native-vosk';
import { unzip, unzipAssets } from 'react-native-zip-archive';
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

export default function RecordModal({ onClose, onSave }: { onClose: () => void, onSave: (transcription: string) => void }) {
    const [status, setStatus] = useState<'idle' | 'recording' | 'paused' | 'done'>('idle');
    const [meetingName, setMeetingName] = useState('');
    const [transcription, setTranscription] = useState('');
    const [partialResult, setPartialResult] = useState('');
    const [isModelLoaded, setIsModelLoaded] = useState(false);

    // Load Vosk Model on Mount
    useEffect(() => {
        const loadModel = async () => {
            try {
                const docDir = Paths.document;
                if (!docDir) throw new Error("No doc dir");

                // Target directory for the unzipped model folder
                const modelDir = new ExpoFile(docDir, 'model'); // 'model' is the folder name inside zip

                if (!modelDir.exists) {
                    // Extracting Speech Model... (Silently)

                    if (Platform.OS === 'android') {
                        // Android: Extract directly from Assets
                        try {
                            const targetPath = docDir.uri.replace('file://', '');
                            await unzipAssets('vosk-model.zip', targetPath);
                        } catch (e: any) {
                            console.error('Vosk unzip failed', e);
                            Alert.alert('Error', 'Failed to unzip models: ' + e.message);
                        }
                    } else {
                        // iOS/Dev Fallback
                        const zipName = 'vosk-model.zip';
                        const tempZip = new ExpoFile(Paths.cache, zipName);
                        const assetUri = Paths.bundle + '/' + zipName;
                        const assetFile = new ExpoFile(assetUri);

                        if (assetFile.exists) {
                            await assetFile.copy(tempZip);
                        }

                        if (tempZip.exists) {
                            await unzip(tempZip.uri, docDir.uri);
                            await tempZip.delete();
                        }
                    }
                }

                // Now load from the unzipped directory
                // React-native-vosk expects a path. It might handle file:// or absolute path.
                // Paths.document.uri usually is file:///...
                // We'll pass the relative name if it supports it, or full path.
                // The library usually looks in external files dir if passed a name, but we can pass full path.
                // Let's try passing the full path.

                const modelPath = modelDir.uri.replace('file://', '');
                await Vosk.loadModel(modelPath);
                setIsModelLoaded(true);

            } catch (e: any) {
                console.error('Failed to load Vosk model', e);
                Alert.alert('Error', 'Failed to load offline transcription model: ' + (e.message || JSON.stringify(e)));
            }
        };
        loadModel();

        // Event Listeners

        // onResult fires on natural pauses - accumulate finalized segments
        const resultSub = Vosk.onResult((res) => {
            if (res && res.trim()) {
                setTranscription(prev => prev + " " + res);
            }
            setPartialResult('');
        });

        // onPartialResult - live display only (real-time preview)
        const partialSub = Vosk.onPartialResult((res) => {
            setPartialResult(res);
        });

        const errorSub = Vosk.onError((e) => {
            console.error('Vosk Error:', e);
        });

        // onFinalResult fires when stop() is called - capture final segment
        const finalSub = Vosk.onFinalResult((res) => {
            if (res && res.trim()) {
                setTranscription(prev => prev + " " + res);
            }
            setPartialResult('');
        });

        return () => {
            resultSub.remove();
            partialSub.remove();
            errorSub.remove();
            finalSub.remove();
            Vosk.unload(); // Cleanup
        };
    }, []);

    async function startRecording() {
        if (!isModelLoaded) {
            Alert.alert('Loading', 'Please wait for the model to load.');
            return;
        }
        try {

            await Vosk.start();
            setStatus('recording');
        } catch (e: any) {
            console.error('Failed to start Vosk', e);
            Alert.alert('Vosk Error', `Failed to start: ${e?.message || e}`);
        }
    }

    async function pauseRecording() {
        // Vosk doesn't natively support "pause" - we stop the engine and rely on
        // onFinalResult to capture any remaining text. Resume calls start() again.
        try {
            await Vosk.stop();
            // onFinalResult will fire and capture remaining text
            setStatus('paused');
        } catch (e: any) {
            console.error(e);
            Alert.alert('Error', `Failed to pause: ${e?.message || e}`);
        }
    }

    async function resumeRecording() {
        try {
            await Vosk.start();
            setStatus('recording');
        } catch (e: any) {
            console.error(e);
            Alert.alert('Error', `Failed to resume: ${e?.message || e}`);
        }
    }

    async function stopRecording() {
        try {
            if (status === 'recording') {
                await Vosk.stop();
                // onFinalResult will fire and capture remaining text
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
        await addMeeting(meetingName);
        onSave(transcription.trim());
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
                    <Text style={styles.warningText}>⚠️ Important: Copy text now if you want to keep the raw version.</Text>
                    <Text style={styles.warningText}>✏️ Tip: Verify and modify any wrong interpretations below before saving.</Text>
                    <ScrollView style={styles.transcriptionBox} keyboardShouldPersistTaps="handled">
                        <TextInput
                            style={styles.transcriptionInput}
                            value={transcription}
                            onChangeText={setTranscription}
                            multiline
                            scrollEnabled={false} // Let the ScrollView handle scrolling
                            textAlignVertical="top"
                        />
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
                                    <Ionicons name="play" size={30} color="white" />
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
    transcriptionInput: {
        fontSize: 14,
        color: '#333',
        minHeight: 100,
        textAlignVertical: 'top',
    },
    checkButton: {
        alignSelf: 'center',
        marginTop: 10,
    },
    warningText: {
        fontSize: 12,
        color: '#FF3B30', // Red/Orange warning color
        fontStyle: 'italic',
        marginBottom: 8,
    },
});

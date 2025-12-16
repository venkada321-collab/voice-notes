import { useEffect, useState } from 'react';
import { Alert, Image, Modal, Platform, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
// Using Feather for sleeker action icons, Ionicons & Entypo for others
import { Entypo, Feather, FontAwesome5, Ionicons } from '@expo/vector-icons';
// Import your DB functions
import { addTask, deleteMeeting, deleteTask, getMeetings, getTasksForMeeting, initDatabase, updateMeeting, updateTask } from './database';
import RecordModal from './RecordModal';
import { extractActionItems } from './services/llm';
// Import your DB functions
// --- Shared Color Palette ---
const colors = {
  headerBg: '#1A1A1A',      // Deep Charcoal
  cardBg: '#2C2C2C',        // Off-black for cards
  goldAccent: '#FFB300',    // Vibrant Amber/Gold
  textWhite: '#FFFFFF',
  textDim: '#A0A0A0',       // Light Grey for subtitles/inactive
  navBg: '#F8F8F8',         // Off-white for bottom nav
};

// ==========================================
//   TASK MODAL COMPONENT (from previous turn)
// ==========================================
// Added an onClose prop to handle dismissing the modal
function TaskModal({ onClose }: { onClose: () => void }): JSX.Element {
  const [activeTabIndex, setActiveTabIndex] = useState<number>(0);
  // 1. STATE for dynamic data
  const [meetings, setMeetings] = useState<any[]>([]); // The Pills
  const [tasks, setTasks] = useState<any[]>([]);       // The Tasks
  const [activeTabId, setActiveTabId] = useState<number | null>(null);

  // Edit State
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitleText, setEditTitleText] = useState('');
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [editTaskText, setEditTaskText] = useState('');

  // 1a. State for Record Modal
  const [showRecordModal, setShowRecordModal] = useState(false);
  // Need to know the transcription for the last saved meeting? 
  // Actually getMeetings returns the full object including transcription, so we are good.

  // 2. INITIAL LOAD
  const loadMeetings = async () => {
    const loadedMeetings = await getMeetings();
    setMeetings(loadedMeetings);

    // Set first tab as active by default if not set
    if (loadedMeetings.length > 0 && activeTabId === null) {
      setActiveTabId(loadedMeetings[0].id);
    }
  };

  useEffect(() => {
    const init = async () => {
      await initDatabase(); // Ensure DB is ready
      await loadMeetings();
    };
    init();
  }, []);

  const handleMeetingSaved = async () => {
    // 1. Reload the meetings list
    const newMeetings = await getMeetings(); // Fetch directly instead of relying on loadMeetings state update lag
    setMeetings(newMeetings);

    // 2. Auto-select the last one (the new one)
    if (newMeetings.length > 0) {
      const newMeeting = newMeetings[newMeetings.length - 1];
      setActiveTabId(newMeeting.id);

      // Also update the index for the UI pill highlight
      const newIndex = newMeetings.length - 1;
      setActiveTabIndex(newIndex);

      // 3. Trigger Async Action Extraction
      Alert.alert('Debug', `Triggering extraction for: ${newMeeting.title}`);

      extractActionItems(newMeeting.transcription || newMeeting.title).then(async (actions) => {
        Alert.alert('Debug', `Extraction finished. Found ${actions ? actions.length : 0} actions.`);

        if (actions && actions.length > 0) {
          console.log('Extracted actions:', actions);
          for (const action of actions) {
            await addTask(newMeeting.id, action);
          }
          // Refresh tasks if we are still on this tab (using Ref for current value)
          if (activeTabIdRef.current === newMeeting.id) {
            const updatedTasks = await getTasksForMeeting(newMeeting.id);
            setTasks(updatedTasks);
            Alert.alert('Success', 'Tasks updated directly!');
          }
        }
      }).catch(err => {
        console.error('Extraction failed:', err);
        Alert.alert('Error', 'Extraction failed: ' + JSON.stringify(err));
      });
    }
  };

  // 3. FETCH TASKS when Tab changes
  useEffect(() => {
    activeTabIdRef.current = activeTabId; // Update ref
    const fetchTasks = async () => {
      if (activeTabId !== null) {
        const loadedTasks = await getTasksForMeeting(activeTabId);
        setTasks(loadedTasks);
      } else {
        setTasks([]);
      }
      // Reset edit states
      setIsEditingTitle(false);
      setEditingTaskId(null);
    };
    fetchTasks();
  }, [activeTabId]); // Re-run whenever activeTabId changes

  // --- CRUD HANDLERS ---
  const handleDeleteMeeting = async () => {
    if (activeTabId === null) return;

    Alert.alert("Delete Meeting", "Are you sure? All tasks will be lost.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive", onPress: async () => {
          try {
            await deleteMeeting(activeTabId);
            const newMeetings = await getMeetings();
            setMeetings(newMeetings);
            Alert.alert('Success', 'Meeting deleted');

            if (newMeetings.length > 0) {
              const next = newMeetings[Math.max(0, newMeetings.length - 1)];
              setActiveTabIndex(newMeetings.indexOf(next));
              setActiveTabId(next.id);
            } else {
              setActiveTabId(null);
              setActiveTabIndex(0);
            }
          } catch (err: any) {
            Alert.alert('Error', 'Failed to delete meeting: ' + err.message);
          }
        }
      }
    ]);
  };

  const handleStartEditTitle = () => {
    const current = meetings.find(m => m.id === activeTabId);
    if (!current) return;
    setEditTitleText(current.title);
    setIsEditingTitle(true);
  };

  const handleSaveTitle = async () => {
    if (activeTabId === null) return;
    try {
      await updateMeeting(activeTabId, editTitleText);
      setIsEditingTitle(false);
      const newMeetings = await getMeetings();
      setMeetings(newMeetings);
      Alert.alert('Success', 'Meeting updated');
    } catch (err: any) {
      Alert.alert('Error', 'Failed to update meeting: ' + err.message);
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    try {
      await deleteTask(taskId);
      if (activeTabId) {
        const uTasks = await getTasksForMeeting(activeTabId);
        setTasks(uTasks);
      }
      Alert.alert('Success', 'Task deleted');
    } catch (err: any) {
      Alert.alert('Error', 'Failed to delete task: ' + err.message);
    }
  };

  const handleStartEditTask = (task: any) => {
    setEditingTaskId(task.id);
    setEditTaskText(task.content);
  };

  const handleSaveTask = async (taskId: number) => {
    try {
      await updateTask(taskId, editTaskText);
      setEditingTaskId(null);
      if (activeTabId) {
        const uTasks = await getTasksForMeeting(activeTabId);
        setTasks(uTasks);
      }
      Alert.alert('Success', 'Task updated');
    } catch (err: any) {
      Alert.alert('Error', 'Failed to update task: ' + err.message);
    }
  };
  return (
    <SafeAreaView style={modalStyles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.headerBg} />

      {/* 1. Header Section with CLOSE button */}
      <View style={modalStyles.headerContainer}>
        <View>
          <Text style={modalStyles.headerTitle}>Task Main</Text>
        </View>
        {/* Close Button */}
        <TouchableOpacity onPress={onClose} style={modalStyles.closeButton}>
          <Feather name="x" size={28} color={colors.textWhite} />
        </TouchableOpacity>
      </View>

      {/* 2. Interactive Filter Tabs (Pills) */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={modalStyles.tabContainer}
        style={{ flexGrow: 0, maxHeight: 80 }}
      >
        {meetings.map((meeting: any, index: number) => {
          const isActive = index === activeTabIndex;
          return (
            <TouchableOpacity
              key={index}
              activeOpacity={0.8}
              onPress={() => {
                setActiveTabIndex(index);
                setActiveTabId(meeting.id);
              }}
              style={[
                modalStyles.pillButton,
                isActive ? modalStyles.pillActive : modalStyles.pillInactive
              ]}
            >
              <Text style={[
                modalStyles.pillText,
                isActive ? modalStyles.pillTextActive : modalStyles.pillTextInactive
              ]}>
                {meeting.title}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* 3. Main Content Area (Gold Background) */}
      <View style={modalStyles.contentContainer}>
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          {/* Section Header */}
          <View style={modalStyles.sectionHeader}>
            {isEditingTitle ? (
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <TextInput
                  style={[modalStyles.sectionTitle, { flex: 1, borderBottomWidth: 1, borderBottomColor: colors.headerBg, padding: 0 }]}
                  value={editTitleText}
                  onChangeText={setEditTitleText}
                  autoFocus
                  onSubmitEditing={handleSaveTitle}
                />
                <TouchableOpacity onPress={handleSaveTitle}>
                  <Feather name="check" size={24} color={colors.headerBg} />
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Text style={modalStyles.sectionTitle}>{meetings.find(m => m.id === activeTabId)?.title || "No Meetings"}</Text>
                {activeTabId && (
                  <View style={modalStyles.sectionIcons}>
                    <TouchableOpacity style={modalStyles.iconButton} onPress={handleStartEditTitle}>
                      <Feather name="edit-2" size={24} color={colors.textWhite} />
                    </TouchableOpacity>
                    <TouchableOpacity style={modalStyles.iconButton} onPress={handleDeleteMeeting}>
                      <Feather name="trash-2" size={24} color={colors.textWhite} />
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}
          </View>

          {/* Task List - Now using modern CARDS */}
          <View style={modalStyles.taskList}>
            {tasks.map((task: any, index: number) => (
              <View key={index} style={modalStyles.taskCard}>
                {editingTaskId === task.id ? (
                  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <TextInput
                      style={[modalStyles.taskText, { flex: 1, borderBottomWidth: 1, borderBottomColor: colors.textDim, padding: 0 }]}
                      value={editTaskText}
                      onChangeText={setEditTaskText}
                      autoFocus
                      onSubmitEditing={() => handleSaveTask(task.id)}
                    />
                    <TouchableOpacity onPress={() => handleSaveTask(task.id)}>
                      <Feather name="check" size={24} color={colors.textWhite} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <>
                    <Text style={modalStyles.taskText}>{task.content}</Text>
                    <View style={modalStyles.taskIcons}>
                      <TouchableOpacity style={modalStyles.actionIcon} onPress={() => handleStartEditTask(task)}>
                        <Feather name="edit" size={20} color={colors.textDim} />
                      </TouchableOpacity>
                      <TouchableOpacity style={modalStyles.actionIcon} onPress={() => handleDeleteTask(task.id)}>
                        <Ionicons name="close-circle-outline" size={24} color={colors.textDim} />
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* 4. Bottom Navigation Bar */}
      <View style={modalStyles.bottomNav}>
        <TouchableOpacity activeOpacity={0.7}>
          <Entypo name="home" size={30} color={colors.goldAccent} />
        </TouchableOpacity>
        <TouchableOpacity activeOpacity={0.7} onPress={() => setShowRecordModal(true)}>
          <FontAwesome5 name="plus-square" size={28} color="#333" />
        </TouchableOpacity>
      </View>

      <Modal
        animationType="slide"
        visible={showRecordModal}
        onRequestClose={() => setShowRecordModal(false)}
      >
        <RecordModal onClose={() => setShowRecordModal(false)} onSave={handleMeetingSaved} />
      </Modal>
    </SafeAreaView>
  );
}


// ==========================================
//   MAIN APP COMPONENT (Homepage)
// ==========================================
export default function App(): JSX.Element {
  // State to control whether the modal is visible
  const [showModal, setShowModal] = useState(false);

  return (
    <SafeAreaView style={homeStyles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.headerBg} />

      {/* The Modal Itself */}
      <Modal
        animationType="slide"
        visible={showModal}
        onRequestClose={() => setShowModal(false)} // Android back button handler
      >
        <TaskModal onClose={() => setShowModal(false)} />
      </Modal>

      {/* --- Homepage Content --- */}
      <View style={homeStyles.contentCenter}>

        {/* Main Title */}
        <Text style={homeStyles.title}>FISSION</Text>

        {/* "by" Section with Improved Image Style */}
        <View style={homeStyles.bySection}>
          <Text style={homeStyles.byText}>by</Text>
          {/* Container for the image to add border/glow */}
          <View style={homeStyles.imageContainer}>
            <Image
              source={require('../assets/images/subatomic_logo.png')}
              style={homeStyles.logoImage}
            />
          </View>
        </View>
      </View>

      {/* Bottom "START" Button */}
      <View style={homeStyles.bottomContainer}>
        <TouchableOpacity
          style={homeStyles.startButton}
          activeOpacity={0.8}
          onPress={() => setShowModal(true)} // Open the modal on press
        >
          <Text style={homeStyles.startButtonText}>START</Text>
          {/* Added an icon for a modern feel */}
          <Feather name="arrow-right-circle" size={24} color={colors.headerBg} style={{ marginLeft: 10 }} />
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
}

// ==========================================
//   STYLES
// ==========================================

// --- Homepage Styles ---
const homeStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.headerBg, // Dark premium background
    justifyContent: 'space-between', // Pushes content to center and button to bottom
  },
  contentCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  title: {
    fontSize: 42,
    fontWeight: '900',
    color: colors.textWhite,
    letterSpacing: 1.5,
    marginBottom: 30,
    textAlign: 'center',
  },
  bySection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  byText: {
    fontSize: 24,
    color: colors.textDim,
    fontWeight: '300',
    marginRight: 20,
    fontStyle: 'italic',
  },
  imageContainer: {
    // Creates the glowing amber border effect
    padding: 4,
    backgroundColor: colors.headerBg,
    borderRadius: 60, // Half of width/height + padding for a perfect circle
    borderWidth: 2,
    borderColor: colors.goldAccent,
    // Add a subtle shadow/glow
    shadowColor: colors.goldAccent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 10,
  },
  logoImage: {
    width: 100,
    height: 100,
    borderRadius: 50, // Ensures the image itself is circular
    backgroundColor: '#333', // Placeholder color in case image fails to load
  },
  bottomContainer: {
    padding: 30,
    paddingBottom: 50, // Extra padding for bottom screens
  },
  startButton: {
    backgroundColor: colors.goldAccent,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 18,
    borderRadius: 30,
    // Prominent shadow for a "clickable" feel
    shadowColor: colors.goldAccent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  startButtonText: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.headerBg, // Dark text on gold background
    letterSpacing: 1,
  },
});

// --- Modal Styles (from previous design) ---
const modalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.headerBg,
  },
  // Header
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 24,
    backgroundColor: colors.headerBg,
  },
  closeButton: {
    padding: 5,
    marginTop: 5,
  },
  headerSubText: {
    color: colors.textDim,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  headerTitle: {
    color: colors.textWhite,
    fontSize: 34,
    fontWeight: '800',
  },
  // Tabs
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.headerBg,
    paddingBottom: 24,
    paddingHorizontal: 24,
    gap: 12,
    alignItems: 'center', // Align items vertically
  },
  pillButton: {
    borderRadius: 30,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderWidth: 1,
  },
  pillActive: {
    backgroundColor: colors.goldAccent,
    borderColor: colors.goldAccent,
  },
  pillInactive: {
    backgroundColor: 'transparent',
    borderColor: colors.textDim,
  },
  pillText: {
    fontSize: 14,
    fontWeight: '700',
  },
  pillTextActive: {
    color: '#000000',
  },
  pillTextInactive: {
    color: colors.textDim,
  },
  // Content Area
  contentContainer: {
    flex: 1,
    backgroundColor: colors.goldAccent,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
  },
  sectionTitle: {
    fontSize: 22,
    color: colors.headerBg,
    fontWeight: '800',
  },
  sectionIcons: {
    flexDirection: 'row',
    gap: 20,
    backgroundColor: 'rgba(0,0,0,0.1)',
    padding: 8,
    borderRadius: 12,
  },
  iconButton: {
    padding: 4,
  },
  // Task Cards
  taskList: {
    width: '100%',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  taskCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.cardBg,
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderRadius: 16,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4.65,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  taskText: {
    color: colors.textWhite,
    fontSize: 18,
    fontWeight: '600',
  },
  taskIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  actionIcon: {
    padding: 4,
  },
  goldFiller: {
    flex: 1,
    backgroundColor: colors.goldAccent,
  },
  // Bottom Nav
  bottomNav: {
    height: 80,
    backgroundColor: colors.navBg,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: 10,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
});

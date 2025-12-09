import { useEffect, useState } from 'react';
import { Image, Modal, Platform, SafeAreaView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
// Using Feather for sleeker action icons, Ionicons & Entypo for others
import { Entypo, Feather, FontAwesome5, Ionicons } from '@expo/vector-icons';
// Import your DB functions
import { getMeetings, getTasksForMeeting, initDatabase } from './database';
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

  // 2. INITIAL LOAD
  useEffect(() => {
    const loadData = async () => {
      await initDatabase(); // Ensure DB is ready
      const loadedMeetings = await getMeetings();
      setMeetings(loadedMeetings);

      // Set first tab as active by default
      if (loadedMeetings.length > 0) {
        setActiveTabId(loadedMeetings[0].id);
      }
    };
    loadData();
  }, []);

  // 3. FETCH TASKS when Tab changes
  useEffect(() => {
    const fetchTasks = async () => {
      if (activeTabId !== null) {
        const loadedTasks = await getTasksForMeeting(activeTabId);
        setTasks(loadedTasks);
      }
    };
    fetchTasks();
  }, [activeTabId]); // Re-run whenever activeTabId changes
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
      <View style={modalStyles.tabContainer}>
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
      </View>

      {/* 3. Main Content Area (Gold Background) */}
      <View style={modalStyles.contentContainer}>

        {/* Section Header */}
        <View style={modalStyles.sectionHeader}>
          <Text style={modalStyles.sectionTitle}>{meetings[activeTabIndex]?.title}</Text>
          <View style={modalStyles.sectionIcons}>
            <TouchableOpacity style={modalStyles.iconButton}>
              <Feather name="edit-2" size={24} color={colors.textWhite} />
            </TouchableOpacity>
            <TouchableOpacity style={modalStyles.iconButton}>
              <Feather name="trash-2" size={24} color={colors.textWhite} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Task List - Now using modern CARDS */}
        <View style={modalStyles.taskList}>
          {tasks.map((task: any, index: number) => (
            <View key={index} style={modalStyles.taskCard}>
              <Text style={modalStyles.taskText}>{task.content}</Text>
              <View style={modalStyles.taskIcons}>
                <TouchableOpacity style={modalStyles.actionIcon}>
                  <Feather name="edit" size={20} color={colors.textDim} />
                </TouchableOpacity>
                <TouchableOpacity style={modalStyles.actionIcon}>
                  <Ionicons name="close-circle-outline" size={24} color={colors.textDim} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        {/* Gold Filler to cover remaining space */}
        <View style={modalStyles.goldFiller} />

      </View>

      {/* 4. Bottom Navigation Bar */}
      <View style={modalStyles.bottomNav}>
        <TouchableOpacity activeOpacity={0.7}>
          <Entypo name="home" size={30} color={colors.goldAccent} />
        </TouchableOpacity>
        <TouchableOpacity activeOpacity={0.7}>
          <FontAwesome5 name="plus-square" size={28} color="#333" />
        </TouchableOpacity>
      </View>
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
        <Text style={homeStyles.title}>VOICE NOTES</Text>

        {/* "by" Section with Improved Image Style */}
        <View style={homeStyles.bySection}>
          <Text style={homeStyles.byText}>by</Text>
          {/* Container for the image to add border/glow */}
          <View style={homeStyles.imageContainer}>
            {/* REPLACE THIS WITH YOUR IMAGE SOURCE */}
            <Image
              source={{ uri: 'https://via.placeholder.com/150' }} // Replace with your image_1.png asset
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

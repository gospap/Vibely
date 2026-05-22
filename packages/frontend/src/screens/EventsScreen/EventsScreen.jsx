import {
  View,
  Text,
  FlatList,
  Image,
  SafeAreaView,
  Modal,
  Pressable,
} from "react-native";
import React, { useEffect, useState } from "react";
import styles from "./EventsScreen.styles";
import { API_URL } from "../../constants/api";

export default function EventsScreen() {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await fetch(`${API_URL}/events`);
        const data = await res.json();
        setEvents(data);
      } catch (e) {
        console.error(e);
      }
    };

    fetchEvents();
  }, []);

  const handleEventDetails = (event) => {
    setSelectedEvent(event);
    setModalVisible(true);
  };

  const renderItem = ({ item }) => {
    return (
      <Pressable style={styles.card} onPress={() => handleEventDetails(item)}>
        <Image source={{ uri: item.images?.[0] }} style={styles.image} />

        <Text style={styles.title}>{item.title}</Text>

        <Text style={styles.date}>
          {new Date(item.startDate).toLocaleDateString()}
        </Text>

        <Text style={styles.genre}>{item.musicGenre}</Text>

        <Text style={styles.description} numberOfLines={3}>
          {item.description}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <SafeAreaView>
        {modalVisible && selectedEvent && (
          <Modal
            animationType="slide"
            transparent={true}
            visible={modalVisible}
            onRequestClose={() => setModalVisible(false)}
          >
            <View style={styles.modalBackdrop}>
              <Pressable
                style={{ flex: 1 }}
                onPress={() => setModalVisible(false)}
              />
              <View style={styles.modalCard}>
                <Image
                  source={{ uri: selectedEvent.images?.[0] }}
                  style={styles.modalImage}
                />
                <Text style={styles.modalTitle}>{selectedEvent.title}</Text>

                <Text style={styles.modalDate}>
                  {new Date(selectedEvent.startDate).toLocaleDateString()}
                </Text>

                <Text style={styles.modalGenre}>
                  {selectedEvent.musicGenre}
                </Text>

                <Text style={styles.modalDescription}>
                  {selectedEvent.description}
                </Text>

                <Pressable
                  style={styles.closeButton}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.closeButtonText}>Close</Text>
                </Pressable>
              </View>
            </View>
          </Modal>
        )}
        <FlatList
          data={events}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          numColumns={2}
          columnWrapperStyle={{ justifyContent: "space-between" }}
          contentContainerStyle={{ paddingBottom: 50 }}
          showsVerticalScrollIndicator={false}
        />
      </SafeAreaView>
    </View>
  );
}

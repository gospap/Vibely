import React, { useContext } from "react";
import {
  SafeAreaView,
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { AuthContext } from "../../context/AuthContext";
import TriangleLoader from "../../components/TriangleLoader";
import styles from "./ProfileScreen.styles";

export default function ProfileScreen() {
  const { user, logout } = useContext(AuthContext);

  const avatarUri = user?.profileImageUrl || "https://i.pravatar.cc/200?img=12";

  const handleLogout = async () => {
    await logout();
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <TriangleLoader color="#4F7CFF" size={40} />
        <Text style={styles.loadingText}>Φόρτωση προφίλ...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Image source={{ uri: avatarUri }} style={styles.avatar} />
          <Text style={styles.name}>{user.username || "Χρήστης"}</Text>
          <Text style={styles.email}>{user.email}</Text>
        </View>

        <View style={styles.cardsRow}>
          <View style={styles.card}>
            <Text style={styles.cardValue}>
              {user.onGoingEvents?.length ?? 0}
            </Text>
            <Text style={styles.cardLabel}>Εκδηλώσεις</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardValue}>{user.friends?.length ?? 0}</Text>
            <Text style={styles.cardLabel}>Φίλοι</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardValue}>
              {user.friendRequests?.length ?? 0}
            </Text>
            <Text style={styles.cardLabel}>Αιτήματα</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Λεπτομέρειες λογαριασμού</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Αναγνωριστικό</Text>
            <Text style={styles.detailValue}>{user.id}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Τύπος λογαριασμού</Text>
            <Text style={styles.detailValue}>{user.type || "user"}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Όνομα χρήστη</Text>
            <Text style={styles.detailValue}>{user.username}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Email</Text>
            <Text style={styles.detailValue}>{user.email}</Text>
          </View>
          {user.gender ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Φύλο</Text>
              <Text style={styles.detailValue}>{user.gender}</Text>
            </View>
          ) : null}
          {user.dateOfBirth ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Ημερομηνία γέννησης</Text>
              <Text style={styles.detailValue}>
                {new Date(user.dateOfBirth).toLocaleDateString()}
              </Text>
            </View>
          ) : null}
          {user.createdAt ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Μέλος από</Text>
              <Text style={styles.detailValue}>
                {new Date(user.createdAt).toLocaleDateString()}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionButton} onPress={handleLogout}>
            <Text style={styles.actionButtonText}>Αποσύνδεση</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

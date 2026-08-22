import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import SafeImage from '../components/SafeImage';
import { useSafeNavigation } from '../hooks/useSafeNavigation';
import {
  Plus,
  Search,
  PackageOpen,
  Trash2,
  Upload,
} from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import ScreenHeader from '../components/ScreenHeader';
import { useMarketItems } from '../context/MarketItemsContext';

export default function AdminMarketplaceScreen({ navigation: rawNav }) {
  const navigation = useSafeNavigation(rawNav);
  const { items, addItem, removeItem } = useMarketItems();

  // Upload form state
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [location, setLocation] = useState('');
  const [imageUri, setImageUri] = useState(null);

  // Real-time alphabetical search
  const [query, setQuery] = useState('');

  const pickImage = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'image/*',
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImageUri(result.assets[0].uri);
      }
    } catch (e) {
      Alert.alert('Upload error', 'Could not open the picker.');
    }
  };

  const submitItem = () => {
    if (!title.trim()) {
      Alert.alert('Title required', 'Enter a title for the item.');
      return;
    }
    if (!price.trim()) {
      Alert.alert('Price required', 'Enter a price for the item.');
      return;
    }
    addItem({
      title: title.trim(),
      description: description.trim(),
      price: price.trim().startsWith('₦') ? price.trim() : `₦${price.trim()}`,
      location: location.trim(),
      imageUri,
    });
    setTitle('');
    setDescription('');
    setPrice('');
    setLocation('');
    setImageUri(null);
    setShowForm(false);
    Alert.alert('Uploaded', 'The item is now live in the member marketplace.');
  };

  // Instant filter: items starting with or containing the query (case-insensitive).
  const filtered = items.filter(i =>
    i.title.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0B2211" />
      <ScreenHeader
        title="Marketplace Dashboard"
        subtitle="Upload & manage inventory"
        onBack={() => navigation.goBack()}
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={[styles.content, styles.grow]} showsVerticalScrollIndicator={false}>
        {/* Upload toggle */}
        <TouchableOpacity
          style={[styles.uploadToggle, showForm && styles.uploadToggleActive]}
          onPress={() => setShowForm(!showForm)}
        >
          <Plus size={18} color={showForm ? '#FFFFFF' : '#4CAF50'} />
          <Text style={[styles.uploadToggleText, showForm && styles.uploadToggleTextActive]}>
            {showForm ? 'Close Upload Form' : 'Upload New Item'}
          </Text>
        </TouchableOpacity>

        {/* Upload form */}
        {showForm && (
          <View style={styles.formCard}>
            <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
              {imageUri ? (
                <SafeImage source={{ uri: imageUri }} style={styles.imagePreview} />
              ) : (
                <>
                  <Upload size={26} color="#4CAF50" />
                  <Text style={styles.imagePickerText}>Tap to upload item photo</Text>
                </>
              )}
            </TouchableOpacity>

            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Item title"
              placeholderTextColor="#6B7280"
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Description"
              placeholderTextColor="#6B7280"
              multiline
              numberOfLines={3}
            />
            <TextInput
              style={styles.input}
              value={price}
              onChangeText={setPrice}
              placeholder="Price (e.g. 450000)"
              placeholderTextColor="#6B7280"
              keyboardType="decimal-pad"
            />
            <TextInput
              style={styles.input}
              value={location}
              onChangeText={setLocation}
              placeholder="Available location (e.g. Lagos)"
              placeholderTextColor="#6B7280"
            />

            <TouchableOpacity style={styles.submitBtn} onPress={submitItem}>
              <Plus size={17} color="#FFFFFF" />
              <Text style={styles.submitBtnText}>Publish Item</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Real-time search */}
        <View style={styles.searchBar}>
          <Search size={18} color="#6B7280" />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Search inventory alphabetically..."
            placeholderTextColor="#6B7280"
            autoCapitalize="none"
          />
        </View>

        {/* Inventory results */}
        {filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <PackageOpen size={40} color="#9CB8A6" />
            <Text style={styles.emptyTitle}>No results found</Text>
            <Text style={styles.emptySub}>
              {items.length === 0
                ? 'Upload your first item using the button above.'
                : `No inventory items match "${query}".`}
            </Text>
          </View>
        ) : (
          filtered.map(item => (
            <View key={item.id} style={styles.itemCard}>
              {item.imageUri ? (
                <SafeImage source={{ uri: item.imageUri }} style={styles.itemThumb} />
              ) : (
                <View style={[styles.itemThumb, styles.itemThumbPlaceholder]}>
                  <PackageOpen size={20} color="#4CAF50" />
                </View>
              )}
              <View style={styles.itemInfo}>
                <Text style={styles.itemTitle}>{item.title}</Text>
                <Text style={styles.itemPrice}>{item.price}</Text>
                {item.location ? <Text style={styles.itemLocation}>{item.location}</Text> : null}
              </View>
              <TouchableOpacity onPress={() => removeItem(item.id)} style={styles.deleteBtn}>
                <Trash2 size={17} color="#C0392B" />
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  grow: { flexGrow: 1 },
  container: { flex: 1, backgroundColor: '#F4F7F5' },
  content: { padding: 16, paddingBottom: 32 },
  uploadToggle: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#4CAF50',
    paddingVertical: 13,
    marginBottom: 14,
  },
  uploadToggleActive: {
    backgroundColor: '#0B2211',
    borderColor: '#0B2211',
  },
  uploadToggleText: {
    color: '#4CAF50',
    fontSize: 13,
    fontWeight: 'bold',
  },
  uploadToggleTextActive: {
    color: '#FFFFFF',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
  },
  imagePicker: {
    height: 130,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#4CAF50',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    overflow: 'hidden',
  },
  imagePreview: { width: '100%', height: '100%' },
  imagePickerText: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#0B2211',
    fontSize: 14,
    marginBottom: 12,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  submitBtn: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    color: '#0B2211',
    fontSize: 14,
    paddingVertical: 11,
    marginLeft: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 46,
  },
  emptyTitle: {
    color: '#0B2211',
    fontSize: 15,
    fontWeight: 'bold',
    marginTop: 12,
  },
  emptySub: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 17,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 10,
  },
  itemThumb: {
    width: 54,
    height: 54,
    borderRadius: 10,
  },
  itemThumbPlaceholder: {
    backgroundColor: '#EEF2F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  itemTitle: {
    color: '#0B2211',
    fontSize: 13,
    fontWeight: '600',
  },
  itemPrice: {
    color: '#4CAF50',
    fontSize: 13,
    fontWeight: 'bold',
    marginTop: 3,
  },
  itemLocation: {
    color: '#6B7280',
    fontSize: 10,
    marginTop: 2,
  },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
